// Farmer document uploads — CNIC, profile photo, farm photo.
// Backend: POST /api/v1/farmer/documents
//   multipart form: kind in {cnic_front, cnic_back, profile_photo, farm_photo} + file
//          GET /api/v1/farmer/documents -> [{ kind, path }]
//
// Documents are uploaded individually; each upload returns immediately.

import { getApiBaseUrl, getSession } from '../api/client';
import { get } from './http';

/** Document slots accepted by the backend. */
export type DocumentKind = 'cnic_front' | 'cnic_back' | 'profile_photo' | 'farm_photo';

/** One stored document (path is null when that kind was never uploaded). */
export interface DocumentInfo {
  kind: DocumentKind;
  path: string | null;
}

const KINDS: DocumentKind[] = ['cnic_front', 'cnic_back', 'profile_photo', 'farm_photo'];

/**
 * Upload a document photo from a local file URI (camera roll / camera).
 * Throws Error with the backend's message when the upload fails.
 */
export async function uploadDocument(
  kind: DocumentKind,
  fileUri: string,
  fileName?: string,
): Promise<DocumentInfo> {
  if (!KINDS.includes(kind)) {
    throw new Error('Unknown document type.');
  }
  if (!fileUri) {
    throw new Error('Please choose a photo first.');
  }
  const sess = await getSession();
  const form = new FormData();
  form.append('kind', kind);
  form.append('file', {
    uri: fileUri,
    name: fileName ?? `${kind}.jpg`,
    type: 'image/jpeg',
  } as unknown as Blob);

  let res: Response;
  try {
    res = await fetch(getApiBaseUrl() + '/api/v1/farmer/documents', {
      method: 'POST',
      headers: sess ? { Authorization: `Bearer ${sess.token}` } : {},
      body: form,
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const body = (await res.json().catch(() => null)) as {
    detail?: string;
    kind?: string;
    path?: string;
  } | null;
  if (!res.ok) {
    throw new Error(
      body && typeof body.detail === 'string' && body.detail
        ? body.detail
        : 'Upload failed. Please try again.',
    );
  }
  return { kind: (body?.kind as DocumentKind) ?? kind, path: body?.path ?? '' };
}

/** List the farmer's already-uploaded documents. */
export async function listDocuments(): Promise<DocumentInfo[]> {
  return get<DocumentInfo[]>('/api/v1/farmer/documents');
}
