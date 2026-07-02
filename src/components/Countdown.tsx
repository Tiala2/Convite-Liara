import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CountdownProps {
  targetDate: Date;
}

export const Countdown = ({ targetDate }: CountdownProps) => {
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const calculateDays = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      setDaysLeft(Math.max(days, 0));
    };

    calculateDays();
    const interval = setInterval(calculateDays, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <CounterShell>
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B5A5A]">Faltam apenas</span>
      <span className="mx-1 text-4xl font-bold leading-none text-[#E89CB8]">{daysLeft}</span>
      <span className="max-w-[16rem] text-xs font-bold uppercase leading-relaxed tracking-[0.08em] text-[#8B5A5A]">
        dias para o Chá de Bebê da Liara! Estamos ansiosos para viver esse momento com você.
      </span>
    </CounterShell>
  );
};

interface CounterShellProps {
  children: ReactNode;
  delay?: number;
}

const CounterShell = ({ children, delay = 0 }: CounterShellProps) => (
  <motion.div
    initial={{ scale: 0.98, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay }}
    className="premium-card flex min-h-[86px] flex-wrap items-center justify-center gap-2 rounded-[1.55rem] border-2 border-[#F8D7E4] bg-white/90 px-4 py-4 text-center"
  >
    {children}
  </motion.div>
);
