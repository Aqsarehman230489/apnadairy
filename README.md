# ApnaDairy — Web Portal

React (Vite) + Supabase. Roles on web: **super admin, area manager, business buyer**.
Farmers and customers use the mobile app (same Supabase project).

## Step 1 — Setup (15 min)

1. **Create Supabase project** → supabase.com → New project (region: closest, e.g. Mumbai/Singapore).
2. **Run the SQL** in order: Dashboard → SQL Editor → run each file in `supabase/` (`01_…` to `05_…`).
3. **Turn off email confirmation (for dev/demo speed)**: Authentication → Sign In / Providers → Email → disable "Confirm email".
4. **Env keys**: Project Settings → API → copy URL + anon/publishable key into `.env`:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
5. **Run**:
   ```
   npm install
   npm run dev
   ```
6. **Make your admin**: sign up once on `/signup` (any role), then in SQL Editor:
   ```sql
   update public.profiles set role = 'super_admin', status = 'active' where email = 'your@email.com';
   ```
   Sign out → sign in → you land on `/admin`.

## Test the flow

1. Sign up a new **Area Manager** → lands on "Under review".
2. Log in as admin → Approvals → Approve.
3. Area manager clicks "Check again" → lands on `/manager`.
4. Same for **Business Buyer** → `/business`.

## Folder structure

```
src/
  lib/          supabase client, roles, sidebar nav config
  context/      AuthContext (session + profile/role)
  components/   shared ui (AuthShell, ProtectedRoute, StatCard…)
  layouts/      DashboardLayout (sidebar + topbar)
  pages/
    auth/       Login, Signup, Pending, MobileOnly
    admin/      AdminHome, Approvals
    manager/    ManagerHome, BulkRequests, RequestDetail, BulkOrders
    business/   BusinessHome, Requirements, NewRequirement, RequirementDetail, BusinessOrders
    PublicRequests.jsx   public board of open bulk requests (/requests)
supabase/       numbered sql files, one per module
tools/journey-animation/   source of the homepage film (svg scenes + synthesised sound)
```

## How auth works (for viva)

- Signup sends role + details as **user metadata** → a Postgres **trigger** (`handle_new_user`) creates the `profiles` row and the `area_managers` / `business_profiles` row.
- Area managers & businesses start **pending**; only an admin can change status via the `set_verification` RPC (security definer, checks `is_admin()`).
- **RLS**: users read only their own rows; admin reads all. Users cannot change their own role/status (column-level grants).
- Frontend `ProtectedRoute` checks session → active status → allowed role, and redirects otherwise.

## How B2B bidding works (for viva)

1. A **verified business** posts a bulk requirement: quantity, milk type (cow / buffalo / mixed), quality (farm fresh / standard / premium), date, city, optional target price and a bidding deadline.
2. It appears on the **public board** (`/requests`, no buyer name or address) and on the **bulk request board** for verified milk collection centers.
3. Each center sends one **bid** (price/L, litres, delivery date, and freshness: max hours since milking on arrival). Bids are **open**: everyone can see the offers on `/requests` (view `public_bids`, from `05_open_bids.sql`). Centers can update or withdraw until the deadline.
4. The buyer sees every bid on a **price ladder** against their target. The system ranks the **best three qualifying bids** (full quantity, on time, and under 24 h old when the buyer asked for farm fresh) cheapest first; others are listed with the reason they fall short.
5. Accepting a bid (`accept_bid`) is one database transaction: the bid becomes *accepted*, the rest *not selected*, the requirement *awarded*, and a **bulk order** is created.
6. The center moves the order *confirmed → dispatched → delivered*; either side can cancel while it is still confirmed.

All writes go through security-definer functions that re-check who is calling, so the rules hold even if someone calls the API directly.

## Adding a new module

1. Add `supabase/0X_<module>.sql` (tables + RLS), run it.
2. Add pages under `src/pages/<role>/`.
3. Add the route in `App.jsx` and set `ready: true` in `src/lib/nav.js`.
