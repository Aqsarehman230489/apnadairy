# Deploying the Farmer API on Vercel (same GitHub → Vercel flow as the web app)

The farmer backend is a FastAPI app, but it is fully stateless (no startup
hooks, no background tasks, no local files), so it runs on Vercel serverless
functions with zero code changes. One file adapts it: `api/index.py` wraps the
app with Mangum (ASGI adapter). `vercel.json` routes `/api/v1/*` to it.

## One-time setup (Aqsa — same Vercel account as the web app)

1. Push the repo to GitHub with `App/` and `render.yaml` at the root, on the
   `apnadairy-mobile` branch (v2 code).
2. Go to https://vercel.com/dashboard → **Add New → Project** →
   import `Aqsarehman230489/apnadairy`.
3. In **Configure Project**:
   - Framework Preset: **Other**
   - **Root Directory:** `App/backend/farmer`
   - Branch: `apnadairy-mobile`
4. Add **Environment Variables** (copy values from
   `App/backend/farmer/.env` on the laptop — never commit that file):
   - `SUPABASE_WEB_URL`
   - `SUPABASE_WEB_SERVICE_KEY`
   - `SUPABASE_MOBILE_URL`
   - `SUPABASE_MOBILE_SERVICE_KEY`
   - `DEMO_FARMER_ID`
   - `AUTH_DEMO_ENABLED` = `false`
5. Click **Deploy**. First deploy takes ~2-3 minutes.
6. You get a URL like `https://apnadairy-farmer-api.vercel.app`.
   Open `https://<your-url>/api/v1/farmer/cities` — it must ask for login
   (401 "Login required"), which proves the API is live. The interactive docs
   are NOT served on Vercel (docs need a persistent server); use the local
   `uvicorn` run for `/docs`.

## How it stays in sync

Push to `apnadairy-mobile` → Vercel auto-redeploys. Same flow as the web app.
No Render needed.

## Point the mobile app at it

In `App/frontend/farmer/.env`:

```
EXPO_PUBLIC_API_URL=https://apnadairy-farmer-api.vercel.app
```

Then rebuild the APK (`eas build --platform android --profile preview`).
The APK bakes this URL in, so it works on any network.

## Notes

- Serverless cold start: the first request after idle takes a few seconds;
  after that it is fast. This is normal on Vercel.
- Vercel Hobby plan allows 10-second executions — all our endpoints are
  simple database queries, well within that.
- Local development is unchanged: `uvicorn app.main:app` still works.
- `render.yaml` at the repo root is kept as a fallback only.
