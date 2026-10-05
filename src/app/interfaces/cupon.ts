// A quién le aplica un cupón (R-23, R-24). Son los valores del check de la
// columna condicion en supabase/schema.sql.
export type CondicionCupon = 'primera_compra' | 'mayor_50';

// Una fila de la tabla Cupones: modelo único de cupón (D-05). Cuándo aplica
// no se guarda: lo calcula la compra (D-41).
export interface Cupon {
  id: number;
  nombre: string;
  porcentaje: number; // entero de 1 a 100
  condicion: CondicionCupon;
  // Solo puede haber un cupón de primera compra activo a la vez (D-43).
  activo: boolean;
}

// Lo que se inserta en Cupones (interfaces por operación, clase 6). No
// lleva id: lo pone la base.
export interface CuponPorCrear {
  nombre: string;
  porcentaje: number;
  condicion: CondicionCupon;
  activo: boolean;
}

// Lo que se manda en el update. El formulario envía todos los campos, así
// que coincide con el alta. El id viaja aparte, en el .eq('id', id).
export interface CuponPorModificar {
  nombre: string;
  porcentaje: number;
  condicion: CondicionCupon;
  activo: boolean;
}
