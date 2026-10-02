# Validaciones — Olympia Cinema

Estándar de validación de todos los formularios de la aplicación: los que ya existen y los
que vienen. Reemplaza el punto 4 de `docs/correccion-01-10.md`.

Cada regla marcada **(a decidir)** espera la confirmación de Miguel.

---

## 1. Principios

Basados en las guías de validación de entrada de OWASP y, para contraseñas, en NIST SP 800-63B.

1. **Lista de lo permitido, no de lo prohibido.** Cada campo define qué caracteres acepta;
   todo lo demás se rechaza.
2. **Todo texto tiene mínimo y máximo de largo.** Sin excepciones.
3. **Todo número y toda fecha tienen rango.** Mínimo y máximo, y si es entero o decimal.
4. **Los campos de lista aceptan solo los valores ofrecidos.** Un `select` se valida contra
   sus opciones, no se da por bueno porque "viene de un desplegable".
5. **Validación de sintaxis y de sentido.** Sintaxis: la forma del dato (una fecha válida).
   Sentido: que tenga lógica en el negocio (la fecha de nacimiento no es futura, el precio
   VIP es mayor que el normal).
6. **Primero se normaliza, después se valida.** Se recortan espacios al principio y al final
   (`trim`) y los mails se pasan a minúsculas. Un campo con solo espacios es un campo vacío.
7. **Doble capa: formulario y base.** El formulario guía al usuario; la base es la que
   protege, porque el formulario se puede saltear desde la consola del navegador. Las reglas
   de largo, rango y obligatoriedad se repiten como `check` y `not null` en Postgres, y los
   permisos ya los cubre RLS.
8. **Nada se muestra como HTML.** Angular escapa todo lo que va en `{{ }}`. Nunca se usa
   `[innerHTML]` con texto ingresado por un usuario (reseñas, nombres).
9. **Errores claros, en castellano, por campo.** Aparecen al tocar el campo, dicen qué está
   mal y cómo corregirlo. El botón de envío queda deshabilitado mientras haya errores, y se
   bloquea mientras se está enviando para evitar dobles envíos.
10. **Los textos largos muestran el máximo.** Atributo `maxlength` en el input, y contador de
    caracteres en las áreas de texto (sinopsis, comentario de reseña).

---

## 2. Patrones reutilizables

| Nombre | Regla | Uso |
|---|---|---|
| `textoPersona` | Letras de cualquier idioma (con acentos, ñ, ü), espacios simples, apóstrofo y guion. Empieza y termina con letra | Nombre, apellido, titular de tarjeta |
| `textoLibre` | Cualquier carácter imprimible, sin saltos de línea salvo en áreas de texto. No solo espacios | Nombres de película, producto, combo, sala |
| `email` | Formato de mail, máximo 254 caracteres (límite de RFC 5321), en minúsculas | Registro, login, compra anónima |
| `precio` | Decimal con hasta 2 decimales, mayor a 0, hasta 1.000.000 | Precios de función, producto, combo, preventa |
| `entero(min, max)` | Número entero dentro del rango | Duración, cantidades, puntos |
| `fecha` | Tres desplegables (D-23), fecha real (rechaza 31/02) y rango propio de cada campo | Nacimiento, estreno, funciones |
| `codigoCompra` | `OLY-XXXX-XXXX`, letras mayúsculas y números. Se normaliza a mayúsculas antes de validar | Validación por empleado |
| `imagen` | Tipo `image/jpeg`, `image/png` o `image/webp`. Máximo 2 MB **(a decidir)** | Pósters, productos |

---

## 3. Por formulario

### 3.1 Registro y edición de perfil

| Campo | Reglas |
|---|---|
| Email | Obligatorio · `email` · único (lo controla Supabase Auth) |
| Contraseña | Obligatoria · **8 a 72 caracteres** · sin reglas de composición (no se exige mayúscula ni símbolo) |
| Confirmar contraseña | Obligatoria · igual a la contraseña |
| Nombre | Obligatorio · `textoPersona` · 2 a 50 caracteres |
| Apellido | Obligatorio · `textoPersona` · 2 a 50 caracteres |
| Fecha de nacimiento | Obligatoria · `fecha` · no futura · no más de 120 años atrás |
| Tipo de sangre | Obligatorio · uno de A+, A−, B+, B−, AB+, AB−, 0+, 0− |
| Color de ojos | Obligatorio · uno de la lista |
| Días de vacaciones | Obligatorio · `entero(0, 60)` **(a decidir el máximo)** |

Sobre la contraseña: NIST pide un mínimo de 8 caracteres, recomienda no imponer reglas de
composición y pide aceptar al menos 64. El tope de 72 es el que admite Supabase Auth. El
mínimo de 8 se configura también en Supabase (Authentication → configuración de
contraseñas), para que valga del lado del servidor.

### 3.2 Login

| Campo | Reglas |
|---|---|
| Email | Obligatorio · `email` |
| Contraseña | Obligatoria · máximo 72 |

El login no repite la regla de mínimo de largo: si la contraseña es incorrecta, el mensaje
es siempre el mismo ("El mail o la contraseña no son correctos"), sin indicar cuál de los
dos falló.

### 3.3 Película

| Campo | Reglas |
|---|---|
| Nombre | Obligatorio · `textoLibre` · 1 a 100 |
| Sinopsis | **Obligatoria** (mail 01/01) · 20 a 1000 · contador de caracteres |
| Póster | **Obligatorio** en el alta (mail 01/01) · `imagen` · en la edición se conserva el actual |
| Duración | Obligatoria · `entero(30, 300)` minutos |
| Géneros | Al menos 1 · como máximo 4 |
| Restricción de edad | Obligatoria · ninguna, 13 o 18 |
| Fecha de estreno | Obligatoria · `fecha` · entre 1 año atrás y 1 año adelante. El rango se exige en el alta; en la edición, solo si se cambió la fecha (D-26) |
| En cartelera / Próximamente | No pueden estar las dos marcadas a la vez, salvo que la película esté en preventa **(a decidir con la cartelera)** |
| Preventa habilitada | Solo si la fecha de estreno es futura. Se exige al habilitarla; si la película ya la tenía habilitada, la edición no la bloquea (D-26) |
| Precio de preventa | Obligatorio si hay preventa · `precio` |

### 3.4 Sala

| Campo | Reglas |
|---|---|
| Nombre | Obligatorio · `textoLibre` · 2 a 30 · único |

### 3.5 Función

| Campo | Reglas |
|---|---|
| Película | Obligatoria · de las que están en cartelera o en preventa |
| Días de la semana | Al menos 1 (mail 06/02: "lunes, martes y viernes a las 18hs") |
| Desde / hasta | Obligatorias · `fecha` · desde no anterior a hoy · hasta no anterior a desde · rango máximo de 60 días **(a decidir)** |
| Hora | Obligatoria · dos desplegables: hora y minutos de 15 en 15 (D-23) · horario de 10:00 a 23:45 **(a decidir)** |
| Formato | Obligatorio · 2D, 3D, 4D o 5D |
| Idioma | Obligatorio · castellano o subtitulada |
| Precio base | Obligatorio · `precio` |
| Precio VIP | Obligatorio · `precio` · **mayor que el precio base** (mail 10/03) |
| Sala | No se elige: la asigna el sistema (R-17) |
| Superposición y 30 minutos | Regla de negocio: se controla al asignar la sala y se protege también en la base (R-18, R-19) |

### 3.6 Candy: categoría, producto y combo

| Formulario | Campo | Reglas |
|---|---|---|
| Categoría | Nombre | Obligatorio · `textoLibre` · 2 a 40 · único |
| Producto | Nombre | Obligatorio · `textoLibre` · 2 a 60 |
| | Categoría | Obligatoria · de las existentes |
| | Precio | Obligatorio · `precio` |
| | Imagen | Opcional · `imagen` |
| Combo | Nombre | Obligatorio · `textoLibre` · 2 a 60 |
| | Productos | Al menos 1 · cantidad por producto `entero(1, 10)` · sin productos repetidos |
| | Incluye entrada | Sí o no |
| | Precio fijo | Obligatorio · `precio` |

### 3.7 Cupón

| Campo | Reglas |
|---|---|
| Nombre | Obligatorio · `textoLibre` · 3 a 40 |
| Porcentaje | Obligatorio · `entero(1, 100)` |
| Condición | Obligatoria · primera compra o mayor de 50 |
| Activo | Solo puede haber **un** cupón de primera compra activo a la vez |

### 3.8 Recompensa de puntos

| Campo | Reglas |
|---|---|
| Tipo | Obligatorio · entrada o producto |
| Producto | Obligatorio si el tipo es producto |
| Costo en puntos | Obligatorio · `entero(1, 100000)` |

### 3.9 Reseña

| Campo | Reglas |
|---|---|
| Estrellas | Obligatorias · `entero(1, 5)` |
| Comentario | Opcional · 0 a 280 caracteres ("comentario corto", mail 16/01) · contador |
| Unicidad | Una reseña por usuario y película (ya está en la base) |

### 3.10 Compra

| Campo | Reglas |
|---|---|
| Butacas | Al menos 1 · como máximo 10 por compra **(a decidir)** · solo butacas libres |
| Productos y combos | Cantidad `entero(1, 10)` por ítem |
| Email (anónima) | Obligatorio · `email` |
| Fecha de nacimiento (anónima) | Obligatoria solo si la función tiene restricción · `fecha` · edad igual o mayor a la restricción (D-06) |
| Edad (registrada) | Se calcula de su perfil · igual o mayor a la restricción |
| Cupón | Solo si cumple su condición: primera compra del usuario, o mayor de 50 años |
| Puntos a usar | `entero(0, saldo)` |
| Crédito a usar | Entre 0 y el menor de: saldo de crédito y total a pagar |
| Total | Nunca negativo. Se recalcula siempre a partir de los precios de la base, no del front |

### 3.11 Pago simulado

| Campo | Reglas |
|---|---|
| Medio de pago | Obligatorio · de la lista |
| Titular | Obligatorio · `textoPersona` · 2 a 50 |
| Número de tarjeta | Obligatorio · 13 a 19 dígitos · algoritmo de Luhn |
| Vencimiento | Obligatorio · mes y año en desplegables · no vencida |
| Código de seguridad | Obligatorio · 3 o 4 dígitos |

Los datos de tarjeta **no se guardan en ningún lado**: se validan en el formulario y se
descartan. En la base solo queda el medio de pago elegido.

### 3.12 Validación por empleado

| Campo | Reglas |
|---|---|
| Código | Obligatorio · `codigoCompra` · se normaliza a mayúsculas y sin espacios |
| Qué se valida | Entrada o candy, según la pantalla · rechaza si ya fue usado o si la compra está cancelada |

### 3.13 Búsqueda y reportes

| Campo | Reglas |
|---|---|
| Texto del buscador | Opcional · máximo 100 · `trim` |
| Rango de fechas del reporte | `fecha` · desde no posterior a hasta |

---

## 4. En la base

Reglas que se repiten como constraints en Postgres:

- `not null` en todos los campos obligatorios.
- `check` de largo en todos los textos (`char_length(trim(x)) between ...`), lo que además
  impide los textos que son solo espacios.
- `check` de rango en números y fechas.
- `check` cruzados dentro de la misma fila: precio VIP mayor que el base, precio de preventa
  presente si hay preventa.
- `unique` donde corresponde: nombre de sala, de categoría, de género; reseña por usuario y
  película; butaca por función (bloque de compra).

Las reglas que dependen de otras filas (superposición de funciones, un solo cupón de
bienvenida activo, saldo de puntos) no se pueden expresar con un `check`: se resuelven con
constraints específicas o funciones de Postgres en su bloque.
