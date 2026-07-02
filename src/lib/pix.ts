interface PixPayloadInput {
  pixKey: string;
  receiverName: string;
  city: string;
  amount: number;
  description: string;
  transactionId?: string;
}

const formatField = (id: string, value: string): string => {
  const normalized = value.slice(0, 99);
  return `${id}${String(normalized.length).padStart(2, '0')}${normalized}`;
};

const crc16 = (payload: string): string => {
  let crc = 0xffff;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
};

const sanitizePixText = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, '')
    .trim();
};

export const createPixPayload = ({
  pixKey,
  receiverName,
  city,
  amount,
  description,
  transactionId = 'LIARA',
}: PixPayloadInput): string => {
  const merchantAccount = [
    formatField('00', 'br.gov.bcb.pix'),
    formatField('01', pixKey),
    formatField('02', sanitizePixText(description).slice(0, 50)),
  ].join('');

  const additionalData = formatField('05', sanitizePixText(transactionId).slice(0, 25));

  const payloadWithoutCrc = [
    formatField('00', '01'),
    formatField('26', merchantAccount),
    formatField('52', '0000'),
    formatField('53', '986'),
    formatField('54', amount.toFixed(2)),
    formatField('58', 'BR'),
    formatField('59', sanitizePixText(receiverName).slice(0, 25)),
    formatField('60', sanitizePixText(city).slice(0, 15)),
    formatField('62', additionalData),
    '6304',
  ].join('');

  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
};

export const createPixQrCodeUrl = (payload: string): string => {
  const params = new URLSearchParams({
    size: '240x240',
    margin: '16',
    data: payload,
  });

  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
};
