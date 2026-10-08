// Real Google OAuth via Supabase Auth (PKCE) — the ONLY Google sign-in.
//
// FARMER APP: the OAuth flow runs against the WEB Supabase project (the
// same project as farmer email/password login — see
// services/authService.getWebSupabaseClient), because the farmer backend
// validates web-project JWTs. The old B2C role lookup (./b2cClient) was
// removed with the B2C client — role detection here is farmer-only.
//
// Flow:
//   1. supabase.auth.signInWithOAuth({ provider: 'google',
//      options: { redirectTo, skipBrowserRedirect: true } })
//   2. WebBrowser.openAuthSessionAsync(oauthUrl, redirectTo) — system browser
//   3. Supabase redirects to apnadairy://auth/callback?code=...
//   4. exchangeCodeForSession(code) -> real Supabase session (no mocks)
//   5. Role lookup: farmer backend POST /api/v1/auth/me -> 'farmer';
//      otherwise -> 'needs-role' -> the Continue-as screen (role is
//      IMMUTABLE once chosen there).
//
// Dashboard prerequisites (user-side, see ~/workspace/audit/oauth-values.txt):
//   - Supabase dashboard: Authentication -> Providers -> Google ENABLED
//     (Client ID + Client Secret from Google Cloud console)
//   - Supabase dashboard: Authentication -> URL Configuration -> Redirect URLs
//     must contain  https://<project-ref>.supabase.co/auth/v1/callback
//   - Google Cloud console: the SAME callback URL in Authorized redirect URIs
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { getApiBaseUrl, saveSession } from './client';
import { getWebSupabaseClient } from '../services/authService';

// Completes any pending web-auth session when the app cold-starts from the
// OAuth redirect (required on Android).
WebBrowser.maybeCompleteAuthSession();

/** Deep-link path Supabase redirects to after Google consent. */
export const GOOGLE_CALLBACK_PATH = 'auth/callback';

/** The exact redirect URI registered in Supabase + Google Cloud dashboards. */
export function googleRedirectUri(): string {
  return makeRedirectUri({ scheme: 'apnadairy', path: GOOGLE_CALLBACK_PATH });
}

// 'customer' is kept in the union so the shared login/signup screens still
// type-check; this farmer build never returns it (no B2C backend is wired).
export type GoogleOAuthOutcome =
  | { kind: 'customer'; accessToken: string }
  | { kind: 'farmer'; accessToken: string }
  | {
      kind: 'needs-role';
      userId: string;
      email: string | null;
      fullName: string | null;
    };

/** Pull the PKCE `code` out of the redirect URL Supabase sent us to. */
function extractCode(url: string): string | null {
  try {
    const query = url.split('?')[1] ?? '';
    const params = new URLSearchParams(query);
    return params.get('code');
  } catch {
    return null;
  }
}

/** Readable detail from a failed link/me response. */
async function errorDetail(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string };
    if (body && typeof body.detail === 'string' && body.detail) return body.detail;
  } catch {
    // Non-JSON body — fall through to the generic message.
  }
  return `${fallback} (HTTP ${res.status})`;
}

const OAUTH_TIMEOUT_MS = 20000;

/** fetch with a hard timeout so a dead network can't hang the login screen. */
async function fetchTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OAUTH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new Error('Request timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ask the farmer backend whether this Google user already has a farmer
 * profile. Raw fetch on purpose: the 404/403 "no profile" answers are
 * EXPECTED here and must never trip the global 401 logout watcher.
 */
async function detectRole(accessToken: string): Promise<'farmer' | null> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  try {
    const res = await fetchTimeout(`${getApiBaseUrl()}/api/v1/auth/me`, {
      method: 'POST',
      headers,
    });
    if (res.ok) return 'farmer';
  } catch {
    // Farmer backend unreachable — role stays unknown.
  }
  return null;
}

/**
 * Run the full real Google sign-in. Never returns mock data; every error is
 * a readable English message the login screen can show as-is.
 *
 * - User cancels the browser -> Error('Google sign-in was cancelled.')
 * - No code in the redirect -> readable error, no crash
 * - Existing farmer -> session saved, outcome tells the caller the portal
 * - No farmer profile yet -> outcome 'needs-role'; caller pushes
 *   /(auth)/continue-as to create it via linkGoogleProfile()
 */
export async function startGoogleOAuth(): Promise<GoogleOAuthOutcome> {
  const redirectTo = googleRedirectUri();
  const supabase = getWebSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw new Error(error.message || 'Google sign-in could not start.');
  if (!data?.url) throw new Error('Google sign-in could not start.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'dismiss' || result.type === 'cancel') {
    throw new Error('Google sign-in was cancelled.');
  }
  if (result.type !== 'success') {
    throw new Error('Google sign-in failed. Please try again.');
  }

  const code = extractCode(result.url);
  if (!code) {
    throw new Error('Could not receive the authorization code from Google. Please try again.');
  }

  const { data: sessData, error: exError } = await supabase.auth.exchangeCodeForSession(code);
  if (exError || !sessData.session) {
    throw new Error(exError?.message || 'Failed to create the Google session.');
  }
  const session = sessData.session;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    throw new Error(userError?.message || 'Could not retrieve the Google user information.');
  }

  const role = await detectRole(session.access_token);
  if (role === 'farmer') {
    await saveSession(session.access_token, 'farmer', session.refresh_token ?? undefined);
    return { kind: 'farmer', accessToken: session.access_token };
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    null;
  return {
    kind: 'needs-role',
    userId: user.id,
    email: user.email ?? null,
    fullName,
  };
}

/**
 * Create the farmer profile row for a Google user, then save the session.
 * Called ONCE from the Continue-as screen — after this the role is immutable.
 *
 * Backend: POST /api/v1/auth/google-link { full_name, phone } — idempotent;
 * an existing row returns created:false and the flow continues normally.
 */
export async function linkGoogleProfile(
  role: 'farmer' | 'customer',
  details: { fullName: string; phone: string },
): Promise<{ created: boolean }> {
  const fullName = details.fullName.trim();
  if (!fullName) throw new Error('Please enter your name.');
  const phone = details.phone.trim();

  if (role !== 'farmer') {
    throw new Error('Customer accounts are not supported in the farmer app.');
  }

  const supabase = getWebSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) {
    throw new Error('Google session is missing. Please sign in with Google again.');
  }
  const headers = {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };

  const res = await fetchTimeout(`${getApiBaseUrl()}/api/v1/auth/google-link`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ full_name: fullName, phone }),
  });
  if (!res.ok) throw new Error(await errorDetail(res, 'Failed to create the farmer profile'));
  const out = (await res.json()) as { created?: boolean };
  await saveSession(session.access_token, 'farmer', session.refresh_token ?? undefined);
  return { created: out.created !== false };
}
