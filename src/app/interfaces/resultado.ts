// Lo que devuelven los servicios de base de datos a los componentes.
// Imita la forma de Supabase ({ data, error }), pero con el error ya
// traducido a un mensaje que se puede mostrar en pantalla.

// Para las lecturas: vienen los datos o viene el error, nunca los dos.
export interface Resultado<T> {
  datos: T | null;
  error: string | null;
}

// Para altas, ediciones y bajas. Son dos campos porque guardar tiene más de
// un paso (la fila, sus géneros, el log) y puede fallar uno de los últimos:
//   hecho false           -> no se guardó nada; error dice por qué.
//   hecho true, sin error -> salió todo bien.
//   hecho true, con error -> el cambio principal quedó guardado, pero falló
//                            un paso posterior. La pantalla tiene que avisar,
//                            y no tiene que volver a enviar el formulario.
export interface ResultadoAccion {
  hecho: boolean;
  error: string | null;
}
