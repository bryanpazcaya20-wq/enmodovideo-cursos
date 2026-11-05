-- =============================================================
-- En Modo Video · Cursos — 0002: funciones y triggers
-- =============================================================

-- ---------- ¿Es admin? ----------
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin');
$$;

-- ---------- ¿Tiene acceso a este curso? (ÚNICA fuente de verdad) ----------
create or replace function public.has_course_access(p_course uuid, uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select uid is not null and (
    public.is_admin(uid) or exists (
      select 1
      from public.enrollments e
      join public.profiles p on p.id = e.user_id
      where e.user_id = uid
        and e.course_id = p_course
        and e.revoked_at is null
        and (e.expires_at is null or e.expires_at > now())
        and p.blocked_at is null
    )
  );
$$;

-- ---------- updated_at automático ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at       before update on public.profiles       for each row execute function public.set_updated_at();
create trigger courses_updated_at        before update on public.courses        for each row execute function public.set_updated_at();
create trigger lessons_updated_at        before update on public.lessons        for each row execute function public.set_updated_at();
create trigger lesson_content_updated_at before update on public.lesson_content for each row execute function public.set_updated_at();
create trigger coupons_updated_at        before update on public.coupons        for each row execute function public.set_updated_at();
create trigger orders_updated_at         before update on public.orders         for each row execute function public.set_updated_at();
create trigger active_sessions_updated_at before update on public.active_sessions for each row execute function public.set_updated_at();

-- ---------- Convierte los accesos y el progreso guardados por correo en inscripciones ----------
create or replace function public.claim_access_grants(p_user uuid)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_email text;
  v_count int := 0;
begin
  select email into v_email from public.profiles where id = p_user;
  if v_email is null then return 0; end if;

  insert into public.enrollments (user_id, course_id, source, granted_by)
  select p_user, g.course_id, g.source, g.granted_by
  from public.access_grants g
  where g.email = v_email::citext and g.claimed_at is null
  on conflict (user_id, course_id) do update
    set revoked_at = null
    where public.enrollments.revoked_at is not null;
  get diagnostics v_count = row_count;

  update public.access_grants
     set claimed_by = p_user, claimed_at = now()
   where email = v_email::citext and claimed_at is null;

  insert into public.lesson_progress (user_id, lesson_id, course_id, completed_at)
  select p_user, pp.lesson_id, l.course_id, pp.completed_at
  from public.pending_progress pp
  join public.lessons l on l.id = pp.lesson_id
  where pp.email = v_email::citext
  on conflict do nothing;

  delete from public.pending_progress where email = v_email::citext;

  -- Pedidos de la web anterior (WordPress) hechos con este correo
  update public.orders
     set user_id = p_user
   where user_id is null and provider = 'wordpress' and lower(payer_email) = lower(v_email);

  return v_count;
end;
$$;

-- ---------- Al registrarse: crear perfil y reclamar accesos ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_provider public.auth_provider := 'email';
begin
  if coalesce(new.raw_app_meta_data->>'provider', 'email') = 'google' then
    v_provider := 'google';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, provider)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    v_provider
  )
  on conflict (id) do nothing;

  -- Los accesos por correo se reclaman cuando el correo está confirmado
  -- (Google siempre lo está; en el registro con contraseña, al confirmar el correo).
  if new.email_confirmed_at is not null then
    perform public.claim_access_grants(new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Al confirmar el correo (registro con contraseña): reclamar accesos.
create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.claim_access_grants(new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_confirmed();

-- ---------- Anti-escalada: un miembro no puede cambiarse rol, correo ni bloqueo ----------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.role <> old.role or new.email <> old.email or new.provider <> old.provider
     or new.blocked_at is distinct from old.blocked_at or new.blocked_reason is distinct from old.blocked_reason then
    raise exception 'No tienes permiso para modificar estos datos';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------- Confirmar un pedido pagado (idempotente y atómico) ----------
-- Marca el pedido como pagado, crea la inscripción y suma el uso del cupón.
-- Devuelve true solo la PRIMERA vez (para enviar el correo una sola vez).
create or replace function public.fulfill_order(
  p_order uuid,
  p_capture_id text,
  p_payer_email text,
  p_raw jsonb
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if o.status = 'paid' then return false; end if;
  if o.status not in ('pending', 'failed') then raise exception 'El pedido no se puede confirmar (estado %)', o.status; end if;

  update public.orders
     set status = 'paid', paid_at = now(), paypal_capture_id = p_capture_id,
         payer_email = p_payer_email, raw = coalesce(p_raw, raw)
   where id = p_order;

  insert into public.enrollments (user_id, course_id, source, order_id)
  values (o.user_id, o.course_id, case when o.provider = 'free' then 'free_coupon'::public.enrollment_source else 'purchase' end, o.id)
  on conflict (user_id, course_id) do update
    set revoked_at = null, expires_at = null, order_id = excluded.order_id, source = excluded.source;

  if o.coupon_id is not null then
    update public.coupons set used_count = used_count + 1 where id = o.coupon_id;
  end if;

  return true;
end;
$$;

-- ---------- Límite de intentos (devuelve true si está permitido) ----------
create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_hits int;
begin
  insert into public.rate_limits as r (key, hits, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;

-- ---------- Ventas por día (panel) ----------
create or replace function public.sales_by_day(p_days int default 30)
returns table (day date, orders bigint, revenue numeric)
language sql stable security definer set search_path = public
as $$
  select d::date as day,
         count(o.id) as orders,
         coalesce(sum(o.amount), 0) as revenue
  from generate_series((now() at time zone 'America/Lima')::date - (p_days - 1), (now() at time zone 'America/Lima')::date, interval '1 day') d
  left join public.orders o
    on o.status = 'paid' and (o.paid_at at time zone 'America/Lima')::date = d::date
  group by d
  order by d;
$$;

-- Estas funciones solo las usa el servidor (service role)
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_confirmed() from public, anon, authenticated;
revoke execute on function public.claim_access_grants(uuid) from public, anon, authenticated;
revoke execute on function public.fulfill_order(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.sales_by_day(int) from public, anon, authenticated;
