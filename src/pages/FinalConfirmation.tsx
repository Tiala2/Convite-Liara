import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarPlus, Check, Gift, Heart, Home, MapPin, MessageCircle, Users, Waves } from 'lucide-react';
import { ProgressBar } from '../components/ProgressBar';
import { StepHeader, VisualFrame } from '../components/VisualFrame';
import { eventInfo as defaultEventInfo } from '../data/gifts';
import { getEventInfo } from '../lib/repository';
import type { Guest } from '../types';

interface FinalConfirmationProps {
  guest: Guest;
  onBackToHome: () => void;
}

export const FinalConfirmation = ({ guest, onBackToHome }: FinalConfirmationProps) => {
  const [eventInfo, setEventInfo] = useState(defaultEventInfo);

  useEffect(() => {
    void getEventInfo().then(setEventInfo).catch(() => undefined);
  }, []);

  const shareEvent = async () => {
    const text = `Confirmei minha presença no Chá de Bebê da Liara e reservei um presente com muito carinho: ${guest.giftName}.`;

    if (navigator.share) {
      await navigator.share({ text, url: window.location.href });
      return;
    }

    const whatsappText = encodeURIComponent(`${text} ${window.location.href}`);
    window.open(`https://wa.me/?text=${whatsappText}`, '_blank', 'noopener,noreferrer');
  };

  const calendarUrl = createGoogleCalendarUrl(eventInfo);

  return (
    <VisualFrame>
      <button
        onClick={onBackToHome}
        aria-label="Voltar ao convite"
        className="fixed left-4 top-4 z-30 flex items-center gap-1 rounded-full bg-white/85 px-3 py-2 text-xs font-bold uppercase text-[#E89CB8] shadow-sm active:scale-[0.98]"
      >
        <ArrowLeft size={20} />
        <span className="hidden sm:inline">Voltar</span>
      </button>

      <div className="mx-auto max-w-2xl">
        <StepHeader />

        <div className="mb-5 mt-2 sm:mb-6 sm:mt-4">
          <ProgressBar currentStep={2} steps={['Presença', 'Presente', 'Confirmação']} />
        </div>

        <motion.section
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="premium-card relative mb-5 overflow-hidden rounded-[1.55rem] border-2 border-[#F8D7E4] bg-white/92 p-5 text-center sm:rounded-[1.8rem] sm:p-6"
        >
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#72B56B] bg-[#EEF8ED] shadow-[0_12px_26px_rgba(91,166,84,0.18)] sm:h-24 sm:w-24">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/65 text-[#66AA5E] sm:h-[72px] sm:w-[72px]">
              <Check size={44} />
            </div>
          </div>
          <div className="mb-2 flex items-center justify-center gap-3 text-[#F09AAE]">
            <Heart size={15} fill="currentColor" />
            <h1 className="text-2xl font-bold uppercase tracking-wide text-[#E87591]">Sua presença foi confirmada com sucesso!</h1>
            <Heart size={15} fill="currentColor" />
          </div>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#8B5A5A]">
            Muito obrigado por confirmar sua presença e por fazer parte desse momento tão especial da nossa família. Sua presença e seu carinho ajudarão a preparar a chegada da nossa pequena Liara. Estamos ansiosos para compartilhar esse dia com você!
          </p>
        </motion.section>

        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="premium-card mb-5 rounded-[1.55rem] border-2 border-[#F8D7E4] bg-white/95 p-4 sm:rounded-[1.8rem] sm:p-5"
        >
          <h2 className="mb-4 flex items-center justify-center gap-3 text-center text-sm font-bold uppercase tracking-[0.12em] text-[#E89CB8]">
            <span className="h-px flex-1 border-t border-dashed border-[#F4C7D7]" />
            Resumo da sua confirmação
            <span className="h-px flex-1 border-t border-dashed border-[#F4C7D7]" />
          </h2>
          <div className="overflow-hidden rounded-[1.25rem] border border-[#F7D8E1] bg-[#FFFDFC]">
            <SummaryRow icon={<Users size={19} />} label="Nome" value={guest.name} />
            <SummaryRow icon={<MessageCircle size={19} />} label="WhatsApp" value={guest.whatsapp} />
            <SummaryRow icon={<Users size={19} />} label="Quantidade" value={`${guest.numberOfPeople} pessoa(s)`} />
            <SummaryRow icon={<Waves size={19} />} label="Piscina" value={poolText[guest.poolUsage]} />
            <GiftSummaryRow value={guest.giftName} detail={`R$ ${guest.giftPrice}`} />
            <SummaryRow icon={<Gift size={19} />} label="Forma de presentear" value={methodText[guest.giftMethod]} detail={pixText[guest.pixStatus]} />
          </div>
        </motion.section>

        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="premium-card mb-5 rounded-[1.45rem] border-2 border-[#F4C7D7] bg-[#FFF5F0]/92 p-5 text-center"
        >
          <p className="text-sm leading-relaxed text-[#8B5A5A]">
            Seu presente foi reservado com sucesso e ficará associado ao seu nome. Muito obrigado por contribuir com o enxoval da Liara. Cada gesto de carinho fará parte dessa linda fase de preparação para sua chegada.
          </p>
          {guest.poolUsage !== 'nao' && (
            <p className="mt-4 text-xs font-bold text-[#E89CB8]">
              Se for aproveitar a piscina, lembre-se de levar sua roupa de banho.
            </p>
          )}
        </motion.section>

        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="premium-card mb-5 grid grid-cols-[48px_1fr_48px] items-center gap-3 rounded-[1.45rem] border-2 border-[#F8D7E4] bg-[#FFF5F0]/90 p-4 text-[#8B5A5A]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#E89CB8] shadow-sm">
            <Heart size={23} />
          </span>
          <p className="text-xs leading-relaxed sm:text-sm">
            Nos vemos em breve para celebrar juntos esse momento tão especial! Será uma alegria receber você.
          </p>
          <span className="relative flex h-11 w-11 items-center justify-center rounded-[1rem] bg-white text-[#E89CB8] shadow-sm">
            <Gift size={22} />
          </span>
        </motion.section>

        <div className="grid gap-3 sm:grid-cols-2">
          <ActionLink href={calendarUrl} icon={<CalendarPlus size={18} />} primary>
            Salvar na Minha Agenda
          </ActionLink>
          <ActionLink href={eventInfo.addressLink} icon={<MapPin size={18} />}>
            Abrir Localização
          </ActionLink>
          <ActionButton onClick={onBackToHome} icon={<Home size={18} />}>
            Voltar ao Convite
          </ActionButton>
          <ActionButton onClick={shareEvent} icon={<MessageCircle size={18} />}>
            Compartilhar Convite
          </ActionButton>
        </div>

        <p className="mt-7 text-center font-serif text-lg italic text-[#E89CB8]">Muito obrigado pelo carinho!</p>
      </div>
    </VisualFrame>
  );
};

const createGoogleCalendarUrl = (eventInfo: typeof defaultEventInfo) => {
  const start = new Date(eventInfo.isoDate);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const format = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventInfo.eventName,
    dates: `${format(start)}/${format(end)}`,
    details: eventInfo.invitationMessage,
    location: eventInfo.address,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const poolText = {
  sim: 'Sim',
  nao: 'Não',
  talvez: 'Talvez',
};

const methodText = {
  pix: 'Contribuição via Pix',
  levar: 'Presente entregue no dia',
};

const pixText = {
  not_required: '',
  pending_receipt: 'Pix escolhido, sem comprovante',
  pending_review: 'Comprovante aguardando conferência',
  confirmed: 'Pix confirmado',
  rejected: 'Pix não localizado',
};

interface SummaryRowProps {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
}

const SummaryRow = ({ icon, label, value, detail }: SummaryRowProps) => (
  <div className="grid grid-cols-[minmax(112px,0.9fr)_1.1fr] gap-3 border-b border-dashed border-[#F1DDD2] px-3 py-3 last:border-0">
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5A9B7] text-white">{icon}</div>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#A0826D]">{label}</p>
    </div>
    <div className="min-w-0 border-l border-dashed border-[#F1DDD2] pl-3">
      <p className="break-words text-sm font-semibold text-[#5F4A44]">{value}</p>
      {detail && <p className="text-xs text-[#A0826D]">{detail}</p>}
    </div>
  </div>
);

const GiftSummaryRow = ({ value, detail }: { value: string; detail: string }) => (
  <div className="grid grid-cols-[minmax(112px,0.9fr)_1.1fr] gap-3 border-b border-dashed border-[#F1DDD2] px-3 py-3">
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5A9B7] text-white">
        <Gift size={19} />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#A0826D]">Presente escolhido</p>
    </div>
    <div className="grid min-w-0 grid-cols-[56px_1fr] items-center gap-3 border-l border-dashed border-[#F1DDD2] pl-3">
      <div className="h-14 w-14 overflow-hidden rounded-[1rem] bg-[#FFF6F4] shadow-sm">
        <img src="/fotos/logo-lista.png" alt="Logo do presente escolhido" className="h-full w-full object-contain mix-blend-multiply" />
      </div>
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-[#5F4A44]">{value}</p>
        <p className="text-xs text-[#A0826D]">{detail}</p>
      </div>
    </div>
  </div>
);

const ActionLink = ({ href, icon, children, primary = false }: { href: string; icon: ReactNode; children: ReactNode; primary?: boolean }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`flex min-h-[54px] items-center justify-center gap-2 rounded-full border-2 text-sm font-bold shadow-sm transition active:scale-[0.985] ${
      primary
        ? 'premium-button border-transparent bg-gradient-to-r from-[#E89CB8] to-[#D873A0] text-white'
        : 'border-[#F4C7D7] bg-white text-[#8B5A5A]'
    }`}
  >
    {icon}
    {children}
  </a>
);

const ActionButton = ({ onClick, icon, children }: { onClick: () => void | Promise<void>; icon: ReactNode; children: ReactNode }) => (
  <button
    type="button"
    onClick={() => void onClick()}
    className="flex min-h-[54px] items-center justify-center gap-2 rounded-full border-2 border-[#E89CB8] bg-white text-sm font-bold text-[#E89CB8] shadow-sm transition active:scale-[0.985]"
  >
    {icon}
    {children}
  </button>
);
