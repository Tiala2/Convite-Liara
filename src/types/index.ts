export type GiftCategory = 'P' | 'M' | 'G';
export type PoolUsage = 'sim' | 'nao' | 'talvez';
export type GiftMethod = 'pix' | 'levar';
export type PixStatus =
  | 'not_required'
  | 'pending_receipt'
  | 'pending_review'
  | 'confirmed'
  | 'rejected';

export interface Gift {
  id: string;
  name: string;
  category: GiftCategory;
  price: number;
  isReserved: boolean;
  isDisabled?: boolean;
  reservedBy?: string;
  reservedAt?: string;
}

export interface GiftFormData {
  id?: string;
  name: string;
  category: GiftCategory;
  price: number;
}

export interface Guest {
  id: string;
  name: string;
  whatsapp: string;
  numberOfPeople: number;
  poolUsage: PoolUsage;
  giftId: string;
  giftName: string;
  giftPrice: number;
  giftMethod: GiftMethod;
  pixStatus: PixStatus;
  pixReceiptUrl?: string | null;
  inviteLabel?: string;
  confirmationDate: string;
}

export interface GuestFormData {
  id: string;
  name: string;
  whatsapp: string;
  numberOfPeople: number;
  poolUsage: PoolUsage;
  giftMethod: GiftMethod;
  pixStatus: PixStatus;
}

export interface AuditLog {
  id: string;
  adminName: string;
  action: string;
  entityType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface InviteLink {
  id: string;
  token: string;
  label: string;
  whatsapp?: string | null;
  openCount: number;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  createdAt: string;
}

export interface GuestDraft {
  name: string;
  whatsapp: string;
  numberOfPeople: number;
  poolUsage: PoolUsage | '';
}

export interface EventInfo {
  date: string;
  isoDate: string;
  time: string;
  address: string;
  addressReference: string;
  addressLink: string;
  addressEmbedUrl?: string;
  eventName: string;
  babyName: string;
  pixKey: string;
  pixName: string;
  pixCity: string;
  pixBank?: string;
  invitationMessage: string;
  finalMessage: string;
}

export interface ConfirmGuestInput {
  guest: GuestDraft & { poolUsage: PoolUsage };
  giftId: string;
  giftMethod: GiftMethod;
  pixReceiptUrl?: string | null;
  inviteToken?: string;
}

export interface ConfirmGuestResult {
  ok: boolean;
  guest?: Guest;
  error?: string;
}
