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
