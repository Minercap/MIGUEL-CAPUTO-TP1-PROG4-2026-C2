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
cambia es dónde se cuelga (🟡: en clase se usó sobre un control).

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
de `id` más alto. Usa solo lo visto, pero son dos pedidos y, si dos administradores crean
a la vez, puede tomar el `id` de la película del otro.

**Clase de origen:** 6 (CRUD). **Requisitos:** R-07 y R-38.
