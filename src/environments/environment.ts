// Valores de configuración de la app. Las claves de Supabase se completan
// cuando se cree el proyecto: la publicable va acá, la service_role nunca.
export const environment = {
  // Clave VAPID pública de las notificaciones push (clase 10, D-52).
  // Completar con la clave pública que da "npx web-push generate-vapid-keys".
  // La privada no va acá: vive solo en los secrets de la Edge Function.
  PUBLIC_VAPID: 'BLYU2E9BSc5gs91FkBLfmzTHNbrc8YBdTNOrScx4Qvzf97hTc-0hbWPPfXu9u2rI8ROo82bvswiM7d31oFCV2Cg',
  SUPABASE_URL: 'https://umeichvxafgzvholvqce.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZWljaHZ4YWZnenZob2x2cWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTcwOTksImV4cCI6MjEwNjI5MzA5OX0.UhTQiHzriqI2m3TjI806ZK0a-K0ri7KR8mcT6r0kjrk',
};
