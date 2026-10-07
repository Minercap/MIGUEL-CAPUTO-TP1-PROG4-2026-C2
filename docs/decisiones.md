# Registro de decisiones — Olympia Cinema

Cada entrada anota una decisión que no se deduce del código: qué se eligió, qué se
descartó y por qué. Alimenta el README y sirve de guion para el oral.

---

## D-01 · Ruteo de la SPA en Vercel · 20/09

**Elegido:** un `vercel.json` en la raíz con un rewrite de todas las rutas a `/index.html`.

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

**Por qué:** la app es una SPA de Angular sin SSR. El ruteo lo resuelve el router en
el navegador, así que el servidor tiene que devolver `index.html` para cualquier
dirección. Sin el rewrite, entrar directo a una ruta o recargarla da 404, porque
Vercel busca un archivo que no existe.

**Descartado:** usar `HashLocationStrategy` (rutas con `#`). Evita la configuración
del servidor, pero ensucia las URLs y no es lo que se vio en clase.

**Nota:** en Vercel el sistema de archivos tiene precedencia sobre los rewrites, así
que `ngsw-worker.js`, `manifest.webmanifest` y los assets se siguen sirviendo bien.

**Clase de origen:** 1 y 2 (ruteo).

---

## D-02 · Versión de Angular · 22/09

**Elegido:** migrar el proyecto de Angular 21 a **Angular 22** (`ng update @angular/core@22 @angular/cli@22`).

**Por qué:** el profe usa Angular 22, y desde la clase 10 el patrón de servicios es
`@Service()` + `inject()`. `@Service()` no existe en Angular 21: ahí el decorador es
`@Injectable`. Quedarse en 21 obligaba a escribir los servicios distinto de como se
ven en clase.

**Descartado:** quedarse en Angular 21 usando `@Injectable`. Funciona, pero se aparta
del patrón de clase, que es lo que se evalúa en el oral.

**Qué arrastró la migración:** TypeScript pasa de 5.9 a **6.0.3**, que es lo que pide
Angular 22 (`typescript >=6.0 <6.1`).

**Clase de origen:** 3 y 5 (servicios e inyección).

---

## D-03 · Detección de cambios y estado en signals · 22/09

**Elegido:** ningún componente del proyecto declara `changeDetection`. Todos quedan con
el default de Angular 22, que es **`OnPush`**. Como contrapartida, **todo estado que se
lea desde un template va en un `signal()`**, y se escribe con `.set()` o `.update()`.
Nada de campos comunes mutados desde un callback.

**Por qué:** en Angular 22 `OnPush` pasó a ser el default (los typings de
`ChangeDetectionStrategy` lo dicen textual: *"NOTE: OnPush is enabled by default"*, y
`Default` quedó deprecado a favor de `Eager`). Con `OnPush` el componente se vuelve a
chequear solo si cambia un signal que el template lee, si llega un evento o si se
llama a `markForCheck`. Sumado a que la app es **zoneless** (no hay zone.js), un campo
común mutado desde un callback no refresca la vista: se ve el valor viejo. El signal
es lo que le avisa a Angular que tiene que volver a pintar.

**Descartado:** dejar el `changeDetection: ChangeDetectionStrategy.Eager` que el
schematic del `ng update` le había puesto a `App` para conservar el comportamiento de
v21. Se sacó a mano. Mantenerlo significaba arrastrar el modelo viejo y tener la mitad
de los componentes con una estrategia y la mitad con otra.

**Consecuencia práctica:** arrays y objetos se actualizan de forma inmutable
(`this.lista.update(prev => [...prev, nuevo])`), nunca con `push`.

**Clase de origen:** 2 (signals) y 3 (inmutabilidad).

---

## D-04 · Distribución de las filas accesibles J y K · 22/09

**Elegido:** las filas **J y K** siguen existiendo como **dos** filas accesibles, con una
distribución de 2, 10 y 2 butacas, es decir 14 por fila. Las otras 18 filas mantienen 4,
20 y 4, es decir 28. **Total: 532 butacas por sala.**

**Por qué:** el mail del 12/02 se contradice dentro del mismo texto. Primero dice que las
dos filas del medio se quitaron "para dar espacio a *una* fila de butacas para personas
con discapacidad", y en el párrafo siguiente habla de "las butacas accesibles (**filas J y
K** adaptadas)". Se adopta la segunda lectura porque es la única que mantiene consistentes
los tres mails a la vez: las 20 filas del 01/01, el resaltado de J y K del 12/02 y las
butacas VIP en R, S y T del 10/03.

**Descartado:** interpretar que hay **una sola** fila accesible, que es lo que dice
literalmente la primera parte del mail del 12/02. Se descarta porque eliminar una letra
corre todas las siguientes, y entonces las últimas tres filas ya no serían R, S y T. Eso
contradice el mail del 10/03, que nombra esas tres letras para las butacas VIP.

**Requisito:** R-13. Condiciona también R-14 (VIP en R, S y T) y R-15 (resaltado de las
accesibles).

---

## D-05 · Modelo de cupones · 22/09

**Elegido:** un **modelo único de cupón**, con un porcentaje y una condición de aplicación
("primera compra" o "mayor de 50 años"). El cupón de bienvenida nace con 20% como valor
inicial, editable desde el panel de administración.

**Por qué:** el mail del 01/01 fija el cupón de bienvenida en 20%, y el del 30/01 pide
poder cambiar ese porcentaje cuando quiera y además crear cupones que apliquen solo a
mayores de 50 años. El mail posterior pisa al anterior, así que el 20% pasa a ser un valor
por defecto y no una regla fija. Un modelo único cubre los dos casos con una sola tabla y
un solo ABM, en lugar de duplicar la lógica de descuento.

**Descartado:** dejar el cupón de bienvenida fijo en 20%, tal como lo fija el mail del
01/01, y tratar los cupones por edad como un mecanismo aparte. Se descarta porque
contradice el pedido expreso del 30/01 de poder editar el porcentaje, y porque obliga a
mantener dos caminos distintos para algo que es el mismo descuento.

**Requisitos:** R-23 y R-24.

**Complementada por D-41 y D-43:** cuándo aplica cada cupón se deduce de las compras y
de la edad, y hay un solo cupón de primera compra activo a la vez.

---

## D-06 · Control de edad en la compra anónima · 22/09

**Elegido:** cuando la función tiene restricción de edad, el formulario de **compra
anónima** pide la fecha de nacimiento del comprador y valida contra ella.

**Por qué:** el mail del 01/01 habilita comprar sin cuenta y el del 12/02 exige que no se
vendan entradas a menores de 18 o de 13 según la película. Sin cuenta no hay fecha de
nacimiento registrada contra la cual validar, así que la única forma de cumplir los dos
pedidos es pedirla en el momento de la compra. Es una declaración del comprador, no es
verificable, pero cumple los dos requisitos sin recortar ninguno.

**Descartado:** exigir cuenta registrada para comprar entradas de funciones con
restricción de edad. Es más confiable, porque la fecha ya está validada en el registro,
pero se descarta porque elimina la compra anónima para esas funciones, que el cliente
pidió expresamente en el mail del 01/01.

**Requisito:** R-25. Se relaciona con R-02 (compra anónima) y R-26 (aviso de acompañante
adulto).

---

## D-07 · Persistencia de butacas: solo las vendidas · 22/09

**Elegido:** no se persiste el mapa completo de butacas por función. La distribución de la
sala es fija y conocida (20 filas, 28 butacas salvo J y K con 14, total 532), así que el
mapa se calcula en el cliente. En la base solo quedan las butacas **efectivamente
vendidas**, como filas asociadas a la compra y a la función.

**Por qué:** una butaca sin vender no tiene información propia que guardar: su fila, su
número y si es VIP o accesible se deducen de la posición. Guardar solo lo vendido mantiene
la tabla chica, hace que la consulta de ocupación de una función sea directa y simplifica
el Realtime de R-16, porque cada `INSERT` es exactamente una butaca que se acaba de ocupar.

**Descartado:** generar las **532 filas por función** al crearla, cada una con su estado.
Se descarta por el volumen: cada función agrega 532 filas de las cuales la enorme mayoría
nunca cambia de estado, y una cartelera de varias salas y varios horarios por día multiplica
eso muy rápido, sin aportar ningún dato que no se pueda deducir.

**Requisitos:** R-13 (distribución), R-16 (mapa en tiempo real). Condiciona R-14 (VIP en R,
S y T) y R-15 (accesibles), que pasan a ser reglas de posición y no columnas de una tabla.

---

## D-08 · Ítems de la compra en dos tablas · 22/09

**Elegido:** una compra tiene sus ítems separados en dos tablas, **`Entradas`** e
**`ItemsCandy`**, cada una con las columnas que su tipo necesita.

**Por qué:** los dos tipos de ítem casi no comparten atributos. Una entrada se ata a una
función y a una butaca; un producto del candy bar se ata a un producto y a una cantidad.
Separarlos permite que cada tabla tenga sus columnas obligatorias y sus claves foráneas
reales, en lugar de columnas que solo aplican a la mitad de las filas.

**Descartado:** una **tabla única de ítems con un campo `tipo`**. Se descarta porque obliga
a que las columnas de entrada queden nulas en las filas de candy y viceversa: ninguna
columna específica puede ser `NOT NULL`, ninguna clave foránea puede ser obligatoria, y la
consistencia pasa a depender de validaciones en el código en vez de la estructura.

**Requisitos:** R-20 (entrada), R-21 (candy bar), R-22 (combos), R-28 (canje por puntos).

**Ajustada por D-40:** como el combo pasó a ser un producto, `ItemsCandy` apunta siempre a
`ProductosCandy` y ya no tiene `combo_id`.

---

## D-09 · Código de compra y marcas de validación · 22/09

**Elegido:** cada compra lleva un **código único propio** con formato **`OLY-XXXX-XXXX`**,
distinto de su id. Ese código es el que va al QR. La validación se registra con **dos
marcas independientes**: una para la entrada del cine y otra para el retiro del candy bar.

**Por qué:** el mismo QR sirve para las dos cosas (R-21), pero se consumen por separado y
en momentos distintos: alguien puede retirar los pochoclos y entrar a la sala después. Dos
marcas independientes permiten que cada una se invalide por su lado y que R-33 se cumpla
sin que validar una cosa anule la otra. El formato agrupado en bloques de cuatro es para
que se pueda **dictar y tipear a mano** cuando el lector no funciona, que es justo lo que
pide R-32.

**Descartado:** usar el **id de la compra** como código. Se descarta por dos motivos: es
adivinable, porque un id correlativo deja probar el de al lado, y es incómodo de dictar y
cargar a mano, sea un número largo o un uuid.

**Requisitos:** R-20 (QR), R-31 (validación por QR), R-32 (carga manual), R-33 (un solo
uso), R-21 (mismo QR para el candy bar).

---

## D-10 · Clave de Supabase: anon legacy · 29/09

**Elegido:** la app se conecta a Supabase con la **clave `anon` legacy** (el JWT), cargada
en `environment.ts` como `SUPABASE_KEY`.

**Por qué:** es la clave que se usa del lado del cliente y funciona con cualquier versión
de `supabase-js`. Las claves legacy se deprecan a fin de 2026, después de la entrega, así
que no afectan al TP.

**Descartado:** la clave **publishable** (`sb_publishable_...`). Se descarta porque
necesita una versión de `supabase-js` que no pude confirmar.

**Nota:** la clave `anon` es pública por diseño: lo que protege los datos es RLS. La
`service_role` saltea RLS y nunca va en el código.

**Clase de origen:** 5 (cliente de Supabase con `environment`).

---

## D-11 · Tablas creadas con un script SQL versionado · 29/09

**Elegido:** las tablas, las funciones, RLS, las políticas y los permisos se crean con un
único script, [`supabase/schema.sql`](../supabase/schema.sql), que se corre completo desde
el SQL Editor de Supabase y queda versionado en el repo.

**Por qué:** son 19 tablas con sus políticas: un script lo resuelve en una sola corrida y
queda como respaldo, para rehacer la base si hace falta y para mostrar en el oral qué
políticas tiene cada tabla.

**Descartado:** crear las tablas a mano desde el panel de Supabase. Se descarta por
tiempo y porque no deja respaldo de lo creado.

**Requisitos:** todos los que persisten datos. Deriva de `docs/modelo-datos.md`.

---

## D-12 · Rol en la tabla Usuarios, leído con `rol_actual()` · 29/09

**Elegido:** el rol (`admin`, `empleado` o `cliente`) vive en la tabla **`Usuarios`**. Las
políticas lo leen con la función **`rol_actual()`**, que es `security definer`, y con los
atajos `es_admin()` y `es_empleado()`. Además, **permisos por columna** sobre `Usuarios`,
tanto para `insert` como para `update`, impiden que un usuario se cargue o se edite `rol`,
`puntos` o `credito`.

**Por qué:**

- `rol_actual()` es `security definer` para evitar la **recursión de la política de
  `Usuarios` sobre sí misma**: sin eso, para decidir si alguien puede leer `Usuarios` la
  política tendría que leer `Usuarios`, y Postgres corta con un error de recursión
  infinita. Con `security definer` la función corre con los permisos de quien la creó y
  saltea RLS.
- RLS decide **qué filas** se pueden tocar; los permisos de columna deciden **qué
  campos**. La política "usuario edita su perfil" deja editar la propia fila, pero esa fila
  tiene rol, puntos y crédito. El `revoke update` más el `grant update (...)` sobre los
  campos personales cierran ese hueco.
- Lo mismo pasa al crear la fila: la política "usuario crea su perfil" solo chequea que el
  `id` sea el propio, así que sin más restricción alguien podría registrarse insertando
  `rol: 'admin'` desde la consola del navegador. El `revoke insert` más el
  `grant insert (...)` sobre las columnas del registro obligan a que rol, puntos y crédito
  tomen su valor por defecto.

Las funciones de Postgres y los permisos por columna no se vieron en clase (🟡). Quedan
aprobados y registrados acá.

**Descartado:** guardar el rol en los metadatos de auth (`options.data` del `signUp`, como
el ejemplo del profe). Se descarta porque esos metadatos los puede editar el propio
usuario desde el navegador, y cualquiera podría ponerse rol `admin`.

**Consecuencia:** hoy nadie puede cambiar un rol desde la app; el admin y el empleado se
crean cambiando el rol a mano desde el panel de Supabase.

**Corregido por D-24:** en esta versión `es_empleado()` devolvía verdadero también para el
admin. Desde el 01/10 devuelve verdadero solo para el rol `empleado`.

**Clase de origen:** 6 (RLS) y 7 (tabla `Usuarios`). **Requisitos:** R-31 a R-33 (acciones
del empleado), R-34 a R-38 (acciones del admin) y R-30 (crédito, que el cliente no puede
editarse).

---

## D-13 · Guards async que esperan el perfil · 29/09

**Elegido:** los guards (`logueadoGuard`, `adminGuard`, `empleadoGuard`) son **`async`** y
esperan a que el servicio `Auth` termine de cargar el perfil antes de decidir.

**Por qué:** Supabase restaura la sesión de forma asíncrona. Al recargar la página en
`/admin`, el guard se ejecuta antes de que llegue la sesión y el perfil: si decidiera en
ese momento, vería `perfil()` en `null` y mandaría al login a alguien que tiene sesión. Un
`CanActivateFn` puede devolver una `Promise`, así que el guard espera y recién después
chequea el rol. Es Angular estándar, pero no se vio en clase (🟡).

**Descartado:** guards sincrónicos, como el `logueadoGuard` de la clase 5. Funcionan
navegando dentro de la app, pero fallan al recargar.

**Clase de origen:** 5 (guards funcionales).

---

## D-14 · Log de actividad escrito desde un servicio · 01/10

**Elegido:** un servicio **`LogActividad`** con un método **`registrar(accion, entidad,
entidadId, detalle)`** que inserta una fila en la tabla `LogActividad`. Cada servicio del
admin lo llama **después** de cada alta, edición o baja que salió bien. Si el insert del
log falla, `registrar()` devuelve el error para que la pantalla lo muestre.

**Por qué:** el log queda a la vista en el código de la app: leyendo `crear()` en el
servicio de películas se ve la línea que registra la acción. Es un insert común, como los
de la clase 6, y el usuario que lo hizo sale del servicio `Auth` que ya existe.

**Descartado:** **triggers de Postgres** sobre cada tabla (🟡). Registran aunque el front
se olvide de llamar al log, pero esconden la lógica en la base, y el admin tiene pocas
pantallas: son pocos llamados para mantener a mano.

**Consecuencia:** el log depende de que cada servicio nuevo se acuerde de llamar a
`registrar()`. Y como la acción y el log son dos pedidos separados, puede pasar que la
acción se guarde y el log no: en ese caso la pantalla avisa, no lo oculta.

**Clase de origen:** 3 (servicios e inyección) y 6 (insert). **Requisito:** R-38.

---

## D-15 · Géneros como lista fija cargada con SQL · 01/10

**Elegido:** los géneros son una **lista fija** de 15, cargada con un `insert` en
[`supabase/schema.sql`](../supabase/schema.sql). El formulario de películas los lee de la
tabla `Generos` y los muestra como checkboxes.

**Por qué:** los mails piden que una película tenga varios géneros, no que el cine pueda
administrarlos. La tabla `Generos` sigue existiendo, así que agregar uno es un insert más
y no hay ninguna lista escrita a mano en el front.

**Descartado:** un **ABM de géneros** en el panel del admin. Se descarta porque ningún
mail lo pide: es una pantalla más para hacer, probar y explicar sin requisito que la
respalde.

**Requisito:** R-07.

---

## D-16 · `traerUna` con dos consultas · 01/10

**Elegido:** `traerUna(id)` del servicio de películas hace **dos consultas**: una a
`Peliculas` con `.eq('id', id).single()` y otra a `PeliculasGeneros` con
`.eq('pelicula_id', id)`. Con el resultado arma la película con la lista de ids de sus
géneros.

**Por qué:** las dos son consultas del patrón de la clase 6, y cada una se lee y se
explica por separado.

**Descartado:** el **select anidado** de Supabase (`select('*, PeliculasGeneros(genero_id)')`),
que trae todo en un solo pedido (🟡). Se descarta porque no se vio en clase.

**Clase de origen:** 6 (CRUD). **Requisito:** R-07.

---

## D-17 · Precio de preventa validado a nivel del formulario · 01/10

**Elegido:** la regla "el precio de preventa es obligatorio solo si la preventa está
habilitada" se valida con un **`ValidatorFn` propio aplicado al `FormGroup`**, no a un
control. El validador recibe el grupo entero, lee los dos campos y devuelve un error del
formulario si la preventa está marcada y el precio está vacío.

**Por qué:** la regla depende de **dos** campos, y un validador puesto en el control del
precio solo ve su propio valor. Es el mismo `ValidatorFn` de la clase 4; lo único que
cambia es dónde se cuelga (🟡: en clase se usó sobre un control). El mismo criterio se
usa para "al menos un género": un `ValidatorFn` colgado del `FormArray` de checkboxes,
porque la regla es sobre la lista entera y no sobre un checkbox.

**Descartado:** escuchar los cambios del checkbox y **cambiar los validadores en runtime**
con `setValidators`. Se descarta porque no se vio en clase y reparte la regla entre el
formulario y un callback.

**Clase de origen:** 4 (validadores propios). **Requisito:** R-11.

---

## D-18 · Id de la película nueva con `insert().select().single()` · 01/10

**Elegido:** al crear una película, el insert se encadena con **`.select().single()`** para
que Supabase devuelva la fila recién creada, con el `id` que le asignó la base.

**Por qué:** ese `id` hace falta enseguida para guardar las filas de `PeliculasGeneros` y
para el log de actividad, y lo genera la base (`identity`), así que el front no lo conoce
de antemano. `select()` y `single()` se vieron en la clase 6; lo que no se vio es
encadenarlos después de un insert (🟡).

**Descartado:** insertar y después volver a leer todas las películas para quedarse con la
de `id` más alto. Usa solo lo visto, pero son dos pedidos y, con dos altas simultáneas,
puede tomar el `id` de la otra y asociar los géneros y el log a la película equivocada.

**Clase de origen:** 6 (CRUD). **Requisitos:** R-07 y R-38.

---

## D-19 · Limitaciones conocidas del ABM de películas · 01/10

Dos cosas que el ABM no resuelve, a sabiendas. Se dejan así y se explican en el oral.

**1. El guardado no es atómico.** Crear o editar una película son varios pedidos
separados: la fila de `Peliculas`, las filas de `PeliculasGeneros` y el log. Si falla uno
de los últimos, los anteriores ya quedaron guardados: puede haber una película sin
géneros, o un cambio sin su línea en el log. El servicio lo informa con
`ResultadoAccion` (`hecho: true` con un `error`) y la pantalla lo muestra.

**Por qué se deja así:** hacerlo atómico exige una **función de Postgres llamada por RPC**
que haga todo en una transacción (🟡), que es justo lo que D-14 descartó: esconder la
lógica en la base. Para un panel que usa un solo administrador, el riesgo es bajo y el
arreglo es volver a guardar.

**2. Los pósters viejos quedan en el bucket.** Al cambiar el póster de una película o al
borrarla, el archivo anterior no se elimina de Storage: queda huérfano.

**Por qué se deja así:** borrarlo necesita `remove()` de Storage, que no se vio en clase
(🟡), y ningún mail lo pide. Lo único que se pierde es espacio, y para el volumen del TP
es despreciable. La política de borrado para el admin ya está en `schema.sql`, así que
agregarlo después no toca la base.

**Requisitos:** R-34 y R-38.

---

## D-20 · Id de la URL con `ActivatedRoute` · 01/10

**Elegido:** el formulario de películas lee el `:id` de `/admin/peliculas/:id` con
**`inject(ActivatedRoute).snapshot.paramMap.get('id')`**. Si no hay `id`, es un alta.

**Por qué:** `ActivatedRoute` es el servicio del router que describe la ruta activa. Se
inyecta con `inject()`, igual que `Router`, y `snapshot` da los parámetros tal como están
al crear el componente, que es todo lo que hace falta: el formulario no cambia de película
sin volver a crearse. Leer parámetros de ruta no se vio en clase (🟡).

**Descartado:**
- `input()` completado por el router con `withComponentInputBinding()`: usa `input()` de la
  clase 3, pero obliga a tocar `app.config.ts` con una opción que no se vio.
- Cortar `Router.url` con `split('/')`: no usa nada nuevo, pero se rompe si la ruta cambia
  de forma.

**Clase de origen:** 1 y 2 (ruteo).

---

## D-21 · Carga del formulario de edición con `patchValue` · 01/10

**Elegido:** al editar, la película traída de la base se vuelca en el formulario con
**`formulario.patchValue({ ... })`**.

**Por qué:** el formulario se declara una sola vez, igual que el de registro, y sirve para
alta y edición. `patchValue` es un método del `FormGroup` que escribe los valores que se
le pasan y deja el resto como está. No se vio en clase (🟡).

**Descartado:** crear el formulario recién cuando llegan los datos, con los valores
iniciales en `fb.group` y guardado en un signal que arranca en `null`. Usa solo lo visto,
pero envuelve todo el template en un `@if` y complica los getters de cada campo.

**Clase de origen:** 4 (formularios reactivos).

---

## D-22 · Géneros del seed con `insert ... select` · 01/10

**Elegido:** [`supabase/seed.sql`](../supabase/seed.sql) carga las películas iniciales y
les asigna los géneros con **`insert ... select`**, buscando la película y el género
**por nombre**:

```sql
insert into public."PeliculasGeneros" (pelicula_id, genero_id)
select p.id, g.id
from public."Peliculas" p, public."Generos" g
where p.nombre = 'The Godfather'
  and g.nombre in ('Crimen', 'Drama');
```

**Por qué:** los ids los genera la base (`identity`), así que no se conocen antes de
insertar. `insert ... select` inserta las filas que devuelve la consulta: las dos tablas en
el `from` arman todas las combinaciones de película y género, y el `where` deja solo las
pedidas. No se vio en clase (🟡).

**Descartado:** escribir los ids a mano (`values (1, 4), (1, 9)`). Se descarta porque
dependen del orden en que se cargaron los datos y cambian si la base se reconstruye: el
mismo script asignaría géneros equivocados sin dar ningún error.

**Consecuencia:** el seed se corre una sola vez, y depende de que no haya otra película
con el mismo nombre; si la hubiera, también recibiría los géneros.

**Requisito:** R-07. Se apoya en D-11 (base versionada en SQL) y D-15 (géneros fijos).

---

## D-23 · Fechas con tres desplegables, sin calendario · 01/10

**Elegido:** las fechas se ingresan con **tres desplegables** (`<select>`): día, mes y año.
En el formulario son un **`FormGroup` anidado** `{ dia, mes, anio }` dentro del formulario
de la pantalla. Ese grupo lleva un **validador de grupo** que rechaza las fechas imposibles
(31/02, 29/02 de un año no bisiesto). Los tres desplegables viven en un componente
reutilizable, **`campo-fecha`**, que recibe el grupo con `input()`. Los meses se muestran
con su nombre y los años van del más reciente al más viejo, con el rango que le indica
quien lo usa.

**Por qué:** el cliente rechazó expresamente el selector de calendario para fechas y horas
(R-41, mail del 28/02), y hasta acá se usaba `input type="date"` en el registro y en el
alta de película. Con tres desplegables no hay calendario ni scroll largo, y cada valor
sale de una lista, así que no se puede tipear mal. La validez de la fecha depende de los
**tres** campos a la vez, y por eso el validador va en el grupo y no en un control: es el
mismo criterio de D-17. El componente sigue el patrón del campo reutilizable de la clase 4,
que recibe un control con `input()`; acá recibe un grupo.

**Descartado:** un **campo de texto `dd/mm/aaaa`**. Es más rápido de cargar con el teclado,
pero admite errores de tipeo: el formato, las barras y el orden de día y mes quedan a cargo
de quien escribe, y hay que validarlos y explicarlos con un mensaje.

**Consecuencia:** la **hora** de las funciones va a seguir el mismo criterio, con dos
desplegables: hora, y minutos de 15 en 15. Queda prohibido `input type="date"` y
`input type="time"` en todo el proyecto.

**Clase de origen:** 4 (grupos anidados con `formGroupName`, validadores propios y campo
reutilizable con `input()`). **Requisito:** R-41. Afecta a R-01 (fecha de nacimiento), R-04
y R-10 (fecha de estreno) y R-17 (día y hora de las funciones).

---

## D-24 · Admin y empleado son roles separados · 01/10

**Elegido:** `admin` y `empleado` son dos roles **separados**, sin que uno incluya al otro.
El admin **no** valida entradas ni entrega candy: eso lo hace solo el empleado.

- En la base, `es_empleado()` devuelve verdadero **solo** para el rol `empleado`.
- Donde el admin necesita **leer** (`Usuarios`, `Compras` e `ItemsCandy`, para los
  reportes), la política lo nombra de forma explícita con `es_admin()`.
- El `update` de `Compras` que marca la validación de la entrada y la entrega del candy
  queda solo para el empleado. El cliente sigue pudiendo cancelar su propia compra.
- `LogActividad` sigue aceptando inserts de los dos, porque los dos hacen acciones que se
  auditan.
- En el front, `empleadoGuard` deja pasar únicamente al empleado, y el menú del admin no
  muestra "Validación".

**Por qué:** lo indicó la cátedra en la corrección del 01/10, y coincide con el mail del
06/02, que describe dos tipos de usuario distintos. Nombrar al admin de forma explícita en
cada política deja a la vista qué puede hacer cada rol, en lugar de esconderlo dentro de
una función cuyo nombre dice otra cosa.

**Descartado:** lo que había en D-12, donde `es_empleado()` devolvía verdadero para `admin`
y `empleado`. Ahorraba escribir el admin en cada política, pero le daba la validación de
entradas, que no le corresponde.

**Corrige:** D-12. **Requisitos:** R-31 a R-33 (validación, solo el empleado) y R-34 a R-38
(administración y reportes, solo el admin).

---

## D-25 · Reglas de contenido repetidas como constraints `check` · 01/10

**Elegido:** las reglas de largo, rango, formato y obligatoriedad se validan en el
formulario **y además** en la base, con `not null` y constraints `check`, siguiendo la
sección 4 de [`docs/validaciones.md`](validaciones.md). Por ahora cubre las dos tablas que
ya tienen formulario (sección 7 de [`supabase/schema.sql`](../supabase/schema.sql)); las
demás se completan en su bloque.

- `Usuarios`: `tipo_sangre`, `color_ojos` y `dias_vacaciones` pasan a `not null`. Mail de
  hasta 254 caracteres, nombre y apellido de 2 a 50 y solo con letras, fecha de nacimiento
  no futura y no más de 120 años atrás, tipo de sangre y color de ojos de la lista, días
  de vacaciones de 0 a 60.
- `Peliculas`: `sinopsis`, `imagen_url` y `fecha_estreno` pasan a `not null`. Nombre de 1 a
  100 caracteres, sinopsis de 20 a 1000, duración de 30 a 300 minutos, precio de preventa
  mayor a 0 y hasta 1.000.000, y obligatorio si la preventa está habilitada.

**Por qué:** el formulario se puede saltear desde la consola del navegador, llamando a
Supabase directo; la base no. Lo marcó la cátedra en la corrección del 01/10, que además
permitió expresamente funciones, triggers y constraints de Postgres.

Lo que no se vio en clase (🟡) y se usa acá:

- **`check`**: una condición que la fila tiene que cumplir para guardarse. Se evalúa en cada
  insert y en cada update. Si la columna es null no la rechaza: de eso se ocupa `not null`.
- **`trim()` y `char_length()`**: sacar los espacios de los extremos y contar caracteres.
  Juntas resuelven "no puede ser solo espacios": un texto de puros espacios queda con
  largo 0 y no llega al mínimo.
- **`texto ~ 'patrón'`**: verdadero si el texto cumple la expresión regular. Es el
  equivalente en la base de `Validators.pattern`.
- **`current_date - interval '120 years'`**: la fecha de hoy corrida 120 años atrás.
- **Check cruzado**: `not preventa_habilitada or precio_preventa is not null` mira dos
  columnas de la misma fila. "No A, o B" se lee "si A, entonces B".
- **`alter policy`** y **`alter table ... add constraint`**: cambian una política o una
  tabla que ya existe, sin borrarla y crearla de nuevo.

**"Solo letras" en nombre y apellido.** El patrón `textoPersona` acepta letras, separadas
por un solo espacio, apóstrofo o guion, y tiene que empezar y terminar con letra. Las
letras son las **latinas con cualquier acento o diacrítico** (`A-Z`, `a-z`, `À-Ö`, `Ø-ö`,
`ø-ɏ`), escritas como rangos. `validaciones.md` dice "letras de cualquier idioma", pero las
expresiones regulares de Postgres no tienen una clase que signifique "cualquier letra" de
forma confiable: depende de la configuración regional del servidor. Con los rangos
explícitos, la base y el formulario aceptan **exactamente lo mismo**. Queda afuera un
nombre escrito en otro alfabeto (cirílico, griego, chino).

**Límites conocidos:**

- Géneros "entre 1 y 4" **no se puede expresar** como `check`: un check solo ve la fila que
  se está guardando, y los géneros están en otra tabla. Haría falta un trigger. Queda
  validado solo en el formulario.
- "Fecha de estreno entre 1 año atrás y 1 año adelante" y "preventa solo con estreno
  futuro" **se pueden escribir pero no conviene**: un check se vuelve a evaluar en cada
  update de la fila. Cuando la película cumpla un año de estrenada, o al día siguiente del
  estreno de una que tuvo preventa, la base rechazaría cualquier cambio sobre ella. Son
  reglas del momento de la carga: quedan en el formulario.
- El rango de la fecha de nacimiento sí compara contra la fecha de hoy. El mismo problema
  existe solo para quien cumple 120 años.
- Las listas de tipo de sangre y color de ojos quedan escritas en dos lugares, el
  formulario y la base. Si se agrega una opción, hay que agregarla en los dos.

**Aplicación en la base viva · 05/10:** estos checks estaban en `schema.sql` desde el 01/10
pero no en Supabase. La sección 7 empezaba con `es_empleado()` escrita con `as $ ... $;` en
vez de `as $$ ... $$;`: es un error de sintaxis, y como el SQL Editor corre todo lo pegado
como una sola operación, no quedó aplicado nada de esa sección (tampoco los roles separados
de D-24). Se corrigió la línea y se agregó la sección 9.6, que vuelve a aplicar la 7.1, la
7.2 y la 7.3 de forma que se pueda correr en cualquier estado (`drop constraint if exists`
antes de cada `add`), con un `select` previo por regla que muestra las filas que no la
cumplen. Lección: después de correr un script, verificar en la base que quedó aplicado.

**Resuelto · zona horaria de la fecha de nacimiento · 05/10:** el check usaba
`current_date`, que es el día del servidor, y el servidor está en UTC. De 21 a 24 hs de
Argentina la base ya estaba en el día siguiente y aceptaba una fecha de nacimiento un día
"en el futuro". Ahora "hoy" es el día de Argentina (sección 9.5 de `schema.sql`), y la base
y el formulario aceptan lo mismo a cualquier hora. Lo que no se vio en clase (🟡) y se usa:

- **`now() at time zone 'America/Argentina/Buenos_Aires'`**: la fecha y la hora que marca
  el reloj en Argentina en este instante, sin importar dónde esté el servidor.
- **`(...)::date`**: un cast, un cambio de tipo. Se queda con el día y descarta la hora.
- **`drop constraint`**: borra un check. Un check no se puede modificar, así que se borra
  y se crea de nuevo en el mismo `alter table`.

**Descartado:** validar solo en el formulario. Es lo visto en clase, pero deja la base
aceptando cualquier cosa.

**Requisitos:** R-01 y R-04. Se apoya en D-11 (base versionada en SQL).

---

## D-26 · Reglas de carga de la película: se exigen al cargar, no en cada edición · 01/10

**Elegido:** dos reglas del formulario de película se aplican **en el momento en que el
admin carga el dato**, y no cada vez que se guarda la película:

- **Fecha de estreno entre un año atrás y un año adelante:** se exige en el alta. En la
  edición, solo si la fecha se cambió. Si queda la que la película ya tenía, no se vuelve
  a validar.
- **Preventa solo con estreno futuro:** se exige al **habilitar** la preventa. Si la
  película ya la tenía habilitada al abrir la edición, el formulario no la bloquea aunque
  el estreno ya haya pasado.

Para eso el formulario guarda, al abrir la edición, la fecha de estreno y el estado de la
preventa que la película tenía, y los dos validadores los comparan con lo que hay en
pantalla. En el alta no hay valores anteriores, así que las dos reglas se aplican siempre.

**Por qué:** las dos reglas comparan contra **hoy**, y hoy cambia. Una fecha de estreno
que era válida al cargarla deja de serlo sola cuando la película cumple un año; una
preventa bien habilitada queda "mal" al día siguiente del estreno. Si se exigieran en cada
guardado, esas películas no se podrían volver a editar, ni para sacarlas de cartelera.

Sobre la preventa, el mail del 08/03 dice que pasada la fecha de preventa el precio vuelve
al normal (R-11). Eso lo resuelve **el sistema con la fecha de estreno**, en el momento de
la compra: el admin no tiene que acordarse de destildar nada. La casilla dice "esta
película tiene preventa"; si la preventa está vigente o no, lo dice la fecha.

**Descartado:**

- Aplicar las dos reglas en cada guardado, que es como estaban. Bloquea la edición de
  películas viejas y de las que tuvieron preventa.
- Sacar las reglas del todo. Dejaría cargar una fecha de estreno de 1990 por un error de
  tipeo, o habilitar la preventa de una película ya estrenada.

**Consecuencia:** son reglas solo del formulario. En la base no tienen `check` por el mismo
motivo: un check se vuelve a evaluar en cada update (D-25). Y "preventa habilitada" pasa a
significar "tiene preventa", no "la preventa está abierta hoy": el bloque de compra tiene
que mirar la fecha de estreno, no solo la casilla.

Es el mismo tipo de validador que D-17 (un `ValidatorFn` colgado de un grupo), pero como
método del componente, porque necesita leer los valores originales.

**Clase de origen:** 4 (validadores propios). **Requisitos:** R-04 y R-11. Se apoya en D-17
y D-25.

---

## D-27 · El estado de la película sale de la fecha de estreno · 01/10

**Elegido:** las columnas `en_cartelera` y `proximamente` se reemplazan por una sola,
**`visible`**. El admin decide si la película aparece o no; **en qué lugar aparece lo
dice la fecha de estreno**:

| `visible` | Estreno | Dónde aparece |
|---|---|---|
| sí | futuro | Próximamente (R-10) |
| sí | hoy o pasado | En cartelera (R-05) |
| no | cualquiera | No aparece |

El estado no se guarda en la base: se calcula en el front comparando `fecha_estreno` con
la fecha de hoy, en el pipe `estadoPelicula` (clase 8).

La **preventa** sigue siendo una casilla aparte, y solo se puede habilitar con estreno
futuro (D-26).

El campo del formulario pasa a llamarse **"Estreno en Olympia Cinema"**, con la ayuda
"Fecha en que la película empieza a proyectarse en el cine, no la de su estreno original".
Como de esa fecha depende dónde aparece la película, tiene que quedar claro que es la del
cine: *The Godfather* es de 1972, pero su estreno en Olympia es el de la cartelera.

**Por qué:** el mail del 01/01 pide que el admin elija **qué películas aparecen** al entrar
a la página, no en qué sección. Con dos casillas el estado se podía contradecir (las dos
marcadas, o "en cartelera" con un estreno futuro), y esa regla había quedado como "a
decidir" en `docs/validaciones.md`. Con una sola casilla y la fecha no hay combinación
inválida posible, así que la regla desaparece en vez de validarse.

**Descartado:** un **selector manual de estado** (oculta, próximamente, en cartelera).
Resuelve la contradicción, pero obliga a que alguien pase la película a cartelera a mano
el día del estreno. Si se olvida, la película sigue figurando como próxima con el estreno
ya pasado.

**Migración:** `visible` toma `en_cartelera or proximamente` de cada fila antes de borrar
las dos columnas (sección 8 de [`supabase/schema.sql`](../supabase/schema.sql)).
`alter table ... add column` y `drop column` no se vieron en clase (🟡): agregan y quitan
una columna de una tabla que ya existe, sin borrarla y crearla de nuevo.

**Consecuencia:** la cartelera y Próximamente del cliente tienen que usar el mismo
cálculo. Y como una película pasa sola de Próximamente a cartelera el día del estreno,
para que se pueda comprar ese día ya tiene que tener funciones cargadas.

**Clase de origen:** 8 (pipes propios). **Requisitos:** R-05, R-10 y R-11. Se apoya en D-26.

---

## D-28 · Precio de la entrada en la función · 05/10

**Elegido:** precio como columna de `Funciones`; la compra guarda el precio pagado.
Son dos precios, base y VIP, por R-14.

**Descartado:** precio en la película, porque no permite precio por horario y la compra
necesitaría otra consulta.

**Cómo lo explico en el oral:** el cliente compra una función, así que el precio es de la
función. La compra guarda lo que pagó para que los reportes no cambien si cambia el precio.

**Clase de origen:** 6 (CRUD). **Requisito:** compra / preventa.

---

## D-29 · Asignación automática de sala con 30 minutos de margen · 05/10

**Elegido:** el servicio elige la primera sala libre y un trigger de Postgres rechaza
superposiciones.

**Descartado:** todo en una función SQL llamada con `rpc()`, porque saca la lógica de
Angular y suma algo no visto.

**Cómo lo explico en el oral:** el servicio guía y la base garantiza. Aunque dos admins
carguen a la vez o alguien use la consola, la base no deja superponer.

**Cómo decide el servicio:** dos funciones chocan en una sala si cada una empieza antes de
que termine la otra más 30 minutos. El fin es `fecha_hora` más la duración de la película.
Las salas se recorren por nombre y se toma la primera activa que no choque con ninguna.

Lo que no se vio en clase (🟡) y se usa acá:

- **`.gte()` y `.lt()`** de Supabase: son filtros como `.eq()`, pero con "mayor o igual" y
  "menor". Traen solo las funciones del rango de fechas que se está cargando, en lugar de
  toda la tabla.
- **Trigger**: una función de Postgres que la base ejecuta sola antes de cada insert o
  update de `Funciones`. Recibe la fila en `new`; si la devuelve, la fila se guarda, y si
  hace `raise exception`, se rechaza. Ese rechazo llega al front con el código `P0001`, que
  el servicio traduce a un mensaje.
- **`pg_advisory_xact_lock(sala)`**, dentro del trigger: hace que dos cargas simultáneas
  sobre la misma sala pasen de a una. Sin eso, cada una revisa antes de que la otra termine
  de guardar, ninguna ve a la otra y entran las dos. El candado se suelta solo al terminar
  cada guardado.

**Resuelto · duración de una película con funciones:** el trigger mira las funciones, no
las películas, así que alargar la duración de una película con funciones cargadas podía
dejarlas superpuestas sin que nada lo rechazara. Se cerró en la edición de película: si
tiene funciones futuras, el campo duración queda deshabilitado con un mensaje que lo
explica, y `modificar()` del servicio de películas rechaza el cambio aunque se saltee el
formulario. Para cambiarla hay que borrar o reprogramar antes esas funciones.

**Ninguna función antes del estreno · 05/10:** el mismo trigger rechaza también la función
que es anterior al estreno de su película (sección 9.4 de `schema.sql`), con su propio
mensaje. Las dos reglas llegan al front con el código `P0001`; el servicio las distingue por
el texto del mensaje y muestra uno distinto para cada una. La regla ya estaba en el
formulario y en el servicio: se suma a la base porque el front se puede saltear. La
preventa adelanta la venta, no las funciones.

El trigger está en `Funciones`, así que no ve cuando lo que cambia es la película. Ese lado
lo cierra la edición de película: no deja poner un estreno posterior a la primera función
futura, ni desde el formulario ni desde `modificar()`, y el mensaje dice la fecha de esa
función.

**Resuelto · zona horaria del estreno · 05/10:** `fecha_estreno` es un `date` y el servidor
está en UTC, así que la base tomaba el estreno desde las 21:00 del día anterior en
Argentina y dejaba pasar una función de la víspera desde esa hora. Ahora el trigger compara
el **día de la función en Argentina** con el estreno (sección 9.5 de `schema.sql`):
`(new.fecha_hora at time zone 'America/Argentina/Buenos_Aires')::date`. `at time zone` da
la fecha y la hora que marca el reloj en Argentina en ese instante, y `::date` se queda con
el día (🟡, aprobado). Es el mismo arreglo que D-25 anota para la fecha de nacimiento.

**Clase de origen:** 6 + trigger 🟡 (D-25, aprobado por la cátedra). **Requisito:** funciones
sin superposición (R-17, R-18, R-19).

---

## D-30 · Funciones recurrentes: una fila por fecha · 05/10

**Elegido:** el formulario toma días, desde, hasta y hora; el servicio genera una fila por
fecha y las inserta en un único insert, todo o nada.

**Descartado:** tabla `Programaciones`, porque suma tabla, ABM y sincronización sin aportar
nada a lo que pide el mail.

**Cómo lo explico en el oral:** cada función es una fila, así que compra y reportes no
cambian. El insert de muchas filas es atómico: si una choca, no entra ninguna.

**Clase de origen:** 4 (formulario) + 6 (insert). **Requisito:** mail 06/02 ("lunes, martes y
viernes a las 18hs") / R-17.
---

## D-31 · Más vendidas con una vista de Postgres · 05/10

**Elegido:** vista `PeliculasMasVendidas` que expone solo `pelicula_id` y el total de
entradas.

**Descartado:** contar en Angular, porque RLS no deja leer compras ajenas y abrirlas sería
un problema de privacidad; y un contador en `Peliculas`, porque se desincroniza con las
cancelaciones.

**Cómo lo explico en el oral:** las compras son privadas por RLS. La vista corre con
permisos de su dueño y devuelve solo totales, así que el ranking es público pero las
compras no.

**Qué es una vista (🟡):** una consulta guardada con nombre. Desde la app se lee como una
tabla, con `.from('PeliculasMasVendidas').select('*')`, pero no guarda datos: cada vez que
se la consulta, Postgres vuelve a hacer la cuenta. Adentro usa `join` (une cada entrada con
su compra y con su función), `count(*)` (cuenta filas) y `group by` (una fila de resultado
por película).

**Clase de origen:** 6 (lectura con `.from()`) + vista 🟡. **Requisito:** R-06 (mail 16/01).

---

## D-32 · Buscador y géneros filtrados en el componente · 05/10

**Elegido:** se trae la cartelera una vez y `filtrar()` actualiza una signal.

**Descartado:** filtrar en Supabase, porque es una consulta por tecla y suma `.ilike()` y
filtros sobre relaciones (🟡).

**Cómo lo explico en el oral:** un cine tiene decenas de películas, así que filtrar en
memoria es instantáneo y no carga la base. Con varios géneros, la película tiene que
tenerlos todos.

**Clase de origen:** 2 (signals, `@for`) + 4 (inputs). **Requisito:** R-07 (mails 16/01).

---

## D-33 · Identidad visual "Sala oscura" · 05/10

**Elegido:** fondo oscuro, acentos rojo butaca y dorado, títulos condensados; todo en
variables CSS.

**Descartado:** "Afiche de época", porque los pósters y el mapa de butacas se leen mejor
sobre fondo oscuro.

**Cómo lo explico en el oral:** todos los colores y fuentes salen de variables en `:root`,
así que el estilo se cambia desde un lugar y es igual en toda la app.

**Clase de origen:** CSS propio; tipografía de Google Fonts (a confirmar en el diseño
final). **Requisito:** R-39 (consigna: estilo único y producido).
---

## D-34 · Las películas ocultas se pueden leer · 05/10

**Elegido:** la política de lectura de `Peliculas` no se restringe: cualquiera puede leer
todas las filas, también las no visibles. La cartelera y el detalle las dejan afuera
filtrando por `visible`.

**Por qué:** `visible` es una decisión editorial, no un dato privado. Restringir la lectura
rompería Mis películas (R-12) cuando se oculta una película ya vista: el cliente dejaría
de ver en su historial algo que vio.

**Descartado:** una política `using (visible or es_admin())`. Esconde las películas
ocultas de la API, pero no protege nada que haya que proteger y rompe el historial.

**Requisitos:** R-05 y R-12. Se apoya en D-27.

---

## D-35 · Horas de las funciones siempre en hora argentina · 05/10

**Elegido:** en el detalle de la película, las horas de las funciones se muestran con el
pipe `date` y su tercer parámetro, la zona horaria: `fecha_hora | date: 'HH:mm' : '-0300'`.
Los días en que se agrupan las funciones se calculan con el mismo corrimiento de tres
horas.

**Por qué:** `fecha_hora` guarda un instante, y el pipe `date` lo muestra por defecto en la
zona horaria del navegador. Un navegador configurado en otra zona mostraría las horas
corridas: una función de las 18:00 se vería a las 23:00 desde Madrid, y el cine está en
Buenos Aires. Con `'-0300'` se ve siempre la hora del cine. El corrimiento puede ser fijo
porque Argentina no tiene horario de verano: está en UTC-3 todo el año.

El pipe `date` con formato se vio en la clase 8; el parámetro de zona horaria, no (🟡).

**Descartado:** dejar la zona del navegador. Para quien está en Argentina se ve igual,
pero deja el horario de la función dependiendo de la configuración de cada dispositivo.

**Clase de origen:** 8 (pipes incorporados). **Requisito:** R-05 (horarios de cada
película). Se relaciona con D-29, que hace lo mismo del lado de la base.
---

## D-36 · QR con la librería qrcode · 05/10

**Elegido:** `qrcode` (`toDataURL`), sirve para la pantalla y el PDF.

**Descartado:** un componente QR de Angular, porque después hay que sacar la imagen para el
PDF.

**Cómo lo explico en el oral:** generar un QR a mano es implementar el estándar; una
función de librería me da la imagen del código de la compra.

**Clase de origen:** 🔴 librería justificada (como `canvas-confetti` en la clase 7).
**Requisito:** R-20 (mails 01/01 y 30/01).

---

## D-37 · Ticket en PDF con jsPDF · 05/10

**Elegido:** jsPDF, la app genera y descarga el archivo.

**Descartado:** CSS de impresión y `window.print()`, porque el PDF lo arma el usuario desde
un diálogo que cambia según el navegador.

**Cómo lo explico en el oral:** el mail pide que la app genere el PDF; la misma librería
sirve para el reporte de facturación.

**Dónde se usan:** las dos librerías (`qrcode` y `jspdf`) se importan en un solo archivo,
`services/tickets.ts`. Si alguna se cambia, se cambia ahí y nada más.

**`allowedCommonJsDependencies` en `angular.json`:** `qrcode` y varias dependencias internas
de jsPDF (`canvg`, `html2canvas`, `core-js`, `raf`, `rgbcolor`) están publicadas en un
formato de módulos viejo (CommonJS), y `ng build` avisa con un warning por cada una. Esa
opción le dice al build que son conocidas y aceptadas, para que el build quede limpio. No
cambia cómo funciona la app.

**Clase de origen:** 🔴 librería justificada. **Requisito:** R-20 (mail 01/01, "les genere el
pdf") y la cátedra (A-01).

---

## D-38 · Butacas ocupadas en una tabla pública con unique · 05/10

**Elegido:** `ButacasOcupadas` (solo función y butaca), pública, con Realtime y `unique`.

**Descartado:** mostrar también las butacas "en selección" con Broadcast, porque el mail
pide las ocupadas por otra compra y suma liberar butacas abandonadas.

**Cómo lo explico en el oral:** Realtime respeta RLS, y las entradas son privadas. Separé
lo público (qué butaca está ocupada) de lo privado (quién la compró), y el `unique` hace
imposible la doble venta.

**Lo que cambia en las políticas:** `Entradas` deja de ser de lectura pública: cada uno lee
las de sus compras, y el empleado y el admin las leen todas. El mapa ya no las necesita.

**Lo que no se vio en clase (🟡) y se usa acá:**

- **`unique` compuesto**: `unique (funcion_id, fila, numero)`. No puede haber dos filas con
  la misma combinación de las tres columnas: la misma butaca se puede vender en dos
  funciones distintas, pero no dos veces en la misma.
- **`filter` en `postgres_changes`**: `filter: 'funcion_id=eq.12'`. El canal avisa solo de
  las butacas de esa función, en lugar de las de todo el cine.
- **`alter publication supabase_realtime add table`**: Realtime avisa únicamente de las
  tablas que están en esa lista. Es lo mismo que activar Realtime para la tabla desde el
  panel de Supabase, pero escrito en el script (D-11).

**Cierra:** el punto abierto de la `unique` sobre `Entradas` (modelo de datos, punto 1). No
se pone ahí porque las entradas de una compra cancelada quedan como historial, y esa
butaca tiene que poder venderse de nuevo.

**Clase de origen:** 6 (Realtime) + `unique` compuesto 🟡 + `filter` de Realtime 🟡.
**Requisito:** R-16 (mail 12/02, tiempo real) y no vender dos veces.

---

## D-39 · La compra es una función de Postgres · 05/10

**Elegido:** `realizar_compra` con `rpc()`, todo en una transacción.

**Descartado:** varios inserts desde Angular, porque una compra puede quedar a medias, el
precio vendría del navegador y `Compras` tendría que aceptar escrituras de anónimos.

**Cómo lo explico en el oral:** la plata la calcula la base. Angular muestra el precio,
pero la función lo vuelve a calcular, valida edad y fechas, e inserta todo o nada.

**Qué es `rpc()` (🟡):** la forma de llamar desde la app a una función de Postgres:
`this.sup.Sup.rpc('realizar_compra', { ... })`. Devuelve `{ data, error }`, igual que un
`select`.

**Por qué es `security definer`:** la función corre con los permisos de quien la creó, así
que puede insertar en `Compras`, `Entradas` y `ButacasOcupadas` aunque el visitante no
tenga permiso de escritura sobre ninguna de las tres. Por eso se quitan las políticas de
insert que esas tablas tenían para `anon` y `authenticated`: la única puerta de entrada
es la función, que valida todo. Lleva `set search_path = public`, igual que `rol_actual()`
(D-12), para que nadie pueda hacerle usar una tabla falsa con el mismo nombre.

**Los errores:** cada regla que no se cumple hace `raise exception` con un mensaje escrito
para el comprador. Llegan al front con el código `P0001` y el servicio muestra ese texto.

**Reglas de negocio que aplica** (interpretaciones adoptadas en `docs/requerimientos.md`):

- La venta abre 7 días antes del estreno si la película tiene preventa, y el día del
  estreno si no. En hora argentina (R-11).
- En preventa, las butacas comunes y accesibles salen a `precio_preventa`; las VIP
  mantienen `precio_vip`. Las accesibles valen lo mismo que las comunes.
- Edad (R-25, D-06): si la película tiene restricción, la edad se calcula con la fecha de
  nacimiento del perfil cuando hay sesión, y con la que el comprador declara cuando no la
  hay. La fecha declarada se valida con la misma regla que la del registro (no futura y no
  más de 120 años atrás, en hora argentina) y se guarda en `fecha_nacimiento_declarada`.
- Toda entrada de una película con restricción lleva la leyenda "Debe asistir acompañado
  por un adulto" (R-26, mail 12/02).
- La película tiene que ser visible: una oculta se puede leer, pero no está ofrecida
  (D-34), así que no se le venden entradas.
- De 1 a 10 butacas por compra, válidas según la distribución de la sala (D-04).

**Clase de origen:** función de Postgres 🟡 (D-25, aprobado por la cátedra) + `rpc()` 🟡.
**Requisito:** integridad de la compra (R-20, R-25, R-26, R-11, R-14). Se apoya en D-06.

---

## D-40 · El combo es un producto con sus ítems · 05/10

**Elegido:** un combo es una fila de `ProductosCandy` con `es_combo` en verdadero.
`CombosProductos` dice qué productos trae y en qué cantidad. `incluye_entrada` marca los
combos que traen entrada (mail 03/03, "entrada + pochoclos + bebida").

**Descartado:** la tabla `Combos` aparte del modelo original, porque obligaba a
`ItemsCandy` a tener dos claves foráneas opcionales (`producto_id` o `combo_id`), y ninguna
podía ser `not null`. Es lo mismo que D-08 evita con las entradas.

**Cómo lo explico en el oral:** para la compra, un combo se vende igual que un pochoclo: es
un producto con precio. Lo único que tiene de más es la lista de lo que trae. Así cada
ítem de la compra apunta a un solo producto, y el reporte del más vendido (R-37) cuenta
combos y productos sueltos con la misma consulta.

**Lo que cambia:** reemplaza `Combos` y el `CombosProductos` original (que apuntaba a
`Combos`) del modelo de datos, y ajusta D-08: `ItemsCandy` pierde `combo_id` y
`producto_id` pasa a ser obligatorio. `ProductosCandy` pierde `imagen_url`, porque
ningún mail pide imagen. Los destacados de R-22 son los combos, así que no hay una
columna `destacado` aparte.

**Reglas en la base (D-25):** `check (combo_id <> producto_id)`, cantidad de 1 a 10 y
`check (not incluye_entrada or es_combo)`.

**Lectura:** cualquiera lee todos los productos, también los dados de baja
(`activo = false`), por el mismo motivo que D-34: las compras los referencian y el
historial los tiene que poder mostrar. La pantalla de compra filtra por `activo`.

**Guardado en dos pasos:** insert del combo, y después insert de sus ítems. Si el
segundo falla, se borra el combo y se muestra el error, para que no quede un combo vacío.

**Límite conocido:** "sin combos dentro de combos" queda solo en el formulario (el
selector ofrece solo productos que no son combo). Depende de otra fila de
`ProductosCandy`, y un check solo ve la fila que se guarda: es el mismo criterio que los
géneros de 1 a 4 en D-25. La tabla la escribe solo el admin.

**Límite conocido:** la edición de un combo borra sus ítems y los vuelve a insertar. Si
falla el insert, el combo queda vacío: los datos del producto ya se guardaron y el borrado
de los ítems también. El servicio lo informa con `ResultadoAccion` (`hecho: true` con un
`error`) y el arreglo es volver a guardar desde la misma pantalla. Es el mismo criterio que
los géneros de una película en D-19: hacerlo atómico exige una función de Postgres.

**Clase de origen:** 6 (CRUD, RLS) + 4 (`FormArray`) + `check` (D-25).
**Requisito:** R-21, R-22.

---

## D-41 · Cuándo aplica cada cupón se deduce, no se guarda · 05/10

**Elegido:** no hay tabla de cupones usados. `realizar_compra` calcula en el momento si
el cupón aplica:
- **Primera compra:** el usuario no tiene compras pagadas previas en `Compras`.
- **Mayor de 50:** el usuario tiene más de 50 años según la fecha de nacimiento de su
  perfil. Aplica en cada compra, mientras el cupón esté activo.

Complementa a D-05, que sigue en pie: los cupones se guardan en `Cupones` y el admin los
administra desde su ABM.

**Descartado:**
- Una tabla `CuponesUsados` (usuario, cupón), porque guarda algo que ya se deduce de
  `Compras`, y dos datos que dicen lo mismo pueden contradecirse.
- Una columna "ya usó el cupón" en `Usuarios`, porque el usuario edita su propia fila: se
  podría volver a habilitar el cupón desde la consola del navegador.

**Interpretación adoptada:** el cupón de bienvenida es de un solo uso (mail 01/01, "en la
primera compra"); el de mayores de 50 es reutilizable (mail 30/01). Como cuentan las
compras **pagadas**, si el cliente cancela su primera compra, la siguiente vuelve a ser
la primera.

**Datos iniciales:** solo el cupón de bienvenida, con 20% (mail 01/01). Es un valor
inicial que el admin edita (mail 30/01). Los cupones para mayores de 50 los crea el admin.

**A resolver en el bloque de compra:** dos compras simultáneas del mismo usuario no se
ven entre sí mientras se guardan, así que las dos podrían verse como "la primera". Se
evita con un candado por usuario dentro de `realizar_compra`, como el candado por sala
del trigger de superposición (sección 9.3).

**Cómo lo explico en el oral:** el cliente no puede tocar nada que le devuelva el cupón:
la regla sale de sus compras, que solo escribe `realizar_compra` (D-39).

**Clase de origen:** 6 (CRUD) + función de Postgres (D-39). **Requisito:** R-23, R-24.

---

## D-42 · La recompensa es una entrada o un producto del candy · 05/10

**Elegido:** `Recompensas` tiene un `tipo` (`entrada` o `producto`) y un `producto_id`
que apunta a `ProductosCandy` solo cuando el tipo es producto. Un check cruzado lo exige:
si el tipo es producto, `producto_id` está cargado, y si es entrada, está vacío. El costo
en puntos es un entero de 1 a 100.000.

**Descartado:**
- Una recompensa que solo apunta a un producto, porque el mail del 03/03 pide canjear por
  "entradas gratis o por productos del candy bar".
- Un campo `nombre` libre, porque el nombre sale del producto o de "Entrada": escribirlo
  dos veces permite que no coincidan.

**Lectura:** cualquiera lee todas las recompensas, también las inactivas, por el mismo
motivo que D-34: los canjes las referencian y el historial de canjes del perfil (R-03)
las tiene que poder mostrar.

**Cómo lo explico en el oral:** el admin no inventa premios, elige qué se puede canjear
(una entrada o algo del candy que ya existe) y cuánto cuesta. Así el empleado entrega un
producto real y el reporte del más vendido lo reconoce.

**Clase de origen:** 6 (CRUD, RLS) + `check` cruzado (D-25). **Requisito:** R-28.

---

## D-43 · Un solo cupón de primera compra activo, con un índice único parcial · 05/10

**Elegido:** `create unique index cupones_un_bienvenida_activo on "Cupones" (condicion)
where condicion = 'primera_compra' and activo`.

**Por qué:** `validaciones.md` 3.7 pide que haya un solo cupón de primera compra activo a
la vez. Con dos, la compra no sabría cuál aplicar. Un check no alcanza, porque solo ve
la fila que se está guardando y esta regla mira las otras.

**Descartado:** controlarlo solo en el formulario, porque se saltea desde la consola del
navegador o con dos pestañas del admin abiertas a la vez.

**Lo que no se vio en clase (🟡):** un **índice único parcial** es un `unique` que vale
solo para las filas que cumplen el `where`. Entre los cupones de primera compra activos,
`condicion` no se puede repetir, así que hay uno solo. Los inactivos y los de mayores de
50 no cuentan. Activar un segundo devuelve 23505, igual que el nombre repetido de una
sala.

**Antes de crearlo:** un `select` lista los cupones de primera compra activos si hay más
de uno. Tiene que dar vacío; si no, el `create` falla y hay que desactivar los que
sobran. Es el mismo criterio que la sección 9.6.

**Cómo lo explico en el oral:** es el `unique` de siempre, pero solo para los cupones de
bienvenida activos.

**Clase de origen:** índice único parcial 🟡. **Requisito:** R-23.

---

## D-44 · `reset()` para vaciar un formulario después de guardar · 05/10

**Elegido:** `formulario.reset(valoresIniciales)` después de un alta que salió bien y al
cancelar una edición, en las pantallas donde el formulario y la lista comparten página:
categorías del candy, cupones y recompensas.

**Lo que no se vio en clase (🟡):** `reset()` es un método de `FormGroup`. Hace dos cosas a
la vez: vuelve cada campo a un valor y lo marca como **no tocado**. Lo segundo es lo que
importa: los mensajes de error aparecen con `touched` (clase 4), así que sin eso el
formulario recién vaciado mostraría "El nombre es obligatorio" apenas se guarda.

**Siempre con los valores:** sin argumentos, `reset()` deja en `null` todos los campos de
un `FormBuilder` común, incluido el checkbox "activo", que tiene que volver a estar
marcado. Por eso cada pantalla guarda sus valores iniciales en un objeto y se los pasa:
`reset({ nombre: '', porcentaje: null, condicion: '', activo: true })`.

**Descartado:** `patchValue` con los valores iniciales (clase 4). Vacía los campos, pero
quedan tocados y aparecen los errores de obligatorio sobre un formulario que el admin
todavía no empezó a llenar.

**Cómo lo explico en el oral:** guardar deja la pantalla como recién abierta, con el
formulario vacío y sin errores, lista para cargar el siguiente.

**Clase de origen:** 4 (formularios reactivos) + `reset()` 🟡. **Requisito:** R-34
(`validaciones.md`, principio 9: los errores aparecen al tocar el campo).

---

## D-45 · Los puntos se canjean dentro de la compra · 05/10

**Elegido:** en el paso de pago, el cliente registrado elige recompensas según su saldo.
Una entrada gratis es una de sus butacas a $0; un producto es ese producto a $0 en
`ItemsCandy`, marcado con `es_canje`. `realizar_compra` descuenta los puntos e inserta
cada canje en `Canjes`, con el `compra_id` de la compra.

**Descartado:** el canje desde el perfil, con un código propio. Suma un tercer tipo de
código para el empleado, y no cumple "puntos en su línea" del resumen de pago (A-01).

**Cómo lo explico en el oral:** canjear es comprar sin pagar esa parte. Por eso pasa por
la misma función, con el mismo control de saldo, y queda en el mismo ticket.

**Lo que cambia en la base:** `Canjes` suma `compra_id`, `ItemsCandy` suma `es_canje` y
`Entradas` suma `cubierta_por` (`canje`). El cliente pierde el insert directo en `Canjes`
(sección 13.2).

**Clase de origen:** función de Postgres con `rpc()` (D-39). **Requisito:** R-27, R-28.

---

## D-46 · Cada combo con entrada cubre una de las butacas elegidas · 05/10

**Elegido:** el cliente elige sus butacas en el mapa, como siempre, y cada combo con
entrada cubre una de ellas: con N butacas se pueden llevar hasta N combos con entrada.
La butaca cubierta va a $0 y la línea del combo lleva su precio fijo. Si la butaca es
VIP, se cobra aparte la "Diferencia VIP" (`precio_vip − precio_base`), que queda guardada
como el precio de esa entrada. La entrada gratis por puntos (D-45) sigue la misma regla.

**Qué butaca cubre cada una:** en el orden en que llegan las butacas. Primero las de los
combos, después las de los canjes, y las demás se cobran. El front sigue la misma regla
para mostrarlo antes de pagar.

**Descartado:** que el combo cubra solo butacas que no son VIP. Es una restricción que
el cliente no pidió.

**Cómo lo explico en el oral:** el combo reemplaza el precio de la entrada, no la butaca.
La diferencia VIP es lo que separa una butaca común de una VIP, y eso no lo cubre ningún
combo.

**Clase de origen:** función de Postgres (D-39). **Requisito:** R-14, R-22. Cierra el
punto abierto 2 del modelo de datos.

---

## D-47 · Orden de las cuentas de la compra · 05/10

**Elegido:**
1. Precios: butacas (con preventa), productos y combos.
2. Canjes: la entrada o el producto canjeado van a $0.
3. **Un solo cupón**, el de mayor porcentaje entre los que aplican, sobre el subtotal.
   Bienvenida: el usuario no tiene compras pagadas previas. Mayor de 50: tiene más de 50
   años según su perfil.
4. Crédito, hasta cubrir el total.
5. El resto, con el medio de pago. Si no queda nada (el crédito y los canjes cubren
   todo), no se pide medio ni datos de tarjeta, y la compra queda con medio
   `sin_cargo`. Un check cruzado lo exige: `sin_cargo` solo si `total − credito_usado`
   es 0.

Los puntos generados son 1 por peso pagado con el medio de pago, no con crédito: el
crédito viene de una compra cancelada que ya los generó. El total nunca es negativo, y
la base lo exige con un check.

**Descartado:** que el cliente elija el cupón. Le pide una decisión que siempre tiene
la misma respuesta.

**Cómo lo explico en el oral:** primero cuánto vale lo que lleva, después lo que no
paga, después el descuento y al final con qué lo paga. La cuenta la hace la base; el front
solo muestra una vista previa.

**Lo que no se vio en clase (🟡):** el **candado por usuario**,
`pg_advisory_xact_lock(1, hashtext(id))`, el mismo recurso que el candado por sala de la
sección 9.3. Dos compras simultáneas del mismo usuario se hacen una después de la otra,
así que no pueden tomar las dos el cupón de bienvenida ni gastar dos veces los mismos
puntos o el mismo crédito. `hashtext` convierte el uuid en el número que pide el
candado. También aparecen `round`, `floor`, `left join`, `case` y `order by ... limit 1`,
explicados en el script.

**`Compras.total`:** es lo que cuesta la compra después del cupón. Lo cobrado con el
medio de pago es `total − credito_usado`.

**Clase de origen:** función de Postgres (D-39) + candado (9.3). **Requisito:** R-23,
R-24, R-27, R-30. Cierra el punto abierto 3 del modelo de datos.

---

## D-48 · La cancelación es una función de Postgres · 05/10

**Elegido:** `cancelar_compra(p_compra_id)` con `rpc()`. Solo el dueño, hasta 2 horas
antes de la función, si la entrada no se validó y si el candy no se retiró (si no, se
llevaría los productos y cobraría todo en crédito). Acredita lo que costó la compra (lo
pagado con el medio más el crédito usado) como crédito, devuelve los puntos canjeados,
descuenta los generados, borra sus butacas de `ButacasOcupadas` (Realtime libera el mapa)
y marca la compra como cancelada. Si el usuario ya gastó los puntos que le dio la
compra, la cancelación se rechaza con un mensaje.

**Descartado:** cancelar con un update desde Angular. Es el hueco del 01/10: con la
política "cliente cancela su compra", el cliente podía editar cualquier columna de su
compra. La política se borra en la sección 13.2, y el update queda solo para el
empleado, que marca las validaciones.

**Cómo lo explico en el oral:** cancelar mueve plata y puntos, así que tiene que ser todo
o nada, igual que comprar. Las entradas y el candy quedan como historial; lo que se borra
es la butaca ocupada, para que se pueda volver a vender.

**Clase de origen:** función de Postgres con `rpc()` (D-39) + candado (D-47).
**Requisito:** R-29, R-30.

---

## D-49 · El total del pago es una vista previa calculada en el front · 06/10

**Elegido:** `calcularResumen` (`services/compras.ts`) arma el resumen del pago en el
navegador, con el mismo orden de cuentas que `realizar_compra` (D-47): precios, canjes,
cupón, crédito y lo que queda a pagar. Se recalcula con cada cambio del pedido: un canje,
el crédito, una butaca. Lo que vale es lo que devuelve `realizar_compra` al confirmar,
y eso es lo que muestran la entrada y el PDF.

**Descartado:** pedirle la vista previa a la base en cada cambio. Son muchos pedidos para
algo que la base vuelve a calcular igual al confirmar.

**Cómo lo explico en el oral:** el front muestra, la base decide. Si alguien cambia el
precio desde la consola del navegador, cambia lo que ve, no lo que paga.

**Lo que cuesta:** las reglas de la cuenta quedan escritas dos veces, en SQL y en
TypeScript. Si cambia una, hay que cambiar la otra. `compras.spec.ts` prueba la vista
previa con los casos de D-46 y D-47.

**Clase de origen:** 3 (servicios) + 4 (formularios reactivos). **Requisito:** A-01.

---

## D-50 · Lectura de QR con html5-qrcode · 06/10

**Elegido:** `html5-qrcode`, con la clase `Html5Qrcode` sobre un `<div>` propio, sin la
interfaz que trae la librería. Se importa en un solo archivo, `services/escaner.ts`.

**Descartado:** `@zxing/browser`, porque necesita más armado (manejar el `<video>` y los
dispositivos) para el mismo resultado.

**Cómo lo explico en el oral:** leer un QR desde la cámara es procesar imágenes; eso lo
resuelve la librería. La carga manual sigue estando, porque el mail del 06/02 la pide.
La cámara solo funciona con HTTPS, y Vercel ya lo tiene.

**`::ng-deep` en el visor (07/10, 🟡 aprobado):** los estilos de un componente de Angular
están encapsulados: solo se aplican a los elementos que escribe su template. El `<video>` de
la cámara no está en el template de `empleado-validacion`: lo inserta `html5-qrcode` dentro
del `<div>` del lector, así que una regla común del `.css` del componente no le llega. Por
eso la regla del video usa `.visor ::ng-deep video`: `::ng-deep` deja pasar el estilo a ese
elemento, y `.visor` adelante lo limita al recuadro de esta pantalla, sin afectar a ningún
otro video de la app. La regla hace que el video ocupe todo el recuadro (`object-fit:
cover`), con `!important` para pisar el ancho en píxeles que la librería le escribe en el
atributo `style`. Sin ella, el video tomaba el ancho que medía el `<div>` al abrir la cámara;
con la cámara apagada ese ancho era 0 y en producción no se veía el visor.

**Clase de origen:** 🔴 librería justificada (cátedra 01/10, punto 3). **Requisito:** R-31, R-32.

---

## D-51 · La validación es una función de Postgres · 06/10

**Elegido:** `validar_compra(p_codigo, p_tipo)` con `rpc()`. Comprueba que la compra
exista, que no esté cancelada y que esa parte (entrada o candy) no se haya usado, y recién
ahí la marca. Se borra la política de `update` directo del empleado sobre `Compras`. El log
lo sigue escribiendo el servicio (D-14).

**Descartado:** un `update` desde Angular filtrando por las no validadas. Deja una ventana
entre leer y escribir, y el empleado podría editar cualquier columna de la compra.

**Cómo lo explico en el oral:** "un solo uso" lo garantiza la base. Si dos empleados escanean
el mismo QR a la vez, la fila queda bloqueada y el segundo recibe "ya se validó".

**Clase de origen:** función de Postgres con `rpc()` (D-39, D-48). **Requisito:** R-31 a R-33.

---

## D-52 · Alerta de Próximamente con notificaciones push · 06/10

**Elegido:** Web Push (clase 10). Al activar una alerta, si el usuario no tiene suscripción,
se le pide el permiso con `SwPush.requestSubscription` y la suscripción se guarda en
`SuscripcionesPush` con su `usuario_id` (RLS: cada uno lee, crea y borra la suya). La Edge
Function `enviar-alertas` busca las alertas no notificadas cuya venta ya abrió (7 días antes
del estreno con preventa, o el día del estreno sin ella, en hora argentina, según D-39),
manda el push solo a las suscripciones de esos usuarios y marca las alertas como
`notificada`. Supabase Cron la ejecuta una vez por día. Si el usuario no dio permiso, ve un
aviso al entrar a la app.

**Descartado:**
- Push disparado por un botón del admin: si se olvida de apretarlo, nadie se entera. Es el
  mismo problema por el que se descartó el estado manual en D-27.
- Solo el aviso dentro de la app: no usa la clase 10 y el cliente se entera recién cuando
  vuelve a entrar.

**Cómo lo explico en el oral:** la venta abre por una fecha, no por una acción, así que el
aviso lo dispara un reloj. Circuito: permiso → suscripción guardada → función programada →
notificación al celular. La clave VAPID privada vive solo en los secrets de Supabase.

**Lo que no se vio en clase (🟡):** Supabase Cron, que ejecuta la función todos los días a
la misma hora. En clase la función se invocaba a mano.

**Clase de origen:** 9 (PWA) + 10 (SwPush, Edge Functions) + Cron 🟡.
**Requisito:** R-10 (mail 08/03, cátedra 01/10 punto 4).

---

## D-53 · Excel con SheetJS · 06/10

**Elegido:** SheetJS (`json_to_sheet`, `book_new`, `book_append_sheet`, `writeFile`), instalado
desde el tarball oficial de cdn.sheetjs.com, porque la versión de npm está desactualizada. Se
importa solo en `services/exportaciones.ts`, junto con el PDF del reporte (jsPDF, D-37).

**Descartado:** un CSV armado a mano. Excel lo abre, pero el mail pide Excel, no un archivo
de texto.

**Cómo lo explico en el oral:** el formato `.xlsx` es un zip de XML; armarlo a mano no tiene
sentido. La librería convierte las filas del reporte en una hoja.

**Clase de origen:** 🔴 librería justificada. **Requisito:** R-36.

---

## D-54 · Gráficos con barras de CSS · 06/10

**Elegido:** barras hechas con `@for` y `[style.width.%]`, proporcionales al valor máximo.

**Descartado:** Chart.js. Es una dependencia y una configuración más para gráficos de barras
simples, y se aparta del estilo propio de la app (R-39).

**Cómo lo explico en el oral:** cada barra es un `div` cuyo ancho es su valor sobre el
máximo. Usa el bindeo de estilo de la clase 8.

**Clase de origen:** 2 (`@for`) + 8 (`[style]`). **Requisito:** R-37.

---

## D-55 · Los reportes se calculan en el front · 06/10

**Elegido:** `services/reportes.ts` trae Compras, Entradas, ItemsCandy y Funciones con
`select` y los filtros `.gte()` / `.lt()` (ya aprobados en D-29) y agrupa en TypeScript. El
admin tiene lectura por RLS (D-24). Las cuentas son funciones sueltas (`agruparFacturacion`,
`agruparMasVistas`, `agruparProductos`), probadas en `reportes.spec.ts`.

**Descartado:** vistas de Postgres por reporte. Son 🟡 aunque ya se usó una en D-31; con el
volumen del TP, agrupar en memoria alcanza, y cada cuenta se lee en un solo archivo.

**Cómo lo explico en el oral:** el admin puede leer las compras; el servicio filtra el rango
y agrupa por día, por semana o por producto.

**Lo que cuesta:** el filtro de fechas va sobre `Compras` (por `creado_en`) y sobre
`Funciones` (por `fecha_hora`). `Entradas` e `ItemsCandy` no tienen fecha: se piden por los
ids de las compras del rango, con `.in()` (D-57).

**Clase de origen:** 3 (servicios) + 6 (select con filtros). **Requisito:** R-35 a R-37.

---

## D-56 · Qué cuenta cada reporte · 06/10

**Elegido:**
- **Facturación por día:** lo cobrado con el medio de pago (`total − credito_usado`),
  agrupado por el día de la compra en hora argentina. Incluye las compras canceladas, porque
  la cancelación no devuelve dinero (R-30): la plata entró ese día. El crédito usado no
  cuenta, porque esa plata ya se facturó en la compra original.
- **Entradas vendidas por día:** entradas de compras no canceladas, por día de compra.
- **Compras (la tarjeta de totales y la columna de la tabla):** cuenta las compras no
  canceladas, con el mismo criterio que las entradas vendidas. En un rango con
  cancelaciones, "Facturado" incluye plata de compras que "Compras" no cuenta.
- **Películas más vistas por semana y por mes:** entradas de compras no canceladas cuya
  función ya ocurrió, agrupadas por la semana (lunes a domingo) o el mes de la función.
- **Producto más vendido:** suma de `cantidad` en `ItemsCandy` de compras no canceladas, sin
  contar los canjes (`es_canje`), porque un canje no es una venta. Los combos cuentan como
  un producto (D-40).

**Descartado:** restar de la facturación las compras canceladas. Mostraría menos plata de
la que entró, y el crédito que se acreditó se descuenta solo cuando se usa en otra compra.

**Cómo lo explico en el oral:** facturar es cobrar. Una compra cancelada se cobró y se
convirtió en crédito; cuando ese crédito paga otra compra, esa parte no se vuelve a contar.

**Clase de origen:** interpretación adoptada. **Requisito:** R-35 a R-37.

---

## D-57 · Filtro `.in()` y aviso por el límite de 1000 filas · 06/10

**Elegido:** en los reportes, `Entradas` e `ItemsCandy` se piden con
`.in('compra_id', ids)`, donde `ids` son los de las compras del rango. Las películas más
vistas hacen lo mismo en cadena: funciones del rango, entradas de esas funciones
(`.in('funcion_id', ids)`) y compras de esas entradas (`.in('id', ids)`). Si cualquier
consulta devuelve 1000 filas, la pantalla avisa: "El reporte puede estar incompleto: hay más
datos de los que se pueden traer de una vez".

**Lo que no se vio en clase (🟡):** `.in()` es un filtro de Supabase como `.eq()`, pero en
vez de comparar con un valor compara con una lista: "la columna es alguno de estos". Es el
`in (...)` de SQL.

**Por qué hace falta:** `Entradas` e `ItemsCandy` no tienen fecha; la fecha es la de su
compra. Sin `.in()` había que leer las dos tablas enteras para quedarse con una parte
(D-55).

**El límite de 1000 filas:** Supabase devuelve como máximo 1000 filas por consulta (es el
valor por defecto del proyecto) y no avisa cuando corta: trae las primeras 1000 y nada más.
Un reporte armado con datos cortados daría un total menor sin que nadie lo note. Por eso el
servicio mira el largo de cada respuesta y devuelve `incompleto` en true si alguna llegó a
1000.

**Descartado:**
- Seguir leyendo las tablas enteras: llega al límite mucho antes, porque cuenta todas las
  entradas del cine y no solo las del rango.
- Pedir de a páginas con `.range()` hasta traer todo: es otra cosa no vista, y para el
  volumen del TP alcanza con avisar.

**Lo que cuesta:** el aviso también aparece si hay exactamente 1000 filas y no falta
ninguna: no se puede distinguir. Y la lista de ids viaja en la dirección del pedido, así que
con muchísimas compras en el rango el pedido puede fallar por largo; en ese caso el reporte
muestra su error y hay que achicar el rango.

**Cómo lo explico en el oral:** primero traigo las compras del rango, y después las entradas
de esas compras. Si alguna respuesta llega al tope, aviso que el reporte puede estar
incompleto en lugar de mostrar un número que parece bueno.

**Clase de origen:** 6 (select con filtros) + `.in()` 🟡. **Requisito:** R-35 a R-37.
---

## D-58 · Qué cuenta como "vio la película" · 07/10

**Elegido:** el cliente vio una película si tiene una compra **no cancelada** de una función
que **ya ocurrió**. Es la misma regla que usa el reporte de películas más vistas (D-56), así
que Mis películas y los reportes cuentan lo mismo y `services/reportes.ts` no se toca.

**Descartado:** "vio la película" = entrada validada por un empleado. Es más exacto, pero
obliga a validar entradas para tener datos: sin pasar por el empleado, Mis películas queda
vacía.

**Cómo lo explico en el oral:** si compró y la función ya pasó, la vio. Cancelar devuelve
el crédito, así que una compra cancelada no cuenta.

**Clase de origen:** interpretación adoptada. **Requisito:** R-12.

---

## D-59 · Reseñas: una por película, sin autor visible · 07/10

**Elegido:** cualquier usuario logueado puede reseñar una película, una sola vez (la
`unique (usuario_id, pelicula_id)` de `Resenias`). La lista muestra estrellas, comentario y
fecha, **sin el autor**. Las reseñas no se editan ni se borran desde la app.

**Por qué sin autor:** el nombre vive en `Usuarios`, que no es de lectura pública (cada uno
lee la suya, el admin y el empleado las demás). Abrirla para mostrar nombres expondría datos
personales (fecha de nacimiento, tipo de sangre) o pediría una vista solo para eso.

**Descartado:**
- Exigir haber visto la película (D-58) para reseñar: ningún mail lo pide, y las reseñas
  se tienen que poder ver antes de comprar (mail 16/01).
- Editar y borrar la reseña propia: ningún mail lo pide.

**Lo que cuesta:** si alguien se equivoca, no puede corregir su reseña.

**Cómo lo explico en el oral:** la unicidad la garantiza la base. Si alguien intenta una
segunda reseña, Postgres devuelve el error 23505 (violación de unique) y la pantalla dice
"Ya dejaste tu reseña de esta película".

**Clase de origen:** 6 (insert, RLS). **Requisito:** R-08, R-09.

---

## D-60 · El empleado no rechaza entradas por la fecha · 07/10

**Elegido:** `validar_compra` rechaza una entrada ya usada o de una compra cancelada, pero
no una de otro día ni de otro horario. La tarjeta del resultado muestra la fecha y la hora
de la función para que el empleado lo controle.

**Por qué:** los mails piden un solo uso (R-33, mail 06/02: una vez validado, el QR deja de
funcionar), no un control de horario. Rechazar por fecha obliga a decidir con cuánto margen
antes y después de la función se acepta, y nadie lo pidió.

**Descartado:** rechazar fuera de una ventana alrededor de la función. Inventa una regla de
negocio.

**Cómo lo explico en el oral:** el sistema garantiza lo que pidió el cliente, que el QR
sirva una vez. Que la entrada sea de esa función lo decide la persona en la puerta, con la
fecha y la hora a la vista.

**Clase de origen:** interpretación adoptada. **Requisito:** R-31 a R-33.

---

## D-61 · Log paginado en Supabase con `.range()` · 07/10

**Elegido:** la pantalla del log pide de a **10 filas** con `.range(desde, hasta)` y
`select('*', { count: 'exact' })`, que además devuelve el total de filas para calcular
"Página X de Y". El filtro por acción va en la misma consulta con `.eq('accion', ...)`.

**Lo que no se vio en clase (🟡, aprobado):**
- `.range(desde, hasta)` es un filtro de Supabase como `.eq()`: pide las filas de la
  posición `desde` a la `hasta`, las dos incluidas, empezando en 0.
- `{ count: 'exact' }` es una opción del `select` que hace que Supabase cuente cuántas filas
  cumplen el filtro y lo devuelva en `count`, además de los datos.
- `.order('creado_en', { ascending: false })`, más `.order('id', ...)` para los empates:
  pide las filas ya ordenadas, de la más nueva a la más vieja. Lo exige `.range()`: sin un
  orden fijo, Postgres puede devolver las filas en cualquier orden y una misma fila podría
  aparecer en dos páginas. Se agregó al implementar; **queda para confirmar** en
  `docs/pendientes-revision.md`.

**Por qué:** el log crece con cada acción del admin y del empleado. Supabase devuelve como
máximo 1000 filas por consulta (D-57): traer todo y paginar en el front deja de funcionar,
sin aviso, cuando se pasan las 1000.

**Descartado:** traer todas las filas y paginar con un `slice` en el componente.

**Cómo lo explico en el oral:** la página 3 son las filas 20 a 29. Se las pido a Supabase y
me trae solo esas, con el total para saber cuántas páginas hay.

**Clase de origen:** 6 (select con filtros) + `.range()` y `count` 🟡. **Requisito:** R-38.

---

## D-62 · Nombres en pantalla: "Operaciones" y "Candy Shop" · 07/10

**Elegido:**
- **"Operaciones"** es la cantidad de pagos: cada compra cuenta una vez, lleve entradas,
  productos del Candy Shop o las dos cosas. Se usa en el admin, donde antes decía
  "Compras": la tarjeta de totales y la tabla por día de los reportes, el PDF y el Excel
  exportados. Debajo de la tarjeta, una aclaración en letra chica: "Cada pago; puede
  incluir entradas, Candy Shop o ambos".
- **"Candy Shop"** nombra los productos del cine: el menú y el ABM del admin, el título del
  reporte de más vendidos, el paso de la compra, el detalle de la compra (en Mi cuenta, en
  la entrada y en su PDF), la pestaña del empleado y los mensajes de la validación.

**Por qué:** en los reportes, "Compras" al lado de "Entradas" se leía como si fueran cosas
del mismo tipo, y una compra puede no tener productos del candy, o tener varias entradas.
"Operaciones" deja claro que se cuentan pagos. "Candy bar" y "candy" convivían en distintas
pantallas; "Candy Shop" es un solo nombre para la sección.

**Lo que no cambia:** en el código y en la base los nombres siguen igual (`compras`,
`candy`, `ItemsCandy`, `ProductosCandy`, `candy_entregado_en`, el tipo `'candy'` de
`validar_compra`). "Mis compras" del cliente tampoco cambia: ahí una compra es el pedido
completo, que es lo que el cliente entiende por compra. Los mensajes de `validar_compra`
están en la base: cambian con la sección 17 de `supabase/schema.sql`.

**Cómo lo explico en el oral:** son nombres para el usuario, no para el modelo. En la base
una compra es una compra; en el reporte del admin la muestro como "operación" porque lo que
cuenta ahí es cuántos pagos hubo.

**Clase de origen:** textos de la interfaz. **Requisito:** R-21, R-35, R-40.
