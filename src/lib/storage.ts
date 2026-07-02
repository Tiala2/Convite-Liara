import type { AuditLog, ConfirmGuestInput, ConfirmGuestResult, Gift, GiftFormData, Guest, GuestFormData, InviteLink, PixStatus } from '../types';
import { eventInfo as defaultEventInfo, giftsData } from '../data/gifts';
import type { EventInfo } from '../types';

const GIFTS_KEY = 'liara_gifts';
const GUESTS_KEY = 'liara_guests';
const EVENT_INFO_KEY = 'liara_event_info';

const duplicateGiftMessage =
  'Esse presente acabou de ser escolhido por outro convidado. Por favor, escolha outro presente disponivel para a Liara.';

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const getGifts = (): Gift[] => {
  const stored = parseJson<Gift[] | null>(localStorage.getItem(GIFTS_KEY), null);
  if (stored && stored.length === giftsData.length) return stored;
  if (stored && stored.length > giftsData.length) return stored;

  localStorage.setItem(GIFTS_KEY, JSON.stringify(giftsData));
  return giftsData;
};

export const saveGifts = (gifts: Gift[]): void => {
  localStorage.setItem(GIFTS_KEY, JSON.stringify(gifts));
};

export const getGuests = (): Guest[] => {
  return parseJson<Guest[]>(localStorage.getItem(GUESTS_KEY), []);
};

export const getEventInfo = (): EventInfo => {
  return parseJson<EventInfo>(localStorage.getItem(EVENT_INFO_KEY), defaultEventInfo);
};

export const updateEventInfo = (eventInfo: EventInfo): void => {
  localStorage.setItem(EVENT_INFO_KEY, JSON.stringify(eventInfo));
};

const saveGuests = (guests: Guest[]): void => {
  localStorage.setItem(GUESTS_KEY, JSON.stringify(guests));
};

export const confirmGuestWithGift = (input: ConfirmGuestInput): ConfirmGuestResult => {
  const gifts = getGifts();
  const guests = getGuests();
  const gift = gifts.find((item) => item.id === input.giftId);

  if (!gift || gift.isReserved || gift.isDisabled) {
    return { ok: false, error: duplicateGiftMessage };
  }

  const confirmationDate = new Date().toLocaleString('pt-BR');
  const guest: Guest = {
    id: String(Date.now()),
    name: input.guest.name.trim(),
    whatsapp: input.guest.whatsapp,
    numberOfPeople: input.guest.numberOfPeople,
    poolUsage: input.guest.poolUsage,
    giftId: gift.id,
    giftName: gift.name,
    giftPrice: gift.price,
    giftMethod: input.giftMethod,
    pixStatus: input.giftMethod === 'pix' ? 'pending_receipt' : 'not_required',
    pixReceiptUrl: input.pixReceiptUrl || null,
    confirmationDate,
  };

  const updatedGifts = gifts.map((item) =>
    item.id === gift.id
      ? { ...item, isReserved: true, reservedBy: guest.name, reservedAt: confirmationDate }
      : item,
  );

  saveGuests([...guests, guest]);
  saveGifts(updatedGifts);

  return { ok: true, guest };
};

export const releaseGift = (giftId: string): void => {
  const gifts = getGifts().map((gift) =>
    gift.id === giftId
      ? { ...gift, isReserved: false, reservedBy: undefined, reservedAt: undefined }
      : gift,
  );
  const guests = getGuests().filter((guest) => guest.giftId !== giftId);

  saveGifts(gifts);
  saveGuests(guests);
};

export const updateGuestPixStatus = (guestId: string, pixStatus: PixStatus): void => {
  const guests = getGuests().map((guest) => (guest.id === guestId ? { ...guest, pixStatus } : guest));
  saveGuests(guests);
};

export const updateGuest = (guestData: GuestFormData): void => {
  const guests = getGuests().map((guest) =>
    guest.id === guestData.id
      ? {
          ...guest,
          name: guestData.name.trim(),
          whatsapp: guestData.whatsapp,
          numberOfPeople: guestData.numberOfPeople,
          poolUsage: guestData.poolUsage,
          giftMethod: guestData.giftMethod,
          pixStatus: guestData.giftMethod === 'pix' ? guestData.pixStatus : 'not_required',
        }
      : guest,
  );

  const updatedGuest = guests.find((guest) => guest.id === guestData.id);
  const gifts = getGifts().map((gift) =>
    gift.reservedBy && updatedGuest && gift.id === updatedGuest.giftId
      ? { ...gift, reservedBy: updatedGuest.name }
      : gift,
  );

  saveGuests(guests);
  saveGifts(gifts);
};

export const cancelGuestConfirmation = (guestId: string): void => {
  const guest = getGuests().find((item) => item.id === guestId);
  if (!guest) return;

  releaseGift(guest.giftId);
};

export const createGift = (giftData: GiftFormData): Gift => {
  const gift: Gift = {
    id: `CUSTOM-${Date.now()}`,
    name: giftData.name.trim(),
    category: giftData.category,
    price: giftData.price,
    isReserved: false,
    isDisabled: false,
  };

  saveGifts([...getGifts(), gift]);
  return gift;
};

export const updateGift = (giftData: GiftFormData): void => {
  if (!giftData.id) return;

  const gifts = getGifts().map((gift) =>
    gift.id === giftData.id
      ? { ...gift, name: giftData.name.trim(), category: giftData.category, price: giftData.price }
      : gift,
  );

  saveGifts(gifts);
};

export const setGiftDisabled = (giftId: string, isDisabled: boolean): void => {
  const gifts = getGifts().map((gift) =>
    gift.id === giftId ? { ...gift, isDisabled } : gift,
  );

  saveGifts(gifts);
};

export const getAvailableGiftsCount = (): number => {
  return getGifts().filter((gift) => !gift.isReserved && !gift.isDisabled).length;
};

export const clearAllData = (): void => {
  localStorage.removeItem(GIFTS_KEY);
  localStorage.removeItem(GUESTS_KEY);
  localStorage.removeItem(EVENT_INFO_KEY);
};

export const resetGifts = (): void => {
  localStorage.setItem(GIFTS_KEY, JSON.stringify(giftsData));
};

const downloadBlob = (content: string, type: string, filename: string): void => {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const toCsv = (headers: string[], rows: Array<Array<string | number>>): string => {
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
};

const escapeHtml = (value: string | number): string => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const exportGuestsToExcel = (guests: Guest[], filename = 'convidados-liara.csv'): void => {
  const headers = ['Nome', 'WhatsApp', 'Pessoas', 'Piscina', 'Convite', 'Presente', 'Valor', 'Forma', 'Pix', 'Comprovante', 'Data'];
  const rows = guests.map((guest) => [
    guest.name,
    guest.whatsapp,
    guest.numberOfPeople,
    guest.poolUsage,
    guest.inviteLabel || '',
    guest.giftName,
    `R$ ${guest.giftPrice}`,
    guest.giftMethod === 'pix' ? 'Pix' : 'Vai levar no dia',
    guest.pixStatus,
    guest.pixReceiptUrl || '',
    guest.confirmationDate,
  ]);

  downloadBlob(toCsv(headers, rows), 'text/csv;charset=utf-8;', filename);
};

export const exportPoolToExcel = (guests: Guest[]): void => {
  const poolGuests = guests.filter((guest) => guest.poolUsage === 'sim' || guest.poolUsage === 'talvez');
  exportGuestsToExcel(poolGuests, 'lista-piscina-liara.csv');
};

export const exportPixToExcel = (guests: Guest[]): void => {
  const pixGuests = guests.filter((guest) => guest.giftMethod === 'pix');
  exportGuestsToExcel(pixGuests, 'pix-liara.csv');
};

export const exportPendingPixToExcel = (guests: Guest[]): void => {
  const pixGuests = guests.filter(
    (guest) =>
      guest.giftMethod === 'pix' &&
      (guest.pixStatus === 'pending_receipt' || guest.pixStatus === 'pending_review' || guest.pixStatus === 'rejected'),
  );
  exportGuestsToExcel(pixGuests, 'pix-pendente-liara.csv');
};

export const exportGiftsToExcel = (gifts: Gift[]): void => {
  const headers = ['ID', 'Categoria', 'Presente', 'Valor', 'Status', 'Reservado por', 'Reservado em'];
  const rows = gifts.map((gift) => [
    gift.id,
    `Fralda ${gift.category}`,
    gift.name,
    `R$ ${gift.price}`,
    gift.isDisabled ? 'Desativado' : gift.isReserved ? 'Reservado' : 'Disponivel',
    gift.reservedBy || '',
    gift.reservedAt || '',
  ]);

  downloadBlob(toCsv(headers, rows), 'text/csv;charset=utf-8;', 'presentes-liara.csv');
};

export const exportAuditLogsToExcel = (logs: AuditLog[]): void => {
  const headers = ['Data', 'Admin', 'Acao', 'Tipo', 'Metadados'];
  const rows = logs.map((log) => [
    log.createdAt,
    log.adminName,
    log.action,
    log.entityType,
    JSON.stringify(log.metadata),
  ]);

  downloadBlob(toCsv(headers, rows), 'text/csv;charset=utf-8;', 'historico-seguranca-liara.csv');
};

export const exportInviteLinksToExcel = (invites: InviteLink[], baseUrl = ''): void => {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const headers = ['Identificacao', 'WhatsApp', 'Link', 'Aberturas', 'Primeira abertura', 'Ultima abertura', 'Criado em'];
  const rows = invites.map((invite) => [
    invite.label,
    invite.whatsapp || '',
    normalizedBaseUrl ? `${normalizedBaseUrl}/c/${invite.token}` : `/c/${invite.token}`,
    invite.openCount,
    invite.firstOpenedAt || '',
    invite.lastOpenedAt || '',
    invite.createdAt,
  ]);

  downloadBlob(toCsv(headers, rows), 'text/csv;charset=utf-8;', 'convites-liara.csv');
};

export const exportFullBackup = (payload: {
  eventInfo: EventInfo;
  guests: Guest[];
  gifts: Gift[];
  auditLogs: AuditLog[];
  inviteLinks?: InviteLink[];
}): void => {
  const backup = {
    exportedAt: new Date().toISOString(),
    eventInfo: payload.eventInfo,
    guests: payload.guests,
    gifts: payload.gifts,
    auditLogs: payload.auditLogs,
    inviteLinks: payload.inviteLinks || [],
  };

  downloadBlob(JSON.stringify(backup, null, 2), 'application/json;charset=utf-8;', 'backup-cha-liara.json');
};

export const exportPrintableReport = (guests: Guest[], gifts: Gift[]): void => {
  const totalPeople = guests.reduce((acc, guest) => acc + guest.numberOfPeople, 0);
  const pixGuests = guests.filter((guest) => guest.giftMethod === 'pix');
  const pixEstimated = pixGuests.reduce((acc, guest) => acc + guest.giftPrice, 0);

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatorio - Cha de Bebe da Liara</title>
  <style>
    body { font-family: Arial, sans-serif; color: #5f4a44; padding: 32px; }
    h1, h2 { color: #e89cb8; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #f4c7d7; padding: 8px; font-size: 12px; text-align: left; }
    th { background: #fff5f0; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
    .stat { border: 1px solid #f4c7d7; border-radius: 12px; padding: 12px; }
    .stat strong { display: block; color: #e89cb8; font-size: 22px; }
    @media print { button { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button onclick="window.print()">Imprimir / Salvar como PDF</button>
  <h1>Cha de Bebe da Liara</h1>
  <p>Resumo administrativo do evento.</p>
  <section class="stats">
    <div class="stat"><strong>${guests.length}</strong> convidados</div>
    <div class="stat"><strong>${totalPeople}</strong> pessoas</div>
    <div class="stat"><strong>${gifts.filter((gift) => gift.isReserved).length}</strong> presentes reservados</div>
    <div class="stat"><strong>R$ ${pixEstimated}</strong> estimado em Pix</div>
  </section>
  <h2>Lista de presenca</h2>
  <table>
    <thead><tr><th>Nome</th><th>WhatsApp</th><th>Pessoas</th><th>Piscina</th><th>Presente</th><th>Forma</th><th>Pix</th></tr></thead>
    <tbody>
      ${guests
        .map(
          (guest) =>
            `<tr><td>${escapeHtml(guest.name)}</td><td>${escapeHtml(guest.whatsapp)}</td><td>${guest.numberOfPeople}</td><td>${escapeHtml(guest.poolUsage)}</td><td>${escapeHtml(guest.giftName)}</td><td>${escapeHtml(guest.giftMethod)}</td><td>${escapeHtml(guest.pixStatus)}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  downloadBlob(html, 'text/html;charset=utf-8;', 'relatorio-liara.html');
};

export const exportAttendanceList = (guests: Guest[]): void => {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Lista de Presenca - Cha de Bebe da Liara</title>
  <style>
    body { font-family: Arial, sans-serif; color: #5f4a44; padding: 32px; }
    h1 { color: #e89cb8; margin-bottom: 4px; }
    p { margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #f4c7d7; padding: 10px; font-size: 12px; text-align: left; }
    th { background: #fff5f0; }
    .signature { min-width: 160px; }
    @media print { button { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button onclick="window.print()">Imprimir / Salvar como PDF</button>
  <h1>Lista de Presenca</h1>
  <p>Cha de Bebe da Liara</p>
  <table>
    <thead>
      <tr><th>Nome</th><th>WhatsApp</th><th>Pessoas</th><th>Piscina</th><th class="signature">Assinatura</th></tr>
    </thead>
    <tbody>
      ${guests
        .map(
          (guest) =>
            `<tr><td>${escapeHtml(guest.name)}</td><td>${escapeHtml(guest.whatsapp)}</td><td>${guest.numberOfPeople}</td><td>${escapeHtml(guest.poolUsage)}</td><td></td></tr>`,
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  downloadBlob(html, 'text/html;charset=utf-8;', 'lista-presenca-liara.html');
};

export const exportToExcel = exportGuestsToExcel;
export const exportToPDF = (guests: Guest[]): void => exportPrintableReport(guests, getGifts());
