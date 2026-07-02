import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Gift, Heart, Lock, MessageCircle, User, Users, Waves } from 'lucide-react';
import { ProgressBar } from '../components/ProgressBar';
import { StepHeader, VisualFrame } from '../components/VisualFrame';
import type { GuestDraft, PoolUsage } from '../types';

interface ConfirmationStep1Props {
  initialData: GuestDraft;
  onNext: (data: GuestDraft & { poolUsage: PoolUsage }) => void;
  onBack: () => void;
}

type Errors = Partial<Record<'name' | 'whatsapp' | 'poolUsage', string>>;

export const ConfirmationStep1 = ({ initialData, onNext, onBack }: ConfirmationStep1Props) => {
  const [name, setName] = useState(initialData.name);
  const [whatsapp, setWhatsapp] = useState(initialData.whatsapp);
  const [numberOfPeople, setNumberOfPeople] = useState(initialData.numberOfPeople || 1);
  const [poolUsage, setPoolUsage] = useState<PoolUsage | ''>(initialData.poolUsage);
  const [errors, setErrors] = useState<Errors>({});

  const formatWhatsapp = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const validateForm = () => {
    const nextErrors: Errors = {};

    if (name.trim().split(/\s+/).length < 2) {
      nextErrors.name = 'Vamos começar pelo seu nome completo.';
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanWhatsapp.length < 10 || cleanWhatsapp.length > 11) {
      nextErrors.whatsapp = 'Confira se o número foi informado corretamente.';
    }

    if (!poolUsage) {
      nextErrors.poolUsage = 'Precisamos dessa informação para organizar esse momento com carinho.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm() || !poolUsage) return;

    onNext({
      name: name.trim(),
      whatsapp,
      numberOfPeople,
      poolUsage,
    });
  };

  const clearError = (field: keyof Errors) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  return (
    <VisualFrame>
      <button
        onClick={onBack}
        aria-label="Voltar para o convite"
        className="fixed left-4 top-4 z-30 flex items-center gap-1 rounded-full bg-white/85 px-3 py-2 text-xs font-bold uppercase text-[#E89CB8] shadow-sm active:scale-[0.98]"
      >
        <ArrowLeft size={20} />
        <span className="hidden sm:inline">Voltar</span>
      </button>

      <div className="mx-auto max-w-2xl">
        <StepHeader />

        <div className="mb-5 mt-2 sm:mb-6 sm:mt-4">
          <ProgressBar currentStep={0} steps={['Presença', 'Presente', 'Confirmação']} />
        </div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-5 text-center">
          <div className="mb-2 flex items-center justify-center gap-3 text-[#F09AAE]">
            <Heart size={16} fill="currentColor" />
            <h1 className="text-2xl font-bold uppercase tracking-wide text-[#E87591]">Que alegria ter você conosco!</h1>
            <Heart size={16} fill="currentColor" />
          </div>
          <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-[#8B5A5A]">
            Preencha as informações abaixo para confirmar sua presença e nos ajudar na organização desse momento tão especial. Leva apenas alguns segundos.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card rounded-[1.55rem] border-2 border-[#F8D7E4] bg-white/90 p-4 sm:rounded-[1.8rem] sm:p-5"
        >
          <div className="space-y-4 sm:space-y-5">
            <FieldLabel icon={<User size={19} />} label="Nome completo *">
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  clearError('name');
                }}
                placeholder="Digite seu nome completo"
                aria-invalid={Boolean(errors.name)}
                className="w-full bg-transparent text-sm text-[#5F4A44] outline-none placeholder:text-[#B89586]"
              />
              {errors.name && <ErrorText>{errors.name}</ErrorText>}
            </FieldLabel>

            <FieldLabel icon={<MessageCircle size={19} />} label="WhatsApp *">
              <input
                type="tel"
                value={whatsapp}
                onChange={(event) => {
                  setWhatsapp(formatWhatsapp(event.target.value));
                  clearError('whatsapp');
                }}
                placeholder="(DDD) 9 9999-9999"
                aria-invalid={Boolean(errors.whatsapp)}
                className="w-full bg-transparent text-sm text-[#5F4A44] outline-none placeholder:text-[#B89586]"
              />
              {errors.whatsapp && <ErrorText>{errors.whatsapp}</ErrorText>}
            </FieldLabel>

            <FieldLabel icon={<Users size={19} />} label="Quantidade de pessoas *">
              <div className="grid grid-cols-[42px_1fr_42px] items-center gap-3">
                <button
                  type="button"
                  onClick={() => setNumberOfPeople(Math.max(1, numberOfPeople - 1))}
                  aria-label="Diminuir quantidade de pessoas"
                  className="h-10 rounded-full bg-[#F4C7D7] font-bold text-[#8B5A5A] shadow-sm active:scale-[0.96]"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={numberOfPeople}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    setNumberOfPeople(Number.isNaN(nextValue) ? 1 : Math.min(10, Math.max(1, nextValue)));
                  }}
                  className="h-10 rounded-full border-2 border-[#F4C7D7] bg-[#FFFDFC] text-center text-sm font-bold text-[#8B5A5A] outline-none focus:border-[#E89CB8]"
                  aria-label="Quantidade de pessoas"
                />
                <button
                  type="button"
                  onClick={() => setNumberOfPeople(Math.min(10, numberOfPeople + 1))}
                  aria-label="Aumentar quantidade de pessoas"
                  className="h-10 rounded-full bg-[#E89CB8] font-bold text-white shadow-sm active:scale-[0.96]"
                >
                  +
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-[#A0826D]">
                Informe quantas pessoas acompanharão você. {numberOfPeople === 1 ? '1 pessoa' : `${numberOfPeople} pessoas`}
              </p>
            </FieldLabel>

            <FieldLabel icon={<Waves size={19} />} label="Você pretende aproveitar nossa piscina durante o evento? *">
              <div className="grid gap-2">
                {poolOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setPoolUsage(option.value);
                      clearError('poolUsage');
                    }}
                    className="flex min-h-[52px] items-center justify-between gap-3 rounded-[1rem] border-2 px-4 py-3 text-left text-sm font-bold shadow-sm transition active:scale-[0.99]"
                    style={{
                      borderColor: poolUsage === option.value ? '#E89CB8' : '#F4C7D7',
                      background: poolUsage === option.value ? '#FCE8F0' : '#FFFFFF',
                      color: '#8B5A5A',
                    }}
                  >
                    <span>{option.label}</span>
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all"
                      style={{
                        borderColor: poolUsage === option.value ? '#E89CB8' : '#DAB9AD',
                        background: poolUsage === option.value ? '#E89CB8' : 'transparent',
                        transform: poolUsage === option.value ? 'scale(1.06)' : 'scale(1)',
                      }}
                    >
                      {poolUsage === option.value && <Check size={14} className="text-white" />}
                    </span>
                  </button>
                ))}
              </div>
              {errors.poolUsage && <ErrorText>{errors.poolUsage}</ErrorText>}
              <p className="mt-3 text-xs leading-relaxed text-[#A0826D]">
                Caso deseje aproveitar, basta levar sua roupa de banho. Será um prazer receber você!
              </p>
            </FieldLabel>

            <div className="grid grid-cols-[48px_1fr_48px] items-center gap-3 rounded-[1.25rem] border-2 border-[#F8D7E4] bg-[#FFF5F0]/90 px-4 py-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#E89CB8] shadow-sm">
                <Heart size={22} />
              </span>
              <div>
                <p className="text-sm font-bold text-[#8B5A5A]">Quase lá!</p>
                <p className="mt-1 text-xs leading-relaxed text-[#8B5A5A]">
                  Para concluir sua confirmação, escolha um presente disponível. Cada escolha ajudará a montar o enxoval da Liara com muito carinho.
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-white text-[#E89CB8] shadow-sm">
                <Gift size={22} />
              </span>
            </div>
          </div>
        </motion.section>

        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={handleSubmit}
          className="premium-button mt-6 min-h-[62px] w-full rounded-full bg-gradient-to-r from-[#EFA1B2] to-[#E87591] px-5 py-4 text-sm font-bold uppercase tracking-wide text-white transition sm:mt-7 sm:min-h-[64px]"
        >
          Escolher Meu Presente
        </motion.button>

        <div className="mt-5 flex items-center justify-center gap-2 text-center text-sm text-[#A0826D]">
          <Lock size={17} />
          <span>Seus dados serão usados apenas para organizar este momento com carinho.</span>
        </div>

        <p className="mx-auto mt-8 max-w-sm text-center font-serif text-lg italic leading-relaxed text-[#A86F5E]">
          Que felicidade saber que você estará conosco!
        </p>
      </div>
    </VisualFrame>
  );
};

const poolOptions: Array<{ value: PoolUsage; label: string }> = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
  { value: 'talvez', label: 'Talvez' },
];

interface FieldLabelProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}

const FieldLabel = ({ icon, label, children }: FieldLabelProps) => (
  <div className="grid grid-cols-[48px_1fr] items-center gap-3 rounded-[1.25rem] border-2 border-[#F8D7E4] bg-white/94 px-3 py-3 shadow-[0_10px_24px_rgba(139,90,90,0.06)] transition focus-within:border-[#E89CB8] sm:grid-cols-[54px_1fr] sm:px-4 sm:py-4">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#F5B2BD] to-[#E87591] text-white shadow-sm sm:h-12 sm:w-12">{icon}</span>
    <span>
      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-[#8B5A5A]">{label}</span>
      {children}
    </span>
  </div>
);

const ErrorText = ({ children }: { children: ReactNode }) => (
  <p className="mt-1 text-xs font-semibold text-red-500">{children}</p>
);
