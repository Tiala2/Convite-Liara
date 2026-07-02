import { motion } from 'framer-motion';

interface LogoHeaderProps {
  size?: 'small' | 'medium' | 'large';
  showTitle?: boolean;
}

export const LogoHeader = ({ size = 'medium', showTitle = true }: LogoHeaderProps) => {
  const sizeMap = {
    small: 'h-20 w-20',
    medium: 'h-32 w-full max-w-[18rem] sm:h-40',
    large: 'h-72 w-[calc(100vw-1.5rem)] max-w-[42rem] sm:h-[25rem] sm:w-full',
  };
  const src = size === 'large' ? '/fotos/logo-home.jpg' : '/fotos/logo.png';

  return (
    <motion.header
      initial={{ scale: 0.96, opacity: 0, y: 6 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', duration: 0.85, bounce: 0.14 }}
      className={`mx-auto text-center ${showTitle ? 'mb-7' : 'mb-4'}`}
    >
      <div className={`${sizeMap[size]} logo-integrated relative mx-auto`}>
        <img
          src={src}
          alt="Logo Chá de Bebê da Liara"
          width="1254"
          height="1254"
          decoding="async"
          fetchPriority={size === 'large' ? 'high' : 'auto'}
          className="h-full w-full object-contain mix-blend-multiply"
        />
      </div>

      {showTitle && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A0826D]">Chá de Bebê da</p>
          <p className="font-serif text-4xl font-bold italic text-[#E89CB8]">Liara</p>
        </motion.div>
      )}
    </motion.header>
  );
};
