// Las acciones que se auditan (R-38). 'validar' la usa el empleado con el QR.
export type AccionLog = 'crear' | 'modificar' | 'eliminar' | 'validar';

// Lo que se inserta en la tabla LogActividad (interfaces por operación,
// clase 6). No lleva id ni creado_en: los pone la base.
export interface RegistroLogPorCrear {
  usuario_id: string | null; // quién lo hizo
  accion: AccionLog;
  entidad: string; // nombre de la tabla afectada: 'Peliculas', 'Funciones'...
  entidad_id: string | null; // text en la base: sirve para ids numéricos y uuid
  detalle: string | null;
}
