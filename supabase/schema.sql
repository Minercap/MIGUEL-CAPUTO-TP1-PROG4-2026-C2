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
-- El cliente ve las suyas. El empleado y el admin ven todas, porque
-- tienen que validar entradas (R-31).
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
-- los que hacen las acciones que se auditan.
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
