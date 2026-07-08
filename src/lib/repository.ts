import type { AuditLog, ConfirmGuestInput, ConfirmGuestResult, EventInfo, Gift, GiftCategory, GiftFormData, GiftMethod, Guest, GuestFormData, InviteLink, PixStatus, PoolUsage } from '../types';
import { getSupabase, isSupabaseConfigured } from './supabase';
import * as localStorageRepo from './storage';

export const exportGuestsToExcel = localStorageRepo.exportGuestsToExcel;
export const exportPoolToExcel = localStorageRepo.exportPoolToExcel;
export const exportPixToExcel = localStorageRepo.exportPixToExcel;
export const exportPendingPixToExcel = localStorageRepo.exportPendingPixToExcel;
export const exportGiftsToExcel = localStorageRepo.exportGiftsToExcel;
export const exportAuditLogsToExcel = localStorageRepo.exportAuditLogsToExcel;
export const exportInviteLinksToExcel = localStorageRepo.exportInviteLinksToExcel;
export const exportFullBackup = localStorageRepo.exportFullBackup;
export const exportPrintableReport = localStorageRepo.exportPrintableReport;
export const exportAttendanceList = localStorageRepo.exportAttendanceList;

type SupabaseGiftRow = {
  id: string;
  name: string;
  estimated_value: number;
  status: 'available' | 'reserved' | 'disabled';
  reserved_at: string | null;
  gift_categories?: { name?: string } | null;
  reserved_guest?: { full_name?: string } | null;
};

type SupabasePublicGiftRow = {
  id: string;
  name: string;
  estimated_value: number;
  status: 'available' | 'reserved';
  category_name?: string | null;
};

type SupabaseGuestRow = {
  id: string;
  full_name: string;
  whatsapp: string;
  people_count: number;
  pool_usage: 'yes' | 'no' | 'maybe';
  gift_id: string;
  gift_method: 'bring_gift' | 'pix';
  pix_status: PixStatus;
  pix_receipt_url: string | null;
  confirmed_at: string;
  gifts?: {
    name?: string;
    estimated_value?: number;
  } | null;
  invite_links?: {
    label?: string;
  } | null;
};

type SupabaseEventSettingsRow = {
  baby_name: string;
  event_title: string;
  event_date: string | null;
  event_time: string | null;
  address: string | null;
  address_reference: string | null;
  google_maps_url: string | null;
  google_maps_embed_url: string | null;
  pix_key: string | null;
  pix_receiver_name: string | null;
  pix_city: string | null;
  pix_bank: string | null;
  invitation_message: string | null;
  final_message: string | null;
};

type SupabaseAuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  admins?: { name?: string } | null;
};

type SupabaseInviteLinkRow = {
  id: string;
  token: string;
  label: string;
  whatsapp: string | null;
  open_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  created_at: string;
};

const shouldUseSupabase = () => Boolean(isSupabaseConfigured);

const toCategory = (name?: string): GiftCategory => {
  if (name?.includes('M')) return 'M';
  if (name?.includes('G')) return 'G';
  return 'P';
};

const toPoolUsage = (value: 'yes' | 'no' | 'maybe'): PoolUsage => {
  const map = { yes: 'sim', no: 'nao', maybe: 'talvez' } as const;
  return map[value];
};

const toSupabasePoolUsage = (value: PoolUsage): 'yes' | 'no' | 'maybe' => {
  const map = { sim: 'yes', nao: 'no', talvez: 'maybe' } as const;
  return map[value];
};

const toGiftMethod = (value: 'bring_gift' | 'pix'): GiftMethod => {
  return value === 'pix' ? 'pix' : 'levar';
};

const toSupabaseGiftMethod = (value: GiftMethod): 'bring_gift' | 'pix' => {
  return value === 'pix' ? 'pix' : 'bring_gift';
};

const formatDate = (value?: string | null): string => {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR');
};

const mapGift = (row: SupabaseGiftRow): Gift => ({
  id: row.id,
  name: row.name,
  category: toCategory(row.gift_categories?.name),
  price: Number(row.estimated_value),
  isReserved: row.status === 'reserved',
  isDisabled: row.status === 'disabled',
  reservedBy: row.reserved_guest?.full_name,
  reservedAt: formatDate(row.reserved_at),
});

const mapPublicGift = (row: SupabasePublicGiftRow): Gift => ({
  id: row.id,
  name: row.name,
  category: toCategory(row.category_name || undefined),
  price: Number(row.estimated_value),
  isReserved: row.status === 'reserved',
  isDisabled: false,
});

const mapGuest = (row: SupabaseGuestRow): Guest => ({
  id: row.id,
  name: row.full_name,
  whatsapp: row.whatsapp,
  numberOfPeople: row.people_count,
  poolUsage: toPoolUsage(row.pool_usage),
  giftId: row.gift_id,
  giftName: row.gifts?.name || 'Presente',
  giftPrice: Number(row.gifts?.estimated_value || 0),
  giftMethod: toGiftMethod(row.gift_method),
  pixStatus: row.pix_status,
  pixReceiptUrl: row.pix_receipt_url,
  inviteLabel: row.invite_links?.label,
  confirmationDate: formatDate(row.confirmed_at),
});

const mapInviteLink = (row: SupabaseInviteLinkRow): InviteLink => ({
  id: row.id,
  token: row.token,
  label: row.label,
  whatsapp: row.whatsapp,
  openCount: row.open_count,
  firstOpenedAt: row.first_opened_at ? formatDate(row.first_opened_at) : '',
  lastOpenedAt: row.last_opened_at ? formatDate(row.last_opened_at) : '',
  createdAt: formatDate(row.created_at),
});

const isPublicUrl = (value: string) => /^https?:\/\//i.test(value);

const mapEventInfo = (row: SupabaseEventSettingsRow): EventInfo => {
  const date = row.event_date ? new Date(`${row.event_date}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '02 de agosto de 2026';
  const time = row.event_time?.slice(0, 5) || '14:00';

  return {
    date,
    isoDate: `${row.event_date || '2026-08-02'}T${time}:00`,
    time,
    address: row.address || '',
    addressReference: row.address_reference || '',
    addressLink: row.google_maps_url || '',
    addressEmbedUrl: row.google_maps_embed_url || '',
    eventName: row.event_title || 'Chá de Bebê da Liara',
    babyName: row.baby_name || 'Liara',
    pixKey: row.pix_key || '',
    pixName: row.pix_receiver_name || '',
    pixCity: row.pix_city || '',
    pixBank: row.pix_bank || '',
    invitationMessage:
      row.invitation_message ||
      'Com muito carinho, estamos preparando cada detalhe para a chegada da nossa pequena Liara. E esse momento ficará ainda mais especial com a presença de pessoas queridas como você. Esperamos compartilhar esse dia ao seu lado! 💕',
    finalMessage:
      row.final_message ||
      'Nos vemos em breve para celebrar juntos esse momento tão especial! Será uma alegria receber você. 💕',
  };
};

const eventInfoToSupabase = (eventInfo: EventInfo) => ({
  baby_name: eventInfo.babyName,
  event_title: eventInfo.eventName,
  event_date: eventInfo.isoDate.slice(0, 10),
  event_time: eventInfo.time,
  address: eventInfo.address,
  address_reference: eventInfo.addressReference,
  google_maps_url: eventInfo.addressLink,
  google_maps_embed_url: eventInfo.addressEmbedUrl,
  pix_key: eventInfo.pixKey,
  pix_receiver_name: eventInfo.pixName,
  pix_city: eventInfo.pixCity,
  pix_bank: eventInfo.pixBank || '',
  invitation_message: eventInfo.invitationMessage,
  final_message: eventInfo.finalMessage,
});

export const getEventInfo = async (): Promise<EventInfo> => {
  if (!shouldUseSupabase()) return localStorageRepo.getEventInfo();

  const supabase = await getSupabase();
  const { data, error } = await supabase.from('event_settings').select('*').limit(1).maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || 'Configuracoes do evento nao encontradas no Supabase.');
  }

  return mapEventInfo(data as SupabaseEventSettingsRow);
};

export const updateEventInfo = async (eventInfo: EventInfo): Promise<void> => {
  if (!shouldUseSupabase()) {
    localStorageRepo.updateEventInfo(eventInfo);
    return;
  }

  const supabase = await getSupabase();
  const payload = eventInfoToSupabase(eventInfo);
  const { error } = await supabase.rpc('admin_update_event_settings', {
    p_baby_name: payload.baby_name,
    p_event_title: payload.event_title,
    p_event_date: payload.event_date,
    p_event_time: payload.event_time,
    p_address: payload.address,
    p_address_reference: payload.address_reference,
    p_google_maps_url: payload.google_maps_url,
    p_google_maps_embed_url: payload.google_maps_embed_url || '',
    p_pix_key: payload.pix_key,
    p_pix_receiver_name: payload.pix_receiver_name,
    p_pix_city: payload.pix_city,
    p_pix_bank: payload.pix_bank,
    p_invitation_message: payload.invitation_message,
    p_final_message: payload.final_message,
  });

  if (error) throw new Error(error.message);
};

export const getGifts = async (): Promise<Gift[]> => {
  if (!shouldUseSupabase()) return localStorageRepo.getGifts();

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('gifts')
    .select('id,name,estimated_value,status,reserved_at,gift_categories(name),reserved_guest:reserved_by_guest_id(full_name)')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as SupabaseGiftRow[]).map(mapGift);
};

export const getPublicGifts = async (): Promise<Gift[]> => {
  if (!shouldUseSupabase()) return localStorageRepo.getGifts();

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('get_public_gifts');

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as SupabasePublicGiftRow[]).map(mapPublicGift);
};

export const getGuests = async (): Promise<Guest[]> => {
  if (!shouldUseSupabase()) return localStorageRepo.getGuests();

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('guests')
    .select('id,full_name,whatsapp,people_count,pool_usage,gift_id,gift_method,pix_status,pix_receipt_url,confirmed_at,gifts!guests_gift_id_fkey(name,estimated_value),invite_links(label)')
    .order('confirmed_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = data as unknown as SupabaseGuestRow[];
  const mappedGuests = rows.map(mapGuest);
  const receiptPaths = rows
    .map((row) => row.pix_receipt_url)
    .filter((value): value is string => Boolean(value && !isPublicUrl(value)));

  if (receiptPaths.length === 0) return mappedGuests;

  const { data: signedUrls } = await supabase.storage.from('pix-receipts').createSignedUrls(receiptPaths, 60 * 60);
  const signedUrlByPath = new Map((signedUrls || []).map((item) => [item.path, item.signedUrl]));

  return mappedGuests.map((guest) => {
    if (!guest.pixReceiptUrl || isPublicUrl(guest.pixReceiptUrl)) return guest;
    return { ...guest, pixReceiptUrl: signedUrlByPath.get(guest.pixReceiptUrl) || null };
  });
};

export const getAvailableGiftsCount = async (): Promise<number> => {
  const gifts = await getPublicGifts();
  return gifts.filter((gift) => !gift.isReserved && !gift.isDisabled).length;
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  if (!shouldUseSupabase()) return [];

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id,action,entity_type,metadata,created_at,admins(name)')
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) throw new Error(error.message);

  return (data as unknown as SupabaseAuditLogRow[]).map((row) => ({
    id: row.id,
    adminName: row.admins?.name || 'Admin',
    action: row.action,
    entityType: row.entity_type,
    metadata: row.metadata || {},
    createdAt: formatDate(row.created_at),
  }));
};

export const getInviteLinks = async (): Promise<InviteLink[]> => {
  if (!shouldUseSupabase()) return [];

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('invite_links')
    .select('id,token,label,whatsapp,open_count,first_opened_at,last_opened_at,created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data as unknown as SupabaseInviteLinkRow[]).map(mapInviteLink);
};

export const createInviteLink = async (payload: { label: string; whatsapp?: string }): Promise<InviteLink> => {
  if (!shouldUseSupabase()) {
    const now = new Date().toLocaleString('pt-BR');
    return {
      id: crypto.randomUUID(),
      token: crypto.randomUUID().replace(/-/g, '').slice(0, 12),
      label: payload.label,
      whatsapp: payload.whatsapp || null,
      openCount: 0,
      createdAt: now,
    };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('admin_create_invite_link', {
    p_label: payload.label,
    p_whatsapp: payload.whatsapp || null,
  });

  if (error) throw new Error(error.message);

  return mapInviteLink(data as SupabaseInviteLinkRow);
};

export const deleteInviteLink = async (inviteId: string): Promise<void> => {
  if (!shouldUseSupabase()) return;

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('admin_delete_invite_link', {
    p_invite_id: inviteId,
  });

  if (error) throw new Error(error.message);
};

export const markInviteLinkOpened = async (token: string): Promise<void> => {
  if (!shouldUseSupabase() || !token.trim()) return;

  const supabase = await getSupabase();
  await supabase.rpc('mark_invite_link_opened', {
    p_token: token,
  });
};

export const createGift = async (giftData: GiftFormData): Promise<void> => {
  if (!shouldUseSupabase()) {
    localStorageRepo.createGift(giftData);
    return;
  }

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('admin_create_gift', {
    p_category: giftData.category,
    p_name: giftData.name.trim(),
    p_estimated_value: giftData.price,
  });

  if (error) throw new Error(error.message);
};

export const updateGift = async (giftData: GiftFormData): Promise<void> => {
  if (!shouldUseSupabase()) {
    localStorageRepo.updateGift(giftData);
    return;
  }

  if (!giftData.id) return;

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('admin_update_gift', {
    p_gift_id: giftData.id,
    p_category: giftData.category,
    p_name: giftData.name.trim(),
    p_estimated_value: giftData.price,
  });

  if (error) throw new Error(error.message);
};

export const setGiftDisabled = async (giftId: string, isDisabled: boolean): Promise<void> => {
  if (!shouldUseSupabase()) {
    localStorageRepo.setGiftDisabled(giftId, isDisabled);
    return;
  }

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('admin_set_gift_disabled', {
    p_gift_id: giftId,
    p_is_disabled: isDisabled,
  });

  if (error) throw new Error(error.message);
};

export const uploadPixReceipt = async (file: File, giftId: string): Promise<string | null> => {
  if (!shouldUseSupabase()) return null;

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const maxSizeInBytes = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Envie uma imagem JPG, PNG, WEBP ou um PDF.');
  }

  if (file.size > maxSizeInBytes) {
    throw new Error('O comprovante deve ter no máximo 5 MB.');
  }

  const supabase = await getSupabase();
  const extension = file.name.split('.').pop() || 'jpg';
  const filePath = `${giftId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('pix-receipts').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw new Error(error.message);

  return filePath;
};

export const confirmGuestWithGift = async (input: ConfirmGuestInput): Promise<ConfirmGuestResult> => {
  if (!shouldUseSupabase()) return localStorageRepo.confirmGuestWithGift(input);

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('confirm_guest_with_gift', {
    p_full_name: input.guest.name,
    p_whatsapp: input.guest.whatsapp,
    p_people_count: input.guest.numberOfPeople,
    p_pool_usage: toSupabasePoolUsage(input.guest.poolUsage),
    p_gift_id: input.giftId,
    p_gift_method: toSupabaseGiftMethod(input.giftMethod),
    p_pix_receipt_url: input.pixReceiptUrl || null,
    p_invite_token: input.inviteToken || null,
  });

  if (error) return { ok: false, error: error.message };

  const row = data as SupabaseGuestRow;
  const gifts = await getPublicGifts();
  const gift = gifts.find((item) => item.id === input.giftId);

  return {
    ok: true,
    guest: {
      id: row.id,
      name: row.full_name,
      whatsapp: row.whatsapp,
      numberOfPeople: row.people_count,
      poolUsage: toPoolUsage(row.pool_usage),
      giftId: input.giftId,
      giftName: gift?.name || 'Presente',
      giftPrice: gift?.price || 0,
      giftMethod: input.giftMethod,
      pixStatus: row.pix_status,
      pixReceiptUrl: row.pix_receipt_url,
      inviteLabel: row.invite_links?.label,
      confirmationDate: formatDate(row.confirmed_at),
    },
  };
};

export const releaseGift = async (giftId: string): Promise<void> => {
  if (!shouldUseSupabase()) {
    localStorageRepo.releaseGift(giftId);
    return;
  }

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('admin_release_gift', {
    p_gift_id: giftId,
  });

  if (error) throw new Error(error.message);
};

export const updateGuestPixStatus = async (guestId: string, pixStatus: PixStatus): Promise<void> => {
  if (!shouldUseSupabase()) {
    localStorageRepo.updateGuestPixStatus(guestId, pixStatus);
    return;
  }

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('admin_update_pix_status', {
    p_guest_id: guestId,
    p_pix_status: pixStatus,
  });

  if (error) throw new Error(error.message);
};

export const updateGuest = async (guestData: GuestFormData): Promise<void> => {
  if (!shouldUseSupabase()) {
    localStorageRepo.updateGuest(guestData);
    return;
  }

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('admin_update_guest', {
    p_guest_id: guestData.id,
    p_full_name: guestData.name.trim(),
    p_whatsapp: guestData.whatsapp,
    p_people_count: guestData.numberOfPeople,
    p_pool_usage: toSupabasePoolUsage(guestData.poolUsage),
    p_gift_method: toSupabaseGiftMethod(guestData.giftMethod),
    p_pix_status: guestData.giftMethod === 'pix' ? guestData.pixStatus : 'not_required',
  });

  if (error) throw new Error(error.message);
};

export const cancelGuestConfirmation = async (guestId: string): Promise<void> => {
  if (!shouldUseSupabase()) {
    localStorageRepo.cancelGuestConfirmation(guestId);
    return;
  }

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('admin_cancel_guest', {
    p_guest_id: guestId,
  });

  if (error) throw new Error(error.message);
};

export const resetGifts = async (): Promise<void> => {
  if (!shouldUseSupabase()) {
    localStorageRepo.resetGifts();
    return;
  }

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('admin_clear_confirmations');

  if (error) throw new Error(error.message);
};

export const clearAllData = async (): Promise<void> => {
  if (!shouldUseSupabase()) {
    localStorageRepo.clearAllData();
    return;
  }

  await resetGifts();
};

export const logBackupExport = async (payload: { guestsCount: number; giftsCount: number; auditLogsCount: number }): Promise<void> => {
  if (!shouldUseSupabase()) return;

  const supabase = await getSupabase();
  const { error } = await supabase.rpc('admin_log_backup_export', {
    p_guests_count: payload.guestsCount,
    p_gifts_count: payload.giftsCount,
    p_audit_logs_count: payload.auditLogsCount,
  });

  if (error) throw new Error(error.message);
};
