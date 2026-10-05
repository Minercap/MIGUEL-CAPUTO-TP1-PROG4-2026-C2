import { Funcion } from './funcion';
import { Pelicula } from './pelicula';

// Una butaca del mapa. No sale de la base: la distribución de la sala es
// fija y se arma en el front (D-07). VIP y accesible se deducen de la fila.
export interface Butaca {
  fila: string; // 'A' a 'T'
  numero: number; // posición dentro de la fila, desde 1
  es_vip: boolean; // filas R, S y T (R-14)
  es_accesible: boolean; // filas J y K (R-15)
}

// Una fila del mapa: su letra y sus butacas, separadas en los tres bloques
// que dejan los dos pasillos (R-13).
export interface FilaDeSala {
  letra: string;
  bloques: Butaca[][];
}

// Una butaca que el comprador tiene elegida, con el precio que le
// corresponde en esta función. Es lo que muestra el resumen.
export interface ButacaElegida extends Butaca {
  precio: number;
}

// Una fila de la tabla ButacasOcupadas (supabase/schema.sql, sección 11.2;
// D-38): qué butaca de qué función ya está vendida, y nada más.
export interface ButacaOcupada {
  id: number;
  funcion_id: number;
  fila: string;
  numero: number;
}

// Todo lo que la pantalla de compra necesita saber de la función elegida:
// la función, su película y el nombre de su sala.
export interface FuncionParaComprar {
  funcion: Funcion;
  pelicula: Pelicula;
  sala_nombre: string;
}

// ---------- Pago y confirmación ----------

// Los medios de pago que acepta la base (check de Compras.medio_pago). El
// pago es simulado (A-01): se guarda solo cuál se eligió.
export type MedioPago = 'credito' | 'debito' | 'mercado_pago';

// Lo que sale del formulario de pago hacia la pantalla de compra. No lleva
// los datos de la tarjeta: se validan en el formulario y se descartan, no
// se mandan ni se guardan en ningún lado.
export interface DatosDePago {
  email: string | null; // solo si no hay sesión
  medio_pago: MedioPago;
  // Solo si no hay sesión y la película tiene restricción de edad (D-06).
  fecha_nacimiento: string | null; // 'AAAA-MM-DD'
}

// Una butaca como se le manda a la base: solo fila y número.
export interface ButacaPedida {
  fila: string;
  numero: number;
}

// Lo que se le manda a la función realizar_compra de la base (D-39). Los
// precios no van: los calcula la base.
export interface PedidoDeCompra {
  funcion_id: number;
  butacas: ButacaPedida[];
  email: string | null;
  medio_pago: MedioPago;
  fecha_nacimiento: string | null;
}

// Una butaca comprada, con el precio que cobró la base.
export interface EntradaComprada {
  fila: string;
  numero: number;
  es_vip: boolean;
  precio: number;
}

// Lo que devuelve realizar_compra cuando la compra salió bien: todo lo que
// necesita la pantalla de confirmación, porque un comprador sin sesión no
// puede volver a leer su compra.
export interface CompraConfirmada {
  codigo: string; // 'OLY-XXXX-XXXX': es lo que va en el QR (D-09)
  total: number;
  email: string;
  // true si la película tiene restricción de edad: la entrada lleva la
  // leyenda "Debe asistir acompañado por un adulto" (R-26).
  requiere_adulto: boolean;
  entradas: EntradaComprada[];
}
