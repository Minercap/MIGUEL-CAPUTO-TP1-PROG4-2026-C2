-- ============================================================
-- Olympia Cinema — datos iniciales de películas
-- TP 1 · Programación IV · 2026 C2
--
-- Las secciones 1 y 2 se corren UNA sola vez desde el SQL Editor de
-- Supabase, después de schema.sql (necesitan las tablas y los 15 géneros
-- ya cargados). Si se corren dos veces, las películas quedan duplicadas.
--
-- La sección 3 (historial de prueba para la demo) es aparte: se corre
-- después, sola, y se puede repetir. Ver sus instrucciones.
--
-- Los pósters ya están subidos al bucket público "peliculas", en la
-- carpeta "seed". La imagen_url es la URL pública de cada archivo:
--   <SUPABASE_URL>/storage/v1/object/public/peliculas/seed/<archivo>
--
-- No escribe en LogActividad: son datos de arranque, no acciones que
-- haya hecho un administrador desde la app.
-- ============================================================

-- ---------- 1. Películas ----------
-- Las siete son visibles. En qué lugar aparece cada una lo dice su fecha
-- de estreno (D-27): al 06/10, día de la entrega, cinco ya estrenaron y
-- están en cartelera, y dos están en Próximamente:
--   Resident Evil  estrena el 08/10 con preventa habilitada, para que la
--                  ventana de preventa esté abierta el día de la entrega (R-11).
--   The Uprising   estrena el 29/10 sin preventa: es el caso contrario.
-- El id y creado_en no se cargan: los pone la base.

insert into public."Peliculas"
  (nombre, sinopsis, imagen_url, duracion_minutos, restriccion_edad,
   fecha_estreno, visible, preventa_habilitada, precio_preventa)
values
  ('A Nightmare on Elm Street',
   'Un grupo de adolescentes descubre que comparte la misma pesadilla: un hombre con el rostro quemado y una garra de cuchillas. Lo que les pase mientras duermen no se queda en el sueño.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/a-nightmare-on-elm-street.webp',
   91, 18, '2026-09-03', true, false, null),

  ('Project Hail Mary',
   'Un profesor de ciencias despierta solo en una nave, a años luz de casa y sin recordar cómo llegó. De a poco entiende que es la última oportunidad de salvar al Sol, y que no es el único que busca una respuesta.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/project-hail-mary.webp',
   156, 13, '2026-09-10', true, false, null),

  ('Shutter Island',
   'Dos agentes llegan a un hospital psiquiátrico aislado en una isla para investigar la desaparición de una paciente. Cuanto más pregunta, menos confía uno de ellos en lo que ve y en lo que recuerda.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/shutter-island.webp',
   138, 13, '2026-09-17', true, false, null),

  ('The Godfather',
   'El hijo menor de una poderosa familia mafiosa de Nueva York quería mantenerse al margen del negocio. Un atentado contra su padre lo obliga a elegir entre la vida que planeaba y la lealtad a los suyos.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/the-godfather.webp',
   175, 18, '2026-09-24', true, false, null),

  ('The Truman Show',
   'Truman lleva una vida tranquila en un pueblo perfecto, sin saber que cada minuto se transmite en vivo a todo el mundo. Una serie de detalles que no encajan lo empuja a buscar el borde de su mundo.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/the-truman-show.webp',
   103, null, '2026-10-01', true, false, null),

  ('Resident Evil',
   'Un brote fuera de control convierte una ciudad entera en una trampa. Quienes quedan adentro tienen una sola noche para encontrar la salida antes de que no quede nadie a quien salvar.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/resident-evil.webp',
   100, 18, '2026-10-08', true, true, 8000.00),

  ('The Uprising',
   'Cuando el abuso del poder se vuelve insoportable, un pueblo sin armas ni líderes decide dejar de obedecer. Lo que empieza como una protesta termina poniendo en juego mucho más que sus vidas.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/the-uprising.webp',
   120, 13, '2026-10-29', true, false, null);


-- ---------- 2. Géneros de cada película ----------
-- Los ids no se escriben a mano: los genera la base y no se sabe de
-- antemano cuáles van a ser. Cada insert los busca por nombre.
--
-- "insert ... select" inserta las filas que devuelve la consulta. Poner
-- las dos tablas en el from arma todas las combinaciones de película y
-- género, y el where deja solo las de la película y los géneros pedidos:
-- una fila de PeliculasGeneros por cada género.

insert into public."PeliculasGeneros" (pelicula_id, genero_id)
select p.id, g.id
from public."Peliculas" p, public."Generos" g
where p.nombre = 'A Nightmare on Elm Street'
  and g.nombre in ('Terror', 'Suspenso');

insert into public."PeliculasGeneros" (pelicula_id, genero_id)
select p.id, g.id
from public."Peliculas" p, public."Generos" g
where p.nombre = 'Project Hail Mary'
  and g.nombre in ('Ciencia ficción', 'Aventura', 'Drama');

insert into public."PeliculasGeneros" (pelicula_id, genero_id)
select p.id, g.id
from public."Peliculas" p, public."Generos" g
where p.nombre = 'Shutter Island'
  and g.nombre in ('Suspenso', 'Drama');

insert into public."PeliculasGeneros" (pelicula_id, genero_id)
select p.id, g.id
from public."Peliculas" p, public."Generos" g
where p.nombre = 'The Godfather'
  and g.nombre in ('Crimen', 'Drama');

insert into public."PeliculasGeneros" (pelicula_id, genero_id)
select p.id, g.id
from public."Peliculas" p, public."Generos" g
where p.nombre = 'The Truman Show'
  and g.nombre in ('Comedia', 'Drama');

insert into public."PeliculasGeneros" (pelicula_id, genero_id)
select p.id, g.id
from public."Peliculas" p, public."Generos" g
where p.nombre = 'Resident Evil'
  and g.nombre in ('Terror', 'Acción', 'Ciencia ficción');

insert into public."PeliculasGeneros" (pelicula_id, genero_id)
select p.id, g.id
from public."Peliculas" p, public."Generos" g
where p.nombre = 'The Uprising'
  and g.nombre in ('Acción', 'Drama');


-- ============================================================
-- 3. HISTORIAL DE PRUEBA  (datos para la demo)
-- ============================================================
-- Ventas, candy y reseñas con volumen, para que los reportes, la cartelera,
-- Mis compras, Mis películas y las reseñas tengan qué mostrar en Vercel.
--
-- CÓMO SE CORRE: desde la línea "-- 3. HISTORIAL DE PRUEBA" hasta el final
-- del archivo, todo junto, en el SQL Editor. Las secciones 1 y 2 NO se
-- vuelven a correr (duplicarían las películas).
--
-- Se puede correr más de una vez: cada corrida borra lo que dejó la
-- anterior y lo vuelve a crear. Cómo reconoce lo suyo:
--   Compras     el código empieza con OLY-SEED- (cumple el formato
--               OLY-XXXX-XXXX de D-09, así que también se puede validar a
--               mano). Al borrarlas se van sus Entradas e ItemsCandy (on
--               delete cascade).
--   Butacas     las de las entradas de esas compras pagadas.
--   Funciones   Funciones no tiene código: las del seed llevan creado_en =
--               2026-09-01 00:00 (hora argentina), una fecha anterior a
--               cualquier función creada desde la app.
--   Reseñas     las de los clientes de prueba con un comentario de la lista
--               de abajo.
--   Usuarios    los perfiles no se borran: se crean una sola vez.
--
-- Qué NO toca: puntos, crédito y canjes de los usuarios (las compras van
-- sin cupón, sin crédito y con puntos_generados en 0), y LogActividad.
--
-- Qué puede rechazar un insert:
--   - El trigger funciones_sin_superposicion (9.3, 9.4): una función antes
--     del estreno de su película o a menos de 30 minutos de otra en la
--     misma sala. No llega a dispararse: cada función se ubica en una sala
--     libre (con la misma cuenta del trigger) y se saltea si su película no
--     existe, si quedaría antes del estreno o si no hay sala libre.
--   - El unique de ButacasOcupadas (funcion_id, fila, numero): las butacas
--     se eligen entre las que no están ocupadas.
--   - Los check de Compras, Entradas e ItemsCandy (medio de pago de la
--     lista, montos no negativos, cantidad de 1 a 10, crédito 0): los
--     valores del seed los cumplen.
--   - Los check de Usuarios (nombre y apellido solo letras, fecha de
--     nacimiento, tipo de sangre, color de ojos, vacaciones de 0 a 60): los
--     perfiles de 3.1 los cumplen.
-- Si algo falla, el bloque 3.2 entero vuelve atrás: no quedan datos a
-- medias.

-- ---------- 3.1 Perfiles de los clientes de prueba ----------
-- Los 5 usuarios se crearon a mano desde Authentication, con mails del
-- tipo tumail+lucia@gmail.com (+lucia, +maria, +winona, +lucho, +juan).
-- Este seed no crea usuarios en auth.users.
--
-- Primero se comprueba que estén los 5. Si falta alguno, se corta con un
-- error que dice cuál, antes de insertar nada.
--
-- El perfil en Usuarios lo crea la app después del signUp (no hay trigger
-- sobre auth.users), así que acá se crea con todos los campos obligatorios
-- del registro. Puntos, crédito y rol van con los mismos valores con los
-- que queda un registro hecho desde la app: el front no los manda, y la
-- base pone 0 puntos, 0 de crédito y rol 'cliente'.
-- on conflict (id) do nothing: si el perfil ya existe, no se pisa. Por eso,
-- al final se comprueba que ninguno de los 5 tenga rol admin o empleado: si
-- alguno lo tiene (por un perfil anterior), se corta con un error.

do $$
declare
  v_alias  text;
  v_falta  text[] := '{}';
  v_otros  text;
begin
  foreach v_alias in array array['lucia', 'maria', 'winona', 'lucho', 'juan'] loop
    if not exists (
      select 1 from auth.users u
      where lower(u.email) like '%+' || v_alias || '@gmail.com'
    ) then
      v_falta := v_falta || v_alias;
    end if;
  end loop;

  if array_length(v_falta, 1) > 0 then
    raise exception 'Faltan usuarios en auth.users: %. Crealos desde Authentication con el mail tumail+<nombre>@gmail.com y volvé a correr.',
      array_to_string(array(select '+' || a from unnest(v_falta) a), ', ');
  end if;

  insert into public."Usuarios"
    (id, email, nombre, apellido, fecha_nacimiento, tipo_sangre, color_ojos,
     dias_vacaciones, rol, puntos, credito)
  select
    u.id,
    lower(u.email),
    case a.alias
      when 'lucia'  then 'Lucía'
      when 'maria'  then 'María'
      when 'winona' then 'Winona'
      when 'lucho'  then 'Luciano'
      when 'juan'   then 'Juan'
    end,
    case a.alias
      when 'lucia'  then 'Fernández'
      when 'maria'  then 'Gómez'
      when 'winona' then 'Paz'
      when 'lucho'  then 'Ríos'
      when 'juan'   then 'Pérez'
    end,
    -- Todos mayores de edad: pueden ver las películas +18.
    case a.alias
      when 'lucia'  then date '1994-03-15'
      when 'maria'  then date '1988-11-02'
      when 'winona' then date '1999-07-23'
      when 'lucho'  then date '1985-01-30'
      when 'juan'   then date '1976-09-08'
    end,
    case a.alias when 'lucia' then 'A+' when 'maria' then '0+' when 'winona' then 'B+'
                 when 'lucho' then '0-' when 'juan' then 'A-' end,
    case a.alias when 'lucia' then 'Marrón' when 'maria' then 'Verde' when 'winona' then 'Azul'
                 when 'lucho' then 'Negro' when 'juan' then 'Marrón' end,
    case a.alias when 'lucia' then 15 when 'maria' then 21 when 'winona' then 10
                 when 'lucho' then 28 when 'juan' then 30 end,
    'cliente', 0, 0
  from auth.users u
  cross join lateral (
    select lower(split_part(split_part(u.email, '+', 2), '@', 1)) as alias
  ) a
  where lower(u.email) like '%+%@gmail.com'
    and a.alias in ('lucia', 'maria', 'winona', 'lucho', 'juan')
  on conflict (id) do nothing;

  select string_agg(us.email || ' (' || us.rol || ')', ', ') into v_otros
  from public."Usuarios" us
  where lower(us.email) like '%+%@gmail.com'
    and us.rol <> 'cliente';

  if v_otros is not null then
    raise exception 'Estos usuarios de prueba no tienen rol cliente: %. Cambiales el rol a mano antes de seguir.', v_otros;
  end if;
end;
$$;


-- ---------- 3.2 Funciones pasadas, compras y reseñas ----------

do $$
declare
  -- La marca de las funciones del seed (ver arriba).
  v_marca      constant timestamptz := timestamptz '2026-09-01 00:00:00-03';
  v_ar         constant text := 'America/Argentina/Buenos_Aires';
  -- Filas comunes, de la del medio hacia afuera. Sin J y K (accesibles)
  -- ni R, S y T (VIP).
  v_filas      constant text[] := array['G','H','F','I','E','L','D','M','C','N','B','O','A','P','Q'];
  v_filas_vip  constant text[] := array['R','S','T'];

  v_clientes   uuid[];
  v_empleado   uuid;
  v_productos  bigint[];
  v_combos     bigint[];
  v_futuras    bigint[];
  v_hoy        date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;

  r            record;
  b            record;
  v_pel        bigint;
  v_dur        int;
  v_estreno    date;
  v_sala       bigint;
  v_fid        bigint;
  v_cid        bigint;
  v_usuario    uuid;
  v_email      text;
  v_fecha      timestamptz;
  v_base       numeric;
  v_vip        numeric;
  v_preventa   boolean;
  v_p_preventa numeric;
  v_comun      numeric;
  v_item       text;
  v_prod       bigint;
  v_con_candy  boolean;
  v_saltadas   int := 0;
begin
  -- ----- Los datos fijos del seed -----
  -- Tablas temporales: existen solo durante esta corrida.

  create temp table seed_funciones (
    n int, pelicula text, fecha_hora timestamptz, formato text, idioma text,
    precio_base numeric, precio_vip numeric
  ) on commit drop;
  insert into seed_funciones values
      (1, 'A Nightmare on Elm Street', timestamptz '2026-09-07 21:15:00-03', '2D', 'subtitulada', 6500, 9500),
      (2, 'Project Hail Mary', timestamptz '2026-09-10 20:00:00-03', '2D', 'subtitulada', 6500, 9500),
      (3, 'A Nightmare on Elm Street', timestamptz '2026-09-11 22:00:00-03', '2D', 'castellano', 6500, 9500),
      (4, 'Project Hail Mary', timestamptz '2026-09-12 17:00:00-03', '3D', 'castellano', 8000, 11500),
      (5, 'A Nightmare on Elm Street', timestamptz '2026-09-12 22:30:00-03', '2D', 'subtitulada', 6500, 9500),
      (6, 'Project Hail Mary', timestamptz '2026-09-13 18:00:00-03', '2D', 'castellano', 6500, 9500),
      (7, 'Project Hail Mary', timestamptz '2026-09-17 19:30:00-03', '2D', 'subtitulada', 6500, 9500),
      (8, 'Shutter Island', timestamptz '2026-09-17 21:45:00-03', '2D', 'subtitulada', 6500, 9500),
      (9, 'Shutter Island', timestamptz '2026-09-18 21:00:00-03', '2D', 'castellano', 6500, 9500),
      (10, 'Project Hail Mary', timestamptz '2026-09-19 16:30:00-03', '3D', 'castellano', 8000, 11500),
      (11, 'Shutter Island', timestamptz '2026-09-19 20:00:00-03', '2D', 'subtitulada', 6500, 9500),
      (12, 'A Nightmare on Elm Street', timestamptz '2026-09-19 23:00:00-03', '2D', 'subtitulada', 6500, 9500),
      (13, 'Project Hail Mary', timestamptz '2026-09-20 17:30:00-03', '2D', 'castellano', 6500, 9500),
      (14, 'Shutter Island', timestamptz '2026-09-20 21:00:00-03', '2D', 'castellano', 6500, 9500),
      (15, 'Shutter Island', timestamptz '2026-09-24 18:30:00-03', '2D', 'subtitulada', 6500, 9500),
      (16, 'The Godfather', timestamptz '2026-09-24 20:30:00-03', '2D', 'subtitulada', 6500, 9500),
      (17, 'Project Hail Mary', timestamptz '2026-09-26 16:00:00-03', '4D', 'castellano', 10500, 14000),
      (18, 'A Nightmare on Elm Street', timestamptz '2026-09-26 22:45:00-03', '2D', 'castellano', 6500, 9500),
      (19, 'The Godfather', timestamptz '2026-09-27 17:00:00-03', '2D', 'castellano', 6500, 9500),
      (20, 'The Godfather', timestamptz '2026-09-28 20:00:00-03', '2D', 'subtitulada', 6500, 9500),
      (21, 'The Godfather', timestamptz '2026-09-29 19:30:00-03', '2D', 'castellano', 6500, 9500),
      (22, 'The Godfather', timestamptz '2026-09-30 20:00:00-03', '2D', 'subtitulada', 6500, 9500),
      (23, 'The Truman Show', timestamptz '2026-10-01 19:00:00-03', '2D', 'subtitulada', 6500, 9500),
      (24, 'Shutter Island', timestamptz '2026-10-02 18:00:00-03', '2D', 'castellano', 6500, 9500),
      (25, 'Project Hail Mary', timestamptz '2026-10-03 16:30:00-03', '3D', 'castellano', 8000, 11500),
      (26, 'The Truman Show', timestamptz '2026-10-03 19:30:00-03', '2D', 'castellano', 6500, 9500),
      (27, 'The Truman Show', timestamptz '2026-10-04 16:00:00-03', '2D', 'castellano', 6500, 9500),
      (28, 'The Godfather', timestamptz '2026-10-04 19:00:00-03', '2D', 'subtitulada', 6500, 9500),
      (29, 'The Truman Show', timestamptz '2026-10-05 19:00:00-03', '2D', 'subtitulada', 6500, 9500),
      (30, 'The Truman Show', timestamptz '2026-10-06 18:30:00-03', '2D', 'castellano', 6500, 9500);

  -- Una compra por fila. candy: 'p1x2' es 2 del producto 1, 'c1x1' es 1 del
  -- combo 1 (el número es la posición en la lista de productos o de
  -- combos activos, ordenada por id). El producto 1 es el más vendido.
  create temp table seed_compras (
    n int, funcion int, creado_en timestamptz, medio text, estado text,
    entradas int, vip int, candy text, validada boolean, minutos_antes int,
    entregado boolean
  ) on commit drop;
  insert into seed_compras values
      (1, 1, timestamptz '2026-09-07 14:58:00-03', 'credito', 'pagada', 4, 0, '', true, 15, false),
      (2, 1, timestamptz '2026-09-03 18:41:00-03', 'mercado_pago', 'pagada', 3, 0, 'c2x1,p3x1', true, 22, true),
      (3, 1, timestamptz '2026-09-05 17:14:00-03', 'debito', 'pagada', 4, 4, '', true, 11, false),
      (4, 1, timestamptz '2026-09-07 12:57:00-03', 'mercado_pago', 'pagada', 3, 0, '', false, 18, false),
      (5, 2, timestamptz '2026-09-09 17:25:00-03', 'debito', 'pagada', 1, 0, 'p1x2', true, 25, true),
      (6, 2, timestamptz '2026-09-07 17:58:00-03', 'credito', 'pagada', 2, 0, '', true, 14, false),
      (7, 2, timestamptz '2026-09-09 13:41:00-03', 'mercado_pago', 'pagada', 1, 0, 'p1x2,c1x1', true, 21, true),
      (8, 2, timestamptz '2026-09-09 16:24:00-03', 'debito', 'pagada', 2, 0, '', true, 10, false),
      (9, 2, timestamptz '2026-09-08 22:57:00-03', 'mercado_pago', 'cancelada', 1, 0, '', false, 17, false),
      (10, 2, timestamptz '2026-09-08 17:40:00-03', 'debito', 'pagada', 2, 2, 'p1x2,c1x1', true, 24, true),
      (11, 3, timestamptz '2026-09-11 19:23:00-03', 'credito', 'pagada', 2, 0, '', true, 13, false),
      (12, 3, timestamptz '2026-09-11 16:56:00-03', 'mercado_pago', 'pagada', 1, 0, 'p1x2,p2x1', true, 20, false),
      (13, 3, timestamptz '2026-09-06 21:39:00-03', 'debito', 'pagada', 2, 0, '', false, 9, false),
      (14, 3, timestamptz '2026-09-11 18:22:00-03', 'mercado_pago', 'pagada', 1, 0, '', true, 16, false),
      (15, 4, timestamptz '2026-09-12 10:55:00-03', 'debito', 'pagada', 1, 0, 'p1x2,p2x1', true, 23, false),
      (16, 4, timestamptz '2026-09-08 14:38:00-03', 'credito', 'pagada', 1, 0, '', true, 12, false),
      (17, 4, timestamptz '2026-09-10 12:21:00-03', 'mercado_pago', 'pagada', 1, 1, 'p1x2', true, 19, true),
      (18, 4, timestamptz '2026-09-12 08:54:00-03', 'debito', 'pagada', 1, 0, '', true, 8, false),
      (19, 4, timestamptz '2026-09-11 14:37:00-03', 'mercado_pago', 'pagada', 1, 0, '', true, 15, false),
      (20, 4, timestamptz '2026-09-09 14:20:00-03', 'debito', 'pagada', 1, 0, 'c2x1,p3x1', true, 22, true),
      (21, 4, timestamptz '2026-09-11 10:53:00-03', 'credito', 'pagada', 1, 0, '', true, 11, false),
      (22, 5, timestamptz '2026-09-11 19:06:00-03', 'mercado_pago', 'pagada', 3, 0, 'p1x2,c1x1', false, 18, false),
      (23, 5, timestamptz '2026-09-11 00:49:00-03', 'debito', 'pagada', 1, 0, '', true, 25, false),
      (24, 5, timestamptz '2026-09-10 20:22:00-03', 'mercado_pago', 'pagada', 3, 3, '', true, 14, false),
      (25, 5, timestamptz '2026-09-12 20:05:00-03', 'debito', 'pagada', 1, 0, 'p1x3,c1x1', true, 21, true),
      (26, 5, timestamptz '2026-09-12 16:48:00-03', 'credito', 'pagada', 3, 0, '', true, 10, false),
      (27, 6, timestamptz '2026-09-08 17:51:00-03', 'mercado_pago', 'pagada', 1, 0, 'p1x2,p2x1', true, 17, false),
      (28, 6, timestamptz '2026-09-13 14:34:00-03', 'debito', 'pagada', 1, 0, '', true, 24, false),
      (29, 6, timestamptz '2026-09-13 11:17:00-03', 'mercado_pago', 'pagada', 1, 0, '', true, 13, false),
      (30, 6, timestamptz '2026-09-09 15:50:00-03', 'debito', 'pagada', 1, 0, 'p1x2,p2x1', true, 20, false),
      (31, 6, timestamptz '2026-09-11 13:33:00-03', 'credito', 'cancelada', 1, 1, '', false, 9, false),
      (32, 6, timestamptz '2026-09-13 09:16:00-03', 'mercado_pago', 'pagada', 1, 0, 'c2x1,p3x1', true, 16, true),
      (33, 6, timestamptz '2026-09-12 15:49:00-03', 'debito', 'pagada', 1, 0, '', true, 23, false),
      (34, 7, timestamptz '2026-09-14 17:02:00-03', 'mercado_pago', 'pagada', 3, 0, '', true, 12, false),
      (35, 7, timestamptz '2026-09-16 12:45:00-03', 'debito', 'pagada', 1, 0, 'p1x2', true, 19, true),
      (36, 7, timestamptz '2026-09-16 16:18:00-03', 'credito', 'pagada', 3, 0, '', true, 8, false),
      (37, 8, timestamptz '2026-09-16 00:16:00-03', 'mercado_pago', 'pagada', 4, 0, 'p1x3,c1x1', true, 15, true),
      (38, 8, timestamptz '2026-09-15 18:59:00-03', 'debito', 'pagada', 3, 3, '', true, 22, false),
      (39, 8, timestamptz '2026-09-17 19:32:00-03', 'mercado_pago', 'pagada', 4, 0, '', true, 11, false),
      (40, 8, timestamptz '2026-09-17 16:15:00-03', 'debito', 'pagada', 3, 0, 'p1x2,c1x1', false, 18, false),
      (41, 8, timestamptz '2026-09-12 20:58:00-03', 'credito', 'pagada', 4, 0, '', true, 25, false),
      (42, 9, timestamptz '2026-09-18 17:46:00-03', 'mercado_pago', 'pagada', 2, 0, 'p1x2,p2x1', true, 14, false),
      (43, 9, timestamptz '2026-09-18 14:29:00-03', 'debito', 'pagada', 2, 0, '', true, 21, false),
      (44, 9, timestamptz '2026-09-14 18:12:00-03', 'mercado_pago', 'pagada', 2, 0, '', true, 10, false),
      (45, 9, timestamptz '2026-09-16 16:45:00-03', 'debito', 'pagada', 2, 2, 'p1x2,p2x1', true, 17, false),
      (46, 9, timestamptz '2026-09-18 12:28:00-03', 'credito', 'pagada', 2, 0, '', true, 24, false),
      (47, 9, timestamptz '2026-09-17 18:11:00-03', 'mercado_pago', 'pagada', 2, 0, 'p1x2', true, 13, true),
      (48, 10, timestamptz '2026-09-16 14:14:00-03', 'debito', 'pagada', 2, 0, '', true, 20, false),
      (49, 10, timestamptz '2026-09-18 09:57:00-03', 'mercado_pago', 'pagada', 2, 1, '', false, 9, false),
      (50, 10, timestamptz '2026-09-18 13:30:00-03', 'debito', 'pagada', 2, 0, 'c2x1,p3x1', true, 16, true),
      (51, 10, timestamptz '2026-09-17 19:13:00-03', 'credito', 'pagada', 2, 0, '', true, 23, false),
      (52, 11, timestamptz '2026-09-17 17:26:00-03', 'mercado_pago', 'pagada', 1, 1, 'p1x2,c1x1', true, 12, true),
      (53, 11, timestamptz '2026-09-19 17:59:00-03', 'debito', 'pagada', 3, 0, '', true, 19, false),
      (54, 11, timestamptz '2026-09-19 14:42:00-03', 'mercado_pago', 'pagada', 1, 0, '', true, 8, false),
      (55, 11, timestamptz '2026-09-14 19:25:00-03', 'debito', 'pagada', 3, 0, 'p1x2,c1x1', true, 15, true),
      (56, 11, timestamptz '2026-09-19 16:58:00-03', 'credito', 'pagada', 1, 0, '', true, 22, false),
      (57, 11, timestamptz '2026-09-19 13:41:00-03', 'mercado_pago', 'pagada', 3, 0, 'p1x2,p2x1', true, 11, false),
      (58, 11, timestamptz '2026-09-15 17:24:00-03', 'debito', 'cancelada', 1, 0, '', false, 18, false),
      (59, 12, timestamptz '2026-09-17 18:57:00-03', 'mercado_pago', 'pagada', 2, 2, '', true, 25, false),
      (60, 12, timestamptz '2026-09-19 14:40:00-03', 'debito', 'pagada', 1, 0, 'p1x2,p2x1', true, 14, false),
      (61, 12, timestamptz '2026-09-18 20:23:00-03', 'credito', 'pagada', 2, 0, '', true, 21, false),
      (62, 13, timestamptz '2026-09-17 15:26:00-03', 'mercado_pago', 'pagada', 2, 0, 'c2x1,p3x1', true, 10, true),
      (63, 13, timestamptz '2026-09-19 11:09:00-03', 'debito', 'pagada', 2, 0, '', true, 17, false),
      (64, 13, timestamptz '2026-09-19 13:52:00-03', 'mercado_pago', 'pagada', 2, 0, '', true, 24, false),
      (65, 14, timestamptz '2026-09-18 23:55:00-03', 'debito', 'pagada', 1, 0, 'p1x2', true, 13, true),
      (66, 14, timestamptz '2026-09-18 18:38:00-03', 'credito', 'pagada', 2, 2, '', true, 20, false),
      (67, 14, timestamptz '2026-09-20 18:21:00-03', 'mercado_pago', 'pagada', 1, 0, 'p1x2,c1x1', false, 9, false),
      (68, 14, timestamptz '2026-09-20 15:54:00-03', 'debito', 'pagada', 2, 0, '', true, 16, false),
      (69, 14, timestamptz '2026-09-15 20:37:00-03', 'mercado_pago', 'pagada', 1, 0, '', true, 23, false),
      (70, 15, timestamptz '2026-09-24 14:50:00-03', 'debito', 'pagada', 3, 0, 'p1x2,c1x1', true, 12, true),
      (71, 15, timestamptz '2026-09-24 12:23:00-03', 'credito', 'pagada', 1, 0, '', true, 19, false),
      (72, 15, timestamptz '2026-09-20 16:06:00-03', 'mercado_pago', 'pagada', 3, 0, 'p1x2,p2x1', true, 8, false),
      (73, 16, timestamptz '2026-09-22 15:49:00-03', 'debito', 'pagada', 4, 4, '', true, 15, false),
      (74, 16, timestamptz '2026-09-24 12:22:00-03', 'mercado_pago', 'pagada', 3, 0, '', true, 22, false),
      (75, 16, timestamptz '2026-09-23 18:05:00-03', 'debito', 'pagada', 4, 0, 'p1x2,p2x1', true, 11, false),
      (76, 16, timestamptz '2026-09-21 17:48:00-03', 'credito', 'pagada', 3, 0, '', false, 18, false),
      (77, 16, timestamptz '2026-09-23 14:21:00-03', 'mercado_pago', 'pagada', 4, 0, 'p1x2', true, 25, true),
      (78, 17, timestamptz '2026-09-25 12:34:00-03', 'debito', 'pagada', 2, 0, '', true, 14, false),
      (79, 17, timestamptz '2026-09-24 18:17:00-03', 'mercado_pago', 'pagada', 2, 0, '', true, 21, false),
      (80, 17, timestamptz '2026-09-24 13:50:00-03', 'debito', 'pagada', 2, 2, 'c2x1,p3x1', true, 10, true),
      (81, 17, timestamptz '2026-09-26 13:33:00-03', 'credito', 'pagada', 2, 0, '', true, 17, false),
      (82, 17, timestamptz '2026-09-26 10:16:00-03', 'mercado_pago', 'pagada', 2, 1, 'p1x2,c1x1', true, 24, true),
      (83, 17, timestamptz '2026-09-21 15:49:00-03', 'debito', 'cancelada', 2, 0, '', false, 13, false),
      (84, 18, timestamptz '2026-09-26 19:17:00-03', 'mercado_pago', 'pagada', 2, 0, '', true, 20, false),
      (85, 18, timestamptz '2026-09-26 16:00:00-03', 'debito', 'pagada', 2, 0, 'p1x3,c1x1', false, 9, false),
      (86, 18, timestamptz '2026-09-22 20:33:00-03', 'credito', 'pagada', 2, 0, '', true, 16, false),
      (87, 19, timestamptz '2026-09-25 12:31:00-03', 'mercado_pago', 'pagada', 1, 1, 'p1x2,p2x1', true, 23, false),
      (88, 19, timestamptz '2026-09-27 08:14:00-03', 'debito', 'pagada', 1, 0, '', true, 12, false),
      (89, 19, timestamptz '2026-09-26 14:47:00-03', 'mercado_pago', 'pagada', 1, 0, '', true, 19, false),
      (90, 19, timestamptz '2026-09-24 14:30:00-03', 'debito', 'pagada', 1, 0, 'p1x2,p2x1', true, 8, false),
      (91, 20, timestamptz '2026-09-27 13:13:00-03', 'credito', 'pagada', 3, 0, '', true, 15, false),
      (92, 20, timestamptz '2026-09-27 16:46:00-03', 'mercado_pago', 'pagada', 4, 0, 'c2x1,p3x1', true, 22, true),
      (93, 20, timestamptz '2026-09-26 22:29:00-03', 'debito', 'pagada', 3, 1, '', true, 11, false),
      (94, 20, timestamptz '2026-09-26 17:12:00-03', 'mercado_pago', 'pagada', 4, 4, '', false, 18, false),
      (95, 20, timestamptz '2026-09-28 17:45:00-03', 'debito', 'pagada', 3, 0, 'p1x2', true, 25, true),
      (96, 20, timestamptz '2026-09-28 14:28:00-03', 'credito', 'pagada', 4, 0, '', true, 14, false),
      (97, 21, timestamptz '2026-09-24 18:41:00-03', 'mercado_pago', 'pagada', 4, 0, 'p1x3,c1x1', true, 21, true),
      (98, 21, timestamptz '2026-09-29 16:14:00-03', 'debito', 'pagada', 3, 0, '', true, 10, false),
      (99, 21, timestamptz '2026-09-29 12:57:00-03', 'mercado_pago', 'pagada', 4, 0, '', true, 17, false),
      (100, 21, timestamptz '2026-09-25 17:30:00-03', 'debito', 'pagada', 3, 0, 'p1x2,c1x1', true, 24, true),
      (101, 21, timestamptz '2026-09-27 15:13:00-03', 'credito', 'pagada', 4, 4, '', true, 13, false),
      (102, 21, timestamptz '2026-09-29 10:56:00-03', 'mercado_pago', 'pagada', 3, 0, 'p1x2,p2x1', true, 20, false),
      (103, 22, timestamptz '2026-09-29 17:59:00-03', 'debito', 'pagada', 3, 0, '', false, 9, false),
      (104, 22, timestamptz '2026-09-27 17:42:00-03', 'mercado_pago', 'pagada', 4, 1, '', true, 16, false),
      (105, 22, timestamptz '2026-09-29 13:25:00-03', 'debito', 'pagada', 3, 0, 'p1x2,p2x1', true, 23, false),
      (106, 22, timestamptz '2026-09-29 16:58:00-03', 'credito', 'pagada', 4, 0, '', true, 12, false),
      (107, 22, timestamptz '2026-09-28 22:41:00-03', 'mercado_pago', 'cancelada', 3, 0, 'p1x2', false, 19, false),
      (108, 22, timestamptz '2026-09-28 17:24:00-03', 'debito', 'pagada', 4, 4, '', true, 8, false),
      (109, 23, timestamptz '2026-10-01 16:57:00-03', 'mercado_pago', 'pagada', 4, 0, '', true, 15, false),
      (110, 23, timestamptz '2026-10-01 13:40:00-03', 'debito', 'pagada', 3, 0, 'c2x1,p3x1', true, 22, true),
      (111, 23, timestamptz '2026-09-26 18:23:00-03', 'credito', 'pagada', 4, 0, '', true, 11, false),
      (112, 23, timestamptz '2026-10-01 15:56:00-03', 'mercado_pago', 'pagada', 3, 0, 'p1x2,c1x1', false, 18, false),
      (113, 23, timestamptz '2026-10-01 12:39:00-03', 'debito', 'pagada', 4, 0, '', true, 25, false),
      (114, 24, timestamptz '2026-09-28 15:22:00-03', 'mercado_pago', 'pagada', 2, 0, '', true, 14, false),
      (115, 24, timestamptz '2026-09-30 13:55:00-03', 'debito', 'pagada', 2, 2, 'p1x2,c1x1', true, 21, true),
      (116, 25, timestamptz '2026-10-03 08:08:00-03', 'credito', 'pagada', 2, 0, '', true, 10, false),
      (117, 25, timestamptz '2026-10-02 13:51:00-03', 'mercado_pago', 'pagada', 2, 0, 'p1x2,p2x1', true, 17, false),
      (118, 25, timestamptz '2026-09-30 14:24:00-03', 'debito', 'pagada', 2, 0, '', true, 24, false),
      (119, 25, timestamptz '2026-10-02 10:07:00-03', 'mercado_pago', 'pagada', 2, 0, '', true, 13, false),
      (120, 26, timestamptz '2026-10-02 15:50:00-03', 'debito', 'pagada', 2, 0, 'p1x2,p2x1', true, 20, false),
      (121, 26, timestamptz '2026-10-01 22:23:00-03', 'credito', 'pagada', 2, 0, '', false, 9, false),
      (122, 26, timestamptz '2026-10-01 17:06:00-03', 'mercado_pago', 'pagada', 2, 2, 'c2x1,p3x1', true, 16, true),
      (123, 26, timestamptz '2026-10-03 16:49:00-03', 'debito', 'pagada', 2, 0, '', true, 23, false),
      (124, 26, timestamptz '2026-10-03 14:22:00-03', 'mercado_pago', 'pagada', 2, 0, '', true, 12, false),
      (125, 27, timestamptz '2026-09-29 15:35:00-03', 'debito', 'pagada', 1, 0, 'p1x2', true, 19, true),
      (126, 27, timestamptz '2026-10-04 12:18:00-03', 'credito', 'cancelada', 2, 1, '', false, 8, false),
      (127, 27, timestamptz '2026-10-04 09:51:00-03', 'mercado_pago', 'pagada', 1, 0, 'p1x2,c1x1', true, 15, true),
      (128, 27, timestamptz '2026-09-30 13:34:00-03', 'debito', 'pagada', 2, 0, '', true, 22, false),
      (129, 28, timestamptz '2026-10-02 14:17:00-03', 'mercado_pago', 'pagada', 1, 1, '', true, 11, false),
      (130, 28, timestamptz '2026-10-04 10:50:00-03', 'debito', 'pagada', 1, 0, 'p1x2,c1x1', false, 18, false),
      (131, 28, timestamptz '2026-10-03 16:33:00-03', 'credito', 'pagada', 1, 0, '', true, 25, false),
      (132, 28, timestamptz '2026-10-01 16:16:00-03', 'mercado_pago', 'pagada', 1, 0, 'p1x2,p2x1', true, 14, false),
      (133, 28, timestamptz '2026-10-03 12:49:00-03', 'debito', 'pagada', 1, 0, '', true, 21, false),
      (134, 29, timestamptz '2026-10-04 15:32:00-03', 'mercado_pago', 'pagada', 2, 0, '', true, 10, false),
      (135, 29, timestamptz '2026-10-03 21:15:00-03', 'debito', 'pagada', 2, 0, 'p1x2,p2x1', true, 17, false),
      (136, 29, timestamptz '2026-10-03 16:48:00-03', 'credito', 'pagada', 2, 2, '', true, 24, false),
      (137, 29, timestamptz '2026-10-05 16:31:00-03', 'mercado_pago', 'pagada', 2, 1, 'p1x2', true, 13, true),
      (138, 29, timestamptz '2026-10-05 13:14:00-03', 'debito', 'pagada', 2, 0, '', true, 20, false),
      (139, 30, timestamptz '2026-10-01 18:17:00-03', 'mercado_pago', 'pagada', 3, 0, '', false, 9, false),
      (140, 30, timestamptz '2026-10-06 15:00:00-03', 'debito', 'pagada', 4, 0, 'c2x1,p3x1', true, 16, true),
      (141, 30, timestamptz '2026-10-06 11:43:00-03', 'credito', 'pagada', 3, 0, '', true, 23, false),
      (142, 30, timestamptz '2026-10-02 16:16:00-03', 'mercado_pago', 'pagada', 4, 0, 'p1x2,c1x1', true, 12, true),
      (143, 30, timestamptz '2026-10-04 13:59:00-03', 'debito', 'pagada', 3, 3, '', true, 19, false);

  -- Reseñas: el cliente es la posición en v_clientes (1 = cliente@olympia.test).
  create temp table seed_resenias (
    cliente int, pelicula text, estrellas int, comentario text
  ) on commit drop;
  insert into seed_resenias values
      (1, 'The Godfather', 5, 'Una obra maestra. Tres horas que se pasan volando, Brando está impresionante.'),
      (2, 'The Godfather', 5, 'La había visto en la tele, pero en pantalla grande es otra cosa. Imperdible.'),
      (3, 'The Godfather', 4, 'Larga pero vale cada minuto. El sonido de la sala, de diez.'),
      (4, 'The Godfather', 5, 'Clásico absoluto. Salimos todos hablando de la escena del bautismo.'),
      (5, 'The Godfather', 4, 'Muy buena. Un poco lenta al principio, después no podés dejar de mirarla.'),
      (6, 'The Godfather', 5, 'Fui con mi viejo y lloramos los dos. Gracias por traerla de nuevo.'),
      (1, 'Project Hail Mary', 5, 'Me encantó. Ciencia ficción con humor y corazón, y Rocky es lo más.'),
      (2, 'Project Hail Mary', 4, 'Muy entretenida. El 3D suma bastante en las escenas del espacio.'),
      (3, 'Project Hail Mary', 5, 'Salí con una sonrisa enorme. Ideal para ver con amigos.'),
      (5, 'Project Hail Mary', 4, 'Buenísima, aunque el final se estira un poquito.'),
      (6, 'Project Hail Mary', 5, 'De lo mejor del año. El libro era genial y la peli le hace justicia.'),
      (1, 'Shutter Island', 4, 'Te tiene atrapado todo el tiempo. El giro final me voló la cabeza.'),
      (2, 'Shutter Island', 3, 'Bien actuada, pero adiviné el final a la mitad.'),
      (4, 'Shutter Island', 4, 'Atmósfera densa y DiCaprio enorme. Para ver con atención.'),
      (5, 'Shutter Island', 5, 'Me quedé pensando en ella toda la semana. Hay que verla dos veces.'),
      (6, 'Shutter Island', 3, 'Interesante, aunque un poco larga para mi gusto.'),
      (1, 'The Truman Show', 5, 'Tierna y triste a la vez. Jim Carrey como nunca lo habías visto.'),
      (3, 'The Truman Show', 4, 'Sigue vigente después de tantos años. Muy recomendable.'),
      (4, 'The Truman Show', 5, 'Hermosa. El final en el barco me partió el alma.'),
      (5, 'The Truman Show', 4, 'Linda para ir en familia. Los chicos se engancharon.'),
      (6, 'The Truman Show', 4, 'Divertida y con mensaje. La sala estaba llena y se notaba.'),
      (1, 'A Nightmare on Elm Street', 3, 'Da miedo, pero algunos efectos quedaron viejos.'),
      (2, 'A Nightmare on Elm Street', 2, 'No es lo mío. Me tapé los ojos media película.'),
      (3, 'A Nightmare on Elm Street', 4, 'Freddy sigue siendo el mejor. La función de trasnoche, ideal.'),
      (4, 'A Nightmare on Elm Street', 3, 'Correcta. Esperaba más sustos.'),
      (6, 'A Nightmare on Elm Street', 4, 'Clásico del terror. Fui con amigas y gritamos todas.');

  -- El pedido completo, pasadas y futuras, con la función ya resuelta.
  create temp table seed_pedidos (
    codigo text, cliente int, funcion_id bigint, creado_en timestamptz,
    medio text, estado text, entradas int, vip int, candy text,
    validada boolean, minutos_antes int, entregado boolean
  ) on commit drop;

  -- ----- Quiénes compran -----
  -- El cliente de los accesos rápidos primero, y después los de prueba.
  select array_agg(id order by (email = 'cliente@olympia.test') desc, email)
    into v_clientes
  from public."Usuarios"
  where rol = 'cliente'
    and (email = 'cliente@olympia.test' or lower(email) like '%+%@gmail.com');

  -- Los 5 de prueba los deja 3.1, con rol cliente. Si no están los 5, es
  -- que 3.1 no se corrió o cortó con un error.
  if (select count(*) from public."Usuarios"
      where rol = 'cliente' and lower(email) like '%+%@gmail.com') < 5 then
    raise exception 'Faltan los perfiles de los 5 clientes de prueba con rol cliente: corré primero la 3.1.';
  end if;

  select id into v_empleado from public."Usuarios" where email = 'empleado@olympia.test';

  -- Productos y combos que se pueden vender. Los combos con entrada no se
  -- usan: cubren una butaca (D-46) y complicarían el total.
  select array_agg(id order by id) into v_productos
  from public."ProductosCandy" where activo and not es_combo;
  select array_agg(id order by id) into v_combos
  from public."ProductosCandy" where activo and es_combo and not incluye_entrada;

  -- ----- Limpieza de la corrida anterior, en orden de claves foráneas -----
  -- 1. Las butacas de las compras pagadas del seed (no tienen compra_id).
  delete from public."ButacasOcupadas" bo
  using public."Entradas" e
  join public."Compras" c on c.id = e.compra_id
  where c.codigo like 'OLY-SEED-%'
    and c.estado = 'pagada'
    and bo.funcion_id = e.funcion_id
    and bo.fila = e.fila
    and bo.numero = e.numero;

  -- 2. Las compras; Entradas e ItemsCandy se van con ellas (cascade).
  delete from public."Compras" where codigo like 'OLY-SEED-%';

  -- 3. Las reseñas del seed.
  delete from public."Resenias" re
  using seed_resenias s
  where re.usuario_id = any (v_clientes)
    and re.comentario = s.comentario;

  -- 4. Las funciones del seed. Si alguien compró en una (no debería: ya
  --    pasaron), se deja, porque Entradas no tiene cascade.
  delete from public."Funciones" f
  where f.creado_en = v_marca
    and not exists (select 1 from public."Entradas" e where e.funcion_id = f.id);

  -- ----- Funciones pasadas -----
  -- La sala no está fija: se elige la primera libre, con la misma cuenta
  -- que el trigger (fin de la otra función + 30 minutos). El orden de las
  -- salas rota con n para que no caigan todas en la misma.
  create temp table seed_funcion_ids (n int, funcion_id bigint) on commit drop;

  for r in select * from seed_funciones order by n loop
    select p.id, p.duracion_minutos, p.fecha_estreno into v_pel, v_dur, v_estreno
    from public."Peliculas" p
    where p.nombre = r.pelicula
    order by p.id
    limit 1;

    if v_pel is null or (r.fecha_hora at time zone v_ar)::date < v_estreno then
      v_saltadas := v_saltadas + 1;
      continue;
    end if;

    v_sala := null;
    select s.id into v_sala
    from public."Salas" s
    where s.activa
      and not exists (
        select 1
        from public."Funciones" f
        join public."Peliculas" p on p.id = f.pelicula_id
        where f.sala_id = s.id
          and r.fecha_hora < f.fecha_hora + (p.duracion_minutos + 30) * interval '1 minute'
          and f.fecha_hora < r.fecha_hora + (v_dur + 30) * interval '1 minute'
      )
    order by (s.id + r.n) % 5, s.id
    limit 1;

    if v_sala is null then
      v_saltadas := v_saltadas + 1;
      continue;
    end if;

    insert into public."Funciones"
      (pelicula_id, sala_id, fecha_hora, formato, idioma, precio_base, precio_vip, creado_en)
    values
      (v_pel, v_sala, r.fecha_hora, r.formato, r.idioma, r.precio_base, r.precio_vip, v_marca)
    returning id into v_fid;

    insert into seed_funcion_ids values (r.n, v_fid);
  end loop;

  -- Las compras de las funciones pasadas. Las de una función salteada no
  -- se crean.
  insert into seed_pedidos
  select 'OLY-SEED-' || lpad(c.n::text, 4, '0'), c.n, fi.funcion_id, c.creado_en,
         c.medio, c.estado, c.entradas, c.vip, c.candy, c.validada,
         c.minutos_antes, c.entregado
  from seed_compras c
  join seed_funcion_ids fi on fi.n = c.funcion;

  -- ----- Compras de funciones futuras que ya existen -----
  -- Solo de funciones que todavía no empezaron y cuya venta ya abrió
  -- (D-39: 7 días antes del estreno con preventa, el día del estreno sin
  -- ella), igual que lo que permite realizar_compra. Se reparten de a una
  -- por función, empezando por las más próximas.
  select array_agg(f.id order by f.fecha_hora, f.id) into v_futuras
  from public."Funciones" f
  join public."Peliculas" p on p.id = f.pelicula_id
  where f.fecha_hora > now() + interval '3 hours'
    and p.visible
    and v_hoy >= p.fecha_estreno - case when p.preventa_habilitada then 7 else 0 end;

  if v_futuras is not null then
    insert into seed_pedidos
    select 'OLY-SEED-' || lpad((900 + i)::text, 4, '0'),
           i,
           v_futuras[1 + (i - 1) % array_length(v_futuras, 1)],
           -- Compradas en los últimos días, nunca en el futuro.
           now() - (i * 4 + 1) * interval '1 hour',
           (array['debito','credito','mercado_pago'])[1 + i % 3],
           'pagada',
           1 + i % 3,                                    -- 1 a 3 entradas
           case when i % 5 = 0 then 1 else 0 end,        -- alguna VIP
           case when i % 3 = 0 then 'p1x1,c1x1' when i % 4 = 1 then 'p1x2' else '' end,
           false, 0, false
    from generate_series(1, 16) i;
  end if;

  -- ----- Alta de cada compra -----
  for r in select * from seed_pedidos order by codigo loop
    select f.fecha_hora, f.precio_base, f.precio_vip,
           p.fecha_estreno, p.preventa_habilitada, p.precio_preventa
      into v_fecha, v_base, v_vip, v_estreno, v_preventa, v_p_preventa
    from public."Funciones" f
    join public."Peliculas" p on p.id = f.pelicula_id
    where f.id = r.funcion_id;

    -- Butaca común: el precio base, o el de preventa si la función es de
    -- una película que todavía no se estrenó y tiene preventa (D-39). La
    -- VIP siempre a precio VIP.
    v_comun := case
      when v_preventa and v_hoy < v_estreno and v_p_preventa is not null then v_p_preventa
      else v_base
    end;

    -- Los clientes se turnan.
    v_usuario := v_clientes[1 + r.cliente % array_length(v_clientes, 1)];
    select email into v_email from public."Usuarios" where id = v_usuario;

    insert into public."Compras"
      (usuario_id, email, codigo, total, medio_pago, estado,
       entrada_validada_en, entrada_validada_por, creado_en)
    values
      (v_usuario, v_email, r.codigo, 0, r.medio, r.estado,
       case when r.validada then v_fecha - r.minutos_antes * interval '1 minute' end,
       case when r.validada then v_empleado end,
       r.creado_en)
    returning id into v_cid;

    -- Las butacas: las primeras libres de la función, del centro hacia
    -- afuera. Libre es que no esté en ButacasOcupadas; una compra
    -- cancelada no ocupa su butaca (cancelar_compra la libera), así que
    -- solo las pagadas la anotan.
    for b in
      (select x.fila, x.numero, true as es_vip
       from (select fv.fila, fv.orden, n.numero
             from unnest(v_filas_vip) with ordinality fv(fila, orden),
                  generate_series(1, 28) n(numero)) x
       where not exists (select 1 from public."ButacasOcupadas" o
                         where o.funcion_id = r.funcion_id
                           and o.fila = x.fila and o.numero = x.numero)
       order by x.orden, abs(x.numero - 14.5), x.numero
       limit r.vip)
      union all
      (select x.fila, x.numero, false
       from (select fc.fila, fc.orden, n.numero
             from unnest(v_filas) with ordinality fc(fila, orden),
                  generate_series(1, 28) n(numero)) x
       where not exists (select 1 from public."ButacasOcupadas" o
                         where o.funcion_id = r.funcion_id
                           and o.fila = x.fila and o.numero = x.numero)
       order by x.orden, abs(x.numero - 14.5), x.numero
       limit r.entradas - r.vip)
    loop
      insert into public."Entradas" (compra_id, funcion_id, fila, numero, es_vip, precio)
      values (v_cid, r.funcion_id, b.fila, b.numero, b.es_vip,
              case when b.es_vip then v_vip else v_comun end);

      if r.estado = 'pagada' then
        insert into public."ButacasOcupadas" (funcion_id, fila, numero)
        values (r.funcion_id, b.fila, b.numero);
      end if;
    end loop;

    -- El candy, al precio actual de cada producto.
    v_con_candy := false;
    if r.candy <> '' then
      foreach v_item in array string_to_array(r.candy, ',') loop
        v_prod := null;
        if left(v_item, 1) = 'p' and v_productos is not null then
          v_prod := v_productos[1 + (split_part(substr(v_item, 2), 'x', 1)::int - 1)
                                    % array_length(v_productos, 1)];
        elsif left(v_item, 1) = 'c' and v_combos is not null then
          v_prod := v_combos[1 + (split_part(substr(v_item, 2), 'x', 1)::int - 1)
                                 % array_length(v_combos, 1)];
        end if;

        if v_prod is not null then
          insert into public."ItemsCandy" (compra_id, producto_id, cantidad, precio_unitario)
          select v_cid, pc.id, split_part(v_item, 'x', 2)::int, pc.precio
          from public."ProductosCandy" pc
          where pc.id = v_prod;
          v_con_candy := true;
        end if;
      end loop;
    end if;

    -- El total es entradas + candy (sin cupón ni crédito), y el candy se
    -- marca entregado solo si la compra tiene candy.
    update public."Compras" c
    set total = coalesce((select sum(e.precio) from public."Entradas" e
                          where e.compra_id = v_cid), 0)
              + coalesce((select sum(i.cantidad * i.precio_unitario)
                          from public."ItemsCandy" i where i.compra_id = v_cid), 0),
        candy_entregado_en  = case when r.entregado and v_con_candy
                                   then v_fecha - interval '5 minutes' end,
        candy_entregado_por = case when r.entregado and v_con_candy then v_empleado end
    where c.id = v_cid;
  end loop;

  -- ----- Reseñas -----
  -- La fecha es unos días después del estreno, y nunca en el futuro. on
  -- conflict: si ese cliente ya había reseñado la película desde la app,
  -- se respeta la suya.
  insert into public."Resenias" (usuario_id, pelicula_id, estrellas, comentario, creado_en)
  select v_clientes[s.cliente], p.id, s.estrellas, s.comentario,
         least(
           ((p.fecha_estreno + 2 + (s.cliente * 3 + length(s.comentario)) % 12)
             + time '22:40') at time zone v_ar,
           now() - interval '1 hour')
  from seed_resenias s
  join lateral (select pe.id, pe.fecha_estreno from public."Peliculas" pe
                where pe.nombre = s.pelicula order by pe.id limit 1) p on true
  where s.cliente <= array_length(v_clientes, 1)
  on conflict (usuario_id, pelicula_id) do nothing;

  raise notice 'Seed: % clientes, % funciones salteadas, % compras.',
    array_length(v_clientes, 1), v_saltadas,
    (select count(*) from public."Compras" where codigo like 'OLY-SEED-%');
end;
$$;


-- ---------- 3.3 Verificación ----------

-- Clientes que usa el seed: tiene que mostrar 6 filas.
select email, nombre, apellido, rol
from public."Usuarios"
where rol = 'cliente'
  and (email = 'cliente@olympia.test' or lower(email) like '%+%@gmail.com')
order by email;

-- Cantidades del seed. Esperado, si no se salteó nada: 30 funciones
-- pasadas, 143 compras pasadas + 16 futuras, 6 canceladas, menos de 400
-- entradas (unas 350), unos 115 ItemsCandy y 26 reseñas.
select
  (select count(*) from public."Funciones" where creado_en = '2026-09-01 00:00:00-03')
    as funciones_pasadas,
  (select count(*) from public."Compras" where codigo like 'OLY-SEED-%')
    as compras,
  (select count(*) from public."Compras" where codigo like 'OLY-SEED-%' and estado = 'cancelada')
    as canceladas,
  (select count(*) from public."Entradas" e join public."Compras" c on c.id = e.compra_id
    where c.codigo like 'OLY-SEED-%') as entradas,
  (select count(*) from public."ItemsCandy" i join public."Compras" c on c.id = i.compra_id
    where c.codigo like 'OLY-SEED-%') as items_candy,
  (select count(*) from public."Resenias" r join public."Usuarios" u on u.id = r.usuario_id
    where u.email = 'cliente@olympia.test' or lower(u.email) like '%+%@gmail.com') as resenias,
  (select count(*) from public."Entradas") as entradas_en_toda_la_base;

-- Facturación por día de los últimos 30 días, como el reporte (D-56): lo
-- cobrado con el medio de pago (total − crédito usado), por día de compra
-- en hora argentina, con las canceladas incluidas.
select (c.creado_en at time zone 'America/Argentina/Buenos_Aires')::date as dia,
       count(*) filter (where c.estado = 'pagada') as compras_no_canceladas,
       sum(c.total - c.credito_usado) as facturado
from public."Compras" c
where c.creado_en >= now() - interval '30 days'
group by 1
order by 1;

-- Más vistas (D-56): entradas de compras no canceladas con la función ya
-- ocurrida. Tiene que haber una película claramente primera.
select p.nombre, count(*) as entradas_vistas
from public."Entradas" e
join public."Compras" c on c.id = e.compra_id
join public."Funciones" f on f.id = e.funcion_id
join public."Peliculas" p on p.id = f.pelicula_id
where c.estado = 'pagada' and f.fecha_hora <= now()
group by p.nombre
order by entradas_vistas desc;
