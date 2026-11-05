-- =============================================================
-- En Modo Video · Cursos — 0001: tipos, tablas e índices
-- Ejecutar en orden en Supabase → SQL Editor (0001, 0002, 0003, 0004).
-- =============================================================

create extension if not exists citext;

-- ---------- Tipos ----------
create type public.user_role         as enum ('member', 'admin');
create type public.auth_provider     as enum ('email', 'google');
create type public.course_status     as enum ('draft', 'published');
create type public.course_level      as enum ('basico', 'intermedio', 'avanzado');
create type public.order_status      as enum ('pending', 'paid', 'refunded', 'failed', 'cancelled');
create type public.enrollment_source as enum ('purchase', 'admin', 'migration', 'free_coupon');
create type public.discount_type     as enum ('percent', 'fixed');

-- ---------- Perfiles ----------
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null unique,
  full_name       text,
  avatar_url      text,
  role            public.user_role not null default 'member',
  provider        public.auth_provider not null default 'email',
  blocked_at      timestamptz,
  blocked_reason  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- Cursos ----------
create table public.courses (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  title              text not null,
  subtitle           text,
  description_html   text,
  device_label       text,                        -- "Celular", "PC"…
  level              public.course_level not null default 'basico',
  cover_url          text,
  promo_video_id     text,                        -- video de presentación (Bunny), público
  learn_points       text[] not null default '{}',-- "Lo que aprenderás"
  requirements       text[] not null default '{}',
  price_usd          numeric(10,2) not null check (price_usd >= 0),
  -- Promoción: precio rebajado con fecha de fin opcional (se muestra el precio normal tachado)
  sale_price_usd     numeric(10,2) check (sale_price_usd is null or sale_price_usd >= 0),
  sale_ends_at       timestamptz,
  status             public.course_status not null default 'draft',
  sort_order         int not null default 0,
  wp_id              bigint unique,               -- id en el WordPress anterior (migración)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index courses_status_order_idx on public.courses (status, sort_order);

-- ---------- Módulos ----------
create table public.course_modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  sort_order  int not null default 0,
  wp_id       bigint unique,
  created_at  timestamptz not null default now()
);
create index course_modules_course_idx on public.course_modules (course_id, sort_order);

-- ---------- Lecciones (datos públicos del temario) ----------
create table public.lessons (
  id                uuid primary key default gen_random_uuid(),
  course_id         uuid not null references public.courses(id) on delete cascade,
  module_id         uuid not null references public.course_modules(id) on delete cascade,
  title             text not null,
  sort_order        int not null default 0,
  is_preview        boolean not null default false,  -- clase gratis visible sin comprar
  duration_seconds  int,
  wp_id             bigint unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index lessons_module_idx on public.lessons (module_id, sort_order);
create index lessons_course_idx on public.lessons (course_id);

-- ---------- Lecciones (contenido protegido) ----------
create table public.lesson_content (
  lesson_id        uuid primary key references public.lessons(id) on delete cascade,
  bunny_video_id   text,            -- null = lección solo de texto (p. ej. "Material de trabajo")
  body_html        text,            -- texto, enlaces de descarga, etc.
  updated_at       timestamptz not null default now()
);

-- ---------- Cupones ----------
create table public.coupons (
  id             uuid primary key default gen_random_uuid(),
  code           citext not null unique,
  discount_type  public.discount_type not null default 'percent',
  amount         numeric(10,2) not null check (amount > 0),
  course_id      uuid references public.courses(id) on delete cascade,  -- null = todos los cursos
  max_uses       int check (max_uses is null or max_uses > 0),
  used_count     int not null default 0,
  starts_at      timestamptz,
  expires_at     timestamptz,
  active         boolean not null default true,
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint coupons_percent_max check (discount_type <> 'percent' or amount <= 100)
);

-- ---------- Pedidos ----------
create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references public.profiles(id) on delete set null,
  course_id          uuid references public.courses(id) on delete set null,
  coupon_id          uuid references public.coupons(id) on delete set null,
  coupon_code        text,
  list_price         numeric(10,2) not null,
  discount           numeric(10,2) not null default 0,
  amount             numeric(10,2) not null,
  currency           text not null default 'USD',
  status             public.order_status not null default 'pending',
  provider           text not null default 'paypal',  -- paypal | free | wordpress
  paypal_order_id    text unique,
  paypal_capture_id  text unique,
  payer_email        text,
  paid_at            timestamptz,
  refunded_at        timestamptz,
  raw                jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_paid_idx on public.orders (status, paid_at desc);

-- ---------- Inscripciones (acceso a un curso) ----------
create table public.enrollments (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  source      public.enrollment_source not null,
  order_id    uuid references public.orders(id) on delete set null,
  granted_by  uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz,                    -- null = acceso de por vida
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  primary key (user_id, course_id)
);
create index enrollments_course_idx on public.enrollments (course_id);

-- ---------- Accesos por correo (para quien aún no tiene cuenta) ----------
-- Al crearse la cuenta con ese correo (Google o registro), se convierten en inscripciones.
create table public.access_grants (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null,
  course_id   uuid not null references public.courses(id) on delete cascade,
  source      public.enrollment_source not null default 'admin',
  granted_by  uuid references public.profiles(id) on delete set null,
  note        text,
  claimed_by  uuid references public.profiles(id) on delete set null,
  claimed_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (email, course_id)
);

-- ---------- Progreso ----------
create table public.lesson_progress (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  course_id     uuid not null references public.courses(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_progress_course_idx on public.lesson_progress (user_id, course_id);

-- Progreso importado del WordPress para alumnos que aún no tienen cuenta (se reclama con el correo).
create table public.pending_progress (
  email         citext not null,
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  primary key (email, lesson_id)
);

-- ---------- Una sola sesión activa por cuenta ----------
create table public.active_sessions (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  session_id  uuid not null,
  user_agent  text,
  updated_at  timestamptz not null default now()
);

-- ---------- Auditoría ----------
create table public.audit_log (
  id               bigint generated always as identity primary key,
  actor_id         uuid references public.profiles(id) on delete set null,
  action           text not null,
  target_user_id   uuid references public.profiles(id) on delete set null,
  target_course_id uuid references public.courses(id) on delete set null,
  reason           text,
  metadata         jsonb,
  created_at       timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- ---------- Webhooks (idempotencia) ----------
create table public.webhook_events (
  id           bigint generated always as identity primary key,
  provider     text not null,
  event_id     text not null,
  event_type   text not null,
  payload      jsonb not null,
  processed_at timestamptz,
  error        text,
  received_at  timestamptz not null default now(),
  unique (provider, event_id)
);

-- ---------- Correos ----------
create table public.email_log (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.profiles(id) on delete set null,
  to_email   text not null,
  template   text not null,
  dedupe_key text unique,
  sent_at    timestamptz not null default now(),
  error      text
);

-- ---------- Límite de intentos ----------
create table public.rate_limits (
  key          text primary key,
  hits         int not null default 0,
  window_start timestamptz not null default now()
);
