# Guía para el oral — Olympia Cinema

El oral es sin demo: preguntan por las decisiones y por **dónde y cómo** se aplica cada
concepto (consulta del 06/10). Esta guía va tema por tema, en el orden de las clases
(`docs/catalogo-clases.md`), con el archivo, un pedacito de código real y cómo decirlo en
voz alta. Después vienen las decisiones que más probablemente pregunten, y al final lo que
no usé y por qué.

Para cada tema:
- **Qué es:** la idea, en simple.
- **Dónde:** el archivo y un fragmento del código.
- **Cómo lo digo:** una o dos frases para decir en voz alta.

---

## Clase 1 · Componentes y ruteo

### Componentes standalone

**Qué es:** cada pantalla o pieza es un componente que declara solo lo que usa en
`imports`. No hay `NgModule`.

**Dónde:** cualquier componente, por ejemplo `src/app/pages/mis-peliculas/mis-peliculas.ts`.

```ts
@Component({
  imports: [RouterLink, DatePipe, EstrellasPipe],
  selector: 'app-mis-peliculas',
  styleUrl: './mis-peliculas.css',
  templateUrl: './mis-peliculas.html',
})
export class MisPeliculas implements OnInit {
```

**Cómo lo digo:** "Cada componente es independiente y en `imports` pone lo que su template
necesita: si uso el pipe `date`, importo `DatePipe` ahí mismo."

### Rutas, `title` y comodín

**Qué es:** el router asocia cada dirección a un componente. El comodín `**` va último y
atrapa cualquier dirección que no existe.

**Dónde:** `src/app/app.routes.ts`.

```ts
{
  path: '**',
  title: 'Página no encontrada · Olympia Cinema',
  loadComponent: () =>
    import('./pages/no-encontrada/no-encontrada').then((m) => m.NoEncontrada),
},
```

**Cómo lo digo:** "Las rutas están en `app.routes.ts`. Cada una tiene su `title` para la
pestaña, y la última es el comodín que muestra la página de no encontrada."

---

## Clase 2 · Lazy loading, rutas hijas, ciclo de vida, signals y control flow

### Lazy loading

**Qué es:** el código de una pantalla no viene en la descarga inicial; se baja recién
cuando el usuario entra a esa ruta.

**Dónde:** todas las rutas de `src/app/app.routes.ts` usan `loadComponent`.

```ts
{
  path: 'pelicula/:id',
  title: 'Película · Olympia Cinema',
  loadComponent: () =>
    import('./pages/detalle-pelicula/detalle-pelicula').then((m) => m.DetallePelicula),
},
```

**Cómo lo digo:** "Uso `loadComponent` con un `import()` dinámico: Angular arma un archivo
aparte por pantalla y lo baja cuando hace falta. Por eso las librerías pesadas, como la del
QR o la de Excel, no están en la carga inicial."

### Rutas hijas

**Qué es:** un grupo de rutas en su propio archivo, que se carga entero bajo un prefijo.

**Dónde:** `src/app/app.routes.ts` carga `src/app/pages/admin.routes.ts` y
`src/app/pages/auth.routes.ts`.

```ts
{
  path: 'admin',
  canActivate: [adminGuard],
  loadChildren: () => import('./pages/admin.routes'),
},
```

**Cómo lo digo:** "Todo el panel del admin está en `admin.routes.ts` y se carga con
`loadChildren`. El guard va en la ruta padre, así protege a todas las hijas de una vez."

### Ciclo de vida

**Qué es:** métodos que Angular llama en momentos fijos: `ngOnInit` al arrancar,
`ngOnDestroy` al salir, `ngOnChanges` cuando cambia un input.

**Dónde:** `src/app/pages/compra/compra.ts` cierra el canal de Realtime al salir;
`src/app/components/campo-fecha/campo-fecha.ts` rearma la lista de años cuando cambian sus
inputs.

```ts
ngOnDestroy() {
  this.comprasSrv.dejarDeEscuchar();
}
```

**Cómo lo digo:** "En `ngOnInit` cargo los datos. En `ngOnDestroy` cierro lo que quedó
abierto, como el canal de butacas o la cámara del empleado, para que no siga funcionando
en una pantalla que ya no existe."

### Signals

**Qué es:** una variable que avisa cuando cambia, así el template se redibuja solo. Se lee
con `x()` y se escribe con `.set()` o `.update()`.

**Dónde:** todo el estado de las pantallas, por ejemplo `src/app/pages/cartelera/cartelera.ts`.

```ts
generosElegidos = signal<number[]>([]);

alternarGenero(id: number) {
  this.generosElegidos.update((prev) =>
    prev.includes(id) ? prev.filter((elegido) => elegido !== id) : [...prev, id],
  );
  this.filtrar();
}
```

**Cómo lo digo:** "Todo lo que lee un template está en signals (D-03). Con `update`
calculo el valor nuevo a partir del anterior, y armo una lista nueva en vez de hacer
`push`, para que el cambio se detecte."

### Control flow

**Qué es:** `@if`, `@for` y `@switch` en el template, para mostrar o repetir partes.

**Dónde:** `src/app/app.html` arma el menú según el rol.

```html
@switch (auth.perfil()?.rol) {
  @case ('admin') {
    <a routerLink="/admin">Administración</a>
  }
  @case ('empleado') {
    <a routerLink="/empleado">Validación</a>
  }
  @case ('cliente') {
    <a routerLink="/mis-peliculas">Mis películas</a>
  }
}
```

**Cómo lo digo:** "El menú es un `@switch` sobre el rol del perfil. En las listas uso
`@for` con `track` y `@empty` para el mensaje de lista vacía, como en Mis películas."

---

## Clase 3 · Componentes padre e hijo, servicios

### `input()` y `output()`

**Qué es:** el padre le pasa datos al hijo con `input()`, y el hijo le avisa algo al padre
con `output()`.

**Dónde:** `src/app/components/candy/candy.ts` recibe el catálogo y avisa cada cambio a
`src/app/pages/compra/`.

```ts
// candy.ts
cambiar = output<ProductoElegido[]>();
...
this.cambiar.emit(sinEste);
```

```html
<!-- compra.html -->
<app-candy
  [productos]="productosCandy()"
  [categorias]="categorias()"
```

**Cómo lo digo:** "El candy es un hijo de la pantalla de compra: recibe los productos por
`input()` y, cuando el cliente agrega o saca algo, emite la lista nueva por `output()`. El
padre es el que guarda el carrito."

### Servicios con `@Service()` e `inject()`

**Qué es:** una clase que comparte lógica y datos entre componentes. Se pide con
`inject()`.

**Dónde:** todo `src/app/services/`. El único que crea el cliente de Supabase es
`services/supabase.ts`.

```ts
@Service()
export class Resenias {
  private sup = inject(SupabaseService);
  private auth = inject(Auth);
  private log = inject(LogActividad);
```

**Cómo lo digo:** "Los componentes no hablan con Supabase: le piden a un servicio. Uso
`@Service()` con `inject()`, que es lo que se usa en Angular 22 (D-02). El servicio devuelve
los datos o un error ya traducido para mostrar."

---

## Clase 4 · Formularios reactivos

### `FormBuilder`, validators y mensajes

**Qué es:** el formulario se define en el componente con `FormBuilder`, con sus reglas, y el
template solo se conecta con `formControlName`.

**Dónde:** por ejemplo `src/app/pages/detalle-pelicula/detalle-pelicula.ts` (la reseña).

```ts
formResenia = this.fb.group({
  estrellas: [null as number | null, [Validators.required, entero(1, 5)]],
  comentario: ['', [largo(1, MAXIMO_COMENTARIO), textoLibre(true)]],
});
```

**Cómo lo digo:** "Las reglas están en el componente, no en el HTML. El template muestra el
error cuando el campo está `touched`, y el botón queda deshabilitado mientras el formulario
sea inválido."

### `FormArray`

**Qué es:** una lista de campos que crece o se achica: se agregan con `push` y se sacan con
`removeAt`.

**Dónde:** los renglones de un combo en
`src/app/pages/admin-producto-formulario/admin-producto-formulario.ts`. También los géneros
de la película, los días de la función y los canjes del pago.

```ts
items: this.fb.array<ItemForm>([], [this.sinRepetidos()]),
...
this.itemsForm.push(this.nuevoItem());
...
this.itemsForm.removeAt(indice);
```

**Cómo lo digo:** "Un combo trae varios productos, y no sé cuántos: cada renglón es un
grupo dentro de un `FormArray`. El validador `sinRepetidos` va sobre el array entero porque
mira todos los renglones a la vez."

### Validadores propios

**Qué es:** una función que devuelve un `ValidatorFn`: `null` si está bien o un objeto con
el error.

**Dónde:** `src/app/validadores/validadores.ts`. Los de un solo campo van en el control; los
que comparan dos campos van en el grupo.

```ts
export function mayorQue(campoMayor: string, campoMenor: string): ValidatorFn {
  return (grupo: AbstractControl) => {
    const mayor: number | null = grupo.get(campoMayor)?.value;
    const menor: number | null = grupo.get(campoMenor)?.value;
    if (mayor === null || menor === null) return null;
    return Number(mayor) > Number(menor) ? null : { noEsMayor: true };
  };
}
```

**Cómo lo digo:** "Es el mismo patrón de la clase 4. `mayorQue` se usa para que el precio
VIP sea mayor que el base: como mira dos campos, se pone en el `FormGroup` y no en un
control."

### Campo reutilizable

**Qué es:** un componente que recibe un control o un grupo por `input()` y se reusa en
varios formularios.

**Dónde:** `src/app/components/campo-fecha/`: las fechas con tres desplegables, sin
calendario (D-23). Se usa en el registro, la película, la función, el pago y los reportes.

```html
<app-campo-fecha
  etiqueta="Fecha de nacimiento"
  [grupo]="fechaNacimiento"
  [anioDesde]="anioDesde"
  [anioHasta]="anioHasta"
```

**Cómo lo digo:** "El cliente no quería el calendario, así que las fechas son tres
desplegables. Están en un solo componente que recibe el grupo `{ dia, mes, anio }` y que
uso en todos los formularios."

---

## Clase 5 · Supabase Auth y guards

### Auth

**Qué es:** Supabase guarda los usuarios y la sesión. La app se entera de cada login o
logout con `onAuthStateChange`.

**Dónde:** `src/app/services/auth.ts`.

```ts
usuarioActual = signal<User | null>(null);
perfil = signal<Usuario | null>(null);
...
this.sup.Auth.onAuthStateChange((_evento, sesion) => {
  const usuario = sesion?.user ?? null;
  this.usuarioActual.set(usuario);
```

**Cómo lo digo:** "El servicio `Auth` guarda el usuario en un signal, y también su fila de
`Usuarios`, que es donde está el rol. Al registrarse se crea el usuario en Auth y después su
perfil en `Usuarios`, con el mismo id."

### Guards

**Qué es:** una función que decide si se puede entrar a una ruta.

**Dónde:** `src/app/guards/`: `logueadoGuard`, `adminGuard` y `empleadoGuard`.

```ts
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.listo;
  if (!auth.usuarioActual()) return router.navigateByUrl('/login');
  return auth.perfil()?.rol === 'admin' ? true : router.navigateByUrl('/');
};
```

**Cómo lo digo:** "Son los guards funcionales de la clase 5, pero async: esperan a que se
restaure la sesión (`auth.listo`) antes de decidir. Si no, al recargar la página te mandaba
al login aunque estuvieras logueado (D-13)."

---

## Clase 6 · Base de datos, RLS y Realtime

### CRUD con `{ data, error }`

**Qué es:** leer y escribir tablas con `select`, `insert`, `update` y `delete`, y siempre
mirar el `error`.

**Dónde:** todos los servicios, por ejemplo `src/app/services/resenias.ts`.

```ts
const { data, error } = await this.sup.Sup.from('Resenias').insert(fila).select().single();
if (error) {
  const mensaje =
    error.code === '23505'
      ? 'Ya dejaste tu reseña de esta película.'
      : 'No se pudo guardar la reseña. Probá de nuevo.';
```

**Cómo lo digo:** "Todo error de Supabase se maneja y se le muestra al usuario. El 23505 es
violación de `unique`: lo traduzco a un mensaje claro."

### Funciones de Postgres con `rpc()`

**Qué es:** una función escrita en SQL que vive en la base y se llama desde Angular, como un
endpoint.

**Dónde:** `src/app/services/compras.ts` y `src/app/services/validacion.ts`. Las funciones
están en `supabase/schema.sql`.

```ts
const { data, error } = await this.sup.Sup.rpc('cancelar_compra', { p_compra_id: compraId });
```

**Cómo lo digo:** "Comprar, cancelar y validar tocan varias tablas y no pueden quedar a
medias. Cada una es una función de Postgres que corre en una transacción: o se hace todo o
no se hace nada. La cátedra aprobó usarlas (consulta del 06/10)."

### RLS

**Qué es:** reglas dentro de la base que dicen qué filas puede leer o escribir cada
usuario. Se aplican siempre, aunque alguien use la consola del navegador.

**Dónde:** `supabase/schema.sql`, sección 3 y siguientes. El rol se lee con
`rol_actual()`.

```sql
create policy "cliente lee sus compras"
  on public."Compras" for select to authenticated
  using (usuario_id = auth.uid() or public.es_empleado());
```

(Después, en la sección 7, la misma política suma `or public.es_admin()` para los
reportes.)

**Cómo lo digo:** "El front se puede saltear; la base no. Con RLS, un cliente solo ve sus
compras aunque pida todas. El rol vive en `Usuarios` y no en los metadatos de Auth, porque
esos los puede cambiar el propio usuario (D-12)."

### Realtime

**Qué es:** la base avisa a la app cuando cambia una tabla, sin que la app pregunte.

**Dónde:** `src/app/services/compras.ts`, para el mapa de butacas.

```ts
this.canal = this.sup.Sup.channel(`butacas-funcion-${funcionId}`);
this.canal
  .on<ButacaOcupada>(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'ButacasOcupadas',
      filter: `funcion_id=eq.${funcionId}`,
    },
    alCambiar,
  )
```

**Cómo lo digo:** "Mientras elegís butacas, si otro compra, la butaca se pinta ocupada al
toque. Escucho `postgres_changes` de `ButacasOcupadas` y cierro el canal en `ngOnDestroy`."

---

## Clase 7 · Storage

**Qué es:** guardar archivos en un bucket de Supabase y obtener su URL pública.

**Dónde:** `src/app/services/peliculas.ts`, para los pósters.

```ts
const ruta = `posters/${Date.now()}.${extension}`;

const { error } = await this.sup.Stg.from(this.bucket).upload(ruta, archivo);
if (error) return { datos: null, error: 'No se pudo subir el póster.' };

const { data } = this.sup.Stg.from(this.bucket).getPublicUrl(ruta);
```

**Cómo lo digo:** "El admin sube el póster, lo guardo en el bucket `peliculas` con un nombre
único por la hora, y en la tabla guardo la URL pública. El bucket se lee sin sesión, pero
solo el admin puede subir."

---

## Clase 8 · Pipes y bindeos

### Pipes propios

**Qué es:** una clase con `transform()` que convierte un valor para mostrarlo.

**Dónde:** `src/app/pipes/estrellas-pipe.ts` (en el detalle, la cartelera y Mis películas)
y `src/app/pipes/estado-pelicula-pipe.ts` (en el listado del admin).

```ts
@Pipe({ name: 'estrellas' })
export class EstrellasPipe implements PipeTransform {
  transform(valor: number): string {
    const llenas = Math.min(5, Math.max(0, Math.round(valor)));
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
  }
}
```

**Cómo lo digo:** "`estrellas` convierte una nota en estrellas: 4 es ★★★★☆. `estadoPelicula`
dice si la película está oculta, en Próximamente o en cartelera, según si es visible y su
fecha de estreno (D-27)."

### Pipes de Angular

**Qué es:** `date`, `currency`, `number` y `titlecase`, que vienen con Angular.

**Dónde:** por ejemplo el detalle de la película.

```html
{{ funcion.fecha_hora | date: 'HH:mm' : '-0300' }} · {{ funcion.formato }} ·
{{ funcion.idioma | titlecase }}
```

**Cómo lo digo:** "El tercer parámetro de `date` es la zona horaria: con `-0300` la hora se
ve siempre como en el cine, aunque el navegador esté en otro país (D-35)."

### Bindeo de clase y de estilo

**Qué es:** `[class.x]` prende una clase según una condición; `[style.x]` pone un estilo
calculado.

**Dónde:** las barras de los reportes, en `src/app/components/grafico-barras/`.

```html
[style.width.%]="ancho(dato.valor)"
```

**Cómo lo digo:** "Los gráficos no usan librería: cada barra es un `div` cuyo ancho es su
valor sobre el máximo (D-54)."

---

## Clase 9 · PWA y service worker

**Qué es:** la app se puede instalar y funciona como una aplicación. El service worker es un
script del navegador que guarda los archivos y recibe las notificaciones.

**Dónde:** `src/app/app.config.ts`, `ngsw-config.json`, `public/manifest.webmanifest` y la
opción `serviceWorker` de `angular.json`.

```ts
provideServiceWorker('ngsw-worker.js', {
  enabled: !isDevMode(),
  registrationStrategy: 'registerWhenStable:30000',
}),
```

**Cómo lo digo:** "El manifest le dice al celular el nombre, los íconos y que se abra sin
barra de navegador. El service worker se registra solo fuera de desarrollo, como en la
clase 10: con `ng serve` no existe, así que lo pruebo en el build o en Vercel."

---

## Clase 10 · Notificaciones push y Edge Functions

### `SwPush`

**Qué es:** el servicio de Angular para pedir permiso de notificaciones y obtener la
suscripción del dispositivo.

**Dónde:** `src/app/services/notificaciones.ts`.

```ts
suscripcion = await this.conLimite(
  this.swPush.requestSubscription({ serverPublicKey: environment.PUBLIC_VAPID }),
  ESPERA_SUSCRIPCION_MS,
);
...
const fila: SuscripcionPushPorCrear = { usuario_id: usuario.id, endpoint, auth, p256dh };
const { error } = await this.sup.Sup.from('SuscripcionesPush').insert(fila);
```

**Cómo lo digo:** "Cuando el cliente activa la alerta de una película de Próximamente, le
pido el permiso con `requestSubscription` y guardo los tres datos de la suscripción en
`SuscripcionesPush`, a su nombre. A diferencia de la clase, cada suscripción tiene dueño y
RLS."

### Edge Function

**Qué es:** código que corre en los servidores de Supabase, no en el navegador. Ahí está la
clave VAPID privada.

**Dónde:** `supabase/functions/enviar-alertas/index.ts`. La ejecuta Supabase Cron una vez
por día (`supabase/schema.sql`, sección 15).

```ts
await webpush.sendNotification(
  {
    endpoint: suscripcion.endpoint,
    keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
  },
  mensaje,
);
```

**Cómo lo digo:** "Todos los días Cron llama a la función. Busca las alertas cuya venta ya
abrió y le manda el push solo a ese usuario. Espero cada envío para saber si falló, y borro
las suscripciones vencidas. Quien no dio permiso ve un aviso dentro de la app (D-52)."

---

## Decisiones que más probablemente pregunten

**1. ¿Por qué la compra es una función de Postgres y no varios inserts desde Angular? (D-39)**
Porque toca compra, entradas, butacas, candy, canjes y saldos, y no puede quedar a medias:
en una función todo va en una transacción. Además los precios los calcula la base, así que
nadie puede mandar un precio inventado desde la consola.

**2. ¿Cómo evitás que dos personas compren la misma butaca? (D-38)**
`ButacasOcupadas` tiene un `unique (funcion_id, fila, numero)`: si dos compran a la vez, la
segunda falla con 23505. El mapa en tiempo real ayuda, pero quien garantiza es la base.

**3. ¿Por qué guardás solo las butacas vendidas? (D-07)**
La sala es siempre igual (20 filas, 532 butacas), así que se arma en el front. Guardar todas
las butacas de cada función serían cientos de filas sin información.

**4. ¿Dónde está el rol y por qué ahí? (D-12)**
En la tabla `Usuarios`. Los metadatos de Auth los puede editar el propio usuario: cualquiera
podría ponerse admin. Las políticas lo leen con `rol_actual()`.

**5. ¿Por qué los guards son async? (D-13)**
Al recargar, Supabase tarda un momento en restaurar la sesión. Si el guard decide antes, te
manda al login aunque estés logueado. Por eso espera a `auth.listo`.

**6. Si los formularios ya validan, ¿para qué los `check` en la base? (D-25)**
El formulario se puede saltear desde la consola del navegador. El formulario guía al
usuario; la base es la que protege.

**7. ¿Cómo se asigna la sala y cómo se evita la superposición? (D-29)**
El servicio busca la primera sala libre con 30 minutos de margen después del fin de la otra
función. Además, un trigger de Postgres rechaza cualquier superposición, aunque dos admins
carguen a la vez.

**8. ¿Por qué no hay columna "en cartelera"? (D-27)**
Dónde aparece una película lo dice su fecha de estreno: futura va a Próximamente y pasada a
cartelera. Así no hay que acordarse de moverla a mano. El admin solo decide si es visible.

**9. ¿Por qué tres desplegables para las fechas? (D-23)**
El cliente rechazó el calendario en el mail del 28/02. Con desplegables no hay scroll y no
se puede tipear mal; un validador de grupo rechaza fechas como 31/02.

**10. ¿Qué pasa al cancelar? (D-48)**
Hasta 2 horas antes, si la entrada no se usó: se acredita el total como crédito (no se
devuelve plata), vuelven los puntos canjeados y se liberan las butacas. Todo en una función
de la base.

**11. ¿Cómo garantizás que un QR se use una sola vez? (D-51, D-60)**
`validar_compra` bloquea la fila y la marca solo si no estaba usada; si dos empleados
escanean a la vez, el segundo ve "ya se validó". No rechaza por fecha: los mails piden un
solo uso, y la tarjeta muestra la fecha para que controle el empleado.

**12. ¿Por qué admin y empleado son roles separados? (D-24)**
Lo aclaró la cátedra el 01/10 y coincide con el mail del 06/02: son dos tipos de usuario.
El admin no valida entradas; lee las compras solo para los reportes.

**13. ¿Qué cuenta la facturación por día? (D-56)**
Lo cobrado con el medio de pago, por día de compra en hora argentina, incluidas las
canceladas: la cancelación da crédito, no devuelve plata. La cátedra lo confirmó el 06/10.

**14. ¿Cómo funcionan las alertas de Próximamente? (D-52)**
Al activar la alerta, guardo la suscripción push. Cron ejecuta la Edge Function todos los
días; la función avisa a quien tiene la venta abierta. Quien no dio permiso ve un aviso
dentro de la app.

**15. ¿Por qué el log se pagina en la base? (D-61, D-57)**
Supabase devuelve como máximo 1000 filas por consulta y no avisa cuando corta. Con
`.range()` pido solo las 10 de la página y con `count: 'exact'` sé cuántas hay en total.

---

## Lo que no usé y por qué

La cátedra aclaró el 06/10 que **no es obligatorio usar todos los temas**: con lo usado
alcanza. Igual conviene saber explicarlo.

- **HttpClient (clase 3).** Todo el acceso a datos va por `supabase-js`, que ya hace los
  pedidos HTTP por su cuenta. No hay ninguna API aparte que llamar, así que meter
  `HttpClient` hubiera sido forzarlo.
- **Interceptor (clase 9).** Los interceptors actúan sobre `HttpClient`, no sobre las
  llamadas de `supabase-js`. Sin `HttpClient` no tienen dónde actuar. El indicador de carga
  lo resuelve cada pantalla con su signal `cargando`.
- **Directiva propia (clase 8).** No apareció un comportamiento que se repitiera en varios
  elementos y que no se resolviera con `[class.x]` o `[style.x]`, que sí uso (el mapa de
  butacas, los gráficos). Una directiva sin necesidad real hubiera sido decorativa.
