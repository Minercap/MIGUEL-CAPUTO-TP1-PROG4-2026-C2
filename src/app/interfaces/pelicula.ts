// Una fila de la tabla Generos. La lista es fija y se carga con SQL (D-15).
export interface Genero {
  id: number;
  nombre: string;
}

// Una fila de la tabla Peliculas (supabase/schema.sql). Sinopsis, imagen y
// fecha de estreno son obligatorias desde la corrección del 01/10 (R-04, D-25).
export interface Pelicula {
  id: number;
  nombre: string;
  sinopsis: string;
  imagen_url: string; // URL pública del póster en Storage (clase 7)
  duracion_minutos: number;
  restriccion_edad: 13 | 18 | null; // null = apta para todo público
  fecha_estreno: string; // estreno en Olympia Cinema. 'AAAA-MM-DD', como la devuelve Postgres
  // El admin decide si aparece. Dónde aparece (Próximamente o en cartelera)
  // no se guarda: sale de fecha_estreno (D-27).
  visible: boolean;
  preventa_habilitada: boolean;
  precio_preventa: number | null;
  creado_en: string;
}

// Lo que se inserta en Peliculas (interfaces por operación, clase 6).
// No lleva id ni creado_en: los pone la base.
export interface PeliculaPorCrear {
  nombre: string;
  sinopsis: string;
  imagen_url: string;
  duracion_minutos: number;
  restriccion_edad: 13 | 18 | null;
  fecha_estreno: string;
  visible: boolean;
  preventa_habilitada: boolean;
  precio_preventa: number | null;
}

// Lo que se manda en el update. El formulario de edición envía todos los
// campos, así que coincide con el alta. El id no va acá: viaja aparte,
// en el .eq('id', id).
export interface PeliculaPorModificar {
  nombre: string;
  sinopsis: string;
  imagen_url: string;
  duracion_minutos: number;
  restriccion_edad: 13 | 18 | null;
  fecha_estreno: string;
  visible: boolean;
  preventa_habilitada: boolean;
  precio_preventa: number | null;
}

// Lo que devuelve traerUna: la película más los ids de sus géneros, que
// viven en la tabla intermedia PeliculasGeneros (R-07, D-16).
export interface PeliculaConGeneros extends Pelicula {
  generos_ids: number[];
}

// Una fila de la tabla intermedia PeliculasGeneros.
export interface PeliculaGenero {
  pelicula_id: number;
  genero_id: number;
}
