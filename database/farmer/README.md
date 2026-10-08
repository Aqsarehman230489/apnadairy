# ApnaDairy — Farmer database reference

Reference documentation for the farmer portal's database objects. **Web
project ONLY: apnadairy-web (https://aquatwwnpvnmirkqnhlp.supabase.co).
Nothing here touches the mobile project ("ApnaDairy Mobile App",
bxsvnamareirdgjqngba) — no tables, no migrations, no seeds, no references.**

The `tables/` files describe the LIVE web tables (already existing — do NOT
re-apply them). The `pending/` folder holds the one migration the backend
needs that does not exist yet (clearly marked PENDING — not applied).

## Layout

| Directory    | Contents |
|--------------|----------|
| `tables/`    | One reference file per LIVE web table — documents actual columns, **not runnable DDL** |
| `pending/`   | PENDING migrations (not applied) — currently only `complaints.sql` |
| `functions/` | No stored functions defined for the farmer portal |
| `triggers/`  | No triggers defined for the farmer portal |
| `rls/`       | Security posture notes; `storage.objects.sql` holds the `farmer-photos` bucket posture (reference only) |
| `seeds/`     | No seed data — rows are created at runtime or already exist |

## Live verification (2026-10-08, read-only)

Verified against the live web project via the PostgREST OpenAPI spec
(column-for-column) plus sample-row reads. Service key read transiently
from the backend `.env`; nothing was written to the live DB.

| Web table | Rows | Status |
|-----------|------|--------|
| `profiles` | — (roles observed: farmer, customer, area_manager, business, super_admin) | exists, documented in `tables/profiles.sql` |
| `farmers` | 14 | exists, documented in `tables/farmers.sql` |
| `farmer_profiles` | 0 | exists, documented in `tables/farmer_profiles.sql` |
| `farmer_requests` | 0 | exists, documented in `tables/farmer_requests.sql` |
| `area_managers` | 6 | exists, documented in `tables/area_managers.sql` |
| `milk_collections` | 650 | exists, documented in `tables/milk_collections.sql` |
| `farmer_payouts` | 61 | exists, documented in `tables/farmer_payouts.sql` |
| `notifications` | 6 | exists, documented in `tables/notifications.sql` |
| `verification_documents` | exists | web-owned; NOT used by the farmer backend (documents live in the `farmer-photos` storage bucket, which exists) |
| `complaints` | — | **absent** → see PENDING below |

Live `milk_collections.status` values observed: `accepted`, `rejected`
(the portal's offer step uses `offered` — see the offers note below).

## Offers note (important)

There is **no separate `offers` table** in the web project, and none is
needed. In the farmer portal v2, a manager's offer is a `milk_collections`
row with `status = 'offered'` (provisional `price_per_l` = market price,
`ai_price_per_l` = AI-suggested price, `freshness_score` = AI score):
manager offers → farmer accepts/refuses → manager confirms purchase →
row moves to `accepted`/`rejected`. The old mobile-project `offers` table
design (with `request_id`, PENDING/ACCEPTED/REFUSED states) was dropped;
the only backend code referencing it (`offer_service.py`) is dead code —
no router imports it.

## Dropped tables (not in web, not needed)

These existed in the old mobile-project split and were deleted from this
tree after checking every live backend query (`table(client, ...)` across
`~/workspace/App/backend/farmer/app`):

| Table | Why deleted |
|-------|-------------|
| `offers` | Superseded: offers are `milk_collections` rows with `status='offered'` (see note above); `offer_service.py` is not imported by any router |
| `farmer_verifications` | Superseded: verification state reads `farmer_profiles.verified_at` / `rejection_reason` (see mapping below); `verification_service.py` is not imported by any router |
| `milk_requests` | Superseded: the manager-driven sales flow uses `milk_collections`; `milk_service.py` is not imported by any router |
| `farmer_documents` | Never a table: documents are objects in the existing private `farmer-photos` storage bucket |

## PENDING migrations

| File | What | Why |
|------|------|-----|
| `pending/complaints.sql` | New `complaints` table (+ index, REVOKE ALL, ENABLE RLS with no permissive policies) | The live backend (`api/v1/farmer/complaints.py` → `complaint_service.py`) reads/writes `complaints` in the web project, but the table does not exist there. Filing a complaint will fail until this is applied. |

Apply order (web project SQL editor, when approved): `pending/complaints.sql`
first, verify (table exists, RLS enabled, zero permissive policies), then
move it out of `pending/` per `pending/README.md`. **Nothing else in this
tree is meant to be applied** — `tables/` files are documentation only, and
`rls/storage.objects.sql` is a reference posture requiring web-team review.

## Column-mapping notes (portal name → web name)

| Portal / backend expectation | Live web column | Notes |
|---|---|---|
| `profiles.id` | `profiles.id` (uuid) | = `auth.users.id` (1:1 link, created at signup with role `farmer`, status `pending`) |
| `farmer_profiles` keyed by `user_id` | `farmer_profiles.user_id` (uuid PK) | = `profiles.id`; onboarding upserts city, village, address, farm_name, milk_type, cattle_count, daily_litres |
| verification: `verified` / `rejected` / `pending` | `farmer_profiles.verified_at` / `rejection_reason` | verified → `verified_at` set; rejected → `rejection_reason` set; pending → neither (or no row). No `farmer_verifications` table. |
| `farmers.profile_id` | `farmers.profile_id` (uuid) | links `farmers` → `profiles.id`; `area_manager_id` (uuid) links the farmer's exclusive manager |
| notifications `farmer_id` | `notifications.user_id` (uuid) | recipient |
| notifications `message` | `notifications.body` (text) | |
| notifications `type` | `notifications.kind` (text) | |
| notifications `deep_link` | `notifications.link` (text) | |
| notifications `read` (boolean) | `notifications.read_at` (timestamptz) | NULL = unread. Web also has `email` (boolean) + `emailed_at`. |
| sales `price_per_l` / `total_amount` / `quantity_l` | `milk_collections.price_per_l` / `total_amount` / `quantity_l` (numeric) | IoT: `temperature_c`, `ph`, `ec_ms`, `tds_ppm`; AI: `freshness_score`, `ai_price_per_l`, `quality`, `adulteration_risk`, `spoilage_risk` |
| payouts `amount`, `receipt_no` | `farmer_payouts.amount` (numeric), `receipt_no` (text, e.g. `AD-P-000501`) | plus `litres`, `collections`, `method`, `settled_at` |

## Security model

- All tables here are **shared web tables** — RLS/grants are owned by the
  web project. This tree contains no per-table RLS files for them (the old
  mobile-project REVOKE/ENABLE-RLS pattern would lock the web app out of
  its own tables — see `rls/README.md`).
- The farmer FastAPI backend uses the **service_role** key (server-side
  only), which bypasses RLS by design. The mobile app never touches these
  tables directly.
- The pending `complaints` table will be farmer-portal-owned: its migration
  revokes anon/authenticated and enables RLS with no permissive policies.
- Never "fix" a 42501 permission error with `GRANT ALL` to
  anon/authenticated.
