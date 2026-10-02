-- =========================================================
-- apnadairy · module 2b · open bids
-- offers on open requests are visible to everyone (website visitors,
-- businesses and other centers): center name, city, price, litres,
-- delivery date and freshness. the buyer still chooses who wins.
-- run in supabase sql editor (after 04_b2b_bidding.sql)
-- =========================================================

create or replace view public.public_bids as
select b.id,
       b.requirement_id,
       a.center_name,
       a.city            as center_city,
       b.price_per_l,
       b.quantity_l,
       b.delivery_date,
       b.max_age_hours,
       b.status,
       b.updated_at
from public.bids b
join public.area_managers a on a.id = b.area_manager_id
join public.bulk_requirements r on r.id = b.requirement_id
where b.status in ('submitted', 'accepted')
  and r.status in ('open', 'awarded');

grant select on public.public_bids to anon, authenticated;

-- the public board also shows the lowest offer so far
create or replace view public.public_requests as
select r.id, r.milk_type, r.quantity_l, r.required_date, r.delivery_city,
       r.quality, r.target_price, r.bid_deadline, r.created_at,
       b.business_type,
       (select count(*) from public.bids x where x.requirement_id = r.id and x.status = 'submitted')::int as bid_count,
       (select min(x.price_per_l) from public.bids x where x.requirement_id = r.id and x.status = 'submitted') as lowest_offer
from public.bulk_requirements r
join public.business_profiles b on b.id = r.business_id
where r.status = 'open' and r.bid_deadline > now();

grant select on public.public_requests to anon, authenticated;
