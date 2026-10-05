import { Service, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { LogActividad } from './log-actividad';
import {
  Genero,
  Pelicula,
  PeliculaConGeneros,
  PeliculaGenero,
  PeliculaPorCrear,
  PeliculaPorModificar,
} from '../interfaces/pelicula';
import { Funcion } from '../interfaces/funcion';
import { Resultado, ResultadoAccion } from '../interfaces/resultado';
import { armarFecha, diaParaMostrar, textoAFecha } from '../validadores/validadores';

// ABM de películas del admin (R-34), con el CRUD de la clase 6 y el Storage
// de la clase 7. Ningún método muestra nada: todos devuelven el error ya
// traducido para que lo muestre la pantalla.
@Service()
export class Peliculas {
  private sup = inject(SupabaseService);
  private log = inject(LogActividad);

  // Bucket público de Storage donde van los pósters (supabase/schema.sql).
  private bucket = 'peliculas';

  async traerTodas(): Promise<Resultado<Pelicula[]>> {
    const { data, error } = await this.sup.Sup.from('Peliculas').select('*');
    if (error) return { datos: null, error: 'No se pudieron cargar las películas.' };

    // Postgres no garantiza ningún orden si no se le pide uno, y la lista
    // cambiaría de lugar después de cada edición. Se ordena acá por nombre.
    const filas: Pelicula[] = data;
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { datos: filas, error: null };
  }

  // Dos consultas en lugar de un select anidado (D-16): primero la película
  // y después sus filas de la tabla intermedia.
  async traerUna(id: number): Promise<Resultado<PeliculaConGeneros>> {
    const { data, error } = await this.sup.Sup.from('Peliculas').select('*').eq('id', id).single();
    if (error) {
      // .single() da este código cuando no encuentra ninguna fila con ese id.
      const mensaje =
        error.code === 'PGRST116' ? 'No existe esa película.' : 'No se pudo cargar la película.';
      return { datos: null, error: mensaje };
    }
    const pelicula: Pelicula = data;

    const { data: dataGeneros, error: errorGeneros } = await this.sup.Sup.from('PeliculasGeneros')
      .select('*')
      .eq('pelicula_id', id);
    if (errorGeneros) {
      return { datos: null, error: 'No se pudieron cargar los géneros de la película.' };
    }
    const filas: PeliculaGenero[] = dataGeneros;

    return {
      datos: { ...pelicula, generos_ids: filas.map((fila) => fila.genero_id) },
      error: null,
    };
  }

  // La lista fija de géneros (D-15), para los checkboxes del formulario.
  async traerGeneros(): Promise<Resultado<Genero[]>> {
    const { data, error } = await this.sup.Sup.from('Generos').select('*');
    if (error) return { datos: null, error: 'No se pudieron cargar los géneros.' };

    const filas: Genero[] = data;
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { datos: filas, error: null };
  }

  // Son tres pasos, cada uno con su pedido: la película, sus géneros y el
  // log. Si falla el primero no se guardó nada. Si falla alguno de los otros
  // dos, la película ya existe: se devuelve hecho true con el aviso.
  async crear(pelicula: PeliculaPorCrear, generosIds: number[]): Promise<ResultadoAccion> {
    // El id lo genera la base. Con .select().single() el insert devuelve la
    // fila creada, y de ahí sale el id para los géneros y el log (D-18).
    const { data, error } = await this.sup.Sup.from('Peliculas')
      .insert(pelicula)
      .select()
      .single();
    if (error) return { hecho: false, error: 'No se pudo crear la película.' };
    const creada: Pelicula = data;

    const generosGuardados = await this.guardarGeneros(creada.id, generosIds);
    const errorLog = await this.log.registrar(
      'crear',
      'Peliculas',
      creada.id,
      `Creó la película "${creada.nombre}"`,
    );

    if (!generosGuardados) {
      return {
        hecho: true,
        error: 'La película se creó, pero no se pudieron guardar sus géneros. Editala para elegirlos de nuevo.',
      };
    }
    if (errorLog) return { hecho: true, error: 'La película se creó. ' + errorLog };
    return { hecho: true, error: null };
  }

  async modificar(
    id: number,
    pelicula: PeliculaPorModificar,
    generosIds: number[],
  ): Promise<ResultadoAccion> {
    // Con funciones futuras, el formulario ya deshabilita la duración y
    // valida el estreno; se vuelve a controlar acá porque el formulario se
    // puede saltear.
    const errorFunciones = await this.errorPorFuncionesFuturas(id, pelicula);
    if (errorFunciones) return { hecho: false, error: errorFunciones };

    const { error } = await this.sup.Sup.from('Peliculas').update(pelicula).eq('id', id);
    if (error) return { hecho: false, error: 'No se pudieron guardar los cambios.' };

    // Los géneros se reemplazan enteros: se borran los que tenía y se
    // insertan los marcados. Es más simple que comparar cuáles se agregaron
    // y cuáles se quitaron, y son pocas filas.
    const { error: errorBorrado } = await this.sup.Sup.from('PeliculasGeneros')
      .delete()
      .eq('pelicula_id', id);
    const generosGuardados = errorBorrado ? false : await this.guardarGeneros(id, generosIds);

    const errorLog = await this.log.registrar(
      'modificar',
      'Peliculas',
      id,
      `Modificó la película "${pelicula.nombre}"`,
    );

    if (!generosGuardados) {
      return {
        hecho: true,
        error: 'Los datos se guardaron, pero no se pudieron actualizar los géneros. Probá guardar de nuevo.',
      };
    }
    if (errorLog) return { hecho: true, error: 'Los cambios se guardaron. ' + errorLog };
    return { hecho: true, error: null };
  }

  // Recibe la película entera y no solo el id para poder dejar el nombre
  // en el log: después del borrado ya no hay de dónde leerlo.
  async eliminar(pelicula: Pelicula): Promise<ResultadoAccion> {
    const { error } = await this.sup.Sup.from('Peliculas').delete().eq('id', pelicula.id);
    if (error) {
      // 23503 es el código de Postgres para "violación de clave foránea":
      // hay filas de Funciones que apuntan a esta película. Sus géneros,
      // reseñas y alertas no traban el borrado porque tienen on delete cascade.
      const mensaje =
        error.code === '23503'
          ? `No se puede borrar "${pelicula.nombre}" porque tiene funciones cargadas. Borrá primero sus funciones.`
          : 'No se pudo borrar la película.';
      return { hecho: false, error: mensaje };
    }

    const errorLog = await this.log.registrar(
      'eliminar',
      'Peliculas',
      pelicula.id,
      `Eliminó la película "${pelicula.nombre}"`,
    );
    if (errorLog) return { hecho: true, error: 'La película se borró. ' + errorLog };
    return { hecho: true, error: null };
  }

  // Sube el póster al bucket y devuelve su URL pública, que es lo que se
  // guarda en imagen_url (clase 7).
  async subirPoster(archivo: File): Promise<Resultado<string>> {
    if (!archivo.type.startsWith('image/')) {
      return { datos: null, error: 'El póster tiene que ser una imagen.' };
    }

    // Ruta única con la hora actual, como en clase: si se usara el nombre
    // original, dos pósters con el mismo nombre se pisarían.
    const extension = archivo.name.split('.').pop();
    const ruta = `posters/${Date.now()}.${extension}`;

    const { error } = await this.sup.Stg.from(this.bucket).upload(ruta, archivo);
    if (error) return { datos: null, error: 'No se pudo subir el póster.' };

    // getPublicUrl no hace ningún pedido: solo arma la dirección
    // .../storage/v1/object/public/peliculas/<ruta>.
    const { data } = this.sup.Stg.from(this.bucket).getPublicUrl(ruta);
    return { datos: data.publicUrl, error: null };
  }

  // El inicio de la primera función de la película que todavía no empezó,
  // o null en datos si no tiene ninguna. Mientras tenga funciones futuras,
  // hay dos datos de la película que no se pueden tocar libremente (D-29):
  //   - La duración: la sala de cada función se asignó contando con ella, y
  //     con otra podrían quedar superpuestas. El trigger no lo notaría,
  //     porque mira Funciones y no Peliculas.
  //   - El estreno: no puede pasar a ser posterior a esa primera función,
  //     porque quedarían funciones antes del estreno.
  async primeraFuncionFutura(id: number): Promise<Resultado<Date | null>> {
    // .gte() es "mayor o igual" (D-29): las funciones de esta película que
    // empiezan de ahora en adelante.
    const { data, error } = await this.sup.Sup.from('Funciones')
      .select('*')
      .eq('pelicula_id', id)
      .gte('fecha_hora', new Date().toISOString());
    if (error) {
      return { datos: null, error: 'No se pudieron consultar las funciones de la película.' };
    }
    const filas: Funcion[] = data;
    if (filas.length === 0) return { datos: null, error: null };

    // new Date() pasa cada texto de Postgres a un instante, y getTime() lo
    // da en milisegundos: Math.min se queda con el más chico, el primero.
    const inicios = filas.map((fila) => new Date(fila.fecha_hora).getTime());
    return { datos: new Date(Math.min(...inicios)), error: null };
  }

  // Los dos controles de modificar() cuando la película tiene funciones
  // futuras. Devuelve el mensaje de lo que no se puede guardar, o null si
  // está todo bien.
  private async errorPorFuncionesFuturas(
    id: number,
    pelicula: PeliculaPorModificar,
  ): Promise<string | null> {
    const primera = await this.primeraFuncionFutura(id);
    if (primera.error) return primera.error;
    if (primera.datos === null) return null;

    // El estreno queda a las 00:00 de acá: solo es posterior a la función
    // si cae en un día que viene después del de la función.
    const estreno = armarFecha(textoAFecha(pelicula.fecha_estreno));
    if (estreno !== null && estreno > primera.datos) {
      return `El estreno no puede ser posterior a la primera función que la película tiene cargada, el ${diaParaMostrar(primera.datos)}. Borrá o reprogramá esa función primero.`;
    }

    // Para saber si la duración cambió hay que leer la que está guardada.
    const { data, error } = await this.sup.Sup.from('Peliculas').select('*').eq('id', id).single();
    if (error) return 'No se pudieron guardar los cambios.';
    const actual: Pelicula = data;
    if (actual.duracion_minutos !== pelicula.duracion_minutos) {
      return 'No se puede cambiar la duración: la película tiene funciones futuras y podrían quedar superpuestas. Borrá o reprogramá esas funciones primero.';
    }
    return null;
  }

  // Inserta una fila en PeliculasGeneros por cada género marcado.
  // Devuelve si salió bien; el mensaje lo arma quien llama.
  private async guardarGeneros(peliculaId: number, generosIds: number[]): Promise<boolean> {
    const filas: PeliculaGenero[] = generosIds.map((generoId) => ({
      pelicula_id: peliculaId,
      genero_id: generoId,
    }));
    const { error } = await this.sup.Sup.from('PeliculasGeneros').insert(filas);
    return !error;
  }
}
