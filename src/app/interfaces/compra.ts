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
