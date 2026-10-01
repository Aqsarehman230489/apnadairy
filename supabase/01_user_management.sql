-- =========================================================
-- apnadairy · module 1 · user management
-- run once in supabase dashboard → sql editor → new query
-- =========================================================

-- ---------- enums ----------
create type user_role as enum ('super_admin', 'area_manager', 'business', 'farmer', 'customer');
create type account_status as enum ('pending', 'active', 'rejected', 'suspended');
create type area_manager_type as enum ('milk_center', 'byproduct');
create type business_type as enum ('restaurant', 'bakery', 'hotel', 'shop', 'distributor', 'other');

-- ---------- profiles (1 row per auth user) ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  phone       text,
  role        user_role not null default 'customer',
  status      account_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- area managers ----------
create table public.area_managers (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.profiles(id) on delete cascade,
  type                area_manager_type not null default 'milk_center',
  center_name         text not null,
  city                text not null,
  address             text,
  latitude            double precision,
  longitude           double precision,
  verification_status account_status not null default 'pending',
  verified_by         uuid references public.profiles(id),
  verified_at         timestamptz,
  rejection_reason    text,
  created_at          timestamptz not null default now()
);

-- ---------- business profiles (b2b buyers) ----------
create table public.business_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.profiles(id) on delete cascade,
  business_name       text not null,
  business_type       business_type not null default 'other',
  city                text not null,
  address             text,
  verification_status account_status not null default 'pending',
  verified_by         uuid references public.profiles(id),
  verified_at         timestamptz,
  rejection_reason    text,
  created_at          timestamptz not null default now()
);

-- ---------- helper: is current user super admin ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and status = 'active'
  );
$$;

-- ---------- on signup: create profile + role row ----------
-- role comes from signup metadata. super_admin can never be self-assigned.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role user_role;
begin
  v_role := case meta->>'role'
              when 'area_manager' then 'area_manager'::user_role
              when 'business'     then 'business'::user_role
              when 'farmer'       then 'farmer'::user_role
              else 'customer'::user_role
            end;

  insert into public.profiles (id, full_name, email, phone, role, status)
  values (
    new.id,
    coalesce(meta->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    meta->>'phone',
    v_role,
    case when v_role in ('area_manager', 'business') then 'pending'::account_status
         else 'active'::account_status end
  );

  if v_role = 'area_manager' then
    insert into public.area_managers (user_id, type, center_name, city, address)
    values (
      new.id,
      coalesce(meta->>'manager_type', 'milk_center')::area_manager_type,
      coalesce(meta->>'center_name', 'unnamed center'),
      coalesce(meta->>'city', 'unknown'),
      meta->>'address'
    );
  elsif v_role = 'business' then
    insert into public.business_profiles (user_id, business_name, business_type, city, address)
    values (
      new.id,
      coalesce(meta->>'business_name', 'unnamed business'),
      coalesce(meta->>'business_type', 'other')::business_type,
      coalesce(meta->>'city', 'unknown'),
      meta->>'address'
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- admin action: approve / reject / suspend ----------
-- p_kind: 'area_manager' | 'business'   p_id: row id in that table
create or replace function public.set_verification(
  p_kind   text,
  p_id     uuid,
  p_status account_status,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'only super admin can do this';
  end if;

  if p_kind = 'area_manager' then
    update public.area_managers
       set verification_status = p_status, verified_by = auth.uid(),
           verified_at = now(), rejection_reason = p_reason
     where id = p_id
     returning user_id into v_user;
  elsif p_kind = 'business' then
    update public.business_profiles
       set verification_status = p_status, verified_by = auth.uid(),
           verified_at = now(), rejection_reason = p_reason
     where id = p_id
     returning user_id into v_user;
  else
    raise exception 'unknown kind %', p_kind;
  end if;

  if v_user is null then
    raise exception 'record not found';
  end if;

  update public.profiles set status = p_status, updated_at = now() where id = v_user;
end;
$$;

-- ---------- row level security ----------
alter table public.profiles          enable row level security;
alter table public.area_managers     enable row level security;
alter table public.business_profiles enable row level security;

-- profiles
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- users may only edit these columns themselves (role/status change only via set_verification)
revoke update on public.profiles from authenticated;
grant update (full_name, phone, updated_at) on public.profiles to authenticated;

-- area managers
create policy "area_managers: read own or admin" on public.area_managers
  for select using (user_id = auth.uid() or public.is_admin());

-- business profiles
create policy "business: read own or admin" on public.business_profiles
  for select using (user_id = auth.uid() or public.is_admin());

-- =========================================================
-- make yourself super admin (run AFTER signing up once on the site):
--
-- update public.profiles
--    set role = 'super_admin', status = 'active'
--  where email = 'your@email.com';
-- =========================================================
