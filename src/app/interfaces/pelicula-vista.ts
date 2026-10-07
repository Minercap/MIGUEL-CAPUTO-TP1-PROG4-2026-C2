// Una tarjeta de Mis películas (R-12): una función que el cliente vio
// según D-58 (compra no cancelada y función ya ocurrida), con su película y
// la calificación que le puso, si la reseñó.
export interface PeliculaVista {
  funcion_id: number;
  pelicula_id: number;
  nombre: string;
  imagen_url: string;
  fecha_hora: string; // inicio de la función
  estrellas: number | null; // null = todavía no la reseñó
}
