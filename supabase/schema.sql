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
as $ select public.rol_actual() = 'empleado'; $;

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
--   En cartelera y Próximamente a la vez. Está "a decidir con la
--   cartelera" en docs/validaciones.md.


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
-- 3. LECTURA DE COMPRAS ANÓNIMAS.
--    El anónimo puede insertar su compra, pero no hay política que lo
--    deje leerla después. Para mostrarle la entrada alcanza con los
--    datos que la app ya tiene en memoria. Si querés que pueda volver
--    a ver su compra con el código, hace falta una política más.
--    Decisión pendiente para el bloque de compra.
--
-- 4. DOBLE VENTA DE BUTACAS.
--    Falta la constraint unique sobre Entradas (funcion_id, fila,
--    numero). Es lo único que impide de verdad que dos compras
--    simultáneas tomen la misma butaca. Ya agendado para el 03/10.
