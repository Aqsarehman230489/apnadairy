-- =========================================================
-- apnadairy · module 1c · admin user management
-- run in supabase sql editor (after 02_verification_documents.sql)
-- =========================================================

-- the role a user had before becoming admin (so "remove admin" can restore it)
create or replace function public.base_role(p_user uuid)
returns user_role
language sql stable security definer set search_path = public
as $$
  select case
    when exists (select 1 from public.area_managers where user_id = p_user)     then 'area_manager'::user_role
    when exists (select 1 from public.business_profiles where user_id = p_user) then 'business'::user_role
    else 'customer'::user_role
  end;
$$;

-- make / remove admin
create or replace function public.set_admin(p_user uuid, p_make_admin boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'only super admin can do this';
  end if;
  if p_user = auth.uid() then
    raise exception 'you cannot change your own admin role';
  end if;

  update public.profiles
     set role = case when p_make_admin then 'super_admin'::user_role else public.base_role(p_user) end,
         status = case when p_make_admin then 'active'::account_status else status end,
         updated_at = now()
   where id = p_user;
end;
$$;

-- suspend / reactivate any user (keeps verification tables in sync)
create or replace function public.set_user_status(p_user uuid, p_status account_status)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'only super admin can do this';
  end if;
  if p_user = auth.uid() then
    raise exception 'you cannot change your own status';
  end if;
  if p_status not in ('active', 'suspended') then
    raise exception 'use approvals for pending / rejected applications';
  end if;
  -- pending / rejected applicants must go through approvals (document checks)
  if exists (select 1 from public.profiles where id = p_user and status in ('pending', 'rejected')) then
    raise exception 'this account is still an application — use the approvals page';
  end if;

  update public.profiles set status = p_status, updated_at = now() where id = p_user;
  update public.area_managers     set verification_status = p_status where user_id = p_user and verification_status in ('active', 'suspended');
  update public.business_profiles set verification_status = p_status where user_id = p_user and verification_status in ('active', 'suspended');
end;
$$;
