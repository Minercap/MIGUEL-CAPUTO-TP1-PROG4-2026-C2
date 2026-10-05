-- ============================================================
-- Olympia Cinema — esquema de base de datos
-- TP 1 · Programación IV · 2026 C2
--
-- Se corre completo desde el SQL Editor de Supabase (decisión D-11).
-- Deriva de docs/modelo-datos.md. Cada tabla indica qué requisitos cubre.
--
-- Orden del script:
--   1. Tablas
--   2. Función de rol (D-12), después de las tablas porque lee Usuarios
--   3. RLS y políticas
--   4. Permisos de columna sobre Usuarios
--   5. Datos iniciales (géneros, D-15)
--   6. Storage: bucket de pósters y sus políticas
--   7. Correcciones del 01/10: roles separados (D-24), campos
--      obligatorios y constraints check (docs/validaciones.md)
--   8. Estado de la película: una sola columna "visible" (D-27)
--   9. Salas y funciones: reglas de contenido, trigger de superposición
--      y de estreno, y fechas en hora argentina (D-28, D-29).
--      La 9.6 vuelve a aplicar la sección 7 sobre la base viva, donde no
--      se había corrido.
--  10. Cartelera: vista de las películas más vendidas (D-31)
--  11. Compra: ButacasOcupadas y la función realizar_compra (D-38, D-39)
-- ============================================================

-- ============================================================
-- 1. TABLAS
-- ============================================================

-- ---------- Usuarios (R-01, R-03, R-27, R-30) ----------
-- El id es el mismo uuid de Supabase Auth (patrón de la clase 7).
-- El registro se crea desde la app después del signUp.

create table public."Usuarios" (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  nombre            text not null,
  apellido          text not null,
  fecha_nacimiento  date not null,
  tipo_sangre       text,
  color_ojos        text,
  dias_vacaciones   int,
  rol               text not null default 'cliente'
                    check (rol in ('admin', 'empleado', 'cliente')),
  puntos            int not null default 0,
  credito           numeric(12,2) not null default 0,
  creado_en         timestamptz not null default now()
);

-- ---------- Películas y géneros (R-04, R-05, R-07, R-10, R-11) ----------

create table public."Peliculas" (
  id                   bigint generated always as identity primary key,
  nombre               text not null,
  sinopsis             text,
  imagen_url           text,
  duracion_minutos     int not null,
  restriccion_edad     int check (restriccion_edad in (13, 18)),
  fecha_estreno        date,
  -- OJO: en_cartelera y proximamente se reemplazan por "visible" en la
  -- sección 8 (D-27). Las de acá son las columnas originales.
  en_cartelera         boolean not null default false,
  proximamente         boolean not null default false,
  preventa_habilitada  boolean not null default false,
  precio_preventa      numeric(12,2),
  creado_en            timestamptz not null default now()
);

create table public."Generos" (
  id      bigint generated always as identity primary key,
  nombre  text not null unique
);

create table public."PeliculasGeneros" (
  pelicula_id  bigint not null references public."Peliculas"(id) on delete cascade,
  genero_id    bigint not null references public."Generos"(id) on delete cascade,
  primary key (pelicula_id, genero_id)
);

-- ---------- Salas y funciones (R-13, R-14, R-17, R-18, R-19) ----------
-- Salas no guarda butacas: la forma es fija para todas y vive en el
-- front como constante (decisión D-07).

create table public."Salas" (
  id      bigint generated always as identity primary key,
  nombre  text not null,
  activa  boolean not null default true
);

create table public."Funciones" (
  id           bigint generated always as identity primary key,
  pelicula_id  bigint not null references public."Peliculas"(id),
  sala_id      bigint not null references public."Salas"(id),
  fecha_hora   timestamptz not null,
  formato      text not null check (formato in ('2D', '3D', '4D', '5D')),
  idioma       text not null check (idioma in ('castellano', 'subtitulada')),
  precio_base  numeric(12,2) not null,
  precio_vip   numeric(12,2) not null,
  creado_en    timestamptz not null default now()
);

-- ---------- Candy bar (R-21, R-22) ----------

create table public."CategoriasCandy" (
  id      bigint generated always as identity primary key,
  nombre  text not null
);

create table public."ProductosCandy" (
  id            bigint generated always as identity primary key,
  categoria_id  bigint not null references public."CategoriasCandy"(id),
  nombre        text not null,
  precio        numeric(12,2) not null,
  imagen_url    text,
  activo        boolean not null default true
);

create table public."Combos" (
  id               bigint generated always as identity primary key,
  nombre           text not null,
  precio           numeric(12,2) not null,
  incluye_entrada  boolean not null default false,
  activo           boolean not null default true
);

create table public."CombosProductos" (
  combo_id     bigint not null references public."Combos"(id) on delete cascade,
  producto_id  bigint not null references public."ProductosCandy"(id),
  cantidad     int not null default 1,
  primary key (combo_id, producto_id)
);

-- ---------- Beneficios (R-23, R-24, R-28) ----------
-- Modelo único de cupón, con porcentaje configurable (decisión D-05).

create table public."Cupones" (
  id          bigint generated always as identity primary key,
  nombre      text not null,
  porcentaje  int not null check (porcentaje between 1 and 100),
  condicion   text not null check (condicion in ('primera_compra', 'mayor_50')),
  activo      boolean not null default true
);

create table public."Recompensas" (
  id            bigint generated always as identity primary key,
  tipo          text not null check (tipo in ('entrada', 'producto')),
  producto_id   bigint references public."ProductosCandy"(id),
  costo_puntos  int not null,
  activa        boolean not null default true
);

-- ---------- Compra (R-02, R-20, R-23 a R-25, R-27, R-29 a R-33) ----------
-- Dos tipos de ítem en tablas separadas (decisión D-08).
-- El código es lo que se imprime como QR y lo que se tipea a mano (D-09).
-- Las dos marcas de validación son independientes: validar la entrada
-- no inhabilita el retiro del candy.

create table public."Compras" (
  id                          bigint generated always as identity primary key,
  usuario_id                  uuid references public."Usuarios"(id),
  email                       text not null,
  fecha_nacimiento_declarada  date,
  codigo                      text not null unique,
  total                       numeric(12,2) not null,
  cupon_id                    bigint references public."Cupones"(id),
  descuento_aplicado          numeric(12,2) not null default 0,
  credito_usado               numeric(12,2) not null default 0,
  puntos_generados            int not null default 0,
  estado                      text not null default 'pagada'
                              check (estado in ('pagada', 'cancelada')),
  entrada_validada_en         timestamptz,
  entrada_validada_por        uuid references public."Usuarios"(id),
  candy_entregado_en          timestamptz,
  candy_entregado_por         uuid references public."Usuarios"(id),
  creado_en                   timestamptz not null default now()
);

-- Una fila por butaca vendida. No existen filas para butacas libres (D-07).
-- es_vip y precio se guardan aunque sean derivables: si el admin cambia
-- el precio después, la entrada vendida conserva lo que se cobró.

create table public."Entradas" (
  id          bigint generated always as identity primary key,
  compra_id   bigint not null references public."Compras"(id) on delete cascade,
  funcion_id  bigint not null references public."Funciones"(id),
  fila        char(1) not null,
  numero      int not null,
  es_vip      boolean not null default false,
  precio      numeric(12,2) not null
);

create table public."ItemsCandy" (
  id               bigint generated always as identity primary key,
  compra_id        bigint not null references public."Compras"(id) on delete cascade,
  producto_id      bigint references public."ProductosCandy"(id),
  combo_id         bigint references public."Combos"(id),
  cantidad         int not null default 1,
  precio_unitario  numeric(12,2) not null,
  check (producto_id is not null or combo_id is not null)
);

create table public."Canjes" (
  id              bigint generated always as identity primary key,
  usuario_id      uuid not null references public."Usuarios"(id),
  recompensa_id   bigint not null references public."Recompensas"(id),
  puntos_gastados int not null,
  creado_en       timestamptz not null default now()
);

-- ---------- Interacción del cliente (R-08, R-09, R-10, R-12) ----------
-- Un usuario deja una sola reseña por película.

create table public."Resenias" (
  id           bigint generated always as identity primary key,
  usuario_id   uuid not null references public."Usuarios"(id) on delete cascade,
  pelicula_id  bigint not null references public."Peliculas"(id) on delete cascade,
  estrellas    int not null check (estrellas between 1 and 5),
  comentario   text,
  creado_en    timestamptz not null default now(),
  unique (usuario_id, pelicula_id)
);

create table public."Alertas" (
  id           bigint generated always as identity primary key,
  usuario_id   uuid not null references public."Usuarios"(id) on delete cascade,
  pelicula_id  bigint not null references public."Peliculas"(id) on delete cascade,
  notificada   boolean not null default false,
  creado_en    timestamptz not null default now(),
  unique (usuario_id, pelicula_id)
);

-- ---------- Auditoría (R-38) ----------
-- Nace con la primera tabla, no al final.

create table public."LogActividad" (
  id          bigint generated always as identity primary key,
  usuario_id  uuid references public."Usuarios"(id),
  accion      text not null,
  entidad     text not null,
  entidad_id  text,
  detalle     text,
  creado_en   timestamptz not null default now()
);

-- ============================================================
-- 2. FUNCIÓN DE ROL  (decisión D-12)
-- ============================================================

-- Las políticas necesitan saber qué rol tiene quien hace el pedido.
-- El rol vive en la tabla Usuarios y no en los metadatos de auth,
-- porque los metadatos los puede editar el propio usuario: cualquiera
-- podría ponerse rol 'admin' desde el navegador.
--
-- La función es SECURITY DEFINER: corre con los permisos de quien la
-- creó, salteando RLS. Sin eso, la política de Usuarios tendría que
-- leer Usuarios para decidir si puede leer Usuarios, y Postgres corta
-- con un error de recursión infinita.

create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public."Usuarios" where id = auth.uid();
$$;

-- Atajos, para que las políticas se lean solas.
-- OJO: es_empleado() se redefine en la sección 7.1 (D-24) para que sea
-- verdadero solo con el rol 'empleado'. La de acá es la versión original.
create or replace function public.es_admin()
returns boolean
language sql
stable
as $$ select public.rol_actual() = 'admin'; $$;

create or replace function public.es_empleado()
returns boolean
language sql
stable
as $$ select public.rol_actual() in ('admin', 'empleado'); $$;

-- ============================================================
-- 3. RLS Y POLÍTICAS
-- ============================================================
-- Con RLS activado y sin políticas, nadie lee ni escribe nada.
-- Cada tabla necesita decir explícitamente quién puede qué.
--
-- Roles de Postgres que usa Supabase:
--   anon           = visitante sin sesión
--   authenticated  = usuario con sesión iniciada

alter table public."Usuarios"          enable row level security;
alter table public."Peliculas"         enable row level security;
alter table public."Generos"           enable row level security;
alter table public."PeliculasGeneros"  enable row level security;
alter table public."Salas"             enable row level security;
alter table public."Funciones"         enable row level security;
alter table public."CategoriasCandy"   enable row level security;
alter table public."ProductosCandy"    enable row level security;
alter table public."Combos"            enable row level security;
alter table public."CombosProductos"   enable row level security;
alter table public."Cupones"           enable row level security;
alter table public."Recompensas"       enable row level security;
alter table public."Compras"           enable row level security;
alter table public."Entradas"          enable row level security;
alter table public."ItemsCandy"        enable row level security;
alter table public."Canjes"            enable row level security;
alter table public."Resenias"          enable row level security;
alter table public."Alertas"           enable row level security;
alter table public."LogActividad"      enable row level security;


-- ---------- Usuarios ----------
-- Cada uno ve y edita lo suyo. El admin ve todo.
-- El insert exige que el id sea el del propio usuario autenticado:
-- así nadie puede crear el perfil de otro.

create policy "usuario lee su perfil"
  on public."Usuarios" for select to authenticated
  using (id = auth.uid() or public.es_admin());

create policy "usuario crea su perfil"
  on public."Usuarios" for insert to authenticated
  with check (id = auth.uid());

create policy "usuario edita su perfil"
  on public."Usuarios" for update to authenticated
  using (id = auth.uid() or public.es_admin());

-- El empleado necesita leer nombres para validar entradas.
create policy "empleado lee usuarios"
  on public."Usuarios" for select to authenticated
  using (public.es_empleado());


-- ---------- Catálogo público ----------
-- Cartelera, géneros, salas, funciones, candy, combos, cupones y
-- recompensas: los lee cualquiera, incluso sin sesión, porque la
-- compra anónima necesita ver la cartelera (R-02).
-- Los modifica solo el admin (R-34).

create policy "catalogo publico: lectura"
  on public."Peliculas" for select to anon, authenticated using (true);
create policy "catalogo publico: escritura admin"
  on public."Peliculas" for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "generos: lectura"
  on public."Generos" for select to anon, authenticated using (true);
create policy "generos: escritura admin"
  on public."Generos" for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "peliculas_generos: lectura"
  on public."PeliculasGeneros" for select to anon, authenticated using (true);
create policy "peliculas_generos: escritura admin"
  on public."PeliculasGeneros" for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "salas: lectura"
  on public."Salas" for select to anon, authenticated using (true);
create policy "salas: escritura admin"
  on public."Salas" for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "funciones: lectura"
  on public."Funciones" for select to anon, authenticated using (true);
create policy "funciones: escritura admin"
  on public."Funciones" for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "categorias_candy: lectura"
  on public."CategoriasCandy" for select to anon, authenticated using (true);
create policy "categorias_candy: escritura admin"
  on public."CategoriasCandy" for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "productos_candy: lectura"
  on public."ProductosCandy" for select to anon, authenticated using (true);
create policy "productos_candy: escritura admin"
  on public."ProductosCandy" for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "combos: lectura"
  on public."Combos" for select to anon, authenticated using (true);
create policy "combos: escritura admin"
  on public."Combos" for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "combos_productos: lectura"
  on public."CombosProductos" for select to anon, authenticated using (true);
create policy "combos_productos: escritura admin"
  on public."CombosProductos" for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "cupones: lectura"
  on public."Cupones" for select to anon, authenticated using (true);
create policy "cupones: escritura admin"
  on public."Cupones" for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "recompensas: lectura"
  on public."Recompensas" for select to anon, authenticated using (true);
create policy "recompensas: escritura admin"
  on public."Recompensas" for all to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ---------- Compras ----------
-- El cliente ve las suyas. El empleado ve todas porque tiene que validar
-- entradas (R-31), y el admin porque las necesita para los reportes: a
-- él se lo agrega la sección 7.1 (D-24).
-- El anónimo puede insertar: es la compra sin cuenta (R-02).

create policy "cliente lee sus compras"
  on public."Compras" for select to authenticated
  using (usuario_id = auth.uid() or public.es_empleado());

create policy "cliente crea su compra"
  on public."Compras" for insert to authenticated
  with check (usuario_id = auth.uid() or usuario_id is null);

create policy "anonimo crea compra"
  on public."Compras" for insert to anon
  with check (usuario_id is null);

-- El update cubre dos casos: el cliente cancela la suya (R-29) y el
-- empleado marca la validación (R-31, R-33).
create policy "cliente cancela su compra"
  on public."Compras" for update to authenticated
  using (usuario_id = auth.uid() or public.es_empleado());


-- ---------- Entradas ----------
-- El mapa de butacas necesita que CUALQUIERA vea las entradas de una
-- función, con o sin sesión: así se sabe qué butacas están ocupadas
-- (R-16). No expone datos personales, solo fila y número.

create policy "entradas: lectura publica"
  on public."Entradas" for select to anon, authenticated using (true);

create policy "entradas: insert autenticado"
  on public."Entradas" for insert to authenticated with check (true);

create policy "entradas: insert anonimo"
  on public."Entradas" for insert to anon with check (true);

create policy "entradas: borrado admin"
  on public."Entradas" for delete to authenticated
  using (public.es_admin());


-- ---------- Items de candy ----------

create policy "items_candy: lectura"
  on public."ItemsCandy" for select to authenticated
  using (
    exists (
      select 1 from public."Compras" c
      where c.id = compra_id
        and (c.usuario_id = auth.uid() or public.es_empleado())
    )
  );

create policy "items_candy: insert autenticado"
  on public."ItemsCandy" for insert to authenticated with check (true);

create policy "items_candy: insert anonimo"
  on public."ItemsCandy" for insert to anon with check (true);


-- ---------- Canjes ----------

create policy "canjes: lectura propia"
  on public."Canjes" for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin());

create policy "canjes: insert propio"
  on public."Canjes" for insert to authenticated
  with check (usuario_id = auth.uid());


-- ---------- Reseñas ----------
-- Las lee cualquiera, porque se ven antes de comprar (R-08).
-- Cada uno escribe, edita y borra solo las suyas.

create policy "resenias: lectura publica"
  on public."Resenias" for select to anon, authenticated using (true);

create policy "resenias: escribe la propia"
  on public."Resenias" for insert to authenticated
  with check (usuario_id = auth.uid());

create policy "resenias: edita la propia"
  on public."Resenias" for update to authenticated
  using (usuario_id = auth.uid());

create policy "resenias: borra la propia"
  on public."Resenias" for delete to authenticated
  using (usuario_id = auth.uid() or public.es_admin());


-- ---------- Alertas ----------

create policy "alertas: lectura propia"
  on public."Alertas" for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin());

create policy "alertas: insert propio"
  on public."Alertas" for insert to authenticated
  with check (usuario_id = auth.uid());

create policy "alertas: borra la propia"
  on public."Alertas" for delete to authenticated
  using (usuario_id = auth.uid());

create policy "alertas: admin marca notificada"
  on public."Alertas" for update to authenticated
  using (public.es_admin());


-- ---------- Log de actividad ----------
-- Lo lee solo el admin (R-38). Lo escriben admin y empleado, que son
-- los que hacen las acciones que se auditan. La condición de escritura
-- se corrige en la sección 7.1 para nombrar a los dos (D-24).
-- No hay política de update ni de delete: el log no se edita ni se borra.

create policy "log: lectura admin"
  on public."LogActividad" for select to authenticated
  using (public.es_admin());

create policy "log: escritura admin y empleado"
  on public."LogActividad" for insert to authenticated
  with check (public.es_empleado());


-- ============================================================
-- 4. PERMISOS DE COLUMNA SOBRE Usuarios
-- ============================================================
-- La política "usuario edita su perfil" lo deja tocar su propia fila,
-- pero esa fila tiene rol, puntos y credito. Sin esto, cualquiera
-- podría ponerse rol 'admin' o credito 999999 desde el navegador.
--
-- RLS decide QUÉ FILAS se pueden tocar. Los permisos de columna
-- deciden QUÉ CAMPOS. Son dos cosas distintas y hacen falta las dos.

revoke update on public."Usuarios" from authenticated;

grant update (nombre, apellido, fecha_nacimiento, tipo_sangre,
              color_ojos, dias_vacaciones)
  on public."Usuarios" to authenticated;

-- Lo mismo al crear la fila en el registro: la política "usuario crea
-- su perfil" solo chequea el id. Sin esto, alguien podría registrarse
-- insertando rol 'admin'. Así rol, puntos y credito toman su default.

revoke insert on public."Usuarios" from authenticated;

grant insert (id, email, nombre, apellido, fecha_nacimiento, tipo_sangre,
              color_ojos, dias_vacaciones)
  on public."Usuarios" to authenticated;

-- El admin sí puede cambiar roles: lo hace desde el panel, y su
-- permiso viene de la política, no de este grant.
-- (Ver punto abierto 1 al final de este archivo.)


-- ============================================================
-- 5. DATOS INICIALES
-- ============================================================

-- ---------- Géneros (R-07, decisión D-15) ----------
-- Lista fija: no hay pantalla para administrarlos porque ningún mail
-- la pide. Si hace falta un género nuevo, se agrega con otro insert.
-- El id lo genera la base (identity), por eso solo se carga el nombre.

insert into public."Generos" (nombre) values
  ('Acción'),
  ('Animación'),
  ('Aventura'),
  ('Bélica'),
  ('Ciencia ficción'),
  ('Comedia'),
  ('Crimen'),
  ('Documental'),
  ('Drama'),
  ('Familiar'),
  ('Fantasía'),
  ('Musical'),
  ('Romance'),
  ('Suspenso'),
  ('Terror');


-- ============================================================
-- 6. STORAGE: BUCKET DE PÓSTERS  (clase 7)
-- ============================================================
-- Los buckets son filas de la tabla storage.buckets, y los archivos son
-- filas de storage.objects. Por eso el bucket se crea con un insert y
-- los permisos se escriben como políticas, igual que en cualquier tabla.
--
-- El bucket es público: el póster se muestra con la URL pública
-- (.../storage/v1/object/public/peliculas/<ruta>), que no pasa por RLS.
-- La cartelera la ve cualquiera, incluso sin sesión (R-02).

insert into storage.buckets (id, name, public)
values ('peliculas', 'peliculas', true);

-- Todas las políticas filtran por bucket_id: storage.objects es una
-- sola tabla para todos los buckets del proyecto, y sin ese filtro la
-- política valdría para cualquier otro bucket que se cree después.

-- La URL pública no necesita esta política, pero sí la necesitan las
-- operaciones que pasan por la API: listar el bucket y reemplazar un
-- archivo, que primero tiene que poder leerlo.
create policy "posters: lectura publica"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'peliculas');

-- Subir, reemplazar y borrar: solo el admin (R-34).
create policy "posters: sube admin"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'peliculas' and public.es_admin());

create policy "posters: reemplaza admin"
  on storage.objects for update to authenticated
  using (bucket_id = 'peliculas' and public.es_admin())
  with check (bucket_id = 'peliculas' and public.es_admin());

create policy "posters: borra admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'peliculas' and public.es_admin());


-- ============================================================
-- 7. CORRECCIONES DEL 01/10  (docs/correccion-01-10.md)
-- ============================================================
-- Esta sección cambia cosas que se crearon más arriba. Está aparte, y
-- no mezclada con las secciones 1 a 3, porque la base ya existía cuando
-- llegó la corrección: es exactamente lo que se corrió sobre la base
-- viva. Corriendo el script completo desde cero se llega al mismo
-- resultado, porque primero crea y después corrige.


-- ---------- 7.1 Admin y empleado, roles separados (decisión D-24) ----------
-- El admin no valida entradas ni entrega candy: lo hace solo el empleado.
-- Antes es_empleado() devolvía verdadero también para el admin.
--
-- "create or replace" reemplaza el cuerpo de la función sin borrarla,
-- así que las políticas que ya la usan siguen en pie y toman la regla
-- nueva sin tocarlas. Por eso NO hace falta modificar:
--   "empleado lee usuarios"      queda solo para el empleado; el admin ya
--                                lee Usuarios por "usuario lee su perfil",
--                                que lo nombra con es_admin().
--   "cliente cancela su compra"  el update de Compras queda para el dueño
--                                de la compra (cancelar, R-29) y para el
--                                empleado (validar, R-31 y R-33). El admin
--                                queda afuera.

create or replace function public.es_empleado()
returns boolean
language sql
stable
as $$ select public.rol_actual() = 'empleado'; $$;

-- Las tres políticas que sí cambian son las que contaban con que
-- es_empleado() incluía al admin. "alter policy" cambia la condición de
-- una política que ya existe, sin tener que borrarla y crearla de nuevo.

-- El admin lee todas las compras: las necesita para los reportes
-- (R-35 a R-37). Leer no es validar.
alter policy "cliente lee sus compras"
  on public."Compras"
  using (usuario_id = auth.uid() or public.es_empleado() or public.es_admin());

-- Lo mismo con los ítems del candy: el reporte del producto más vendido
-- (R-37) sale de acá.
alter policy "items_candy: lectura"
  on public."ItemsCandy"
  using (
    exists (
      select 1 from public."Compras" c
      where c.id = compra_id
        and (c.usuario_id = auth.uid() or public.es_empleado() or public.es_admin())
    )
  );

-- El log lo escriben los dos: el admin cuando crea o modifica algo y el
-- empleado cuando valida un QR (R-38). Sin este cambio, el admin dejaba
-- de poder registrar sus acciones.
alter policy "log: escritura admin y empleado"
  on public."LogActividad"
  with check (public.es_admin() or public.es_empleado());


-- ---------- 7.2 Campos obligatorios (docs/validaciones.md, sección 4) ----------
-- "not null en todos los campos obligatorios."
--
-- Usuarios: los tres datos del registro que habían quedado opcionales
-- (R-01 los pide todos).
-- Peliculas: "Toda película tiene una duración, una imagen, un nombre y
-- una sinopsis" (R-04, mail del 01/01); nombre y duracion_minutos ya
-- eran not null. Se suma la fecha de estreno, que el formulario exige.
-- restriccion_edad sigue aceptando null: null es "sin restricción".
--
-- Si alguna fila existente tiene null en estas columnas, el alter falla
-- y no cambia nada: hay que completarla antes.

alter table public."Usuarios"
  alter column tipo_sangre     set not null,
  alter column color_ojos      set not null,
  alter column dias_vacaciones set not null;

alter table public."Peliculas"
  alter column sinopsis      set not null,
  alter column imagen_url    set not null,
  alter column fecha_estreno set not null;


-- ---------- 7.3 Reglas de contenido como constraints check (D-25) ----------
-- Son las mismas reglas que valida el formulario (docs/validaciones.md).
-- Se repiten acá porque el formulario se puede saltear desde la consola
-- del navegador y la base no.
--
-- Un check es una condición que la fila tiene que cumplir para poder
-- guardarse. Se evalúa en cada insert y en cada update. Si la columna
-- es null, el check no la rechaza: de eso se ocupa el not null.
--
--   trim(texto)         saca los espacios de adelante y de atrás.
--   char_length(texto)  cuenta los caracteres.
-- Combinadas resuelven dos reglas en una: un texto que es solo espacios
-- queda con largo 0 después del trim, y no llega al mínimo.
--
--   texto ~ 'patrón'    es verdadero si el texto cumple la expresión
--                       regular. Es el Validators.pattern de la base.

alter table public."Usuarios"
  -- 254 es el largo máximo de un mail (RFC 5321).
  add constraint usuarios_email_largo
    check (char_length(trim(email)) between 1 and 254),

  add constraint usuarios_nombre_largo
    check (char_length(trim(nombre)) between 2 and 50),
  add constraint usuarios_apellido_largo
    check (char_length(trim(apellido)) between 2 and 50),

  -- Patrón textoPersona: solo letras, separadas por UN espacio, apóstrofo
  -- o guion. Se lee así:
  --   ^[letras]+                 empieza con una o más letras
  --   ([ '-][letras]+)*          después, cero o más veces: un separador
  --                              seguido de una o más letras
  --   $                          y ahí termina
  -- Como cada separador tiene que estar seguido de letras, no puede haber
  -- dos seguidos ni uno al principio o al final.
  -- Las letras son A-Z, a-z y las latinas con acento o diacrítico
  -- (À-Ö, Ø-ö, ø-ɏ: incluye á, ñ, ü, ç). Los dos huecos dejan afuera a
  -- × y ÷, que están en el medio de ese rango y no son letras.
  -- El apóstrofo va escrito dos veces porque está dentro de un texto SQL.
  add constraint usuarios_nombre_solo_letras
    check (nombre ~ '^[A-Za-zÀ-ÖØ-öø-ɏ]+([ ''-][A-Za-zÀ-ÖØ-öø-ɏ]+)*$'),
  add constraint usuarios_apellido_solo_letras
    check (apellido ~ '^[A-Za-zÀ-ÖØ-öø-ɏ]+([ ''-][A-Za-zÀ-ÖØ-öø-ɏ]+)*$'),

  -- No futura y no más de 120 años atrás. current_date es la fecha de hoy
  -- en el servidor, y restarle un interval la corre hacia atrás.
  -- Que la fecha exista (no 31/02) ya lo garantiza el tipo date.
  -- OJO: este check se reemplaza en la sección 9.5, para que "hoy" sea el
  -- día de Argentina y no el del servidor. El de acá es el original.
  add constraint usuarios_fecha_nacimiento_rango
    check (fecha_nacimiento <= current_date
           and fecha_nacimiento >= current_date - interval '120 years'),

  -- Campos de lista: solo los valores que ofrece el desplegable del
  -- registro. Si se agrega una opción en el front, se agrega acá.
  add constraint usuarios_tipo_sangre_lista
    check (tipo_sangre in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-')),
  add constraint usuarios_color_ojos_lista
    check (color_ojos in ('Marrón', 'Negro', 'Verde', 'Azul', 'Gris', 'Otro')),

  add constraint usuarios_dias_vacaciones_rango
    check (dias_vacaciones between 0 and 60);

alter table public."Peliculas"
  add constraint peliculas_nombre_largo
    check (char_length(trim(nombre)) between 1 and 100),
  add constraint peliculas_sinopsis_largo
    check (char_length(trim(sinopsis)) between 20 and 1000),
  -- La URL del póster la arma la app, no la escribe nadie: el tope de
  -- 2048 es solo para que el texto tenga un máximo, como todos.
  add constraint peliculas_imagen_largo
    check (char_length(trim(imagen_url)) between 1 and 2048),
  add constraint peliculas_duracion_rango
    check (duracion_minutos between 30 and 300),

  -- Patrón precio: mayor a 0 y hasta 1.000.000. Los dos decimales ya los
  -- garantiza el tipo numeric(12,2).
  add constraint peliculas_precio_preventa_rango
    check (precio_preventa > 0 and precio_preventa <= 1000000),
  -- Check cruzado, entre dos columnas de la misma fila: si la preventa
  -- está habilitada, tiene que haber precio. "not A or B" se lee
  -- "si A, entonces B".
  add constraint peliculas_preventa_con_precio
    check (not preventa_habilitada or precio_preventa is not null);

-- Lo que NO está como check, y por qué:
--
--   Géneros, entre 1 y 4. Un check solo ve la fila que se está guardando,
--   y los géneros están en otra tabla (PeliculasGeneros). Queda validado
--   solo en el formulario.
--
--   Fecha de estreno entre 1 año atrás y 1 año adelante, y preventa solo
--   con estreno futuro. Se podrían escribir con current_date, pero un
--   check se vuelve a evaluar en CADA update de la fila: el día que la
--   película cumpla un año de estrenada, o al día siguiente del estreno
--   de una que tuvo preventa, la base rechazaría cualquier cambio sobre
--   ella, aunque sea sacarla de cartelera. Son reglas del momento de la
--   carga, no de la fila: quedan en el formulario.
--   (En la fecha de nacimiento el mismo riesgo existe solo para alguien
--   que cumple 120 años, así que ahí sí se usa.)
--
--   En cartelera y Próximamente a la vez. Dejó de ser una regla: las dos
--   columnas se reemplazan por "visible" en la sección 8 (D-27).


-- ============================================================
-- 8. ESTADO DE LA PELÍCULA  (decisión D-27)
-- ============================================================
-- en_cartelera y proximamente se reemplazan por una sola columna,
-- visible. El admin decide si la película aparece o no (R-05, mail del
-- 01/01); en qué lugar aparece lo dice la fecha de estreno:
--   visible y estreno futuro         -> Próximamente
--   visible y estreno hoy o pasado   -> en cartelera
--   no visible                       -> no aparece
-- Así nadie tiene que pasar la película a cartelera a mano el día del
-- estreno. El cálculo se hace en el front, comparando fecha_estreno con
-- la fecha de hoy: la base solo guarda los dos datos.
--
-- Son tres pasos, en este orden:
--   1. Se agrega la columna. Con el default, las filas que ya existen
--      quedan en false.
--   2. Se pasa lo que había: era visible la película que estaba en
--      cartelera o en Próximamente. El update no lleva where a propósito:
--      recorre todas las filas.
--   3. Recién entonces se borran las dos columnas viejas. Si se borraran
--      antes, el paso 2 no tendría de dónde leer.

alter table public."Peliculas"
  add column visible boolean not null default false;

update public."Peliculas"
  set visible = (en_cartelera or proximamente);

alter table public."Peliculas"
  drop column en_cartelera,
  drop column proximamente;


-- ============================================================
-- 9. SALAS Y FUNCIONES  (bloque del 05/10, D-28 y D-29)
-- ============================================================
-- Las dos tablas y sus políticas ya existen (secciones 1 y 3): las lee
-- cualquiera y las escribe solo el admin, igual que Peliculas. Acá se
-- agregan las reglas de contenido de docs/validaciones.md, con el mismo
-- criterio de la sección 7.3 (D-25).


-- ---------- 9.1 Salas (docs/validaciones.md, sección 3.4) ----------
-- Nombre de 2 a 30 caracteres, contados sin los espacios de los extremos:
-- un nombre que es solo espacios no llega al mínimo.
--
-- unique: no puede haber dos filas con el mismo valor en esa columna. Si
-- se intenta, Postgres rechaza el insert o el update con el código 23505,
-- que el servicio traduce a "Ya existe una sala con ese nombre". Hace
-- falta porque la sala se le informa al cliente por su nombre: dos
-- "Sala 1" serían dos salas que no se pueden distinguir.
--
-- Si alguna fila existente no cumple, el alter falla y no cambia nada:
-- hay que corregirla antes.

alter table public."Salas"
  add constraint salas_nombre_largo
    check (char_length(trim(nombre)) between 2 and 30),
  add constraint salas_nombre_unico
    unique (nombre);


-- ---------- 9.2 Funciones: precios (docs/validaciones.md, 3.5; D-28) ----------
-- Patrón precio: mayor a 0 y hasta 1.000.000. Y un check cruzado entre
-- dos columnas de la misma fila: el precio VIP tiene que ser mayor que
-- el base (R-14, mail del 10/03).
-- Formato e idioma ya tienen su check de lista desde la sección 1.
--
-- Si alguna fila existente no cumple, el alter falla y no cambia nada.

alter table public."Funciones"
  add constraint funciones_precio_base_rango
    check (precio_base > 0 and precio_base <= 1000000),
  add constraint funciones_precio_vip_rango
    check (precio_vip > 0 and precio_vip <= 1000000),
  add constraint funciones_vip_mayor_que_base
    check (precio_vip > precio_base);


-- ---------- 9.3 Sin superposición: trigger (R-18, R-19, D-29) ----------
-- "Bajo ningún concepto dos funciones pueden estar en la misma sala al
-- mismo tiempo", y entre el fin de una y el inicio de la siguiente tienen
-- que pasar 30 minutos.
--
-- El servicio de Angular ya elige una sala libre antes de guardar. Pero
-- eso solo no alcanza: se puede saltear llamando a Supabase desde la
-- consola del navegador, o insertando desde este editor, y dos admins
-- que cargan a la vez pueden ver libre la misma sala. El servicio guía;
-- la base garantiza.
--
-- Por qué no es un check: un check solo ve la fila que se está guardando,
-- y esta regla necesita mirar LAS OTRAS filas de la tabla, y además la
-- duración, que está en Peliculas.
--
-- Un trigger son dos piezas:
--   1. Una función que "returns trigger". Recibe en NEW la fila que se
--      quiere guardar. Si termina con "return new", la fila se guarda;
--      si hace "raise exception", se rechaza y no se guarda nada de esa
--      operación: en un insert de varias filas, no entra ninguna (D-30).
--   2. El "create trigger", que dice cuándo se ejecuta esa función.
--
-- La función está en plpgsql y no en sql, como las de la sección 2,
-- porque necesita variables y un if.

create or replace function public.funciones_sin_superposicion()
returns trigger
language plpgsql
as $$
declare
  duracion_nueva  int;  -- minutos que dura la película de la fila nueva
  superpuestas    int;  -- cuántas funciones de esa sala chocan con ella
begin
  -- Candado por sala. Sin esto, dos cargas simultáneas en la misma sala
  -- se revisan al mismo tiempo: ninguna ve a la otra, porque todavía no
  -- terminó de guardarse, y entran las dos. Con el candado, la segunda
  -- espera a que termine la primera y recién ahí revisa. Se suelta solo
  -- cuando termina la operación (por eso "xact", de transacción).
  perform pg_advisory_xact_lock(new.sala_id);

  -- El fin de la función no se guarda: sale de la duración de su
  -- película (R-19).
  select duracion_minutos into duracion_nueva
  from public."Peliculas"
  where id = new.pelicula_id;

  -- Dos funciones chocan si cada una empieza antes de que termine la otra
  -- más los 30 minutos. Es la misma cuenta que hace el servicio.
  --   minutos * interval '1 minute'  convierte un número en un tiempo que
  --                                  se le puede sumar a una fecha.
  --   f.id <> new.id                 en un update, la función no tiene que
  --                                  chocar consigo misma.
  select count(*) into superpuestas
  from public."Funciones" f
  join public."Peliculas" p on p.id = f.pelicula_id
  where f.sala_id = new.sala_id
    and f.id <> new.id
    and new.fecha_hora < f.fecha_hora + (p.duracion_minutos + 30) * interval '1 minute'
    and f.fecha_hora < new.fecha_hora + (duracion_nueva + 30) * interval '1 minute';

  if superpuestas > 0 then
    -- Llega al front con el código P0001, que el servicio traduce a un
    -- mensaje para el admin (services/funciones.ts).
    raise exception 'La sala ya tiene otra función en ese horario, o a menos de 30 minutos (R-18, R-19).';
  end if;

  return new;
end;
$$;

-- before: se ejecuta antes de guardar, para poder rechazar.
-- insert or update: una función nueva o una que se movió de horario, de
--   sala o de película.
-- for each row: una vez por cada fila. En un insert de varias filas, cada
--   una ya ve a las anteriores del mismo insert.
create trigger funciones_sin_superposicion
  before insert or update on public."Funciones"
  for each row execute function public.funciones_sin_superposicion();

-- Lo que el trigger NO mira: Peliculas. Alargar la duración de una
-- película que ya tiene funciones podría dejarlas superpuestas. Eso lo
-- cierra la app: con funciones futuras, la edición de película no deja
-- cambiar la duración, ni desde el formulario ni desde el servicio (D-29).
--
-- OJO: la función se redefine en la sección 9.4 para sumarle la regla
-- del estreno. La de acá es la versión original.


-- ---------- 9.4 Ninguna función antes del estreno (D-29) ----------
-- Una función no puede ser anterior al estreno de su película en el cine
-- (docs/validaciones.md, 3.5). La preventa adelanta la venta, no las
-- funciones. El formulario y el servicio ya lo validan; se suma acá por
-- lo mismo que la superposición: el front se puede saltear.
--
-- "create or replace" reemplaza el cuerpo de la función sin borrarla,
-- así que el trigger de la 9.3 sigue en pie y toma la regla nueva sin
-- tocarlo (igual que es_empleado() en la 7.1). Es la función entera otra
-- vez, con tres cambios: la variable estreno, el select que ahora trae
-- dos columnas, y el primer if.
--
-- Límite conocido: fecha_estreno es un date, sin hora, y para compararlo
-- con fecha_hora Postgres lo toma a las 00:00 del servidor, que está en
-- UTC. En Argentina eso son las 21:00 del día anterior. Entonces la base
-- deja pasar una función de las 21:00 en adelante de la víspera del
-- estreno, que el formulario sí rechaza. Nunca rechaza una función
-- válida (mismo criterio que la fecha de nacimiento, D-25).

create or replace function public.funciones_sin_superposicion()
returns trigger
language plpgsql
as $$
declare
  duracion_nueva  int;   -- minutos que dura la película de la fila nueva
  estreno         date;  -- su estreno en el cine
  superpuestas    int;   -- cuántas funciones de esa sala chocan con ella
begin
  -- "select a, b into x, y" guarda cada columna en su variable.
  select duracion_minutos, fecha_estreno into duracion_nueva, estreno
  from public."Peliculas"
  where id = new.pelicula_id;

  -- Regla del estreno. Va primero porque no necesita mirar otras filas.
  -- El % del mensaje se reemplaza por el valor que sigue a la coma.
  --
  -- OJO: no sacar la palabra "estreno" de este mensaje. Las dos reglas del
  -- trigger llegan al front con el mismo código (P0001), y el servicio
  -- las distingue buscando esa palabra en el texto (traducirError, en
  -- src/app/services/funciones.ts). Si cambia acá, hay que cambiarla allá.
  -- Por lo mismo, el mensaje de superposición no tiene que contenerla.
  if new.fecha_hora < estreno then
    raise exception 'La función es anterior al estreno de la película (%).', estreno;
  end if;

  -- De acá en adelante es la regla de superposición, igual que en la 9.3.
  perform pg_advisory_xact_lock(new.sala_id);

  select count(*) into superpuestas
  from public."Funciones" f
  join public."Peliculas" p on p.id = f.pelicula_id
  where f.sala_id = new.sala_id
    and f.id <> new.id
    and new.fecha_hora < f.fecha_hora + (p.duracion_minutos + 30) * interval '1 minute'
    and f.fecha_hora < new.fecha_hora + (duracion_nueva + 30) * interval '1 minute';

  if superpuestas > 0 then
    raise exception 'La sala ya tiene otra función en ese horario, o a menos de 30 minutos (R-18, R-19).';
  end if;

  return new;
end;
$$;

-- Lo que esta regla NO cubre: el trigger está en Funciones. Si se corre
-- el estreno de una película para después de una función ya cargada, la
-- base no lo nota. Eso lo cierra la app: la edición de película no deja
-- poner un estreno posterior a su primera función futura (D-29).
--
-- OJO: la función se vuelve a redefinir en la sección 9.5, que corrige el
-- límite conocido de la zona horaria. La vigente es la de la 9.5.


-- ---------- 9.5 Fechas en hora argentina (D-25, D-29) ----------
-- El servidor de Supabase está en UTC y el cine en Argentina, que está
-- tres horas atrás. Entre las 21:00 y las 24:00 de acá, para el servidor
-- ya es el día siguiente. Eso afectaba a dos reglas que comparan un
-- instante con una fecha sin hora:
--   - El estreno (9.4): la base dejaba pasar una función de la víspera
--     del estreno desde las 21:00.
--   - La fecha de nacimiento (7.3): durante esas tres horas la base
--     aceptaba una fecha de nacimiento de "mañana".
-- En los dos casos el formulario sí lo rechazaba; la base era más
-- permisiva. Acá se corrigen los dos.
--
--   instante at time zone 'America/Argentina/Buenos_Aires'
--       devuelve la fecha y la hora que marca el reloj en Argentina en
--       ese instante. Las 00:30 UTC del 15 son las 21:30 del 14.
--   (...)::date
--       convierte ese resultado a date: se queda con el día y descarta
--       la hora. Es un cast, un cambio de tipo.
-- Juntas responden "¿qué día es en Argentina en este instante?", y ese
-- día sí se puede comparar con un date sin que influya el servidor.

-- Estreno: la función entera otra vez (create or replace, como en la
-- 9.4). El único cambio es la condición del primer if: antes comparaba
-- fecha_hora con el estreno directamente; ahora compara el DÍA de la
-- función en Argentina. La explicación de cada parte está en la 9.3 y
-- la 9.4.

create or replace function public.funciones_sin_superposicion()
returns trigger
language plpgsql
as $$
declare
  duracion_nueva  int;   -- minutos que dura la película de la fila nueva
  estreno         date;  -- su estreno en el cine
  superpuestas    int;   -- cuántas funciones de esa sala chocan con ella
begin
  select duracion_minutos, fecha_estreno into duracion_nueva, estreno
  from public."Peliculas"
  where id = new.pelicula_id;

  -- OJO: no sacar la palabra "estreno" de este mensaje. Las dos reglas del
  -- trigger llegan al front con el mismo código (P0001), y el servicio
  -- las distingue buscando esa palabra en el texto (traducirError, en
  -- src/app/services/funciones.ts). Si cambia acá, hay que cambiarla allá.
  -- Por lo mismo, el mensaje de superposición no tiene que contenerla.
  if (new.fecha_hora at time zone 'America/Argentina/Buenos_Aires')::date < estreno then
    raise exception 'La función es anterior al estreno de la película (%).', estreno;
  end if;

  perform pg_advisory_xact_lock(new.sala_id);

  select count(*) into superpuestas
  from public."Funciones" f
  join public."Peliculas" p on p.id = f.pelicula_id
  where f.sala_id = new.sala_id
    and f.id <> new.id
    and new.fecha_hora < f.fecha_hora + (p.duracion_minutos + 30) * interval '1 minute'
    and f.fecha_hora < new.fecha_hora + (duracion_nueva + 30) * interval '1 minute';

  if superpuestas > 0 then
    raise exception 'La sala ya tiene otra función en ese horario, o a menos de 30 minutos (R-18, R-19).';
  end if;

  return new;
end;
$$;

-- Fecha de nacimiento: un check no se puede modificar, así que se borra
-- y se crea de nuevo en el mismo alter. Es la misma regla de la 7.3 (no
-- futura y no más de 120 años atrás), pero "hoy" pasa a ser el día de
-- Argentina: now() es el instante actual, y con at time zone y ::date
-- queda el día de acá. Antes usaba current_date, que es el día del
-- servidor.
--
-- "drop constraint if exists" borra el check solo si está: si no está, no
-- da error y sigue. Hace falta porque en la base viva la sección 7 no se
-- había corrido (ver 9.6) y este check no existía. Así el alter se puede
-- correr en cualquier estado, y también más de una vez.
--
-- Al crear el check, Postgres revisa todas las filas que ya existen: si
-- alguna no cumple, el alter falla y no cambia nada. Este select muestra
-- cuáles son, para corregirlas antes. Si no devuelve filas, está todo bien.

select id, email, fecha_nacimiento
from public."Usuarios"
where not (
  fecha_nacimiento <= (now() at time zone 'America/Argentina/Buenos_Aires')::date
  and fecha_nacimiento >= (now() at time zone 'America/Argentina/Buenos_Aires')::date
                          - interval '120 years'
);

alter table public."Usuarios"
  drop constraint if exists usuarios_fecha_nacimiento_rango,
  add constraint usuarios_fecha_nacimiento_rango
    check (
      fecha_nacimiento <= (now() at time zone 'America/Argentina/Buenos_Aires')::date
      and fecha_nacimiento >= (now() at time zone 'America/Argentina/Buenos_Aires')::date
                              - interval '120 years'
    );


-- ---------- 9.6 Ponerse al día: lo de la sección 7 que no estaba ----------
-- El 05/10 se vio que en la base viva no existía ningún check de la
-- sección 7.3. La causa: en la 7.1, es_empleado() estaba escrita con
-- "as $ ... $;" en lugar de "as $$ ... $$;". Eso es un error de sintaxis,
-- y el SQL Editor corre todo lo que se le pega como una sola operación:
-- al fallar esa línea, no quedó aplicado nada de lo que venía con ella.
-- La línea ya está corregida más arriba.
--
-- Esta sección vuelve a aplicar la 7.1, la 7.2 y la 7.3, escritas para
-- que se puedan correr en cualquier estado y más de una vez:
--   create or replace / alter policy   pisan lo que haya.
--   set not null                       si ya era not null, no cambia nada.
--   drop constraint if exists + add    borra el check si está y lo crea.
-- Corriendo el script completo desde cero no cambia nada: repite lo que
-- la sección 7 ya dejó.
--
-- No incluye el check de la fecha de nacimiento: lo crea la 9.5.
--
-- CÓMO CORRERLA: por pasos, y los select de a uno (el editor muestra
-- solo el resultado de la última consulta). Cada select muestra las filas
-- que hoy NO cumplen la regla que sigue. Si alguno devuelve filas, hay
-- que corregirlas antes del alter de ese paso, o el alter falla.


-- ----- Paso 0: cómo está la base hoy (solo consultas, no cambian nada) -----

-- ¿Cuál es_empleado() está vigente? Con D-24 aplicada, el texto dice
-- "= 'empleado'"; con la versión vieja, "in ('admin', 'empleado')".
-- De paso muestra el trigger: la versión de la 9.5 contiene "at time zone".
select proname, prosrc
from pg_proc
where proname in ('es_empleado', 'funciones_sin_superposicion');

-- ¿Las tres políticas de la 7.1 nombran al admin con es_admin()?
select tablename, policyname, qual, with_check
from pg_policies
where policyname in ('cliente lee sus compras', 'items_candy: lectura',
                     'log: escritura admin y empleado');

-- ¿Qué columnas de Usuarios y Peliculas aceptan null? Y de paso: si
-- Peliculas tiene "visible" y ya no tiene en_cartelera ni proximamente,
-- la sección 8 está aplicada.
select table_name, column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('Usuarios', 'Peliculas');


-- ----- Paso 1: roles separados (7.1, D-24) -----
-- Sin esto el admin sigue pudiendo validar entradas, porque
-- es_empleado() lo incluye. No depende de los datos: no lleva select.

create or replace function public.es_empleado()
returns boolean
language sql
stable
as $$ select public.rol_actual() = 'empleado'; $$;

alter policy "cliente lee sus compras"
  on public."Compras"
  using (usuario_id = auth.uid() or public.es_empleado() or public.es_admin());

alter policy "items_candy: lectura"
  on public."ItemsCandy"
  using (
    exists (
      select 1 from public."Compras" c
      where c.id = compra_id
        and (c.usuario_id = auth.uid() or public.es_empleado() or public.es_admin())
    )
  );

alter policy "log: escritura admin y empleado"
  on public."LogActividad"
  with check (public.es_admin() or public.es_empleado());


-- ----- Paso 2: Usuarios (7.2 y 7.3) -----

-- not null en tipo_sangre, color_ojos y dias_vacaciones
select id, email, tipo_sangre, color_ojos, dias_vacaciones
from public."Usuarios"
where tipo_sangre is null or color_ojos is null or dias_vacaciones is null;

-- usuarios_email_largo
select id, email
from public."Usuarios"
where not (char_length(trim(email)) between 1 and 254);

-- usuarios_nombre_largo y usuarios_apellido_largo
select id, email, nombre, apellido
from public."Usuarios"
where not (char_length(trim(nombre)) between 2 and 50)
   or not (char_length(trim(apellido)) between 2 and 50);

-- usuarios_nombre_solo_letras y usuarios_apellido_solo_letras
select id, email, nombre, apellido
from public."Usuarios"
where not (nombre   ~ '^[A-Za-zÀ-ÖØ-öø-ɏ]+([ ''-][A-Za-zÀ-ÖØ-öø-ɏ]+)*$')
   or not (apellido ~ '^[A-Za-zÀ-ÖØ-öø-ɏ]+([ ''-][A-Za-zÀ-ÖØ-öø-ɏ]+)*$');

-- usuarios_tipo_sangre_lista (ojo: es '0+' con el número cero, no 'O+')
select id, email, tipo_sangre
from public."Usuarios"
where tipo_sangre not in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-');

-- usuarios_color_ojos_lista
select id, email, color_ojos
from public."Usuarios"
where color_ojos not in ('Marrón', 'Negro', 'Verde', 'Azul', 'Gris', 'Otro');

-- usuarios_dias_vacaciones_rango
select id, email, dias_vacaciones
from public."Usuarios"
where not (dias_vacaciones between 0 and 60);

alter table public."Usuarios"
  alter column tipo_sangre     set not null,
  alter column color_ojos      set not null,
  alter column dias_vacaciones set not null;

alter table public."Usuarios"
  drop constraint if exists usuarios_email_largo,
  add constraint usuarios_email_largo
    check (char_length(trim(email)) between 1 and 254),

  drop constraint if exists usuarios_nombre_largo,
  add constraint usuarios_nombre_largo
    check (char_length(trim(nombre)) between 2 and 50),
  drop constraint if exists usuarios_apellido_largo,
  add constraint usuarios_apellido_largo
    check (char_length(trim(apellido)) between 2 and 50),

  drop constraint if exists usuarios_nombre_solo_letras,
  add constraint usuarios_nombre_solo_letras
    check (nombre ~ '^[A-Za-zÀ-ÖØ-öø-ɏ]+([ ''-][A-Za-zÀ-ÖØ-öø-ɏ]+)*$'),
  drop constraint if exists usuarios_apellido_solo_letras,
  add constraint usuarios_apellido_solo_letras
    check (apellido ~ '^[A-Za-zÀ-ÖØ-öø-ɏ]+([ ''-][A-Za-zÀ-ÖØ-öø-ɏ]+)*$'),

  drop constraint if exists usuarios_tipo_sangre_lista,
  add constraint usuarios_tipo_sangre_lista
    check (tipo_sangre in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-')),
  drop constraint if exists usuarios_color_ojos_lista,
  add constraint usuarios_color_ojos_lista
    check (color_ojos in ('Marrón', 'Negro', 'Verde', 'Azul', 'Gris', 'Otro')),

  drop constraint if exists usuarios_dias_vacaciones_rango,
  add constraint usuarios_dias_vacaciones_rango
    check (dias_vacaciones between 0 and 60);


-- ----- Paso 3: Peliculas (7.2 y 7.3) -----

-- not null en sinopsis, imagen_url y fecha_estreno
select id, nombre, sinopsis, imagen_url, fecha_estreno
from public."Peliculas"
where sinopsis is null or imagen_url is null or fecha_estreno is null;

-- peliculas_nombre_largo
select id, nombre
from public."Peliculas"
where not (char_length(trim(nombre)) between 1 and 100);

-- peliculas_sinopsis_largo (muestra el largo para ver cuánto falta o sobra)
select id, nombre, char_length(trim(sinopsis)) as largo_sinopsis
from public."Peliculas"
where not (char_length(trim(sinopsis)) between 20 and 1000);

-- peliculas_imagen_largo
select id, nombre, imagen_url
from public."Peliculas"
where not (char_length(trim(imagen_url)) between 1 and 2048);

-- peliculas_duracion_rango
select id, nombre, duracion_minutos
from public."Peliculas"
where not (duracion_minutos between 30 and 300);

-- peliculas_precio_preventa_rango
select id, nombre, precio_preventa
from public."Peliculas"
where not (precio_preventa > 0 and precio_preventa <= 1000000);

-- peliculas_preventa_con_precio
select id, nombre, preventa_habilitada, precio_preventa
from public."Peliculas"
where preventa_habilitada and precio_preventa is null;

alter table public."Peliculas"
  alter column sinopsis      set not null,
  alter column imagen_url    set not null,
  alter column fecha_estreno set not null;

alter table public."Peliculas"
  drop constraint if exists peliculas_nombre_largo,
  add constraint peliculas_nombre_largo
    check (char_length(trim(nombre)) between 1 and 100),
  drop constraint if exists peliculas_sinopsis_largo,
  add constraint peliculas_sinopsis_largo
    check (char_length(trim(sinopsis)) between 20 and 1000),
  drop constraint if exists peliculas_imagen_largo,
  add constraint peliculas_imagen_largo
    check (char_length(trim(imagen_url)) between 1 and 2048),
  drop constraint if exists peliculas_duracion_rango,
  add constraint peliculas_duracion_rango
    check (duracion_minutos between 30 and 300),
  drop constraint if exists peliculas_precio_preventa_rango,
  add constraint peliculas_precio_preventa_rango
    check (precio_preventa > 0 and precio_preventa <= 1000000),
  drop constraint if exists peliculas_preventa_con_precio,
  add constraint peliculas_preventa_con_precio
    check (not preventa_habilitada or precio_preventa is not null);


-- ============================================================
-- 10. CARTELERA: LAS MÁS VENDIDAS  (R-06, decisión D-31)
-- ============================================================
-- La página principal muestra primero las 3 películas más vendidas. Para
-- armar ese ranking hay que contar entradas de TODAS las compras, y la
-- política de Compras solo deja leer las propias (y al empleado y al
-- admin): un visitante sin sesión no puede contar nada.
--
-- Una vista es una consulta guardada con nombre. Desde la app se lee
-- como una tabla, con .from('PeliculasMasVendidas'), pero no guarda
-- datos: cada vez que se la consulta, Postgres vuelve a hacer la cuenta,
-- así que nunca queda desactualizada (por ejemplo, tras una cancelación).
--
-- POR QUÉ PUEDE CONTAR LO QUE EL VISITANTE NO PUEDE LEER: una vista
-- corre con los permisos de su dueño, que es quien la crea desde este
-- editor, y a él RLS no lo frena. Es lo mismo que el "security definer"
-- de rol_actual() (sección 2). No abre las compras: lo único que sale de
-- la vista son dos columnas, la película y un total. No hay mails,
-- montos ni códigos, y no se puede saber quién compró qué.
--
-- Tablas que usa:
--   Entradas   una fila por butaca vendida: es lo que se cuenta.
--   Compras    para quedarse solo con las pagadas (las canceladas no
--              cuentan).
--   Funciones  para saber de qué película es cada entrada: Entradas
--              guarda la función, no la película.
--
--   join ... on    une cada fila de una tabla con la que le corresponde
--                  de la otra: cada entrada con su compra y su función.
--   count(*)       cuenta filas.
--   group by       arma un grupo por película: el count cuenta dentro de
--                  cada grupo, y sale una fila por película.
--
-- Una película sin entradas vendidas no aparece en la vista. Que solo
-- cuenten las que hoy están en cartelera, y completar hasta 3 con los
-- estrenos más recientes, lo resuelve el front (services/cartelera.ts).

create view public."PeliculasMasVendidas" as
select
  f.pelicula_id,
  count(*) as entradas_vendidas
from public."Entradas" e
join public."Compras" c on c.id = e.compra_id
join public."Funciones" f on f.id = e.funcion_id
where c.estado = 'pagada'
group by f.pelicula_id;

-- La lee cualquiera, con o sin sesión, igual que la cartelera (R-02).
-- Una vista no lleva políticas de RLS: el permiso se da con grant.
grant select on public."PeliculasMasVendidas" to anon, authenticated;

-- Lo demás que lee la cartelera sin sesión ya tiene su política de
-- lectura para anon y authenticated desde la sección 3: Peliculas,
-- Generos, PeliculasGeneros, Funciones y Salas. No hizo falta agregar
-- ninguna. Esta consulta lo confirma sobre la base viva: tiene que
-- devolver una fila por cada una de las cinco tablas, con anon y
-- authenticated en la columna roles.
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and cmd = 'SELECT'
  and tablename in ('Peliculas', 'Generos', 'PeliculasGeneros', 'Funciones', 'Salas');


-- ============================================================
-- 11. COMPRA  (decisiones D-38 y D-39)
-- ============================================================
-- La compra deja de hacerse con inserts sueltos desde el front y pasa a
-- ser una función de Postgres, realizar_compra, que la app llama con
-- rpc(). La función valida todo, calcula los precios e inserta la compra,
-- sus entradas y las butacas ocupadas en una sola transacción: entra
-- todo o no entra nada.
--
-- Orden:
--   11.1 Compras: columna medio_pago
--   11.2 Tabla ButacasOcupadas, pública, con unique y Realtime
--   11.3 Políticas: se cierra la escritura directa y la lectura de Entradas
--   11.4 Función realizar_compra


-- ---------- 11.1 Compras: medio de pago ----------
-- De lo que la compra necesita, es lo único que le faltaba a la tabla:
-- email, total, codigo, estado y usuario_id ya estaban (sección 1).
-- El pago es simulado (A-01): se guarda solo qué medio se eligió. Los
-- datos de la tarjeta no se guardan en ningún lado.
--
-- La columna nace not null, así que el alter falla si Compras ya tiene
-- filas (no tendrían medio de pago). Este select tiene que dar 0; si no,
-- hay que borrar esas compras de prueba antes.

select count(*) as compras_existentes from public."Compras";

alter table public."Compras"
  add column medio_pago text not null
    check (medio_pago in ('credito', 'debito', 'mercado_pago'));


-- ---------- 11.2 ButacasOcupadas (R-16, D-38) ----------
-- Qué butacas de cada función ya están vendidas. Es lo único que el mapa
-- necesita saber, y es lo único que guarda: ni quién la compró ni cuánto
-- pagó. Por eso puede ser pública y avisar por Realtime a cualquiera que
-- esté mirando el mapa, mientras Compras y Entradas quedan privadas.
--
-- unique (funcion_id, fila, numero): no puede haber dos filas con la
-- misma combinación de las tres columnas. La misma butaca se puede
-- vender en dos funciones distintas, pero no dos veces en la misma. Es
-- lo que hace imposible la doble venta: si dos personas compran la misma
-- butaca a la vez, el segundo insert es rechazado por la base (código
-- 23505), sin importar lo que haya mostrado el mapa de cada una.

create table public."ButacasOcupadas" (
  id          bigint generated always as identity primary key,
  funcion_id  bigint not null references public."Funciones"(id) on delete cascade,
  fila        char(1) not null,
  numero      int not null,
  unique (funcion_id, fila, numero)
);

alter table public."ButacasOcupadas" enable row level security;

-- La lee cualquiera, con o sin sesión. No hay política de insert, update
-- ni delete: nadie escribe directo. La única que inserta es
-- realizar_compra, que es security definer.
create policy "butacas_ocupadas: lectura publica"
  on public."ButacasOcupadas" for select to anon, authenticated using (true);

-- Realtime avisa solo de las tablas que están en esta lista. Es lo mismo
-- que activar Realtime para la tabla desde el panel, pero escrito acá
-- para que quede en el script (D-11).
alter publication supabase_realtime add table public."ButacasOcupadas";


-- ---------- 11.3 Políticas: se cierra la escritura directa ----------
-- Hasta acá, Compras y Entradas aceptaban inserts de cualquiera, incluso
-- sin sesión: era la forma de comprar desde el front. Con esas políticas
-- abiertas, alguien podría saltearse la función e insertar una entrada al
-- precio que quiera desde la consola del navegador. Se quitan: la única
-- puerta de entrada es realizar_compra.
--
-- "drop policy if exists" borra la política si está; si no está, sigue.

drop policy if exists "cliente crea su compra"        on public."Compras";
drop policy if exists "anonimo crea compra"           on public."Compras";
drop policy if exists "entradas: insert autenticado"  on public."Entradas";
drop policy if exists "entradas: insert anonimo"      on public."Entradas";

-- Entradas era de lectura pública porque el mapa de butacas salía de
-- ahí. Ahora sale de ButacasOcupadas, así que Entradas pasa a ser
-- privada: cada uno lee las de sus compras (para Mis películas, R-12), y
-- el empleado y el admin las leen todas (validación y reportes).
-- La vista PeliculasMasVendidas no se ve afectada: corre con los permisos
-- de su dueño (sección 10).
drop policy if exists "entradas: lectura publica" on public."Entradas";

create policy "entradas: lectura propia"
  on public."Entradas" for select to authenticated
  using (
    exists (
      select 1 from public."Compras" c
      where c.id = compra_id
        and (c.usuario_id = auth.uid() or public.es_empleado() or public.es_admin())
    )
  );


-- ---------- 11.4 Función realizar_compra (D-39) ----------
-- La app la llama con rpc('realizar_compra', { p_funcion_id, p_butacas,
-- p_email, p_medio_pago, p_fecha_nacimiento }). Los parámetros llevan el
-- prefijo p_ para que no se confundan con las columnas que se llaman
-- igual.
--
--   p_funcion_id        la función elegida.
--   p_butacas           las butacas, como una lista JSON:
--                       [{"fila": "A", "numero": 5}, {"fila": "R", "numero": 12}]
--   p_email             el mail del comprador. Solo se usa si no hay sesión.
--   p_medio_pago        'credito', 'debito' o 'mercado_pago'.
--   p_fecha_nacimiento  la fecha de nacimiento que declara el comprador
--                       (D-06). Solo se usa si no hay sesión y la película
--                       tiene restricción de edad; si no, va null.
--
-- SECURITY DEFINER: corre con los permisos de quien la creó, así que
-- puede insertar en Compras, Entradas y ButacasOcupadas aunque quien la
-- llama no tenga permiso de escritura sobre ninguna. El search_path fijo
-- es la precaución que acompaña siempre a security definer (igual que en
-- rol_actual(), sección 2): nadie puede hacerle usar otra tabla con el
-- mismo nombre.
--
-- TRANSACCIÓN: una función corre entera dentro de una transacción. Si
-- cualquier paso hace "raise exception", se deshace todo lo que la
-- función había hecho hasta ahí. No puede quedar una compra a medias.
--
-- ERRORES: cada regla que no se cumple hace raise exception con un
-- mensaje escrito para el comprador. Llegan al front con el código P0001
-- y el servicio muestra ese texto tal cual (services/compras.ts).
--
-- Devuelve un JSON con lo que la pantalla de confirmación necesita,
-- porque un comprador sin sesión no tiene permiso para volver a leer su
-- compra:
--   { "codigo": "OLY-1A2B-3C4D", "total": 15000, "email": "...",
--     "requiere_adulto": false,
--     "entradas": [{"fila": "A", "numero": 5, "es_vip": false, "precio": 5000}] }
--
-- Cosas de plpgsql que aparecen acá por primera vez:
--   jsonb                      un valor JSON guardado de forma que se
--                              puede recorrer y consultar.
--   jsonb_typeof(x)            dice qué es: 'array', 'object', 'string'...
--   jsonb_array_length(x)      cuántos elementos tiene una lista JSON.
--   jsonb_array_elements(x)    convierte la lista en filas, una por
--                              elemento, para recorrerla con un for.
--   x ->> 'clave'              el valor de esa clave, como texto.
--   x || y                     agrega y al final de la lista x.
--   jsonb_build_object(...)    arma un objeto JSON: clave, valor, clave,
--                              valor...
--   auth.uid()                 el id del usuario con sesión; null si no
--                              hay sesión.
--   age(a, b)                  el tiempo entre dos fechas; con
--                              extract(year from ...) quedan los años
--                              cumplidos.
--   begin ... exception when   atrapa un error de la base para cambiarle
--                              el mensaje.
--   found                      verdadero si el último select encontró
--                              una fila.
--   coalesce(x, y)             x, o y si x es null.
--   texto !~ 'patrón'          verdadero si el texto NO cumple la
--                              expresión regular (lo contrario de ~).
--   to_char(fecha, 'DD/MM/YYYY')  escribe la fecha con ese formato.
--   gen_random_uuid()          un identificador al azar.
--   insert ... returning id into x   guarda en x el id de la fila recién
--                              insertada.
--   loop ... exit when         repite hasta que se cumple la condición.

-- La primera versión de esta función tenía cuatro parámetros, sin la
-- fecha de nacimiento. Para Postgres, dos funciones con el mismo nombre y
-- distintos parámetros son dos funciones distintas: "create or replace"
-- no pisaría la vieja, quedarían las dos. Por si llegó a crearse, se
-- borra. Si no existe, no pasa nada.
drop function if exists public.realizar_compra(bigint, jsonb, text, text);

create or replace function public.realizar_compra(
  p_funcion_id        bigint,
  p_butacas           jsonb,
  p_email             text,
  p_medio_pago        text,
  p_fecha_nacimiento  date
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

  -- Las butacas
  v_cantidad        int;
  v_butaca          jsonb;
  v_fila            text;
  v_numero          int;
  v_es_vip          boolean;
  v_precio          numeric(12,2);
  v_total           numeric(12,2) := 0;
  v_entradas        jsonb := '[]'::jsonb;

  -- La compra
  v_codigo          text;
  v_compra_id       bigint;
begin
  -- ----- 1. La función existe y todavía no empezó -----
  select f.pelicula_id, f.fecha_hora, f.precio_base, f.precio_vip
    into v_pelicula_id, v_fecha_hora, v_precio_base, v_precio_vip
  from public."Funciones" f
  where f.id = p_funcion_id;

  -- "found" es verdadero si el select anterior encontró una fila.
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

  -- Una película oculta se puede leer, pero no está ofrecida (D-34): no
  -- se le venden entradas, aunque alguien llegue con el link directo.
  if not v_visible then
    raise exception 'Esta película no está disponible para la venta.';
  end if;

  -- ----- 2. La venta está abierta (R-11) -----
  -- "Hoy" es el día de Argentina, no el del servidor (ver sección 9.5).
  -- Con preventa, la venta abre 7 días antes del estreno; sin preventa,
  -- el día del estreno. Restarle un número a un date le resta días.
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

  -- Está en preventa mientras no haya llegado el día del estreno. Desde
  -- ese día el precio vuelve al normal, sin que nadie toque nada.
  v_en_preventa := v_preventa and v_hoy < v_estreno;

  -- ----- 3. El medio de pago es uno de la lista -----
  if p_medio_pago is null or p_medio_pago not in ('credito', 'debito', 'mercado_pago') then
    raise exception 'Elegí un medio de pago válido.';
  end if;

  -- ----- 4. El comprador: edad y mail -----
  v_usuario := auth.uid();

  if v_usuario is not null then
    select u.fecha_nacimiento, u.email into v_nacimiento, v_email
    from public."Usuarios" u
    where u.id = v_usuario;

    if not found then
      raise exception 'No se encontró tu perfil. Cerrá la sesión y volvé a ingresar.';
    end if;
  end if;

  -- Control de edad (R-25, D-06). Solo si la película tiene restricción.
  --   Con sesión: la fecha de nacimiento es la del perfil, que ya se leyó
  --   arriba. Lo que venga en p_fecha_nacimiento se ignora.
  --   Sin sesión: el comprador la declara. Es obligatoria, y se valida
  --   con la misma regla que el check de Usuarios (sección 9.5): no
  --   futura y no más de 120 años atrás, con "hoy" en hora argentina.
  -- En una película sin restricción no se pide ni se guarda nada.
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

    -- age() da el tiempo entre las dos fechas, y extract(year ...) se
    -- queda con los años cumplidos.
    v_edad := extract(year from age(v_hoy, v_nacimiento));
    if v_edad < v_restriccion then
      raise exception 'Esta película es para mayores de % años.', v_restriccion;
    end if;
  end if;

  -- Sin sesión, el mail es obligatorio: es lo que identifica al comprador
  -- de una compra anónima (R-02). No se envía ningún correo: la entrada
  -- se genera en PDF al terminar la compra.
  -- Se guarda sin espacios y en minúsculas. El patrón es el mismo del
  -- validador email() del front: algo@algo.algo, sin espacios.
  -- Con sesión se usa el mail del perfil, y p_email se ignora.
  if v_usuario is null then
    v_email := lower(trim(coalesce(p_email, '')));
    if v_email = '' then
      raise exception 'Ingresá tu mail para registrar la compra.';
    end if;
    if char_length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
      raise exception 'El mail no tiene un formato válido.';
    end if;
  end if;

  -- ----- 5. Las butacas: cantidad, validez y precio -----
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

    -- El número tiene que ser un entero escrito solo con dígitos; recién
    -- entonces se lo convierte. Sin este chequeo, un valor como "abc"
    -- cortaría la función con un error técnico de Postgres.
    if coalesce(v_butaca ->> 'numero', '') !~ '^[0-9]{1,2}$' then
      raise exception 'Alguna de las butacas elegidas no existe en la sala.';
    end if;
    v_numero := (v_butaca ->> 'numero')::int;

    -- La distribución de la sala (R-13, D-04): filas de la A a la T. Las
    -- filas J y K son las accesibles y tienen 14 butacas (2, 10 y 2); las
    -- demás tienen 28 (4, 20 y 4). Es la misma regla que usa el front
    -- para dibujar el mapa.
    if v_fila !~ '^[A-T]$' then
      raise exception 'Alguna de las butacas elegidas no existe en la sala.';
    end if;
    if v_numero < 1
       or (v_fila in ('J', 'K') and v_numero > 14)
       or v_numero > 28 then
      raise exception 'Alguna de las butacas elegidas no existe en la sala.';
    end if;

    -- El precio se decide acá, con los datos de la base. Lo que haya
    -- mostrado o mandado el navegador no se usa.
    --   VIP (filas R, S y T): siempre precio_vip, también en preventa.
    --   Comunes y accesibles: precio_preventa durante la preventa;
    --   si no, precio_base.
    v_es_vip := v_fila in ('R', 'S', 'T');
    if v_es_vip then
      v_precio := v_precio_vip;
    elsif v_en_preventa then
      v_precio := v_precio_preventa;
    else
      v_precio := v_precio_base;
    end if;

    v_total := v_total + v_precio;
    v_entradas := v_entradas || jsonb_build_object(
      'fila', v_fila,
      'numero', v_numero,
      'es_vip', v_es_vip,
      'precio', v_precio
    );
  end loop;

  -- ----- 6. El código de la compra (D-09) -----
  -- Formato OLY-XXXX-XXXX. Los ocho caracteres salen de un uuid al azar
  -- (gen_random_uuid), que no se puede adivinar: se le sacan los guiones,
  -- se pasa a mayúsculas y se toman dos bloques de cuatro. Si justo ya
  -- existe una compra con ese código, se genera otro.
  loop
    v_codigo := upper(replace(gen_random_uuid()::text, '-', ''));
    v_codigo := 'OLY-' || substr(v_codigo, 1, 4) || '-' || substr(v_codigo, 5, 4);
    exit when not exists (select 1 from public."Compras" c where c.codigo = v_codigo);
  end loop;

  -- ----- 7. Guardar todo -----
  -- El bloque begin ... exception atrapa un error en particular: la
  -- violación de unique. Pasa cuando alguna de las butacas ya está en
  -- ButacasOcupadas para esa función (otra persona la compró antes), o si
  -- la misma butaca vino dos veces en la lista. Se le cambia el mensaje
  -- por uno que el comprador entienda; al salir con raise exception se
  -- deshace todo, incluida la fila de Compras de acá abajo.
  begin
    -- v_declarada queda en null salvo en la compra sin sesión de una
    -- película con restricción.
    insert into public."Compras"
      (usuario_id, email, fecha_nacimiento_declarada, codigo, total, medio_pago)
    values
      (v_usuario, v_email, v_declarada, v_codigo, v_total, p_medio_pago)
    returning id into v_compra_id;

    for v_butaca in select * from jsonb_array_elements(v_entradas)
    loop
      insert into public."Entradas" (compra_id, funcion_id, fila, numero, es_vip, precio)
      values (
        v_compra_id,
        p_funcion_id,
        v_butaca ->> 'fila',
        (v_butaca ->> 'numero')::int,
        (v_butaca ->> 'es_vip')::boolean,
        (v_butaca ->> 'precio')::numeric
      );

      insert into public."ButacasOcupadas" (funcion_id, fila, numero)
      values (p_funcion_id, v_butaca ->> 'fila', (v_butaca ->> 'numero')::int);
    end loop;
  exception
    when unique_violation then
      raise exception 'Alguna de las butacas ya fue vendida. Elegí otras.';
  end;

  -- ----- 8. Lo que necesita la pantalla de confirmación -----
  return jsonb_build_object(
    'codigo', v_codigo,
    'total', v_total,
    'email', v_email,
    'requiere_adulto', v_restriccion is not null,
    'entradas', v_entradas
  );
end;
$$;

-- Quién puede llamarla: cualquiera, con o sin sesión (R-02). Los
-- controles están adentro de la función.
grant execute on function public.realizar_compra(bigint, jsonb, text, text, date)
  to anon, authenticated;


-- ============================================================
-- PUNTOS ABIERTOS — leer antes de seguir
-- ============================================================
--
-- 1. CAMBIO DE ROL POR EL ADMIN.
--    El revoke de arriba alcanza a todos los usuarios autenticados,
--    incluido el admin, así que hoy NADIE puede cambiar un rol desde
--    la app. Para el TP alcanza con cambiarlo a mano desde el panel de
--    Supabase, que es como vas a crear tu admin y tu empleado.
--    Si querés una pantalla de gestión de roles, hay que resolverlo
--    aparte. Decisión pendiente.
--
-- 2. PUNTOS Y CRÉDITO.
--    Por el mismo revoke, el usuario no puede escribir sus propios
--    puntos ni su crédito — que es lo que queremos. Pero entonces la
--    compra tampoco puede sumarle puntos desde el front.
--    Esto se decide en el bloque de compra (03/10). Las opciones son
--    calcularlos al vuelo desde las compras, o una función en la base.
--
-- 3. LECTURA DE COMPRAS ANÓNIMAS.  -- RESUELTO (sección 11.4, D-39)
--    El anónimo no puede leer su compra después de hacerla. No hace
--    falta: realizar_compra devuelve todo lo que la pantalla de
--    confirmación necesita. Volver a verla más tarde con el código
--    sigue sin estar: no lo pide ningún mail.
--
-- 4. DOBLE VENTA DE BUTACAS.  -- RESUELTO (sección 11.2, D-38)
--    La unique no va sobre Entradas sino sobre ButacasOcupadas
--    (funcion_id, fila, numero). Las entradas de una compra cancelada
--    quedan como historial, y esa butaca tiene que poder venderse otra
--    vez: con la unique en Entradas no se podría.
