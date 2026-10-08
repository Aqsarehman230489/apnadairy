// Engagement service: notifications + complaints for the farmer portal.
// Live only — no mocks. Every function calls the real FastAPI backend:
//   GET  /api/v1/farmer/notifications      (list, newest first)
//   POST /api/v1/farmer/notifications/read { ids: [...] }
//   GET  /api/v1/farmer/complaints         (list, newest first)
//   POST /api/v1/farmer/complaints         { category, message }
//   GET  /api/v1/farmer/complaints/{id}
// Backend JSON is snake_case — mappers below convert to the mobile shapes.
import { apiGet, apiPost } from '../api/client';
import type { AppNotification, Complaint } from '../types/farmerModels';

/** Backend NotificationOut (snake_case). */
interface NotificationOut {
  id: string;
  title: string;
  message: string;
  type: string;
  deep_link: string | null;
  read: boolean;
  created_at: string;
}

/** Backend ComplaintOut (snake_case). */
interface ComplaintOut {
  id: string;
  category: string;
  message: string;
  photo_url: string | null;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

/** Map backend notification to the mobile AppNotification shape. */
function mapNotification(n: NotificationOut): AppNotification {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    // deep_link is available on the backend; the app currently routes by type.
    date: n.created_at,
    read: n.read,
  };
}

/** Map backend complaint to the mobile Complaint shape. */
function mapComplaint(c: ComplaintOut): Complaint {
  const raw = (c.status ?? '').toUpperCase();
  const status: Complaint['status'] =
    raw === 'IN_REVIEW' || raw === 'RESOLVED' ? raw : 'OPEN';
  return {
    id: c.id,
    category: c.category,
    message: c.message,
    status,
    date: (c.created_at ?? '').slice(0, 10),
    adminReply: c.admin_reply ?? undefined,
  };
}

/** Fetch all notifications, newest first. */
export async function getNotifications(): Promise<AppNotification[]> {
  const list = await apiGet<NotificationOut[]>('/api/v1/farmer/notifications');
  return list.map(mapNotification);
}

/** Mark one notification as read. */
export async function markRead(id: string): Promise<void> {
  if (!id) throw new Error('The notification is not identified.');
  await apiPost('/api/v1/farmer/notifications/read', { ids: [id] });
}

/** Mark every notification as read. */
export async function markAllRead(): Promise<void> {
  const all = await getNotifications();
  if (all.length === 0) return;
  await apiPost('/api/v1/farmer/notifications/read', {
    ids: all.map((n) => n.id),
  });
}

/** Fetch all complaints, newest first. */
export async function getComplaints(): Promise<Complaint[]> {
  const list = await apiGet<ComplaintOut[]>('/api/v1/farmer/complaints');
  return list.map(mapComplaint);
}

/** Fetch one complaint by id; throws when not found. */
export async function getComplaint(id: string): Promise<Complaint> {
  if (!id) throw new Error('The complaint is not identified.');
  return mapComplaint(
    await apiGet<ComplaintOut>(`/api/v1/farmer/complaints/${encodeURIComponent(id)}`),
  );
}

/**
 * Create a complaint. Client-side validation mirrors the backend
 * (category min 2, message min 10) so the user gets the message in English
 * before the round-trip.
 */
export async function createComplaint(
  category: string,
  message: string,
): Promise<Complaint> {
  if (category.trim().length < 2) throw new Error('Please choose a category.');
  if (message.trim().length < 10) {
    throw new Error('Please describe the problem in a little more detail.');
  }
  const out = await apiPost<ComplaintOut>('/api/v1/farmer/complaints', {
    category: category.trim(),
    message: message.trim(),
  });
  return mapComplaint(out);
}
