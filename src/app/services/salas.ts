import { Service, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { LogActividad } from './log-actividad';
import { Sala, SalaPorCrear, SalaPorModificar } from '../interfaces/sala';
import { Resultado, ResultadoAccion } from '../interfaces/resultado';

// ABM de salas del admin (R-34), con el CRUD de la clase 6. Ningún método
// muestra nada: todos devuelven el error ya traducido para que lo muestre
// la pantalla.
@Service()
export class Salas {
  private sup = inject(SupabaseService);
  private log = inject(LogActividad);

  async traerTodas(): Promise<Resultado<Sala[]>> {
    const { data, error } = await this.sup.Sup.from('Salas').select('*');
    if (error) return { datos: null, error: 'No se pudieron cargar las salas.' };

    // Postgres no garantiza ningún orden si no se le pide uno. Se ordena acá
    // por nombre; con numeric en true los números se comparan como números,
    // así "Sala 2" queda antes que "Sala 10".
    const filas: Sala[] = data;
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
    return { datos: filas, error: null };
  }

  async traerUna(id: number): Promise<Resultado<Sala>> {
    const { data, error } = await this.sup.Sup.from('Salas').select('*').eq('id', id).single();
    if (error) {
      // .single() da este código cuando no encuentra ninguna fila con ese id.
      const mensaje =
        error.code === 'PGRST116' ? 'No existe esa sala.' : 'No se pudo cargar la sala.';
      return { datos: null, error: mensaje };
    }
    const sala: Sala = data;
    return { datos: sala, error: null };
  }

  // Dos pasos, cada uno con su pedido: la sala y el log (D-14). Si falla el
  // primero no se guardó nada. Si falla el log, la sala ya existe: se
  // devuelve hecho true con el aviso.
  async crear(sala: SalaPorCrear): Promise<ResultadoAccion> {
    // El id lo genera la base. Con .select().single() el insert devuelve la
    // fila creada, y de ahí sale el id para el log (D-18).
    const { data, error } = await this.sup.Sup.from('Salas').insert(sala).select().single();
    if (error) {
      return { hecho: false, error: this.traducirError(error.code, 'No se pudo crear la sala.') };
    }
    const creada: Sala = data;

    const errorLog = await this.log.registrar(
      'crear',
      'Salas',
      creada.id,
      `Creó la sala "${creada.nombre}"`,
    );
    if (errorLog) return { hecho: true, error: 'La sala se creó. ' + errorLog };
    return { hecho: true, error: null };
  }

  async modificar(id: number, sala: SalaPorModificar): Promise<ResultadoAccion> {
    const { error } = await this.sup.Sup.from('Salas').update(sala).eq('id', id);
    if (error) {
      return {
        hecho: false,
        error: this.traducirError(error.code, 'No se pudieron guardar los cambios.'),
      };
    }

    const errorLog = await this.log.registrar(
      'modificar',
      'Salas',
      id,
      `Modificó la sala "${sala.nombre}"`,
    );
    if (errorLog) return { hecho: true, error: 'Los cambios se guardaron. ' + errorLog };
    return { hecho: true, error: null };
  }

  // Recibe la sala entera y no solo el id para poder dejar el nombre en el
  // log: después del borrado ya no hay de dónde leerlo.
  async eliminar(sala: Sala): Promise<ResultadoAccion> {
    const { error } = await this.sup.Sup.from('Salas').delete().eq('id', sala.id);
    if (error) {
      // 23503 es el código de Postgres para "violación de clave foránea":
      // hay filas de Funciones que apuntan a esta sala.
      const mensaje =
        error.code === '23503'
          ? `No se puede borrar "${sala.nombre}" porque tiene funciones cargadas. Borrá primero sus funciones, o desactivala para que no reciba funciones nuevas.`
          : 'No se pudo borrar la sala.';
      return { hecho: false, error: mensaje };
    }

    const errorLog = await this.log.registrar(
      'eliminar',
      'Salas',
      sala.id,
      `Eliminó la sala "${sala.nombre}"`,
    );
    if (errorLog) return { hecho: true, error: 'La sala se borró. ' + errorLog };
    return { hecho: true, error: null };
  }

  // 23505 es el código de Postgres para "violación de unique": ya hay una
  // sala con ese nombre (constraint salas_nombre_unico). Cualquier otro
  // código queda con el mensaje genérico que pasa quien llama.
  private traducirError(codigo: string, generico: string): string {
    return codigo === '23505' ? 'Ya existe una sala con ese nombre.' : generico;
  }
}
