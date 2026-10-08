// Thin typed wrapper over the shared API client for the farmer v2 endpoints.
//
// Every helper rethrows failures as Error carrying ONLY the backend's own
// English message (the "METHOD path failed: status — detail" prefix from
// client.ts is stripped), so screens can show err.message directly.

import { apiGet, apiPost, getApiBaseUrl, getSession } from '../api/client';

/** Extract the backend's detail message from a client.ts error string. */
function cleanError(err: unknown, fallback: string): Error {
  const msg = err instanceof Error ? err.message : '';
  const sep = msg.indexOf(' — ');
  if (sep >= 0 && msg.slice(sep + 3).trim()) {
    return new Error(msg.slice(sep + 3).trim());
  }
  return new Error(msg || fallback);
}

/** Authenticated GET. Throws Error with the backend's message on failure. */
export async function get<T>(path: string): Promise<T> {
  try {
    return await apiGet<T>(path);
  } catch (err) {
    throw cleanError(err, 'Could not load the data. Please try again.');
  }
}

/** Authenticated POST with a JSON body. Throws Error with the backend's message. */
export async function post<T>(path: string, body: unknown): Promise<T> {
  try {
    return await apiPost<T>(path, body);
  } catch (err) {
    throw cleanError(err, 'Could not complete the request. Please try again.');
  }
}

/** Authenticated DELETE. Throws Error with the backend's message on failure. */
export async function del(path: string): Promise<void> {
  const sess = await getSession();
  let res: Response;
  try {
    res = await fetch(getApiBaseUrl() + path, {
      method: 'DELETE',
      headers: sess ? { Authorization: `Bearer ${sess.token}` } : {},
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { detail?: string };
      if (body && typeof body.detail === 'string') detail = body.detail;
    } catch {
      // Non-JSON error body — fall back to the generic message below.
    }
    throw new Error(detail || `Request failed (${res.status}). Please try again.`);
  }
}
