// Las acciones que se auditan (R-38). 'validar' la usa el empleado con el QR.
export type AccionLog = 'crear' | 'modificar' | 'eliminar' | 'validar';

// Las mismas, como lista, para el filtro de la pantalla del log. Si se
// agrega una acción al tipo, hay que agregarla acá.
export const ACCIONES_LOG: AccionLog[] = ['crear', 'modificar', 'eliminar', 'validar'];

// Una fila de la tabla LogActividad, como la lee el admin.
export interface RegistroLog {
  id: number;
  usuario_id: string | null;
  accion: AccionLog;
  entidad: string;
  entidad_id: string | null;
  detalle: string | null;
  creado_en: string;
}

// Una fila como la muestra la pantalla: con quién la hizo ya resuelto (el
// mail, o el id corto si no se pudo leer).
export interface RegistroLogParaMostrar extends RegistroLog {
  usuario: string;
}

// Una página del log (D-61): las filas pedidas y cuántas hay en total con
// ese filtro, para calcular la cantidad de páginas.
export interface PaginaLog {
  registros: RegistroLogParaMostrar[];
  total: number;
}

// Lo que se inserta en la tabla LogActividad (interfaces por operación,
// clase 6). No lleva id ni creado_en: los pone la base.
export interface RegistroLogPorCrear {
  usuario_id: string | null; // quién lo hizo
  accion: AccionLog;
  entidad: string; // nombre de la tabla afectada: 'Peliculas', 'Funciones'...
  entidad_id: string | null; // text en la base: sirve para ids numéricos y uuid
  detalle: string | null;
}
