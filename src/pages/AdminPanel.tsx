import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Gift,
  Link,
  Lock,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Waves,
} from 'lucide-react';
import type { AuditLog, EventInfo, Gift as GiftItem, GiftFormData, Guest, GuestFormData, InviteLink, PixStatus } from '../types';
import { eventInfo as defaultEventInfo } from '../data/gifts';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import {
  clearAllData,
  cancelGuestConfirmation,
  createInviteLink,
  createGift,
  deleteInviteLink,
  exportGiftsToExcel,
  exportGuestsToExcel,
  exportAuditLogsToExcel,
  exportAttendanceList,
  exportFullBackup,
  exportPendingPixToExcel,
  exportInviteLinksToExcel,
  exportPixToExcel,
  exportPoolToExcel,
  exportPrintableReport,
  getAuditLogs,
  getEventInfo,
  getGifts,
  getGuests,
  getInviteLinks,
  logBackupExport,
  releaseGift,
  resetGifts,
  setGiftDisabled,
  updateEventInfo,
  updateGift,
  updateGuest,
  updateGuestPixStatus,
} from '../lib/repository';

interface AdminPanelProps {
  onBack: () => void;
}

type AdminTab = 'dashboard' | 'convites' | 'convidados' | 'presentes' | 'pix' | 'configuracoes' | 'seguranca' | 'exportacoes';
type PoolFilter = 'all' | 'sim' | 'nao' | 'talvez';
type MethodFilter = 'all' | 'pix' | 'levar';
const ADMIN_LOGIN_GUARD_KEY = 'liara_admin_login_guard';
const ADMIN_INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

const loadAdminLoginGuard = () => {
  try {
    const stored = localStorage.getItem(ADMIN_LOGIN_GUARD_KEY);
    if (!stored) return { attempts: 0, lockedUntil: null as number | null };
    const parsed = JSON.parse(stored) as { attempts?: number; lockedUntil?: number | null };
    return {
      attempts: parsed.attempts || 0,
      lockedUntil: parsed.lockedUntil && parsed.lockedUntil > Date.now() ? parsed.lockedUntil : null,
    };
  } catch {
    return { attempts: 0, lockedUntil: null as number | null };
  }
};

export const AdminPanel = ({ onBack }: AdminPanelProps) => {
  const initialLoginGuard = loadAdminLoginGuard();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(Boolean(isSupabaseConfigured));
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(initialLoginGuard.attempts);
  const [lockedUntil, setLockedUntil] = useState<number | null>(initialLoginGuard.lockedUntil);
  const [lockTick, setLockTick] = useState(0);
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [eventInfo, setEventInfo] = useState<EventInfo>(defaultEventInfo);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPool, setFilterPool] = useState<PoolFilter>('all');
  const [filterMethod, setFilterMethod] = useState<MethodFilter>('all');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [lastActivityAt, setLastActivityAt] = useState(Date.now());
  const [activityTick, setActivityTick] = useState(0);
  const [backupDownloadedAt, setBackupDownloadedAt] = useState('');
  const isRefreshingRef = useRef(false);

  const lockRemainingSeconds = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - Date.now() + lockTick * 0) / 1000)) : 0;
  const isLoginLocked = lockRemainingSeconds > 0;
  const inactivityRemainingMs = Math.max(0, ADMIN_INACTIVITY_LIMIT_MS - (Date.now() - lastActivityAt + activityTick * 0));
  const inactivityRemainingMinutes = Math.ceil(inactivityRemainingMs / 60000);
  const shouldWarnInactivity = isAuthenticated && inactivityRemainingMs <= 5 * 60 * 1000;

  const registerLoginFailure = (message: string) => {
    const nextAttempts = failedLoginAttempts + 1;
    setFailedLoginAttempts(nextAttempts);

    if (nextAttempts >= 5) {
      const nextLockedUntil = Date.now() + 60_000;
      setLockedUntil(nextLockedUntil);
      setFailedLoginAttempts(0);
      localStorage.setItem(ADMIN_LOGIN_GUARD_KEY, JSON.stringify({ attempts: 0, lockedUntil: nextLockedUntil }));
      setError('Muitas tentativas incorretas. Aguarde 1 minuto e tente novamente.');
      return;
    }

    localStorage.setItem(ADMIN_LOGIN_GUARD_KEY, JSON.stringify({ attempts: nextAttempts, lockedUntil }));
    setError(`${message} Tentativa ${nextAttempts}/5.`);
  };

  const clearLoginGuard = () => {
    setFailedLoginAttempts(0);
    setLockedUntil(null);
    localStorage.removeItem(ADMIN_LOGIN_GUARD_KEY);
  };

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 3500);
  };

  const runAdminAction = async (action: () => Promise<void>, successMessage: string) => {
    try {
      const hasAdminAccess = await validateAdminAccess();
      if (!hasAdminAccess) {
        await handleLogout('Sua sessao administrativa expirou. Entre novamente.');
        return;
      }

      await action();
      await refreshData({ silent: true });
      showNotice('success', successMessage);
    } catch (actionError) {
      showNotice('error', actionError instanceof Error ? actionError.message : 'Nao foi possivel concluir a acao.');
    }
  };

  const refreshData = async (options: { silent?: boolean } = {}) => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);

    try {
      const hasAdminAccess = await validateAdminAccess();
      if (!hasAdminAccess) {
        await handleLogout('Sua sessao administrativa expirou. Entre novamente.');
        return;
      }

      const [nextGuests, nextGifts, nextEventInfo, nextAuditLogs, nextInviteLinks] = await Promise.all([
        getGuests(),
        getGifts(),
        getEventInfo(),
        getAuditLogs(),
        getInviteLinks(),
      ]);
      setGuests(nextGuests);
      setGifts(nextGifts);
      setEventInfo(nextEventInfo);
      setAuditLogs(nextAuditLogs);
      setInviteLinks(nextInviteLinks);
      setLastUpdatedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      if (!options.silent) showNotice('success', 'Dados atualizados.');
    } catch (refreshError) {
      showNotice('error', refreshError instanceof Error ? refreshError.message : 'Nao foi possivel atualizar os dados.');
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  };

  const validateAdminAccess = async () => {
    if (!isSupabaseConfigured) return false;

    const supabase = await getSupabase();
    const { data, error: adminError } = await supabase.rpc('current_admin_id');
    return !adminError && Boolean(data);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsCheckingAccess(false);
      return;
    }

    let isMounted = true;
    const checkExistingSession = async () => {
      try {
        const supabase = await getSupabase();
        const { data } = await supabase.auth.getSession();

        if (!data.session) {
          if (isMounted) setIsAuthenticated(false);
          return;
        }

        const hasAdminAccess = await validateAdminAccess();
        if (!isMounted) return;

        setIsAuthenticated(hasAdminAccess);
        if (!hasAdminAccess) {
          await supabase.auth.signOut();
          setError('Seu usuario nao tem permissao administrativa.');
        }
      } finally {
        if (isMounted) setIsCheckingAccess(false);
      }
    };

    void checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let unsubscribe: (() => void) | undefined;
    const listenAuthChanges = async () => {
      const supabase = await getSupabase();
      const subscription = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) return;
        setIsAuthenticated(false);
        setGuests([]);
        setGifts([]);
        setAuditLogs([]);
        setInviteLinks([]);
        setBackupDownloadedAt('');
      });
      unsubscribe = () => subscription.data.subscription.unsubscribe();
    };

    void listenAuthChanges();

    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!lockedUntil) return;

    const interval = window.setInterval(() => {
      setLockTick((current) => current + 1);
      if (Date.now() >= lockedUntil) {
        clearLoginGuard();
        setError('');
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lockedUntil]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshData({ silent: true });
    const interval = setInterval(() => void refreshData({ silent: true }), 7000);
    return () => clearInterval(interval);
  // Polling starts only when auth changes; refreshData always reads the latest repository state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const registerActivity = () => setLastActivityAt(Date.now());
    const events: Array<keyof WindowEventMap> = ['click', 'keydown', 'touchstart', 'mousemove'];

    events.forEach((eventName) => window.addEventListener(eventName, registerActivity, { passive: true }));

    const interval = window.setInterval(() => {
      setActivityTick((current) => current + 1);
      if (Date.now() - lastActivityAt >= ADMIN_INACTIVITY_LIMIT_MS) {
        void handleLogout('Sua sessao foi encerrada por inatividade.');
      }
    }, 30_000);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, registerActivity));
      window.clearInterval(interval);
    };
  }, [isAuthenticated, lastActivityAt]);

  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        guest.name.toLowerCase().includes(search) ||
        guest.whatsapp.includes(searchTerm) ||
        guest.giftName.toLowerCase().includes(search);
      const matchesPool = filterPool === 'all' || guest.poolUsage === filterPool;
      const matchesMethod = filterMethod === 'all' || guest.giftMethod === filterMethod;
      return matchesSearch && matchesPool && matchesMethod;
    });
  }, [filterMethod, filterPool, guests, searchTerm]);

  const pixGuests = guests.filter((guest) => guest.giftMethod === 'pix');
  const stats = {
    totalGuests: guests.length,
    totalPeople: guests.reduce((acc, guest) => acc + guest.numberOfPeople, 0),
    poolYes: guests.filter((guest) => guest.poolUsage === 'sim').length,
    poolMaybe: guests.filter((guest) => guest.poolUsage === 'talvez').length,
    reservedGifts: gifts.filter((gift) => gift.isReserved).length,
    availableGifts: gifts.filter((gift) => !gift.isReserved && !gift.isDisabled).length,
    disabledGifts: gifts.filter((gift) => gift.isDisabled).length,
    totalGifts: gifts.length,
    pixCount: pixGuests.length,
    pixPending: pixGuests.filter((guest) => guest.pixStatus === 'pending_receipt' || guest.pixStatus === 'pending_review').length,
    pixConfirmed: pixGuests.filter((guest) => guest.pixStatus === 'confirmed').length,
    pixEstimated: pixGuests.reduce((acc, guest) => acc + guest.giftPrice, 0),
    pixConfirmedValue: pixGuests.filter((guest) => guest.pixStatus === 'confirmed').reduce((acc, guest) => acc + guest.giftPrice, 0),
  };

  const handleLogin = async () => {
    if (isLoggingIn || isLoginLocked) return;
    setIsLoggingIn(true);
    setError('');

    if (isSupabaseConfigured) {
      const supabase = await getSupabase();
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        registerLoginFailure('E-mail ou senha incorretos.');
        setIsLoggingIn(false);
        return;
      }

      const hasAdminAccess = await validateAdminAccess();
      if (!hasAdminAccess) {
        await supabase.auth.signOut();
        registerLoginFailure('Este usuario nao tem permissao administrativa.');
        setIsLoggingIn(false);
        return;
      }

      setIsAuthenticated(true);
      setError('');
      clearLoginGuard();
      setIsLoggingIn(false);
      return;
    }

    registerLoginFailure(isSupabaseConfigured ? 'Senha incorreta.' : 'Supabase nao configurado.');
    setIsLoggingIn(false);
  };

  const handleLogout = async (message?: string) => {
    if (isSupabaseConfigured) {
      const supabase = await getSupabase();
      await supabase.auth.signOut();
    }

    setIsAuthenticated(false);
    setPassword('');
    setEmail('');
    setTab('dashboard');
    setGuests([]);
    setGifts([]);
    setAuditLogs([]);
    setInviteLinks([]);
    setBackupDownloadedAt('');
    if (message) setError(message);
  };

  const handleReleaseGift = async (guest: Guest) => {
    if (!window.confirm(`Liberar o presente de ${guest.name}? A confirmacao desse convidado sera removida.`)) return;
    await runAdminAction(() => releaseGift(guest.giftId), 'Presente liberado e confirmacao removida.');
  };

  const handlePixStatus = async (guestId: string, status: PixStatus) => {
    await runAdminAction(() => updateGuestPixStatus(guestId, status), 'Status do Pix atualizado.');
  };

  const handleSaveGuest = async (guestData: GuestFormData) => {
    await runAdminAction(() => updateGuest(guestData), 'Convidado atualizado.');
  };

  const handleCreateInvite = async (payload: { label: string; whatsapp?: string }) => {
    await runAdminAction(async () => {
      await createInviteLink(payload);
    }, 'Convite individual criado.');
  };

  const handleDeleteInvite = async (invite: InviteLink) => {
    if (!window.confirm(`Remover o convite de ${invite.label}? O link deixara de ser acompanhado no painel.`)) return;
    await runAdminAction(() => deleteInviteLink(invite.id), 'Convite individual removido.');
  };

  const handleCancelGuest = async (guest: Guest) => {
    if (!window.confirm(`Cancelar a confirmacao de ${guest.name}? O presente escolhido voltara a ficar disponivel.`)) return;
    await runAdminAction(() => cancelGuestConfirmation(guest.id), 'Confirmacao cancelada e presente liberado.');
  };

  const handleResetGifts = async () => {
    if (!backupDownloadedAt) {
      showNotice('error', 'Baixe o backup completo antes de limpar confirmacoes.');
      return;
    }

    const confirmation = window.prompt('Isso apaga as confirmacoes e libera os presentes. Digite LIMPAR para continuar.');
    if (confirmation !== 'LIMPAR') return;
    await runAdminAction(() => resetGifts(), 'Confirmacoes apagadas e presentes liberados.');
  };

  const handleClearAll = async () => {
    if (!backupDownloadedAt) {
      showNotice('error', 'Baixe o backup completo antes de limpar dados.');
      return;
    }

    const confirmation = window.prompt('Acao permanente: limpar convidados e liberar presentes. Digite APAGAR para continuar.');
    if (confirmation !== 'APAGAR') return;
    await runAdminAction(() => clearAllData(), 'Dados de confirmacao apagados.');
  };

  const handleFullBackup = async () => {
    exportFullBackup({ eventInfo, guests, gifts, auditLogs, inviteLinks });
    try {
      await logBackupExport({ guestsCount: guests.length, giftsCount: gifts.length, auditLogsCount: auditLogs.length });
      await refreshData({ silent: true });
    } catch (backupLogError) {
      showNotice('error', backupLogError instanceof Error ? backupLogError.message : 'Backup baixado, mas nao foi possivel registrar o log.');
    } finally {
      setBackupDownloadedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      showNotice('success', 'Backup completo baixado.');
    }
  };

  const handleSaveGift = async (giftData: GiftFormData) => {
    await runAdminAction(async () => {
      if (giftData.id) {
        await updateGift(giftData);
      } else {
        await createGift(giftData);
      }
    }, 'Presente salvo.');
  };

  const handleToggleGiftDisabled = async (gift: GiftItem) => {
    await runAdminAction(
      () => setGiftDisabled(gift.id, !gift.isDisabled),
      gift.isDisabled ? 'Presente ativado.' : 'Presente desativado.',
    );
  };

  if (isCheckingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FDF5F0] via-white to-[#F8D7E4] p-5">
        <div className="rounded-[2rem] bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#FCE8F0] text-[#E89CB8]">
            <Lock size={26} />
          </div>
          <p className="text-sm font-bold text-[#8B5A5A]">Verificando acesso administrativo...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FDF5F0] via-white to-[#F8D7E4] p-5">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#FCE8F0] text-[#E89CB8]">
              <Lock size={30} />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#E89CB8]">Painel Administrativo</h1>
            <p className="mt-1 text-sm text-[#8B5A5A]">
              {isSupabaseConfigured ? 'Entre com o usuario Supabase' : 'Configure o Supabase para acessar'}
            </p>
          </div>

          {isSupabaseConfigured && (
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="E-mail"
              className="mb-3 h-13 w-full rounded-[1.1rem] border-2 border-[#F4C7D7] px-4 py-3 text-sm outline-none focus:border-[#E89CB8]"
            />
          )}

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void handleLogin()}
            placeholder="Senha"
            className="h-13 w-full rounded-[1.1rem] border-2 border-[#F4C7D7] px-4 py-3 text-sm outline-none focus:border-[#E89CB8]"
          />
          {error && <p className="mt-2 text-center text-sm font-semibold text-red-500">{error}</p>}
          {isLoginLocked && (
            <p className="mt-2 text-center text-xs font-bold text-[#8B5A5A]">
              Tente novamente em {lockRemainingSeconds}s.
            </p>
          )}

          <button disabled={isLoggingIn || isLoginLocked} onClick={() => void handleLogin()} className="mt-4 min-h-[52px] w-full rounded-[1.2rem] bg-[#E89CB8] text-sm font-bold text-white disabled:opacity-60">
            {isLoginLocked ? 'Aguarde para tentar novamente' : isLoggingIn ? 'Entrando...' : 'Entrar'}
          </button>
          <button onClick={onBack} className="mt-2 min-h-[48px] w-full rounded-[1.1rem] border-2 border-[#F4C7D7] text-sm font-bold text-[#8B5A5A]">
            Voltar
          </button>
        </motion.section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#FDF5F0] via-white to-[#F8D7E4] pb-10">
      <header className="rounded-b-[2rem] bg-[#E89CB8] px-5 pb-8 pt-6 text-white shadow-xl">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
          <div>
            <div className="mb-4 flex gap-2">
              <button onClick={onBack} className="rounded-full bg-white/20 p-3">
                <ArrowLeft size={20} />
              </button>
              <button
                disabled={isRefreshing}
                onClick={() => void refreshData()}
                className="flex items-center gap-2 rounded-full bg-white/20 px-4 text-xs font-bold disabled:opacity-60"
              >
                <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                Atualizar
              </button>
              <button onClick={() => void handleLogout()} className="rounded-full bg-white/20 px-4 text-xs font-bold">
                Sair
              </button>
            </div>
            <h1 className="font-serif text-3xl font-bold">Painel da Liara</h1>
            <p className="mt-1 text-sm text-white/90">
              Convidados, presentes, piscina, Pix e exportacoes.
              {lastUpdatedAt && <span className="block text-xs text-white/75">Atualizado as {lastUpdatedAt}</span>}
            </p>
          </div>
          <div className="hidden rounded-2xl bg-white/18 p-4 text-right sm:block">
            <p className="text-xs uppercase tracking-[0.16em] text-white/80">Presentes</p>
            <p className="text-2xl font-bold">{stats.reservedGifts}/{stats.totalGifts}</p>
            <p className="mt-1 text-xs text-white/80">{isSupabaseConfigured ? 'Supabase ativo' : 'Supabase nao configurado'}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5">
        <nav className="-mt-5 mb-5 flex gap-2 overflow-x-auto rounded-[1.4rem] bg-white p-2 shadow-lg">
          {tabs.map((item) => (
            <button
              key={item.value}
              onClick={() => setTab(item.value)}
              className="min-h-[42px] shrink-0 rounded-[1rem] px-4 text-xs font-bold"
              style={{
                background: tab === item.value ? '#E89CB8' : 'transparent',
                color: tab === item.value ? '#FFFFFF' : '#8B5A5A',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {notice && (
          <div
            className={`mb-4 rounded-[1rem] px-4 py-3 text-sm font-bold ${
              notice.type === 'success' ? 'bg-[#EEF8ED] text-[#4B8B45]' : 'bg-red-50 text-red-600'
            }`}
          >
            {notice.text}
          </div>
        )}

        {shouldWarnInactivity && (
          <div className="mb-4 rounded-[1rem] bg-[#FFF5F0] px-4 py-3 text-sm font-bold text-[#8B5A5A]">
            Sessao sera encerrada por inatividade em aproximadamente {inactivityRemainingMinutes} min.
          </div>
        )}

        {tab === 'dashboard' && <Dashboard stats={stats} eventInfo={eventInfo} recentGuests={guests.slice(0, 5)} />}
        {tab === 'convites' && (
          <InviteLinksView
            invites={inviteLinks}
            eventInfo={eventInfo}
            onCreateInvite={handleCreateInvite}
            onDeleteInvite={handleDeleteInvite}
            onNotice={showNotice}
          />
        )}
        {tab === 'convidados' && (
          <GuestsView
            guests={filteredGuests}
            searchTerm={searchTerm}
            filterPool={filterPool}
            filterMethod={filterMethod}
            onSearch={setSearchTerm}
            onPoolFilter={setFilterPool}
            onMethodFilter={setFilterMethod}
            onReleaseGift={handleReleaseGift}
            onSaveGuest={handleSaveGuest}
            onCancelGuest={handleCancelGuest}
          />
        )}
        {tab === 'presentes' && (
          <GiftsView
            gifts={gifts}
            onReleaseGuestGift={handleReleaseGift}
            guests={guests}
            onResetGifts={handleResetGifts}
            onSaveGift={handleSaveGift}
            onToggleDisabled={handleToggleGiftDisabled}
          />
        )}
        {tab === 'pix' && <PixView guests={pixGuests} onStatus={handlePixStatus} />}
        {tab === 'configuracoes' && <SettingsView eventInfo={eventInfo} onSaved={refreshData} onNotice={showNotice} />}
        {tab === 'seguranca' && <SecurityView logs={auditLogs} />}
        {tab === 'exportacoes' && (
          <ExportsView
            guests={guests}
            gifts={gifts}
            auditLogs={auditLogs}
            inviteLinks={inviteLinks}
            backupDownloadedAt={backupDownloadedAt}
            onFullBackup={() => void handleFullBackup()}
            onClearAll={handleClearAll}
            onResetGifts={handleResetGifts}
          />
        )}
      </div>
    </main>
  );
};

const tabs: Array<{ value: AdminTab; label: string }> = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'convites', label: 'Convites' },
  { value: 'convidados', label: 'Convidados' },
  { value: 'presentes', label: 'Presentes' },
  { value: 'pix', label: 'Pix' },
  { value: 'configuracoes', label: 'Configuracoes' },
  { value: 'seguranca', label: 'Seguranca' },
  { value: 'exportacoes', label: 'Exportacoes' },
];

const Dashboard = ({ stats, eventInfo, recentGuests }: { stats: Record<string, number>; eventInfo: EventInfo; recentGuests: Guest[] }) => (
  <section className="space-y-4">
    <div className="rounded-[1.4rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#E89CB8]">Dados do evento</p>
      <h2 className="mt-1 font-serif text-2xl font-bold text-[#5F4A44]">{eventInfo.eventName}</h2>
      <p className="mt-2 text-sm text-[#8B5A5A]">{eventInfo.date} as {eventInfo.time}h</p>
      <p className="text-sm text-[#8B5A5A]">{eventInfo.addressReference} - {eventInfo.address}</p>
    </div>
    <AttentionPanel stats={stats} recentGuests={recentGuests} />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={<Users size={22} />} label="Convidados confirmados" value={stats.totalGuests} />
      <StatCard icon={<Users size={22} />} label="Total de pessoas" value={stats.totalPeople} />
      <StatCard icon={<Waves size={22} />} label="Vao usar piscina" value={stats.poolYes} />
      <StatCard icon={<Waves size={22} />} label="Talvez usem piscina" value={stats.poolMaybe} />
      <StatCard icon={<Gift size={22} />} label="Presentes reservados" value={stats.reservedGifts} />
      <StatCard icon={<Gift size={22} />} label="Presentes disponiveis" value={stats.availableGifts} />
      <StatCard icon={<Trash2 size={22} />} label="Presentes desativados" value={stats.disabledGifts} />
      <StatCard icon={<MessageCircle size={22} />} label="Pix pendentes" value={stats.pixPending} />
      <StatCard icon={<Check size={22} />} label="Pix confirmados" value={stats.pixConfirmed} />
      <StatCard icon={<MessageCircle size={22} />} label="Valor estimado em Pix" value={`R$ ${stats.pixEstimated}`} />
      <StatCard icon={<Check size={22} />} label="Valor confirmado em Pix" value={`R$ ${stats.pixConfirmedValue}`} />
    </div>
    <div className="rounded-[1.4rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-xl font-bold text-[#E89CB8]">Ultimas confirmacoes</h3>
        <StatusBadge tone="reserved">{recentGuests.length} recentes</StatusBadge>
      </div>
      {recentGuests.length === 0 ? (
        <EmptyState text="Nenhuma confirmacao ainda." />
      ) : (
        <div className="grid gap-2">
          {recentGuests.map((guest) => (
            <div key={guest.id} className="grid gap-2 rounded-[1rem] bg-[#FFF5F0] p-3 text-sm text-[#8B5A5A] sm:grid-cols-[1fr_auto]">
              <div>
                <p className="font-bold text-[#5F4A44]">{guest.name}</p>
                <p className="text-xs">{guest.giftName}</p>
              </div>
              <div className="text-xs font-bold text-[#E89CB8] sm:text-right">
                <p>{guest.numberOfPeople} pessoa(s)</p>
                <p>{guest.giftMethod === 'pix' ? 'Pix' : 'Vai levar'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
);

const InviteLinksView = ({
  invites,
  eventInfo,
  onCreateInvite,
  onDeleteInvite,
  onNotice,
}: {
  invites: InviteLink[];
  eventInfo: EventInfo;
  onCreateInvite: (payload: { label: string; whatsapp?: string }) => Promise<void>;
  onDeleteInvite: (invite: InviteLink) => void;
  onNotice: (type: 'success' | 'error', text: string) => void;
}) => {
  const [label, setLabel] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const origin = window.location.origin;

  const buildLink = (token: string) => `${origin}/c/${token}`;
  const buildMessage = (invite: InviteLink) =>
    `Voce esta convidado(a) para o Cha de Bebe da Liara!\n\nData: ${eventInfo.date} as ${eventInfo.time}h\nLocal: ${eventInfo.addressReference}\n\nConfirme sua presenca e escolha seu presente pelo convite:\n${buildLink(invite.token)}`;

  const copyText = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      onNotice('success', 'Convite copiado.');
    } catch {
      onNotice('error', 'Nao foi possivel copiar automaticamente.');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!label.trim()) {
      onNotice('error', 'Informe uma identificacao para o convite.');
      return;
    }

    setIsCreating(true);
    await onCreateInvite({ label: label.trim(), whatsapp: whatsapp.trim() || undefined });
    setLabel('');
    setWhatsapp('');
    setIsCreating(false);
  };

  return (
    <section className="space-y-4">
      <PanelTitle title="Convites individuais" />
      <form onSubmit={(event) => void handleSubmit(event)} className="rounded-[1.4rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FCE8F0] text-[#E89CB8]">
            <Link size={21} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#5F4A44]">Gerar link por convidado</p>
            <p className="text-xs text-[#8B5A5A]">O nome fica so no admin; o link mostra apenas um codigo.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Identificacao interna, ex: Maria e familia"
            className="min-h-[48px] rounded-[1rem] border-2 border-[#F4C7D7] px-4 text-sm outline-none focus:border-[#E89CB8]"
          />
          <input
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder="WhatsApp opcional"
            className="min-h-[48px] rounded-[1rem] border-2 border-[#F4C7D7] px-4 text-sm outline-none focus:border-[#E89CB8]"
          />
          <button disabled={isCreating} className="flex min-h-[48px] items-center justify-center gap-2 rounded-[1rem] bg-[#E89CB8] px-5 text-sm font-bold text-white disabled:opacity-60">
            <Plus size={17} />
            Criar
          </button>
        </div>
      </form>

      {invites.length === 0 ? (
        <EmptyState text="Nenhum convite individual criado ainda." />
      ) : (
        <div className="grid gap-3">
          {invites.map((invite) => (
            <article key={invite.id} className="rounded-[1.3rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#5F4A44]">{invite.label}</h3>
                  <p className="mt-1 break-all text-xs text-[#8B5A5A]">{buildLink(invite.token)}</p>
                  <p className="mt-1 text-xs text-[#A0826D]">
                    Criado em {invite.createdAt} | Aberturas: {invite.openCount}
                    {invite.lastOpenedAt ? ` | Ultima: ${invite.lastOpenedAt}` : ''}
                  </p>
                </div>
                <StatusBadge tone={invite.openCount > 0 ? 'available' : 'reserved'}>{invite.openCount > 0 ? 'Aberto' : 'Nao aberto'}</StatusBadge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void copyText(buildLink(invite.token))} className="flex items-center gap-2 rounded-full border border-[#E89CB8] px-4 py-2 text-xs font-bold text-[#E89CB8]">
                  <Copy size={14} />
                  Copiar link
                </button>
                <button onClick={() => void copyText(buildMessage(invite))} className="flex items-center gap-2 rounded-full bg-[#FCE8F0] px-4 py-2 text-xs font-bold text-[#8B5A5A]">
                  <MessageCircle size={14} />
                  Copiar mensagem
                </button>
                {invite.whatsapp && <WhatsAppButton whatsapp={invite.whatsapp} />}
                <button onClick={() => onDeleteInvite(invite)} className="flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-500">
                  <Trash2 size={14} />
                  Remover
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

const AttentionPanel = ({ stats, recentGuests }: { stats: Record<string, number>; recentGuests: Guest[] }) => {
  const alerts = [
    ...(stats.pixPending > 0
      ? [{ tone: 'reserved' as const, title: `${stats.pixPending} Pix pendente(s)`, text: 'Confira a aba Pix e marque como confirmado ou nao localizado.' }]
      : []),
    ...(stats.availableGifts <= 10
      ? [{ tone: 'danger' as const, title: 'Poucos presentes disponiveis', text: `Restam ${stats.availableGifts} presentes ativos para escolha.` }]
      : []),
    ...(recentGuests.length > 0
      ? [{ tone: 'available' as const, title: 'Confirmacoes recentes', text: `Ultima confirmacao: ${recentGuests[0].name}.` }]
      : []),
  ];

  return (
    <div className="rounded-[1.4rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-serif text-xl font-bold text-[#E89CB8]">Atencao</h3>
        <StatusBadge tone={alerts.length > 0 ? 'reserved' : 'available'}>{alerts.length > 0 ? `${alerts.length} aviso(s)` : 'Tudo certo'}</StatusBadge>
      </div>
      {alerts.length === 0 ? (
        <p className="rounded-[1rem] bg-[#EEF8ED] p-3 text-sm font-semibold text-[#4B8B45]">
          Nenhuma pendencia importante no momento.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {alerts.map((alert) => (
            <article key={alert.title} className="rounded-[1rem] border border-[#F4C7D7] bg-[#FFF5F0] p-3">
              <StatusBadge tone={alert.tone}>{alert.title}</StatusBadge>
              <p className="mt-2 text-xs leading-relaxed text-[#8B5A5A]">{alert.text}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

interface GuestsViewProps {
  guests: Guest[];
  searchTerm: string;
  filterPool: PoolFilter;
  filterMethod: MethodFilter;
  onSearch: (value: string) => void;
  onPoolFilter: (value: PoolFilter) => void;
  onMethodFilter: (value: MethodFilter) => void;
  onReleaseGift: (guest: Guest) => void;
  onSaveGuest: (guest: GuestFormData) => void;
  onCancelGuest: (guest: Guest) => void;
}

const GuestsView = ({
  guests,
  searchTerm,
  filterPool,
  filterMethod,
  onSearch,
  onPoolFilter,
  onMethodFilter,
  onReleaseGift,
  onSaveGuest,
  onCancelGuest,
}: GuestsViewProps) => {
  const [editingGuest, setEditingGuest] = useState<GuestFormData | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'people' | 'gift'>('recent');

  const openEdit = (guest: Guest) => {
    setEditingGuest({
      id: guest.id,
      name: guest.name,
      whatsapp: guest.whatsapp,
      numberOfPeople: guest.numberOfPeople,
      poolUsage: guest.poolUsage,
      giftMethod: guest.giftMethod,
      pixStatus: guest.pixStatus,
    });
  };

  const handleSave = async (guest: GuestFormData) => {
    await onSaveGuest(guest);
    setEditingGuest(null);
  };

  const sortedGuests = [...guests].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'pt-BR');
    if (sortBy === 'people') return b.numberOfPeople - a.numberOfPeople;
    if (sortBy === 'gift') return a.giftName.localeCompare(b.giftName, 'pt-BR');
    return 0;
  });

  return (
    <section className="space-y-4">
      <Filters
        searchTerm={searchTerm}
        filterPool={filterPool}
        filterMethod={filterMethod}
        onSearch={onSearch}
        onPoolFilter={onPoolFilter}
        onMethodFilter={onMethodFilter}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Users size={22} />} label="Pessoas no filtro" value={guests.reduce((acc, guest) => acc + guest.numberOfPeople, 0)} />
        <StatCard icon={<Waves size={22} />} label="Piscina sim/talvez" value={guests.filter((guest) => guest.poolUsage === 'sim' || guest.poolUsage === 'talvez').length} />
        <StatCard icon={<MessageCircle size={22} />} label="Presentearam por Pix" value={guests.filter((guest) => guest.giftMethod === 'pix').length} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelTitle title={`Convidados (${guests.length})`} />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as 'recent' | 'name' | 'people' | 'gift')}
          className="h-11 rounded-full border-2 border-[#F4C7D7] bg-white px-4 text-sm font-bold text-[#8B5A5A] outline-none focus:border-[#E89CB8]"
        >
          <option value="recent">Mais recentes</option>
          <option value="name">Nome A-Z</option>
          <option value="people">Mais pessoas</option>
          <option value="gift">Presente A-Z</option>
        </select>
      </div>
      {editingGuest && <GuestEditor guest={editingGuest} onCancel={() => setEditingGuest(null)} onSave={handleSave} />}
      <div className="grid gap-3">
        {sortedGuests.length === 0 ? (
          <EmptyState text="Nenhum convidado encontrado." />
        ) : (
          sortedGuests.map((guest) => (
            <GuestCard
              key={guest.id}
              guest={guest}
              onEdit={openEdit}
              onReleaseGift={onReleaseGift}
              onCancelGuest={onCancelGuest}
            />
          ))
        )}
      </div>
    </section>
  );
};

const GiftsView = ({
  gifts,
  guests,
  onReleaseGuestGift,
  onResetGifts,
  onSaveGift,
  onToggleDisabled,
}: {
  gifts: GiftItem[];
  guests: Guest[];
  onReleaseGuestGift: (guest: Guest) => void;
  onResetGifts: () => void;
  onSaveGift: (giftData: GiftFormData) => void;
  onToggleDisabled: (gift: GiftItem) => void;
}) => {
  const [editingGift, setEditingGift] = useState<GiftFormData | null>(null);
  const [giftSearch, setGiftSearch] = useState('');
  const [giftCategory, setGiftCategory] = useState<'all' | GiftItem['category']>('all');
  const [giftStatus, setGiftStatus] = useState<'all' | 'available' | 'reserved' | 'disabled'>('all');

  const openCreate = () => setEditingGift({ name: '', category: 'P', price: 0 });
  const openEdit = (gift: GiftItem) => setEditingGift({ id: gift.id, name: gift.name, category: gift.category, price: gift.price });

  const handleSave = async (giftData: GiftFormData) => {
    await onSaveGift(giftData);
    setEditingGift(null);
  };

  const filteredGifts = gifts.filter((gift) => {
    const guest = guests.find((item) => item.giftId === gift.id);
    const search = giftSearch.toLowerCase();
    const giftCurrentStatus = gift.isDisabled ? 'disabled' : gift.isReserved ? 'reserved' : 'available';
    const matchesSearch =
      gift.name.toLowerCase().includes(search) ||
      gift.category.toLowerCase().includes(search) ||
      guest?.name.toLowerCase().includes(search);
    const matchesCategory = giftCategory === 'all' || gift.category === giftCategory;
    const matchesStatus = giftStatus === 'all' || giftCurrentStatus === giftStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelTitle title={`Presentes (${filteredGifts.length}/${gifts.length})`} />
        <div className="flex flex-wrap gap-2">
          <button onClick={openCreate} className="flex min-h-[42px] items-center gap-2 rounded-full bg-[#E89CB8] px-4 text-xs font-bold text-white">
            Criar presente
          </button>
          <button onClick={onResetGifts} className="flex min-h-[42px] items-center gap-2 rounded-full bg-[#8B5A5A] px-4 text-xs font-bold text-white">
            <RefreshCw size={16} />
            Limpar confirmacoes
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-[1.4rem] border-2 border-[#F4C7D7] bg-white p-3 shadow-sm md:grid-cols-[1fr_150px_170px]">
        <label className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0826D]" size={17} />
          <input
            value={giftSearch}
            onChange={(event) => setGiftSearch(event.target.value)}
            placeholder="Buscar presente ou convidado"
            className="h-11 w-full rounded-full border-2 border-[#F4C7D7] bg-white pl-11 pr-4 text-sm text-[#5F4A44] outline-none focus:border-[#E89CB8]"
          />
        </label>
        <select
          value={giftCategory}
          onChange={(event) => setGiftCategory(event.target.value as 'all' | GiftItem['category'])}
          className="h-11 rounded-full border-2 border-[#F4C7D7] bg-white px-4 text-sm font-bold text-[#8B5A5A] outline-none focus:border-[#E89CB8]"
        >
          <option value="all">Todas fraldas</option>
          <option value="P">Fralda P</option>
          <option value="M">Fralda M</option>
          <option value="G">Fralda G</option>
        </select>
        <select
          value={giftStatus}
          onChange={(event) => setGiftStatus(event.target.value as 'all' | 'available' | 'reserved' | 'disabled')}
          className="h-11 rounded-full border-2 border-[#F4C7D7] bg-white px-4 text-sm font-bold text-[#8B5A5A] outline-none focus:border-[#E89CB8]"
        >
          <option value="all">Todos status</option>
          <option value="available">Disponiveis</option>
          <option value="reserved">Reservados</option>
          <option value="disabled">Desativados</option>
        </select>
      </div>

      {editingGift && <GiftEditor gift={editingGift} onCancel={() => setEditingGift(null)} onSave={handleSave} />}

      <div className="grid gap-3 md:grid-cols-2">
        {filteredGifts.length === 0 ? (
          <EmptyState text="Nenhum presente encontrado com estes filtros." />
        ) : filteredGifts.map((gift) => {
          const guest = guests.find((item) => item.giftId === gift.id);
          return (
            <article key={gift.id} className="rounded-[1.3rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#E89CB8]">Fralda {gift.category}</p>
                  <h3 className="text-sm font-bold text-[#5F4A44]">{gift.name}</h3>
                  <p className="mt-1 text-sm font-bold text-[#E89CB8]">R$ {gift.price}</p>
                  {guest && <p className="mt-2 text-xs text-[#8B5A5A]">Reservado por: {guest.name}</p>}
                </div>
                <StatusBadge tone={gift.isDisabled ? 'danger' : gift.isReserved ? 'reserved' : 'available'}>
                  {gift.isDisabled ? 'Desativado' : gift.isReserved ? 'Reservado' : 'Disponivel'}
                </StatusBadge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => openEdit(gift)} className="min-h-[38px] rounded-full border border-[#E89CB8] px-4 text-xs font-bold text-[#E89CB8]">
                  Editar
                </button>
                {!gift.isReserved && (
                  <button onClick={() => onToggleDisabled(gift)} className="min-h-[38px] rounded-full border border-[#8B5A5A] px-4 text-xs font-bold text-[#8B5A5A]">
                    {gift.isDisabled ? 'Ativar' : 'Desativar'}
                  </button>
                )}
                {guest && (
                  <button onClick={() => onReleaseGuestGift(guest)} className="min-h-[38px] rounded-full border border-[#E89CB8] px-4 text-xs font-bold text-[#E89CB8]">
                    Liberar presente
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

const PixView = ({ guests, onStatus }: { guests: Guest[]; onStatus: (guestId: string, status: PixStatus) => void }) => {
  const pending = guests.filter((guest) => guest.pixStatus === 'pending_receipt' || guest.pixStatus === 'pending_review');
  const confirmed = guests.filter((guest) => guest.pixStatus === 'confirmed');
  const rejected = guests.filter((guest) => guest.pixStatus === 'rejected');

  return (
    <section className="space-y-4">
      <PanelTitle title={`Contribuicoes Pix (${guests.length})`} />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<MessageCircle size={22} />} label="Pendentes" value={pending.length} />
        <StatCard icon={<Check size={22} />} label="Confirmados" value={confirmed.length} />
        <StatCard icon={<Trash2 size={22} />} label="Nao localizados" value={rejected.length} />
      </div>
      {guests.length === 0 ? (
        <EmptyState text="Nenhuma contribuicao via Pix ainda." />
      ) : (
        <div className="space-y-5">
          <PixGroup title="Pendentes" guests={pending} onStatus={onStatus} />
          <PixGroup title="Confirmados" guests={confirmed} onStatus={onStatus} />
          <PixGroup title="Nao localizados" guests={rejected} onStatus={onStatus} />
        </div>
      )}
    </section>
  );
};

const PixGroup = ({ title, guests, onStatus }: { title: string; guests: Guest[]; onStatus: (guestId: string, status: PixStatus) => void }) => (
  <section className="space-y-3">
    <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#8B5A5A]">{title} ({guests.length})</h3>
    {guests.length === 0 ? (
      <div className="rounded-[1.1rem] border-2 border-dashed border-[#F4C7D7] bg-white/70 p-4 text-sm font-semibold text-[#8B5A5A]">
        Nenhum Pix nesta categoria.
      </div>
    ) : (
      guests.map((guest) => <PixCard key={guest.id} guest={guest} onStatus={onStatus} />)
    )}
  </section>
);

const PixCard = ({ guest, onStatus }: { guest: Guest; onStatus: (guestId: string, status: PixStatus) => void }) => (
  <article className="rounded-[1.3rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm">
    <div className="flex flex-wrap justify-between gap-3">
      <div>
        <h3 className="font-bold text-[#5F4A44]">{guest.name}</h3>
        <p className="text-sm text-[#8B5A5A]">{guest.giftName}</p>
        <p className="text-sm font-bold text-[#E89CB8]">R$ {guest.giftPrice}</p>
      </div>
      <StatusBadge tone={guest.pixStatus === 'confirmed' ? 'available' : guest.pixStatus === 'rejected' ? 'danger' : 'reserved'}>
        {pixStatusLabel[guest.pixStatus]}
      </StatusBadge>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      {guest.pixReceiptUrl && (
        <a
          href={guest.pixReceiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#FCE8F0] px-4 py-2 text-xs font-bold text-[#8B5A5A]"
        >
          Ver comprovante
        </a>
      )}
      <button
        disabled={guest.pixStatus === 'confirmed'}
        onClick={() => onStatus(guest.id, 'confirmed')}
        className="rounded-full bg-[#E89CB8] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        Confirmar Pix
      </button>
      <button
        disabled={guest.pixStatus === 'rejected'}
        onClick={() => onStatus(guest.id, 'rejected')}
        className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-500 disabled:opacity-50"
      >
        Nao localizado
      </button>
      {guest.pixStatus !== 'pending_receipt' && (
        <button
          onClick={() => onStatus(guest.id, 'pending_receipt')}
          className="rounded-full border border-[#8B5A5A] px-4 py-2 text-xs font-bold text-[#8B5A5A]"
        >
          Voltar para pendente
        </button>
      )}
      <WhatsAppButton whatsapp={guest.whatsapp} />
    </div>
  </article>
);

const GiftEditor = ({
  gift,
  onCancel,
  onSave,
}: {
  gift: GiftFormData;
  onCancel: () => void;
  onSave: (gift: GiftFormData) => void;
}) => {
  const [form, setForm] = useState<GiftFormData>(gift);

  const canSave = form.name.trim().length >= 3 && form.price > 0;

  return (
    <section className="rounded-[1.4rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-serif text-xl font-bold text-[#E89CB8]">
        {form.id ? 'Editar presente' : 'Criar presente'}
      </h3>
      <div className="grid gap-3 md:grid-cols-[1fr_140px_140px]">
        <label>
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8B5A5A]">Nome</span>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="h-11 w-full rounded-[1rem] border-2 border-[#F4C7D7] px-3 text-sm outline-none focus:border-[#E89CB8]"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8B5A5A]">Categoria</span>
          <select
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as GiftFormData['category'] }))}
            className="h-11 w-full rounded-[1rem] border-2 border-[#F4C7D7] px-3 text-sm outline-none focus:border-[#E89CB8]"
          >
            <option value="P">Fralda P</option>
            <option value="M">Fralda M</option>
            <option value="G">Fralda G</option>
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8B5A5A]">Valor</span>
          <input
            type="number"
            min={1}
            value={form.price}
            onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))}
            className="h-11 w-full rounded-[1rem] border-2 border-[#F4C7D7] px-3 text-sm outline-none focus:border-[#E89CB8]"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          disabled={!canSave}
          onClick={() => onSave(form)}
          className="min-h-[42px] rounded-full bg-[#E89CB8] px-5 text-xs font-bold text-white disabled:opacity-50"
        >
          Salvar presente
        </button>
        <button onClick={onCancel} className="min-h-[42px] rounded-full border border-[#E89CB8] px-5 text-xs font-bold text-[#E89CB8]">
          Cancelar
        </button>
      </div>
    </section>
  );
};

const ExportsView = ({
  guests,
  gifts,
  auditLogs,
  inviteLinks,
  backupDownloadedAt,
  onFullBackup,
  onClearAll,
  onResetGifts,
}: {
  guests: Guest[];
  gifts: GiftItem[];
  auditLogs: AuditLog[];
  inviteLinks: InviteLink[];
  backupDownloadedAt: string;
  onFullBackup: () => void;
  onClearAll: () => void;
  onResetGifts: () => void;
}) => {
  const poolGuests = guests.filter((guest) => guest.poolUsage === 'sim' || guest.poolUsage === 'talvez');
  const pixGuests = guests.filter((guest) => guest.giftMethod === 'pix');
  const pendingPix = pixGuests.filter((guest) => guest.pixStatus === 'pending_receipt' || guest.pixStatus === 'pending_review' || guest.pixStatus === 'rejected');

  return (
    <section className="space-y-4">
      <PanelTitle title="Exportacoes e manutencao" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users size={22} />} label="Convidados" value={guests.length} />
        <StatCard icon={<Waves size={22} />} label="Piscina" value={poolGuests.length} />
        <StatCard icon={<MessageCircle size={22} />} label="Pix" value={pixGuests.length} />
        <StatCard icon={<Gift size={22} />} label="Presentes reservados" value={gifts.filter((gift) => gift.isReserved).length} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ExportButton label={`Convidados CSV (${guests.length})`} onClick={() => exportGuestsToExcel(guests)} />
        <ExportButton label={`Lista da piscina CSV (${poolGuests.length})`} onClick={() => exportPoolToExcel(guests)} />
        <ExportButton label={`Presentes CSV (${gifts.length})`} onClick={() => exportGiftsToExcel(gifts)} />
        <ExportButton label={`Pix CSV (${pixGuests.length})`} onClick={() => exportPixToExcel(guests)} />
        <ExportButton label={`Pix pendente CSV (${pendingPix.length})`} onClick={() => exportPendingPixToExcel(guests)} />
        <ExportButton label={`Historico seguranca CSV (${auditLogs.length})`} onClick={() => exportAuditLogsToExcel(auditLogs)} />
        <ExportButton label={`Convites CSV (${inviteLinks.length})`} onClick={() => exportInviteLinksToExcel(inviteLinks, window.location.origin)} />
        <ExportButton label="Backup completo JSON" onClick={onFullBackup} />
        <ExportButton label="Relatorio PDF/Impressao" onClick={() => exportPrintableReport(guests, gifts)} />
        <ExportButton label="Lista de presenca" onClick={() => exportAttendanceList(guests)} />
      </div>
      <div className="rounded-[1.4rem] border-2 border-red-100 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-red-500">Zona de manutencao</p>
        <p className="mb-3 text-xs leading-relaxed text-[#8B5A5A]">
          Antes de limpar confirmacoes ou dados, baixe o backup completo JSON.
        </p>
        {backupDownloadedAt ? (
          <p className="mb-3 rounded-[1rem] bg-[#EEF8ED] px-4 py-3 text-xs font-bold text-[#4B8B45]">
            Backup baixado as {backupDownloadedAt}. A manutencao esta liberada nesta sessao.
          </p>
        ) : (
          <p className="mb-3 rounded-[1rem] bg-red-50 px-4 py-3 text-xs font-bold text-red-500">
            Baixe o backup completo JSON para liberar estes botoes.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <button disabled={!backupDownloadedAt} onClick={onResetGifts} className="flex min-h-[48px] items-center justify-center gap-2 rounded-[1.1rem] bg-[#E89CB8] text-sm font-bold text-white disabled:opacity-50">
            <RefreshCw size={17} />
            Limpar confirmacoes
          </button>
          <button disabled={!backupDownloadedAt} onClick={onClearAll} className="flex min-h-[48px] items-center justify-center gap-2 rounded-[1.1rem] bg-red-500 text-sm font-bold text-white disabled:opacity-50">
            <Trash2 size={17} />
            Limpar tudo
          </button>
        </div>
      </div>
    </section>
  );
};

const SettingsView = ({
  eventInfo,
  onSaved,
  onNotice,
}: {
  eventInfo: EventInfo;
  onSaved: () => Promise<void>;
  onNotice: (type: 'success' | 'error', text: string) => void;
}) => {
  const [form, setForm] = useState<EventInfo>(eventInfo);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(eventInfo);
  }, [eventInfo]);

  const handleChange = (field: keyof EventInfo, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await updateEventInfo(form);
      setSaved(true);
      await onSaved();
      onNotice('success', 'Configuracoes salvas.');
    } catch (saveError) {
      onNotice('error', saveError instanceof Error ? saveError.message : 'Nao foi possivel salvar as configuracoes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <PanelTitle title="Configuracoes do evento" />
      <div className="grid gap-4 rounded-[1.4rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm md:grid-cols-2">
        <SettingsField label="Nome da bebe" value={form.babyName} onChange={(value) => handleChange('babyName', value)} />
        <SettingsField label="Titulo do evento" value={form.eventName} onChange={(value) => handleChange('eventName', value)} />
        <SettingsField label="Data por extenso" value={form.date} onChange={(value) => handleChange('date', value)} />
        <SettingsField label="Data ISO" value={form.isoDate} onChange={(value) => handleChange('isoDate', value)} helper="Ex.: 2026-07-26T13:00:00" />
        <SettingsField label="Horario" value={form.time} onChange={(value) => handleChange('time', value)} />
        <SettingsField label="Referencia do local" value={form.addressReference} onChange={(value) => handleChange('addressReference', value)} />
        <SettingsField label="Endereco" value={form.address} onChange={(value) => handleChange('address', value)} className="md:col-span-2" />
        <SettingsField label="Link Google Maps" value={form.addressLink} onChange={(value) => handleChange('addressLink', value)} className="md:col-span-2" />
        <SettingsField label="Embed Google Maps" value={form.addressEmbedUrl || ''} onChange={(value) => handleChange('addressEmbedUrl', value)} className="md:col-span-2" helper="Opcional. Se vazio, o mapa sera gerado pelo endereco." />
        <SettingsField label="Chave Pix" value={form.pixKey} onChange={(value) => handleChange('pixKey', value)} />
        <SettingsField label="Nome do favorecido Pix" value={form.pixName} onChange={(value) => handleChange('pixName', value)} />
        <SettingsField label="Cidade Pix" value={form.pixCity} onChange={(value) => handleChange('pixCity', value)} />
        <SettingsField
          label="Banco Pix (informativo)"
          value={form.pixBank || ''}
          onChange={(value) => handleChange('pixBank', value)}
          helper="Apenas para o convidado conferir. Nao entra no codigo Pix."
        />
        <SettingsTextArea
          label="Mensagem inicial"
          value={form.invitationMessage}
          onChange={(value) => handleChange('invitationMessage', value)}
          className="md:col-span-2"
        />
        <SettingsTextArea
          label="Mensagem final"
          value={form.finalMessage}
          onChange={(value) => handleChange('finalMessage', value)}
          className="md:col-span-2"
        />
      </div>

      <button disabled={isSaving} onClick={() => void handleSave()} className="min-h-[52px] rounded-[1.2rem] bg-[#E89CB8] px-6 text-sm font-bold text-white disabled:opacity-60">
        {isSaving ? 'Salvando...' : 'Salvar configuracoes'}
      </button>
      {saved && <p className="text-sm font-semibold text-green-700">Configuracoes salvas.</p>}
    </section>
  );
};

const SecurityView = ({ logs }: { logs: AuditLog[] }) => (
  <section className="space-y-4">
    <PanelTitle title="Seguranca e historico" />
    <div className="rounded-[1.4rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-[#5F4A44]">Acoes administrativas recentes</p>
      <p className="mt-1 text-xs leading-relaxed text-[#8B5A5A]">
        Este historico ajuda a conferir alteracoes sensiveis, como Pix confirmado, presente liberado e confirmacao cancelada.
      </p>
    </div>
    <div className="grid gap-3">
      {logs.length === 0 ? (
        <EmptyState text="Nenhuma acao administrativa registrada ainda." />
      ) : (
        logs.map((log) => (
          <article key={log.id} className="rounded-[1.2rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#5F4A44]">{auditActionLabel[log.action] || log.action}</p>
                <p className="mt-1 text-xs text-[#8B5A5A]">
                  {log.adminName} | {log.createdAt}
                </p>
              </div>
              <StatusBadge tone="reserved">{log.entityType}</StatusBadge>
            </div>
            {Object.keys(log.metadata).length > 0 && (
              <pre className="mt-3 max-h-28 overflow-auto rounded-[1rem] bg-[#FFF5F0] p-3 text-[11px] leading-relaxed text-[#8B5A5A]">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            )}
          </article>
        ))
      )}
    </div>
  </section>
);

const SettingsField = ({
  label,
  value,
  onChange,
  helper,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  className?: string;
}) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8B5A5A]">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-[1rem] border-2 border-[#F4C7D7] px-3 text-sm text-[#5F4A44] outline-none focus:border-[#E89CB8]"
    />
    {helper && <span className="mt-1 block text-xs text-[#A0826D]">{helper}</span>}
  </label>
);

const SettingsTextArea = ({
  label,
  value,
  onChange,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8B5A5A]">{label}</span>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={4}
      className="w-full resize-none rounded-[1rem] border-2 border-[#F4C7D7] px-3 py-3 text-sm text-[#5F4A44] outline-none focus:border-[#E89CB8]"
    />
  </label>
);

const Filters = ({
  searchTerm,
  filterPool,
  filterMethod,
  onSearch,
  onPoolFilter,
  onMethodFilter,
}: Pick<GuestsViewProps, 'searchTerm' | 'filterPool' | 'filterMethod' | 'onSearch' | 'onPoolFilter' | 'onMethodFilter'>) => (
  <div className="grid gap-3 rounded-[1.4rem] bg-white p-3 shadow-sm md:grid-cols-[1fr_auto_auto]">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0826D]" size={18} />
      <input
        value={searchTerm}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Pesquisar nome, WhatsApp ou presente"
        className="h-11 w-full rounded-[1rem] border-2 border-[#F4C7D7] pl-10 pr-3 text-sm outline-none focus:border-[#E89CB8]"
      />
    </div>
    <select value={filterPool} onChange={(event) => onPoolFilter(event.target.value as PoolFilter)} className="h-11 rounded-[1rem] border-2 border-[#F4C7D7] px-3 text-sm text-[#8B5A5A] outline-none">
      <option value="all">Todas piscinas</option>
      <option value="sim">Piscina: sim</option>
      <option value="nao">Piscina: nao</option>
      <option value="talvez">Piscina: talvez</option>
    </select>
    <select value={filterMethod} onChange={(event) => onMethodFilter(event.target.value as MethodFilter)} className="h-11 rounded-[1rem] border-2 border-[#F4C7D7] px-3 text-sm text-[#8B5A5A] outline-none">
      <option value="all">Todas formas</option>
      <option value="pix">Pix</option>
      <option value="levar">Levar no dia</option>
    </select>
  </div>
);

const GuestEditor = ({
  guest,
  onCancel,
  onSave,
}: {
  guest: GuestFormData;
  onCancel: () => void;
  onSave: (guest: GuestFormData) => void;
}) => {
  const [form, setForm] = useState<GuestFormData>(guest);
  const canSave = form.name.trim().length >= 3 && form.whatsapp.trim().length >= 10 && form.numberOfPeople >= 1;

  return (
    <section className="rounded-[1.4rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-serif text-xl font-bold text-[#E89CB8]">Editar convidado</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <SettingsField label="Nome" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
        <SettingsField label="WhatsApp" value={form.whatsapp} onChange={(value) => setForm((current) => ({ ...current, whatsapp: value }))} />
        <label>
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8B5A5A]">Pessoas</span>
          <input
            type="number"
            min={1}
            max={10}
            value={form.numberOfPeople}
            onChange={(event) => setForm((current) => ({ ...current, numberOfPeople: Number(event.target.value) }))}
            className="h-11 w-full rounded-[1rem] border-2 border-[#F4C7D7] px-3 text-sm outline-none focus:border-[#E89CB8]"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8B5A5A]">Piscina</span>
          <select
            value={form.poolUsage}
            onChange={(event) => setForm((current) => ({ ...current, poolUsage: event.target.value as GuestFormData['poolUsage'] }))}
            className="h-11 w-full rounded-[1rem] border-2 border-[#F4C7D7] px-3 text-sm outline-none focus:border-[#E89CB8]"
          >
            <option value="sim">Sim</option>
            <option value="nao">Nao</option>
            <option value="talvez">Talvez</option>
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8B5A5A]">Forma</span>
          <select
            value={form.giftMethod}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                giftMethod: event.target.value as GuestFormData['giftMethod'],
                pixStatus: event.target.value === 'pix' ? current.pixStatus : 'not_required',
              }))
            }
            className="h-11 w-full rounded-[1rem] border-2 border-[#F4C7D7] px-3 text-sm outline-none focus:border-[#E89CB8]"
          >
            <option value="levar">Vai levar no dia</option>
            <option value="pix">Pix</option>
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8B5A5A]">Status Pix</span>
          <select
            value={form.pixStatus}
            disabled={form.giftMethod !== 'pix'}
            onChange={(event) => setForm((current) => ({ ...current, pixStatus: event.target.value as GuestFormData['pixStatus'] }))}
            className="h-11 w-full rounded-[1rem] border-2 border-[#F4C7D7] px-3 text-sm outline-none focus:border-[#E89CB8] disabled:opacity-60"
          >
            <option value="not_required">Sem Pix</option>
            <option value="pending_receipt">Sem comprovante</option>
            <option value="pending_review">Aguardando conferencia</option>
            <option value="confirmed">Confirmado</option>
            <option value="rejected">Nao localizado</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={!canSave} onClick={() => onSave(form)} className="min-h-[42px] rounded-full bg-[#E89CB8] px-5 text-xs font-bold text-white disabled:opacity-50">
          Salvar convidado
        </button>
        <button onClick={onCancel} className="min-h-[42px] rounded-full border border-[#E89CB8] px-5 text-xs font-bold text-[#E89CB8]">
          Cancelar
        </button>
      </div>
    </section>
  );
};

const GuestCard = ({
  guest,
  onEdit,
  onReleaseGift,
  onCancelGuest,
}: {
  guest: Guest;
  onEdit: (guest: Guest) => void;
  onReleaseGift: (guest: Guest) => void;
  onCancelGuest: (guest: Guest) => void;
}) => {
  const [showWhatsapp, setShowWhatsapp] = useState(false);

  return (
    <article className="rounded-[1.3rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#5F4A44]">{guest.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-[#8B5A5A]">{showWhatsapp ? guest.whatsapp : maskWhatsapp(guest.whatsapp)}</p>
            <button
              type="button"
              onClick={() => setShowWhatsapp((current) => !current)}
              className="rounded-full bg-[#FFF5F0] px-3 py-1 text-[11px] font-bold text-[#8B5A5A]"
            >
              {showWhatsapp ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <p className="mt-1 text-xs text-[#A0826D]">
            {guest.numberOfPeople} pessoa(s) | Piscina: {guest.poolUsage}
          </p>
          {guest.inviteLabel && <p className="mt-1 text-xs font-bold text-[#E89CB8]">Convite: {guest.inviteLabel}</p>}
        </div>
        <StatusBadge tone={guest.giftMethod === 'pix' ? 'reserved' : 'available'}>{guest.giftMethod === 'pix' ? 'Pix' : 'Vai levar'}</StatusBadge>
      </div>
      <div className="mt-3 rounded-[1rem] bg-[#FFF5F0] p-3">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#E89CB8]">Presente</p>
        <p className="text-sm font-bold text-[#5F4A44]">{guest.giftName}</p>
        <p className="text-xs text-[#A0826D]">Confirmado em {guest.confirmationDate}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <WhatsAppButton whatsapp={guest.whatsapp} />
        <button onClick={() => onEdit(guest)} className="rounded-full border border-[#8B5A5A] px-4 py-2 text-xs font-bold text-[#8B5A5A]">
          Editar
        </button>
        <button onClick={() => onReleaseGift(guest)} className="rounded-full border border-[#E89CB8] px-4 py-2 text-xs font-bold text-[#E89CB8]">
          Liberar presente
        </button>
        <button onClick={() => onCancelGuest(guest)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-500">
          Cancelar confirmacao
        </button>
      </div>
    </article>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <article className="rounded-[1.4rem] border-2 border-[#F4C7D7] bg-white p-4 shadow-sm">
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#FCE8F0] text-[#E89CB8]">{icon}</div>
    <p className="text-2xl font-bold text-[#5F4A44]">{value}</p>
    <p className="text-sm text-[#8B5A5A]">{label}</p>
  </article>
);

const PanelTitle = ({ title }: { title: string }) => <h2 className="font-serif text-2xl font-bold text-[#E89CB8]">{title}</h2>;

const StatusBadge = ({ children, tone }: { children: React.ReactNode; tone: 'available' | 'reserved' | 'danger' }) => {
  const styles = {
    available: 'bg-green-50 text-green-700 border-green-100',
    reserved: 'bg-[#FFF5F0] text-[#E89CB8] border-[#F4C7D7]',
    danger: 'bg-red-50 text-red-600 border-red-100',
  };

  return <span className={`inline-flex h-fit rounded-full border px-3 py-1 text-xs font-bold ${styles[tone]}`}>{children}</span>;
};

const WhatsAppButton = ({ whatsapp }: { whatsapp: string }) => {
  const clean = whatsapp.replace(/\D/g, '');
  const phone = clean.startsWith('55') ? clean : `55${clean}`;
  return (
    <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#FCE8F0] px-4 py-2 text-xs font-bold text-[#8B5A5A]">
      Abrir WhatsApp
    </a>
  );
};

const maskWhatsapp = (whatsapp: string): string => {
  const digits = whatsapp.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `${digits.slice(0, 2)} *****-${digits.slice(-4)}`;
};

const ExportButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={onClick} className="flex min-h-[54px] items-center justify-center gap-2 rounded-[1.2rem] border-2 border-[#F4C7D7] bg-white px-4 text-sm font-bold text-[#8B5A5A] shadow-sm">
    <Download size={17} />
    {label}
  </button>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-[1.4rem] border-2 border-dashed border-[#F4C7D7] bg-white/70 p-8 text-center text-sm font-semibold text-[#8B5A5A]">
    {text}
  </div>
);

const pixStatusLabel: Record<PixStatus, string> = {
  not_required: 'Sem Pix',
  pending_receipt: 'Sem comprovante',
  pending_review: 'Aguardando conferencia',
  confirmed: 'Confirmado',
  rejected: 'Nao localizado',
};

const auditActionLabel: Record<string, string> = {
  pix_status_updated: 'Status do Pix atualizado',
  gift_released: 'Presente liberado',
  guest_cancelled: 'Confirmacao cancelada',
  guest_updated: 'Convidado editado',
  gift_disabled: 'Presente desativado',
  gift_enabled: 'Presente ativado',
  confirmations_cleared: 'Confirmacoes limpas',
  backup_exported: 'Backup completo baixado',
};
