-- 46: a bid can be cancelled: the buyer accepted it, then the order was cancelled (by the center or the buyer).
-- run this on its own, before 47_bulk_orders.sql (postgres can only use a new status after the run that adds it).
alter type public.bid_status add value if not exists 'cancelled';
