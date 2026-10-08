// Farmer onboarding — farm details submitted after signup.
// Backend: POST /api/v1/farmer/onboarding
// { city*, village, address, farm_name, milk_type, cattle_count, daily_litres, notes }
// Only city is required.
//
// The legacy detail-entry screens still pass the OLD camelCase shape
// (farmName, cowCount, ...); those fields are accepted here and mapped to
// the backend's snake_case contract, so nothing is lost.

import { post } from './http';

/** Farm details collected during onboarding. Only city is required. */
export interface OnboardingInput {
  city: string;
  village?: string;
  address?: string;
  farm_name?: string;
  milk_type?: string;
  cattle_count?: number;
  daily_litres?: number;
  notes?: string;
  // Legacy camelCase aliases from the old detail-entry screens.
  name?: string;
  farmName?: string;
  tehsil?: string;
  district?: string;
  cowCount?: number;
  buffaloCount?: number;
  dailyCapacityLitres?: number;
}

/** Backend confirmation after onboarding is saved. */
export interface OnboardingResult {
  message: string;
  profile_id?: string;
}

/**
 * Submit the farmer's farm details. Throws Error with the backend's
 * message when validation or saving fails.
 */
export async function submitOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  if (!input.city || !input.city.trim()) {
    throw new Error('Please select your city.');
  }
  const cattle =
    input.cattle_count ?? (input.cowCount ?? 0) + (input.buffaloCount ?? 0);
  const areaBits = [input.tehsil, input.district]
    .map((s) => (s ?? '').trim())
    .filter(Boolean);
  const body: Record<string, string | number> = { city: input.city.trim() };
  if (input.village?.trim()) body.village = input.village.trim();
  if (input.address?.trim()) body.address = input.address.trim();
  const farmName = (input.farm_name ?? input.farmName ?? '').trim();
  if (farmName) body.farm_name = farmName;
  if (input.milk_type?.trim()) body.milk_type = input.milk_type.trim();
  if (cattle > 0) body.cattle_count = cattle;
  const litres = input.daily_litres ?? input.dailyCapacityLitres ?? 0;
  if (litres > 0) body.daily_litres = litres;
  const notes = input.notes?.trim() || (areaBits.length ? areaBits.join(', ') : '');
  if (notes) body.notes = notes;
  return post<OnboardingResult>('/api/v1/farmer/onboarding', body);
}
