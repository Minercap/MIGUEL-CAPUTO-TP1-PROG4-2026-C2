-- ============================================================
-- Olympia Cinema — datos iniciales de películas
-- TP 1 · Programación IV · 2026 C2
--
-- Se corre UNA sola vez desde el SQL Editor de Supabase, después de
-- schema.sql (necesita las tablas y los 15 géneros ya cargados).
-- Si se corre dos veces, las películas quedan duplicadas.
--
-- Los pósters ya están subidos al bucket público "peliculas", en la
-- carpeta "seed". La imagen_url es la URL pública de cada archivo:
--   <SUPABASE_URL>/storage/v1/object/public/peliculas/seed/<archivo>
--
-- No escribe en LogActividad: son datos de arranque, no acciones que
-- haya hecho un administrador desde la app.
-- ============================================================

-- ---------- 1. Películas ----------
-- Cinco en cartelera y dos en Próximamente:
--   Resident Evil  estrena el 08/10 con preventa habilitada, para que la
--                  ventana de preventa esté abierta el día de la entrega (R-11).
--   The Uprising   estrena el 29/10 sin preventa: es el caso contrario.
-- El id y creado_en no se cargan: los pone la base.

insert into public."Peliculas"
  (nombre, sinopsis, imagen_url, duracion_minutos, restriccion_edad,
   fecha_estreno, en_cartelera, proximamente, preventa_habilitada, precio_preventa)
values
  ('A Nightmare on Elm Street',
   'Un grupo de adolescentes descubre que comparte la misma pesadilla: un hombre con el rostro quemado y una garra de cuchillas. Lo que les pase mientras duermen no se queda en el sueño.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/a-nightmare-on-elm-street.webp',
   91, 18, '2026-09-03', true, false, false, null),

  ('Project Hail Mary',
   'Un profesor de ciencias despierta solo en una nave, a años luz de casa y sin recordar cómo llegó. De a poco entiende que es la última oportunidad de salvar al Sol, y que no es el único que busca una respuesta.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/project-hail-mary.webp',
   156, 13, '2026-09-10', true, false, false, null),

  ('Shutter Island',
   'Dos agentes llegan a un hospital psiquiátrico aislado en una isla para investigar la desaparición de una paciente. Cuanto más pregunta, menos confía uno de ellos en lo que ve y en lo que recuerda.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/shutter-island.webp',
   138, 13, '2026-09-17', true, false, false, null),

  ('The Godfather',
   'El hijo menor de una poderosa familia mafiosa de Nueva York quería mantenerse al margen del negocio. Un atentado contra su padre lo obliga a elegir entre la vida que planeaba y la lealtad a los suyos.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/the-godfather.webp',
   175, 18, '2026-09-24', true, false, false, null),

  ('The Truman Show',
   'Truman lleva una vida tranquila en un pueblo perfecto, sin saber que cada minuto se transmite en vivo a todo el mundo. Una serie de detalles que no encajan lo empuja a buscar el borde de su mundo.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/the-truman-show.webp',
   103, null, '2026-10-01', true, false, false, null),

  ('Resident Evil',
   'Un brote fuera de control convierte una ciudad entera en una trampa. Quienes quedan adentro tienen una sola noche para encontrar la salida antes de que no quede nadie a quien salvar.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/resident-evil.webp',
   100, 18, '2026-10-08', false, true, true, 8000.00),

  ('The Uprising',
   'Cuando el abuso del poder se vuelve insoportable, un pueblo sin armas ni líderes decide dejar de obedecer. Lo que empieza como una protesta termina poniendo en juego mucho más que sus vidas.',
   'https://umeichvxafgzvholvqce.supabase.co/storage/v1/object/public/peliculas/seed/the-uprising.webp',
   120, 13, '2026-10-29', false, true, false, null);


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
