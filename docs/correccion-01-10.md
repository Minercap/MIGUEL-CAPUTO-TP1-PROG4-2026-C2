# Corrección del 01/10 — Olympia Cinema

Notas de la reunión de seguimiento con la cátedra, el 01/10/2026, y los cambios que
surgen de ella. Este documento complementa `docs/requerimientos.md`.

---

## 1. Respuestas de la cátedra

| # | Consulta | Respuesta |
|---|---|---|
| 1 | Fecha de entrega | **Martes 06/10/2026, confirmada** |
| 2 | Librerías externas (QR, PDF, Excel, gráficos) | **Permitidas, cualquiera.** Cada una se justifica y se registra en `docs/decisiones.md` |
| 3 | Escaneo de QR | **Lectura real con la cámara**, con librería. La carga manual del código sigue siendo obligatoria (mail 06/02) |
| 4 | Alerta de Próximamente | **Cualquier opción, siempre que se justifique.** Se evalúa la defensa |
| 5 | Funciones, triggers y constraints de Postgres | **Permitidos** |
| 6 | Pago | **Simulado, pero bien hecho.** Ver punto 2.1 |
| 7 | Interpretaciones adoptadas (D-04, D-06) y mapa del cine pendiente | **Aprobadas** |
| 8 | Repo público o privado | **Cualquiera de los dos** |

---

## 2. Requisitos nuevos o aclarados por la cátedra

### 2.1 · Pago simulado (aclara R-20 a R-30)

No se integra ninguna pasarela real, pero el flujo tiene que estar completo:

- **Resumen detallado** de todo lo que se compra: cada entrada con fila, butaca y si es
  VIP; cada producto o combo del candy con cantidad y precio.
- **Descuentos visibles** cuando aplican: cupón, preventa, crédito y puntos, cada uno en
  su línea.
- **Varios medios de pago** para elegir.
- Al finalizar, se **descarga un PDF** a modo de ticket o factura con todo el detalle.

### 2.2 · Accesos rápidos en el login

Botones que **autocompletan** el formulario de login con las cuentas de prueba de
**admin, empleado y cliente**, para que la evaluación sea ágil.

> Las contraseñas de esas tres cuentas quedan visibles en el código del front. Es aceptable
> porque son cuentas de demostración, pero no tienen que coincidir con ninguna contraseña
> personal.

### 2.3 · Admin y empleado son roles separados (corrige D-12)

El admin **no** valida entradas ni entrega candy: lo hace solo el empleado. Coincide con el
mail del 06/02, que describe dos tipos de usuario distintos.

Hay que corregir:

- `es_empleado()` en SQL tiene que devolver verdadero **solo** para el rol `empleado`.
- Las políticas donde el admin necesita **leer** (por ejemplo, compras para los reportes)
  tienen que nombrarlo explícitamente con `es_admin()`.
- La validación (update de `Compras`) queda **solo** para el empleado.
- `empleadoGuard` deja pasar únicamente al empleado.
- El menú del admin no muestra "Validación".

---

## 3. Lo que no se respetó de los mails

### 3.1 · Fechas y horas sin calendario (R-41, mail 28/02)

El cliente rechazó expresamente el selector de calendario de la imagen adjunta, para
**fechas y horas**. Hoy se usa `input type="date"` en:

- el registro (fecha de nacimiento);
- el alta de película (fecha de estreno).

Hay que reemplazarlos, y las funciones (día y hora) tienen que nacer ya sin calendario.
La forma concreta se decide en **D-23**.

### 3.2 · Campos obligatorios de la película (R-04, mail 01/01)

"Toda película tiene una duración, una imagen, un nombre y una sinopsis." Las cuatro son
obligatorias:

- en el formulario: sinopsis y póster obligatorios en el alta;
- en la base: `sinopsis` e `imagen_url` pasan a `not null`.

### 3.3 · Validaciones de contenido

Se podía cargar un nombre con números, una fecha de nacimiento de 1700 o una película sin
sinopsis ni foto. Las reglas propuestas están en el punto 4.

Con las funciones y constraints de Postgres permitidas, las reglas críticas se validan **en
el formulario y también en la base**. El front se puede saltear desde la consola del
navegador; la base no.

---

## 4. Reglas de validación propuestas

> **Reemplazado por [`docs/validaciones.md`](validaciones.md).** Este punto queda como
> registro de lo que se propuso el 01/10; el estándar vigente es el otro documento.

### Registro

| Campo | Regla |
|---|---|
| Email | Obligatorio, formato de email |
| Contraseña | Obligatoria, mínimo 6 caracteres |
| Nombre | Obligatorio, 2 a 50 caracteres, solo letras (con acentos y ñ), espacios, apóstrofo y guion. No puede ser solo espacios |
| Apellido | Igual que nombre |
| Fecha de nacimiento | Obligatoria, fecha real (no 31/02), no futura, no más de 120 años atrás |
| Tipo de sangre | Obligatorio, de la lista |
| Color de ojos | Obligatorio, de la lista |
| Días de vacaciones | Obligatorio, entero, 0 a 60 *(a confirmar)* |

### Película

| Campo | Regla |
|---|---|
| Nombre | Obligatorio, 1 a 100 caracteres, no solo espacios |
| Sinopsis | **Obligatoria**, 20 a 1000 caracteres |
| Póster | **Obligatorio** en el alta. En la edición se conserva el actual si no se elige otro |
| Duración | Obligatoria, entera, 30 a 300 minutos |
| Géneros | Al menos uno |
| Restricción de edad | Obligatoria, de la lista (ninguna, 13, 18) |
| Fecha de estreno | Obligatoria, fecha real, ingresada sin calendario |
| Precio de preventa | Obligatorio y mayor a 0 solo si la preventa está habilitada |

### Reglas generales

- Ningún campo de texto acepta solo espacios.
- Mensaje de error debajo de cada campo, en castellano, al tocarlo.
- Botón de envío deshabilitado mientras el formulario sea inválido.
- Las reglas de rango y obligatoriedad se repiten como constraints `check` en la base.

---

## 5. Decisiones pendientes

| Id | Tema | Cuándo |
|---|---|---|
| D-23 | Cómo se ingresan fechas y horas sin calendario | 02/10, antes de codear |
| D-24 | Separación de admin y empleado en SQL, guards y menú | 02/10, mecánica |
| — | Dónde vive el precio: hoy está en cada función y no en la película. Defenderlo o cambiarlo | 02/10, antes de funciones |
| — | Alerta de Próximamente: aviso en la app, mail u otra opción | Bloque cliente |
| — | Librerías concretas para QR (generar y leer), PDF, Excel y gráficos | Cada una en su bloque |
