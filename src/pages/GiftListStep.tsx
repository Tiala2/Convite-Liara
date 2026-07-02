import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Copy, Gift, Heart, Search } from 'lucide-react';
import { ProgressBar } from '../components/ProgressBar';
import { StepHeader, VisualFrame } from '../components/VisualFrame';
import { eventInfo as defaultEventInfo } from '../data/gifts';
import { confirmGuestWithGift, getEventInfo, getPublicGifts, uploadPixReceipt } from '../lib/repository';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Gift as GiftItem, GiftCategory, GiftMethod, Guest, GuestDraft, PoolUsage } from '../types';

interface GiftListStepProps {
  guestData: GuestDraft & { poolUsage: PoolUsage };
  inviteToken?: string;
  onConfirmed: (guest: Guest) => void;
  onBack: () => void;
}

export const GiftListStep = ({ guestData, inviteToken, onConfirmed, onBack }: GiftListStepProps) => {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [filter, setFilter] = useState<'all' | GiftCategory>('all');
  const [search, setSearch] = useState('');
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<GiftMethod | ''>('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [pixReceipt, setPixReceipt] = useState<File | null>(null);
  const [eventInfo, setEventInfo] = useState(defaultEventInfo);

  useEffect(() => {
    const refresh = async () => {
      try {
        const [nextGifts, nextEventInfo] = await Promise.all([getPublicGifts(), getEventInfo()]);
        setGifts(nextGifts);
        setEventInfo(nextEventInfo);
        setError('');
      } catch {
        setError('Não conseguimos carregar a lista de presentes agora. Confira sua conexão e tente novamente.');
      }
    };
    refresh();

    const interval = setInterval(refresh, 7000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedGift) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedGift]);

  const filteredGifts = useMemo(() => {
    return gifts
      .filter((gift) => !gift.isDisabled)
      .filter((gift) => filter === 'all' || gift.category === filter)
      .filter((gift) => gift.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => Number(a.isReserved) - Number(b.isReserved));
  }, [filter, gifts, search]);

  const categoryCounts = useMemo(() => {
    return {
      all: gifts.filter((gift) => !gift.isReserved && !gift.isDisabled).length,
      P: gifts.filter((gift) => gift.category === 'P' && !gift.isReserved && !gift.isDisabled).length,
      M: gifts.filter((gift) => gift.category === 'M' && !gift.isReserved && !gift.isDisabled).length,
      G: gifts.filter((gift) => gift.category === 'G' && !gift.isReserved && !gift.isDisabled).length,
    };
  }, [gifts]);

  const handleOpenGift = (gift: GiftItem) => {
    if (gift.isReserved) return;
    setSelectedGift(gift);
    setSelectedMethod('');
    setError('');
    setCopyError('');
    setCopied(false);
    setPixReceipt(null);
  };

  const handleConfirm = async () => {
    if (isConfirming) return;

    if (!selectedGift || !selectedMethod) {
      setError('Escolha com carinho como deseja presentear a Liara.');
      return;
    }

    setIsConfirming(true);
    setError('');

    let pixReceiptUrl: string | null = null;

    try {
      if (selectedMethod === 'pix' && pixReceipt) {
        pixReceiptUrl = await uploadPixReceipt(pixReceipt, selectedGift.id);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar o comprovante agora.');
      setIsConfirming(false);
      return;
    }

    const result = await confirmGuestWithGift({
      guest: guestData,
      giftId: selectedGift.id,
      giftMethod: selectedMethod,
      pixReceiptUrl,
      inviteToken,
    });

    if (!result.ok || !result.guest) {
      setError(result.error || 'Não conseguimos reservar este presente agora.');
      try {
        setGifts(await getPublicGifts());
      } catch {
        setError(result.error || 'Não conseguimos atualizar a lista de presentes agora.');
      }
      setIsConfirming(false);
      return;
    }

    setSelectedGift(null);
    setIsConfirming(false);
    onConfirmed(result.guest);
  };

  const handleCopyPix = async () => {
    if (!selectedGift || !eventInfo.pixKey) return;

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(eventInfo.pixKey);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = eventInfo.pixKey;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const didCopy = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (!didCopy) throw new Error('copy-failed');
      }

      setCopyError('');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2600);
    } catch {
      setCopied(false);
      setCopyError('Não foi possível copiar automaticamente. Toque na chave Pix, selecione tudo e copie.');
    }
  };

  const handleReceiptChange = (file?: File) => {
    if (!file) {
      setPixReceipt(null);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSizeInBytes = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setPixReceipt(null);
      setError('Envie uma imagem JPG, PNG, WEBP ou um PDF.');
      return;
    }

    if (file.size > maxSizeInBytes) {
      setPixReceipt(null);
      setError('O comprovante deve ter no máximo 5 MB.');
      return;
    }

    setError('');
    setPixReceipt(file);
  };

  return (
    <VisualFrame>
      <button
        onClick={onBack}
        aria-label="Voltar para confirmar presença"
        className="fixed left-4 top-4 z-30 flex items-center gap-1 rounded-full bg-white/85 px-3 py-2 text-xs font-bold uppercase text-[#E89CB8] shadow-sm active:scale-[0.98]"
      >
        <ArrowLeft size={20} />
        <span className="hidden sm:inline">Voltar</span>
      </button>

      <div className="mx-auto max-w-2xl">
        <StepHeader />

        <div className="mb-5 mt-2 sm:mb-6 sm:mt-4">
          <ProgressBar currentStep={1} steps={['Presença', 'Presente', 'Confirmação']} />
        </div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-5 text-center">
          <div className="mb-2 flex items-center justify-center gap-3 text-[#F09AAE]">
            <Heart size={16} fill="currentColor" />
            <h1 className="text-2xl font-bold uppercase tracking-wide text-[#E87591]">Escolha um gesto de carinho para a Liara</h1>
            <Heart size={16} fill="currentColor" />
          </div>
          <p className="mx-auto max-w-md text-[15px] leading-relaxed text-[#8B5A5A]">
            Estamos preparando o enxoval da nossa pequena Liara com muito amor. Escolha um presente disponível e faça parte desse momento tão especial para nossa família.
          </p>
        </motion.div>

        <div className="mb-4 grid grid-cols-[46px_1fr] items-center gap-3 rounded-[1.25rem] border-2 border-[#F8D7E4] bg-[#FFF5F0]/90 px-4 py-3 text-[#8B5A5A] shadow-sm sm:grid-cols-[46px_1fr_28px]">
          <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-white text-[#E89CB8] shadow-sm">
            <Gift size={24} />
          </span>
          <p className="text-xs leading-relaxed sm:text-sm">
            Após reservar seu presente, você poderá decidir se deseja entregá-lo pessoalmente no dia do chá ou contribuir através do Pix.
          </p>
          <Heart size={18} className="hidden text-[#E89CB8] sm:block" fill="currentColor" />
        </div>

        <div className="mb-4 rounded-[1.25rem] border border-[#F4C7D7]/80 bg-white/84 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.1em] text-[#E89CB8] shadow-[0_10px_24px_rgba(139,90,90,0.07)]">
          {categoryCounts.all} presentes disponíveis aguardando um gesto de carinho
        </div>

        <div className="premium-card mb-5 rounded-[1.4rem] border-2 border-[#F8D7E4] bg-white/86 p-3 sm:rounded-[1.6rem]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0826D]" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Encontre um presente"
              className="h-11 w-full rounded-full border-2 border-[#F4C7D7] bg-white/95 pl-11 pr-4 text-sm text-[#5F4A44] outline-none placeholder:text-[#B99B8B] focus:border-[#E89CB8]"
            />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className="min-h-10 rounded-full border-2 px-2 text-[10px] font-bold uppercase leading-tight tracking-wide shadow-sm transition-transform active:scale-[0.98] sm:text-[11px]"
                style={{
                  background: filter === option.value ? '#E89CB8' : '#FFFDFC',
                  color: filter === option.value ? '#FFFFFF' : '#8B5A5A',
                  borderColor: '#E89CB8',
                }}
              >
                {option.label}
                <span className="ml-1">({categoryCounts[option.value]})</span>
              </button>
            ))}
          </div>
        </div>

        <section className="grid gap-3">
          {filteredGifts.length === 0 ? (
            <div className="rounded-[1.4rem] border-2 border-dashed border-[#F4C7D7] bg-white/84 p-6 text-center">
              <p className="font-serif text-xl font-bold text-[#E89CB8]">Nenhum presente disponível aqui</p>
              <p className="mt-2 text-sm leading-relaxed text-[#8B5A5A]">
                Tente outra categoria ou fale com a família para combinar a melhor forma de participar desse momento especial.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilter('all');
                  setSearch('');
                }}
                className="mt-4 min-h-[42px] rounded-full border-2 border-[#E89CB8] bg-white px-5 text-xs font-bold uppercase text-[#E89CB8] active:scale-[0.98]"
              >
                Ver todos os presentes
              </button>
            </div>
          ) : (
            filteredGifts.map((gift) => (
              <GiftRow key={gift.id} gift={gift} onChoose={() => handleOpenGift(gift)} />
            ))
          )}
        </section>
      </div>

      {selectedGift && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#5F4A44]/35 p-3 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSelectedGift(null)}>
          <motion.section
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="premium-card max-h-[92svh] w-full max-w-md overflow-y-auto rounded-[1.8rem] border-2 border-[#F8D7E4] bg-white/96 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 text-center">
              <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-[1.4rem] bg-[#FFF6F4] shadow-sm">
                <img src="/fotos/logo-lista.png" alt="Logo do Chá de Bebê da Liara" className="h-full w-full object-contain mix-blend-multiply" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#E89CB8]">Você escolheu um lindo presente para a Liara</p>
              <h2 className="mt-3 text-lg font-bold leading-snug text-[#5F4A44]">{selectedGift.name}</h2>
              <p className="mt-2 text-2xl font-bold text-[#E89CB8]">R$ {selectedGift.price}</p>
            </div>

            <p className="mb-4 text-center text-sm leading-relaxed text-[#8B5A5A]">
              Muito obrigado pelo seu carinho. Sua escolha ajudará a preparar o enxoval da Liara para sua chegada.
            </p>
            <p className="mb-3 text-center text-sm font-bold text-[#8B5A5A]">Como deseja presentear?</p>
            <div className="grid gap-3">
              <MethodButton active={selectedMethod === 'levar'} onClick={() => setSelectedMethod('levar')}>
                Levarei este presente no dia do chá.
              </MethodButton>
              <MethodButton active={selectedMethod === 'pix'} onClick={() => setSelectedMethod('pix')}>
                Prefiro contribuir via Pix para que a família providencie este presente.
              </MethodButton>
            </div>

            {selectedMethod === 'pix' && (
              <div className="mt-4 rounded-[1.35rem] border-2 border-[#F4C7D7] bg-[#FFF5F0] p-4 shadow-inner">
                <div className="space-y-2 text-sm text-[#8B5A5A]">
                  <p><strong>Valor sugerido:</strong> R$ {selectedGift.price}</p>
                  <p><strong>Favorecido:</strong> {eventInfo.pixName}</p>
                  <p><strong>Chave Pix:</strong> {eventInfo.pixKey}</p>
                  {eventInfo.pixBank && <p><strong>Banco para conferência:</strong> {eventInfo.pixBank}</p>}
                </div>
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8B5A5A]">
                    Chave Pix CPF
                  </span>
                  <input
                    readOnly
                    value={eventInfo.pixKey}
                    className="h-12 w-full rounded-[1rem] border-2 border-[#F4C7D7] bg-white px-4 text-center text-base font-bold text-[#5F4A44] outline-none focus:border-[#E89CB8]"
                    aria-label="Chave Pix CPF"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-white shadow-lg shadow-[#E89CB8]/25 transition active:scale-[0.985]"
                  style={{
                    background: copied
                      ? 'linear-gradient(90deg, #72B56B, #5BA654)'
                      : 'linear-gradient(90deg, #E89CB8, #D873A0)',
                  }}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Chave Pix copiada' : 'Copiar chave Pix'}
                </button>
                <p className="mt-3 text-xs leading-relaxed text-[#A0826D]">
                  Caso escolha contribuir via Pix, utilizaremos esse valor exclusivamente para adquirir o presente escolhido por você.
                </p>
                {copied && (
                  <p className="mt-3 rounded-[1rem] bg-[#EEF8ED] px-4 py-2 text-center text-xs font-bold text-[#4B8B45]">
                    Chave Pix copiada com sucesso. Agora é só colar no app do seu banco.
                  </p>
                )}
                {copyError && (
                  <p className="mt-3 rounded-[1rem] bg-white px-4 py-3 text-center text-xs font-bold text-[#A86F5E]">
                    {copyError}
                  </p>
                )}
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8B5A5A]">
                    Comprovante opcional
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    disabled={!isSupabaseConfigured}
                    onChange={(event) => handleReceiptChange(event.target.files?.[0])}
                    className="w-full rounded-[1.1rem] border-2 border-[#F4C7D7] bg-white p-3 text-xs text-[#8B5A5A] file:mr-3 file:rounded-full file:border-0 file:bg-[#E89CB8] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white disabled:opacity-60"
                  />
                  <span className="mt-2 block text-xs text-[#A0826D]">
                    {isSupabaseConfigured
                      ? pixReceipt?.name || 'Aceita imagem ou PDF.'
                      : 'O envio de comprovante será ativado quando o Supabase estiver configurado.'}
                  </span>
                </label>
              </div>
            )}

            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedMethod || isConfirming}
              className="premium-button mt-5 min-h-[56px] w-full rounded-full bg-gradient-to-r from-[#E89CB8] to-[#D873A0] text-sm font-bold text-white transition enabled:active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-none disabled:bg-[#E8D7D7] disabled:text-white/80 disabled:shadow-none"
            >
              {isConfirming ? 'Confirmando...' : 'Confirmar Reserva'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedGift(null)}
              className="mt-2 min-h-[48px] w-full rounded-full border-2 border-[#E89CB8] bg-white text-sm font-bold text-[#E89CB8] transition active:scale-[0.985]"
            >
              Voltar
            </button>
          </motion.section>
        </div>
      )}
    </VisualFrame>
  );
};

const filterOptions: Array<{ value: 'all' | GiftCategory; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'P', label: 'P' },
  { value: 'M', label: 'M' },
  { value: 'G', label: 'G' },
];

interface GiftRowProps {
  gift: GiftItem;
  onChoose: () => void;
}

const GiftRow = ({ gift, onChoose }: GiftRowProps) => (
  <motion.article
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="premium-card grid grid-cols-[64px_1fr] gap-3 rounded-[1.35rem] border-2 bg-white/92 p-3 transition-transform active:scale-[0.992] sm:grid-cols-[72px_1fr_auto] sm:rounded-[1.55rem] sm:p-4"
    style={{ borderColor: gift.isReserved ? '#EBCFD6' : '#F4C7D7', opacity: gift.isReserved ? 0.62 : 1 }}
  >
    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.1rem] bg-[#FFF6F4] p-0 shadow-sm sm:h-[72px] sm:w-[72px] sm:rounded-[1.35rem]">
      <img
        src="/fotos/logo-lista.png"
        alt="Logo do Chá de Bebê da Liara"
        className="h-full w-full object-contain mix-blend-multiply"
        loading="lazy"
      />
    </div>
    <div className="min-w-0">
      <h3 className="text-sm font-bold leading-snug text-[#5F4A44]">{gift.name}</h3>
      <p className="mt-1 text-xs font-semibold text-[#E89CB8]">Tamanho {gift.category}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-[#8B5A5A]">
        <Gift size={13} />
        Um gesto de carinho para o enxoval
      </p>
    </div>
    <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end">
      <span
        className="rounded-full px-3 py-1 text-xs font-bold"
        style={{
          background: gift.isReserved ? '#EFE7E2' : '#EAF7EA',
          color: gift.isReserved ? '#9A8175' : '#3A8A40',
        }}
      >
        {gift.isReserved ? 'Reservado com carinho' : 'Disponível para reserva'}
      </span>
      <button
        type="button"
        onClick={onChoose}
        disabled={gift.isReserved}
        className="min-h-[42px] min-w-[132px] rounded-full border-2 border-transparent bg-gradient-to-r from-[#E89CB8] to-[#D873A0] px-5 text-xs font-bold uppercase text-white shadow-md shadow-[#E89CB8]/20 transition active:scale-[0.985] disabled:border-dashed disabled:border-[#E89CB8] disabled:bg-none disabled:bg-white disabled:text-[#E89CB8] disabled:shadow-none"
      >
        {gift.isReserved ? 'Reservado' : 'Reservar Presente'}
      </button>
    </div>
  </motion.article>
);

interface MethodButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

const MethodButton = ({ active, onClick, children }: MethodButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-[58px] items-center justify-between gap-4 rounded-[1.15rem] border-2 px-4 py-3 text-left text-sm font-bold leading-relaxed shadow-[0_10px_22px_rgba(139,90,90,0.055)] transition-all active:scale-[0.99]"
    style={{
      borderColor: active ? '#E89CB8' : '#F4C7D7',
      background: active ? '#FCE8F0' : '#FFFFFF',
      color: '#8B5A5A',
    }}
  >
    <span>{children}</span>
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all"
      style={{
        borderColor: active ? '#E89CB8' : '#DAB9AD',
        background: active ? '#E89CB8' : 'transparent',
        transform: active ? 'scale(1.08)' : 'scale(1)',
      }}
    >
      <span
        className="h-2.5 w-2.5 rounded-full bg-white transition-all"
        style={{ opacity: active ? 1 : 0, transform: active ? 'scale(1)' : 'scale(0.4)' }}
      />
    </span>
  </button>
);
