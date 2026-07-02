import type { ReactNode } from 'react';
import { LogoHeader } from './LogoHeader';

interface VisualFrameProps {
  children: ReactNode;
  variant?: 'home' | 'step';
}

export const VisualFrame = ({ children, variant = 'step' }: VisualFrameProps) => (
  <main
    className={`relative min-h-[100svh] overflow-hidden bg-[#FFF6F4] px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-5 sm:pt-6 ${
      variant === 'home' ? 'pb-[calc(1.5rem+env(safe-area-inset-bottom))]' : 'pb-[calc(6rem+env(safe-area-inset-bottom))]'
    }`}
  >
    <div className="relative z-10 mx-auto max-w-2xl">{children}</div>
  </main>
);

export const StepHeader = () => (
  <header className="relative mb-3 pt-1 sm:mb-4 sm:pt-2">
    <div className="mx-auto max-w-[252px]">
      <LogoHeader size="medium" showTitle={false} />
    </div>
  </header>
);
