import { ResultadoAccion } from './resultado';

// Qué parte de la compra valida el empleado: la entrada, en el ingreso a
// la sala, o el candy, en el mostrador (R-31, R-33). Son los dos valores
// que acepta p_tipo en la función validar_compra de la base (D-51).
export type TipoValidacion = 'entrada' | 'candy';

// Una butaca de la entrada validada.
export interface ButacaValidada {
  fila: string;
  numero: number;
  es_vip: boolean;
}

// Lo que el empleado mira al validar una entrada: a qué función entra la
// gente y a qué butacas.
export interface EntradaValidada {
  pelicula_nombre: string;
  funcion_fecha_hora: string; // el instante de la función, como lo da la base
  sala_nombre: string;
  butacas: ButacaValidada[];
}

// Un producto del candy que el empleado tiene que entregar.
export interface ProductoValidado {
  nombre: string;
  cantidad: number;
}

// El detalle que muestra la tarjeta verde después de validar. Según el
// tipo viene una parte o la otra: la entrada, o la lista de productos.
export interface DetalleValidado {
  tipo: TipoValidacion;
  codigo: string;
  entrada: EntradaValidada | null; // null si se validó el candy
  productos: ProductoValidado[]; // vacío si se validó la entrada
}

// Lo que devuelve el servicio de validación: un ResultadoAccion con el
// detalle para mostrar.
//   hecho false           -> no se validó; error dice por qué.
//   hecho true, sin error -> se validó y viene el detalle.
//   hecho true, con error -> se validó, pero falló el log o la lectura del
//                            detalle (que entonces puede venir en null).
export interface ResultadoValidacion extends ResultadoAccion {
  detalle: DetalleValidado | null;
}
