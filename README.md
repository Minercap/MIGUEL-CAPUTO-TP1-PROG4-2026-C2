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

Salvo `pages/`, las carpetas están creadas y todavía vacías: se llenan a medida que avanza
el desarrollo.

## Documentación

- [Requerimientos](docs/requerimientos.md) — qué pidió el cliente, mail por mail, con las
  interpretaciones adoptadas.
- [Modelo de datos](docs/modelo-datos.md) — las tablas, sus campos y qué requisito cubre
  cada una.
- [Decisiones](docs/decisiones.md) — registro de decisiones técnicas (D-01 en adelante),
  con lo elegido, lo descartado y el porqué.

## Arquitectura y decisiones técnicas

Se completa a medida que avanza el desarrollo.
