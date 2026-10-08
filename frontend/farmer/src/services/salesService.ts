// Farmer sales — the manager-driven daily milk sale flow.
// The manager runs the IoT test; the farmer sees the live result and the
// AI price, then accepts or refuses.
//
// Backend:
//   POST /api/v1/farmer/sales/start { farmer_id, quantity_l } -> { sale_id }
//   POST /api/v1/farmer/sales/{id}/iot-result
//        { temperature_c, ph, tds_ppm, ec_ms }
//        -> { freshness_score, discount_pct, price_per_l, total_amount }
//   POST /api/v1/farmer/sales/{id}/offer        -> offer summary
//   POST /api/v1/farmer/sales/{id}/accept       -> { receipt_no, total_amount }
//   POST /api/v1/farmer/sales/{id}/refuse { reason? }
//   GET  /api/v1/farmer/sales                   -> list

import { get, post } from './http';

/** Response of starting a sale. */
export interface StartSaleResult {
  sale_id: string;
}

/** IoT sensor readings submitted for a sale. */
export interface IotReading {
  temperature_c: number;
  ph: number;
  tds_ppm: number;
  ec_ms: number;
}

/** AI result for the submitted IoT readings. */
export interface IotResult {
  freshness_score: number;
  discount_pct: number;
  price_per_l: number;
  total_amount: number;
}

/** The price offer the farmer accepts or refuses. */
export interface SaleOffer {
  sale_id: string;
  quantity_l: number;
  freshness_score: number;
  discount_pct: number;
  price_per_l: number;
  total_amount: number;
}

/** Confirmation after the farmer accepts the offer. */
export interface AcceptSaleResult {
  receipt_no: string;
  total_amount: number;
}

/** One row in the farmer's sale history. */
export interface SaleRecord {
  id: string;
  quantity_l: number;
  price_per_l: number | null;
  total_amount: number | null;
  freshness_score: number | null;
  status: string;
  created_at: string;
  decided_at: string | null;
  collected_at: string | null;
  receipt_no: string | null;
  farmer_name: string | null;
  manager_name: string | null;
}

/** Start a new sale. MANAGER-ONLY on the backend (the manager opens the sale
 * for a linked farmer); a farmer token gets 401/403 here. farmerId is the
 * web farmers.id, not the profiles id from /auth/me. */
export async function startSale(farmerId: string, quantityL: number): Promise<StartSaleResult> {
  if (!farmerId) throw new Error('Farmer is not identified. Please log in again.');
  if (!quantityL || quantityL <= 0) throw new Error('Enter the milk quantity in litres.');
  return post<StartSaleResult>('/api/v1/farmer/sales/start', {
    farmer_id: farmerId,
    quantity_l: quantityL,
  });
}

/** Submit the IoT test readings; returns the AI freshness score and price.
 * MANAGER-ONLY on the backend (the manager runs the IoT test). */
export async function submitIotResult(saleId: string, reading: IotReading): Promise<IotResult> {
  if (!saleId) throw new Error('The sale is not identified. Please start again.');
  return post<IotResult>(`/api/v1/farmer/sales/${encodeURIComponent(saleId)}/iot-result`, reading);
}

/** Fetch the offer summary for a sale. MANAGER-ONLY on the backend; the
 * farmer sees the offer through listSales() (price + AI score are included). */
export async function getSaleOffer(saleId: string): Promise<SaleOffer> {
  if (!saleId) throw new Error('The sale is not identified. Please start again.');
  return post<SaleOffer>(`/api/v1/farmer/sales/${encodeURIComponent(saleId)}/offer`, {});
}

/** Accept the offer; returns the receipt number and the final amount. */
export async function acceptSale(saleId: string): Promise<AcceptSaleResult> {
  if (!saleId) throw new Error('The sale is not identified. Please start again.');
  return post<AcceptSaleResult>(`/api/v1/farmer/sales/${encodeURIComponent(saleId)}/accept`, {});
}

/** Refuse the offer (optional reason shown to the manager). */
export async function refuseSale(saleId: string, reason?: string): Promise<void> {
  if (!saleId) throw new Error('The sale is not identified. Please start again.');
  await post<unknown>(`/api/v1/farmer/sales/${encodeURIComponent(saleId)}/refuse`, {
    ...(reason && reason.trim() ? { reason: reason.trim() } : {}),
  });
}

/** The farmer's sale history, newest first. */
export async function listSales(): Promise<SaleRecord[]> {
  return get<SaleRecord[]>('/api/v1/farmer/sales');
}

/**
 * The farmer's current incoming offer: the sale the manager has tested and
 * priced, still waiting for the farmer to accept or refuse.
 * The backend marks that sale's status 'offered'.
 */
export interface CurrentOffer {
  sale_id: string;
  quantity_l: number;
  freshness_score: number;
  price_per_l: number;
  total_amount: number;
}

/** The pending offer from the manager, or null when there is none. */
export async function getCurrentOffer(): Promise<CurrentOffer | null> {
  const sales = await listSales();
  const offered = sales.find((s) => (s.status ?? '').toLowerCase() === 'offered');
  if (!offered) return null;
  return {
    sale_id: offered.id,
    quantity_l: offered.quantity_l,
    freshness_score: offered.freshness_score ?? 0,
    price_per_l: offered.price_per_l ?? 0,
    total_amount: offered.total_amount ?? 0,
  };
}

/** Accept the manager's offer; returns the receipt number and final amount. */
export async function acceptOffer(saleId: string): Promise<AcceptSaleResult> {
  return acceptSale(saleId);
}

/** Refuse the manager's offer (optional reason shown to the manager). */
export async function refuseOffer(saleId: string, reason?: string): Promise<void> {
  return refuseSale(saleId, reason);
}
