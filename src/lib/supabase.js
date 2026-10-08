import { createClient } from '@supabase/supabase-js'

// only the project address: https://<ref>.supabase.co (a pasted .../rest/v1/ ending breaks sign-in)
const raw = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const url = raw.match(/^https?:\/\/[^/]+/)?.[0] ?? raw
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

if (!url || !key) {
  console.error('missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

// a password-reset link can land on any page (supabase falls back to the site address when the reset page is not
// on its redirect list). remember it before the client reads the link, so the app can open the new-password page.
export const RECOVERY_KEY = 'apnadairy.recovery'
try {
  if (/type=recovery/.test(window.location.hash + window.location.search)) sessionStorage.setItem(RECOVERY_KEY, '1')
} catch { /* storage blocked: the auth event below still catches it */ }

export const supabase = createClient(url, key)
// the recovery sign-in (also for links that only carry a code)
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') { try { sessionStorage.setItem(RECOVERY_KEY, '1') } catch { /* ignore */ } window.dispatchEvent(new Event('apnadairy-recovery')) }
})
