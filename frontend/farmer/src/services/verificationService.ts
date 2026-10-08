// Farmer verification status — SuperAdmin approves the farmer profile.
// Backend: GET /api/v1/farmer/verification-status
//   -> { status: 'pending' | 'verified' | 'rejected', rejection_reason }

import { get } from './http';
import { getMe } from './authService';
import { submitOnboarding, type OnboardingInput } from './onboardingService';
import type { Farmer, VerificationStatus } from '../types/farmerModels';

/** Backend verification state. */
export interface VerificationResult {
  status: 'pending' | 'verified' | 'rejected';
  rejection_reason: string | null;
}

/** Current verification state from the backend. */
export async function getVerificationStatus(): Promise<VerificationResult> {
  return get<VerificationResult>('/api/v1/farmer/verification-status');
}

/**
 * Legacy screen shape. Maps the backend state to the app's
 * VerificationStatus values.
 */
export async function getStatus(): Promise<VerificationStatus> {
  const v = await getVerificationStatus();
  if (v.status === 'verified') return 'APPROVED';
  if (v.status === 'rejected') return 'REJECTED';
  return 'PENDING';
}

/** The signed-in farmer's profile, in the app's Farmer shape. */
export async function getFarmer(): Promise<Farmer> {
  const me = await getMe();
  const p = me.farmer_profile;
  return {
    id: me.user_id,
    name: me.full_name ?? '',
    phone: me.phone ?? '',
    farmName: p?.farm_name ?? '',
    village: p?.village ?? '',
    city: p?.city ?? '',
    animalCount: 0,
    verificationStatus: await getStatus(),
  };
}

/** Farm details collected during the detail-entry screens (legacy name). */
export type FarmDetailsInput = OnboardingInput;

/**
 * Submit the farm details (legacy wrapper around the onboarding endpoint).
 * Returns the refreshed farmer profile.
 */
export async function submitDetails(input: FarmDetailsInput): Promise<Farmer> {
  await submitOnboarding(input);
  return getFarmer();
}

/**
 * Legacy finish-step after documents are uploaded (documents are now
 * uploaded individually through documentsService). Refreshes the profile.
 */
export async function submitDocuments(): Promise<Farmer> {
  return getFarmer();
}
