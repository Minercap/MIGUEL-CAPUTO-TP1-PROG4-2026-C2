# Modelo de datos — Olympia Cinema

**TP 1 · Programación IV · 2026 C2**
v1 · 21/09/2026

Modelo derivado de `docs/requerimientos.md`. Cada tabla indica qué requisitos cubre.

Convenciones: nombres de tabla en plural con mayúscula inicial, campos en minúscula con
guión bajo, y `id` como clave primaria salvo donde se indique.

---

## 1. Usuarios y acceso

### `Usuarios`

Perfil del usuario registrado. El `id` es el mismo uuid que genera Supabase Auth, tal
como se hace en la clase 7.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | = uuid de auth |
| `email` | text | |
| `nombre` | text | |
| `apellido` | text | |
| `fecha_nacimiento` | date | Base del control de edad (R-25) |
| `tipo_sangre` | text | |
| `color_ojos` | text | |
| `dias_vacaciones` | int | |
| `rol` | text | `admin`, `empleado` o `cliente` |
| `puntos` | int | Saldo actual (R-27) |
| `credito` | numeric | Saldo por cancelaciones (R-30) |
| `creado_en` | timestamptz | |

Cubre R-01, R-03, R-27, R-30 y los roles del punto 2 del documento.

> `puntos` y `credito` son saldos, no historial. El historial de canjes vive en `Canjes` y
> el de crédito se reconstruye desde las compras canceladas.

---

## 2. Películas

### `Peliculas`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `nombre` | text | |
| `sinopsis` | text | |
| `imagen_url` | text | Storage, clase 7 |
| `duracion_minutos` | int | Define el fin de la función (R-19) |
| `restriccion_edad` | int | `18`, `13` o nulo |
| `fecha_estreno` | date | |
| `en_cartelera` | bool | R-05 |
| `proximamente` | bool | R-10 |
| `preventa_habilitada` | bool | R-11 |
| `precio_preventa` | numeric | R-11 |
| `creado_en` | timestamptz | |

### `Generos`

| Campo | Tipo |
|---|---|
| `id` | int |
| `nombre` | text |

### `PeliculasGeneros`

Relación muchos a muchos: una película tiene varios géneros (R-07).

| Campo | Tipo |
|---|---|
| `pelicula_id` | int |
| `genero_id` | int |

Cubre R-04, R-05, R-07, R-10, R-11.

> El formato (2D a 5D) y el idioma **no** están en `Peliculas` sino en `Funciones`. La misma
> película puede proyectarse en 3D subtitulada a las 18 y en 2D castellano a las 21.

---

## 3. Salas y funciones

### `Salas`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `nombre` | text | "Sala 1" |
| `activa` | bool | |

No guarda la distribución de butacas: la forma es fija para todas las salas (R-13) y vive
como constante en el front, según la decisión D-07.

### `Funciones`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `pelicula_id` | int | |
| `sala_id` | int | Asignada automáticamente (R-17) |
| `fecha_hora` | timestamptz | Inicio |
| `formato` | text | `2D`, `3D`, `4D`, `5D` |
| `idioma` | text | `castellano` o `subtitulada` |
| `precio_base` | numeric | Butaca normal |
| `precio_vip` | numeric | Butacas R, S y T (R-14) |
| `creado_en` | timestamptz | |

Cubre R-04 (formato e idioma), R-14, R-17, R-18, R-19.

> El fin de la función es `fecha_hora + duracion_minutos`. La validación de los 30 minutos
> y de la no superposición compara contra ese cálculo en las funciones existentes de la
> misma sala.

---

## 4. Compra

Según D-08, la compra tiene dos tipos de ítem en tablas separadas.

### `Compras`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `usuario_id` | uuid | Nulo si es anónima (R-02) |
| `email` | text | Siempre presente, también en anónimas |
| `fecha_nacimiento_declarada` | date | Solo en anónimas con restricción (R-25) |
| `codigo` | text | Único. Formato `OLY-XXXX-XXXX` (D-09) |
| `total` | numeric | |
| `cupon_id` | int | Nulo si no aplicó (R-23, R-24) |
| `descuento_aplicado` | numeric | Monto, no porcentaje |
| `credito_usado` | numeric | R-30 |
| `puntos_generados` | int | R-27 |
| `estado` | text | `pagada` o `cancelada` |
| `entrada_validada_en` | timestamptz | R-33 |
| `entrada_validada_por` | uuid | Empleado |
| `candy_entregado_en` | timestamptz | R-33 |
| `candy_entregado_por` | uuid | Empleado |
| `creado_en` | timestamptz | |

Cubre R-02, R-20, R-23 a R-25, R-27, R-29 a R-33.

> Las dos marcas de validación son independientes, según D-09: validar la entrada en la
> puerta no inhabilita el retiro del candy.

### `Entradas`

Una fila por butaca vendida. No existen filas para butacas libres (D-07).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `compra_id` | int | |
| `funcion_id` | int | |
| `fila` | char(1) | `A` a `T` |
| `numero` | int | Posición dentro de la fila |
| `es_vip` | bool | Derivado de la fila, guardado para el precio histórico |
| `precio` | numeric | Precio al momento de la compra |

Cubre R-13 a R-16, R-20.

> `es_vip` y `precio` se guardan aunque sean derivables: si el admin cambia el precio de la
> función después, la entrada ya vendida tiene que conservar lo que se cobró.

### `CategoriasCandy`

| Campo | Tipo |
|---|---|
| `id` | int |
| `nombre` | text |

### `ProductosCandy`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `categoria_id` | int | R-21 |
| `nombre` | text | |
| `precio` | numeric | |
| `imagen_url` | text | |
| `activo` | bool | |

### `Combos`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `nombre` | text | |
| `precio` | numeric | Precio fijo configurable (R-22) |
| `incluye_entrada` | bool | |
| `activo` | bool | |

### `CombosProductos`

Qué productos del candy trae cada combo.

| Campo | Tipo |
|---|---|
| `combo_id` | int |
| `producto_id` | int |
| `cantidad` | int |

### `ItemsCandy`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `compra_id` | int | |
| `producto_id` | int | Nulo si es combo |
| `combo_id` | int | Nulo si es producto suelto |
| `cantidad` | int | |
| `precio_unitario` | numeric | Histórico |

Cubre R-21, R-22.

---

## 5. Beneficios

### `Cupones`

Modelo único según D-05.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `nombre` | text | |
| `porcentaje` | int | Configurable (R-23) |
| `condicion` | text | `primera_compra` o `mayor_50` |
| `activo` | bool | |

Cubre R-23, R-24.

> El cupón de bienvenida se carga como un registro con `condicion = primera_compra` y
> `porcentaje = 20`. El admin lo edita; no hay ningún 20 escrito en el código.

### `Recompensas`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `tipo` | text | `entrada` o `producto` |
| `producto_id` | int | Nulo si es entrada |
| `costo_puntos` | int | Configurable (R-28) |
| `activa` | bool | |

### `Canjes`

Historial de canjes que el usuario ve en su perfil (R-03, R-28).

| Campo | Tipo |
|---|---|
| `id` | int |
| `usuario_id` | uuid |
| `recompensa_id` | int |
| `puntos_gastados` | int |
| `creado_en` | timestamptz |

---

## 6. Interacción del cliente

### `Resenias`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `usuario_id` | uuid | |
| `pelicula_id` | int | |
| `estrellas` | int | 1 a 5 |
| `comentario` | text | Corto (R-08) |
| `creado_en` | timestamptz | |

Cubre R-08, R-09, R-12.

> El promedio de R-09 se calcula sobre esta tabla. No se guarda como campo en `Peliculas`
> para no tener que mantenerlo sincronizado.

### `Alertas`

Avisos de Próximamente (R-10).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `usuario_id` | uuid | |
| `pelicula_id` | int | |
| `notificada` | bool | |
| `creado_en` | timestamptz | |

---

## 7. Auditoría

### `LogActividad`

Nace con la primera tabla, no al final (regla del plan).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | |
| `usuario_id` | uuid | Quién |
| `accion` | text | `crear`, `modificar`, `eliminar`, `validar` |
| `entidad` | text | `Funciones`, `ProductosCandy`, etc. |
| `entidad_id` | text | |
| `detalle` | text | Qué cambió |
| `creado_en` | timestamptz | Fecha y hora (R-38) |

Cubre R-38.

---

## 8. Cómo se resuelven los requisitos derivados

Estos no tienen tabla propia: salen de consultas.

| Requisito | De dónde sale |
|---|---|
| R-06 · 3 más vendidas | Conteo de `Entradas` agrupado por película |
| R-09 · Promedio | Promedio de `estrellas` en `Resenias` |
| R-12 · Mis películas | `Compras` del usuario con entrada validada, cruzado con `Resenias` |
| R-16 · Butacas ocupadas | `Entradas` de la función, con Realtime escuchando `INSERT` |
| R-35 · Facturación por día | `Compras` pagadas agrupadas por fecha |
| R-37 · Más vistas por semana y mes | `Entradas` agrupadas por período |
| R-37 · Producto más vendido | `ItemsCandy` agrupado por producto |

---

## 9. Resumen

19 tablas:

`Usuarios`, `Peliculas`, `Generos`, `PeliculasGeneros`, `Salas`, `Funciones`, `Compras`,
`Entradas`, `CategoriasCandy`, `ProductosCandy`, `Combos`, `CombosProductos`, `ItemsCandy`,
`Cupones`, `Recompensas`, `Canjes`, `Resenias`, `Alertas`, `LogActividad`.

---

## 10. Puntos abiertos

Se deciden cuando llegue su bloque, no antes.

1. **Constraint `unique` sobre `Entradas`** (`funcion_id`, `fila`, `numero`), para impedir
   que dos compras simultáneas tomen la misma butaca. Es 🟡. Se decide en el bloque de
   compra, el 01/10.
2. **Combos con entrada.** Si un combo incluye entrada, hay que definir cómo se elige la
   butaca y cómo se reparte el precio fijo entre la entrada y el candy. Se decide en el
   bloque de compra.
3. **Orden de aplicación de descuentos.** Cupón, puntos y crédito pueden concurrir en una
   misma compra; falta definir en qué orden se aplican. Se decide en el bloque de compra.
