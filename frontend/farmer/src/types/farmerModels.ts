// Shared TypeScript models for the farmer portal.
export type VerificationStatus = 'INCOMPLETE' | 'SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REFUSED' | 'PURCHASE_PENDING' | 'COMPLETED' | 'EXPIRED';
export type RequestStatus = 'SENT' | 'VIEWED' | 'TESTING' | 'OFFERED' | 'CLOSED';

export interface Farmer {
  id: string; name: string; phone: string;
  farmName: string; village: string; city: string;
  animalCount: number; verificationStatus: VerificationStatus;
}

export interface Manager {
  id: string; name: string; shopName: string; phone: string; distanceKm: number;
}

export interface MilkRequest {
  id: string; litres: number; managerId: string; managerName: string;
  status: RequestStatus; createdAt: string;
}

export interface Offer {
  id: string; requestId: string; managerName: string; litres: number;
  temperature: number; ph: number; tds: number; ec: number;
  aiScore: number; aiCategory: 'A' | 'B' | 'C';
  pricePerLitre: number; totalAmount: number;
  status: OfferStatus; expiresAt: string;
}

export interface Payment {
  id: string; purchaseRef: string; litres: number; ratePerLitre: number;
  amount: number; method: string; status: 'PAID' | 'PENDING' | 'PARTIALLY_PAID';
  date: string;
}

export interface ActivityItem {
  id: string; title: string; detail: string; date: string; status: 'ok' | 'wait' | 'info';
}

export interface AppNotification {
  id: string; title: string; message: string; type: string; date: string; read: boolean;
}

export interface Complaint {
  id: string; category: string; message: string; status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  date: string; adminReply?: string;
}
