# Auditoría de la entrega — 07/10/2026

Revisión del TP contra `docs/catalogo-clases.md` (clases 1 a 10) y `docs/requerimientos.md`.
Se hizo leyendo el código de `main` (`0e5728a`, 06/10 17:31). **No se compiló ni se probó en
el navegador**: lo que figura como "hecho" es que el código está, no que se verificó
funcionando.

> Atención: `docs/correccion-01-10.md` da como fecha de entrega el **martes 06/10**. Hoy es
> 07/10.

---

## 1. Temas vistos en clase

| Clase | Tema | Dónde se usa |
|---|---|---|
| 1 | Componentes standalone, `selector`/`imports`/`templateUrl`/`styleUrl` | Todos los de `pages/` y `components/` |
| 1 | Ruteo con `title`, `redirectTo`, comodín `**` | `app.routes.ts` (comodín → `no-encontrada`). `redirectTo` **no se usa** (no hace falta) |
| 2 | Lazy loading con `loadComponent` | `app.routes.ts`, `pages/admin.routes.ts`, `pages/auth.routes.ts` |
| 2 | Rutas hijas con `loadChildren` | `app.routes.ts` → `admin.routes.ts` y `auth.routes.ts` |
| 2 | `ngOnInit` / `ngOnDestroy` | `ngOnDestroy` en `pages/compra/compra.ts`, `pages/empleado-validacion/empleado-validacion.ts`, `services/compras.ts`, `services/escaner.ts`. `ngOnInit` en casi todas las páginas |
| 2 | `ngOnChanges` | `components/campo-fecha/campo-fecha.ts` |
| 2 | Signals (`signal`, `.set`, `.update`) | En todas las páginas y en `services/auth.ts` |
| 2 | `@if` / `@for` + `@empty` / `@switch` | `app.html` (`@switch` por rol), `pages/compra/compra.html`, `components/resumen-compra/resumen-compra.html`, `pages/mi-cuenta/mi-cuenta.html` (`@empty`) |
| 2 | `[(ngModel)]` con `FormsModule` | **NO SE USA** (todo es reactivo; no es un problema) |
| 3 | `input()` / `output()` | `input` en `components/campo-fecha`, `candy`, `entrada`, `pago`, `resumen-compra`, `grafico-barras`. `output` en `components/candy/candy.ts` y `components/pago/pago.ts` |
| 3 | Servicios con `@Service()` + `inject()` | Todo `services/` |
| 3 | Interfaces en `interfaces/` | 17 archivos en `src/app/interfaces/` |
| 3 | **HttpClient** (`provideHttpClient`, `http.get`, `subscribe`) | **NO SE USA.** No hay `provideHttpClient` en `app.config.ts` ni ningún `HttpClient` en el proyecto; todo va por `supabase-js` |
| 4 | Formularios reactivos, `FormBuilder`, validators | `pages/login`, `pages/registro`, `pages/admin-*-formulario`, `admin-cupones`, `admin-recompensas`, `components/pago` |
| 4 | `formGroupName` (grupo anidado) | `components/pago/pago.html`, `pages/admin-producto-formulario/admin-producto-formulario.html` |
| 4 | **FormArray** | Sí: géneros en `pages/admin-pelicula-formulario/admin-pelicula-formulario.ts`, días en `admin-funcion-formulario.ts`, renglones del combo en `admin-producto-formulario.ts`, canjes en `components/pago/pago.ts` |
| 4 | Validadores propios (`ValidatorFn`) | `src/app/validadores/validadores.ts` |
| 4 | Campo reutilizable con `<ng-content />` | `components/campo-fecha/` |
| 5 | Servicio único de Supabase con `environment` | `services/supabase.ts` + `src/environments/environment.ts` (está en el repo) |
| 5 | Servicio `Auth` con `usuarioActual`, `onAuthStateChange`, `signUp` con metadatos | `services/auth.ts` |
| 5 | Guards funcionales | `guards/logueado-guard.ts`, `admin-guard.ts`, `empleado-guard.ts` |
| 6 | CRUD con `{ data, error }` | Todo `services/` |
| 6 | RLS | `supabase/schema.sql` (todas las tablas) |
| 6 | **Realtime `postgres_changes`** | `services/compras.ts:249` (canal por función, mapa de butacas) con `unsubscribe()` en `ngOnDestroy`; lo usa `pages/compra/compra.ts` |
| 6 | Broadcast | **NO SE USA** (no hace falta) |
| 7 | **Storage** (`upload` + `getPublicUrl`) | `services/peliculas.ts:181-186`, bucket `peliculas` (pósters) |
| 7 | Tabla de perfil `Usuarios` | `supabase/schema.sql`, `services/auth.ts` |
| 8 | **Directiva propia** | **NO SE USA.** `src/app/directives/` solo tiene `.gitkeep` |
| 8 | `[class.x]` / `[style.x]` | `[class.*]` en muchas plantillas; `[style.*]` en `components/grafico-barras/grafico-barras.html` |
| 8 | Pipes incorporados | `DatePipe` (varias páginas), `TitleCasePipe` (`entrada`, `compra`, `detalle-pelicula`), `CurrencyPipe` y `DecimalPipe` (`admin-reportes`, `grafico-barras`). `PercentPipe` y `AsyncPipe` no se usan |
| 8 | **Pipe propio** | Sí, uno: `pipes/estado-pelicula-pipe.ts`, usado solo en `pages/admin-peliculas/admin-peliculas.html` |
| 9 | **Interceptor** | **NO SE USA.** `src/app/interceptors/` solo tiene `.gitkeep`; sin HttpClient no tiene dónde actuar |
| 9 | Servicio de carga (`Loading`) | **NO SE USA** como servicio global; cada página tiene su signal `cargando` |
| 9 | PWA: `provideServiceWorker`, `ngsw-config.json`, manifest | `app.config.ts`, `ngsw-config.json`, `public/manifest.webmanifest`, `angular.json` (`serviceWorker`), `src/index.html` |
| 10 | **SwPush** (`requestSubscription`) | `services/notificaciones.ts` |
| 10 | Edge Function con `web-push` | `supabase/functions/enviar-alertas/index.ts` |
| 10 | `enabled: !isDevMode()` | **No se sigue**: `app.config.ts:14` tiene `enabled: true` (funciona igual; es un detalle) |

**Resumen:** de los temas que pediste mirar, faltan **HttpClient (3), interceptor (9) y
directiva propia (8)**. Los tres se pueden cubrir juntos con poco código (ver sección 4).
FormArray, Realtime, Storage, pipe propio y SwPush están.

---

## 2. Requerimientos

| Id | Requerimiento | Estado | Dónde |
|---|---|---|---|
| R-01 | Registro con todos los datos | Hecho | `pages/registro/` |
| R-02 | Compra anónima | Hecho | `pages/compra/` (ruta sin guard), `components/pago/` |
| R-03 | Perfil: datos, puntos, crédito, **historial de canjes** | **Parcial** | `pages/mi-cuenta/`. Puntos y crédito, sí. Los canjes solo aparecen dentro del resumen de cada compra (`components/resumen-compra/resumen-compra.html:53`); no hay un historial de canjes propio ni se ven los datos personales del registro |
| R-04 | Datos de la película, obligatorios | Hecho | `pages/admin-pelicula-formulario/`, `not null` en `schema.sql` |
| R-05 | Control de cartelera | Hecho | `pages/admin-peliculas/`, columna `visible` |
| R-06 | 3 más vendidas primero | Hecho | `pages/cartelera/cartelera.html:12`, vista en `schema.sql` |
| R-07 | Buscador con filtro por género | Hecho | `pages/cartelera/cartelera.html:42-63` |
| R-08 | **Reseñas** | **Falta** | Tabla `Resenias` y RLS en `schema.sql:220` y `:492`, pero en el front no hay nada: `pages/detalle-pelicula/detalle-pelicula.html:126-131` es una sección vacía con el comentario "Se construye mañana" |
| R-09 | **Promedio de calificación** | **Falta** | Depende de R-08 |
| R-10 | Próximamente + alerta | Hecho | `pages/cartelera/cartelera.html:94`, `pages/detalle-pelicula/` (alerta), `services/alertas.ts`, `services/notificaciones.ts`, Edge Function. Probado de punta a punta el 06/10 (`docs/pruebas.md`) |
| R-11 | Preventa | Hecho | `pages/admin-pelicula-formulario/`, precios en `realizar_compra` |
| R-12 | **Mis películas** | **Falta** | No hay página ni sección. `mi-cuenta` lista compras, no un historial visual con pósters y calificación propia (además depende de R-08) |
| R-13 | Distribución 20 filas / J-K | Hecho | Mapa en `pages/compra/` |
| R-14 | VIP R-S-T | Hecho | `pages/compra/compra.html:74,103` |
| R-15 | Accesibles J-K | Hecho | `pages/compra/compra.html:75,106` |
| R-16 | Butacas en tiempo real | Hecho | `services/compras.ts:249` (Realtime) |
| R-17 | Asignación automática de sala | Hecho | `services/funciones.ts:165` (`asignarSalas`) |
| R-18 | Sin superposición | Hecho | `services/funciones.ts` + trigger `funciones_sin_superposicion` en `schema.sql` |
| R-19 | 30 minutos de separación | Hecho | `services/funciones.ts:24` + mismo trigger |
| R-20 | Entrada con QR y PDF | Hecho | `services/tickets.ts` (`qrcode` + `jspdf`), `components/entrada/` |
| R-21 | Candy por categorías, retiro con el mismo QR | Hecho | `pages/admin-productos/`, `components/candy/`, `services/validacion.ts` |
| R-22 | Combos destacados | Hecho | `pages/admin-producto-formulario/`, `components/candy/` |
| R-23 | Cupón de bienvenida configurable | Hecho | `pages/admin-cupones/`, `components/pago/pago.html:56` |
| R-24 | Cupón para mayores de 50 | Hecho | `pages/admin-cupones/`, `realizar_compra` |
| R-25 | Restricción de edad en la compra | Hecho | `components/pago/pago.html:26-46` (anónimo declara fecha) |
| R-26 | Aviso de adulto | Hecho | `pages/compra/compra.html:21`, `services/tickets.ts` |
| R-27 | 1 punto por peso | Hecho | `realizar_compra` en `schema.sql` (`puntos_generados`) |
| R-28 | Canje de puntos | Hecho | `pages/admin-recompensas/`, `components/pago/` (FormArray de canjes) |
| R-29 | Cancelación hasta 2 h antes | Hecho | `pages/mi-cuenta/`, `cancelar_compra` en `schema.sql:2890` |
| R-30 | Crédito | Hecho | `pages/mi-cuenta/` (saldo), `components/pago/pago.html:115` (uso) |
| R-31 | Validación por QR | Hecho, sin probar | `pages/empleado-validacion/`, `services/escaner.ts` (`html5-qrcode`) |
| R-32 | Carga manual del código | Hecho, sin probar | `pages/empleado-validacion/` |
| R-33 | Un solo uso | Hecho | `validar_compra` en `schema.sql:3737` |
| R-34 | Panel de administración | Hecho | `pages/admin/` y `pages/admin-*` |
| R-35 | Reporte de facturación | Hecho, sin probar | `pages/admin-reportes/`, `services/reportes.ts` |
| R-36 | Exportación PDF y Excel | Hecho, sin probar | `services/exportaciones.ts` (`jspdf` + `xlsx`) |
| R-37 | Gráficos | Hecho, sin probar | `components/grafico-barras/` (CSS propio), selector semana/mes en `admin-reportes.html:132` |
| R-38 | **Log de actividad** | **Parcial** | Se **registra**: `services/log-actividad.ts`, llamado desde funciones, películas, salas, productos, cupones, recompensas y validación. Pero **no hay pantalla para verlo**: en `pages/admin/admin.ts:31` el acceso "Log" tiene `ruta: null` y se muestra como "Próximamente"; no existe la ruta en `admin.routes.ts`. La política de lectura para el admin ya está (`schema.sql:537`) |
| R-39 | Estilo visual propio | Hecho | `src/styles.css` y CSS por componente, sin librerías de UI |
| R-40 | Navegación fácil | Hecho | Menú por rol en `app.html` |
| R-41 | Fechas y horas sin calendario | Hecho | `components/campo-fecha/`; no queda ningún `type="date"` |
| A-01 | Pago simulado completo + PDF | Hecho | `components/pago/`, `components/resumen-compra/`, `services/tickets.ts` |
| A-02 | **Accesos rápidos del login** | Hecho | `pages/login/login.html:30-40`, cuentas en `pages/login/login.ts:13`. Completan sin enviar (`type="button"`) |
| A-03 | Admin y empleado separados | Hecho | `es_empleado()` en `schema.sql:1227`, `guards/empleado-guard.ts`, menú en `app.html` |
| P-01 | Mapa del cine | No se construye (pendiente de aprobación, correcto) | — |

**Pendientes de revisión.** El README todavía dice que las carpetas vacías "se llenan a
medida que avanza el desarrollo" y le falta la parte de arquitectura y decisiones técnicas
que pide la consigna (hoy remite a `docs/`).

---

## 3. Estado de las ramas

Revisado con el historial completo (el clon venía recortado a 50 commits, lo que hacía
parecer que `feat/admin`, `feat/auth` y `feat/correcciones` tenían trabajo sin mergear; no
es así).

| Rama | Commits que `main` no tiene |
|---|---|
| `feat/auth`, `feat/admin`, `feat/correcciones`, `feat/funciones`, `feat/cartelera`, `feat/compra`, `feat/compra-2`, `feat/candy`, `feat/empleado`, `feat/reportes`, `feat/notificaciones` | 0 (todas mergeadas) |
| `claude/trusting-davinci-213b6z` | 0 (igual a `main`) |
| **`feat/cliente`** | **No existe**, ni en el remoto ni localmente. No hay ningún commit de reseñas, Mis películas ni pantalla del log en ninguna rama |

`main` tiene todo lo que hay. Lo que falta (sección 2) no está empezado en git.

---

## 4. Falta para entregar (por impacto en la nota)

1. **Reseñas y promedio (R-08, R-09).** Lo único del cliente que no tiene nada de front, y
   en un lugar visible: la sección vacía en el detalle de cada película. La tabla y la RLS
   ya están; falta el servicio, el formulario (estrellas + comentario) y la lista con el
   promedio.
2. **Pantalla del log de actividad (R-38).** El registro ya funciona; falta una página
   `admin/log` que lo liste con fecha, hora, usuario y detalle, y activar el acceso en
   `pages/admin/admin.ts:31`. Hoy el panel muestra "Próximamente", que se ve en la
   corrección.
3. **Mis películas (R-12).** Historial visual con póster, fecha y la calificación propia.
   Sale de las compras pagadas con función pasada + `Resenias`; conviene hacerlo después
   del punto 1.
4. **HttpClient + interceptor + directiva propia (clases 3, 8 y 9).** Tres temas vistos sin
   ningún uso, y las carpetas vacías (`directives/`, `interceptors/`) quedan a la vista.
   Hay que elegir un uso real para HttpClient (por ejemplo, llamar a una Edge Function o a
   una vista por REST) para que el interceptor tenga sentido; la directiva puede ser algo
   chico y genuino (por ejemplo, el resaltado de butacas o de un elemento al pasar el mouse).
5. **Historial de canjes en el perfil (R-03).** Hoy solo se deduce mirando cada compra.
   Una lista "Mis canjes" en `mi-cuenta` (tabla `Canjes`) lo cierra; también mostrar los
   datos del perfil.
6. **Probar a mano lo que está mergeado sin probar**: validación del empleado (cámara y
   código), reportes, exportación PDF/Excel y gráficos (lista en
   `docs/pendientes-revision.md`, sección 3).
7. **README**: agregar arquitectura y decisiones técnicas principales, y sacar la frase de
   las carpetas vacías.
8. Detalle menor: `enabled: !isDevMode()` en `provideServiceWorker`, como en la clase 10.
