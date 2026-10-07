// Una fila de la tabla Resenias (R-08, D-59). La lectura es pública: la
// ven todos, con o sin sesión. El autor no se muestra, porque Usuarios no
// es de lectura pública; usuario_id sirve solo para reconocer la propia.
export interface Resenia {
  id: number;
  usuario_id: string;
  pelicula_id: number;
  estrellas: number; // de 1 a 5
  comentario: string | null; // opcional, hasta 280 caracteres
  creado_en: string;
}

// Lo que se inserta en Resenias (interfaces por operación, clase 6). No
// lleva id ni creado_en: los pone la base.
export interface ReseniaPorCrear {
  usuario_id: string;
  pelicula_id: number;
  estrellas: number;
  comentario: string | null;
}

// El promedio de una película (R-09): lo calcula el servicio a partir de
// sus reseñas. Una película sin reseñas no tiene promedio.
export interface PromedioResenias {
  pelicula_id: number;
  promedio: number; // de 1 a 5, con decimales
  cantidad: number;
}
