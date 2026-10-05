// Por qué se canjean los puntos (R-28, mail 03/03): una entrada gratis o un
// producto del candy. Son los valores del check de la columna tipo.
export type TipoRecompensa = 'entrada' | 'producto';

// Una fila de la tabla Recompensas (D-42). No tiene nombre propio: sale del
// producto, o es "Entrada".
export interface Recompensa {
  id: number;
  tipo: TipoRecompensa;
  // Cargado solo si el tipo es producto; null si es entrada (check cruzado).
  producto_id: number | null;
  costo_puntos: number; // entero de 1 a 100.000
  // Baja lógica: los canjes la siguen referenciando (D-42).
  activa: boolean;
}

// Lo que se inserta en Recompensas (interfaces por operación, clase 6). No
// lleva id: lo pone la base.
export interface RecompensaPorCrear {
  tipo: TipoRecompensa;
  producto_id: number | null;
  costo_puntos: number;
  activa: boolean;
}

// Lo que se manda en el update. Coincide con el alta; el id viaja aparte.
export interface RecompensaPorModificar {
  tipo: TipoRecompensa;
  producto_id: number | null;
  costo_puntos: number;
  activa: boolean;
}
