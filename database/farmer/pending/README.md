# pending/

Migrations the farmer backend needs but which do NOT exist in the live web
database. **Every file here is PENDING — NOT APPLIED. Do not run anything in
this folder without explicit approval.**

Target project (all of them, no exceptions):
**apnadairy-web** — https://aquatwwnpvnmirkqnhlp.supabase.co.
Nothing here may ever be applied to the mobile project ("ApnaDairy Mobile
App", bxsvnamareirdgjqngba).

| File | What | Why it is pending |
|------|------|-------------------|
| `complaints.sql` | New `complaints` table (+ index, REVOKE ALL, ENABLE RLS with no permissive policies) | The live backend (`api/v1/farmer/complaints.py` -> `complaint_service.py`) reads/writes `complaints` in the web project, but the table does not exist there (verified absent 2026-10-08). Complaints are admin-replied from the web portal. |

When a pending migration is approved and applied:
1. Run it once in the **web** project's SQL editor and verify (table
   exists, RLS enabled, no permissive policies).
2. Move it out of `pending/`: write a `tables/<name>.sql` reference file
   describing the live table, and update `README.md` (remove from the
   pending list, add to the applied list).
