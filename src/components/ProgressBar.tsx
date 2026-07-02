import { motion } from 'framer-motion';
import { Check, Gift, UserRound } from 'lucide-react';

interface ProgressBarProps {
  currentStep: number;
  steps: string[];
}

export const ProgressBar = ({ currentStep, steps }: ProgressBarProps) => (
  <div className="premium-card mb-7 w-full rounded-[1.55rem] border-2 border-[#F8D7E4] bg-white/88 px-2 py-4 sm:mb-8 sm:rounded-[1.8rem] sm:px-4">
    <div className="relative grid grid-cols-3 gap-2">
      <div className="absolute left-[16%] right-[16%] top-7 border-t-2 border-dashed border-[#F09AAE]/70 sm:top-8" />
      {steps.map((step, index) => {
        const isFinalStep = currentStep >= 2;
        const isDone = index < currentStep || isFinalStep;
        const isActive = index === currentStep;

        return (
          <div key={step} className="relative z-10 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: isActive ? 1.06 : 1 }}
              transition={{ type: 'spring', duration: 0.45, bounce: 0.2 }}
              className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] bg-white shadow-sm sm:h-16 sm:w-16"
              style={{
                borderColor: isDone || isActive ? '#E89CB8' : '#F1DDD5',
                color: isDone || isActive ? '#FFFFFF' : '#A0826D',
                background: isDone || isActive ? '#E89CB8' : '#FFFFFF',
              }}
            >
              {isDone ? <Check size={25} /> : progressIcon(index)}
            </motion.div>
            <span
              className="mt-3 text-[11px] font-bold uppercase leading-tight"
              style={{ color: isDone || isActive ? '#E89CB8' : '#A0826D' }}
            >
              {index + 1}. {progressLabel(index, step)}
            </span>
            <span className="mt-1 min-h-4 text-[11px] text-[#8B5A5A]">
              {isDone ? doneSubLabel(index, currentStep) : isActive ? activeSubLabel(index) : waitingSubLabel(index)}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const progressLabel = (index: number, fallback: string) => {
  if (index === 0) return 'Sua presença';
  if (index === 1) return 'Escolher presente';
  if (index === 2) return 'Confirmação';
  return fallback;
};

const progressIcon = (index: number) => {
  if (index === 0) return <UserRound size={24} />;
  if (index === 1) return <Gift size={24} />;
  return <span className="text-lg font-bold">3</span>;
};

const activeSubLabel = (index: number) => {
  if (index === 0) return 'Agora';
  if (index === 1) return 'Escolha seu presente';
  return 'Concluído';
};

const doneSubLabel = (index: number, currentStep: number) => {
  if (currentStep >= 2 && index === 1) return 'Presente reservado';
  if (currentStep >= 2 && index === 2) return 'Concluído';
  return 'Preenchido';
};

const waitingSubLabel = (index: number) => {
  if (index === 1) return 'Aguardando';
  if (index === 2) return 'Falta pouco';
  return '';
};
