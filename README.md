# ApnaDairy — Web Portal

React (Vite) + Supabase. Roles on web: **super admin, area manager, business buyer**.
Farmers and customers use the mobile app (same Supabase project).

## Step 1 — Setup (15 min)

1. **Create Supabase project** → supabase.com → New project (region: closest, e.g. Mumbai/Singapore).
2. **Run the SQL**: Dashboard → SQL Editor → New query → paste `supabase/01_user_management.sql` → Run.
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
    manager/    ManagerHome
    business/   BusinessHome
supabase/       numbered sql files, one per module
```

## How auth works (for viva)

- Signup sends role + details as **user metadata** → a Postgres **trigger** (`handle_new_user`) creates the `profiles` row and the `area_managers` / `business_profiles` row.
- Area managers & businesses start **pending**; only an admin can change status via the `set_verification` RPC (security definer, checks `is_admin()`).
- **RLS**: users read only their own rows; admin reads all. Users cannot change their own role/status (column-level grants).
- Frontend `ProtectedRoute` checks session → active status → allowed role, and redirects otherwise.

## Adding a new module

1. Add `supabase/0X_<module>.sql` (tables + RLS), run it.
2. Add pages under `src/pages/<role>/`.
3. Add the route in `App.jsx` and set `ready: true` in `src/lib/nav.js`.
