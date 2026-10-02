# Olympia Cinema

Aplicación web de un cine: cartelera, compra de entradas, candy bar y panel de
administración. TP 1 de Programación IV, 2026 C2.

**Producción:** https://olympiacinema.vercel.app/

## Stack

Angular 22 · Supabase · PWA · desplegado en Vercel.

## Cómo correrlo en local

```bash
npm install
ng serve
```

Queda en `http://localhost:4200/`.

### Probar la PWA

El service worker **no se sirve con `ng serve`**: la opción `serviceWorker` es del build,
así que el `ngsw-worker.js` no existe en el servidor de desarrollo. Para probarlo hay que
compilar y servir el resultado con un servidor estático:

```bash
ng build
npx http-server dist/TP1/browser -p 8080
```

El navegador solo registra un service worker en un contexto seguro: `localhost` o HTTPS.
Por eso sirve tanto el servidor estático local como la URL de producción, pero no una IP
de red por HTTP.

## Estructura

```
src/app/
  pages/          páginas con ruta propia, cargadas con lazy loading
  components/     componentes reutilizables
  services/       acceso a datos y lógica compartida
  interfaces/     tipos del dominio
  guards/         guards funcionales de ruta
  pipes/          pipes propios
  directives/     directivas propias
  interceptors/   interceptors de HttpClient
src/environments/ configuración por entorno, incluidas las claves de Supabase
```

Las carpetas que todavía no tienen archivos se llenan a medida que avanza el desarrollo.

## Documentación

- [Requerimientos](docs/requerimientos.md) — qué pidió el cliente, mail por mail, con las
  interpretaciones adoptadas.
- [Corrección del 01/10](docs/correccion-01-10.md) — respuestas de la cátedra en la reunión
  de seguimiento, lo que no se respetó de los mails y las reglas de validación de cada campo.
- [Modelo de datos](docs/modelo-datos.md) — las tablas, sus campos y qué requisito cubre
  cada una.
- [Esquema de la base](supabase/schema.sql) — script SQL con las tablas, RLS, las
  políticas y los permisos. Se corre completo desde el SQL Editor de Supabase.
- [Decisiones](docs/decisiones.md) — registro de decisiones técnicas (D-01 en adelante),
  con lo elegido, lo descartado y el porqué.

## Arquitectura y decisiones técnicas

Se completa a medida que avanza el desarrollo.

### Autenticación y roles

- `SupabaseService` es el único que crea el cliente de Supabase; el resto de la app accede
  a través de servicios.
- `Auth` guarda en signals el usuario de Supabase Auth y su fila de la tabla `Usuarios`,
  que es donde vive el rol: `admin`, `empleado` o `cliente` (D-12).
- Al registrarse se crea el usuario en Supabase Auth y después su fila en `Usuarios`, con el
  mismo id. Rol, puntos y crédito toman su valor por defecto: la base no deja cargarlos
  desde la app.
- Tres guards funcionales protegen las rutas: `logueadoGuard` (`/mi-cuenta`),
  `empleadoGuard` (`/empleado`, también para el admin) y `adminGuard` (`/admin`). Son
  async y esperan a que se restaure la sesión antes de decidir (D-13).
- El menú cambia según haya sesión y según el rol.
