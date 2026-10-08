// ApnaDairy API client — the ONLY place that touches fetch.
// HTTP layer + session. Screens never call fetch directly — they use services,
// services use apiGet/apiPost/apiPut/apiPostForm below.
//
// Wiring: set EXPO_PUBLIC_API_URL in mobile/.env (see .env.example).
// Flip USE_MOCK_API to false to talk to the real FastAPI backend.
// LIVE by default (per Hasnat 2026-10-07): the app talks to the real backend.
// Set EXPO_PUBLIC_API_URL in mobile/.env to the backend URL.
export const USE_MOCK_API = false;

/** Base URL of the FastAPI backend — env ONLY. No silent fallback: if the
 *  URL is missing the app must say so instead of calling a wrong server.
 *  NOTE: direct `process.env.EXPO_PUBLIC_*` access is REQUIRED — Expo's
 *  babel transform only inlines this exact form. Do NOT read it indirectly
 *  via globalThis (the value silently becomes undefined in the bundle). */
const ENV_URL = process.env.EXPO_PUBLIC_API_URL;

/** Resolve the backend base URL, or throw a readable wiring error. */
function resolveBaseUrl(): string {
  if (ENV_URL) return ENV_URL;
  throw new Error(
    'Backend URL is not configured — set EXPO_PUBLIC_API_URL in mobile/.env (see .env.example).',
  );
}

/** Public getter for the farmer backend base URL (used by OAuth role lookup). */
export function getApiBaseUrl(): string {
  return resolveBaseUrl();
}

/** Abort any request that takes longer than this. */
const TIMEOUT_MS = 15000;

/** Callback fired on HTTP 401 (token expired/invalid) — screens redirect to login. */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** Register the 401 handler (pass null to clear). */
export function setOnUnauthorized(cb: UnauthorizedHandler | null): void {
  onUnauthorized = cb;
}

// expo-secure-store is optional at runtime; loaded lazily so the memory fallback
// works where the native module is absent. Declared locally (no @types/node needed).
declare const require: { (id: string): any } | undefined;

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Session storage: SecureStore when available, localStorage on web, memory fallback.
import { Platform } from 'react-native';

let memToken: string | null = null;
let memRole: string | null = null;
let memRefreshToken: string | null = null;

function webLS(): Storage | null {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* storage unavailable */
  }
  return null;
}

async function store() {
  // On web the native module object exists but its methods throw — skip it
  // and use localStorage instead.
  if (Platform.OS === 'web') return null;
  try {
    if (typeof require === 'undefined') return null;
    return require('expo-secure-store');
  } catch {
    return null;
  }
}

function memSet(key: string, value: string | null) {
  const ls = webLS();
  if (ls) {
    if (value === null) ls.removeItem(key);
    else ls.setItem(key, value);
    return;
  }
  if (key === 'ad_token') memToken = value;
  else if (key === 'ad_role') memRole = value;
  else if (key === 'ad_refresh_token') memRefreshToken = value;
}

function memGet(key: string): string | null {
  const ls = webLS();
  if (ls) return ls.getItem(key);
  if (key === 'ad_token') return memToken;
  if (key === 'ad_role') return memRole;
  if (key === 'ad_refresh_token') return memRefreshToken;
  return null;
}

/** Save auth session (token + immutable role + optional Supabase refresh token). */
export async function saveSession(token: string, role: 'farmer' | 'customer', refreshToken?: string | null) {
  const s = await store();
  if (s) {
    await s.setItemAsync('ad_token', token);
    await s.setItemAsync('ad_role', role);
    if (refreshToken) {
      await s.setItemAsync('ad_refresh_token', refreshToken);
    }
  } else {
    memSet('ad_token', token);
    memSet('ad_role', role);
    if (refreshToken) memSet('ad_refresh_token', refreshToken);
  }
}

/** Read auth session. Returns null when logged out. */
export async function getSession(): Promise<{ token: string; role: string } | null> {
  const s = await store();
  if (s) {
    const token = await s.getItemAsync('ad_token');
    const role = await s.getItemAsync('ad_role');
    return token && role ? { token, role } : null;
  }
  const token = memGet('ad_token');
  const role = memGet('ad_role');
  return token && role ? { token, role } : null;
}

/** Read the stored Supabase refresh token (null when absent). */
export async function getRefreshToken(): Promise<string | null> {
  const s = await store();
  if (s) return (await s.getItemAsync('ad_refresh_token')) ?? null;
  return memGet('ad_refresh_token');
}

/** Clear session on logout. */
export async function clearSession() {
  const s = await store();
  if (s) {
    await s.deleteItemAsync('ad_token');
    await s.deleteItemAsync('ad_role');
    await s.deleteItemAsync('ad_refresh_token');
  } else {
    memSet('ad_token', null);
    memSet('ad_role', null);
    memSet('ad_refresh_token', null);
  }
}

let _sb: SupabaseClient | null = null;

/** Shared Supabase client (anon key only — safe to ship in-app).
 *  Used by auth flows that talk to Supabase directly (password reset, etc.). */
export function getSupabaseClient(): SupabaseClient {
  return supabaseClient();
}

/** Lazily build the Supabase client (anon key only — safe to ship in-app). */
function supabaseClient(): SupabaseClient {
  if (_sb) return _sb;
  // Direct process.env access — required for Expo's babel inline transform.
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anonKey) {
    throw new Error(
      'Supabase not configured — set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env (see .env.example).',
    );
  }
  _sb = createClient(url, anonKey);
  return _sb;
}

/**
 * Silently refresh the customer session with the stored Supabase refresh
 * token. Saves the new token pair and returns the fresh access token, or
 * null when refresh is impossible (no refresh token / revoked / expired).
 * Never throws — callers treat null as "re-login required".
 */
export async function refreshCustomerSession(): Promise<string | null> {
  const sess = await getSession();
  const rt = await getRefreshToken();
  if (!rt) return null;
  try {
    const { data, error } = await supabaseClient().auth.refreshSession({
      refresh_token: rt,
    });
    if (error || !data.session) return null;
    const role = sess?.role === 'farmer' ? 'farmer' : 'customer';
    await saveSession(data.session.access_token, role, data.session.refresh_token ?? undefined);
    return data.session.access_token;
  } catch {
    return null;
  }
}

/** Build the Authorization header from the stored session (empty when logged out). */
async function authHeaders(): Promise<Record<string, string>> {
  const sess = await getSession();
  return sess ? { Authorization: `Bearer ${sess.token}` } : {};
}

/** fetch() with a 15s abort timeout. Throws Error('Request timeout') on expiry. */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new Error('Request timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Throw on HTTP error; fire the 401 callback when the token is rejected. */
async function handleResponse<T>(res: Response, method: string, path: string): Promise<T> {
  if (res.status === 401 && onUnauthorized) {
    try {
      onUnauthorized();
    } catch {
      // A failing handler must never break the API call itself.
    }
  }
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { detail?: string };
      if (body && typeof body.detail === 'string') detail = body.detail;
    } catch {
      // Non-JSON error body — status code is enough.
    }
    throw new Error(`${method} ${path} failed: ${res.status}${detail ? ' — ' + detail : ''}`);
  }
  return res.json() as Promise<T>;
}

/** Authenticated GET. Throws on HTTP error or 15s timeout. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(resolveBaseUrl() + path, { headers: await authHeaders() });
  return handleResponse<T>(res, 'GET', path);
}

/** Authenticated POST with JSON body. Throws on HTTP error or 15s timeout. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(resolveBaseUrl() + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, 'POST', path);
}

/** Authenticated PUT with JSON body. Throws on HTTP error or 15s timeout. */
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(resolveBaseUrl() + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, 'PUT', path);
}

/** Authenticated POST with urlencoded form fields (for Form-based endpoints). */
export async function apiPostForm<T>(path: string, fields: Record<string, string>): Promise<T> {
  const form = new URLSearchParams();
  for (const key of Object.keys(fields)) form.append(key, fields[key]);
  const res = await fetchWithTimeout(resolveBaseUrl() + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(await authHeaders()) },
    body: form.toString(),
  });
  return handleResponse<T>(res, 'POST', path);
}
