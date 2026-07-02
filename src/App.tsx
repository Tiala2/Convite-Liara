import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home } from './pages/Home';
import { ConfirmationStep1 } from './pages/ConfirmationStep1';
import { GiftListStep } from './pages/GiftListStep';
import { FinalConfirmation } from './pages/FinalConfirmation';
import { AdminPanel } from './pages/AdminPanel';
import { markInviteLinkOpened } from './lib/repository';
import type { Guest, GuestDraft } from './types';

type Screen = 'home' | 'confirmation1' | 'giftList' | 'final' | 'admin';

const emptyGuestDraft: GuestDraft = {
  name: '',
  whatsapp: '',
  numberOfPeople: 1,
  poolUsage: '',
};

const GUEST_DRAFT_KEY = 'liara_guest_draft';

const screenHash: Record<Exclude<Screen, 'admin'>, string> = {
  home: '',
  confirmation1: '#presenca',
  giftList: '#presentes',
  final: '#confirmado',
};

const screenFromLocation = (): Screen => {
  if (window.location.pathname === '/admin') return 'admin';
  if (window.location.hash === '#presenca') return 'confirmation1';
  if (window.location.hash === '#presentes') return 'giftList';
  if (window.location.hash === '#confirmado') return 'final';
  return 'home';
};

const loadGuestDraft = (): GuestDraft => {
  const stored = localStorage.getItem(GUEST_DRAFT_KEY);
  if (!stored) return emptyGuestDraft;

  try {
    return { ...emptyGuestDraft, ...JSON.parse(stored) };
  } catch {
    return emptyGuestDraft;
  }
};

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(screenFromLocation);
  const [guestDraft, setGuestDraft] = useState<GuestDraft>(loadGuestDraft);
  const [confirmedGuest, setConfirmedGuest] = useState<Guest | null>(null);
  const [inviteToken] = useState(() => window.location.pathname.match(/^\/c\/([a-z0-9-]+)$/i)?.[1] || '');

  useEffect(() => {
    if (!inviteToken) return;

    void markInviteLinkOpened(inviteToken);
  }, [inviteToken]);

  useEffect(() => {
    const hasDraftData =
      guestDraft.name.trim() ||
      guestDraft.whatsapp.trim() ||
      guestDraft.numberOfPeople !== emptyGuestDraft.numberOfPeople ||
      guestDraft.poolUsage;

    if (hasDraftData) {
      localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(guestDraft));
      return;
    }

    localStorage.removeItem(GUEST_DRAFT_KEY);
  }, [guestDraft]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentScreen]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentScreen(screenFromLocation());
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const goToScreen = (screen: Screen) => {
    const nextPath = screen === 'admin' ? '/admin' : `/${screenHash[screen]}`;
    const currentPath = `${window.location.pathname}${window.location.hash}`;
    if (currentPath !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setCurrentScreen(screen);
  };

  const handleGoToGiftList = (data: GuestDraft) => {
    setGuestDraft(data);
    goToScreen('giftList');
  };

  const handleConfirmed = (guest: Guest) => {
    setConfirmedGuest(guest);
    setGuestDraft(emptyGuestDraft);
    localStorage.removeItem(GUEST_DRAFT_KEY);
    goToScreen('final');
  };

  const handleBackToHome = () => {
    goToScreen('home');
    setGuestDraft(emptyGuestDraft);
    setConfirmedGuest(null);
    localStorage.removeItem(GUEST_DRAFT_KEY);
  };

  useEffect(() => {
    if (currentScreen === 'giftList' && !guestDraft.poolUsage) {
      goToScreen('confirmation1');
    }

    if (currentScreen === 'final' && !confirmedGuest) {
      goToScreen('home');
    }
  }, [currentScreen, guestDraft.poolUsage, confirmedGuest]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-babyPink via-softBeige to-white">
      <AnimatePresence mode="wait">
        {currentScreen === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Home onConfirmPresence={() => goToScreen('confirmation1')} />
          </motion.div>
        )}

        {currentScreen === 'confirmation1' && (
          <motion.div key="presence" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
            <ConfirmationStep1 initialData={guestDraft} onNext={handleGoToGiftList} onBack={() => goToScreen('home')} />
          </motion.div>
        )}

        {currentScreen === 'giftList' && guestDraft.poolUsage && (
          <motion.div key="gifts" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
            <GiftListStep
              guestData={{ ...guestDraft, poolUsage: guestDraft.poolUsage }}
              inviteToken={inviteToken}
              onConfirmed={handleConfirmed}
              onBack={() => goToScreen('confirmation1')}
            />
          </motion.div>
        )}

        {currentScreen === 'final' && confirmedGuest && (
          <motion.div key="final" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <FinalConfirmation guest={confirmedGuest} onBackToHome={handleBackToHome} />
          </motion.div>
        )}

        {currentScreen === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AdminPanel onBack={() => goToScreen('home')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
