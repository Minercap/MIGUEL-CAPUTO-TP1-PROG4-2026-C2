# Catálogo de lo visto en clase — Programación IV 2026 C2

Fuente: repositorio del profesor `github.com/afriadenrich/programacion-iv-2026-c2`, clases 1 a 9.
Este documento es la **fuente de verdad** de lo que se puede usar en el TP. Si algo no aparece acá, no se vio en clase.

**Versión:** Angular **22.1** (CLI 22.1.4), TypeScript 6, `@supabase/supabase-js` 2.11x, estilos en **CSS** plano, **sin SSR**.

---

## Semáforo

| Nivel | Qué es | Cómo se procede |
|---|---|---|
| 🟢 Verde | Está en este catálogo | Se usa directamente, siguiendo el patrón del profe |
| 🟡 Amarillo | No se vio, pero es del propio Angular, Supabase, Postgres o HTML, de la misma familia que lo visto (`computed()`, una constraint o función SQL, `input type="time"`) | **Frena.** Lo explica en dos líneas, dice por qué hace falta y espera el OK. No se agrega ninguna librería |
| 🔴 Rojo | Una librería externa o una herramienta nueva (QR, PDF, Excel, gráficos, kits de UI) | **Frena.** Plantea opciones, **siempre incluida una alternativa hecha con lo visto**, espera la decisión y la anota en `docs/decisiones.md` |

Antecedente útil para el oral: en la clase 7 el profe instaló una librería externa (`canvas-confetti`) para algo puntual. Las librerías no están prohibidas, pero **cada una se justifica**.

---

## Clase 1 — Introducción (18/08)

- Proyecto con `ng new`: estilos **CSS** y **sin SSR**.
- Componentes con `ng generate component`. Con la convención de Angular 22, el archivo es `titulo.ts` (sin `.component`) y la clase es `Titulo` (sin sufijo `Component`).
- Metadatos: `selector`, `imports`, `templateUrl`, `styleUrl`. Componentes **standalone**, sin `NgModule`.
- Interpolación `{{ }}`.
- Ruteo en `app.routes.ts`: `path`, `component`, `title`, `redirectTo`, comodín `'**'` al final. Navegación con `routerLink` y `<router-outlet />`.
- Arranque: `angular.json` → `main.ts` → `bootstrapApplication(App, appConfig)` → `app.config.ts` con `provideRouter(routes)`.

## Clase 2 — Ruteo, bindeos y ciclo de vida (20/08)

- **Lazy loading:** `loadComponent: () => import('./pages/x/x').then(m => m.X)`.
- **Rutas hijas:** `loadChildren` apuntando a un archivo `x.routes.ts` propio, con un `<router-outlet>` anidado.
- **Ciclo de vida:** `ngOnInit`, `ngOnDestroy` (por ejemplo, `clearInterval` al destruir) y `ngOnChanges` (visto en la clase 3).
- **Bindeos:** interpolación, evento `(click)`, propiedad `[src]` y bidireccional `[(ngModel)]` con `FormsModule`.
- **Signals:** `signal()`, `WritableSignal`, lectura con `x()` y escritura con `.set()` y `.update(prev => ...)`.
- **Control flow:** `@if` / `@else`, `@for (item of lista; track item.id)` con `@empty`, y `@switch` / `@case` / `@default`.

## Clase 3 — Input/Output, servicios y HTTP (25/08)

- **`input<T>()`** y **`output<T>()`** (funciones, no decoradores). Padre ↔ hijo con `[prop]="..."` y `(evento)="metodo($event)"`.
- **Inmutabilidad:** `this.array = [...this.array, nuevo]` en lugar de `push`, para que el cambio se detecte.
- **Interfaces** en `interfaces/` (`ICard`, `IProducto`).
- **Servicios con `@Service()`**, el decorador de Angular 22 que usa el profe, e inyección con `inject()`:
  ```ts
  @Service()
  export class Api {
    http = inject(HttpClient);
  }
  ```
  ⚠️ **`@Service()` es correcto en Angular 22.** No lo "corrijas" a `@Injectable({ providedIn: 'root' })`. El profe menciona `@Injectable()` y la inyección por constructor como válidas, pero en el código usa `@Service()` + `inject()`.
- **HttpClient:** `provideHttpClient()` en `app.config.ts`, `this.http.get<T>(url, { params })`, `.subscribe({ next, error })`, `Subscription` guardada y `unsubscribe()` en `ngOnDestroy`.
- `@if (senal(); as p) { ... }`.

## Clase 4 — Formularios reactivos (27/08)

- `ReactiveFormsModule`, `FormGroup`, `FormControl<T>`, `FormBuilder` inyectado con `inject(FormBuilder)`.
- Grupos anidados con `formGroupName` y **`FormArray`** con `push` / `removeAt` para listas dinámicas de campos.
- **Validators:** `required`, `minLength`, `maxLength`, `email`, `pattern`, `min`, `max`.
- **Validadores propios:** una función que devuelve `ValidatorFn`, que devuelve `null` si está bien o un objeto de error si falla:
  ```ts
  largoExacto(caracteres: number): ValidatorFn {
    return (control: AbstractControl) =>
      control.value !== null && String(control.value).length === caracteres ? null : { largoExacto: caracteres };
  }
  ```
- **Mensajes de error:** `@if (campo?.touched) { @if (campo?.errors?.['required']) { ... } }`, con getters para acceder a cada campo.
- **Campo reutilizable:** un componente `CampoInput` con `control = input<FormControl>()` y `<ng-content />` para los mensajes, más componentes de error (`ErrorRequired`, `ErrorMinLength`) que reciben `errors`.
- Botón deshabilitado con `[disabled]="!formulario.valid"`.
- ⚠️ El README de la clase enlaza a la documentación de *signal forms*, pero **el código de clase usa formularios reactivos**. Usar formularios reactivos.

## Clase 5 — Supabase Auth (01/09)

- **Un único servicio** crea el cliente con los valores de `environments/environment.ts`:
  ```ts
  @Service()
  export class SupabaseService {
    private sup: SupabaseClient;
    constructor() { this.sup = createClient(environment.SUPABASE_URL, environment.SUPABASE_KEY); }
    get Sup() { return this.sup; }
    get Auth() { return this.sup.auth; }
    get Stg() { return this.sup.storage; }
  }
  ```
- **Servicio `Auth`** con `usuarioActual = signal<User | null>(null)`, que se actualiza en `onAuthStateChange` y redirige según haya o no sesión.
- `signUp({ email, password, options: { data: { ... } } })` guarda metadatos. En un comentario, el profe deja `rol: 'admin'` como ejemplo. También `signInWithPassword` y `signOut`.
- **Guard funcional:**
  ```ts
  export const logueadoGuard: CanActivateFn = () =>
    inject(Auth).usuarioActual() ? true : inject(Router).navigateByUrl('/login');
  ```
  Se aplica con `canActivate: [logueadoGuard]`.
- Rutas de auth en un `auth.routes.ts` con `export default`, cargadas con `loadChildren`.
- El `App` inyecta `Auth` para mostrar un menú distinto con o sin sesión.

## Clase 6 — Base de datos, RLS y Realtime (03/09)

- **CRUD en un servicio de base de datos:**
  `from('Tabla').select('*')`, `.eq('id', id).single()`, `.insert(obj)`, `.update({...}).eq('id', id)`, `.delete().eq('id', id)`.
  Todo con `async/await` y desestructurando `{ data, error }`.
- **Interfaces por operación:** `Auto`, `AutoPorCrear` (sin `id`) y `AutoPorModificar`.
- El componente guarda resultados en signals: `this.autos.set(await this.db.findAll())`.
- **Row Level Security** en Supabase (políticas por tabla).
- **Realtime con `postgres_changes`:**
  ```ts
  canal = this.sup.Sup.channel('table-db-changes');
  this.canal.on('postgres_changes', { event: '*', schema: 'public', table: 'Autos' }, (data: any) => {
    switch (data.eventType) { case 'INSERT': ... case 'UPDATE': ... case 'DELETE': ... }
  }).subscribe();
  ```
  Actualiza la signal de forma inmutable y hace `unsubscribe()` en `ngOnDestroy`.
- **Broadcast**, para eventos propios sin base: `channel('x').on('broadcast', { event: 'CLICK' }, cb)` y `.send({ type: 'broadcast', event, payload })`.

## Clase 7 — Storage

- **Subida a un bucket:** `this.sup.Stg.from('imagenes').upload(ruta, file)`, con una ruta única (`perfil/${Date.now()}.ext`).
- **URL pública:** `${SUPABASE_URL}/storage/v1/object/public/<bucket>/<ruta>`. También se menciona `getPublicUrl`.
- **Archivo desde un input:** `(input)="cargarImagen($event)"`, que toma `evento.target.files[0]` y lo guarda en un `FormControl<File | null>`.
- **Tabla de perfil (`Usuarios`)** con `id` igual al uuid de auth. Se crea el registro después del `signUp` y se completan los datos del usuario leyendo esa tabla en `onAuthStateChange`.

## Clase 8 — Directivas y pipes

- **Directiva de atributo:**
  ```ts
  @Directive({ selector: '[appHighlight]', host: { '(mouseenter)': 'onMouseEnter()', '(mouseleave)': 'onMouseLeave()' } })
  export class Highlight {
    private el = inject(ElementRef<HTMLElement>);
    color = input('');
  }
  ```
- **Bindeo de clase y estilo:** `[class.negrita]="esNegrita()"` y `[style.color]="..."`.
- **Pipes incorporados:** `currency`, `number`, `percent`, `date` (con formato), `titlecase` y `async`. Se importan uno por uno en el componente (`CurrencyPipe`, `DatePipe`, etc.).
- **Pipes propios:** `@Pipe({ name: 'texoLargo' })` con `implements PipeTransform`, `transform(valor, arg = default)` y parámetros (`| texoLargo : 20`). Ejemplos: recorte de texto y "hace cuánto fue".

## Clase 9 — Interceptors y PWA

- **Interceptor funcional:** un `HttpInterceptorFn` registrado con `provideHttpClient(withInterceptors([...]))`. Modifica el pedido con `req.clone({ params: req.params.set(...) })` y procesa la respuesta con `next(req).pipe(tap(...))`.
  Se combina con un **servicio de carga** (`Loading` con `signal<boolean>`) para mostrar un indicador de espera.
  ⚠️ Los interceptors actúan sobre **HttpClient**, no sobre las llamadas de `supabase-js`. Si se usan en el TP, tiene que ser donde haya HttpClient.
- `<input type="date" [(ngModel)]="fecha">` para cargar fechas con el control nativo.
- **PWA:**
  - `@angular/service-worker` y `provideServiceWorker('ngsw-worker.js', { enabled: true, registrationStrategy: 'registerWhenStable:30000' })`.
  - `ngsw-config.json` con los grupos `app` (prefetch) y `assets` (lazy).
  - `public/manifest.webmanifest` con `display: standalone` e íconos de 72 a 512 px, enlazado desde `index.html`.
  - `"serviceWorker": "ngsw-config.json"` en `angular.json`.

---

## Convenciones del profe (imitarlas)

- **Carpetas por tipo:** `pages/`, `components/`, `services/`, `interfaces/`, `guards/`, `pipes/`, `directives/`, `interceptors/`, `environments/`.
- **Nombres en español:** `Auth`, `DbService`, `StorageService`, `logueadoGuard`, `usuarioActual`, `cerrarSesion()`, `subirArchivo()`, `traerTodos()`.
- **Tablas de Supabase** con mayúscula inicial (`Autos`, `Usuarios`). Es una convención a decidir en el TP, pero hay que ser consistente.
- **Comentarios didácticos** explicando el porqué.

## Lo que el profe hace en clase y **no** conviene copiar al TP (buenas prácticas evaluadas)

- Ignorar el `error` de Supabase (`const { data, error } = ...` sin usar `error`). En el TP, **todo error se maneja y se muestra al usuario**.
- Dejar `console.log` de depuración.
- Usar `any` en callbacks. Tipar con interfaces.
- Guardar la API key en el interceptor: en el TP, las claves van en `environment`.

## No visto en clase (🟡 o 🔴: frenar antes de usar)

- `computed()`, `effect()`, `linkedSignal`, `resource` / `httpResource`: 🟡
- Signal forms: 🟡 (solo aparece el link)
- Funciones de Postgres, triggers, RPC, vistas y constraints avanzadas en SQL: 🟡
- Edge Functions de Supabase y login anónimo de Supabase: 🟡
- Web Push y notificaciones del sistema: 🔴
- Cualquier librería de UI (Material, Bootstrap, Tailwind, PrimeNG), de estado (NgRx) o de fechas: 🔴
- Generación de QR, lectura de QR con cámara, generación de PDF, exportación a Excel y gráficos: 🔴
- `NgModule`, `*ngIf` / `*ngFor`, `@Input()` / `@Output()` con decorador: **no usar**. Son la forma vieja; en clase se usan `@if`, `@for`, `input()` y `output()`.
