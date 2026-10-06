# Pendientes de revisión — 06/10

## Traspaso para seguir en otra compu (06/10, tarde)

### Al llegar

1. `git pull` en `main`. Todo el trabajo está en `main`; no hay nada en otra rama ni sin
   commitear.
2. `npm install`. Trae dos dependencias nuevas de hoy:
   - `html5-qrcode`, desde el registro de npm.
   - SheetJS (`xlsx`), desde `vendor/xlsx-0.20.3.tgz`, que está en el repo. No necesita
     ninguna opción especial.
3. Revisar `src/environments/environment.ts`: tiene que tener `PUBLIC_VAPID`, `SUPABASE_URL`
   y `SUPABASE_KEY`. Las tres están commiteadas (son públicas), así que llegan con el pull.
4. `npx ng build` para confirmar que compila.
5. Git no tiene `user.name` ni `user.email` en esta compu; los commits de hoy salieron con
   una identidad automática. En la otra, revisar con `git config user.email`.

### En `main` y probado en producción

- **Notificaciones de Próximamente**, de punta a punta, el 06/10 a las 17:24: alerta, venta
  abierta con preventa, Cron ejecutado a mano y push recibido en Chrome (Windows). El
  registro está en `docs/pruebas.md`.

  La respuesta de esa prueba dio `candidatas: 1` y `enviadas: 1`. Un rato antes la función
  respondía `alertas_revisadas: 0` con el mismo dato; **la causa de ese fallo no quedó
  identificada**: revisando el código no apareció un error de permisos ni de filtro, y
  funcionó después de redesplegar con los campos de diagnóstico.

### En `main`, mergeado, pero sin probar a mano

- **Empleado:** validación con la cámara y con el código a mano.
- **Reportes:** los números con datos reales, el selector Semana / Mes y los gráficos.
- **Exportación:** PDF y Excel de la facturación.
- **De notificaciones, lo que la prueba de las 17:24 no cubre:** el aviso dentro de la app
  para quien no tiene suscripción, el mensaje con el permiso bloqueado, el clic en la
  notificación abriendo la película, la ejecución automática de Cron a las 09:00 y el push
  en un celular.

Las listas de qué probar están en la sección 3 de este archivo.

### En ramas sin mergear

**No hay ninguna.** `main` contiene todas las ramas del remoto (`feat/empleado`,
`feat/reportes`, `feat/notificaciones` y las anteriores): ninguna tiene commits que `main`
no tenga.

**`feat/cliente` (bloque E) no existe**, ni en esta compu ni en el remoto. Si se empezó, no
quedó en git. Hay que crearla desde `main`.

### Secretos

Revisado el 06/10 en todos los archivos y en el historial de todas las ramas: no hay
ninguna `sb_secret_`, ninguna clave `service_role`, ninguna clave privada ni valores reales
de Vault. Los únicos JWT del repo son la clave anon (D-10). La `PUBLIC_VAPID` está, y tiene
que estar.

### Lo de abajo es anterior al merge

El resto del archivo se escribió antes de integrar a `main` y de desplegar la función. Sirve
por las listas de pruebas (sección 3) y las dudas abiertas (sección 4), pero estas partes
quedaron viejas:

- La introducción y la sección 1 dicen que nada se integró y que la función no se desplegó.
- El punto 4.1 (clave secret nueva): resuelto en la práctica. La función corre con la clave
  `cron_alertas` (`auth: 'secret:cron_alertas'`).
- Sigue pendiente lo del punto 4.1 sobre `CLAUDE.md`, que dice que la secret no se usa en
  ningún lado, y el punto 4.3: revisar la sección Próximamente y el botón de la alerta, que
  son diseño de pantallas.

---

## Resumen anterior al merge

Resumen del trabajo hecho sin supervisión en los bloques A (empleado), B y C (reportes) y D
(notificaciones). Las ramas salen una de la otra: `feat/empleado` → `feat/reportes` →
`feat/notificaciones`.

**Lo que no se probó (al momento de escribirlo):** todo compila (`ng build` sin errores ni
avisos) y pasa los tests (`ng test`: 38 archivos, 54 tests), pero nada se había probado en
el navegador ni contra Supabase.

---

## 1. Lo que tenés que hacer a mano, en orden

### Para el empleado y los reportes

1. Desplegar `feat/notificaciones` (o `feat/reportes`) en Vercel y comprobar que el build
   instala SheetJS desde `vendor/` sin errores.
2. Hacer las pruebas de la sección 3 (empleado y reportes).

### Para las notificaciones

El detalle de cada paso está en `supabase/functions/enviar-alertas/README.md`.

1. **Correr la 15.1 y la 15.2** de `supabase/schema.sql` (tabla `SuscripcionesPush`,
   políticas y permiso de columna en `Alertas`). Sin esto, activar una alerta funciona, pero
   falla guardar la suscripción y falla cerrar el aviso de la app.
2. **Crear una clave secret nueva** en Supabase (`sb_secret_...`). Ver el punto 4.1: es lo
   que puede trabar todo el bloque.
3. **Generar las claves VAPID** con `npx web-push generate-vapid-keys`.
4. **Pegar la pública** en `PUBLIC_VAPID` de `src/environments/environment.ts`, commit y
   deploy.
5. **Cargar los secrets** `VAPID_PUBLIC`, `VAPID_SECRET` y `VAPID_MAIL` en la función.
6. **Desplegar la función** `enviar-alertas` con la verificación de JWT apagada.
7. **Habilitar `pg_cron` y `pg_net`**, guardar en Vault `project_url` y `secret_key` (a
   mano, no van al repo) y **correr la 15.3 y la 15.4**.
8. **Probar la función a mano** con `curl` (paso 6 del README) y hacer las pruebas de la
   sección 3 (notificaciones).

---

## 2. Qué quedó hecho

### Bloque A · Empleado (`feat/empleado`)

| Commit | Qué |
|---|---|
| `2ff8cba` | Sección 14 de `supabase/schema.sql`: `validar_compra` y baja de la política de update del empleado (ya corrida) |
| `204fbc1` | `services/escaner.ts` (único archivo que importa `html5-qrcode` 2.3.8), `services/validacion.ts`, `interfaces/validacion.ts` |
| `0db4a01` | `pages/empleado-validacion`, la ruta `/empleado` apuntando ahí y el placeholder `pages/empleado` borrado |

### Bloques B y C · Reportes (`feat/reportes`)

| Commit | Qué |
|---|---|
| `900f552` | `services/reportes.ts`, `interfaces/reporte.ts` y `reportes.spec.ts` (9 tests de D-56) |
| `3dabaa7` | `services/exportaciones.ts` (único archivo de los reportes que importa `xlsx` y `jspdf`) |
| `9698d86` | `components/grafico-barras`, `pages/admin-reportes`, la ruta `/admin/reportes` y el acceso "Reportes" del panel |
| `6362ba7` | D-55 y D-56 en `docs/decisiones.md` y en la sección 11 de `docs/requerimientos.md` |
| `55631ea` | SheetJS 0.20.3 en `vendor/xlsx-0.20.3.tgz`, instalado con `file:vendor/...` |
| `483976a` | Aviso del presupuesto inicial en 550 kB |
| `663077e` | Reportes con `.in()` y aviso por el límite de 1000 filas; D-57 |
| `a1c7186` | Reglas del rango en `validaciones.md` 3.13 y la tarjeta "Compras" en D-56 |

### Bloque D · Notificaciones (`feat/notificaciones`)

| Commit | Qué |
|---|---|
| `217636b` | Sección 15 de `supabase/schema.sql` (**sin correr**) |
| `90161a2` | `supabase/functions/enviar-alertas/index.ts` y su `README.md` (**sin desplegar**) |
| `575fc6c` | `services/notificaciones.ts`, `services/alertas.ts`, `interfaces/alerta.ts`, la sección Próximamente en la cartelera, la alerta en el detalle de la película, el aviso en el `App` y `PUBLIC_VAPID` vacío en `environment.ts` |

---

## 3. Qué hay que probar a mano

### Empleado (en Vercel, desde un celular, logueado como empleado)

- [ ] "Activar cámara" pide el permiso y muestra el video de la cámara trasera.
- [ ] Escanear una entrada recién comprada → tarjeta verde con película, fecha, sala y butacas.
- [ ] Mientras se muestra el resultado la cámara queda en pausa; "Escanear otro" la reanuda.
- [ ] Escanear la misma entrada otra vez → roja, "Esta entrada ya se validó el dd/mm a las HH:mm".
- [ ] Pasar a "Candy" con el mismo QR → verde con los productos (si la compra tiene candy), o
      "Esta compra no incluye candy".
- [ ] Compra cancelada → roja, "La compra OLY-… está cancelada".
- [ ] Código a mano con minúsculas y espacios (`oly-ab12 cd34`) → funciona.
- [ ] Código a mano con forma inválida → mensaje al tocar el campo y botón deshabilitado.
- [ ] Negar el permiso de la cámara → mensaje de error y la carga manual sigue andando.
- [ ] Salir de la pantalla con la cámara prendida → la cámara se apaga.
- [ ] Desde la consola, logueado como cliente: `rpc('validar_compra')` → "Solo un empleado
      puede validar"; `update` directo de `entrada_validada_en` → 0 filas.
- [ ] `LogActividad` tiene una fila por cada validación, con "Entrada OLY-…" o "Candy OLY-…".

### Reportes (logueado como admin)

- [ ] La pantalla abre con los últimos 30 días y los números coinciden con las compras de la base.
- [ ] Una compra cancelada suma a "Facturado" y no a "Entradas vendidas" ni a "Compras".
- [ ] Una compra pagada en parte con crédito factura solo lo cobrado con el medio de pago.
- [ ] Una compra hecha después de las 21:00 aparece en el día correcto (hora argentina).
- [ ] "Desde" posterior a "hasta" → mensaje y botón "Ver" deshabilitado.
- [ ] Un rango sin ventas → "No hay ventas en este período", sin tabla.
- [ ] "Exportar PDF" descarga el archivo con título, rango, tabla y totales.
- [ ] "Exportar Excel" descarga `facturacion.xlsx` y abre bien en Excel.
- [ ] El selector Semana / Mes cambia el agrupamiento de las películas más vistas.
- [ ] El primer producto del gráfico de candy va destacado en dorado.
- [ ] En el celular: todo en una columna y la tabla con su propio scroll horizontal.
- [ ] Los reportes siguen dando lo mismo después del cambio a `.in()` (commit `663077e`).

### Notificaciones (en Vercel, después de los pasos de la sección 1)

- [ ] La cartelera muestra la sección "Próximamente" con las películas visibles de estreno
      futuro, y cada una lleva a su detalle.
- [ ] En el detalle de una película cuya venta no abrió, sin sesión: aparece el link "Ingresá".
- [ ] Con sesión: "Avisarme cuando salgan a la venta" guarda la alerta y pregunta "¿Querés
      que te avisemos con una notificación?".
- [ ] "Sí, avisame" muestra el cartel del navegador; al aceptar, hay una fila en
      `SuscripcionesPush` con ese `usuario_id`.
- [ ] "Solo en la app" no pide ningún permiso y la alerta queda guardada igual.
- [ ] Bloquear el permiso → mensaje "No diste permiso…" y la alerta sigue activa.
- [ ] Recargar el detalle → sigue diciendo "Alerta activada".
- [ ] Activar una segunda alerta en el mismo dispositivo → no vuelve a preguntar ni duplica
      la suscripción.
- [ ] Con `ng serve`: "Sí, avisame" muestra un error claro y no queda trabado.
- [ ] Llamar a la función a mano → llega la notificación; tocarla abre el detalle.
- [ ] Usuario con alerta y sin suscripción, con la venta abierta: al iniciar sesión (o
      recargar con sesión) ve el aviso "Ya están a la venta" con el link. "Cerrar" lo saca y
      no vuelve a aparecer.
- [ ] La función con la clave anon → pedido rechazado.

---

## 4. Para decidir o confirmar

### 4.1 La Edge Function necesita una clave secret nueva

**Qué:** pediste que la función acepte solo la clave secret. La documentación de
`@supabase/server` dice que `withSupabase({ auth: 'secret' })` valida el encabezado `apikey`
contra las claves nuevas (`sb_secret_...`) y que **no admite las claves viejas** (la
`service_role` JWT). El proyecto usa la clave anon vieja (D-10).

**Qué hice:** escribí la función así y lo documenté en su README. No lo pude probar.

**Qué hay que confirmar:** que el proyecto permite crear una secret key nueva sin cambiar la
anon del front. Si no se puede, la función no va a aceptar ningún pedido y hay que decidir
otra forma de protegerla.

**Además:** `CLAUDE.md` dice "la `service_role` / secret no se usa en ningún lado". Acá se
usa, del lado del servidor: en Vault (para que Cron llame a la función) y dentro de la
función (`ctx.supabaseAdmin`, que no pasa por RLS). No está en el repo ni en el front.
Conviene actualizar esa frase y registrar el cambio en D-52 o en una decisión nueva; no lo
toqué porque es una regla tuya.

### 4.2 Pasos de Cron que la documentación no dejó claros

Seguí la guía "Scheduling Edge Functions". Estas partes no salen de ahí:

- **La hora es UTC.** La guía no lo dice. Usé `'0 12 * * *'` (12:00 UTC = 09:00 de
  Argentina) porque `pg_cron` trabaja en UTC por defecto, pero no lo vi confirmado en la
  documentación de Supabase. Se comprueba mirando `start_time` en `cron.job_run_details`
  después de la primera ejecución.
- **Cómo se habilitan `pg_cron` y `pg_net`.** La guía dice que hay que habilitarlas, sin el
  paso exacto. En el README puse el panel (Database → Extensions); no escribí ningún
  `create extension` en `schema.sql`.
- **La clave que manda Cron.** El ejemplo oficial guarda en Vault la clave *publishable* y la
  manda en `apikey`. Usé el mismo encabezado con la *secret*, guardada como `secret_key`.
- **Correr `cron.schedule` dos veces.** No verifiqué si actualiza el trabajo o crea otro con
  el mismo nombre. Corrélo una sola vez; si hay que cambiarlo, antes
  `select cron.unschedule('enviar-alertas-diario');`.

Las rutas del panel de Supabase que nombra el README (API Keys, Secrets, Extensions) las
escribí de memoria: pueden llamarse distinto.

### 4.3 Construí la sección Próximamente y la activación de la alerta

**Qué encontré:** de Próximamente y de Alertas existía solo la base: la tabla `Alertas` con
sus políticas. No había sección Próximamente (la cartelera mostraba solo las estrenadas),
ni servicio de alertas, ni botón para activarlas.

**Qué hice**, con lo mínimo para que el circuito se pueda usar:

- **Cartelera:** una sección "Próximamente" al final, con póster, nombre y fecha de estreno,
  que lleva al detalle. Reusa las clases de la grilla.
- **Detalle de la película:** mientras la venta no abrió, una caja con "Avisarme cuando
  salgan a la venta". Sin sesión, un link a ingresar.
- **No hay "quitar alerta":** ningún mail lo pide. La política de borrado ya existe si lo
  querés.

Es diseño de pantallas, que decidís vos: revisalo y decime si lo querés en otro lugar.

### 4.4 Cosas de JavaScript que no son del catálogo

Las usé en `services/notificaciones.ts` porque sin ellas la pantalla se podía quedar
esperando para siempre. No son de Angular ni de Supabase, pero conviene que las tengas
vistas para el oral:

- **`setTimeout` y `Promise.race`:** `requestSubscription` espera al service worker. Si
  todavía no tomó el control de la página (primera visita, o `ng serve`), no responde nunca.
  Con un límite de 30 segundos, el botón muestra un error en vez de quedar en "Activando…".
  Si el usuario tarda más de 30 segundos en contestar el cartel del navegador, ve ese error
  aunque después acepte; el segundo intento funciona.
- **`SwPush.subscription` con `subscribe()`:** para saber si el dispositivo ya está
  suscripto. Es un observable, como el de `HttpClient` de la clase 3, pasado a promesa.
- **`DOMException` con `name === 'NotAllowedError'`:** para distinguir "no dio permiso" de
  cualquier otro error.

Si alguna te parece 🟡, decime y busco otra forma.

### 4.5 Comportamientos a tener en cuenta

- **Un dispositivo, dos cuentas.** `endpoint` es único. Si en el mismo navegador se suscribe
  un segundo usuario, el insert falla y ve "Este dispositivo ya recibe notificaciones de
  otra cuenta"; su aviso le llega dentro de la app.
- **Aviso en la app antes de las 09:00.** Si el usuario entra el día que abre la venta
  antes de que corra Cron, ve el aviso en la app. Si lo cierra, la alerta queda notificada y
  el push ya no sale.
- **El admin y `Alertas`.** El `revoke update` + `grant update (notificada)` de la 15.2
  también limita al admin a esa columna. Hoy ninguna pantalla del admin edita alertas.
- **`.update({ notificada: true })`** va con un objeto escrito en el lugar, sin una interfaz
  `AlertaPorModificar`. Es un solo campo; si querés la interfaz, la agrego.

### 4.6 SheetJS desde `vendor/` · RESUELTO, con una salvedad

`package.json` apunta a `file:vendor/xlsx-0.20.3.tgz` (2,4 MB, commiteado). `npm install`
terminó sin flags y sin errores después de borrar `node_modules`.

**La salvedad:** el borrado no fue completo. Había un `ng serve` corriendo desde las 12:16
que tenía tomados cuatro archivos binarios (`esbuild`, `lmdb`, `msgpackr-extract`,
`rolldown`), y Windows no los dejó borrar. Todo lo demás, `xlsx` incluido, se reinstaló de
cero. No cerré ese proceso porque no lo abrí yo. Para una prueba completa: cerrar `ng
serve`, borrar `node_modules` y correr `npm install`.

### 4.7 El bundle inicial · RESUELTO

El aviso del presupuesto inicial pasó de 500 kB a 550 kB en `angular.json`. El bundle
inicial pesa 500,64 kB (128 kB comprimido).

Medido con `ng build --stats-json`: **`html5-qrcode`, `xlsx`, `jspdf` y `qrcode` no están en
el bundle inicial.** Cada una queda en un chunk lazy, que se descarga recién al entrar a la
pantalla que la usa. Lo que ocupa el inicial:

| Paquete | Tamaño |
|---|---|
| Angular (`core` 162, `router` 91, `common` 40, `platform-browser` 15, `service-worker` 7) | 315 kB |
| Supabase (`auth-js` 131, `realtime-js` 41, `phoenix` 33, `storage-js` 29, `postgrest-js` 22, `supabase-js` 14, otros 10) | 280 kB |
| `rxjs` y `tslib` | 23 kB |
| Código propio (`app`, rutas, guards, servicios de sesión) | 7 kB |

Los tamaños por paquete salen del `stats.json` y suman más que el total (626 contra 500 kB),
no sé por qué: sirven como proporción, no como medida exacta. El inicial es casi todo
framework y cliente de Supabase: no hay nada propio para sacar.

Esa medición es anterior al bloque D. El bloque D suma al inicial el servicio de alertas y
el aviso del `App`; el build sigue sin avisos.

### 4.8 Detalles del bloque del empleado (sin cambios desde el resumen anterior)

- **`ResultadoValidacion`:** `validar()` devuelve un `ResultadoAccion` extendido con
  `detalle`, porque la pantalla lo necesita.
- **Candy sumado por producto:** si un producto está pagado y además canjeado, el empleado
  ve una sola línea con la cantidad total a entregar.
- **`--color-exito`:** variable nueva en `:root` de `src/styles.css`, para la tarjeta verde.
- **`pausar()` y `reanudar()` en `Escaner`**, además de `iniciar` y `detener`.
- **Sin recuadro de enfoque:** la cámara lee el QR en toda la imagen. No configuré `qrbox`.
- **SQL (ya corrido):** `validar_compra` usa `es_empleado() is not true`, tiene un
  `revoke execute ... from public, anon` antes del `grant` y un mensaje extra para un
  `p_tipo` inválido.

### 4.9 Autor de los commits

Git no tiene `user.name` ni `user.email` configurados y usa una identidad automática
(`migueljosecaputo@buenosaires.gob.ar`). Todos los commits de hoy salieron con ese autor.
