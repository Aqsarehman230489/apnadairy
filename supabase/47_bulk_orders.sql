-- 47: an accepted bid is the order
-- run after 46_bid_cancelled_status.sql (safe to run again).
--
-- 1. accepting a bid orders the whole bid: its quantity and the grade it offers, even if that is more than is still
--    needed or a lower grade than asked. the buyer chose it. the request only tracks how much is still needed.
-- 2. a center may offer more than is still needed (the buyer decides). it still cannot offer more than its capacity.
-- 3. when an accepted order is cancelled (by the center or the buyer) its bid becomes 'cancelled' (kept, never deleted),
--    so every page shows the same thing. the request opens again for the missing litres, and bids that were declined
--    only because the request was full can be accepted again.
-- 4. dispatch checks the order (the accepted bid): its litres and grade, against the center's tested stock, and says
--    exactly how much is missing.

-- ---------- 1. accepting ----------
create or replace function public.accept_bid(p_bid uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_bid   public.bids;
  v_req   public.bulk_requirements;
  v_name  text;
  v_left  numeric;
  v_qty   numeric;
  v_cap   jsonb;
  v_order uuid;
begin
  select * into v_bid from public.bids where id = p_bid;
  if v_bid.id is null or v_bid.status <> 'submitted' then raise exception 'this bid is no longer available'; end if;
  select * into v_req from public.bulk_requirements where id = v_bid.requirement_id for update;
  if v_req.business_id is distinct from public.my_business_id() then raise exception 'you can only accept bids on your own requirements'; end if;
  if v_req.status <> 'open' then raise exception 'this requirement is already covered or was closed'; end if;
  if v_bid.delivery_date < (now() at time zone 'Asia/Karachi')::date then
    raise exception 'this bid was for delivery on %, which has passed', to_char(v_bid.delivery_date, 'FMDD Mon');
  end if;
  v_left := v_req.quantity_l - public.requirement_covered(v_req.id);
  if v_left <= 0 then raise exception 'your order is already covered'; end if;
  v_qty := v_bid.quantity_l;   -- the whole bid: more than still needed is fine, the buyer chose it

  select center_name into v_name from area_managers where id = v_bid.area_manager_id;
  if v_req.product <> 'milk' then
    v_cap := public.product_capacity(v_bid.area_manager_id, v_req.product, v_req.id);
    if v_qty - least(v_bid.make_qty, v_qty) > (v_cap->>'available')::numeric then
      raise exception '% no longer has enough in stock for this bid. pick another bid, or ask them to bid again', v_name;
    end if;
  end if;

  update public.bids set status = 'accepted', updated_at = now() where id = v_bid.id;
  -- the order is the bid: its litres and the grade it offers
  insert into public.bulk_orders (requirement_id, bid_id, business_id, area_manager_id, quantity_l,
                                  price_per_l, delivery_date, delivery_city, delivery_address, quality)
  values (v_req.id, v_bid.id, v_req.business_id, v_bid.area_manager_id, v_qty,
          v_bid.price_per_l, v_bid.delivery_date, v_req.delivery_city, v_req.delivery_address,
          case when v_req.product = 'milk' then coalesce(v_bid.offered_quality, v_req.quality) end)
  returning id into v_order;

  if v_left - v_qty <= 0 then
    update public.bulk_requirements set status = 'awarded' where id = v_req.id;
    update public.bids set status = 'not_selected', updated_at = now() where requirement_id = v_req.id and status = 'submitted';
  end if;
  return v_order;
end;
$$;
revoke all on function public.accept_bid(uuid) from public, anon;
grant execute on function public.accept_bid(uuid) to authenticated;

-- ---------- 2. bidding: more than still needed is allowed; a cancelled order cannot be bid again ----------
do $$
declare d text;
begin
  select pg_get_functiondef('public.place_bid(uuid,numeric,numeric,date,integer,text,numeric,text)'::regprocedure) into d;
  if position('raise exception ''only % % is still needed''' in d) > 0 then
    d := replace(d, 'if p_quantity > v_left then raise exception ''only % % is still needed'', public.fmt_qty(v_left), v_req.unit; end if;',
                    'if v_left <= 0 then raise exception ''this order is already covered''; end if;');
    if position('raise exception ''only % % is still needed''' in d) > 0 then raise exception 'could not update place_bid'; end if;
  end if;
  if position('status = ''cancelled'') then' in d) = 0 then
    d := replace(d, '  if p_price is null or p_price = ''NaN'' or p_price <= 0 then raise exception ''enter your price''; end if;',
      '  if exists (select 1 from bids where requirement_id = p_requirement and area_manager_id = v_center and status = ''cancelled'') then' || chr(10) ||
      '    raise exception ''your order on this request was cancelled, so you cannot bid on it again'';' || chr(10) ||
      '  end if;' || chr(10) ||
      '  if p_price is null or p_price = ''NaN'' or p_price <= 0 then raise exception ''enter your price''; end if;');
    if position('status = ''cancelled'') then' in d) = 0 then raise exception 'could not update place_bid'; end if;
  end if;
  execute d;
end $$;

-- ---------- 3. cancelling an order, and 4. the dispatch shortage ----------
do $$
declare d text;
begin
  select pg_get_functiondef('public.update_bulk_order(uuid,bulk_order_status,text,uuid)'::regprocedure) into d;
  if position('update public.bids set status = ''cancelled''' in d) = 0 then
    d := replace(d,
      'update public.bulk_orders set status = ''cancelled'', cancelled_by = case when v_is_center then ''center'' else ''business'' end where id = p_order;',
      'update public.bulk_orders set status = ''cancelled'', cancelled_by = case when v_is_center then ''center'' else ''business'' end where id = p_order;' || chr(10) ||
      '    -- the accepted bid is cancelled too (kept for the record), so no page shows it as accepted any more' || chr(10) ||
      '    update public.bids set status = ''cancelled'', updated_at = now() where id = v.bid_id;');
    -- the request opens again: bids declined only because it was full can be accepted again
    d := replace(d,
      ' where r.id = v.requirement_id and r.status in (''awarded'', ''open'') and r.required_date >= (now() at time zone ''Asia/Karachi'')::date;',
      ' where r.id = v.requirement_id and r.status in (''awarded'', ''open'') and r.required_date >= (now() at time zone ''Asia/Karachi'')::date;' || chr(10) ||
      '    update public.bids b set status = ''submitted'', updated_at = now()' || chr(10) ||
      '      from public.bulk_requirements r' || chr(10) ||
      '     where r.id = v.requirement_id and r.status = ''open'' and b.requirement_id = r.id and b.status = ''not_selected''' || chr(10) ||
      '       and b.removed_at is null and b.delivery_date >= (now() at time zone ''Asia/Karachi'')::date;');
    if position('update public.bids set status = ''cancelled''' in d) = 0 or position('b.status = ''not_selected''' in d) = 0 then
      raise exception 'could not update update_bulk_order';
    end if;
  end if;
  if position('only % L of fresh % milk tested % or better is in your stock, % L is needed' in d) > 0 then
    d := replace(d,
      'raise exception ''only % L of fresh % milk tested % or better is in your stock, % L is needed'',' || chr(10) ||
      '          round(coalesce((v_stock->>''litres'')::numeric, 0)), v_req.milk_type, v_grade, round(v.quantity_l);',
      'raise exception ''this order is for % L of % milk (% or better). your tested stock has % L, so % L is missing. buy and test more milk, or cancel the order'',' || chr(10) ||
      '          round(v.quantity_l), v_req.milk_type, v_grade, floor(coalesce((v_stock->>''litres'')::numeric, 0)), ceil(v.quantity_l - coalesce((v_stock->>''litres'')::numeric, 0));');
  end if;
  execute d;
end $$;

-- ---------- 5. orders already cancelled: their bids say so, and their requests can take the declined bids again ----------
update public.bids b set status = 'cancelled', updated_at = now()
  from public.bulk_orders o
 where o.bid_id = b.id and o.status = 'cancelled' and b.status = 'accepted';

update public.bids b set status = 'submitted', updated_at = now()
  from public.bulk_requirements r
 where r.id = b.requirement_id and r.status = 'open' and b.status = 'not_selected'
   and b.removed_at is null and b.delivery_date >= (now() at time zone 'Asia/Karachi')::date;
