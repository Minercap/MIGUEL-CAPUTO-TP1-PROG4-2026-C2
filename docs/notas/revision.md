# Revisión de la sección 13 de `schema.sql` (antes de correrla)

Rama `feat/compra-2`. Las secciones 13.3 y 13.4 están copiadas tal como quedaron en
`supabase/schema.sql`.

## Cambios pedidos y aplicados

1. **Comentario de `hashtext`:** explica que convierte el uuid en el número que pide el
   candado, y que una colisión solo hace esperar una compra, sin mezclar datos.
2. **`sin_cargo`:**
   - En `realizar_compra`, el medio de pago se controla en el paso 10, cuando ya se sabe
     cuánto queda por pagar. Si es 0, se guarda `sin_cargo` y se ignora lo que mande el
     navegador. Si queda algo, tiene que ser uno de los tres medios.
   - En 13.1 se borra el check viejo de `medio_pago`. En la 11.1 se escribió sin nombre,
     así que Postgres lo nombró `Compras_medio_pago_check`. Se crean dos nuevos:
     `compras_medio_pago_lista` (suma `sin_cargo`) y `compras_sin_cargo_sin_saldo` (check
     cruzado: `sin_cargo` solo si `total − credito_usado = 0`).
   - Si ese nombre no existe, el `drop … if exists` no avisa y el check viejo seguiría
     rechazando `sin_cargo`. Hay una consulta comentada a `pg_constraint` para verificarlo.
   - El JSON que devuelve la función suma `medio_pago`.
3. **Descartados:** los de D-45 a D-48 son los tuyos. D-47 suma `sin_cargo` y D-48 suma
   el candy retirado. `requerimientos.md` y `modelo-datos.md` están actualizados.
4. **`cancelar_compra`** también rechaza si el candy ya se retiró.
5. **Errores P0001:** se muestran con el mensaje de la base, como en `services/compras.ts`.

## Tres detalles para mirar

- **Cancelar una compra pagada con crédito** acredita el total completo: lo pagado con el
  medio más el crédito usado. Equivale a devolver el crédito que se usó.
- **Si el admin desactiva un producto** que un cliente ya puso en el carrito, la compra se
  rechaza entera con "Alguno de los productos elegidos ya no está disponible.". No hay
  compra parcial.
- **Si el cliente no tiene puntos suficientes** para devolver los que generó la compra,
  `cancelar_compra` la rechaza aunque esté dentro del plazo. El mensaje dice cuántos
  puntos generó la compra.

## Cómo correrla

1. En el SQL Editor de Supabase, pegar **solo la sección 13** de `supabase/schema.sql`,
   desde `-- 13. COMPRA COMPLETA` hasta antes de `PUNTOS ABIERTOS`.
2. El primer `select` (conteo de `ItemsCandy` y `Canjes`) tiene que dar 0 en las dos.
3. Las pruebas de la 13.5 están comentadas. Cada una va de `begin` a `rollback`, así que
   no dejan nada guardado.

## 13.3 `realizar_compra`

```sql
-- ---------- 13.3 realizar_compra completa (D-45, D-46, D-47) ----------
-- Reemplaza a la de la 11.4. Suma tres parámetros al final, con valor por
-- defecto (default): si no se mandan, valen lista vacía y 0. Así la
-- pantalla de compra que ya está publicada sigue andando con la función
-- nueva hasta que se publique la nueva versión del front.
--
--   p_candy    los productos y combos, cada uno con su cantidad:
--              [{"producto_id": 4, "cantidad": 2}, {"producto_id": 9, "cantidad": 1}]
--   p_canjes   las recompensas que canjea, una por elemento (si canjea
--              dos veces la misma, viene dos veces):
--              [{"recompensa_id": 1}, {"recompensa_id": 3}]
--   p_credito  cuánto crédito quiere usar. Solo con sesión.
--
-- p_medio_pago se usa solo si queda algo para cobrar. Si el crédito y los
-- canjes cubren todo, la compra queda con medio 'sin_cargo' (D-47).
--
-- Orden de las cuentas (D-47):
--   1. Precios: butacas (con preventa), productos y combos.
--   2. Canjes: la entrada gratis o el producto canjeado van a $0.
--   3. Un solo cupón, el de mayor porcentaje entre los que aplican, sobre
--      el subtotal.
--   4. Crédito, hasta cubrir el total.
--   5. El resto, con el medio de pago, o 'sin_cargo' si no queda nada.
--      Los puntos generados son 1 por peso pagado con el medio, no con
--      crédito (R-27).
--
-- Qué butaca cubre cada entrada incluida (D-46): las butacas se cubren
-- en el orden en que vienen en p_butacas. Primero las de los combos con
-- entrada, después las de las entradas gratis. El front sigue la misma
-- regla para mostrarlo antes de pagar.
--
-- Candado por usuario: dos compras simultáneas del mismo usuario no se
-- ven entre sí mientras se guardan. Sin el candado, las dos podrían
-- tomar el cupón de bienvenida (D-41) o gastar los mismos puntos y el
-- mismo crédito. Es el mismo recurso que el candado por sala del trigger
-- de superposición (9.3), con dos diferencias:
--   - pg_advisory_xact_lock(1, x) usa dos números en lugar de uno. Los
--     candados de dos números son otro espacio que los de uno: así el
--     candado del usuario nunca se confunde con el de una sala que tenga
--     el mismo número. El 1 es "compras de un usuario".
--   - El candado se identifica con números, y el id del usuario es un
--     uuid (texto). hashtext(texto) lo convierte en un número entero:
--     siempre el mismo número para el mismo texto, así las dos compras
--     del mismo usuario piden el mismo candado.
--     Hay muchos más uuid posibles que números, así que dos usuarios
--     distintos podrían caer, muy de vez en cuando, en el mismo número
--     (una "colisión"). No rompe nada: la compra de uno espera a que
--     termine la del otro, una fracción de segundo, y después sigue. Los
--     datos no se mezclan, porque cada compra lee y escribe solo las
--     filas de su usuario. El candado solo decide quién espera.
--
-- SQL que aparece acá por primera vez:
--   default             valor de un parámetro cuando no se lo manda.
--   round(x, 2)         redondea a dos decimales (el descuento del cupón).
--   floor(x)            el entero de abajo: los puntos son por peso entero.
--   hashtext(x)         ver el candado, arriba.
--   left join           como join, pero la fila de la izquierda aparece
--                       aunque no tenga pareja (una recompensa de entrada
--                       no tiene producto).
--   order by ... limit 1  ordena y se queda con la primera fila (el cupón
--                       de mayor porcentaje).
--   case when ... end   un if adentro de una expresión.
--   sum(x), min(x)      suma y mínimo de una columna (en cancelar_compra).
--
-- Devuelve todo lo que necesitan la pantalla de confirmación y el PDF:
--   { "codigo", "email", "requiere_adulto", "en_preventa",
--     "entradas": [{"fila", "numero", "es_vip", "precio", "cubierta_por"}],
--     "candy":    [{"producto_id", "nombre", "cantidad", "precio_unitario",
--                   "es_combo", "incluye_entrada", "es_canje"}],
--     "canjes":   [{"recompensa_id", "nombre", "tipo", "puntos"}],
--     "subtotal", "cupon": {"nombre", "porcentaje"} o null, "descuento",
--     "total", "credito_usado", "a_pagar", "medio_pago", "puntos_usados",
--     "puntos_generados" }

-- La función vieja tiene cinco parámetros y la nueva ocho. Para Postgres
-- son dos funciones distintas (mismo motivo que en la 11.4): se borra la
-- vieja para que no queden las dos.
drop function if exists public.realizar_compra(bigint, jsonb, text, text, date);

create or replace function public.realizar_compra(
  p_funcion_id        bigint,
  p_butacas           jsonb,
  p_email             text,
  p_medio_pago        text,
  p_fecha_nacimiento  date,
  p_candy             jsonb   default '[]'::jsonb,
  p_canjes            jsonb   default '[]'::jsonb,
  p_credito           numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- La función y su película
  v_pelicula_id     bigint;
  v_fecha_hora      timestamptz;
  v_precio_base     numeric(12,2);
  v_precio_vip      numeric(12,2);
  v_visible         boolean;
  v_restriccion     int;
  v_estreno         date;
  v_preventa        boolean;
  v_precio_preventa numeric(12,2);

  -- Fechas, en hora argentina
  v_hoy             date;
  v_inicio_venta    date;
  v_en_preventa     boolean;

  -- El comprador
  v_usuario         uuid;
  v_nacimiento      date;   -- la del perfil o la declarada: con la que se calcula la edad
  v_declarada       date;   -- lo que se guarda en fecha_nacimiento_declarada
  v_edad            int;
  v_email           text;
  v_saldo_puntos    int := 0;
  v_saldo_credito   numeric(12,2) := 0;

  -- Las butacas
  v_cantidad        int;
  v_butaca          jsonb;
  v_fila            text;
  v_numero          int;
  v_es_vip          boolean;
  v_precio          numeric(12,2);
  v_butacas         jsonb := '[]'::jsonb;  -- las validadas, todavía sin precio
  v_posicion        int;
  v_cubierta        text;
  v_entradas        jsonb := '[]'::jsonb;

  -- El candy
  v_item            jsonb;
  v_producto_id     bigint;
  v_unidades        int;
  v_nombre          text;
  v_precio_producto numeric(12,2);
  v_es_combo        boolean;
  v_con_entrada     boolean;
  v_activo          boolean;
  v_candy           jsonb := '[]'::jsonb;
  v_cubre_combo     int := 0;   -- butacas que cubren los combos con entrada

  -- Los canjes
  v_recompensa_id   bigint;
  v_tipo            text;
  v_costo           int;
  v_canjes          jsonb := '[]'::jsonb;
  v_cubre_canje     int := 0;   -- butacas que cubren las entradas gratis
  v_puntos_usados   int := 0;

  -- La cuenta (D-47)
  v_subtotal        numeric(12,2) := 0;
  v_cupon_id        bigint;
  v_cupon_nombre    text;
  v_cupon_pct       int;
  v_descuento       numeric(12,2) := 0;
  v_total           numeric(12,2);
  v_credito_usado   numeric(12,2) := 0;
  v_a_pagar         numeric(12,2);
  v_medio_pago      text;
  v_puntos_generados int := 0;

  -- La compra
  v_codigo          text;
  v_compra_id       bigint;
begin
  -- ----- 1. La función existe y todavía no empezó -----
  select f.pelicula_id, f.fecha_hora, f.precio_base, f.precio_vip
    into v_pelicula_id, v_fecha_hora, v_precio_base, v_precio_vip
  from public."Funciones" f
  where f.id = p_funcion_id;

  if not found then
    raise exception 'La función no existe.';
  end if;

  if v_fecha_hora <= now() then
    raise exception 'La función ya empezó: no se pueden comprar entradas.';
  end if;

  select p.visible, p.restriccion_edad, p.fecha_estreno, p.preventa_habilitada, p.precio_preventa
    into v_visible, v_restriccion, v_estreno, v_preventa, v_precio_preventa
  from public."Peliculas" p
  where p.id = v_pelicula_id;

  -- Una película oculta se puede leer, pero no está ofrecida (D-34).
  if not v_visible then
    raise exception 'Esta película no está disponible para la venta.';
  end if;

  -- ----- 2. La venta está abierta (R-11) -----
  -- Igual que en la 11.4: con preventa abre 7 días antes del estreno; sin
  -- preventa, el día del estreno. "Hoy" es el día de Argentina (9.5).
  v_hoy := (now() at time zone 'America/Argentina/Buenos_Aires')::date;

  if v_preventa then
    v_inicio_venta := v_estreno - 7;
  else
    v_inicio_venta := v_estreno;
  end if;

  if v_hoy < v_inicio_venta then
    raise exception 'La venta de esta película todavía no está abierta. Abre el %.',
      to_char(v_inicio_venta, 'DD/MM/YYYY');
  end if;

  v_en_preventa := v_preventa and v_hoy < v_estreno;

  -- ----- 3. El medio de pago -----
  -- Se controla en el paso 10, cuando ya se sabe si queda algo para
  -- cobrar: si no queda nada, no hace falta (D-47).

  -- ----- 4. El comprador: candado, saldos, edad y mail -----
  v_usuario := auth.uid();

  -- Los parámetros que no vienen se toman como vacíos.
  p_candy   := coalesce(p_candy, '[]'::jsonb);
  p_canjes  := coalesce(p_canjes, '[]'::jsonb);
  p_credito := coalesce(p_credito, 0);

  if jsonb_typeof(p_candy) <> 'array' or jsonb_typeof(p_canjes) <> 'array' then
    raise exception 'Los productos elegidos no tienen un formato válido.';
  end if;

  if v_usuario is not null then
    -- El candado va antes de leer los saldos: así lo que se lee ya no lo
    -- puede cambiar otra compra del mismo usuario hasta que esta termine.
    perform pg_advisory_xact_lock(1, hashtext(v_usuario::text));

    select u.fecha_nacimiento, u.email, u.puntos, u.credito
      into v_nacimiento, v_email, v_saldo_puntos, v_saldo_credito
    from public."Usuarios" u
    where u.id = v_usuario;

    if not found then
      raise exception 'No se encontró tu perfil. Cerrá la sesión y volvé a ingresar.';
    end if;
  else
    -- El anónimo no tiene cupón, crédito ni puntos (R-02).
    if jsonb_array_length(p_canjes) > 0 then
      raise exception 'Para canjear puntos tenés que iniciar sesión.';
    end if;
    if p_credito <> 0 then
      raise exception 'Para usar crédito tenés que iniciar sesión.';
    end if;
  end if;

  -- Control de edad (R-25, D-06). Igual que en la 11.4.
  if v_restriccion is not null then
    if v_usuario is null then
      if p_fecha_nacimiento is null then
        raise exception 'Esta película es para mayores de % años. Ingresá tu fecha de nacimiento.',
          v_restriccion;
      end if;
      if p_fecha_nacimiento > v_hoy
         or p_fecha_nacimiento < v_hoy - interval '120 years' then
        raise exception 'La fecha de nacimiento no es válida.';
      end if;
      v_nacimiento := p_fecha_nacimiento;
      v_declarada  := p_fecha_nacimiento;
    end if;

    v_edad := extract(year from age(v_hoy, v_nacimiento));
    if v_edad < v_restriccion then
      raise exception 'Esta película es para mayores de % años.', v_restriccion;
    end if;
  end if;

  -- El mail del anónimo. Igual que en la 11.4.
  if v_usuario is null then
    v_email := lower(trim(coalesce(p_email, '')));
    if v_email = '' then
      raise exception 'Ingresá tu mail para registrar la compra.';
    end if;
    if char_length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
      raise exception 'El mail no tiene un formato válido.';
    end if;
  end if;

  -- ----- 5. Las butacas: cantidad y validez -----
  -- Las mismas reglas de la 11.4. El precio todavía no se calcula: depende
  -- de si la butaca la cubre un combo o un canje, y eso se sabe recién
  -- después de mirar el candy y los canjes (paso 8).
  if p_butacas is null or jsonb_typeof(p_butacas) <> 'array' then
    raise exception 'Elegí al menos una butaca.';
  end if;

  v_cantidad := jsonb_array_length(p_butacas);
  if v_cantidad < 1 then
    raise exception 'Elegí al menos una butaca.';
  end if;
  if v_cantidad > 10 then
    raise exception 'Se pueden comprar hasta 10 butacas por compra.';
  end if;

  for v_butaca in select * from jsonb_array_elements(p_butacas)
  loop
    v_fila := upper(coalesce(v_butaca ->> 'fila', ''));

    if coalesce(v_butaca ->> 'numero', '') !~ '^[0-9]{1,2}$' then
      raise exception 'Alguna de las butacas elegidas no existe en la sala.';
    end if;
    v_numero := (v_butaca ->> 'numero')::int;

    -- Distribución de la sala (R-13, D-04): A a T, con J y K de 14.
    if v_fila !~ '^[A-T]$' then
      raise exception 'Alguna de las butacas elegidas no existe en la sala.';
    end if;
    if v_numero < 1
       or (v_fila in ('J', 'K') and v_numero > 14)
       or v_numero > 28 then
      raise exception 'Alguna de las butacas elegidas no existe en la sala.';
    end if;

    v_butacas := v_butacas || jsonb_build_object(
      'fila', v_fila,
      'numero', v_numero,
      'es_vip', v_fila in ('R', 'S', 'T')
    );
  end loop;

  -- ----- 6. El candy: productos y combos (R-21, R-22) -----
  -- Cada producto aparece una sola vez, con su cantidad de 1 a 10
  -- (validaciones.md 3.10), y tiene que estar activo. El precio sale de
  -- la base, no de lo que mande el navegador.
  for v_item in select * from jsonb_array_elements(p_candy)
  loop
    if coalesce(v_item ->> 'producto_id', '') !~ '^[0-9]{1,18}$'
       or coalesce(v_item ->> 'cantidad', '') !~ '^[0-9]{1,2}$' then
      raise exception 'Alguno de los productos elegidos no es válido.';
    end if;
    v_producto_id := (v_item ->> 'producto_id')::bigint;
    v_unidades    := (v_item ->> 'cantidad')::int;

    if v_unidades < 1 or v_unidades > 10 then
      raise exception 'Se pueden llevar de 1 a 10 unidades de cada producto.';
    end if;

    -- Sin repetidos: se cuenta cuántas veces aparece este producto en la
    -- lista que mandó el navegador.
    if (select count(*) from jsonb_array_elements(p_candy) e
        where e ->> 'producto_id' = v_item ->> 'producto_id') > 1 then
      raise exception 'Hay un producto repetido en el pedido.';
    end if;

    select pr.nombre, pr.precio, pr.es_combo, pr.incluye_entrada, pr.activo
      into v_nombre, v_precio_producto, v_es_combo, v_con_entrada, v_activo
    from public."ProductosCandy" pr
    where pr.id = v_producto_id;

    if not found or not v_activo then
      raise exception 'Alguno de los productos elegidos ya no está disponible.';
    end if;

    -- Cada combo con entrada cubre una butaca por unidad (D-46).
    if v_con_entrada then
      v_cubre_combo := v_cubre_combo + v_unidades;
    end if;

    v_subtotal := v_subtotal + v_precio_producto * v_unidades;
    v_candy := v_candy || jsonb_build_object(
      'producto_id', v_producto_id,
      'nombre', v_nombre,
      'cantidad', v_unidades,
      'precio_unitario', v_precio_producto,
      'es_combo', v_es_combo,
      'incluye_entrada', v_con_entrada,
      'es_canje', false
    );
  end loop;

  -- ----- 7. Los canjes de puntos (R-28, D-45) -----
  -- Solo con sesión (el anónimo ya se cortó en el paso 4). Una entrada
  -- gratis cubre una butaca; un producto se lleva a $0.
  for v_item in select * from jsonb_array_elements(p_canjes)
  loop
    if coalesce(v_item ->> 'recompensa_id', '') !~ '^[0-9]{1,18}$' then
      raise exception 'Alguna de las recompensas elegidas no es válida.';
    end if;
    v_recompensa_id := (v_item ->> 'recompensa_id')::bigint;

    -- left join: si la recompensa es una entrada no tiene producto, y la
    -- fila tiene que aparecer igual.
    select r.tipo, r.producto_id, r.costo_puntos, r.activa and coalesce(pr.activo, true), pr.nombre
      into v_tipo, v_producto_id, v_costo, v_activo, v_nombre
    from public."Recompensas" r
    left join public."ProductosCandy" pr on pr.id = r.producto_id
    where r.id = v_recompensa_id;

    if not found or not v_activo then
      raise exception 'Alguna de las recompensas elegidas ya no está disponible.';
    end if;

    v_puntos_usados := v_puntos_usados + v_costo;

    if v_tipo = 'entrada' then
      v_cubre_canje := v_cubre_canje + 1;
      v_nombre := 'Entrada';
    else
      -- El producto canjeado va al candy con precio 0 y marcado como
      -- canje. No suma al subtotal.
      v_candy := v_candy || jsonb_build_object(
        'producto_id', v_producto_id,
        'nombre', v_nombre,
        'cantidad', 1,
        'precio_unitario', 0,
        'es_combo', false,
        'incluye_entrada', false,
        'es_canje', true
      );
    end if;

    v_canjes := v_canjes || jsonb_build_object(
      'recompensa_id', v_recompensa_id,
      'nombre', v_nombre,
      'tipo', v_tipo,
      'puntos', v_costo
    );
  end loop;

  if v_puntos_usados > v_saldo_puntos then
    raise exception 'No te alcanzan los puntos: tenés % y los canjes elegidos suman %.',
      v_saldo_puntos, v_puntos_usados;
  end if;

  -- ----- 8. El precio de cada butaca (D-46) -----
  -- Cada combo con entrada y cada entrada gratis necesita su butaca.
  if v_cubre_combo + v_cubre_canje > v_cantidad then
    raise exception 'Cada combo con entrada y cada entrada gratis cubre una butaca: elegiste % butacas para % entradas incluidas.',
      v_cantidad, v_cubre_combo + v_cubre_canje;
  end if;

  -- Las butacas se cubren en el orden en que vienen: primero las de los
  -- combos, después las de los canjes, y las demás se cobran.
  --   Cubierta:     0, o la diferencia VIP si la butaca es VIP.
  --   No cubierta:  VIP a precio_vip; comunes y accesibles a
  --                 precio_preventa en preventa, si no a precio_base.
  v_posicion := 0;
  for v_butaca in select * from jsonb_array_elements(v_butacas)
  loop
    v_posicion := v_posicion + 1;
    v_es_vip := (v_butaca ->> 'es_vip')::boolean;

    if v_posicion <= v_cubre_combo then
      v_cubierta := 'combo';
    elsif v_posicion <= v_cubre_combo + v_cubre_canje then
      v_cubierta := 'canje';
    else
      v_cubierta := null;
    end if;

    if v_cubierta is not null then
      if v_es_vip then
        v_precio := v_precio_vip - v_precio_base;
      else
        v_precio := 0;
      end if;
    elsif v_es_vip then
      v_precio := v_precio_vip;
    elsif v_en_preventa then
      v_precio := v_precio_preventa;
    else
      v_precio := v_precio_base;
    end if;

    v_subtotal := v_subtotal + v_precio;
    v_entradas := v_entradas || jsonb_build_object(
      'fila', v_butaca ->> 'fila',
      'numero', (v_butaca ->> 'numero')::int,
      'es_vip', v_es_vip,
      'precio', v_precio,
      'cubierta_por', v_cubierta
    );
  end loop;

  -- ----- 9. El cupón (R-23, R-24, D-41, D-47) -----
  -- Solo con sesión. Se aplica uno solo: el de mayor porcentaje entre los
  -- activos que le corresponden.
  --   Primera compra: el usuario no tiene compras pagadas. Las canceladas
  --   no cuentan (D-41).
  --   Mayor de 50: tiene más de 50 años según la fecha de su perfil. Se
  --   aplica en cada compra.
  if v_usuario is not null then
    v_edad := extract(year from age(v_hoy, v_nacimiento));

    select c.id, c.nombre, c.porcentaje
      into v_cupon_id, v_cupon_nombre, v_cupon_pct
    from public."Cupones" c
    where c.activo
      and (
        (c.condicion = 'primera_compra'
          and not exists (
            select 1 from public."Compras" co
            where co.usuario_id = v_usuario and co.estado = 'pagada'
          ))
        or (c.condicion = 'mayor_50' and v_edad > 50)
      )
    order by c.porcentaje desc, c.id
    limit 1;

    if v_cupon_id is not null then
      v_descuento := round(v_subtotal * v_cupon_pct / 100.0, 2);
    end if;
  end if;

  v_total := v_subtotal - v_descuento;

  -- ----- 10. El crédito (R-30, D-47) -----
  -- Hasta el saldo que tiene. Si pide más de lo que cuesta la compra, se
  -- usa solo lo necesario para cubrirla: el total nunca queda negativo.
  p_credito := round(p_credito, 2);
  if p_credito < 0 then
    raise exception 'El crédito a usar no puede ser negativo.';
  end if;
  if p_credito > v_saldo_credito then
    raise exception 'Tenés $% de crédito: no podés usar más que eso.', v_saldo_credito;
  end if;

  if p_credito > v_total then
    v_credito_usado := v_total;
  else
    v_credito_usado := p_credito;
  end if;

  v_a_pagar := v_total - v_credito_usado;

  -- El medio de pago. Si no queda nada para cobrar (el crédito y los
  -- canjes cubren todo), es 'sin_cargo' y lo que haya mandado el
  -- navegador no se usa. Si queda algo, tiene que ser uno de la lista;
  -- 'sin_cargo' no se puede elegir.
  if v_a_pagar = 0 then
    v_medio_pago := 'sin_cargo';
  elsif p_medio_pago is null or p_medio_pago not in ('credito', 'debito', 'mercado_pago') then
    raise exception 'Elegí un medio de pago válido.';
  else
    v_medio_pago := p_medio_pago;
  end if;

  -- 1 punto por peso pagado con el medio de pago (R-27). El crédito no
  -- genera puntos: ya los generó la compra que lo originó.
  if v_usuario is not null then
    v_puntos_generados := floor(v_a_pagar);
  end if;

  -- ----- 11. El código de la compra (D-09) -----
  loop
    v_codigo := upper(replace(gen_random_uuid()::text, '-', ''));
    v_codigo := 'OLY-' || substr(v_codigo, 1, 4) || '-' || substr(v_codigo, 5, 4);
    exit when not exists (select 1 from public."Compras" c where c.codigo = v_codigo);
  end loop;

  -- ----- 12. Guardar todo -----
  -- Igual que en la 11.4, la violación de unique de ButacasOcupadas se
  -- traduce a un mensaje para el comprador, y al salir con raise
  -- exception se deshace todo.
  begin
    insert into public."Compras"
      (usuario_id, email, fecha_nacimiento_declarada, codigo, total, medio_pago,
       cupon_id, descuento_aplicado, credito_usado, puntos_generados)
    values
      (v_usuario, v_email, v_declarada, v_codigo, v_total, v_medio_pago,
       v_cupon_id, v_descuento, v_credito_usado, v_puntos_generados)
    returning id into v_compra_id;

    for v_butaca in select * from jsonb_array_elements(v_entradas)
    loop
      insert into public."Entradas"
        (compra_id, funcion_id, fila, numero, es_vip, precio, cubierta_por)
      values (
        v_compra_id,
        p_funcion_id,
        v_butaca ->> 'fila',
        (v_butaca ->> 'numero')::int,
        (v_butaca ->> 'es_vip')::boolean,
        (v_butaca ->> 'precio')::numeric,
        v_butaca ->> 'cubierta_por'
      );

      insert into public."ButacasOcupadas" (funcion_id, fila, numero)
      values (p_funcion_id, v_butaca ->> 'fila', (v_butaca ->> 'numero')::int);
    end loop;
  exception
    when unique_violation then
      raise exception 'Alguna de las butacas ya fue vendida. Elegí otras.';
  end;

  for v_item in select * from jsonb_array_elements(v_candy)
  loop
    insert into public."ItemsCandy" (compra_id, producto_id, cantidad, precio_unitario, es_canje)
    values (
      v_compra_id,
      (v_item ->> 'producto_id')::bigint,
      (v_item ->> 'cantidad')::int,
      (v_item ->> 'precio_unitario')::numeric,
      (v_item ->> 'es_canje')::boolean
    );
  end loop;

  for v_item in select * from jsonb_array_elements(v_canjes)
  loop
    insert into public."Canjes" (usuario_id, recompensa_id, puntos_gastados, compra_id)
    values (
      v_usuario,
      (v_item ->> 'recompensa_id')::bigint,
      (v_item ->> 'puntos')::int,
      v_compra_id
    );
  end loop;

  -- Los saldos del usuario. La función es security definer, así que puede
  -- escribir puntos y crédito aunque el usuario no tenga permiso sobre
  -- esas columnas (sección 4).
  if v_usuario is not null then
    update public."Usuarios"
    set puntos  = puntos - v_puntos_usados + v_puntos_generados,
        credito = credito - v_credito_usado
    where id = v_usuario;
  end if;

  -- ----- 13. Lo que necesitan la confirmación y el PDF -----
  return jsonb_build_object(
    'codigo', v_codigo,
    'email', v_email,
    'requiere_adulto', v_restriccion is not null,
    'en_preventa', v_en_preventa,
    'entradas', v_entradas,
    'candy', v_candy,
    'canjes', v_canjes,
    'subtotal', v_subtotal,
    'cupon', case when v_cupon_id is null then null
                  else jsonb_build_object('nombre', v_cupon_nombre, 'porcentaje', v_cupon_pct)
             end,
    'descuento', v_descuento,
    'total', v_total,
    'credito_usado', v_credito_usado,
    'a_pagar', v_a_pagar,
    'medio_pago', v_medio_pago,
    'puntos_usados', v_puntos_usados,
    'puntos_generados', v_puntos_generados
  );
end;
$$;

-- Quién puede llamarla: cualquiera, con o sin sesión (R-02). Los
-- controles están adentro de la función.
grant execute on function public.realizar_compra(bigint, jsonb, text, text, date, jsonb, jsonb, numeric)
  to anon, authenticated;
```

## 13.4 `cancelar_compra`

```sql
-- ---------- 13.4 cancelar_compra (R-29, R-30, D-48) ----------
-- La app la llama con rpc('cancelar_compra', { p_compra_id }).
-- Solo el dueño de la compra, hasta 2 horas antes de la función, si la
-- entrada no se usó y si el candy no se retiró. Todo en una transacción,
-- como realizar_compra:
--   1. Acredita lo que costó la compra (lo pagado con el medio más el
--      crédito usado, o sea, el total) como crédito. No devuelve dinero
--      (R-30).
--   2. Devuelve los puntos canjeados y descuenta los generados. Si el
--      usuario ya gastó los puntos que le dio esta compra, no alcanza
--      para descontarlos y la cancelación se rechaza.
--   3. Libera las butacas: las borra de ButacasOcupadas, y Realtime le
--      avisa al mapa (D-38).
--   4. Marca la compra como cancelada. Las entradas, el candy y los canjes
--      quedan como historial.
-- Usa el mismo candado por usuario que realizar_compra: una compra y una
-- cancelación del mismo usuario no se mezclan.

create or replace function public.cancelar_compra(p_compra_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario      uuid;
  v_dueno        uuid;
  v_estado       text;
  v_validada     timestamptz;
  v_entregado    timestamptz;
  v_total        numeric(12,2);
  v_generados    int;
  v_fecha_hora   timestamptz;
  v_devueltos    int;
  v_puntos       int;
  v_credito      numeric(12,2);
begin
  v_usuario := auth.uid();
  if v_usuario is null then
    raise exception 'Iniciá sesión para cancelar una compra.';
  end if;

  perform pg_advisory_xact_lock(1, hashtext(v_usuario::text));

  select c.usuario_id, c.estado, c.entrada_validada_en, c.candy_entregado_en,
         c.total, c.puntos_generados
    into v_dueno, v_estado, v_validada, v_entregado, v_total, v_generados
  from public."Compras" c
  where c.id = p_compra_id;

  -- El mismo mensaje si no existe o si es de otro: no se le confirma a
  -- nadie que existe una compra ajena con ese id.
  if not found or v_dueno is null or v_dueno <> v_usuario then
    raise exception 'No encontramos esa compra entre las tuyas.';
  end if;

  if v_estado = 'cancelada' then
    raise exception 'Esta compra ya está cancelada.';
  end if;

  if v_validada is not null then
    raise exception 'La entrada ya se usó: la compra no se puede cancelar.';
  end if;

  -- Tampoco si ya retiró el candy: se llevaría los productos y cobraría
  -- todo en crédito.
  if v_entregado is not null then
    raise exception 'El candy de esta compra ya se retiró: la compra no se puede cancelar.';
  end if;

  -- Todas las entradas de una compra son de la misma función.
  select min(f.fecha_hora) into v_fecha_hora
  from public."Entradas" e
  join public."Funciones" f on f.id = e.funcion_id
  where e.compra_id = p_compra_id;

  if v_fecha_hora - interval '2 hours' < now() then
    raise exception 'Solo se puede cancelar hasta 2 horas antes de la función, que empieza el %.',
      to_char(v_fecha_hora at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY "a las" HH24:MI');
  end if;

  select coalesce(sum(cj.puntos_gastados), 0) into v_devueltos
  from public."Canjes" cj
  where cj.compra_id = p_compra_id;

  select u.puntos, u.credito into v_puntos, v_credito
  from public."Usuarios" u
  where u.id = v_usuario;

  if v_puntos + v_devueltos - v_generados < 0 then
    raise exception 'Ya usaste los % puntos que te dio esta compra, así que no se puede cancelar.',
      v_generados;
  end if;

  update public."Usuarios"
  set puntos  = puntos + v_devueltos - v_generados,
      credito = credito + v_total
  where id = v_usuario;

  delete from public."ButacasOcupadas" b
  where exists (
    select 1 from public."Entradas" e
    where e.compra_id = p_compra_id
      and e.funcion_id = b.funcion_id
      and e.fila = b.fila
      and e.numero = b.numero
  );

  update public."Compras" set estado = 'cancelada' where id = p_compra_id;

  return jsonb_build_object(
    'credito_acreditado', v_total,
    'credito', v_credito + v_total,
    'puntos', v_puntos + v_devueltos - v_generados
  );
end;
$$;

-- Solo con sesión: sin ella no hay compra propia que cancelar.
grant execute on function public.cancelar_compra(bigint) to authenticated;
```
