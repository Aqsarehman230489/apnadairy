// Farmer payments — money the farmer received for sold milk.
// Backend:
//   GET /api/v1/farmer/payments       -> list (newest first)
//   GET /api/v1/farmer/payments/{id}  -> detail (+ farmer_note, collections_count)

import { get } from './http';
import type { Payment } from '../types/farmerModels';

/** A payment record plus the manager it came from (detail screen needs it). */
export interface PaymentRecord extends Payment {
  managerName: string;
}

/** Summary shown on top of the Payments tab. */
export interface PaymentSummary {
  totalReceived: number;
  pending: number;
}

/** Backend payment payload (snake_case) — real PaymentOut fields. */
interface PaymentOut {
  id: string;
  amount: number;
  litres: number;
  status: string;
  receipt_no: string;
  method: string | null;
  reference: string | null;
  created_at: string | null;
}

/** Backend PaymentDetailOut: base fields + note and collection count. */
interface PaymentDetailOut extends PaymentOut {
  farmer_note: string | null;
  collections_count: number;
}

/** Map a backend payment to the mobile PaymentRecord shape. */
function mapPayment(p: PaymentOut): PaymentRecord {
  const raw = (p.status ?? '').toUpperCase();
  const status: Payment['status'] =
    raw === 'PAID' || raw === 'PENDING' || raw === 'PARTIALLY_PAID'
      ? (raw as Payment['status'])
      : 'PENDING';
  const litres = p.litres ?? 0;
  return {
    id: String(p.id),
    purchaseRef: p.receipt_no ?? '',
    litres,
    // The v2 list does not return a per-litre rate; derive it honestly from
    // the payout amount when litres are known, otherwise 0. Rounded to 1
    // decimal so the UI never shows long float artifacts (e.g. 198.60525…).
    ratePerLitre: litres > 0 ? Math.round(((p.amount ?? 0) / litres) * 10) / 10 : 0,
    amount: p.amount ?? 0,
    method: p.method ?? '',
    status,
    date: (p.created_at ?? '').slice(0, 10),
    // The v2 payment endpoints do not return the manager name.
    managerName: '',
  };
}

/** Unwrap a list that may be a bare array or an { items } envelope. */
function unwrapList(data: PaymentOut[] | { items?: PaymentOut[] }): PaymentOut[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/** All payment records, newest first. */
export async function getPayments(): Promise<PaymentRecord[]> {
  const data = await get<PaymentOut[] | { items?: PaymentOut[] }>(
    '/api/v1/farmer/payments',
  );
  return unwrapList(data).map(mapPayment);
}

/** One payment's detail. */
export async function getPayment(id: string): Promise<PaymentRecord> {
  if (!id) throw new Error('The payment is not identified.');
  const p = await get<PaymentDetailOut>(
    `/api/v1/farmer/payments/${encodeURIComponent(id)}`,
  );
  return mapPayment(p);
}

/** Total received + pending amounts, computed from the payment list. */
export async function getSummary(): Promise<PaymentSummary> {
  const payments = await getPayments();
  let totalReceived = 0;
  let pending = 0;
  for (const p of payments) {
    if (p.status === 'PAID') totalReceived += p.amount;
    else pending += p.amount;
  }
  return { totalReceived, pending };
}
