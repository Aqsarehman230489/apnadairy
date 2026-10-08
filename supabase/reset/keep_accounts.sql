-- keep only the listed accounts (and every farmer loaded from the app), remove every other account and its data.
-- cannot be undone. edit the emails on the set_config line if needed (comma separated).
--
-- kept:    the listed logins with everything that belongs to them, all farmers from supabase/seed/farmers_from_app.sql,
--          platform settings, market rates, iot devices (a device of a removed center becomes unassigned)
-- removed: every other login (centers, businesses, sellers, customers, other admins) with its centers, farmers, milk,
--          stock, listings, orders, bids, bills, reviews and notifications
-- a kept buyer's request that lost an order opens again, and farmers who lost their center ask a center in their city again.

select set_config('cleanup.keep', 'qaiaer427332@gmail.com, admin@apnadairy.com, aqsarehman373@gmail.com', false);

do $$
declare
  v_keep text[] := (select array_agg(lower(trim(x))) from unnest(string_to_array(current_setting('cleanup.keep'), ',')) x where trim(x) <> '');
  v_found text[];
  v_gone integer;
begin
  select array_agg(lower(u.email)) into v_found from auth.users u where lower(u.email) = any(v_keep);
  if not exists (select 1 from auth.users u join public.profiles p on p.id = u.id
                  where lower(u.email) = any(v_keep) and p.role = 'super_admin' and p.status = 'active') then
    raise exception 'none of the kept emails is an active super admin, so nothing was removed. check the list: %', array_to_string(v_keep, ', ');
  end if;

  create temp table gone on commit drop as
    select u.id from auth.users u
     where lower(coalesce(u.email, '')) <> all(v_keep)
       and not exists (select 1 from public.farmer_profiles fp where fp.user_id = u.id and fp.app_managed);
  select count(*) into v_gone from gone;

  -- rows that would stop the delete
  delete from public.bulk_orders o
   where o.area_manager_id in (select a.id from public.area_managers a where a.user_id in (select id from gone))
      or o.business_id in (select b.id from public.business_profiles b where b.user_id in (select id from gone));
  delete from public.collection_audit where actor in (select id from gone);
  delete from public.usage_audit where actor in (select id from gone);
  update public.admin_invites set invited_by = null where invited_by in (select id from gone);
  update public.area_managers set verified_by = null where verified_by in (select id from gone);
  update public.business_profiles set verified_by = null where verified_by in (select id from gone);

  -- the accounts (their profile, center or business and its data go with them)
  delete from auth.users where id in (select id from gone);

  -- a kept buyer's request that lost an order needs that milk again
  update public.bulk_requirements r set status = 'open'
   where r.status = 'awarded' and public.requirement_covered(r.id) < r.quantity_l
     and r.required_date >= (now() at time zone 'Asia/Karachi')::date;

  -- farmers whose center was removed ask a kept center in their city
  if to_regprocedure('public.app_farmers_in_city_ask(text)') is not null then
    perform public.app_farmers_in_city_ask(a.city) from public.area_managers a
     where a.type = 'milk_center' and a.verification_status = 'active';
  end if;

  raise notice 'removed % accounts. kept: %', v_gone, array_to_string(v_found, ', ');
  if cardinality(v_found) < cardinality(v_keep) then
    raise notice 'not found (check the spelling): %', array_to_string(array(select x from unnest(v_keep) x where x <> all(coalesce(v_found, '{}'))), ', ');
  end if;
end $$;

-- what is left
select p.role, count(*) as accounts from public.profiles p group by 1 order by 1;
select u.email, p.role, p.status from auth.users u join public.profiles p on p.id = u.id
 where not exists (select 1 from public.farmer_profiles fp where fp.user_id = u.id and fp.app_managed) order by 2;
