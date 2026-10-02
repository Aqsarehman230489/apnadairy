-- =========================================================
-- apnadairy · module 2 · b2b bidding
-- businesses post bulk milk requirements, verified milk centers bid,
-- the business picks one bid and it becomes a bulk order.
-- run in supabase sql editor (after 03_admin_users.sql)
-- =========================================================

create type milk_kind          as enum ('cow', 'buffalo', 'mixed');
create type quality_grade      as enum ('standard', 'fresh', 'premium');  -- fresh = same-day milk
create type requirement_status as enum ('open', 'awarded', 'closed', 'cancelled');
create type bid_status         as enum ('submitted', 'withdrawn', 'accepted', 'not_selected');
create type bulk_order_status  as enum ('confirmed', 'dispatched', 'delivered', 'cancelled');

-- ---------- who am i (returns null if not an active account of that kind) ----------
create or replace function public.my_business_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select b.id from public.business_profiles b
  join public.profiles p on p.id = b.user_id
  where b.user_id = auth.uid() and b.verification_status = 'active' and p.status = 'active';
$$;

create or replace function public.my_milk_center_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select a.id from public.area_managers a
  join public.profiles p on p.id = a.user_id
  where a.user_id = auth.uid() and a.type = 'milk_center'
    and a.verification_status = 'active' and p.status = 'active';
$$;

-- ---------- bulk requirements (posted by businesses) ----------
create table public.bulk_requirements (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.business_profiles(id) on delete cascade,
  milk_type        milk_kind not null default 'mixed',
  quantity_l       numeric(10,2) not null check (quantity_l > 0),
  required_date    date not null,
  delivery_city    text not null,
  delivery_address text,
  quality          quality_grade not null default 'standard',
  target_price     numeric(10,2) check (target_price is null or target_price > 0),
  bid_deadline     timestamptz not null,
  notes            text,
  status           requirement_status not null default 'open',
  created_at       timestamptz not null default now(),
  constraint deadline_before_delivery check (bid_deadline::date <= required_date)
);

create index on public.bulk_requirements (status, bid_deadline);
create index on public.bulk_requirements (business_id);

-- ---------- bids (one per milk center per requirement) ----------
create table public.bids (
  id              uuid primary key default gen_random_uuid(),
  requirement_id  uuid not null references public.bulk_requirements(id) on delete cascade,
  area_manager_id uuid not null references public.area_managers(id) on delete cascade,
  price_per_l     numeric(10,2) not null check (price_per_l > 0),
  quantity_l      numeric(10,2) not null check (quantity_l > 0),
  delivery_date   date not null,
  max_age_hours   integer check (max_age_hours is null or max_age_hours between 1 and 96), -- milk age at delivery
  notes           text,
  status          bid_status not null default 'submitted',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (requirement_id, area_manager_id)
);

create index on public.bids (area_manager_id);

-- ---------- bulk orders (created when a bid is accepted) ----------
create table public.bulk_orders (
  id               uuid primary key default gen_random_uuid(),
  requirement_id   uuid not null unique references public.bulk_requirements(id),
  bid_id           uuid not null unique references public.bids(id),
  business_id      uuid not null references public.business_profiles(id),
  area_manager_id  uuid not null references public.area_managers(id),
  quantity_l       numeric(10,2) not null,
  price_per_l      numeric(10,2) not null,
  total_amount     numeric(12,2) generated always as (quantity_l * price_per_l) stored,
  delivery_date    date not null,
  delivery_city    text not null,
  delivery_address text,
  status           bulk_order_status not null default 'confirmed',
  created_at       timestamptz not null default now(),
  dispatched_at    timestamptz,
  delivered_at     timestamptz
);

-- ---------- row level security ----------
alter table public.bulk_requirements enable row level security;
alter table public.bids              enable row level security;
alter table public.bulk_orders       enable row level security;

-- requirements: owner business, admin, and verified milk centers can read
create policy "requirements: read" on public.bulk_requirements
  for select using (
    business_id = public.my_business_id()
    or public.is_admin()
    or (public.my_milk_center_id() is not null and status <> 'cancelled')
  );

-- only an active business can post, and only for itself, always as open
create policy "requirements: business posts" on public.bulk_requirements
  for insert with check (business_id = public.my_business_id() and status = 'open');

-- bids are sealed: a center sees its own, the buyer sees bids on its requirements
create policy "bids: read" on public.bids
  for select using (
    area_manager_id = public.my_milk_center_id()
    or public.is_admin()
    or exists (select 1 from public.bulk_requirements r
               where r.id = requirement_id and r.business_id = public.my_business_id())
  );

create policy "orders: read" on public.bulk_orders
  for select using (
    business_id = public.my_business_id()
    or area_manager_id = public.my_milk_center_id()
    or public.is_admin()
  );

-- buyers need to see who bid, centers need to see who they sell to
create policy "area_managers: active centers visible to signed-in users" on public.area_managers
  for select to authenticated using (verification_status = 'active');

create policy "business: visible to active milk centers" on public.business_profiles
  for select to authenticated using (verification_status = 'active' and public.my_milk_center_id() is not null);

-- all writes to bids / orders / requirement status go through the functions below

-- ---------- board views ----------
-- for signed-in milk centers and admins: includes the buyer's name
create view public.request_board as
select r.id, r.milk_type, r.quantity_l, r.required_date, r.delivery_city, r.delivery_address,
       r.quality, r.target_price, r.bid_deadline, r.notes, r.status, r.created_at,
       b.business_name, b.business_type,
       (select count(*) from public.bids x where x.requirement_id = r.id and x.status = 'submitted')::int as bid_count
from public.bulk_requirements r
join public.business_profiles b on b.id = r.business_id
where r.status = 'open' and r.bid_deadline > now()
  and (public.my_milk_center_id() is not null or public.is_admin());

-- public page on the website: no buyer name or address
create view public.public_requests as
select r.id, r.milk_type, r.quantity_l, r.required_date, r.delivery_city,
       r.quality, r.target_price, r.bid_deadline, r.created_at,
       b.business_type,
       (select count(*) from public.bids x where x.requirement_id = r.id and x.status = 'submitted')::int as bid_count
from public.bulk_requirements r
join public.business_profiles b on b.id = r.business_id
where r.status = 'open' and r.bid_deadline > now();

revoke all on public.request_board from anon;
grant select on public.request_board to authenticated;
grant select on public.public_requests to anon, authenticated;

-- ---------- place or update a bid ----------
create or replace function public.place_bid(
  p_requirement   uuid,
  p_price         numeric,
  p_quantity      numeric,
  p_delivery_date date,
  p_max_age_hours integer default null,
  p_notes         text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_center uuid := public.my_milk_center_id();
  v_req    public.bulk_requirements;
  v_id     uuid;
begin
  if v_center is null then
    raise exception 'only verified milk collection centers can bid';
  end if;

  select * into v_req from public.bulk_requirements where id = p_requirement;
  if v_req.id is null then raise exception 'requirement not found'; end if;
  if v_req.status <> 'open' or v_req.bid_deadline <= now() then
    raise exception 'bidding is closed for this requirement';
  end if;
  if p_quantity > v_req.quantity_l then
    raise exception 'you cannot offer more than the % L requested', v_req.quantity_l;
  end if;
  if p_delivery_date < current_date then
    raise exception 'delivery date cannot be in the past';
  end if;

  insert into public.bids (requirement_id, area_manager_id, price_per_l, quantity_l, delivery_date,
                           max_age_hours, notes)
  values (p_requirement, v_center, p_price, p_quantity, p_delivery_date, p_max_age_hours, p_notes)
  on conflict (requirement_id, area_manager_id) do update
     set price_per_l = excluded.price_per_l, quantity_l = excluded.quantity_l,
         delivery_date = excluded.delivery_date,
         max_age_hours = excluded.max_age_hours, notes = excluded.notes,
         status = 'submitted', updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------- withdraw own bid ----------
create or replace function public.withdraw_bid(p_bid uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.bids set status = 'withdrawn', updated_at = now()
   where id = p_bid and area_manager_id = public.my_milk_center_id() and status = 'submitted';
  if not found then raise exception 'this bid cannot be withdrawn'; end if;
end;
$$;

-- ---------- business accepts one bid → bulk order ----------
create or replace function public.accept_bid(p_bid uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_bid   public.bids;
  v_req   public.bulk_requirements;
  v_order uuid;
begin
  select * into v_bid from public.bids where id = p_bid;
  if v_bid.id is null or v_bid.status <> 'submitted' then
    raise exception 'this bid is no longer available';
  end if;

  select * into v_req from public.bulk_requirements where id = v_bid.requirement_id for update;
  if v_req.business_id is distinct from public.my_business_id() then
    raise exception 'you can only accept bids on your own requirements';
  end if;
  if v_req.status <> 'open' then
    raise exception 'a bid has already been accepted or the requirement was closed';
  end if;

  update public.bids set status = 'accepted', updated_at = now() where id = v_bid.id;
  update public.bids set status = 'not_selected', updated_at = now()
   where requirement_id = v_req.id and id <> v_bid.id and status = 'submitted';
  update public.bulk_requirements set status = 'awarded' where id = v_req.id;

  insert into public.bulk_orders (requirement_id, bid_id, business_id, area_manager_id, quantity_l,
                                  price_per_l, delivery_date, delivery_city, delivery_address)
  values (v_req.id, v_bid.id, v_req.business_id, v_bid.area_manager_id, v_bid.quantity_l,
          v_bid.price_per_l, v_bid.delivery_date, v_req.delivery_city, v_req.delivery_address)
  returning id into v_order;

  return v_order;
end;
$$;

-- ---------- business cancels an open requirement ----------
create or replace function public.cancel_requirement(p_requirement uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.bulk_requirements set status = 'cancelled'
   where id = p_requirement and business_id = public.my_business_id() and status = 'open';
  if not found then raise exception 'only your open requirements can be cancelled'; end if;

  update public.bids set status = 'not_selected', updated_at = now()
   where requirement_id = p_requirement and status = 'submitted';
end;
$$;

-- ---------- order progress ----------
-- milk center: confirmed → dispatched → delivered ; either side may cancel while confirmed
create or replace function public.update_bulk_order(p_order uuid, p_status bulk_order_status)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v public.bulk_orders;
  v_is_center   boolean;
  v_is_business boolean;
begin
  select * into v from public.bulk_orders where id = p_order for update;
  if v.id is null then raise exception 'order not found'; end if;

  v_is_center   := v.area_manager_id = public.my_milk_center_id();
  v_is_business := v.business_id = public.my_business_id();

  if p_status = 'dispatched' and v_is_center and v.status = 'confirmed' then
    update public.bulk_orders set status = 'dispatched', dispatched_at = now() where id = p_order;
  elsif p_status = 'delivered' and v_is_center and v.status = 'dispatched' then
    update public.bulk_orders set status = 'delivered', delivered_at = now() where id = p_order;
  elsif p_status = 'cancelled' and (v_is_center or v_is_business) and v.status = 'confirmed' then
    update public.bulk_orders set status = 'cancelled' where id = p_order;
  else
    raise exception 'this change is not allowed for the current order status';
  end if;
end;
$$;
