import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Gift, Heart, MapPin, Waves } from 'lucide-react';
import { Countdown } from '../components/Countdown';
import { LogoHeader } from '../components/LogoHeader';
import { VisualFrame } from '../components/VisualFrame';
import { getEventInfo } from '../lib/repository';
import { eventInfo as defaultEventInfo } from '../data/gifts';

interface HomeProps {
  onConfirmPresence: () => void;
}

export const Home = ({ onConfirmPresence }: HomeProps) => {
  const [eventInfo, setEventInfo] = useState(defaultEventInfo);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const refresh = async () => {
      try {
        setEventInfo(await getEventInfo());
        setLoadError('');
      } catch {
        setLoadError('Não conseguimos carregar as informações atualizadas agora. Tente novamente em instantes.');
      }
    };
    refresh();

    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  const mapEmbedUrl =
    eventInfo.addressEmbedUrl ||
    `https://www.google.com/maps?q=${encodeURIComponent(eventInfo.address)}&output=embed`;

  return (
    <VisualFrame variant="home">
      <div className="mx-auto max-w-3xl">
        <LogoHeader size="large" showTitle={false} />

        {loadError && (
          <div className="mb-4 rounded-[1.2rem] border-2 border-red-100 bg-white/90 p-3 text-center text-xs font-bold text-red-500">
            {loadError}
          </div>
        )}

        <motion.p
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mb-6 max-w-sm text-center text-[15px] leading-relaxed text-[#8B5A5A]"
        >
          {eventInfo.invitationMessage}
        </motion.p>

        <motion.section
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="premium-card mb-5 rounded-[1.55rem] border-2 border-[#F8D7E4] bg-white/90 p-4"
        >
          <div className="grid gap-0 divide-y divide-[#F4C7D7] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <InfoRow icon={<Calendar size={22} />} label="Quando será" value={eventInfo.date} />
            <InfoRow icon={<Clock size={22} />} label="Horário" value={`${eventInfo.time}h`} />
            <InfoRow icon={<MapPin size={22} />} label="Onde será" value={eventInfo.addressReference} details={eventInfo.address} />
          </div>
        </motion.section>

        <motion.section
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="premium-card mb-5 rounded-[1.55rem] border-2 border-[#F8D7E4] bg-white/90 p-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F6B7C0] to-[#E889A2] text-white shadow-sm">
              <Waves size={22} />
            </div>
            <p className="text-sm leading-relaxed text-[#8B5A5A]">
              Nosso espaço contará com piscina liberada para todos os convidados. Se desejar aproveitar esse momento com ainda mais diversão, lembre-se de levar sua roupa de banho.
            </p>
            <Heart size={18} className="ml-auto hidden shrink-0 text-[#E89CB8] sm:block" fill="currentColor" />
          </div>
        </motion.section>

        <div className="mb-5">
          <Countdown targetDate={new Date(eventInfo.isoDate)} />
        </div>

        <motion.div
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <a href={eventInfo.addressLink} target="_blank" rel="noopener noreferrer">
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              className="premium-card relative flex min-h-[82px] w-full items-center justify-center gap-2 rounded-[1.35rem] border-2 border-[#F4AFC2] bg-white/92 px-4 pb-4 pt-7 text-sm font-bold uppercase tracking-wide text-[#E89CB8] transition"
            >
              <span className="absolute -top-6 flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#FFF6F4] bg-[#FCE8F0] text-[#E89CB8] shadow-md">
                <MapPin size={22} />
              </span>
              Como Chegar
            </motion.button>
          </a>

          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={onConfirmPresence}
            className="premium-button relative flex min-h-[82px] w-full items-center justify-center gap-2 rounded-[1.35rem] border-2 border-[#F4AFC2] bg-gradient-to-r from-[#EFA1B2] to-[#E87591] px-4 pb-4 pt-7 text-sm font-bold uppercase tracking-wide text-white transition"
          >
            <span className="absolute -top-6 flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#FFF6F4] bg-[#E89CB8] text-white shadow-md">
              <Gift size={22} />
            </span>
            Confirmar Minha Presença
          </motion.button>
        </motion.div>

        <motion.details
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="premium-card group mt-5 overflow-hidden rounded-[1.55rem] border-2 border-[#F8D7E4] bg-white/90"
        >
          <summary
            aria-label="Abrir mapa do local"
            className="flex min-h-[58px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-bold uppercase tracking-wide text-[#E89CB8] marker:hidden"
          >
            <span className="flex items-center gap-2">
              <MapPin size={19} />
              Ver mapa do local
            </span>
            <span className="text-xl leading-none transition-transform group-open:rotate-45">+</span>
          </summary>
          <iframe
            title="Localização do Chá de Bebê da Liara"
            src={mapEmbedUrl}
            className="h-48 w-full border-0 sm:h-56"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </motion.details>

        <p className="mt-5 text-center font-serif text-lg italic text-[#E89CB8]">Esperamos você com muito carinho!</p>
      </div>
    </VisualFrame>
  );
};

interface InfoRowProps {
  icon: ReactNode;
  label: string;
  value: string;
  details?: string;
}

const InfoRow = ({ icon, label, value, details }: InfoRowProps) => (
  <div className="flex min-h-[96px] items-center gap-4 py-4 first:pt-0 last:pb-0 sm:flex-col sm:justify-start sm:px-3 sm:py-0">
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F6B7C0] to-[#E889A2] text-white shadow-sm sm:mx-auto">
      {icon}
    </div>
    <div className="min-w-0 sm:text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#E89CB8]">{label}</p>
      <p className="mt-1 font-bold leading-snug text-[#5F4A44]">{value}</p>
      {details && <p className="mt-1 text-xs leading-relaxed text-[#A0826D]">{details}</p>}
    </div>
  </div>
);
