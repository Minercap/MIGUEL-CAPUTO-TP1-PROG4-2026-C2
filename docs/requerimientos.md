# Requerimientos — Olympia Cinema

**TP 1 · Programación IV · 2026 C2**
**Versión final · 07/10/2026** (primera versión: 20/09/2026)

**Estado:** todos los requisitos (R-01 a R-41) y las aclaraciones de la cátedra (A-01 a
A-03) están hechos. Cada uno dice debajo de su título dónde está. El mapa del cine (P-01)
queda pendiente de aprobación del cliente.

Este documento resume todo lo pedido por el cliente en el intercambio de diez mails de la
consigna. Cada requisito tiene un identificador (`R-nn`) que se usa como referencia en los
commits y en `docs/decisiones.md`.

Donde dos mails se contradicen, el documento indica la **interpretación adoptada** y el
motivo. Donde el cliente pidió algo expresamente no aprobado, queda registrado como
**pendiente** y no se construye.

---

## 1. Alcance general

Aplicación web para un cine de un solo edificio con varias salas, que permite:

- a los **clientes**, ver la cartelera, reseñar películas, comprar entradas y productos del
  candy bar, y recibir una entrada con QR;
- a los **empleados**, validar esas entradas y las retiradas del candy bar;
- al **administrador**, gestionar películas, salas, funciones, productos, combos, cupones,
  recompensas y reportes.

La aplicación se entrega desplegada, como PWA, con código en GitHub y README con la
arquitectura y las decisiones técnicas.

---

## 2. Usuarios y roles

| Rol | Qué puede hacer |
|---|---|
| **Administrador** | Gestiona salas, funciones, distribución de butacas, películas, productos, combos, cupones, recompensas. Ve los reportes y el log de actividad |
| **Empleado** | Valida entradas del cine y retiros del candy bar, por QR o por código cargado a mano |
| **Cliente registrado** | Compra, reseña, acumula y canjea puntos, usa crédito y cupones, ve su perfil y su historial |
| **Comprador anónimo** | Compra sin cuenta. No acumula puntos ni accede a beneficios de registrado |

### R-01 · Registro de clientes

**Estado final:** Hecho · `pages/registro/`, `services/auth.ts`.

Datos que se piden al registrarse, tal como los enumeró el cliente:

mail, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos y cantidad de
días de vacaciones por año.


### R-02 · Compra anónima

**Estado final:** Hecho · `pages/compra/`, `components/pago/`, `realizar_compra` en `supabase/schema.sql`.

Se puede comprar sin cuenta, indicando un mail al que llega la entrada. El comprador
anónimo no acumula puntos, no usa crédito y no accede al cupón de bienvenida.

> **Interpretación adoptada (D-39).** La entrada se genera en PDF al terminar la compra
> (mail 01/01: "les genere el pdf"). El mail identifica al comprador anónimo; no se envían
> correos.

### R-03 · Perfil del cliente

**Estado final:** Hecho · `pages/mi-cuenta/`: puntos, crédito, historial de canjes y compras. De los datos personales muestra nombre y apellido.

El cliente ve en su perfil sus datos, sus puntos acumulados, el historial de canjes y su
crédito disponible.

---

## 3. Películas y cartelera

### R-04 · Datos de la película

**Estado final:** Hecho · `pages/admin-pelicula-formulario/`; obligatorios también en la base (`schema.sql`, sección 7).

Nombre, sinopsis, imagen, duración, uno o **varios** géneros, restricción de edad, formato
y idioma.

- **Obligatorias:** duración, imagen, nombre y sinopsis. El mail del 01/01 lo dice textual:
  "Toda película tiene una duración, una imagen, un nombre y una sinopsis". No se puede
  guardar una película a la que le falte alguna de las cuatro, ni desde el formulario ni
  directo contra la base.
- **Restricción de edad:** 18 años, 13 años o sin restricción.
- **Formato:** 2D, 3D, 4D o 5D.
- **Idioma:** castellano o subtitulada.

### R-05 · Control de cartelera

**Estado final:** Hecho · `pages/admin-peliculas/` (columna `visible`), `pages/cartelera/`, pipe `estadoPelicula` (D-27).

El administrador decide qué películas aparecen al entrar a la página, y en qué horarios
está cada una.

### R-06 · Orden de la página principal

**Estado final:** Hecho · `pages/cartelera/`, `services/cartelera.ts`, vista `PeliculasMasVendidas` (D-31).

Las **3 películas más vendidas** se muestran primero.

> **Interpretación adoptada (D-31).** Solo cuentan las películas que hoy están en cartelera.
> Se mide en entradas vendidas, sin contar las de compras canceladas. Si hay menos de 3
> películas con ventas, la lista se completa con los estrenos más recientes en cartelera.

### R-07 · Buscador

**Estado final:** Hecho · `pages/cartelera/` (`filtrar()`, D-32).

El listado de películas incluye un buscador con **filtro por género**, contemplando que una
película puede tener varios.

> **Interpretación adoptada (D-32).** Con varios géneros elegidos en el filtro, la película
> tiene que tenerlos todos.

### R-08 · Reseñas

**Estado final:** Hecho · `pages/detalle-pelicula/`, `services/resenias.ts` (D-59).

Cada persona puede calificar una película con estrellas y dejar un comentario corto. Las
reseñas se pueden ver **antes** de sacar la entrada.

### R-09 · Puntuación promedio

**Estado final:** Hecho · promedio en `pages/detalle-pelicula/` y en las tarjetas de `pages/cartelera/`, pipe `estrellas`.

Se muestra el promedio de calificación de cada película.

### R-10 · Próximamente

**Estado final:** Hecho · sección Próximamente en `pages/cartelera/`, alerta en `pages/detalle-pelicula/`, `services/alertas.ts`, `services/notificaciones.ts`, `supabase/functions/enviar-alertas/` (D-52).

Sección con las películas que se estrenan en las próximas semanas. El usuario puede
activar una alerta para ser notificado cuando las entradas de esa película estén
disponibles para la venta.

### R-11 · Preventa

**Estado final:** Hecho · `pages/admin-pelicula-formulario/`, `ventaAbierta()` y `precioDe()` en `services/compras.ts`, `realizar_compra`.

La venta puede abrirse **7 días antes del estreno** con un precio especial de preventa.
Pasada la fecha de preventa, el precio vuelve al normal. Es configurable película por
película.

> **Interpretación adoptada (D-39).** La venta de una película abre 7 días antes del estreno
> si tiene la preventa habilitada, y el día del estreno si no, en hora argentina. Mientras
> dura la preventa (hasta el día anterior al estreno), las butacas comunes y las accesibles
> se cobran al precio de preventa; las VIP mantienen su precio VIP.

### R-12 · Mis películas

**Estado final:** Hecho · `pages/mis-peliculas/`, `services/mis-peliculas.ts` (D-58).

Historial visual de todo lo que el cliente vio, con pósters, fechas y su propia
calificación.

---

## 4. Salas, butacas y funciones

### R-13 · Distribución de la sala

**Estado final:** Hecho · `armarSala()` en `services/compras.ts`, mapa en `pages/compra/` (D-04, D-07).

Todas las salas tienen la misma forma: **20 filas** identificadas con letras (A a T) y
**3 columnas** de 4, 20 y 4 butacas, es decir 28 butacas por fila.

Las filas **J y K** son accesibles y tienen una distribución distinta: 2, 10 y 2 butacas,
es decir 14 por fila.

**Total: 532 butacas por sala.**

> **Interpretación adoptada (D-04).** El mail del 12/02 dice que las dos filas del medio
> se quitaron "para dar espacio a *una* fila de butacas para personas con discapacidad",
> pero en el párrafo siguiente se refiere a "las butacas accesibles (**filas J y K**
> adaptadas)". Se adopta la segunda lectura: J y K siguen existiendo como dos filas
> accesibles de 14 butacas cada una. Es la única interpretación que mantiene consistentes
> los tres mails a la vez: las 20 filas del 01/01, el resaltado de "filas J y K" del 12/02
> y las butacas VIP en R, S y T del 10/03. Eliminar una letra correría las demás y las VIP
> dejarían de ser R, S y T.

### R-14 · Butacas VIP

**Estado final:** Hecho · `pages/compra/` (marca VIP en el mapa y en el resumen), `precioDe()` en `services/compras.ts`.

Las últimas 3 filas de cada sala (**R, S y T**) son VIP: tienen un precio más alto y se
marcan visualmente distinto en el mapa. El usuario debe saber claramente que está
comprando una butaca VIP **antes de pagar**.

> **Interpretación adoptada (D-39).** Las butacas accesibles (filas J y K) valen lo mismo
> que las comunes: el precio base de la función.

### R-15 · Butacas accesibles

**Estado final:** Hecho · `pages/compra/`.

Las butacas de las filas J y K se resaltan visualmente de forma diferente en el mapa.

### R-16 · Mapa de butacas en tiempo real

**Estado final:** Hecho · Realtime en `services/compras.ts`, tabla `ButacasOcupadas` (D-38).

Mientras un usuario selecciona butacas, ve cuáles ya están ocupadas por otra compra **en
ese mismo momento**.

### R-17 · Asignación automática de sala

**Estado final:** Hecho · `pages/admin-funcion-formulario/`, `services/funciones.ts` (D-29, D-30).

El administrador define película, días y horario (por ejemplo, lunes, martes y viernes a
las 18 hs) y **el sistema asigna la sala automáticamente**, eligiendo una que no tenga otra
función proyectándose en ese horario.

### R-18 · Sin superposición

**Estado final:** Hecho · `services/funciones.ts` y trigger `funciones_sin_superposicion` en `schema.sql` (D-29).

Bajo ningún concepto dos funciones pueden estar en la misma sala al mismo tiempo.

### R-19 · Separación de 30 minutos

**Estado final:** Hecho · mismo trigger y `services/funciones.ts`, con la duración de la película (D-29).

No puede haber una función antes de que pasen **30 minutos** desde que terminó la función
anterior en esa sala. La duración de la película es el dato que determina el fin de la
función.

---

## 5. Compra

### R-20 · Entrada con QR y PDF

**Estado final:** Hecho · `components/entrada/`, `services/tickets.ts` (D-36, D-37). También desde Mis compras en `pages/mi-cuenta/`.

La compra genera un **PDF** con los datos de la entrada y el **QR** que el cliente presenta
para ver la película.

### R-21 · Candy bar

**Estado final:** Hecho · `pages/admin-productos/`, `pages/admin-producto-formulario/`, `components/candy/`; retiro con el mismo QR en `pages/empleado-validacion/`.

El administrador crea los productos del candy bar (pochoclos, bebidas, etc.) y los organiza
en **categorías**. El cliente los compra junto con la entrada, y los retira con **el mismo
QR** de la entrada.

### R-22 · Combos

**Estado final:** Hecho · combos en `pages/admin-producto-formulario/`, destacados en `components/candy/` (D-40, D-46).

Combos especiales de entrada + pochoclos + bebida a un precio fijo configurable por el
administrador. Aparecen **destacados** en la página de compra.

### R-23 · Cupón de bienvenida

**Estado final:** Hecho · `pages/admin-cupones/`, `realizar_compra` (D-05, D-41).

El cliente que se registra recibe un cupón de descuento para su primera compra. El
porcentaje es **configurable** por el administrador.

### R-24 · Cupones por edad

**Estado final:** Hecho · `pages/admin-cupones/`, `realizar_compra` (D-05, D-41).

El administrador puede crear cupones que apliquen solo a usuarios de **más de 50 años**.

> **Interpretación adoptada (D-05).** El mail del 01/01 fija el cupón de bienvenida en 20%;
> el del 30/01 pide poder cambiar ese porcentaje cuando quiera y además crear cupones por
> edad. Se adopta un **modelo único de cupón** con porcentaje y condición de aplicación
> ("primera compra" o "mayor de 50 años"). El cupón de bienvenida nace con 20% como valor
> inicial, editable desde el panel. El mail posterior pisa al anterior.

> **Interpretación adoptada (D-41).** El cupón de bienvenida es de **un solo uso**: aplica
> si el usuario no tiene compras pagadas previas. El cupón para mayores de 50 es
> **reutilizable**: aplica cada vez que el usuario tenga más de 50 años, mientras el cupón
> esté activo. Las dos cosas se deducen en la compra; no se guardan.

### R-25 · Restricción de edad en la compra

**Estado final:** Hecho · `components/pago/` y `realizar_compra` (D-06).

A los usuarios menores de 18 o de 13 años no se les permite comprar entradas para las
películas con esa restricción.

En la compra **anónima**, cuando la función tiene restricción de edad, se solicita la fecha
de nacimiento del comprador y se valida contra ella.

> **Interpretación adoptada (D-06).** El mail del 01/01 habilita la compra anónima y el del
> 12/02 exige control de edad. Sin cuenta no hay fecha de nacimiento registrada, así que se
> adopta la **declaración de fecha de nacimiento en el formulario de compra** cuando la
> función lo requiere. Es declarativo y no verificable, pero cumple los dos requisitos sin
> recortar ninguno; exigir cuenta para esas funciones habría eliminado la compra anónima
> que el cliente pidió expresamente.

### R-26 · Aviso de acompañante adulto

**Estado final:** Hecho · `pages/compra/`, `components/entrada/`, `services/tickets.ts` (`LEYENDA_ADULTO`).

Toda entrada comprada para una película con restricción de edad debe aclarar que **debe ir
un adulto**.

> **Interpretación adoptada (D-39).** Toda entrada de una película con restricción lleva la
> leyenda "Debe asistir acompañado por un adulto" (mail 12/02), en la pantalla y en el PDF.

### R-27 · Programa de puntos

**Estado final:** Hecho · `realizar_compra` (D-47).

Cada compra de un usuario registrado acumula **1 punto por cada peso gastado**. Los puntos
no se pueden transferir entre usuarios.

### R-28 · Canje de puntos

**Estado final:** Hecho · `pages/admin-recompensas/`, canje en `components/pago/` (D-42, D-45).

Los puntos se canjean por entradas gratis o productos del candy bar. El administrador
configura cuántos puntos cuesta cada recompensa (por ejemplo, una entrada 500 puntos, un
pochoclo grande 150).

### R-29 · Cancelación

**Estado final:** Hecho · `pages/mi-cuenta/`, `cancelar_compra` en `schema.sql` (D-48).

El cliente puede cancelar una compra hasta **2 horas antes** de la función.

### R-30 · Crédito

**Estado final:** Hecho · `cancelar_compra`; saldo en `pages/mi-cuenta/`, uso en `components/pago/` (D-47, D-48).

La cancelación **no devuelve dinero**: acredita el monto como crédito en la cuenta del
usuario. El crédito se ve en el perfil y se puede usar junto con otros métodos de pago.

---

## 6. Validación por empleados

### R-31 · Validación por QR

**Estado final:** Hecho · `pages/empleado-validacion/`, `services/escaner.ts` (D-50).

Los empleados escanean el QR para validar las entradas, tanto del cine como del candy bar.

### R-32 · Carga manual del código

**Estado final:** Hecho · `pages/empleado-validacion/`, `services/validacion.ts`.

Se puede ingresar el código a mano, por si el lector no funciona ese día.

### R-33 · Un solo uso

**Estado final:** Hecho · `validar_compra` en `schema.sql` (D-51, D-60).

Una vez que una entrada se valida o se entrega la comida, **el QR deja de funcionar**.

---

## 7. Administración y reportes

### R-34 · Panel de administración

**Estado final:** Hecho · `pages/admin/` y las pantallas `pages/admin-*`.

El administrador controla salas, funciones, distribución de butacas, películas, productos,
combos, cupones y recompensas.

### R-35 · Reporte de facturación

**Estado final:** Hecho · `pages/admin-reportes/`, `services/reportes.ts` (D-55, D-56). La
cantidad de pagos se muestra como "Operaciones" (D-62).

Cuánto se facturó **por día** y cuántas entradas se vendieron.

### R-36 · Exportación

**Estado final:** Hecho · `services/exportaciones.ts` (D-37, D-53).

El reporte de facturación se exporta a **PDF** y a **Excel**.

### R-37 · Gráficos

**Estado final:** Hecho · `components/grafico-barras/`, `pages/admin-reportes/` (D-54, D-56).

- Películas más vistas **por semana** y **por mes**.
- Producto del candy bar que más se vende.

### R-38 · Log de actividad

**Estado final:** Hecho · registro en `services/log-actividad.ts`; pantalla en `pages/admin-log/` (D-14, D-61).

Queda registrado, con **fecha y hora**, quién creó qué función, quién modificó un precio y
quién validó un QR.

---

## 8. Requisitos transversales

### R-39 · Estilo visual único y producido

**Estado final:** Hecho · `src/styles.css` y el CSS de cada componente, sin librerías de UI (D-33).

Exigido por la consigna. CSS propio, sin apariencia de plantilla.

### R-40 · Interfaces fáciles de navegar

**Estado final:** Hecho · menú por rol en `app.html`, panel del admin con accesos, pantalla del empleado en una sola vista.

Tanto para clientes como para empleados.

### R-41 · Carga de fechas y horas

**Estado final:** Hecho · `components/campo-fecha/` para fechas y desplegables de hora en `pages/admin-funcion-formulario/` (D-23).

El cliente rechazó expresamente el selector de calendario con scroll de la imagen adjunta
al mail del 28/02. La carga de fechas **y horas** debe ser rápida y sin scroll extenso.

---

## 9. Pendiente de aprobación (no se construye)

### P-01 · Mapa del cine

**Estado final:** **Pendiente de aprobación del cliente.** No se construye.

El cliente planteó una pantalla con un mapa de todo el cine indicando en qué sala es la
función de la entrada comprada, pero en el mismo mail del 30/01 aclaró que **no tenían luz
verde aún**.

No se construye. Queda documentado a la espera de aprobación del cliente. El modelo de
datos contempla la sala de cada función, así que la funcionalidad podría agregarse más
adelante sin cambios estructurales.

---

## 10. Trazabilidad mail por mail

| Mail | Requisitos que introduce |
|---|---|
| 01/01 | R-01, R-02, R-04, R-05, R-13, R-19, R-20, R-23 |
| 16/01 (1) | R-06, R-07, R-08, R-09 |
| 16/01 (2) | R-07 (filtro por género, varios géneros por película) |
| 30/01 | R-21, R-23, R-24 · **P-01** |
| 06/02 | R-17, R-18, R-31, R-32, R-33, R-34 |
| 12/02 | R-13, R-15, R-16, R-25, R-26 |
| 28/02 | R-35, R-40, R-41 |
| 03/03 | R-22, R-27, R-28, R-03 |
| 08/03 | R-10, R-11, R-12 |
| 10/03 | R-14, R-29, R-30, R-36, R-37, R-38 |

---

## 11. Interpretaciones adoptadas

| Id | Tema | Interpretación |
|---|---|---|
| D-04 | Filas J y K | Dos filas accesibles de 14 butacas. 532 butacas por sala |
| D-05 | Cupones | Modelo único con porcentaje configurable y condición de aplicación |
| D-06 | Edad en compra anónima | Declaración de fecha de nacimiento en el formulario cuando la función lo exige |
| D-31 | Más vendidas | Solo películas en cartelera, por entradas de compras no canceladas. Con menos de 3, se completa con los estrenos más recientes |
| D-32 | Filtro de géneros | Con varios géneros elegidos, la película tiene que tenerlos todos |
| D-39 | Leyenda del adulto | Toda entrada de una película con restricción lleva la leyenda "Debe asistir acompañado por un adulto" |
| D-39 | Venta y preventa | Abre 7 días antes del estreno con preventa, o el día del estreno sin ella. En preventa, comunes y accesibles a precio de preventa; VIP a precio VIP |
| D-39 | Butacas accesibles | Al precio base |
| D-39 | Entrada de la compra anónima | Se genera en PDF al terminar la compra. El mail identifica al comprador; no se envían correos |
| D-40 | Combos | Un combo es un producto del candy con la lista de lo que trae; puede incluir entrada. Los destacados de la compra son los combos |
| D-41 | Uso de cupones | El de bienvenida, si no hay compras pagadas previas; el de mayores de 50, en cada compra de un mayor de 50 |
| D-42 | Recompensas | Una entrada o un producto del candy, con su costo en puntos |
| D-45 | Canje de puntos | Se canjean en el paso de pago de una compra: la entrada gratis es una butaca a $0 y el producto, ese producto a $0 |
| D-46 | Combos con entrada | Cada combo con entrada cubre una de las butacas elegidas, que va a $0. Si es VIP, se cobra la diferencia VIP. Igual con la entrada gratis por puntos |
| D-47 | Orden del total | Precios, canjes, un solo cupón (el de mayor porcentaje), crédito y el resto con el medio de pago. Los puntos se generan por lo pagado con el medio. Si no queda nada para pagar, no se pide medio de pago |
| D-48 | Cancelación | Hasta 2 horas antes, sin la entrada validada y sin el candy retirado. Acredita el total como crédito, devuelve los puntos canjeados y descuenta los generados |
| D-52 | Alerta de Próximamente | Notificación push el día que abre la venta, enviada por una Edge Function programada; aviso en la app para quien no dio permiso |
| D-56 | Facturación por día | Lo cobrado con el medio de pago (total − crédito usado), por día de compra en hora argentina. Incluye las compras canceladas: la cancelación da crédito, no devuelve dinero |
| D-56 | Entradas vendidas por día | Entradas de compras no canceladas, por día de compra |
| D-56 | Compras del reporte | Compras no canceladas, igual que las entradas vendidas |
| D-56 | Películas más vistas | Entradas de compras no canceladas cuya función ya ocurrió, por semana (lunes a domingo) o mes de la función |
| D-56 | Producto más vendido | Suma de cantidades en compras no canceladas, sin los canjes. Un combo cuenta como un producto |
| D-58 | Vio la película | Compra no cancelada con la función ya ocurrida, igual que las más vistas (D-56) |
| D-59 | Reseñas | Cualquier usuario logueado, una por película, sin autor visible. No se editan ni se borran |
| D-60 | Validación y fecha | El empleado no rechaza por la fecha: un solo uso. La tarjeta muestra fecha y hora de la función |
| D-61 | Log de actividad | Paginado en Supabase de a 10 filas, con `.range()` y el total con `count: 'exact'` |
| D-62 | Nombres en pantalla | "Operaciones" es la cantidad de pagos en los reportes del admin; "Candy Shop" nombra los productos del cine. En el código y la base los nombres no cambian |
| D-14 | Log de actividad | Lo escribe cada servicio después de una acción que salió bien: altas, ediciones y bajas del admin, validaciones del empleado y reseñas |
| D-23 | Fechas y horas sin calendario | Tres desplegables (día, mes, año) y desplegables de hora y minutos |
| D-24 | Admin y empleado | Roles separados: el admin no valida entradas ni entrega candy |
| D-27 | Cartelera y Próximamente | El admin decide si la película es visible; en qué sección aparece lo dice la fecha de estreno |
| D-28 | Precio de la entrada | Lo fija cada función (base y VIP); la entrada guarda lo que se cobró |
| D-29 | Asignación de sala | Primera sala libre con 30 minutos de margen; un trigger de la base impide la superposición |
| D-30 | Funciones recurrentes | Días de la semana, rango de fechas y hora; una función por fecha, todas o ninguna |
| D-35 | Hora de las funciones | Siempre en hora argentina, sin importar la zona del navegador |
| D-43 | Cupón de bienvenida | Un solo cupón de primera compra activo a la vez |
| D-51 | Un solo uso del QR | La validación es una función de la base: marca la entrada o el candy una sola vez |
| R-02 | Comprador anónimo | Sin cupón, sin crédito y sin puntos |

El detalle de cada una, con las opciones descartadas, está en `docs/decisiones.md`.

---

## 12. Aclaraciones de la cátedra (01/10)

Surgen de la reunión de seguimiento del 01/10/2026. No son pedidos nuevos del cliente:
precisan cómo se cumplen requisitos que ya estaban. Las notas completas de la reunión están
en `docs/correccion-01-10.md`.

### A-01 · Pago simulado (aclara R-20 a R-30)

**Estado final:** Hecho · `components/pago/`, `components/resumen-compra/`, `services/tickets.ts`.

No se integra ninguna pasarela real, pero el flujo de pago tiene que estar completo:

- **Resumen detallado** de todo lo que se compra: cada entrada con su fila, su butaca y si
  es VIP; cada producto o combo del candy bar con su cantidad y su precio.
- **Descuentos visibles** cuando aplican, cada uno en su línea: cupón, preventa, crédito y
  puntos.
- **Varios medios de pago** para elegir.
- Al finalizar se **descarga un PDF**, a modo de ticket o factura, con todo ese detalle.

### A-02 · Accesos rápidos en el login

**Estado final:** Hecho · `pages/login/`.

Debajo del formulario de login hay tres botones, **Admin**, **Empleado** y **Cliente**, que
**autocompletan** el mail y la contraseña de la cuenta de prueba de cada rol, sin enviar el
formulario. Son para agilizar la evaluación.

Las contraseñas de esas tres cuentas quedan visibles en el código del front. Es aceptable
porque son cuentas de demostración, y no coinciden con ninguna contraseña personal.

### A-03 · Admin y empleado son roles separados (aclara R-31 a R-34)

**Estado final:** Hecho · `es_empleado()` en `schema.sql`, `guards/empleado-guard.ts`, menú en `app.html` (D-24).

El administrador **no** valida entradas ni entrega candy: eso lo hace solo el empleado.
Coincide con el mail del 06/02, que describe dos tipos de usuario distintos. El
administrador conserva la lectura de las compras, porque la necesita para los reportes
(R-35 a R-37). El detalle está en la decisión D-24.
