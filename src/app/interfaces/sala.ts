// Una fila de la tabla Salas (supabase/schema.sql). No guarda butacas: la
// distribución es la misma para todas las salas y vive en el front (D-07).
export interface Sala {
  id: number;
  nombre: string;
  // Una sala inactiva no recibe funciones nuevas: la asignación automática
  // la saltea (R-17).
  activa: boolean;
}

// Lo que se inserta en Salas (interfaces por operación, clase 6). No lleva
// id: lo pone la base.
export interface SalaPorCrear {
  nombre: string;
  activa: boolean;
}

// Lo que se manda en el update. El formulario de edición envía todos los
// campos, así que coincide con el alta. El id viaja aparte, en el
// .eq('id', id).
export interface SalaPorModificar {
  nombre: string;
  activa: boolean;
}
