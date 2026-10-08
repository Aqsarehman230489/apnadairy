-- 48: the super admin can delete an account for good, so the same email can sign up again
-- run after 47_bulk_orders.sql (safe to run again).
--
-- removes the login with everything that belongs to it (center or business, its farmers' links, milk, stock,
-- listings, orders, bids, bills, reviews, notifications). a buyer's request that loses an order opens again,
-- and farmers whose center is deleted ask another center in their city. super admins are managed on the admins page.
create or replace function public.delete_account(p_user uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  p      public.profiles;
  v_city text;
  v_email text;
begin
  if not public.is_admin() then raise exception 'only super admin can do this'; end if;
  if p_user = auth.uid() then raise exception 'you cannot delete your own account'; end if;
  select * into p from profiles where id = p_user;
  if p.id is null then raise exception 'account not found'; end if;
  if p.role = 'super_admin' then raise exception 'admins are removed on the admins page'; end if;
  select email into v_email from auth.users where id = p_user;
  select city into v_city from area_managers where user_id = p_user and type = 'milk_center';

  -- rows that would stop the delete
  delete from bulk_orders o
   where o.area_manager_id in (select a.id from area_managers a where a.user_id = p_user)
      or o.business_id in (select b.id from business_profiles b where b.user_id = p_user);
  delete from collection_audit where actor = p_user;
  delete from usage_audit where actor = p_user;
  update admin_invites set invited_by = null where invited_by = p_user;
  update area_managers set verified_by = null where verified_by = p_user;
  update business_profiles set verified_by = null where verified_by = p_user;

  -- their uploaded files (if storage allows removing them from sql; otherwise they just stay unused)
  begin
    delete from storage.objects where (storage.foldername(name))[1] = p_user::text;
  exception when others then null;
  end;

  delete from auth.users where id = p_user;   -- the profile and everything under it go with it

  -- a buyer's request that lost an order needs that milk again
  update bulk_requirements r set status = 'open'
   where r.status = 'awarded' and public.requirement_covered(r.id) < r.quantity_l
     and r.required_date >= (now() at time zone 'Asia/Karachi')::date;
  -- farmers who sold to this center ask another one in their city
  if v_city is not null and to_regprocedure('public.app_farmers_in_city_ask(text)') is not null then
    perform public.app_farmers_in_city_ask(v_city);
  end if;
  return v_email;
end;
$$;
revoke all on function public.delete_account(uuid) from public, anon;
grant execute on function public.delete_account(uuid) to authenticated;
