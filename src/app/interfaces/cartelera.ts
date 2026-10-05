import { Funcion } from './funcion';
import { Genero, Pelicula } from './pelicula';

// Una película como la muestra la cartelera: la fila de Peliculas más sus
// géneros ya resueltos, con id y nombre. Los géneros viven en otra tabla
// (PeliculasGeneros); el servicio los busca y los agrega (D-16).
export interface PeliculaDeCartelera extends Pelicula {
  generos: Genero[];
}

// Las funciones de un mismo día, para el detalle de la película: una fila
// de días ("Lun 12") y, al elegir uno, sus horarios. El día es el de
// Argentina, no el del navegador (D-35).
export interface DiaDeFunciones {
  clave: string; // identifica al día: '2026-10-12'
  etiqueta: string; // lo que se muestra: 'Lun 12'
  funciones: Funcion[];
}

// Una fila de la vista PeliculasMasVendidas (supabase/schema.sql, sección
// 10; D-31). La vista expone solo esto: la película y cuántas entradas de
// compras pagadas tiene.
export interface PeliculaMasVendida {
  pelicula_id: number;
  entradas_vendidas: number;
}
