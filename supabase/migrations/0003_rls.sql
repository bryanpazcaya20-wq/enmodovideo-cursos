-- =============================================================
-- En Modo Video · Cursos — 0003: seguridad por filas (RLS)
-- Regla general: el público lee el catálogo publicado; cada alumno lee lo suyo;
-- todo lo que escribe el panel pasa por el servidor (service role) tras validar al admin.
-- =============================================================

alter table public.profiles         enable row level security;
alter table public.courses          enable row level security;
alter table public.course_modules   enable row level security;
alter table public.lessons          enable row level security;
alter table public.lesson_content   enable row level security;
alter table public.coupons          enable row level security;
alter table public.orders           enable row level security;
alter table public.enrollments      enable row level security;
alter table public.access_grants    enable row level security;
alter table public.lesson_progress  enable row level security;
alter table public.pending_progress enable row level security;
alter table public.active_sessions  enable row level security;
alter table public.audit_log        enable row level security;
alter table public.webhook_events   enable row level security;
alter table public.email_log        enable row level security;
alter table public.rate_limits      enable row level security;
-- coupons, access_grants, pending_progress, active_sessions, audit_log, webhook_events,
-- email_log y rate_limits: sin políticas → solo el servidor (service role) los usa.

-- ---------- Perfiles ----------
create policy "perfil: ver el propio" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "perfil: editar el propio" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Catálogo público ----------
create policy "cursos: ver publicados" on public.courses
  for select to anon, authenticated using (status = 'published' or public.is_admin());

create policy "módulos: ver de cursos publicados" on public.course_modules
  for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and (c.status = 'published' or public.is_admin())));

create policy "lecciones: ver de cursos publicados" on public.lessons
  for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and (c.status = 'published' or public.is_admin())));

-- ---------- Contenido protegido: inscritos, admins o clase gratis ----------
create policy "contenido: inscritos o vista previa" on public.lesson_content
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.lessons l join public.courses c on c.id = l.course_id
      where l.id = lesson_id
        and (public.is_admin()
             or (c.status = 'published' and (l.is_preview or public.has_course_access(l.course_id))))
    )
  );

-- ---------- Lo del alumno ----------
create policy "inscripciones: ver las propias" on public.enrollments
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "pedidos: ver los propios" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "progreso: ver el propio" on public.lesson_progress
  for select to authenticated using (user_id = auth.uid());
create policy "progreso: marcar (con acceso)" on public.lesson_progress
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.has_course_access(course_id)
    and exists (select 1 from public.lessons l where l.id = lesson_id and l.course_id = course_id)
  );
create policy "progreso: desmarcar" on public.lesson_progress
  for delete to authenticated using (user_id = auth.uid());
