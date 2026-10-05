// Los valores que acepta la base en formato e idioma (R-04). Son los mismos
// del check de la tabla Funciones.
export type Formato = '2D' | '3D' | '4D' | '5D';
export type Idioma = 'castellano' | 'subtitulada';

// Una fila de la tabla Funciones (supabase/schema.sql).
export interface Funcion {
  id: number;
  pelicula_id: number;
  sala_id: number; // la asigna el sistema, no el admin (R-17)
  fecha_hora: string; // inicio, como lo devuelve Postgres: '2026-10-12T21:00:00+00:00'
  formato: Formato;
  idioma: Idioma;
  precio_base: number; // butaca común
  precio_vip: number; // filas R, S y T (R-14)
  creado_en: string;
}

// Lo que se inserta en Funciones (interfaces por operación, clase 6).
// No lleva id ni creado_en: los pone la base.
export interface FuncionPorCrear {
  pelicula_id: number;
  sala_id: number;
  fecha_hora: string;
  formato: Formato;
  idioma: Idioma;
  precio_base: number;
  precio_vip: number;
}

// Lo que se manda en el update. Coincide con el alta; el id viaja aparte,
// en el .eq('id', id).
export interface FuncionPorModificar {
  pelicula_id: number;
  sala_id: number;
  fecha_hora: string;
  formato: Formato;
  idioma: Idioma;
  precio_base: number;
  precio_vip: number;
}

// Una función con los nombres de su película y su sala, para el listado.
// Los nombres no están en Funciones: el servicio los busca en Peliculas y
// Salas y los agrega (D-16: consultas separadas en vez de un select anidado).
export interface FuncionConNombres extends Funcion {
  pelicula_nombre: string;
  sala_nombre: string;
}

// Lo que carga el admin en el formulario de edición de una función. No
// lleva sala: la decide el servicio. El inicio va como Date, en la hora de
// acá; el servicio lo pasa al texto que espera Postgres.
export interface DatosFuncion {
  pelicula_id: number;
  inicio: Date;
  formato: Formato;
  idioma: Idioma;
  precio_base: number;
  precio_vip: number;
}

// Lo que carga el admin en el alta (D-30): "lunes, martes y viernes a las
// 18, del 12 al 25 de octubre". De acá el servicio saca una función por
// cada fecha.
export interface Programacion {
  pelicula_id: number;
  dias: number[]; // como los numera Date.getDay(): 0 domingo, 1 lunes ... 6 sábado
  desde: Date;
  hasta: Date;
  hora: number;
  minutos: number;
  formato: Formato;
  idioma: Idioma;
  precio_base: number;
  precio_vip: number;
}

// Una función ya guardada y la sala que le tocó, para mostrarle al admin
// qué asignó el sistema.
export interface FuncionAsignada {
  cuando: string; // el inicio ya escrito para mostrar: 'lunes, 12/10, 18:00'
  sala_nombre: string;
}

// Lo que devuelven el alta y la edición de funciones. Es un ResultadoAccion
// (interfaces/resultado.ts) más la lista de lo que quedó guardado:
//   hecho false           -> no se guardó nada; error dice por qué.
//   hecho true, sin error -> salió todo bien.
//   hecho true, con error -> las funciones quedaron guardadas, pero falló el log.
export interface ResultadoFunciones {
  hecho: boolean;
  error: string | null;
  asignadas: FuncionAsignada[];
}
