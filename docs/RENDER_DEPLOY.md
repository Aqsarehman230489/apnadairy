# Deploying the Farmer API on Render (5 minutes, free)

## One-time setup
1. Push the repo to GitHub `main` with `App/` and `render.yaml` at the root.
   (`render.yaml` sits NEXT TO `App/`, not inside it.)
2. Go to https://dashboard.render.com -> **New +** -> **Blueprint** ->
   connect the `Aqsarehman230489/apnadairy` repo.
3. Render reads `render.yaml` and shows the service `apnadairy-farmer-api`.
   Fill the environment variables (copy values from
   `App/backend/farmer/.env` on your laptop — never commit that file):
   - `SUPABASE_WEB_URL`
   - `SUPABASE_WEB_SERVICE_KEY`
   - `SUPABASE_MOBILE_URL`
   - `SUPABASE_MOBILE_SERVICE_KEY`
   - `DEMO_FARMER_ID`
   - `AUTH_DEMO_ENABLED` is already `false` (production default).
4. Click **Apply**. First deploy takes ~3-5 minutes.
5. When it is live you get a URL like
   `https://apnadairy-farmer-api.onrender.com`.
   Open `https://<your-url>/docs` — you must see the API docs page.

## Point the mobile app at it
In `App/frontend/farmer/.env`, replace the laptop IP:

```
EXPO_PUBLIC_API_URL=https://apnadairy-farmer-api.onrender.com
```

Then rebuild the APK (`eas build --platform android --profile preview`).
The APK bakes this URL in, so it works on any network (home Wi-Fi,
mobile data, anywhere).

## Notes
- Free tier sleeps after ~15 minutes of no traffic; the first request
  after sleep takes ~30-50 seconds, then it is fast. This is normal.
- If a deploy fails, open the service -> **Logs** tab; the error is shown there.
- Never put real keys in `render.yaml` — only in the Render dashboard
  (Environment tab), which is private.
