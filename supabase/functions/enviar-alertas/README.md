# Edge Function `enviar-alertas`

Manda las notificaciones push de las alertas de Próximamente (R-10, D-52). Supabase Cron la
ejecuta todos los días a las 09:00 de Argentina.

**Esta función no se probó.** Está escrita siguiendo la clase 10 y la documentación oficial,
pero nunca se desplegó ni se ejecutó. Los pasos de abajo incluyen cómo probarla.

## Antes de empezar: la clave secret

La función usa `withSupabase({ auth: 'secret:cron_alertas' })`: acepta **solo** la clave
secret que se llama `cron_alertas`, no la secret por defecto ni ninguna otra. Según la
documentación de `@supabase/server`, ese modo **solo funciona con las claves nuevas de
Supabase** (`sb_secret_...`), no con la `service_role` vieja. El proyecto usa la clave anon
vieja en el front (D-10), y eso no cambia. Lo que hace falta es que el proyecto tenga,
además, una clave secret nueva con ese nombre:

- Panel de Supabase → Project Settings → API Keys → crear una **Secret key** llamada
  `cron_alertas`. El nombre tiene que ser exactamente ese: es el que busca la función.
- Esa clave va **solo** a Vault (paso 5). No va al repo, ni a `environment.ts`, ni a Vercel.

Si el proyecto no ofrece las claves nuevas, frená acá: hay que decidir otra forma de
proteger la función.

## Pasos, en orden

### 1. Generar las claves VAPID

```
npx web-push generate-vapid-keys
```

Devuelve una clave pública y una privada. Se generan una sola vez: si se cambian, todas las
suscripciones guardadas dejan de servir.

### 2. Pegar la clave pública en el front

En `src/environments/environment.ts`, completar `PUBLIC_VAPID` con la clave **pública**.
Hacer commit y desplegar.

### 3. Cargar los secrets de la función

Panel de Supabase → Edge Functions → Secrets:

| Secret | Valor |
|---|---|
| `VAPID_PUBLIC` | la clave pública |
| `VAPID_SECRET` | la clave privada |
| `VAPID_MAIL` | un mail de contacto, sin `mailto:` (la función se lo agrega) |

### 4. Desplegar la función

Desde el panel (Edge Functions → Deploy a new function, pegando `index.ts`) o con la CLI:

```
npx supabase functions deploy enviar-alertas --no-verify-jwt
```

**La verificación de JWT tiene que quedar apagada** (`--no-verify-jwt`, o la opción "Verify
JWT" destildada en el panel). La función no recibe un JWT: recibe la clave secret en el
encabezado `apikey`, y la valida `withSupabase`. La documentación de `@supabase/server`
indica apagar esa verificación para el modo `secret`.

### 5. Correr la sección 15 de `supabase/schema.sql`

1. Correr la **15.1** y la **15.2** (tabla, políticas y permiso de columna).
2. Habilitar las extensiones **pg_cron** y **pg_net** desde el panel (Database →
   Extensions; Cron también aparece en Integrations → Cron).
3. Guardar en Vault la URL del proyecto y la clave secret. Estas dos líneas se corren a mano
   en el SQL Editor, con los valores reales, y no se guardan en ningún archivo:

   ```sql
   select vault.create_secret('https://<ref-del-proyecto>.supabase.co', 'project_url');
   select vault.create_secret('<la clave secret>', 'secret_key');
   ```

4. Correr la **15.3** (`cron.schedule`) y las consultas de la **15.4**.

### 6. Probarla a mano

Con la app desplegada en Vercel (las notificaciones no andan con `ng serve`):

1. Entrar como cliente desde el celular, abrir una película de Próximamente y activar la
   alerta. Aceptar las notificaciones.
2. Comprobar en la tabla `SuscripcionesPush` que hay una fila con ese `usuario_id`.
3. Hacer que la venta de esa película esté abierta: poner su `fecha_estreno` en hoy, o
   habilitarle la preventa con el estreno a menos de 7 días.
4. Llamar a la función, sin esperar a las 09:00. Desde una terminal (PowerShell):

   ```
   curl.exe -X POST "https://<ref-del-proyecto>.supabase.co/functions/v1/enviar-alertas" -H "apikey: <la clave secret>"
   ```

   Tiene que responder un JSON como este, y la notificación tiene que llegar al celular:

   ```json
   { "hoy": "2026-10-06", "candidatas": 1, "sin_pelicula_visible": 0, "venta_sin_abrir": 0, "alertas_revisadas": 1, "enviadas": 1, "sin_suscripcion": 0, "suscripciones_borradas": 0, "errores": [] }
   ```

5. Tocar la notificación: tiene que abrir el detalle de la película.
6. Llamarla de nuevo: `alertas_revisadas` tiene que dar 0, porque ya quedó notificada.
7. Llamarla con la clave anon en vez de la secret: tiene que rechazar el pedido.

Si algo falla, el detalle está en Edge Functions → `enviar-alertas` → Logs, y en el campo
`errores` de la respuesta.

## Qué devuelve

| Campo | Qué cuenta |
|---|---|
| `hoy` | El día que la función tomó como hoy, en hora argentina |
| `candidatas` | Alertas sin notificar que leyó, antes de filtrar. Si da 0 y en la base hay alertas pendientes, el problema es de lectura (permisos o proyecto), no de la regla |
| `sin_pelicula_visible` | Candidatas descartadas porque su película no existe o está oculta |
| `venta_sin_abrir` | Candidatas descartadas porque la venta todavía no abrió |
| `alertas_revisadas` | Alertas sin notificar de películas visibles cuya venta ya abrió |
| `enviadas` | Alertas avisadas con al menos un push, y marcadas como notificadas |
| `sin_suscripcion` | Alertas de usuarios sin ningún dispositivo: las ven como aviso en la app |
| `suscripciones_borradas` | Suscripciones vencidas (el envío respondió 404 o 410) |
| `errores` | Lista de lo que falló |

## Diferencias con el código de la clase 10

| En la clase | Acá | Por qué |
|---|---|---|
| Acepta la clave publishable y la secret | Solo la secret `cron_alertas` | La publishable es pública: cualquiera podía disparar los envíos. Con una clave propia, se revoca sin tocar las demás |
| Manda a todas las suscripciones | Solo a las del usuario de la alerta | Cada aviso es de una persona |
| `sendNotification` sin esperar | Con `await` y `try/catch` | Para saber si salió y borrar las vencidas |
| `data: { url }` | `data.onActionClick.default` | Es lo que lee el service worker de Angular al tocar la notificación |
| Clave VAPID privada en el README | Solo en los secrets | No se sube una clave privada al repo |
