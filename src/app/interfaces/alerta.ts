// Una fila de la tabla Alertas (R-10): el usuario pidió que le avisen
// cuando salgan a la venta las entradas de esa película.
export interface Alerta {
  id: number;
  usuario_id: string;
  pelicula_id: number;
  // true cuando ya se le avisó, con un push o con el aviso de la app.
  notificada: boolean;
  creado_en: string;
}

// Lo que se inserta en Alertas (interfaces por operación, clase 6). No
// lleva id, notificada ni creado_en: los pone la base.
export interface AlertaPorCrear {
  usuario_id: string;
  pelicula_id: number;
}

// Un renglón del aviso que se muestra dentro de la app: una alerta del
// usuario cuya película ya está a la venta.
export interface AvisoDeVenta {
  alerta_id: number;
  pelicula_id: number;
  pelicula_nombre: string;
}

// Una fila de la tabla SuscripcionesPush (supabase/schema.sql, 15.1): un
// dispositivo en el que el usuario aceptó las notificaciones.
export interface SuscripcionPush {
  id: number;
  usuario_id: string;
  endpoint: string;
  auth: string;
  p256dh: string;
  creado_en: string;
}

// Lo que se inserta en SuscripcionesPush: los tres datos que devuelve el
// navegador al suscribirse (clase 10) y de quién es.
export interface SuscripcionPushPorCrear {
  usuario_id: string;
  endpoint: string;
  auth: string;
  p256dh: string;
}
