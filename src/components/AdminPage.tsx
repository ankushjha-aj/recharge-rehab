import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  login,
  logout,
  refreshMe,
  getCurrentUser,
  listBookings,
  updateBooking,
  deleteBooking,
  markSeen,
  markAllSeen,
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
  listBlocked,
  addBlocked,
  removeBlocked,
  applyCsvAvailability,
  clearCsvAvailability,
  parseAvailabilityCsv,
  todayISO,
  SLOT_TIMES,
  formatSlot,
  type BookingRequest,
  type BookingStatus,
  type BookingSource,
  type PaymentStatus,
  type User,
  type Role,
  type BlockedSlot,
  type CsvApplyResult,
} from '../lib/store';
import EmployeeDashboard from './EmployeeDashboard';
import HeroBanner from './HeroBanner';
import ThemeToggle from './ThemeToggle';

const lettersData = [
  { id: 0, char: 'R', src: '/images/logo_parts/letter_0_R.png' },
  { id: 1, char: 'e', src: '/images/logo_parts/letter_1_e.png' },
  { id: 2, char: 'c', src: '/images/logo_parts/letter_2_c.png' },
  { id: 3, char: 'h', src: '/images/logo_parts/letter_3_h.png' },
  { id: 4, char: 'a', src: '/images/logo_parts/letter_4_a.png' },
  { id: 5, char: 'r', src: '/images/logo_parts/letter_5_r.png' },
  { id: 6, char: 'g', src: '/images/logo_parts/letter_6_g.png' },
  { id: 7, char: 'e', src: '/images/logo_parts/letter_7_e.png' },
];

type Tab = 'requests' | 'employees' | 'availability' | 'payments';

const STATUS_META: Record<BookingStatus, { label: string; cls: string }> = {
  requested: { label: 'Requested', cls: 'bg-primary-fixed text-primary' },
  confirmed: { label: 'Confirmed', cls: 'bg-[#D1FADF] text-[#027A48]' },
  cancelled: { label: 'Cancelled', cls: 'bg-[#FEE4E2] text-[#B42318]' },
  completed: { label: 'Completed', cls: 'bg-surface-container-high text-on-surface-variant' },
};
const PAYMENT_META: Record<PaymentStatus, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-[#FEF0C7] text-[#B54708]' },
  paid_online: { label: 'Paid (Online)', cls: 'bg-[#D1FADF] text-[#027A48]' },
  pay_on_visit: { label: 'Pay on Visit', cls: 'bg-primary-fixed text-primary' },
  waived: { label: 'Waived', cls: 'bg-surface-container-high text-on-surface-variant' },
};
const ROLE_LABEL: Record<Role, string> = { super_admin: 'Super Admin', admin: 'Admin', employee: 'Employee' };

const digits = (p: string) => p.replace(/\D/g, '');
const waLink = (phone: string, text: string) => {
  let d = digits(phone);
  if (d.length === 10) d = '91' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
};
const telLink = (phone: string) => `tel:${digits(phone)}`;
const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const Pill: React.FC<{ cls: string; children: React.ReactNode }> = ({ cls, children }) => (
  <span className={`inline-block text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${cls}`}>{children}</span>
);
const EmptyState: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div className="text-center py-16">
    <div className="w-14 h-14 rounded-full bg-primary-fixed grid place-items-center text-primary mx-auto mb-4">
      <span className="material-symbols-outlined text-[28px]">{icon}</span>
    </div>
    <p className="text-body-md text-on-surface-variant">{text}</p>
  </div>
);

// ===========================================================================
// Root: login gate → role routing
// ===========================================================================
const AdminPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    document.title = 'Admin - Recharge Rehabilitation';
    refreshMe().then((u) => {
      if (u) setUser(u);
      else setUser(null);
      setChecking(false);
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  if (checking && !user) {
    return <div className="flex-grow bg-background grid place-items-center text-on-surface-variant">Loading…</div>;
  }
  if (!user) return <LoginForm onLoggedIn={setUser} />;
  if (user.role === 'employee') return <EmployeeDashboard user={user} onLogout={handleLogout} />;
  return <AdminDashboard user={user} onLogout={handleLogout} />;
};

// ===========================================================================
// Login (shared by all roles)
// ===========================================================================
const LoginForm: React.FC<{ onLoggedIn: (u: User) => void }> = ({ onLoggedIn }) => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(() => localStorage.getItem('rr_remember') === '1');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      localStorage.setItem('rr_remember', remember ? '1' : '0');
      onLoggedIn(await login(id.trim(), pw));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const fieldCls =
    'w-full bg-surface-container-lowest/60 border border-outline-variant rounded-2xl py-3.5 pl-11 pr-4 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200';

  const bgStyle = {
    backgroundImage: `
      radial-gradient(circle at 0% 0%, rgb(var(--color-primary-fixed) / 0.5) 0%, transparent 45%),
      radial-gradient(circle at 100% 100%, rgb(var(--color-footer-dark) / 0.45) 0%, transparent 45%)
    `
  };

  return (
    <div className="relative flex-grow min-h-screen overflow-hidden bg-background" style={bgStyle}>
      {/* Floating Top-Right Controls: Theme Toggle & Social Links */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-3 bg-surface-container-lowest/40 backdrop-blur-md px-4 py-2 rounded-full border border-outline-variant/30 shadow-md">
        {/* Instagram */}
        <a
          href="https://www.instagram.com/recharge_rehab/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-on-surface-variant hover:text-primary hover:scale-110 transition-all duration-200 flex items-center justify-center p-1"
          title="Instagram"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
        </a>
        {/* LinkedIn */}
        <a
          href="https://www.linkedin.com/company/recharge-rehab"
          target="_blank"
          rel="noopener noreferrer"
          className="text-on-surface-variant hover:text-primary hover:scale-110 transition-all duration-200 flex items-center justify-center p-1"
          title="LinkedIn"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
        </a>
        
        {/* Divider */}
        <div className="w-px h-4 bg-outline-variant/40" />

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>

      {/* ——— Two-panel grid: animation (left) + form (right) ——— */}
      <div className="relative z-10 min-h-screen grid grid-cols-1 md:grid-cols-2 items-stretch">

        {/* ─── Left: animated house scene + logo letters ─── */}
        <div className="relative flex flex-col justify-between items-center md:items-start p-8 md:p-12 overflow-hidden md:min-h-screen">
          {/* Top: RECHARGE Logo letters bouncing in */}
          <div className="relative z-20 flex items-center h-12 md:h-16 overflow-visible mb-6 mt-12 md:mt-0">
            {lettersData.map((letter, index) => (
              <div
                key={letter.id}
                className="relative flex items-center h-full animate-logo-letter-bounce"
                style={{
                  animationDelay: `${1200 + index * 115}ms`,
                  animationFillMode: 'both',
                }}
              >
                <img
                  alt={letter.char}
                  src={letter.src}
                  className="h-10 md:h-14 w-auto object-contain logo-word-rehabilitation"
                />
              </div>
            ))}
          </div>

          {/* Center: Animated House Scene background */}
          <div className="w-full flex-grow flex items-center justify-center opacity-[0.65] select-none pointer-events-none z-10">
            <HeroBanner mode="backdrop" />
          </div>

          {/* Bottom: Tagline overlaid on the scene */}
          <div className="relative z-20 text-center md:text-left mt-8 md:mt-0 animate-fade-in" style={{ animationDelay: '1.2s', animationFillMode: 'both' }}>
            <p className="text-headline-sm md:text-headline-md font-extrabold text-on-surface leading-snug max-w-xs">
              Discharged from the hospital&nbsp;—
            </p>
            <p className="text-headline-sm md:text-headline-md font-extrabold text-primary leading-snug max-w-xs">
              recharge with us.
            </p>
          </div>
        </div>

        {/* ─── Right: sign-in form ─── */}
        <div className="relative flex items-center justify-center px-6 py-12 md:py-0">
          <div className="relative z-10 w-full max-w-md bg-surface-container-lowest/40 backdrop-blur-xl border border-outline-variant/30 p-8 rounded-3xl shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
            {/* Brand mark with glow ring */}
            <div className="relative w-14 h-14 mb-6">
              <span className="absolute inset-0 rounded-2xl bg-primary/25 blur-xl animate-pulse-ring" />
              <div className="relative w-14 h-14 rounded-2xl bg-primary-fixed grid place-items-center text-primary shadow-sm">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </div>
            </div>

            <p className="text-label-md uppercase tracking-[0.2em] text-primary font-extrabold mb-1 text-xs">Recharge Rehabilitation</p>
            <h1 className="text-headline-lg font-extrabold text-on-surface mb-1.5">Welcome back</h1>
            <p className="text-body-md text-on-surface-variant mb-8">Sign in to manage bookings, availability and your team.</p>

            <form onSubmit={submit} className="space-y-4">
              {/* Login ID */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant pointer-events-none">person</span>
                <input
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="Login ID"
                  autoFocus
                  autoCapitalize="none"
                  autoComplete="username"
                  className={fieldCls}
                />
              </div>

              {/* Password */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant pointer-events-none">lock</span>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className={`${fieldCls} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  title={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>

              {/* Keep me signed in */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <span
                  onClick={() => setRemember((r) => !r)}
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 transition-all duration-200 ${
                    remember
                      ? 'bg-primary border-primary text-on-primary'
                      : 'border-outline-variant text-transparent group-hover:border-primary/60'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </span>
                <span className="text-body-sm text-on-surface-variant">Keep me signed in on this device</span>
              </label>

              {err && (
                <p className="flex items-center gap-1.5 text-body-sm text-[#B42318]">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {err}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-primary text-on-primary py-3.5 rounded-full font-bold text-sm hover:brightness-95 active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy ? 'Signing in…' : (<>Sign In <span className="material-symbols-outlined text-[18px]">arrow_forward</span></>)}
              </button>
            </form>

            {/* Footer: trouble link */}
            <div className="mt-8 pt-6 border-t border-outline-variant/40">
              <p className="text-center text-body-sm text-on-surface-variant/70 flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">help_outline</span>
                Trouble signing in?{' '}
                <a
                  href="https://wa.me/919910525100?text=Hi%2C%20I%20need%20help%20with%20my%20Recharge%20staff%20login."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-bold hover:underline"
                >
                  Contact the super admin
                </a>
              </p>
            </div>

            <p className="text-center text-[11px] text-on-surface-variant/50 mt-4 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              Protected staff area · Recharge Rehabilitation
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

// ===========================================================================
// Admin / Super Admin dashboard
// ===========================================================================
const AdminDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const isSuper = user.role === 'super_admin';
  const [tab, setTab] = useState<Tab>('requests');
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string>('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [b, u] = await Promise.all([listBookings(), listUsers()]);
      setBookings(b);
      setUsers(u);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // New-item notification popup on entry.
  const unseen = useMemo(() => bookings.filter((b) => !b.seen), [bookings]);
  const unseenSessions = unseen.filter((b) => b.source === 'booking').length;
  const unseenConsults = unseen.filter((b) => b.source === 'consultation').length;
  const [noticeShown, setNoticeShown] = useState(false);
  useEffect(() => {
    if (!noticeShown && unseen.length > 0) {
      setNotice(`🔔 ${unseen.length} new since your last visit — ${unseenSessions} session${unseenSessions === 1 ? '' : 's'}, ${unseenConsults} consultation${unseenConsults === 1 ? '' : 's'}.`);
      setNoticeShown(true);
    }
  }, [unseen.length, noticeShown, unseenSessions, unseenConsults]);

  const staffName = (id: string) => (id === 'any' ? 'No preference' : users.find((u) => u.id === id)?.name ?? id);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'requests', label: 'Bookings', icon: 'inbox' },
    { id: 'employees', label: 'Employees', icon: 'badge' },
    { id: 'availability', label: 'Availability', icon: 'event_busy' },
    { id: 'payments', label: 'Payments', icon: 'payments' },
  ];

  return (
    <div className="flex-grow bg-background px-4 md:px-8 py-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-headline-lg font-extrabold text-on-surface">Recharge Admin</h1>
            <p className="text-body-sm text-on-surface-variant mt-1 flex items-center gap-2">
              <Pill cls={isSuper ? 'bg-[#FEE4E2] text-[#B42318]' : 'bg-primary-fixed text-primary'}>{ROLE_LABEL[user.role]}</Pill>
              Signed in as <strong className="text-on-surface">{user.name || user.id}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary px-4 py-2 rounded-full font-bold text-sm transition-colors">
              <span className="material-symbols-outlined text-[18px]">refresh</span>Refresh
            </button>
            <button onClick={onLogout} className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant hover:text-[#B42318] hover:border-[#B42318] px-4 py-2 rounded-full font-bold text-sm transition-colors">
              <span className="material-symbols-outlined text-[18px]">logout</span>Log out
            </button>
          </div>
        </div>

        {notice && (
          <div className="mb-5 flex items-center justify-between gap-4 bg-primary-fixed border border-primary/30 rounded-2xl px-5 py-3 shadow-sm animate-pulse">
            <span className="text-body-md font-bold text-primary">{notice}</span>
            <button onClick={() => setNotice('')} className="text-primary hover:opacity-70"><span className="material-symbols-outlined text-[20px]">close</span></button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => {
            const badge = t.id === 'requests' ? unseen.length : 0;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 active:scale-95 ${
                  tab === t.id ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/60 hover:border-primary hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                {t.label}
                {badge > 0 && <span className="ml-1 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-[#F04438] text-white text-[11px] font-extrabold animate-pulse">{badge}</span>}
              </button>
            );
          })}
        </div>

        {loading && <p className="text-body-sm text-on-surface-variant mb-4">Loading…</p>}

        {tab === 'requests' && (
          <RequestsTab bookings={bookings} staffName={staffName} isSuper={isSuper} unseenSessions={unseenSessions} unseenConsults={unseenConsults} onChange={refresh} />
        )}
        {tab === 'employees' && <EmployeesTab users={users} me={user} isSuper={isSuper} onChange={refresh} />}
        {tab === 'availability' && <AvailabilityTab users={users} />}
        {tab === 'payments' && <PaymentsTab bookings={bookings} onChange={refresh} />}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Requests — Sessions vs Consultations (default Sessions) + filters
// ---------------------------------------------------------------------------
const RequestsTab: React.FC<{
  bookings: BookingRequest[];
  staffName: (id: string) => string;
  isSuper: boolean;
  unseenSessions: number;
  unseenConsults: number;
  onChange: () => void;
}> = ({ bookings, staffName, isSuper, unseenSessions, unseenConsults, onChange }) => {
  const [source, setSource] = useState<BookingSource>('booking'); // default: Book Sessions
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');
  const [query, setQuery] = useState('');

  const inSource = useMemo(() => bookings.filter((b) => b.source === source), [bookings, source]);
  const filtered = useMemo(
    () =>
      inSource.filter((b) => {
        if (statusFilter !== 'all' && b.status !== statusFilter) return false;
        const q = query.trim().toLowerCase();
        if (q && !`${b.parentName} ${b.phone} ${b.sessionType} ${b.concern}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [inSource, statusFilter, query],
  );

  const setStatus = async (b: BookingRequest, status: BookingStatus) => {
    await updateBooking(b.id, { status, seen: true });
    onChange();
  };
  const setPayment = async (b: BookingRequest, payment: PaymentStatus) => {
    await updateBooking(b.id, { payment });
    onChange();
  };
  const remove = async (b: BookingRequest) => {
    if (!confirm('Delete this request permanently?')) return;
    await deleteBooking(b.id);
    onChange();
  };
  const seen = async (b: BookingRequest) => {
    await markSeen(b.id);
    onChange();
  };

  const sourceUnseen = source === 'booking' ? unseenSessions : unseenConsults;

  return (
    <div>
      {/* Section toggle: Sessions vs Consultations */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex bg-surface-container-lowest border border-outline-variant rounded-full p-1">
          {(['booking', 'consultation'] as const).map((s) => {
            const count = s === 'booking' ? unseenSessions : unseenConsults;
            return (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`relative px-4 py-1.5 rounded-full text-sm font-bold transition-all ${source === s ? 'bg-primary text-on-primary shadow' : 'text-on-surface-variant hover:text-primary'}`}
              >
                {s === 'booking' ? 'Book Sessions' : 'Consultations'}
                {count > 0 && <span className="ml-1.5 inline-grid place-items-center min-w-4 h-4 px-1 rounded-full bg-[#F04438] text-white text-[10px] font-extrabold align-middle animate-pulse">{count}</span>}
              </button>
            );
          })}
        </div>
        {sourceUnseen > 0 && (
          <button onClick={() => markAllSeen(source).then(onChange)} className="text-xs font-bold text-primary hover:underline">
            Mark all {source === 'booking' ? 'sessions' : 'consultations'} as read
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(['all', 'requested', 'confirmed', 'cancelled', 'completed'] as const).map((s) => {
          const count = s === 'all' ? inSource.length : inSource.filter((b) => b.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${statusFilter === s ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/60 hover:border-primary'}`}
            >
              {s === 'all' ? 'All' : STATUS_META[s].label} ({count})
            </button>
          );
        })}
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, type…" className="ml-auto bg-transparent border border-outline-variant rounded-full py-2 px-4 text-sm text-on-surface focus:border-primary outline-none w-full sm:w-64" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="inbox" text={`No ${source === 'booking' ? 'session' : 'consultation'} requests match your filters.`} />
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className={`bg-surface-container-lowest border rounded-[1.25rem] p-5 shadow-sm ${!b.seen ? 'border-primary/60 ring-1 ring-primary/20' : 'border-outline-variant'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-headline-sm font-bold text-on-surface">{b.parentName || 'Unknown'}</h3>
                    {!b.seen && <Pill cls="bg-[#F04438] text-white">New</Pill>}
                    <Pill cls={STATUS_META[b.status].cls}>{STATUS_META[b.status].label}</Pill>
                    <Pill cls={PAYMENT_META[b.payment].cls}>{PAYMENT_META[b.payment].label}</Pill>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">
                    {b.sessionType} · {b.mode === 'online' ? 'Online' : 'In-Clinic'} · {staffName(b.specialistId)}
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    {b.date ? <>📅 {b.date}{b.slot ? ` · ${formatSlot(b.slot)}` : ''} · </> : null}📞 {b.phone} · 👶 {b.childAge || '—'} yrs
                  </p>
                  {(b.concern || b.notes) && (
                    <p className="text-body-sm text-on-surface-variant mt-1">
                      {b.concern && <span className="font-semibold">{b.concern}. </span>}
                      {b.notes}
                    </p>
                  )}
                  <p className="text-[11px] text-on-surface-variant/70 mt-1">Requested {fmtDate(b.requestedAt)}</p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex gap-1.5">
                    <a href={waLink(b.phone, `Hello ${b.parentName}, this is Recharge Rehabilitation regarding your ${b.sessionType} request.`)} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="w-9 h-9 grid place-items-center rounded-full bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366] hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                    </a>
                    <a href={telLink(b.phone)} title="Call" className="w-9 h-9 grid place-items-center rounded-full bg-primary-fixed text-primary hover:bg-primary hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">call</span>
                    </a>
                    {!b.seen && (
                      <button onClick={() => seen(b)} title="Mark as read" className="w-9 h-9 grid place-items-center rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
                      </button>
                    )}
                    {isSuper && (
                      <button onClick={() => remove(b)} title="Delete" className="w-9 h-9 grid place-items-center rounded-full text-on-surface-variant hover:bg-[#FEE4E2] hover:text-[#B42318] transition-colors">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {b.status !== 'confirmed' && <button onClick={() => setStatus(b, 'confirmed')} className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#D1FADF] text-[#027A48] hover:brightness-95">Confirm</button>}
                    {b.status !== 'completed' && <button onClick={() => setStatus(b, 'completed')} className="text-xs font-bold px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:brightness-95">Complete</button>}
                    {b.status !== 'cancelled' && <button onClick={() => setStatus(b, 'cancelled')} className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#FEE4E2] text-[#B42318] hover:brightness-95">Cancel</button>}
                  </div>
                  <select value={b.payment} onChange={(e) => setPayment(b, e.target.value as PaymentStatus)} className="bg-transparent border border-outline-variant rounded-full py-1 px-2.5 text-xs text-on-surface focus:border-primary outline-none cursor-pointer">
                    <option value="pending">Pending</option>
                    <option value="paid_online">Paid (Online)</option>
                    <option value="pay_on_visit">Pay on Visit</option>
                    <option value="waived">Waived</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Employees / accounts
// ---------------------------------------------------------------------------
const EmployeesTab: React.FC<{ users: User[]; me: User; isSuper: boolean; onChange: () => void }> = ({ users, isSuper, onChange }) => {
  const [form, setForm] = useState({ id: '', name: '', password: '', role: 'employee' as Role, specialty: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await createUser({ id: form.id.trim(), name: form.name.trim(), password: form.password, role: form.role, specialty: form.specialty.trim() });
      setForm({ id: '', name: '', password: '', role: 'employee', specialty: '' });
      onChange();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed to create');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u: User) => {
    await updateUser(u.id, { active: !u.active });
    onChange();
  };
  const reset = async (u: User) => {
    const pw = prompt(`New password for ${u.name || u.id}:`);
    if (!pw) return;
    await resetPassword(u.id, pw);
    alert('Password reset. The user must sign in again.');
  };
  const remove = async (u: User) => {
    if (!confirm(`Delete ${u.name || u.id} permanently?`)) return;
    try {
      await deleteUser(u.id);
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  };

  const employees = users.filter((u) => u.role === 'employee');
  const admins = users.filter((u) => u.role !== 'employee');

  return (
    <div className="space-y-8">
      {/* Create */}
      <form onSubmit={add} className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-5 shadow-sm">
        <h3 className="text-headline-sm font-bold text-on-surface mb-4">Create account</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Login ID"><input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="e.g. asha" className={inputCls} /></Field>
          <Field label="Full name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Asha Verma" className={inputCls} /></Field>
          <Field label="Password"><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="set a password" className={inputCls} /></Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={inputCls} disabled={!isSuper}>
              <option value="employee">Employee</option>
              {isSuper && <option value="admin">Admin</option>}
              {isSuper && <option value="super_admin">Super Admin</option>}
            </select>
          </Field>
          {form.role === 'employee' && (
            <Field label="Specialty"><input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="e.g. Speech Therapist" className={inputCls} /></Field>
          )}
        </div>
        {!isSuper && <p className="text-[11px] text-on-surface-variant mt-2">Admins can create employee accounts. Only the super admin can create admins.</p>}
        {err && <p className="text-body-sm text-[#B42318] mt-2">{err}</p>}
        <button type="submit" disabled={busy} className="mt-4 bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm hover:brightness-95 active:scale-95 transition disabled:opacity-60 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">person_add</span>{busy ? 'Creating…' : 'Create'}
        </button>
      </form>

      {/* Admin/super accounts */}
      <div>
        <h3 className="text-label-md uppercase tracking-wider text-primary font-extrabold mb-3">Admin accounts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {admins.map((u) => (
            <UserCard key={u.id} u={u} isSuper={isSuper} onToggle={toggleActive} onReset={reset} onRemove={remove} onEdit={setEditing} />
          ))}
        </div>
      </div>

      {/* Employees */}
      <div>
        <h3 className="text-label-md uppercase tracking-wider text-primary font-extrabold mb-3">Employees ({employees.length})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {employees.map((u) => (
            <UserCard key={u.id} u={u} isSuper={isSuper} onToggle={toggleActive} onReset={reset} onRemove={remove} onEdit={setEditing} />
          ))}
        </div>
      </div>

      {editing && <EditUserModal u={editing} isSuper={isSuper} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChange(); }} />}
    </div>
  );
};

const UserCard: React.FC<{ u: User; isSuper: boolean; onToggle: (u: User) => void; onReset: (u: User) => void; onRemove: (u: User) => void; onEdit: (u: User) => void }> = ({ u, isSuper, onToggle, onReset, onRemove, onEdit }) => {
  const canEdit = isSuper || u.role === 'employee';
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary-fixed grid place-items-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[20px]">{u.role === 'employee' ? 'badge' : 'shield_person'}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-on-surface truncate">{u.name || u.id}</p>
            <p className="text-body-sm text-on-surface-variant truncate">{u.id} · {u.specialty || ROLE_LABEL[u.role]}</p>
          </div>
        </div>
        <Pill cls={u.role === 'super_admin' ? 'bg-[#FEE4E2] text-[#B42318]' : u.role === 'admin' ? 'bg-primary-fixed text-primary' : 'bg-surface-container-high text-on-surface-variant'}>{ROLE_LABEL[u.role]}</Pill>
      </div>
      {u.role === 'employee' && (
        <p className="text-[11px] text-on-surface-variant/80 mt-2">
          {u.profileComplete ? '✓ Profile complete' : '○ Profile pending'}
          {u.experience ? ` · ${u.experience}` : ''}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {canEdit && <button onClick={() => onToggle(u)} className={`text-xs font-bold px-3 py-1.5 rounded-full ${u.active ? 'bg-[#D1FADF] text-[#027A48]' : 'bg-surface-container-high text-on-surface-variant'}`}>{u.active ? 'Active' : 'Inactive'}</button>}
        {canEdit && <button onClick={() => onEdit(u)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary">Edit</button>}
        {canEdit && <button onClick={() => onReset(u)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary-fixed text-primary hover:brightness-95">Reset PW</button>}
        {isSuper && <button onClick={() => onRemove(u)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#FEE4E2] text-[#B42318] hover:brightness-95">Delete</button>}
      </div>
    </div>
  );
};

const EditUserModal: React.FC<{ u: User; isSuper: boolean; onClose: () => void; onSaved: () => void }> = ({ u, onClose, onSaved }) => {
  const [f, setF] = useState({ name: u.name, specialty: u.specialty, gender: u.gender, qualifications: u.qualifications, experience: u.experience, email: u.email, phone: u.phone });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await updateUser(u.id, f);
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-headline-sm font-bold text-on-surface mb-4">Edit {u.name || u.id}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} /></Field>
          {u.role === 'employee' && <Field label="Specialty"><input value={f.specialty} onChange={(e) => setF({ ...f, specialty: e.target.value })} className={inputCls} /></Field>}
          <Field label="Gender"><input value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} className={inputCls} /></Field>
          <Field label="Qualifications"><input value={f.qualifications} onChange={(e) => setF({ ...f, qualifications: e.target.value })} className={inputCls} /></Field>
          <Field label="Experience"><input value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })} className={inputCls} /></Field>
          <Field label="Email"><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputCls} /></Field>
          <Field label="Phone"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputCls} /></Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-full font-bold text-sm border border-outline-variant text-on-surface-variant">Cancel</button>
          <button onClick={save} disabled={busy} className="px-5 py-2 rounded-full font-bold text-sm bg-primary text-on-primary disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Availability — daily CSV import + per-employee view + manual clinic-wide blocks
// ---------------------------------------------------------------------------
const AvailabilityTab: React.FC<{ users: User[] }> = ({ users }) => {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);

  const load = useCallback(async (d: string) => {
    try {
      setBlocked(await listBlocked(d));
    } catch {
      setBlocked([]);
    }
  }, []);
  useEffect(() => {
    load(date);
  }, [date, load]);

  const blockedTimes = new Set(blocked.filter((b) => b.staffId === 'any').map((b) => b.time));
  const toggle = async (time: string) => {
    if (blockedTimes.has(time)) await removeBlocked(`${date}|${time}|any`);
    else await addBlocked(date, time, 'any', 'Blocked by admin');
    load(date);
  };
  const isSunday = new Date(date + 'T00:00:00').getDay() === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Date"><input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
        <p className="text-body-sm text-on-surface-variant pb-2.5">
          Upload the morning's schedule below to block each therapist's booked times for this date.
        </p>
      </div>

      <CsvImportCard date={date} users={users} blocked={blocked} onChange={() => load(date)} />

      {/* Manual clinic-wide blocks (closes a time for everyone). */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-5 md:p-7 shadow-sm">
        <h3 className="text-headline-sm font-bold text-on-surface mb-1">Clinic-wide blocks</h3>
        <p className="text-body-sm text-on-surface-variant mb-4">Click a time to close it for <strong>every</strong> therapist (e.g. a clinic break). Separate from the CSV import.</p>
        {isSunday ? (
          <p className="text-body-md text-on-surface-variant">Sunday is closed — no slots to manage.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {SLOT_TIMES.map((t) => {
              const b = blockedTimes.has(t);
              return (
                <button key={t} onClick={() => toggle(t)} className={`py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${b ? 'bg-[#FEE4E2] text-[#B42318] border-[#FDA29B] line-through' : 'bg-transparent text-on-surface border-outline-variant hover:border-primary hover:text-primary'}`}>
                  {formatSlot(t)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Daily CSV importer: upload a sheet of each therapist's booked times → block them.
const CsvImportCard: React.FC<{ date: string; users: User[]; blocked: BlockedSlot[]; onChange: () => void }> = ({ date, users, blocked, onChange }) => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CsvApplyResult | null>(null);
  const [warn, setWarn] = useState<string>('');
  const [err, setErr] = useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);

  const employees = useMemo(() => users.filter((u) => u.role === 'employee'), [users]);
  const nameOf = (id: string) => employees.find((u) => u.id === id)?.name || id;

  // CSV blocks already saved for this date, grouped by employee.
  const csvByStaff = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const b of blocked) {
      if (b.source !== 'csv') continue;
      m.set(b.staffId, [...(m.get(b.staffId) || []), b.time].sort());
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [blocked]);

  const handleFile = async (file: File) => {
    setErr('');
    setWarn('');
    setResult(null);
    setBusy(true);
    try {
      const text = await file.text();
      const { entries, badTimes } = parseAvailabilityCsv(text);
      if (entries.length === 0) {
        setErr('No usable rows found. Each line should be: employee id (or name), then their booked times.');
        return;
      }
      const res = await applyCsvAvailability(date, entries);
      setResult(res);
      if (badTimes.length) setWarn(`Ignored ${badTimes.length} unrecognised time(s): ${badTimes.slice(0, 6).join(', ')}${badTimes.length > 6 ? '…' : ''}`);
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const lines = ['employee,times', ...employees.map((u) => `${u.id},`)];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `availability-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearCsv = async () => {
    if (!confirm(`Clear all uploaded availability for ${date}? Manual clinic-wide blocks stay.`)) return;
    setBusy(true);
    try {
      await clearCsvAvailability(date);
      setResult(null);
      onChange();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-5 md:p-7 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-headline-sm font-bold text-on-surface mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-primary">upload_file</span>
            Daily availability upload
          </h3>
          <p className="text-body-sm text-on-surface-variant max-w-xl">
            Upload each morning's CSV of therapists' booked times. Those slots vanish from the public booking grid for
            <strong> {prettyAdminDate(date)}</strong>. Re-uploading replaces this day's import.
          </p>
        </div>
        <button onClick={downloadTemplate} className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary px-3.5 py-2 rounded-full font-bold text-xs transition-colors">
          <span className="material-symbols-outlined text-[16px]">download</span>Template
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm cursor-pointer transition-all active:scale-95 ${busy ? 'bg-surface-container-high text-on-surface-variant cursor-wait' : 'bg-primary text-on-primary hover:brightness-95 shadow-md'}`}>
          <span className="material-symbols-outlined text-[18px]">{busy ? 'hourglass_top' : 'upload'}</span>
          {busy ? 'Uploading…' : 'Upload CSV'}
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" disabled={busy} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </label>
        {csvByStaff.length > 0 && (
          <button onClick={clearCsv} disabled={busy} className="flex items-center gap-1.5 border border-[#FDA29B] text-[#B42318] hover:bg-[#FEE4E2] px-4 py-2 rounded-full font-bold text-sm transition-colors disabled:opacity-60">
            <span className="material-symbols-outlined text-[16px]">delete_sweep</span>Clear upload
          </button>
        )}
      </div>

      {/* Format hint */}
      <details className="mt-4 group">
        <summary className="cursor-pointer text-body-sm font-bold text-primary select-none">CSV format</summary>
        <div className="mt-2 text-body-sm text-on-surface-variant space-y-1">
          <p>One row per therapist: their <strong>id or name</strong> first, then their booked times (comma or space separated).</p>
          <pre className="bg-surface-container-high/50 border border-outline-variant rounded-xl p-3 text-xs text-on-surface overflow-x-auto">{`employee,times
e1,10:00 10:45 11:30
e3,12:15, 13:00
Employee 5,all`}</pre>
          <p>Times accept <code>10:00</code>, <code>10am</code> or <code>10:00 AM</code>. Use <code>all</code> / <code>leave</code> / <code>off</code> to block a therapist's whole day.</p>
        </div>
      </details>

      {err && <p className="mt-3 text-body-sm text-[#B42318] flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">error</span>{err}</p>}
      {warn && <p className="mt-3 text-body-sm text-[#B54708] flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">warning</span>{warn}</p>}
      {result && (
        <div className="mt-3 bg-[#D1FADF]/40 border border-[#A6F4C5] rounded-xl px-4 py-3 text-body-sm text-[#027A48]">
          ✓ Blocked <strong>{result.blockedSlots}</strong> slot{result.blockedSlots === 1 ? '' : 's'} across <strong>{result.matched.length}</strong> therapist{result.matched.length === 1 ? '' : 's'}.
          {result.unmatched.length > 0 && (
            <span className="text-[#B42318]"> Couldn't match: {result.unmatched.join(', ')} — check the id/name spelling.</span>
          )}
        </div>
      )}

      {/* What's currently blocked by the upload */}
      {csvByStaff.length > 0 && (
        <div className="mt-5">
          <h4 className="text-label-md uppercase tracking-wider text-primary font-extrabold mb-2 text-xs">Booked today (from upload)</h4>
          <div className="space-y-2">
            {csvByStaff.map(([staffId, times]) => {
              const fullDay = times.length >= SLOT_TIMES.length;
              return (
                <div key={staffId} className="flex flex-wrap items-center gap-2 bg-surface-container-high/30 border border-outline-variant/60 rounded-xl px-3 py-2">
                  <span className="font-bold text-on-surface text-sm min-w-[8rem]">{nameOf(staffId)}</span>
                  {fullDay ? (
                    <Pill cls="bg-[#FEE4E2] text-[#B42318]">Unavailable all day</Pill>
                  ) : (
                    times.map((t) => (
                      <span key={t} className="text-[11px] font-bold text-[#B42318] bg-[#FEE4E2] px-2 py-0.5 rounded-full">{formatSlot(t)}</span>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const prettyAdminDate = (iso: string) => {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
};

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
const PaymentsTab: React.FC<{ bookings: BookingRequest[]; onChange: () => void }> = ({ bookings, onChange }) => {
  const setPayment = async (b: BookingRequest, payment: PaymentStatus) => {
    await updateBooking(b.id, { payment });
    onChange();
  };
  if (bookings.length === 0) return <EmptyState icon="payments" text="No bookings to track payments for yet." />;
  const ordered = [...bookings].sort((a, b) => Number(b.status === 'confirmed') - Number(a.status === 'confirmed'));
  return (
    <div className="space-y-3">
      {ordered.map((b) => (
        <div key={b.id} className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-4 md:p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-on-surface">{b.parentName || 'Unknown'}</h3>
              <Pill cls={STATUS_META[b.status].cls}>{STATUS_META[b.status].label}</Pill>
            </div>
            <p className="text-body-sm text-on-surface-variant">{b.sessionType} · 📞 {b.phone}</p>
          </div>
          <div className="flex items-center gap-3">
            <Pill cls={PAYMENT_META[b.payment].cls}>{PAYMENT_META[b.payment].label}</Pill>
            <select value={b.payment} onChange={(e) => setPayment(b, e.target.value as PaymentStatus)} className="bg-transparent border border-outline-variant rounded-full py-1.5 px-3 text-sm text-on-surface focus:border-primary outline-none cursor-pointer">
              <option value="pending">Pending</option>
              <option value="paid_online">Paid (Online)</option>
              <option value="pay_on_visit">Pay on Visit</option>
              <option value="waived">Waived</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
};

// shared bits
const inputCls = 'w-full bg-transparent border border-outline-variant rounded-xl py-2.5 px-3 text-sm text-on-surface focus:border-primary outline-none';
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">{label}</span>
    {children}
  </label>
);

export default AdminPage;
