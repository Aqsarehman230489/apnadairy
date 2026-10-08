// Farmer dashboard — Home tab stats.
// Backend: GET /api/v1/farmer/stats
//   -> { total_milk_l, today_milk_l, total_revenue, money_earned,
//        registered_manager | null, total_sales }
// Names come from POST /api/v1/auth/me (farmer profile).

import { get } from './http';
import { getMe } from './authService';
import type { ActivityItem, VerificationStatus } from '../types/farmerModels';

/** Backend stats payload (snake_case). */
export interface FarmerStats {
  total_milk_l: number;
  today_milk_l: number;
  total_revenue: number;
  money_earned: number;
  total_sales: number;
  registered_manager: {
    id: string;
    center_name: string;
    manager_name: string;
    phone: string;
  } | null;
}

/** The farmer's home-tab statistics from the backend. */
export async function getFarmerStats(): Promise<FarmerStats> {
  return get<FarmerStats>('/api/v1/farmer/stats');
}

// ---------------------------------------------------------------------------
// Legacy screen shapes (app/farmer/index.tsx).
// ---------------------------------------------------------------------------

/** Assigned manager card on the dashboard. */
export interface DashboardManager {
  id: string;
  name: string;
  phone: string;
  shopName: string;
}

/** Everything the Home tab needs, in mobile shapes. */
export interface DashboardData {
  farmerId: string;
  farmerName: string;
  farmName: string;
  verificationStatus: VerificationStatus;
  totalMilkLitres: number;
  totalRevenueRs: number;
  totalProfitRs: number;
  totalSalesCount: number;
  month: string;
  manager: DashboardManager | null;
  recentActivity: ActivityItem[];
}

/** Map the backend verification state to the app's VerificationStatus. */
function toVerificationStatus(s: string): VerificationStatus {
  if (s === 'verified') return 'APPROVED';
  if (s === 'rejected') return 'REJECTED';
  return 'PENDING';
}

/** Home-tab summary built from the stats endpoint + the farmer profile. */
export async function getDashboardSummary(): Promise<DashboardData> {
  const stats = await getFarmerStats();
  // /api/v1/auth/me is strict (real JWT only, no demo fallback) and can also
  // fail on a network blip — never let it take the whole Home screen down.
  // Stats (milk, revenue, sales, manager) still render without the profile.
  let me: Awaited<ReturnType<typeof getMe>> | null = null;
  try {
    me = await getMe();
  } catch {
    me = null;
  }
  const m = stats.registered_manager;
  const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  return {
    farmerId: me?.user_id ?? '',
    farmerName: me?.full_name ?? '',
    farmName: me?.farmer_profile?.farm_name ?? '',
    verificationStatus: me ? toVerificationStatus(me.verification.status) : 'PENDING',
    totalMilkLitres: stats.total_milk_l ?? 0,
    totalRevenueRs: stats.total_revenue ?? 0,
    totalProfitRs: stats.money_earned ?? 0,
    totalSalesCount: stats.total_sales ?? 0,
    month,
    manager: m
      ? { id: m.id, name: m.manager_name, phone: m.phone, shopName: m.center_name }
      : null,
    recentActivity: [],
  };
}
