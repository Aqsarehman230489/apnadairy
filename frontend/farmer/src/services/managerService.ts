// Manager service: the area manager linked to the logged-in farmer.
//
// v2 model: the farmer is linked to exactly ONE area manager (exclusive).
// There is no farmer-facing "list my managers" endpoint — the linked
// manager comes from POST /api/v1/auth/me (see authService.getMe).
// Browsing managers by city (before linking) lives in linkingService.
import { getMe } from './authService';
import type { Manager } from '../types/farmerModels';

/**
 * The farmer's linked area manager (single-element list, or empty when the
 * farmer has not been accepted by a manager yet).
 *
 * distanceKm is always 0 — the v2 API does not return a distance for the
 * linked manager.
 */
export async function getManagers(): Promise<Manager[]> {
  const me = await getMe();
  const m = me.manager;
  if (!m) return [];
  return [
    {
      id: m.id,
      name: m.manager_name,
      shopName: m.center_name,
      phone: m.phone,
      distanceKm: 0,
    },
  ];
}

/** The linked manager, or null when the farmer has none yet. */
export async function getLinkedManager(): Promise<Manager | null> {
  const managers = await getManagers();
  return managers[0] ?? null;
}
