# Requerimientos — Olympia Cinema

**TP 1 · Programación IV · 2026 C2**
Documento de requerimientos v1 · 22/09/2026

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

Datos que se piden al registrarse, tal como los enumeró el cliente:

mail, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos y cantidad de
días de vacaciones por año.

> El cliente los describió como "nada muy invasivo". Se implementan todos tal cual.

### R-02 · Compra anónima

Se puede comprar sin cuenta, indicando un mail al que llega la entrada. El comprador
anónimo no acumula puntos, no usa crédito y no accede al cupón de bienvenida.

### R-03 · Perfil del cliente

El cliente ve en su perfil sus datos, sus puntos acumulados, el historial de canjes y su
crédito disponible.

---

## 3. Películas y cartelera

### R-04 · Datos de la película

Nombre, sinopsis, imagen, duración, uno o **varios** géneros, restricción de edad, formato
y idioma.

- **Restricción de edad:** 18 años, 13 años o sin restricción.
- **Formato:** 2D, 3D, 4D o 5D.
- **Idioma:** castellano o subtitulada.

### R-05 · Control de cartelera

El administrador decide qué películas aparecen al entrar a la página, y en qué horarios
está cada una.

### R-06 · Orden de la página principal

Las **3 películas más vendidas** se muestran primero.

### R-07 · Buscador

El listado de películas incluye un buscador con **filtro por género**, contemplando que una
película puede tener varios.

### R-08 · Reseñas

Cada persona puede calificar una película con estrellas y dejar un comentario corto. Las
reseñas se pueden ver **antes** de sacar la entrada.

### R-09 · Puntuación promedio

Se muestra el promedio de calificación de cada película.

### R-10 · Próximamente

Sección con las películas que se estrenan en las próximas semanas. El usuario puede
activar una alerta para ser notificado cuando las entradas de esa película estén
disponibles para la venta.

### R-11 · Preventa

La venta puede abrirse **7 días antes del estreno** con un precio especial de preventa.
Pasada la fecha de preventa, el precio vuelve al normal. Es configurable película por
película.

### R-12 · Mis películas

Historial visual de todo lo que el cliente vio, con pósters, fechas y su propia
calificación.

---

## 4. Salas, butacas y funciones

### R-13 · Distribución de la sala

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

Las últimas 3 filas de cada sala (**R, S y T**) son VIP: tienen un precio más alto y se
marcan visualmente distinto en el mapa. El usuario debe saber claramente que está
comprando una butaca VIP **antes de pagar**.

### R-15 · Butacas accesibles

Las butacas de las filas J y K se resaltan visualmente de forma diferente en el mapa.

### R-16 · Mapa de butacas en tiempo real

Mientras un usuario selecciona butacas, ve cuáles ya están ocupadas por otra compra **en
ese mismo momento**.

### R-17 · Asignación automática de sala

El administrador define película, días y horario (por ejemplo, lunes, martes y viernes a
las 18 hs) y **el sistema asigna la sala automáticamente**, eligiendo una que no tenga otra
función proyectándose en ese horario.

### R-18 · Sin superposición

Bajo ningún concepto dos funciones pueden estar en la misma sala al mismo tiempo.

### R-19 · Separación de 30 minutos

No puede haber una función antes de que pasen **30 minutos** desde que terminó la función
anterior en esa sala. La duración de la película es el dato que determina el fin de la
función.

---

## 5. Compra

### R-20 · Entrada con QR y PDF

La compra genera un **PDF** con los datos de la entrada y el **QR** que el cliente presenta
para ver la película.

### R-21 · Candy bar

El administrador crea los productos del candy bar (pochoclos, bebidas, etc.) y los organiza
en **categorías**. El cliente los compra junto con la entrada, y los retira con **el mismo
QR** de la entrada.

### R-22 · Combos

Combos especiales de entrada + pochoclos + bebida a un precio fijo configurable por el
administrador. Aparecen **destacados** en la página de compra.

### R-23 · Cupón de bienvenida

El cliente que se registra recibe un cupón de descuento para su primera compra. El
porcentaje es **configurable** por el administrador.

### R-24 · Cupones por edad

El administrador puede crear cupones que apliquen solo a usuarios de **más de 50 años**.

> **Interpretación adoptada (D-05).** El mail del 01/01 fija el cupón de bienvenida en 20%;
> el del 30/01 pide poder cambiar ese porcentaje cuando quiera y además crear cupones por
> edad. Se adopta un **modelo único de cupón** con porcentaje y condición de aplicación
> ("primera compra" o "mayor de 50 años"). El cupón de bienvenida nace con 20% como valor
> inicial, editable desde el panel. El mail posterior pisa al anterior.

### R-25 · Restricción de edad en la compra

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

Toda entrada comprada para una película con restricción de edad debe aclarar que **debe ir
un adulto**.

### R-27 · Programa de puntos

Cada compra de un usuario registrado acumula **1 punto por cada peso gastado**. Los puntos
no se pueden transferir entre usuarios.

### R-28 · Canje de puntos

Los puntos se canjean por entradas gratis o productos del candy bar. El administrador
configura cuántos puntos cuesta cada recompensa (por ejemplo, una entrada 500 puntos, un
pochoclo grande 150).

### R-29 · Cancelación

El cliente puede cancelar una compra hasta **2 horas antes** de la función.

### R-30 · Crédito

La cancelación **no devuelve dinero**: acredita el monto como crédito en la cuenta del
usuario. El crédito se ve en el perfil y se puede usar junto con otros métodos de pago.

---

## 6. Validación por empleados

### R-31 · Validación por QR

Los empleados escanean el QR para validar las entradas, tanto del cine como del candy bar.

### R-32 · Carga manual del código

Se puede ingresar el código a mano, por si el lector no funciona ese día.

### R-33 · Un solo uso

Una vez que una entrada se valida o se entrega la comida, **el QR deja de funcionar**.

---

## 7. Administración y reportes

### R-34 · Panel de administración

El administrador controla salas, funciones, distribución de butacas, películas, productos,
combos, cupones y recompensas.

### R-35 · Reporte de facturación

Cuánto se facturó **por día** y cuántas entradas se vendieron.

### R-36 · Exportación

El reporte de facturación se exporta a **PDF** y a **Excel**.

### R-37 · Gráficos

- Películas más vistas **por semana** y **por mes**.
- Producto del candy bar que más se vende.

### R-38 · Log de actividad

Queda registrado, con **fecha y hora**, quién creó qué función, quién modificó un precio y
quién validó un QR.

---

## 8. Requisitos transversales

### R-39 · Estilo visual único y producido

Exigido por la consigna. CSS propio, sin apariencia de plantilla.

### R-40 · Interfaces fáciles de navegar

Tanto para clientes como para empleados.

### R-41 · Carga de fechas y horas

El cliente rechazó expresamente el selector de calendario con scroll de la imagen adjunta
al mail del 28/02. La carga de fechas **y horas** debe ser rápida y sin scroll extenso.

---

## 9. Pendiente de aprobación (no se construye)

### P-01 · Mapa del cine

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

El detalle de cada una, con las opciones descartadas, está en `docs/decisiones.md`.
