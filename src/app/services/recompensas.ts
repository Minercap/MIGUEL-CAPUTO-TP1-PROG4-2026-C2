import { Service, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { LogActividad } from './log-actividad';
import {
  Recompensa,
  RecompensaPorCrear,
  RecompensaPorModificar,
} from '../interfaces/recompensa';
import { Resultado, ResultadoAccion } from '../interfaces/resultado';

// ABM de recompensas del programa de puntos (R-28, D-42), con el CRUD de la
// clase 6. Ningún método muestra nada: todos devuelven el error ya
// traducido para que lo muestre la pantalla.
//
// Una recompensa no tiene nombre propio: es "Entrada" o el nombre de un
// producto. Por eso crear, modificar y eliminar reciben el nombre aparte,
// para el log: lo arma la pantalla, que ya tiene la lista de productos.
@Service()
export class Recompensas {
  private sup = inject(SupabaseService);
  private log = inject(LogActividad);

  async traerTodas(): Promise<Resultado<Recompensa[]>> {
    const { data, error } = await this.sup.Sup.from('Recompensas').select('*');
    if (error) return { datos: null, error: 'No se pudieron cargar las recompensas.' };

    // Ordenadas de la más barata a la más cara, que es como las va a mirar
    // el cliente cuando canjee.
    const filas: Recompensa[] = data;
    filas.sort((a, b) => a.costo_puntos - b.costo_puntos);
    return { datos: filas, error: null };
  }

  // Dos pasos: la recompensa y el log (D-14). Devuelve la recompensa creada
  // para que la pantalla la sume a la lista. Si falla el log, ya existe: se
  // devuelve igual, con el aviso en error.
  async crear(recompensa: RecompensaPorCrear, nombre: string): Promise<Resultado<Recompensa>> {
    // Con .select().single() el insert devuelve la fila creada (D-18).
    const { data, error } = await this.sup.Sup.from('Recompensas')
      .insert(recompensa)
      .select()
      .single();
    if (error) return { datos: null, error: 'No se pudo crear la recompensa.' };
    const creada: Recompensa = data;

    const errorLog = await this.log.registrar(
      'crear',
      'Recompensas',
      creada.id,
      `Creó la recompensa ${this.describir(creada, nombre)}`,
    );
    return { datos: creada, error: errorLog ? 'La recompensa se creó. ' + errorLog : null };
  }

  async modificar(
    id: number,
    recompensa: RecompensaPorModificar,
    nombre: string,
  ): Promise<ResultadoAccion> {
    const { error } = await this.sup.Sup.from('Recompensas').update(recompensa).eq('id', id);
    if (error) return { hecho: false, error: 'No se pudieron guardar los cambios.' };

    const errorLog = await this.log.registrar(
      'modificar',
      'Recompensas',
      id,
      `Modificó la recompensa ${this.describir(recompensa, nombre)}`,
    );
    if (errorLog) return { hecho: true, error: 'Los cambios se guardaron. ' + errorLog };
    return { hecho: true, error: null };
  }

  async eliminar(recompensa: Recompensa, nombre: string): Promise<ResultadoAccion> {
    const { error } = await this.sup.Sup.from('Recompensas').delete().eq('id', recompensa.id);
    if (error) {
      // 23503 es "violación de clave foránea": hay canjes de esta recompensa
      // en el historial de algún cliente (R-03). Para eso está la baja lógica.
      const mensaje =
        error.code === '23503'
          ? `No se puede borrar "${nombre}" porque ya tiene canjes. Desactivala para que no se ofrezca más.`
          : 'No se pudo borrar la recompensa.';
      return { hecho: false, error: mensaje };
    }

    const errorLog = await this.log.registrar(
      'eliminar',
      'Recompensas',
      recompensa.id,
      `Eliminó la recompensa ${this.describir(recompensa, nombre)}`,
    );
    if (errorLog) return { hecho: true, error: 'La recompensa se borró. ' + errorLog };
    return { hecho: true, error: null };
  }

  // Lo que queda en el detalle del log: el costo en puntos va siempre,
  // porque es lo que el admin configura (R-28).
  private describir(recompensa: RecompensaPorCrear, nombre: string): string {
    const estado = recompensa.activa ? 'activa' : 'inactiva';
    return `"${nombre}": ${recompensa.costo_puntos} puntos, ${estado}`;
  }
}
