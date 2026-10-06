import { Resultado } from './resultado';

// Los reportes del admin (R-35 a R-37). Qué cuenta cada uno está en D-56.

// Lo que devuelve cada reporte: el Resultado de siempre y un dato más.
//   incompleto true -> alguna consulta trajo el máximo de filas que
//                      Supabase devuelve de una vez (1000, D-57): puede
//                      haber datos que quedaron afuera, y la pantalla avisa.
export interface ResultadoReporte<T> extends Resultado<T> {
  incompleto: boolean;
}

// Un renglón de la facturación: un día, en hora argentina.
export interface FilaFacturacion {
  dia: string; // 'AAAA-MM-DD'
  compras: number; // compras no canceladas hechas ese día
  entradas: number; // entradas de esas compras
  facturado: number; // lo cobrado con el medio de pago, canceladas incluidas
}

// La suma de todos los renglones: las tres tarjetas de arriba y la fila de
// totales de la tabla y del PDF.
export interface TotalesFacturacion {
  compras: number;
  entradas: number;
  facturado: number;
}

// Cómo se agrupan las películas más vistas.
export type PeriodoReporte = 'semana' | 'mes';

// Una película dentro de un período, con las entradas que se usaron.
export interface PeliculaVista {
  nombre: string;
  entradas: number;
}

// Una semana (de lunes a domingo) o un mes, con sus películas ordenadas de
// la más vista a la menos vista.
export interface PeriodoMasVistas {
  inicio: string; // 'AAAA-MM-DD': el lunes de la semana o el día 1 del mes
  etiqueta: string; // 'Semana del 05/10 al 11/10' u 'Octubre 2026'
  peliculas: PeliculaVista[];
}

// Un producto del candy con las unidades vendidas.
export interface ProductoVendido {
  nombre: string;
  cantidad: number;
}

// Una barra del componente grafico-barras: qué es y cuánto vale.
export interface DatoDeBarra {
  etiqueta: string;
  valor: number;
}
