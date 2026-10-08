# ApnaDairy — Unified Mobile App

Final Year Project — Air University Islamabad.

One Expo (React Native) app with **role-based login**: **Farmer** or **Customer**.
The role is chosen at login/signup and is immutable afterwards.

- **Farmer** → farmer portal: dashboard (milk/production, revenue, profit, sales),
  Add New Milk requests, manager offers, payments, documents, verification,
  complaints, profile.
- **Customer** → B2C app: home, marketplace (manager milk batches with AI
  freshness score + Category A/B/C), cart, checkout (COD / bank transfer with
  screenshot proof / demo card — no Easypaisa), orders, rider tracking + chat,
  profile, verification, complaints, permanent-customer cycles.

Theme: desi-dairy — milk-cream `#f7f1e3`, ivory `#fffcf4`, forest `#1f4d36`,
amber `#e2a93b`, ink `#1e2b22`, sage `#5c6b5e`, Bricolage Grotesque. No emojis.
**The entire app is formal English** — every screen, every message, every
comment. No Roman Urdu anywhere.

---

## What is complete vs what is missing

**Complete and verified:** the full role-based app (25 customer screens + farmer
portal), real auth (email+OTP, Google OAuth verified live, password flows), JWT
security on every request, the B2C database migration (8 tables, RLS, storage),
and a live end-to-end proof (signup → checkout → delivered, 52/52 checks).
Test suites: 213/213 B2C, 55/55 farmer, TypeScript 0 errors.

**Still missing (the team solves from their side):** `customer_ledger` write
path, live OTP email test on a real device, applying `08_rls_old_tables.sql`
(project owner), anon-key RLS probes, production `.env` values, app
icon/splash + `eas.json`, physical-phone testing, Google consent-screen
publishing, and the web lane's marketplace-linking queues. Full list with lanes:
**`docs/03-remaining-work.md`**.

---

## Run it — 3 commands

Prereqs (once): **Node 20+**, **Python 3.12+**:

```bat
:: one-time: dependencies
cd farmer-dashboard\backend && pip install -r requirements.txt
cd ..\..\apnadairy-b2c\backend && pip install -r requirements.txt
cd ..\..\farmer-dashboard\mobile && npm install
```

Then 3 terminals:

```bat
:: Terminal 1 — Farmer backend  (http://<your-ip>:8000)
cd farmer-dashboard\backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

:: Terminal 2 — B2C customer backend  (http://<your-ip>:8001)
cd apnadairy-b2c\backend
uvicorn app.main:app --host 0.0.0.0 --port 8001

:: Terminal 3 — the app
cd farmer-dashboard\mobile
npx expo start
```

Scan the QR with **Expo Go** (phone + laptop on the same Wi-Fi), or press `w`
for the browser preview.

> Tip: double-click **`start-dev.bat`** (in this folder) — it opens all three
> terminals for you. Edit the `SET` lines at the top if your folders live
> somewhere else.

---

## Environment

**Mobile app** (`mobile/.env` — copy from `.env.example`; use your laptop's LAN
IP from `ipconfig`, never `localhost`):

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_API_URL` | `http://<laptop-IP>:8000` (farmer backend) |
| `EXPO_PUBLIC_B2C_API_URL` | `http://<laptop-IP>:8001` (B2C backend) |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://bxsvnamareirdgjqngba.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon key only — **never** a service-role key |

**Backends** (each backend's `.env`; service-role keys live **only** here):

| Backend | Needs |
|---|---|
| `farmer-dashboard/backend` | `SUPABASE_MOBILE_URL` + `SUPABASE_MOBILE_SERVICE_KEY` (mobile project), `SUPABASE_WEB_URL` + `SUPABASE_WEB_SERVICE_KEY` (web project, read-only), `AUTH_DEMO_ENABLED=false` |
| `apnadairy-b2c/backend` | Same as above, **plus** `SUPABASE_MOBILE_ANON_KEY` (required for login/OTP) |

All values: **`docs/04-credentials.md`** (contains live secrets — keep it private).

---

## How it connects

```
Phone (this app)
   │  EXPO_PUBLIC_API_URL ──────► Farmer backend :8000 ─┐
   │  EXPO_PUBLIC_B2C_API_URL ──► B2C backend    :8001 ─┤─► Supabase
   │  Supabase anon key ────────► Google OAuth / Auth ──┘   Mobile project:
                                                            read + write
```

The **web database** ("apnadairy-web" project) is **read-only**: farmers,
milk_collections, farmer_payouts, area_managers are read through the farmer
backend; the web `farmers` table is **never written** — edits go to
`farmer_profiles` in the mobile project.

---

## Documentation (`docs/`)

| Document | What it covers |
|---|---|
| `docs/01-project-overview.md` | **File & folder structure, in depth** — every folder, what each part does, the two Supabase projects, the theme, the language standard. |
| `docs/02-integration-guide.md` | **How to integrate everything** — architecture, env setup per part, install & run, auth flow, Google OAuth, web ↔ mobile contract, migrations, verification commands. |
| `docs/03-remaining-work.md` | **What is missing** — done vs remaining, by lane (no names): mobile-app lane, backend lane, web-app lane, owner hygiene. |
| `docs/04-credentials.md` | **All service logins** — Supabase dashboard, both projects' keys, Google OAuth, Gmail. ⚠️ Live secrets: keep private, rotate as noted. |
| `docs/PROJECT-STATUS.md` | In-depth status: profiles read/write matrix, honest gaps. |
| `docs/TEAM-TASKS.md` | Tasks for the other lanes (no names). |

Web-side contract (tables this app reads, rules, open decisions):
`../apnadairy-web/` (`README.md`, `TABLES.md`, `CONTRACT.md`).

---

## Login

- **Customer**: email + password, or Google → 6-digit email OTP for new
  accounts → SuperAdmin verification before buying.
- **Farmer**: email/phone + password, or Google → **Continue-as** (role select)
  → onboarding: personal + farm details + document uploads.

## Project structure (short)

```
mobile/
  app/            screens — (auth)/, farmer/, customer/ (6 tabs), _layout.tsx
  src/            api/ (clients), services/ (farmer/*, customer/*),
                  components/, theme/ (colors.ts, fonts.ts — the ONLY theme source)
  docs/           the documentation set above
  start-dev.bat   one double-click dev launcher
  assets/         app icon / splash (to be added)
```
