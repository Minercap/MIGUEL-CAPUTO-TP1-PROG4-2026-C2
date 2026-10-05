import { Service, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { LogActividad } from './log-actividad';
import { CondicionCupon, Cupon, CuponPorCrear, CuponPorModificar } from '../interfaces/cupon';
import { Resultado, ResultadoAccion } from '../interfaces/resultado';

// ABM de cupones del admin (R-23, R-24, D-05), con el CRUD de la clase 6.
// Ningún método muestra nada: todos devuelven el error ya traducido para
// que lo muestre la pantalla.
@Service()
export class Cupones {
  private sup = inject(SupabaseService);
  private log = inject(LogActividad);

  async traerTodos(): Promise<Resultado<Cupon[]>> {
    const { data, error } = await this.sup.Sup.from('Cupones').select('*');
    if (error) return { datos: null, error: 'No se pudieron cargar los cupones.' };

    // Postgres no garantiza ningún orden si no se le pide uno: se ordena
    // acá por nombre.
    const filas: Cupon[] = data;
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return { datos: filas, error: null };
  }

  // Dos pasos: el cupón y el log (D-14). Devuelve el cupón creado para que
  // la pantalla lo sume a la lista sin volver a pedir todos. Si falla el
  // log, el cupón ya existe: se devuelve igual, con el aviso en error.
  async crear(cupon: CuponPorCrear): Promise<Resultado<Cupon>> {
    // Con .select().single() el insert devuelve la fila creada (D-18).
    const { data, error } = await this.sup.Sup.from('Cupones').insert(cupon).select().single();
    if (error) {
      return { datos: null, error: this.traducirError(error.code, 'No se pudo crear el cupón.') };
    }
    const creado: Cupon = data;

    const errorLog = await this.log.registrar(
      'crear',
      'Cupones',
      creado.id,
      `Creó el cupón ${this.describir(creado)}`,
    );
    return { datos: creado, error: errorLog ? 'El cupón se creó. ' + errorLog : null };
  }

  async modificar(id: number, cupon: CuponPorModificar): Promise<ResultadoAccion> {
    const { error } = await this.sup.Sup.from('Cupones').update(cupon).eq('id', id);
    if (error) {
      return {
        hecho: false,
        error: this.traducirError(error.code, 'No se pudieron guardar los cambios.'),
      };
    }

    const errorLog = await this.log.registrar(
      'modificar',
      'Cupones',
      id,
      `Modificó el cupón ${this.describir(cupon)}`,
    );
    if (errorLog) return { hecho: true, error: 'Los cambios se guardaron. ' + errorLog };
    return { hecho: true, error: null };
  }

  // Recibe el cupón entero para poder dejar sus datos en el log: después
  // del borrado ya no hay de dónde leerlos.
  async eliminar(cupon: Cupon): Promise<ResultadoAccion> {
    const { error } = await this.sup.Sup.from('Cupones').delete().eq('id', cupon.id);
    if (error) {
      // 23503 es "violación de clave foránea": hay compras que lo usaron
      // (Compras.cupon_id). Para eso está la baja lógica.
      const mensaje =
        error.code === '23503'
          ? `No se puede borrar "${cupon.nombre}" porque ya se usó en compras. Desactivalo para que no se aplique más.`
          : 'No se pudo borrar el cupón.';
      return { hecho: false, error: mensaje };
    }

    const errorLog = await this.log.registrar(
      'eliminar',
      'Cupones',
      cupon.id,
      `Eliminó el cupón ${this.describir(cupon)}`,
    );
    if (errorLog) return { hecho: true, error: 'El cupón se borró. ' + errorLog };
    return { hecho: true, error: null };
  }

  // El texto de una condición, para el log y la pantalla.
  nombreCondicion(condicion: CondicionCupon): string {
    return condicion === 'primera_compra' ? 'primera compra' : 'mayores de 50';
  }

  // Lo que queda en el detalle del log: el porcentaje va siempre, porque
  // es lo que el admin cambia (mail del 30/01).
  private describir(cupon: CuponPorCrear): string {
    const estado = cupon.activo ? 'activo' : 'inactivo';
    return `"${cupon.nombre}": ${cupon.porcentaje}% para ${this.nombreCondicion(cupon.condicion)}, ${estado}`;
  }

  // 23505 es "violación de unique". En Cupones lo da un solo caso: el
  // índice único parcial que deja un solo cupón de primera compra activo
  // (D-43).
  private traducirError(codigo: string, generico: string): string {
    return codigo === '23505'
      ? 'Ya hay un cupón de primera compra activo: desactivalo antes.'
      : generico;
  }
}
