// Farmer auth — Web Supabase project + farmer FastAPI backend (v2).
//
// FARMER AUTH MOVED TO THE WEB SUPABASE PROJECT
// (https://aquatwwnpvnmirkqnhlp.supabase.co). The existing mobile-project
// Supabase client in api/client.ts is untouched and still serves the
// CUSTOMER side. This file is the ONLY place that uses the new env vars:
//   EXPO_PUBLIC_WEB_SUPABASE_URL / EXPO_PUBLIC_WEB_SUPABASE_ANON_KEY
// (anon/publishable key only — never a service_role key).
//
// Flow (farmer lane):
//   signup: POST /api/v1/auth/signup {full_name, email, phone, password}
//           creates the auth user AND the farmer profile row, then this file
//           signs in directly against the web Supabase project for the
//           session token.
//   login:  signInWithPassword DIRECTLY against the web Supabase project
//           (the password never touches our server), then POST
//           /api/v1/auth/me to load the farmer profile + verification +
//           linked manager.
// The Supabase access token is stored as the app session token, so every
// apiGet/apiPost call sends Authorization: Bearer <access_token> and the
// FastAPI backend validates the JWT server-side on each request.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  apiPost,
  clearSession,
  getSupabaseClient,
  saveSession,
} from '../api/client';

/** App roles. Selected at login/signup and IMMUTABLE after. */
export type Role = 'farmer' | 'customer';

/** Session payload returned by every auth call. */
export interface AuthResult {
  token: string;
  role: Role;
  isNewUser: boolean;
}

/** Read an Expo public env var (same pattern as api/client.ts). */
/**
 * Read a public env var. Direct `process.env.EXPO_PUBLIC_*` access per key is
 * REQUIRED — Expo's babel transform only inlines literal member expressions;
 * a dynamic `process.env[name]` or a globalThis indirection silently bundles
 * as undefined.
 */
function env(name: 'EXPO_PUBLIC_WEB_SUPABASE_URL' | 'EXPO_PUBLIC_WEB_SUPABASE_ANON_KEY'): string {
  if (name === 'EXPO_PUBLIC_WEB_SUPABASE_URL') return process.env.EXPO_PUBLIC_WEB_SUPABASE_URL ?? '';
  return process.env.EXPO_PUBLIC_WEB_SUPABASE_ANON_KEY ?? '';
}

let _web: SupabaseClient | null = null;

/**
 * Lazily build the Web Supabase project client (anon key only — safe to
 * ship in-app). FARMER LANE ONLY — the customer side keeps using the
 * mobile-project client from api/client.ts.
 */
export function getWebSupabaseClient(): SupabaseClient {
  if (_web) return _web;
  const url = env('EXPO_PUBLIC_WEB_SUPABASE_URL');
  const anonKey = env('EXPO_PUBLIC_WEB_SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    throw new Error(
      'Farmer auth is not configured — set EXPO_PUBLIC_WEB_SUPABASE_URL and ' +
        'EXPO_PUBLIC_WEB_SUPABASE_ANON_KEY in mobile/.env (see .env.example).',
    );
  }
  _web = createClient(url, anonKey);
  return _web;
}

/** Farmer profile fields the backend returns on POST /api/v1/auth/me. */
export interface MeFarmerProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  village: string | null;
  farm_name: string | null;
}

/** Linked (exclusive) area manager from POST /api/v1/auth/me. */
export interface MeManager {
  id: string;
  center_name: string;
  manager_name: string;
  phone: string;
}

/** Profile info the backend derives from a validated access token. */
export interface MeResult {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  status: string;
  farmer_profile: MeFarmerProfile | null;
  verification: { status: 'pending' | 'verified' | 'rejected'; rejection_reason?: string | null };
  manager: MeManager | null;
}

/** Load the signed-in farmer's profile from the backend. */
export async function getMe(): Promise<MeResult> {
  return apiPost<MeResult>('/api/v1/auth/me', {});
}

/** Real email+password login. Passwords never touch our server on login. */
export async function loginWithSupabase(
  email: string,
  password: string,
  role: Role,
): Promise<AuthResult> {
  if (!email.trim()) throw new Error('Enter your email.');
  if (!password) throw new Error('Enter your password.');
  const client = role === 'farmer' ? getWebSupabaseClient() : getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error('Login incomplete. Please try again.');
  await saveSession(token, role, data.session?.refresh_token ?? undefined);
  if (role === 'farmer') {
    try {
      await getMe();
    } catch (e) {
      await clearSession();
      throw e;
    }
  }
  return { token, role, isNewUser: false };
}

/**
 * Real farmer signup: the backend creates the Supabase Auth user AND the
 * farmer profile row, then this file signs in directly for the session.
 * Next step for the farmer: onboarding (farm details + documents).
 */
export async function signupWithSupabase(
  name: string,
  email: string,
  phone: string,
  password: string,
  role: Role,
): Promise<AuthResult> {
  if (!name.trim() || !email.trim() || !phone.trim() || !password) {
    throw new Error('All fields are required.');
  }
  if (password.length < 6) throw new Error('The password must be at least 6 characters.');
  if (role === 'farmer') {
    await apiPost<{ user_id: string; message: string }>('/api/v1/auth/signup', {
      full_name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    });
    const { data, error } = await getWebSupabaseClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(error.message);
    const token = data.session?.access_token;
    if (!token) throw new Error('Signup incomplete. Please try again.');
    await saveSession(token, 'farmer', data.session?.refresh_token ?? undefined);
    return { token, role: 'farmer', isNewUser: true };
  }
  // Customer lane keeps the mobile-project flow (owned by the B2C side).
  await apiPost<{ user_id: string; email: string; role: Role }>('/api/v1/auth/signup', {
    email: email.trim(),
    password,
    role,
    full_name: name.trim(),
    phone: phone.trim(),
  });
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error('Signup incomplete. Please try again.');
  await saveSession(token, 'customer', data.session?.refresh_token ?? undefined);
  return { token, role: 'customer', isNewUser: true };
}

/** Sign out from the web Supabase project and clear the stored session. */
export async function signOutReal(): Promise<void> {
  try {
    await getWebSupabaseClient().auth.signOut();
  } catch {
    // Session cleanup below must run regardless.
  }
  try {
    await getSupabaseClient().auth.signOut();
  } catch {
    // Session cleanup below must run regardless.
  }
  await clearSession();
}

/**
 * Change the farmer's password through the backend (v2 flow).
 * The backend re-verifies the CURRENT password server-side via Supabase
 * Auth before setting the new one. Body: { current_password, new_password }.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!currentPassword) throw new Error('Enter your current password.');
  if (newPassword.length < 6) {
    throw new Error('The new password must be at least 6 characters.');
  }
  await apiPost<{ changed: boolean }>('/api/v1/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

/**
 * Change the farmer's password on the web Supabase project.
 * The current password is verified first by re-signing in with it.
 */
export async function changeFarmerPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!currentPassword) throw new Error('Enter your current password.');
  if (newPassword.length < 6) {
    throw new Error('The new password must be at least 6 characters.');
  }
  const sb = getWebSupabaseClient();
  const { data: userData } = await sb.auth.getUser();
  const email = userData.user?.email;
  if (!email) throw new Error('You are not signed in. Please log in again.');
  const { error: signInError } = await sb.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInError) throw new Error('The current password is incorrect.');
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

/**
 * Send a password-reset email from the web Supabase project.
 * Always "succeeds" — the project never reveals whether the email exists.
 */
export async function forgotPasswordFarmer(email: string): Promise<void> {
  const clean = email.trim();
  if (!clean.includes('@')) {
    throw new Error('Enter your email to reset your password.');
  }
  const { error } = await getWebSupabaseClient().auth.resetPasswordForEmail(clean);
  if (error) throw new Error(error.message);
}

/**
 * OTP verification is no longer part of farmer signup in v2.
 * @deprecated Kept only so the old verify-otp screen still type-checks.
 */
export async function verifyOtp(_phone: string, _code: string, _role: Role): Promise<AuthResult> {
  throw new Error(
    'Verification codes are no longer used. Please sign up again with your email.',
  );
}
