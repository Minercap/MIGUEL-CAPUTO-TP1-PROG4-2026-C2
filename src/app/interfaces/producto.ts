// Una fila de la tabla CategoriasCandy (supabase/schema.sql, R-21).
export interface Categoria {
  id: number;
  nombre: string;
}

// Lo que se inserta y se modifica en CategoriasCandy (interfaces por
// operación, clase 6). Es el mismo campo en los dos casos: el id lo pone la
// base en el alta, y en la edición viaja aparte, en el .eq('id', id).
export interface CategoriaPorCrear {
  nombre: string;
}

// Una fila de la tabla ProductosCandy. Un combo es un producto más, con
// es_combo en true: lo que trae está en CombosProductos (D-40).
export interface Producto {
  id: number;
  categoria_id: number;
  nombre: string;
  precio: number; // en un combo, el precio fijo (R-22)
  es_combo: boolean;
  incluye_entrada: boolean; // solo puede ser true en un combo
  // Baja lógica: un producto inactivo no se ofrece, pero las compras lo
  // siguen referenciando (D-40, mismo criterio que D-34).
  activo: boolean;
}

// Lo que se inserta en ProductosCandy. No lleva id: lo pone la base.
export interface ProductoPorCrear {
  categoria_id: number;
  nombre: string;
  precio: number;
  es_combo: boolean;
  incluye_entrada: boolean;
  activo: boolean;
}

// Lo que se manda en el update. El formulario de edición envía todos los
// campos, así que coincide con el alta. El id viaja aparte.
export interface ProductoPorModificar {
  categoria_id: number;
  nombre: string;
  precio: number;
  es_combo: boolean;
  incluye_entrada: boolean;
  activo: boolean;
}

// Una fila de la tabla CombosProductos: qué producto trae un combo y
// cuántos. No tiene id propio: la clave es (combo_id, producto_id).
export interface ComboItem {
  combo_id: number;
  producto_id: number;
  cantidad: number;
}

// Lo que el formulario manda por cada renglón del combo. El combo_id no va:
// en el alta todavía no existe, y el servicio lo agrega después del insert.
export interface ComboItemPorCrear {
  producto_id: number;
  cantidad: number;
}

// Lo que devuelve traerUno: el producto, sus ítems si es un combo, y si él
// mismo está adentro de algún combo. Si lo está, no se puede convertir en
// combo: no hay combos dentro de combos (D-40).
export interface ProductoConItems extends Producto {
  items: ComboItem[];
  esta_en_combos: boolean;
}
