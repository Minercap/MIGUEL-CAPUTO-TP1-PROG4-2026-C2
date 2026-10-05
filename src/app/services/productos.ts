import { Service, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { LogActividad } from './log-actividad';
import {
  Categoria,
  CategoriaPorCrear,
  ComboItem,
  ComboItemPorCrear,
  Producto,
  ProductoConItems,
  ProductoPorCrear,
  ProductoPorModificar,
} from '../interfaces/producto';
import { Resultado, ResultadoAccion } from '../interfaces/resultado';

// ABM del candy bar del admin (R-21, R-22, R-34): categorías, productos y
// combos, con el CRUD de la clase 6. Un combo es un producto con es_combo
// en true, y lo que trae va en CombosProductos (D-40).
// Ningún método muestra nada: todos devuelven el error ya traducido para
// que lo muestre la pantalla.
@Service()
export class Productos {
  private sup = inject(SupabaseService);
  private log = inject(LogActividad);

  // ---------- Categorías ----------

  async traerCategorias(): Promise<Resultado<Categoria[]>> {
    const { data, error } = await this.sup.Sup.from('CategoriasCandy').select('*');
    if (error) return { datos: null, error: 'No se pudieron cargar las categorías.' };

    // Postgres no garantiza ningún orden si no se le pide uno: se ordena
    // acá por nombre, igual que las salas.
    const filas: Categoria[] = data;
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return { datos: filas, error: null };
  }

  // Dos pasos: la categoría y el log (D-14). Devuelve la categoría creada
  // para que la pantalla la sume a la lista sin volver a pedir todas.
  async crearCategoria(categoria: CategoriaPorCrear): Promise<Resultado<Categoria>> {
    // Con .select().single() el insert devuelve la fila creada (D-18).
    const { data, error } = await this.sup.Sup.from('CategoriasCandy')
      .insert(categoria)
      .select()
      .single();
    if (error) {
      return {
        datos: null,
        error: this.errorDeCategoria(error.code, 'No se pudo crear la categoría.'),
      };
    }
    const creada: Categoria = data;

    // Si falla el log, la categoría ya existe: se devuelve igual, con el
    // aviso en error. La pantalla la suma y muestra el aviso.
    const errorLog = await this.log.registrar(
      'crear',
      'CategoriasCandy',
      creada.id,
      `Creó la categoría "${creada.nombre}"`,
    );
    return { datos: creada, error: errorLog ? 'La categoría se creó. ' + errorLog : null };
  }

  async modificarCategoria(id: number, categoria: CategoriaPorCrear): Promise<ResultadoAccion> {
    const { error } = await this.sup.Sup.from('CategoriasCandy').update(categoria).eq('id', id);
    if (error) {
      return {
        hecho: false,
        error: this.errorDeCategoria(error.code, 'No se pudo cambiar el nombre.'),
      };
    }

    const errorLog = await this.log.registrar(
      'modificar',
      'CategoriasCandy',
      id,
      `Cambió el nombre de la categoría a "${categoria.nombre}"`,
    );
    if (errorLog) return { hecho: true, error: 'El nombre se cambió. ' + errorLog };
    return { hecho: true, error: null };
  }

  // Recibe la categoría entera para poder dejar el nombre en el log:
  // después del borrado ya no hay de dónde leerlo.
  async eliminarCategoria(categoria: Categoria): Promise<ResultadoAccion> {
    const { error } = await this.sup.Sup.from('CategoriasCandy').delete().eq('id', categoria.id);
    if (error) {
      // 23503 es "violación de clave foránea": hay productos que apuntan a
      // esta categoría.
      const mensaje =
        error.code === '23503'
          ? `No se puede borrar "${categoria.nombre}" porque tiene productos. Pasalos a otra categoría o borralos primero.`
          : 'No se pudo borrar la categoría.';
      return { hecho: false, error: mensaje };
    }

    const errorLog = await this.log.registrar(
      'eliminar',
      'CategoriasCandy',
      categoria.id,
      `Eliminó la categoría "${categoria.nombre}"`,
    );
    if (errorLog) return { hecho: true, error: 'La categoría se borró. ' + errorLog };
    return { hecho: true, error: null };
  }

  // 23505 es "violación de unique": ya hay una categoría con ese nombre
  // (constraint categorias_candy_nombre_unico).
  private errorDeCategoria(codigo: string, generico: string): string {
    return codigo === '23505' ? 'Ya existe una categoría con ese nombre.' : generico;
  }

  // ---------- Productos y combos ----------

  // Todos, también los inactivos: el admin tiene que poder verlos para
  // volver a activarlos (D-40).
  async traerTodos(): Promise<Resultado<Producto[]>> {
    const { data, error } = await this.sup.Sup.from('ProductosCandy').select('*');
    if (error) return { datos: null, error: 'No se pudieron cargar los productos.' };

    const filas: Producto[] = data;
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return { datos: filas, error: null };
  }

  // Todas las filas de CombosProductos, para mostrar en el listado lo que
  // trae cada combo. Son pocas: una por producto de cada combo.
  async traerItemsDeCombos(): Promise<Resultado<ComboItem[]>> {
    const { data, error } = await this.sup.Sup.from('CombosProductos').select('*');
    if (error) return { datos: null, error: 'No se pudo cargar lo que trae cada combo.' };

    const filas: ComboItem[] = data;
    return { datos: filas, error: null };
  }

  // Tres consultas en lugar de un select anidado, como traerUna de
  // películas (D-16): el producto, lo que trae si es un combo, y si él está
  // adentro de algún combo.
  async traerUno(id: number): Promise<Resultado<ProductoConItems>> {
    const { data, error } = await this.sup.Sup.from('ProductosCandy')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      // .single() da este código cuando no encuentra ninguna fila con ese id.
      const mensaje =
        error.code === 'PGRST116' ? 'No existe ese producto.' : 'No se pudo cargar el producto.';
      return { datos: null, error: mensaje };
    }
    const producto: Producto = data;

    const { data: dataItems, error: errorItems } = await this.sup.Sup.from('CombosProductos')
      .select('*')
      .eq('combo_id', id);
    if (errorItems) return { datos: null, error: 'No se pudo cargar lo que trae el combo.' };
    const items: ComboItem[] = dataItems;

    const { data: dataEnCombos, error: errorEnCombos } = await this.sup.Sup.from(
      'CombosProductos',
    )
      .select('*')
      .eq('producto_id', id);
    if (errorEnCombos) return { datos: null, error: 'No se pudo cargar el producto.' };
    const enCombos: ComboItem[] = dataEnCombos;

    return {
      datos: { ...producto, items, esta_en_combos: enCombos.length > 0 },
      error: null,
    };
  }

  // Alta en dos pasos cuando es un combo (D-40): primero el producto, para
  // tener su id, y después sus ítems. Si fallan los ítems, se borra el combo
  // recién creado: un combo sin productos no tiene sentido, y así el admin
  // puede volver a intentar con el mismo formulario.
  async crear(producto: ProductoPorCrear, items: ComboItemPorCrear[]): Promise<ResultadoAccion> {
    const { data, error } = await this.sup.Sup.from('ProductosCandy')
      .insert(producto)
      .select()
      .single();
    if (error) return { hecho: false, error: 'No se pudo crear el producto.' };
    const creado: Producto = data;

    if (creado.es_combo) {
      const itemsGuardados = await this.guardarItems(creado.id, items);
      if (!itemsGuardados) {
        const { error: errorBorrado } = await this.sup.Sup.from('ProductosCandy')
          .delete()
          .eq('id', creado.id);
        if (errorBorrado) {
          // No se pudo deshacer: el combo quedó vacío. hecho true para que
          // la pantalla no deje reenviar, que crearía otro combo igual.
          return {
            hecho: true,
            error: 'El combo se creó, pero sin sus productos, y no se pudo deshacer. Editalo para cargarlos o borralo.',
          };
        }
        return {
          hecho: false,
          error: 'No se pudieron guardar los productos del combo, así que el combo no se creó. Probá de nuevo.',
        };
      }
    }

    const errorLog = await this.registrarEnLog('crear', creado, items);
    if (errorLog) return { hecho: true, error: 'Se guardó. ' + errorLog };
    return { hecho: true, error: null };
  }

  // Edición: update del producto, borrado de sus ítems e insert de los
  // nuevos. Los ítems se reemplazan enteros, como los géneros de una
  // película: es más simple que comparar cuáles se agregaron y cuáles se
  // quitaron, y son pocas filas. Se borran siempre, aunque ya no sea un
  // combo: si dejó de serlo, así no le queda ninguno.
  async modificar(
    id: number,
    producto: ProductoPorModificar,
    items: ComboItemPorCrear[],
  ): Promise<ResultadoAccion> {
    const { error } = await this.sup.Sup.from('ProductosCandy').update(producto).eq('id', id);
    if (error) return { hecho: false, error: 'No se pudieron guardar los cambios.' };

    const { error: errorBorrado } = await this.sup.Sup.from('CombosProductos')
      .delete()
      .eq('combo_id', id);
    const itemsGuardados =
      errorBorrado ? false : !producto.es_combo || (await this.guardarItems(id, items));

    if (!itemsGuardados) {
      // Los datos del producto ya quedaron guardados (D-19): se avisa y el
      // admin vuelve a guardar desde la misma pantalla.
      return {
        hecho: true,
        error: 'Los datos se guardaron, pero no se pudieron actualizar los productos del combo. Probá guardar de nuevo.',
      };
    }

    const errorLog = await this.registrarEnLog('modificar', { id, ...producto }, items);
    if (errorLog) return { hecho: true, error: 'Los cambios se guardaron. ' + errorLog };
    return { hecho: true, error: null };
  }

  // Recibe el producto entero para poder dejar el nombre en el log.
  // Los ítems de un combo se borran solos (on delete cascade en combo_id).
  async eliminar(producto: Producto): Promise<ResultadoAccion> {
    const { error } = await this.sup.Sup.from('ProductosCandy').delete().eq('id', producto.id);
    if (error) {
      // 23503: otra fila apunta a este producto. Puede ser un combo que lo
      // trae, una recompensa o una compra. Para esos casos está la baja
      // lógica: se desactiva y deja de ofrecerse (D-40).
      const mensaje =
        error.code === '23503'
          ? `No se puede borrar "${producto.nombre}" porque está en un combo, en una recompensa o en una compra. Editalo y desactivalo para que no se ofrezca más.`
          : 'No se pudo borrar el producto.';
      return { hecho: false, error: mensaje };
    }

    const tipo = producto.es_combo ? 'el combo' : 'el producto';
    const errorLog = await this.log.registrar(
      'eliminar',
      'ProductosCandy',
      producto.id,
      `Eliminó ${tipo} "${producto.nombre}"`,
    );
    if (errorLog) return { hecho: true, error: 'Se borró. ' + errorLog };
    return { hecho: true, error: null };
  }

  // Inserta los ítems de un combo. Devuelve si salió bien.
  private async guardarItems(comboId: number, items: ComboItemPorCrear[]): Promise<boolean> {
    const filas: ComboItem[] = items.map((item) => ({
      combo_id: comboId,
      producto_id: item.producto_id,
      cantidad: item.cantidad,
    }));
    const { error } = await this.sup.Sup.from('CombosProductos').insert(filas);
    return !error;
  }

  // El log de un alta o una edición (R-38). El precio va en el detalle
  // porque el mail del 10/03 pide saber "quién modificó un precio". Si es
  // un combo, se registra además la carga de sus ítems, en su propia tabla.
  // Devuelve null si se registró todo, o el primer error.
  private async registrarEnLog(
    accion: 'crear' | 'modificar',
    producto: ProductoPorCrear & { id: number },
    items: ComboItemPorCrear[],
  ): Promise<string | null> {
    const verbo = accion === 'crear' ? 'Creó' : 'Modificó';
    const tipo = producto.es_combo ? 'el combo' : 'el producto';
    const errorProducto = await this.log.registrar(
      accion,
      'ProductosCandy',
      producto.id,
      `${verbo} ${tipo} "${producto.nombre}" con precio $${producto.precio}`,
    );
    if (errorProducto) return errorProducto;
    if (!producto.es_combo) return null;

    const unidades = items.reduce((total, item) => total + item.cantidad, 0);
    return await this.log.registrar(
      accion,
      'CombosProductos',
      producto.id,
      `Cargó lo que trae el combo "${producto.nombre}": ${items.length} productos, ${unidades} unidades en total`,
    );
  }
}
