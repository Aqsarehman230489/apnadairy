# rls/

Security posture for the farmer portal's database objects.

## The rule

All existing farmer-portal tables live in the **web** Supabase project
(apnadairy-web, https://aquatwwnpvnmirkqnhlp.supabase.co) and are SHARED
with the web application. **RLS and grants on those tables are owned by the
web project — this folder contains no per-table RLS files for them.**

Why not:
- The tables (`profiles`, `farmers`, `farmer_profiles`, `farmer_requests`,
  `area_managers`, `milk_collections`, `farmer_payouts`, `notifications`)
  are used by the web app's own roles (anon/authenticated). Adding
  `REVOKE ALL FROM anon, authenticated` + RLS with no permissive policies
  here (the old mobile-project pattern) would lock the web app out of its
  own tables. Never apply that pattern to shared web tables.
- The farmer FastAPI backend uses the **service_role** key (server-side
  only), which bypasses RLS by design. The mobile app never talks to these
  tables directly, so no farmer-specific policies are needed.
- Never "fix" a 42501 permission error with `GRANT ALL` to
  anon/authenticated.

## What this folder holds

- `storage.objects.sql` — desired access posture for the existing private
  `farmer-photos` storage bucket (CNIC/farm/profile photos). Reference
  posture only — storage policies are global per role unless filtered by
  bucket, so **do not apply blindly**; any change needs web-team review.
- The `complaints` table (pending, see `../pending/`) carries its own
  REVOKE + ENABLE RLS (no permissive policies) inside
  `pending/complaints.sql`, because it will be a farmer-portal-owned table.

## Mobile project

Nothing. There are no farmer database objects in the mobile project
("ApnaDairy Mobile App", bxsvnamareirdgjqngba) and there must never be any.
