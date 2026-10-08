// Milk service for the farmer Milk tab: sale requests and offers.
//
// Live only — no mocks. The v2 farmer API exposes the manager-driven daily
// sale flow; the farmer-facing read endpoints are:
//   GET  /api/v1/farmer/sales                 (own sales, newest first)
//   POST /api/v1/farmer/sales/{id}/accept     (accept the offer)
//   POST /api/v1/farmer/sales/{id}/refuse     (refuse the offer)
// Sale start / IoT result / offer-summary are MANAGER-only endpoints (the
// manager's app calls them); the farmer sees the offer through the sale
// list, which carries the AI price, total, and freshness score.
//
// Backend JSON is snake_case — mappers below convert to the mobile shapes.
//
// GAPS (flagged, not fabricated):
// - The v2 farmer API does not return raw sensor readings (temperature, pH,
//   TDS, EC) or an AI category on any farmer-visible endpoint. Those Offer
//   fields are set to 0 / a display-only band (see toCategory) until a
//   farmer-visible endpoint returns them.
// - There is no farmer-initiated "new request" endpoint in v2: sales are
//   started by the area manager. createRequest() explains this instead of
//   calling an endpoint that would reject the farmer's token.
import { apiGet } from '../api/client';
import { getManagers as getLinkedManagers } from './managerService';
import { acceptSale, refuseSale } from './salesService';
import type { Manager, MilkRequest, Offer, RequestStatus } from '../types/farmerModels';

/** Backend SaleListItem (snake_case) from GET /api/v1/farmer/sales. */
interface SaleListItem {
  id: string;
  quantity_l: number;
  price_per_l: number | null;
  total_amount: number | null;
  freshness_score: number | null;
  status: string;
  decided_at: string | null;
  collected_at: string | null;
  receipt_no: string | null;
  farmer_name: string | null;
  manager_name: string | null;
}

/** Backend sale status -> mobile RequestStatus. */
function toRequestStatus(s: string): RequestStatus {
  const v = (s ?? '').toLowerCase();
  if (v === 'offered') return 'OFFERED';
  if (v === 'accepted' || v === 'rejected') return 'CLOSED';
  if (v === 'viewed') return 'VIEWED';
  if (v === 'testing') return 'TESTING';
  return 'SENT';
}

/** Backend sale status -> mobile OfferStatus. */
function toOfferStatus(s: string): Offer['status'] {
  const v = (s ?? '').toLowerCase();
  if (v === 'accepted') return 'ACCEPTED';
  if (v === 'rejected') return 'REFUSED';
  if (v === 'expired') return 'EXPIRED';
  if (v === 'completed') return 'COMPLETED';
  return 'PENDING';
}

/**
 * Display-only AI category band from the freshness score. The v2 farmer API
 * does not return an AI category; these bands exist only so the legacy
 * category badge has something to render. They are NOT the AI model's own
 * A/B/C labels.
 */
function toCategory(score: number | null): 'A' | 'B' | 'C' {
  if (score == null) return 'B';
  if (score >= 90) return 'A';
  if (score >= 70) return 'B';
  return 'C';
}

/** Map a backend sale to the mobile MilkRequest shape. */
function mapRequest(s: SaleListItem): MilkRequest {
  return {
    id: s.id,
    litres: s.quantity_l,
    // The v2 list returns the center name but not the manager id.
    managerId: '',
    managerName: s.manager_name ?? '',
    status: toRequestStatus(s.status),
    createdAt: s.collected_at ?? s.decided_at ?? '',
  };
}

/** Map a backend sale to the mobile Offer shape. */
function mapOffer(s: SaleListItem): Offer {
  return {
    id: s.id,
    requestId: s.id,
    managerName: s.manager_name ?? '',
    litres: s.quantity_l,
    // Raw sensor readings are not returned by any farmer-visible v2
    // endpoint (see the header note) — left at 0, not fabricated.
    temperature: 0,
    ph: 0,
    tds: 0,
    ec: 0,
    aiScore: s.freshness_score ?? 0,
    aiCategory: toCategory(s.freshness_score),
    pricePerLitre: s.price_per_l ?? 0,
    totalAmount: s.total_amount ?? 0,
    status: toOfferStatus(s.status),
    expiresAt: '—',
  };
}

/** All sales, newest first (the farmer's request history). */
async function listSales(): Promise<SaleListItem[]> {
  return apiGet<SaleListItem[]>('/api/v1/farmer/sales');
}

/** Returns the farmer's milk requests (sales), newest first. */
export async function getRequests(): Promise<MilkRequest[]> {
  const sales = await listSales();
  return sales
    .map(mapRequest)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Returns sales that carry an offer (offered), newest first. */
export async function getOffers(): Promise<Offer[]> {
  const sales = await listSales();
  return sales
    .filter((s) => (s.status ?? '').toLowerCase() === 'offered')
    .map(mapOffer)
    .sort((a, b) => b.id.localeCompare(a.id));
}

/** Returns the managers assigned to this farmer (the linked manager). */
export async function getManagers(): Promise<Manager[]> {
  return getLinkedManagers();
}

/**
 * No farmer-facing endpoint exists for this in v2: the daily sale is
 * started by the area manager (manager selects farmer -> IoT test -> offer).
 * This throws a readable message instead of hitting an endpoint that would
 * reject the farmer's token.
 */
export async function createRequest(
  _litres: number,
  _managerId: string,
): Promise<MilkRequest> {
  throw new Error(
    'Sales are started by your area manager. Please contact your manager to begin a sale.',
  );
}

/** Refusal reasons shown as chips on the offer detail screen. */
export const REFUSE_REASONS = ['The price is too low', 'I do not have time', 'Another reason'];

/** Format a number as "Rs 3,700". */
export function formatRs(n: number): string {
  return 'Rs ' + n.toLocaleString('en-US');
}

/** Fetch one offer by sale id. Throws if not found. */
export async function getOffer(id: string): Promise<Offer> {
  if (!id) throw new Error('The offer is not identified.');
  const sales = await listSales();
  const found = sales.find((s) => s.id === id);
  if (!found) throw new Error('Offer not found');
  return mapOffer(found);
}

/** Fetch one milk request (sale) by id. Throws if not found. */
export async function getRequest(id: string): Promise<MilkRequest> {
  if (!id) throw new Error('The request is not identified.');
  const sales = await listSales();
  const found = sales.find((s) => s.id === id);
  if (!found) throw new Error('Request not found');
  return mapRequest(found);
}

/** One step of the request status timeline. */
export interface RequestTimelineEvent {
  status: string;
  at: string;
  note: string;
}

/** Status timeline for one sale, derived from its real timestamps. */
export async function getRequestTimeline(id: string): Promise<RequestTimelineEvent[]> {
  if (!id) throw new Error('The request is not identified.');
  const sales = await listSales();
  const s = sales.find((x) => x.id === id);
  if (!s) throw new Error('Request not found');
  const timeline: RequestTimelineEvent[] = [];
  if (s.collected_at) {
    timeline.push({
      status: 'OFFERED',
      at: s.collected_at,
      note: 'Sale started — the offer is ready.',
    });
  }
  if (s.decided_at) {
    const decided = (s.status ?? '').toLowerCase() === 'accepted';
    timeline.push({
      status: decided ? 'ACCEPTED' : 'REFUSED',
      at: s.decided_at,
      note: decided ? 'You accepted the offer.' : 'You refused the offer.',
    });
  }
  return timeline;
}

/** Find the offer linked to a request (same id in v2), or null when none. */
export async function getOfferForRequest(requestId: string): Promise<Offer | null> {
  if (!requestId) return null;
  const sales = await listSales();
  const found = sales.find((s) => s.id === requestId);
  return found ? mapOffer(found) : null;
}

/** Accept a PENDING offer. Returns the refreshed offer. */
export async function acceptOffer(id: string): Promise<Offer> {
  if (!id) throw new Error('The offer is not identified.');
  await acceptSale(id);
  return getOffer(id);
}

/** Refuse a PENDING offer with a reason. Returns the refreshed offer. */
export async function refuseOffer(id: string, reason: string): Promise<Offer> {
  if (!id) throw new Error('The offer is not identified.');
  if (!reason) throw new Error('Please select a reason for declining');
  await refuseSale(id, reason);
  return getOffer(id);
}
