// Farmer profile service — live FastAPI backend only, no mocks.
// Real endpoints:
//   GET /api/v1/farmer/profile/        (own profile)
//   PUT /api/v1/farmer/profile/personal { name?, phone? }
//   PUT /api/v1/farmer/profile/farm     { farm_name?, village?, city?,
//                                         tehsil?, district?, cow_count?,
//                                         buffalo_count?, daily_capacity_litres? }
// Screens stay unchanged: they always receive the Farmer shape from farmerModels.ts.
import { apiGet, apiPut } from '../api/client';
import type { Farmer, VerificationStatus } from '../types/farmerModels';

/** Backend ProfileOut (snake_case) as returned by GET /api/v1/farmer/profile/. */
interface ProfileOut {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  profile_photo_url: string | null;
  farm_name: string | null;
  address: string | null;
  village: string | null;
  city: string | null;
  tehsil: string | null;
  district: string | null;
  cow_count: number;
  buffalo_count: number;
  daily_capacity_litres: number;
  verification_status: string;
  role: string;
}

/** Map backend ProfileOut (snake_case) to the mobile Farmer shape. */
function mapProfile(p: ProfileOut): Farmer {
  const raw = (p.verification_status ?? '').toUpperCase();
  const verificationStatus: VerificationStatus =
    raw === 'APPROVED' ||
    raw === 'REJECTED' ||
    raw === 'PENDING' ||
    raw === 'SUBMITTED'
      ? (raw as VerificationStatus)
      : 'INCOMPLETE';
  return {
    id: p.id,
    name: p.name,
    phone: p.phone,
    farmName: p.farm_name ?? '',
    village: p.village ?? '',
    city: p.city ?? '',
    animalCount: (p.cow_count ?? 0) + (p.buffalo_count ?? 0),
    verificationStatus,
  };
}

/** Fetch the logged-in farmer's profile. */
export async function getProfile(): Promise<Farmer> {
  return mapProfile(await apiGet<ProfileOut>('/api/v1/farmer/profile/'));
}

/** Update name/phone on the farmer's profile (partial update). */
export async function updatePersonal(input: {
  name: string;
  phone: string;
}): Promise<Farmer> {
  if (!input.name.trim()) throw new Error('Please enter your name.');
  if (!input.phone.trim()) throw new Error('Please enter your phone number.');
  const out = await apiPut<ProfileOut>('/api/v1/farmer/profile/personal', {
    name: input.name.trim(),
    phone: input.phone.trim(),
  });
  return mapProfile(out);
}

/**
 * Update farm details on the farmer's profile (partial update).
 * The backend tracks cows/buffaloes separately — only send counts that are
 * explicitly provided; the legacy single animalCount total is NOT split
 * across the two fields.
 */
export async function updateFarm(input: {
  farmName: string;
  village: string;
  city: string;
  animalCount: number;
  tehsil?: string;
  district?: string;
  cowCount?: number;
  buffaloCount?: number;
  dailyCapacityLitres?: number;
}): Promise<Farmer> {
  const body: Record<string, string | number> = {
    farm_name: input.farmName.trim(),
    village: input.village.trim(),
    city: input.city.trim(),
  };
  if (input.tehsil?.trim()) body.tehsil = input.tehsil.trim();
  if (input.district?.trim()) body.district = input.district.trim();
  if (typeof input.cowCount === 'number' && input.cowCount >= 0) {
    body.cow_count = input.cowCount;
  }
  if (typeof input.buffaloCount === 'number' && input.buffaloCount >= 0) {
    body.buffalo_count = input.buffaloCount;
  }
  if (
    typeof input.dailyCapacityLitres === 'number' &&
    input.dailyCapacityLitres >= 0
  ) {
    body.daily_capacity_litres = input.dailyCapacityLitres;
  }
  const out = await apiPut<ProfileOut>('/api/v1/farmer/profile/farm', body);
  return mapProfile(out);
}
