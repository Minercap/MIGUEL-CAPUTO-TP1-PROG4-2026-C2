import { Service, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { LogActividad } from './log-actividad';
import { Peliculas } from './peliculas';
import { Salas } from './salas';
import {
  DatosFuncion,
  Funcion,
  FuncionAsignada,
  FuncionConNombres,
  FuncionPorCrear,
  FuncionPorModificar,
  Programacion,
  ResultadoFunciones,
} from '../interfaces/funcion';
import { Pelicula } from '../interfaces/pelicula';
import { Sala } from '../interfaces/sala';
import { Resultado, ResultadoAccion } from '../interfaces/resultado';
import { armarFecha, fechaParaMostrar, sumarDias, textoAFecha } from '../validadores/validadores';

// Minutos que tienen que pasar entre el fin de una función y el inicio de
// la siguiente en la misma sala (R-19). El trigger de la base usa el mismo
// número (supabase/schema.sql, sección 9.3).
const MARGEN_MINUTOS = 30;

// La duración más larga que puede tener una película: es el tope del check
// peliculas_duracion_rango. Sirve para saber hasta cuánto antes puede haber
// empezado una función que todavía moleste.
const DURACION_MAXIMA_MINUTOS = 300;

// Las fechas se comparan en milisegundos, que es lo que da Date.getTime().
const MS_POR_MINUTO = 60 * 1000;

// Un horario ya tomado en una sala, con inicio y fin en milisegundos.
interface Ocupacion {
  sala_id: number;
  inicio: number;
  fin: number;
}

// Un inicio y la sala que le tocó.
interface Asignacion {
  inicio: Date;
  sala: Sala;
}

// Lo que se usa del error que devuelve Supabase: el código de Postgres y
// el texto, que en un "raise exception" es el que escribió el trigger.
interface ErrorDeBase {
  code: string;
  message: string;
}

// Lo que hace falta leer antes de asignar salas o de armar un texto.
interface PeliculasYSalas {
  peliculas: Pelicula[];
  salas: Sala[];
}

// Funciones del admin (R-34): listado, alta por programación (D-30),
// edición y baja. La sala no la elige el admin: la asigna este servicio
// (R-17, D-29) y la base lo vuelve a controlar con un trigger. Ningún método
// muestra nada: todos devuelven el error ya traducido para la pantalla.
@Service()
export class Funciones {
  private sup = inject(SupabaseService);
  private log = inject(LogActividad);
  private peliculasSrv = inject(Peliculas);
  private salasSrv = inject(Salas);

  // Tres consultas en lugar de un select anidado (D-16): las funciones, las
  // películas y las salas. Los nombres se agregan acá, buscando por id.
  async traerTodas(): Promise<Resultado<FuncionConNombres[]>> {
    const { data, error } = await this.sup.Sup.from('Funciones').select('*');
    if (error) return { datos: null, error: 'No se pudieron cargar las funciones.' };
    const filas: Funcion[] = data;

    const contexto = await this.traerPeliculasYSalas();
    if (contexto.error || !contexto.datos) return { datos: null, error: contexto.error };
    const { peliculas, salas } = contexto.datos;

    const funciones: FuncionConNombres[] = filas.map((funcion) => ({
      ...funcion,
      pelicula_nombre: peliculas.find((p) => p.id === funcion.pelicula_id)?.nombre ?? 'Sin nombre',
      sala_nombre: salas.find((s) => s.id === funcion.sala_id)?.nombre ?? 'Sin nombre',
    }));

    // Por fecha y hora, de la más próxima a la más lejana.
    funciones.sort((a, b) => this.enMs(a.fecha_hora) - this.enMs(b.fecha_hora));
    return { datos: funciones, error: null };
  }

  async traerUna(id: number): Promise<Resultado<Funcion>> {
    const { data, error } = await this.sup.Sup.from('Funciones').select('*').eq('id', id).single();
    if (error) {
      // .single() da este código cuando no encuentra ninguna fila con ese id.
      const mensaje =
        error.code === 'PGRST116' ? 'No existe esa función.' : 'No se pudo cargar la función.';
      return { datos: null, error: mensaje };
    }
    const funcion: Funcion = data;
    return { datos: funcion, error: null };
  }

  // La última función que se cargó de una película, para precargar sus
  // precios en el formulario (D-28). Devuelve null en datos si la película
  // todavía no tiene ninguna.
  async traerUltimaDePelicula(peliculaId: number): Promise<Resultado<Funcion | null>> {
    const { data, error } = await this.sup.Sup.from('Funciones')
      .select('*')
      .eq('pelicula_id', peliculaId);
    if (error) {
      return { datos: null, error: 'No se pudieron traer los precios de la última función.' };
    }
    const filas: Funcion[] = data;
    if (filas.length === 0) return { datos: null, error: null };

    // El id lo genera la base en orden: el más alto es el de la última carga.
    filas.sort((a, b) => b.id - a.id);
    return { datos: filas[0], error: null };
  }

  // De "lunes, martes y viernes a las 18, del 12 al 25" a la lista de
  // inicios, uno por cada fecha del rango que cae en un día elegido (D-30).
  calcularInicios(programacion: Programacion): Date[] {
    const inicios: Date[] = [];
    // Se recorre el rango día por día. getDay() da el día de la semana de
    // cada fecha: 0 domingo, 1 lunes ... 6 sábado.
    for (let dia = programacion.desde; dia <= programacion.hasta; dia = sumarDias(dia, 1)) {
      if (programacion.dias.includes(dia.getDay())) {
        inicios.push(
          new Date(
            dia.getFullYear(),
            dia.getMonth(),
            dia.getDate(),
            programacion.hora,
            programacion.minutos,
          ),
        );
      }
    }
    return inicios;
  }

  // Alta por programación (D-30). Es todo o nada: si a alguna fecha no se
  // le encuentra sala, no se inserta ninguna función.
  async programar(programacion: Programacion): Promise<ResultadoFunciones> {
    const inicios = this.calcularInicios(programacion);
    if (inicios.length === 0) {
      return this.fallo('Ninguno de los días elegidos cae dentro del rango de fechas.');
    }

    const contexto = await this.traerPeliculasYSalas();
    if (contexto.error || !contexto.datos) return this.fallo(contexto.error);
    const { peliculas, salas } = contexto.datos;

    const pelicula = peliculas.find((p) => p.id === programacion.pelicula_id);
    if (!pelicula) return this.fallo('No existe esa película.');

    // Los inicios están en orden: si el primero no es anterior al estreno,
    // ninguno lo es.
    const errorEstreno = this.errorPorEstreno(pelicula, inicios[0]);
    if (errorEstreno) return this.fallo(errorEstreno);

    const asignacion = await this.asignarSalas(pelicula, inicios, peliculas, salas, null);
    if (asignacion.error || !asignacion.datos) {
      return this.fallo(asignacion.error + ' No se creó ninguna función.');
    }

    const filas: FuncionPorCrear[] = asignacion.datos.map((asignada) => ({
      pelicula_id: pelicula.id,
      sala_id: asignada.sala.id,
      // toISOString() escribe la fecha en UTC, con la Z al final. La columna
      // es timestamptz, así que Postgres guarda el instante exacto y no
      // importa en qué zona horaria esté el servidor.
      fecha_hora: asignada.inicio.toISOString(),
      formato: programacion.formato,
      idioma: programacion.idioma,
      precio_base: programacion.precio_base,
      precio_vip: programacion.precio_vip,
    }));

    // Un solo insert con todas las filas (clase 6, pero con una lista): para
    // la base es una única operación, así que si una fila es rechazada no
    // entra ninguna. Con .select() devuelve las filas creadas, y de ahí
    // salen los ids para el log (D-18).
    const { data, error } = await this.sup.Sup.from('Funciones').insert(filas).select();
    if (error) {
      return this.fallo(this.traducirError(error, 'No se pudieron crear las funciones.'));
    }
    const creadas: Funcion[] = data;
    creadas.sort((a, b) => this.enMs(a.fecha_hora) - this.enMs(b.fecha_hora));

    // Una entrada en el log por cada función creada (R-38: "quién creó qué
    // función"). Son pedidos separados (D-14): si alguno falla, las
    // funciones ya están guardadas y se avisa.
    const asignadas: FuncionAsignada[] = [];
    let falloElLog = false;
    for (const creada of creadas) {
      const asignada: FuncionAsignada = {
        cuando: this.textoDeInicio(new Date(creada.fecha_hora)),
        sala_nombre: this.nombreDeSala(salas, creada.sala_id),
      };
      asignadas.push(asignada);

      const errorLog = await this.log.registrar(
        'crear',
        'Funciones',
        creada.id,
        `Creó la función de "${pelicula.nombre}" del ${asignada.cuando} en ${asignada.sala_nombre}. ` +
          `Precio base $${creada.precio_base}, VIP $${creada.precio_vip}.`,
      );
      if (errorLog) falloElLog = true;
    }

    return {
      hecho: true,
      error: falloElLog
        ? 'Las funciones se crearon, pero no se pudieron registrar todas en el log de actividad.'
        : null,
      asignadas,
    };
  }

  // Edición de una sola función. Recibe la función como estaba para saber
  // qué cambió: de eso dependen la sala y el texto del log.
  async modificar(original: Funcion, datos: DatosFuncion): Promise<ResultadoFunciones> {
    const contexto = await this.traerPeliculasYSalas();
    if (contexto.error || !contexto.datos) return this.fallo(contexto.error);
    const { peliculas, salas } = contexto.datos;

    const pelicula = peliculas.find((p) => p.id === datos.pelicula_id);
    if (!pelicula) return this.fallo('No existe esa película.');

    const errorEstreno = this.errorPorEstreno(pelicula, datos.inicio);
    if (errorEstreno) return this.fallo(errorEstreno);

    // La sala se vuelve a asignar si cambió el horario, o si cambió la
    // película, porque con otra duración la función termina a otra hora. Se
    // usa la misma lógica del alta, sin contar a la propia función como
    // ocupante. Si no cambió ninguna de las dos, la sala queda.
    const cambioElHorario = this.enMs(original.fecha_hora) !== datos.inicio.getTime();
    const cambioLaPelicula = original.pelicula_id !== datos.pelicula_id;
    let salaId = original.sala_id;
    if (cambioElHorario || cambioLaPelicula) {
      const asignacion = await this.asignarSalas(
        pelicula,
        [datos.inicio],
        peliculas,
        salas,
        original.id,
      );
      if (asignacion.error || !asignacion.datos) {
        return this.fallo(asignacion.error + ' La función no se modificó.');
      }
      salaId = asignacion.datos[0].sala.id;
    }

    const cambios: FuncionPorModificar = {
      pelicula_id: datos.pelicula_id,
      sala_id: salaId,
      fecha_hora: datos.inicio.toISOString(),
      formato: datos.formato,
      idioma: datos.idioma,
      precio_base: datos.precio_base,
      precio_vip: datos.precio_vip,
    };

    const { error } = await this.sup.Sup.from('Funciones').update(cambios).eq('id', original.id);
    if (error) {
      return this.fallo(this.traducirError(error, 'No se pudieron guardar los cambios.'));
    }

    const asignada: FuncionAsignada = {
      cuando: this.textoDeInicio(datos.inicio),
      sala_nombre: this.nombreDeSala(salas, salaId),
    };

    // El log dice qué función era y, si cambió un precio, cuál, cuánto valía
    // y cuánto vale ahora (R-38, mail del 10/03: "quién modificó un precio").
    let detalle =
      `Modificó la función de "${pelicula.nombre}" del ` +
      `${this.textoDeInicio(new Date(original.fecha_hora))} en ` +
      `${this.nombreDeSala(salas, original.sala_id)}.`;
    if (original.precio_base !== datos.precio_base) {
      detalle += ` Precio base: de $${original.precio_base} a $${datos.precio_base}.`;
    }
    if (original.precio_vip !== datos.precio_vip) {
      detalle += ` Precio VIP: de $${original.precio_vip} a $${datos.precio_vip}.`;
    }
    if (cambioElHorario || salaId !== original.sala_id) {
      detalle += ` Ahora es el ${asignada.cuando} en ${asignada.sala_nombre}.`;
    }

    const errorLog = await this.log.registrar('modificar', 'Funciones', original.id, detalle);
    return {
      hecho: true,
      error: errorLog ? 'Los cambios se guardaron. ' + errorLog : null,
      asignadas: [asignada],
    };
  }

  // Recibe la función con sus nombres para poder dejarlos en el log:
  // después del borrado ya no hay de dónde leerlos.
  async eliminar(funcion: FuncionConNombres): Promise<ResultadoAccion> {
    const { error } = await this.sup.Sup.from('Funciones').delete().eq('id', funcion.id);
    if (error) {
      // 23503 es el código de Postgres para "violación de clave foránea":
      // hay filas de Entradas que apuntan a esta función.
      const mensaje =
        error.code === '23503'
          ? 'No se puede borrar la función porque ya tiene entradas vendidas.'
          : 'No se pudo borrar la función.';
      return { hecho: false, error: mensaje };
    }

    const errorLog = await this.log.registrar(
      'eliminar',
      'Funciones',
      funcion.id,
      `Eliminó la función de "${funcion.pelicula_nombre}" del ` +
        `${this.textoDeInicio(new Date(funcion.fecha_hora))} en ${funcion.sala_nombre}`,
    );
    if (errorLog) return { hecho: true, error: 'La función se borró. ' + errorLog };
    return { hecho: true, error: null };
  }

  // ---------- Asignación de sala (R-17, R-18, R-19, D-29) ----------

  // Le busca sala a cada inicio: la primera sala activa que esté libre.
  // Si a algún inicio no le encuentra, devuelve un error que los nombra y
  // ninguna asignación. idAIgnorar es la función que se está editando, que
  // no tiene que chocar consigo misma; en el alta va null.
  private async asignarSalas(
    pelicula: Pelicula,
    inicios: Date[],
    peliculas: Pelicula[],
    salas: Sala[],
    idAIgnorar: number | null,
  ): Promise<Resultado<Asignacion[]>> {
    // Vienen ordenadas por nombre (servicio Salas): "la primera" es la de
    // nombre más bajo.
    const salasActivas = salas.filter((sala) => sala.activa);
    if (salasActivas.length === 0) {
      return { datos: null, error: 'No hay ninguna sala activa para asignar.' };
    }

    const duracionMs = pelicula.duracion_minutos * MS_POR_MINUTO;
    const margenMs = MARGEN_MINUTOS * MS_POR_MINUTO;

    // Solo hace falta mirar las funciones que pueden chocar con alguna de
    // las nuevas. La que empezó antes molesta únicamente si todavía no
    // terminó, y lo más que dura una película son 300 minutos: se trae
    // desde 300 + 30 minutos antes del primer inicio. La que empieza después
    // molesta si arranca antes de que termine la última nueva más el margen.
    const primerInicio = inicios[0].getTime();
    const ultimoInicio = inicios[inicios.length - 1].getTime();
    const desde = new Date(primerInicio - DURACION_MAXIMA_MINUTOS * MS_POR_MINUTO - margenMs);
    const hasta = new Date(ultimoInicio + duracionMs + margenMs);

    // .gte() es "mayor o igual" y .lt() es "menor" (D-29): son filtros como
    // .eq(), pero por rango.
    const { data, error } = await this.sup.Sup.from('Funciones')
      .select('*')
      .gte('fecha_hora', desde.toISOString())
      .lt('fecha_hora', hasta.toISOString());
    if (error) {
      return { datos: null, error: 'No se pudieron consultar las funciones ya cargadas.' };
    }
    const existentes: Funcion[] = data;

    // Cada función existente pasa a ser un horario ocupado en su sala. El
    // fin sale de la duración de SU película (R-19).
    const ocupaciones: Ocupacion[] = existentes
      .filter((funcion) => funcion.id !== idAIgnorar)
      .map((funcion) => {
        const suPelicula = peliculas.find((p) => p.id === funcion.pelicula_id);
        const suDuracion = suPelicula?.duracion_minutos ?? DURACION_MAXIMA_MINUTOS;
        const inicio = this.enMs(funcion.fecha_hora);
        return { sala_id: funcion.sala_id, inicio, fin: inicio + suDuracion * MS_POR_MINUTO };
      });

    const asignaciones: Asignacion[] = [];
    const sinSala: Date[] = [];

    for (const fecha of inicios) {
      const inicio = fecha.getTime();
      const fin = inicio + duracionMs;

      // Dos funciones chocan en una sala si cada una empieza antes de que
      // termine la otra más el margen. find devuelve la primera sala en la
      // que ninguna ocupación choca.
      const salaLibre = salasActivas.find(
        (sala) =>
          !ocupaciones.some(
            (ocupacion) =>
              ocupacion.sala_id === sala.id &&
              inicio < ocupacion.fin + margenMs &&
              ocupacion.inicio < fin + margenMs,
          ),
      );

      if (!salaLibre) {
        sinSala.push(fecha);
        continue;
      }
      asignaciones.push({ inicio: fecha, sala: salaLibre });
      // La sala queda tomada también para los inicios que faltan revisar.
      ocupaciones.push({ sala_id: salaLibre.id, inicio, fin });
    }

    if (sinSala.length > 0) {
      const lista = sinSala.map((fecha) => this.textoDeInicio(fecha)).join('; ');
      return { datos: null, error: `No hay sala libre para: ${lista}.` };
    }
    return { datos: asignaciones, error: null };
  }

  // ---------- Ayudas ----------

  // Una función no puede ser anterior al estreno de su película en el cine
  // (docs/validaciones.md, 3.5). La preventa adelanta la venta, no las
  // funciones. El formulario ya lo valida; se repite acá porque el
  // formulario se puede saltear. Devuelve el mensaje, o null si está bien.
  private errorPorEstreno(pelicula: Pelicula, inicio: Date): string | null {
    // El estreno queda a las 00:00 de acá: cualquier horario de ese día ya
    // no es anterior.
    const estreno = armarFecha(textoAFecha(pelicula.fecha_estreno));
    if (estreno === null || inicio >= estreno) return null;
    return `"${pelicula.nombre}" se estrena el ${fechaParaMostrar(pelicula.fecha_estreno)}: no puede tener funciones antes de esa fecha.`;
  }

  private async traerPeliculasYSalas(): Promise<Resultado<PeliculasYSalas>> {
    const peliculas = await this.peliculasSrv.traerTodas();
    if (peliculas.error || !peliculas.datos) return { datos: null, error: peliculas.error };

    const salas = await this.salasSrv.traerTodas();
    if (salas.error || !salas.datos) return { datos: null, error: salas.error };

    return { datos: { peliculas: peliculas.datos, salas: salas.datos }, error: null };
  }

  // P0001 es el código con el que llega un "raise exception" de Postgres:
  // el trigger funciones_sin_superposicion rechazó la fila (D-29). Tiene
  // dos reglas, y las dos llegan con el mismo código: se distinguen por el
  // texto que escribe el trigger (supabase/schema.sql, sección 9.4).
  //   - Estreno: la función es anterior al estreno de la película. Este
  //     servicio ya lo controla antes; llega acá solo si el estreno cambió
  //     en el medio.
  //   - Superposición: otro admin cargó una función en esa sala entre que
  //     este servicio la vio libre y el momento de guardar.
  // 23514 es "violación de check": un dato no cumple una regla de la tabla.
  private traducirError(error: ErrorDeBase, generico: string): string {
    // OJO: la regla del estreno se reconoce por la palabra "estreno" en el
    // mensaje del raise exception (supabase/schema.sql, sección 9.4). Si se
    // cambia ese texto en el trigger, hay que cambiar esta palabra, y al
    // revés. El mensaje de superposición no tiene que contenerla.
    if (error.code === 'P0001' && error.message.includes('estreno')) {
      return 'Alguna función quedó antes del estreno de la película. No se guardó nada: revisá la fecha de estreno y las fechas elegidas.';
    }
    if (error.code === 'P0001') {
      return 'Otra función ocupó esa sala en ese horario mientras cargabas. No se guardó nada: volvé a guardar para que se asigne otra sala.';
    }
    if (error.code === '23514') {
      return 'Los datos de la función no cumplen las reglas de la base. Revisá los precios: el VIP tiene que ser mayor que el base.';
    }
    return generico;
  }

  private fallo(error: string | null): ResultadoFunciones {
    return { hecho: false, error, asignadas: [] };
  }

  private nombreDeSala(salas: Sala[], salaId: number): string {
    return salas.find((sala) => sala.id === salaId)?.nombre ?? 'Sin nombre';
  }

  // El texto de fecha_hora que devuelve Postgres, en milisegundos.
  private enMs(fechaHora: string): number {
    return new Date(fechaHora).getTime();
  }

  // Un inicio escrito para mostrar, en la hora de acá: 'lunes, 12/10, 18:00'.
  private textoDeInicio(fecha: Date): string {
    return fecha.toLocaleString('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
