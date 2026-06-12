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
  updateMyProfile,
  listMySessions,
  executeDbQuery,
} from '../lib/store';
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

const CLINIC_TAGLINES = [
  "Every voice deserves to be heard.",
  "Recharging confidence, one step at a time.",
  "Evidence-based care for sound communication.",
  "Restoring speech, language, and independence.",
  "Empowering communication, behavioral, and academic growth."
];

const FlyingBird: React.FC<{
  direction: 'ltr' | 'rtl';
  top: string;
  color: string;
  duration: string;
  delay: string;
  scale: number;
  flapDelay?: string;
}> = ({ direction, top, color, duration, delay, scale, flapDelay = '0s' }) => {
  const style = {
    position: 'absolute',
    top,
    '--fly-dur': duration,
    animationDelay: delay,
    transform: `scale(${scale})`,
  } as React.CSSProperties;

  return (
    <div
      className={`pointer-events-none select-none z-0 ${
        direction === 'ltr' ? 'animate-viewport-fly-ltr' : 'animate-viewport-fly-rtl'
      }`}
      style={style}
    >
      <svg width="24" height="12" viewBox="0 -8 24 12" className="overflow-visible">
        <path
          d="M 0 0 C 4 -6, 8 -6, 12 0 C 16 -6, 20 -6, 24 0 C 16 3, 8 3, 0 0 Z"
          fill={color}
          className="animate-bird-flap"
          style={{
            transformOrigin: '12px 0px',
            animationDelay: flapDelay,
          }}
        />
      </svg>
    </div>
  );
};

type Tab = 'requests' | 'employees' | 'availability' | 'payments' | 'database' | 'sessions' | 'profile';

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

  const path = window.location.pathname;
  const isEmployeePath = path.startsWith('/employee');

  useEffect(() => {
    document.title = isEmployeePath
      ? 'Employee Portal - Recharge Rehabilitation'
      : 'Admin - Recharge Rehabilitation';
    refreshMe().then((u) => {
      if (u) setUser(u);
      else setUser(null);
      setChecking(false);
    });
  }, [isEmployeePath]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  if (checking && !user) {
    return <div className="flex-grow bg-background grid place-items-center text-on-surface-variant">Loading…</div>;
  }
  if (!user) return <LoginForm onLoggedIn={setUser} isEmployeePath={isEmployeePath} />;
  return <AdminDashboard user={user} onLogout={handleLogout} />;
};

// ===========================================================================
// Login (shared by all roles)
// ===========================================================================
const LoginForm: React.FC<{ onLoggedIn: (u: User) => void; isEmployeePath: boolean }> = ({ onLoggedIn, isEmployeePath }) => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(() => localStorage.getItem('rr_remember') === '1');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Default portal mode: locked to employee if on /employee, otherwise starts at null on /admin
  const [portalMode, setPortalMode] = useState<'admin' | 'employee' | null>(isEmployeePath ? 'employee' : null);

  // Clinic taglines carousel state
  const [activeTaglineIdx, setActiveTaglineIdx] = useState(0);
  const [fadeTagline, setFadeTagline] = useState(true);

  // Option 2 (3D Card Tilt) state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Option 4 (Typing responsiveness tracking) state
  const [typingState, setTypingState] = useState<'username' | 'password' | 'none'>('none');

  // Option 1 (Dynamic greeting calculation based on hour)
  const systemHour = useMemo(() => new Date().getHours(), []);
  const greetingData = useMemo(() => {
    if (portalMode === null) return null;
    const roleName = portalMode === 'admin' ? 'Admin' : 'Therapist';
    if (systemHour >= 5 && systemHour < 12) {
      return { text: `Good morning, ${roleName}`, icon: 'wb_sunny', colorClass: 'text-amber-500' };
    } else if (systemHour >= 12 && systemHour < 17) {
      return { text: `Good afternoon, ${roleName}`, icon: 'sunny', colorClass: 'text-orange-500' };
    } else if (systemHour >= 17 && systemHour < 22) {
      return { text: `Good evening, ${roleName}`, icon: 'brightness_4', colorClass: 'text-indigo-400' };
    } else {
      return { text: `Good night, ${roleName}`, icon: 'nights_stay', colorClass: 'text-sky-300' };
    }
  }, [portalMode, systemHour]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeTagline(false);
      setTimeout(() => {
        setActiveTaglineIdx((idx) => (idx + 1) % CLINIC_TAGLINES.length);
        setFadeTagline(true);
      }, 300);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handlePop = () => {
      const isEmp = window.location.pathname.startsWith('/employee');
      setPortalMode(isEmp ? 'employee' : null);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      localStorage.setItem('rr_remember', remember ? '1' : '0');
      const u = await login(id.trim(), pw);

      // Security role validation
      if (portalMode === 'employee' && u.role !== 'employee') {
        await logout();
        setErr('Access Denied: This portal is only for employees.');
        return;
      }
      if (portalMode === 'admin' && u.role === 'employee') {
        await logout();
        setErr('Access Denied: Employees must login via the Employee Portal (/employee).');
        return;
      }

      onLoggedIn(u);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Calculate tilt angles (maximum 8 degrees tilt)
    const rotateY = ((x - centerX) / centerX) * 8;
    const rotateX = -((y - centerY) / centerY) * 8;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleCardPointerLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const fieldCls =
    'w-full bg-transparent border-0 rounded-2xl py-3.5 pl-11 pr-4 text-body-md text-on-surface outline-none transition-all duration-200';

  const bgStyle = {
    backgroundImage: `
      radial-gradient(circle at 0% 0%, rgb(var(--color-footer-dark) / 0.7) 0%, transparent 30%),
      radial-gradient(circle at 100% 100%, rgb(var(--color-footer-dark) / 0.65) 0%, transparent 30%)
    `
  };

  return (
    <div className="relative flex-grow min-h-screen overflow-hidden bg-background" style={bgStyle}>
      {/* Background Flying Birds (All over the screen, z-0) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <FlyingBird direction="ltr" top="10%" color="#3B82F6" duration="15s" delay="3s" scale={0.8} />
        <FlyingBird direction="rtl" top="18%" color="#EF4444" duration="12s" delay="5s" scale={0.95} flapDelay="0.1s" />
        <FlyingBird direction="ltr" top="28%" color="#10B981" duration="18s" delay="8s" scale={0.7} flapDelay="0.2s" />
        <FlyingBird direction="rtl" top="36%" color="#8B5CF6" duration="14s" delay="4s" scale={1.1} />
        <FlyingBird direction="ltr" top="45%" color="#F59E0B" duration="13s" delay="9s" scale={0.85} flapDelay="0.15s" />
        <FlyingBird direction="rtl" top="54%" color="#0EA5E9" duration="16s" delay="6s" scale={1.0} />
        <FlyingBird direction="ltr" top="65%" color="#EC4899" duration="14s" delay="10s" scale={0.75} flapDelay="0.05s" />
        <FlyingBird direction="rtl" top="73%" color="#84CC16" duration="19s" delay="7s" scale={0.8} />
        <FlyingBird direction="ltr" top="82%" color="#14B8A6" duration="11s" delay="5.5s" scale={0.95} flapDelay="0.1s" />
        <FlyingBird direction="rtl" top="90%" color="#F43F5E" duration="17s" delay="8.5s" scale={0.7} flapDelay="0.25s" />
        <FlyingBird direction="ltr" top="22%" color="#3B82F6" duration="20s" delay="11s" scale={0.85} />
        <FlyingBird direction="rtl" top="62%" color="#EF4444" duration="15s" delay="13s" scale={0.95} />
      </div>

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
          {/* Top: Brand letters & wordmark */}
          <div className="relative z-20 flex flex-col items-center md:items-start mb-6 mt-12 md:mt-0 gap-1.5 md:gap-2">
            {/* RECHARGE Letters */}
            <div className="flex items-center h-12 md:h-16 overflow-visible">
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
                    className="h-10 md:h-14 w-auto object-contain logo-word-rehabilitation logo-letter-3d cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* REHABILITATION wordmark */}
            <div className="animate-fade-in pl-1 md:pl-2" style={{ animationDelay: '2.1s', animationFillMode: 'both' }}>
              <img
                src="/images/logo-half.png"
                alt="Rehabilitation"
                className="h-6 md:h-8 w-auto object-contain logo-word-rehabilitation select-none"
              />
            </div>
          </div>

          {/* Center: Animated House Scene background */}
          <div className="w-full flex-grow flex items-center justify-center select-none z-10">
            <HeroBanner mode="backdrop" typingState={typingState} />
          </div>

          {/* Bottom: Tagline overlaid on the scene */}
          <div className="relative z-20 text-center md:text-left mt-8 md:mt-0 animate-fade-in flex flex-col items-center md:items-start w-full" style={{ animationDelay: '1.2s', animationFillMode: 'both' }}>
            <p className="text-headline-sm md:text-headline-md font-extrabold text-on-surface leading-snug max-w-xs">
              Discharged from the hospital&nbsp;—
            </p>
            <p className="text-headline-sm md:text-headline-md font-extrabold text-primary leading-snug max-w-xs">
              recharge with us.
            </p>

            {/* Glassmorphic Clinic Tagline Carousel */}
            <div className="w-full max-w-xs mt-6">
              <div className="bg-surface-container-lowest/30 backdrop-blur-md border border-outline-variant/30 rounded-2xl p-4 shadow-md flex items-start gap-3 select-none">
                <div className="w-8 h-8 rounded-xl bg-primary-fixed grid place-items-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[18px]">record_voice_over</span>
                </div>
                <div className="flex-grow min-h-[44px] flex items-center">
                  <p className={`text-body-sm font-medium text-on-surface-variant leading-relaxed text-left transition-opacity duration-300 ${fadeTagline ? 'opacity-100' : 'opacity-0'}`}>
                    {CLINIC_TAGLINES[activeTaglineIdx]}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right: sign-in form or portal selector ─── */}
        <div className="relative flex items-center justify-center px-6 py-12 md:py-0">
          <div
            onPointerMove={handleCardPointerMove}
            onPointerLeave={handleCardPointerLeave}
            className="relative z-10 w-full max-w-md bg-surface-container-lowest/40 backdrop-blur-xl border border-outline-variant/30 p-8 rounded-3xl shadow-2xl animate-fade-in-up"
            style={{
              animationDelay: '0.4s',
              animationFillMode: 'both',
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
              transformStyle: 'preserve-3d',
            }}
          >
            
            {portalMode === null ? (
              <>
                {/* Brand mark with glow ring */}
                <div className="relative w-14 h-14 mb-6 mx-auto md:mx-0">
                  <span className="absolute inset-0 rounded-2xl bg-primary/25 blur-xl animate-pulse-ring" />
                  <div className="relative w-14 h-14 rounded-2xl bg-primary-fixed grid place-items-center text-primary shadow-sm">
                    <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  </div>
                </div>

                <p className="text-label-md uppercase tracking-[0.2em] text-primary font-extrabold mb-1 text-xs text-center md:text-left">Recharge Rehabilitation</p>
                <h1 className="text-headline-lg font-extrabold text-on-surface mb-1.5 text-center md:text-left">Select Portal</h1>
                <p className="text-body-md text-on-surface-variant mb-8 text-center md:text-left">Choose your access level to sign in.</p>

                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setPortalMode('admin')}
                    className="w-full text-left bg-surface-container-lowest/60 hover:bg-surface-container-lowest active:scale-[0.99] border border-outline-variant/60 hover:border-primary/50 hover:shadow-lg rounded-[1.5rem] p-5 transition-all duration-300 group flex items-center gap-4 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-primary-fixed grid place-items-center text-primary group-hover:scale-110 transition-transform duration-300">
                      <span className="material-symbols-outlined text-[26px]">admin_panel_settings</span>
                    </div>
                    <div>
                      <h3 className="text-headline-sm font-bold text-on-surface group-hover:text-primary transition-colors">Admin Portal</h3>
                      <p className="text-body-sm text-on-surface-variant/80">Clinic configuration &amp; system settings</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.history.pushState({}, '', '/employee');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                      setPortalMode('employee');
                    }}
                    className="w-full text-left bg-surface-container-lowest/60 hover:bg-surface-container-lowest active:scale-[0.99] border border-outline-variant/60 hover:border-primary/50 hover:shadow-lg rounded-[1.5rem] p-5 transition-all duration-300 group flex items-center gap-4 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed grid place-items-center text-primary group-hover:scale-110 transition-transform duration-300">
                      <span className="material-symbols-outlined text-[26px]">groups</span>
                    </div>
                    <div>
                      <h3 className="text-headline-sm font-bold text-on-surface group-hover:text-primary transition-colors">Employee Portal</h3>
                      <p className="text-body-sm text-on-surface-variant/80">Therapist schedules &amp; client sessions</p>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Back to portals button */}
                <button
                  type="button"
                  onClick={() => {
                    window.history.pushState({}, '', '/admin');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                    setPortalMode(null);
                  }}
                  className="mb-4 flex items-center gap-1.5 text-body-sm text-on-surface-variant/70 hover:text-primary transition-colors cursor-pointer group"
                >
                  <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                  Back to portals
                </button>

                {/* Brand mark with glow ring */}
                <div className="relative w-14 h-14 mb-6">
                  <span className="absolute inset-0 rounded-2xl bg-primary/25 blur-xl animate-pulse-ring" />
                  <div className="relative w-14 h-14 rounded-2xl bg-primary-fixed grid place-items-center text-primary shadow-sm">
                    <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {portalMode === 'admin' ? 'admin_panel_settings' : 'groups'}
                    </span>
                  </div>
                </div>

                <p className="text-label-md uppercase tracking-[0.2em] text-primary font-extrabold mb-1 text-xs">Recharge Rehabilitation</p>
                <div className="flex items-center gap-2.5 mb-1.5">
                  {greetingData && (
                    <span className={`material-symbols-outlined text-[28px] ${greetingData.colorClass} select-none animate-bounce`}>
                      {greetingData.icon}
                    </span>
                  )}
                  <h1 className="text-headline-lg font-extrabold text-on-surface">
                    {greetingData ? greetingData.text : (portalMode === 'admin' ? 'Admin Login' : 'Employee Login')}
                  </h1>
                </div>
                <p className="text-body-md text-on-surface-variant mb-8">
                  {portalMode === 'admin'
                    ? 'Sign in to manage bookings, availability and your team.'
                    : 'Sign in to access therapist tools, client sessions, and schedules.'}
                </p>

                <form onSubmit={submit} className="space-y-4">
                  {/* Login ID */}
                  <div className="gradient-border-wrapper">
                    <div className="relative w-full bg-surface-container-lowest/90 rounded-[calc(1rem-1px)] flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant pointer-events-none">person</span>
                      <input
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        onFocus={() => setTypingState('username')}
                        onBlur={() => setTypingState('none')}
                        placeholder="Login ID"
                        autoFocus
                        autoCapitalize="none"
                        autoComplete="username"
                        className={fieldCls}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="gradient-border-wrapper">
                    <div className="relative w-full bg-surface-container-lowest/90 rounded-[calc(1rem-1px)] flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant pointer-events-none">lock</span>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        onFocus={() => setTypingState('password')}
                        onBlur={() => setTypingState('none')}
                        placeholder="Password"
                        autoComplete="current-password"
                        className={`${fieldCls} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        title={showPw ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40 transition-all duration-200 z-10 active:scale-90"
                      >
                        <div className="relative w-5 h-5 flex items-center justify-center pointer-events-none">
                          <span
                            className={`material-symbols-outlined text-[20px] absolute transition-all duration-300 transform ${
                              showPw ? 'opacity-0 scale-75 rotate-45' : 'opacity-100 scale-100 rotate-0'
                            }`}
                          >
                            visibility
                          </span>
                          <span
                            className={`material-symbols-outlined text-[20px] absolute transition-all duration-300 transform ${
                              showPw ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-45'
                            }`}
                          >
                            visibility_off
                          </span>
                        </div>
                      </button>
                    </div>
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

                <div className="flex items-center justify-center gap-2 mt-5 text-[11px] text-on-surface-variant/60 bg-surface-container-low/40 border border-outline-variant/30 py-1.5 px-3 rounded-full w-max mx-auto shadow-sm select-none">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="material-symbols-outlined text-[13px] text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                  <span>Secure SSL connection · Recharge Rehabilitation</span>
                </div>
              </>
            )}
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
  const [tab, setTab] = useState<Tab>(() => {
    return user.role === 'employee' ? 'sessions' : 'requests';
  });
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string>('');
  const [query, setQuery] = useState('');

  // Employee-specific state
  const [mySessions, setMySessions] = useState<BookingRequest[]>([]);
  const [meUser, setMeUser] = useState<User>(user);
  const [profileForm, setProfileForm] = useState({
    name: user.name, gender: user.gender || '', qualifications: user.qualifications || '',
    experience: user.experience || '', email: user.email || '', phone: user.phone || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSavedAt, setProfileSavedAt] = useState('');

  // Status state initialized from localStorage
  const [status, setStatusState] = useState<'online' | 'offline' | 'lunch'>(() => {
    return (localStorage.getItem('rr_staff_status') as 'online' | 'offline' | 'lunch') || 'online';
  });
  const [profileOpen, setProfileOpen] = useState(false);

  const updateStatus = (newStatus: 'online' | 'offline' | 'lunch') => {
    setStatusState(newStatus);
    localStorage.setItem('rr_staff_status', newStatus);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (user.role === 'employee') {
        const s = await listMySessions();
        setMySessions(s);
      } else {
        const [b, u] = await Promise.all([listBookings(), listUsers()]);
        setBookings(b);
        setUsers(u);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.role]);

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

  const tabs = useMemo(() => {
    if (user.role === 'employee') {
      return [
        { id: 'sessions' as Tab, label: 'Sessions', icon: 'today' },
        { id: 'profile' as Tab, label: 'My Profile', icon: 'person' },
      ];
    }
    return [
      { id: 'requests' as Tab, label: 'Bookings', icon: 'inbox' },
      { id: 'employees' as Tab, label: 'Employees', icon: 'badge' },
      { id: 'availability' as Tab, label: 'Availability', icon: 'event_busy' },
      { id: 'payments' as Tab, label: 'Payments', icon: 'payments' },
      { id: 'database' as Tab, label: 'Database', icon: 'table_chart' },
    ];
  }, [user.role]);

  const dashboardBgStyle = {
    backgroundImage: `
      linear-gradient(to bottom, 
        rgb(var(--color-primary-fixed) / 0.15) 0%, 
        transparent 50%,
        rgb(var(--color-footer-dark) / 0.2) 100%
      )
    `,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const
  };

  return (
    <div className="relative bg-background overflow-hidden" style={dashboardBgStyle}>
      {/* Top Navbar */}
      <header className="sticky top-0 w-full h-16 bg-surface-container-lowest/50 backdrop-blur-md border-b border-outline-variant/20 flex items-center justify-between px-6 md:px-8 z-30">
        <div className="flex items-center gap-3 shrink-0">
          <a href="/admin" className="flex flex-col gap-0.5 select-none shrink-0" aria-label="Recharge Rehabilitation Home">
            <div className="flex items-center h-6">
              {lettersData.map((letter) => (
                <img
                  key={letter.id}
                  alt={letter.char}
                  src={letter.src}
                  className="h-[18px] w-auto object-contain logo-word-rehabilitation"
                />
              ))}
            </div>
            <img
              src="/images/logo-half.png"
              alt="Rehabilitation"
              className="h-3.5 w-auto object-contain logo-word-rehabilitation select-none"
            />
          </a>
          <div className="h-4 w-px bg-outline-variant/40 hidden sm:block mx-1" />
          <span className="text-[17px] sm:text-[19px] md:text-[21px] font-extrabold text-on-surface-variant tracking-tight hidden sm:inline-block select-none">
            {user.role === 'super_admin' ? 'Super Admin Dashboard' : user.role === 'admin' ? 'Admin Dashboard' : 'Employee Dashboard'}
          </span>
        </div>

        {/* Search Bar in the middle */}
        <div className="flex-1 max-w-[140px] xs:max-w-[180px] sm:max-w-xs md:max-w-md mx-4 lg:mx-8">
          <div className="relative flex items-center w-full bg-surface-container-high/40 hover:bg-surface-container-high/70 focus-within:bg-surface-container-high/90 focus-within:ring-2 focus-within:ring-primary/20 border border-outline-variant/30 rounded-full px-3 py-1.5 transition-all duration-200">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] mr-2 select-none">search</span>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (tab !== 'requests') {
                  setTab('requests');
                }
              }}
              placeholder="Search bookings..."
              className="bg-transparent border-none outline-none text-xs sm:text-sm text-on-surface placeholder-on-surface-variant/50 w-full focus:ring-0"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-outline-variant/30 text-on-surface-variant transition-colors"
                title="Clear search"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
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
            className="text-on-surface-variant hover:text-primary hover:scale-110 transition-all duration-200 flex items-center justify-center p-1 mr-1"
            title="LinkedIn"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
          </a>

          <div className="w-px h-4 bg-outline-variant/40" />

          {/* Theme Toggle */}
          <ThemeToggle />

          <div className="w-px h-4 bg-outline-variant/40" />

          {/* Profile Button / Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="w-9 h-9 rounded-full bg-primary-fixed text-primary font-extrabold flex items-center justify-center hover:shadow-md active:scale-95 transition-all relative select-none cursor-pointer"
              title={meUser.name || meUser.id}
            >
              {(() => {
                const name = meUser.name || meUser.id || 'A';
                const parts = name.trim().split(/\s+/);
                if (parts.length >= 2) {
                  return (parts[0][0] + parts[1][0]).toUpperCase();
                }
                return name.substring(0, 2).toUpperCase();
              })()}
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface-container-lowest ${
                  status === 'online'
                    ? 'bg-emerald-500'
                    : status === 'lunch'
                    ? 'bg-amber-500'
                    : 'bg-slate-400'
                }`}
              />
            </button>

            {/* Click-away overlay */}
            {profileOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileOpen(false)}
              />
            )}

            {/* Profile Menu Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-2.5 w-60 bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/40 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in-up" style={{ animationDuration: '200ms' }}>
                <div className="pb-3 border-b border-outline-variant/30 mb-3">
                  <h4 className="font-bold text-on-surface text-sm">{meUser.name || 'Staff User'}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Pill cls={isSuper ? 'bg-[#FEE4E2] text-[#B42318] text-[9px] px-2 py-0.5' : 'bg-primary-fixed text-primary text-[9px] px-2 py-0.5'}>{ROLE_LABEL[meUser.role]}</Pill>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant/65 px-2 mb-1">Set Availability</p>
                  <button
                    onClick={() => { updateStatus('online'); setProfileOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-body-sm font-bold transition-colors cursor-pointer ${
                      status === 'online' ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-high/40 text-on-surface-variant'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Online
                    {status === 'online' && <span className="material-symbols-outlined text-[16px] ml-auto">check</span>}
                  </button>

                  <button
                    onClick={() => { updateStatus('lunch'); setProfileOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-body-sm font-bold transition-colors cursor-pointer ${
                      status === 'lunch' ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-high/40 text-on-surface-variant'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    On Lunch
                    {status === 'lunch' && <span className="material-symbols-outlined text-[16px] ml-auto">check</span>}
                  </button>

                  <button
                    onClick={() => { updateStatus('offline'); setProfileOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-body-sm font-bold transition-colors cursor-pointer ${
                      status === 'offline' ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-high/40 text-on-surface-variant'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    Offline
                    {status === 'offline' && <span className="material-symbols-outlined text-[16px] ml-auto">check</span>}
                  </button>
                </div>

                <div className="h-px bg-outline-variant/30 my-3" />

                <button
                  onClick={() => { setProfileOpen(false); onLogout(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-body-sm font-bold text-[#B42318] hover:bg-[#FEE4E2]/40 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Inner Layout: Sidebar + Dashboard Content */}
      <div className="flex flex-grow items-stretch">
        
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-outline-variant/20 bg-surface-container-lowest/30 backdrop-blur-md p-4 shrink-0 flex flex-col justify-between select-none">
          <div className="space-y-6">
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant/60 px-3">Management</p>
              <nav className="space-y-1">
                {tabs.map((t) => {
                  const active = tab === t.id;
                  const badge = t.id === 'requests' ? unseen.length : 0;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left text-body-sm font-bold transition-all relative cursor-pointer ${
                        active
                          ? 'bg-primary text-on-primary shadow-sm hover:brightness-105'
                          : 'text-on-surface-variant hover:bg-surface-container-high/60 hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                      {t.label}
                      {badge > 0 && (
                        <span
                          className={`ml-auto min-w-5 h-5 px-1.5 grid place-items-center rounded-full text-[10px] font-extrabold animate-pulse ${
                            active ? 'bg-on-primary text-primary' : 'bg-[#F04438] text-white'
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Bottom section of sidebar */}
          <div className="space-y-3 pt-4 border-t border-outline-variant/20">
            <button
              onClick={refresh}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 border border-outline-variant/60 hover:border-primary text-on-surface-variant hover:text-primary py-2 px-3 rounded-xl font-bold text-xs transition-colors cursor-pointer active:scale-95"
            >
              <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
              {loading ? 'Refreshing…' : 'Refresh Data'}
            </button>
            <div className="text-[10px] text-on-surface-variant/50 text-center">
              Recharge Rehabilitation Admin · v1.2
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-grow p-6 md:p-8 overflow-y-auto">
          {notice && (
            <div className="mb-5 flex items-center justify-between gap-4 bg-primary-fixed border border-primary/30 rounded-2xl px-5 py-3 shadow-sm animate-pulse">
              <span className="text-body-md font-bold text-primary">{notice}</span>
              <button onClick={() => setNotice('')} className="text-primary hover:opacity-70">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          )}

          {loading && bookings.length === 0 && <p className="text-body-sm text-on-surface-variant mb-4">Loading…</p>}

          {tab === 'requests' && (
            <RequestsTab bookings={bookings} staffName={staffName} isSuper={isSuper} unseenSessions={unseenSessions} unseenConsults={unseenConsults} onChange={refresh} query={query} />
          )}
          {tab === 'employees' && <EmployeesTab users={users} me={user} isSuper={isSuper} onChange={refresh} />}
          {tab === 'availability' && <AvailabilityTab users={users} />}
          {tab === 'payments' && <PaymentsTab bookings={bookings} onChange={refresh} />}
          {tab === 'database' && <DatabaseTab />}
          {tab === 'sessions' && <EmployeeSessionsTab sessions={mySessions} />}
          {tab === 'profile' && (
            <EmployeeProfileTab
              form={profileForm}
              setForm={setProfileForm}
              saving={profileSaving}
              savedAt={profileSavedAt}
              onSave={async (e) => {
                e.preventDefault();
                setProfileSaving(true);
                try {
                  const updated = await updateMyProfile(profileForm);
                  setMeUser(updated);
                  setProfileSavedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Failed to save');
                } finally {
                  setProfileSaving(false);
                }
              }}
            />
          )}
        </main>

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
  query: string;
}> = ({ bookings, staffName, isSuper, unseenSessions, unseenConsults, onChange, query }) => {
  const [source, setSource] = useState<BookingSource>('booking'); // default: Book Sessions
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');

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
      {/* Filter Row: toggle on left, status choices on right */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-outline-variant/20">
        <div className="flex flex-wrap items-center gap-3">
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

        <div className="flex flex-wrap items-center gap-2">
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
        </div>
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
                  <select value={b.payment} onChange={(e) => setPayment(b, e.target.value as PaymentStatus)} className="appearance-none bg-transparent border border-outline-variant rounded-full py-1 px-2.5 text-xs text-on-surface focus:border-primary outline-none cursor-pointer">
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
// Employee Profile View Modal
// ---------------------------------------------------------------------------
const UserProfileModal: React.FC<{ u: User; onClose: () => void; onEdit: () => void }> = ({ u, onClose, onEdit }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-[2rem] p-6 shadow-2xl relative animate-drop-down-spring" onClick={(e) => e.stopPropagation()}>
        {/* Close button at top right */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40 p-1.5 rounded-full transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Header Section */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-primary-fixed text-primary font-black text-xl flex items-center justify-center shadow-inner select-none">
            {u.name ? u.name.substring(0, 2).toUpperCase() : u.id.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-headline-md font-extrabold text-on-surface leading-tight">{u.name || u.id}</h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Pill cls={u.role === 'super_admin' ? 'bg-[#FEE4E2] text-[#B42318]' : u.role === 'admin' ? 'bg-primary-fixed text-primary' : 'bg-surface-container-high text-on-surface-variant'}>
                {ROLE_LABEL[u.role]}
              </Pill>
              <Pill cls={u.active ? 'bg-[#D1FADF] text-[#027A48]' : 'bg-surface-container-high text-on-surface-variant'}>
                {u.active ? 'Active Account' : 'Inactive Account'}
              </Pill>
            </div>
          </div>
        </div>

        {/* Profile Info Details Grid */}
        <div className="border-t border-outline-variant/30 pt-4 mb-6">
          <h4 className="text-label-md uppercase tracking-wider text-primary font-extrabold mb-3 text-xs">Profile Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-sm">
            <div>
              <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Login ID</span>
              <span className="font-semibold text-on-surface">{u.id}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Specialty / Role</span>
              <span className="font-semibold text-on-surface">{u.specialty || ROLE_LABEL[u.role]}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Gender</span>
              <span className="font-semibold text-on-surface">{u.gender || <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Qualifications</span>
              <span className="font-semibold text-on-surface">{u.qualifications || <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Work Experience</span>
              <span className="font-semibold text-on-surface">{u.experience || <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Email Address</span>
              <span className="font-semibold text-on-surface truncate block" title={u.email}>{u.email || <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Phone Number</span>
              <span className="font-semibold text-on-surface">{u.phone || <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Profile Status</span>
              <span className={`font-semibold ${u.profileComplete ? 'text-[#027A48]' : 'text-[#B54708]'}`}>
                {u.profileComplete ? 'Completed' : 'Pending / Complete profile requested'}
              </span>
            </div>
            {u.createdAt && (
              <div className="sm:col-span-2">
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Joined On</span>
                <span className="font-semibold text-on-surface">{new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 border-t border-outline-variant/30 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full font-bold text-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container-high/20 active:scale-95 transition-all"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-5 py-2 rounded-full font-bold text-sm bg-primary text-on-primary hover:brightness-95 active:scale-95 transition-all flex items-center gap-1.5 shadow"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span> Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
};

const UserCard: React.FC<{ u: User; isSuper: boolean; onToggle: (u: User) => void; onReset: (u: User) => void; onRemove: (u: User) => void; onEdit: (u: User) => void; onView: (u: User) => void }> = ({ u, isSuper, onToggle, onReset, onRemove, onEdit, onView }) => {
  const canEdit = isSuper || u.role === 'employee';
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={() => onView(u)}
            className="w-10 h-10 rounded-full bg-primary-fixed grid place-items-center text-primary shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all"
            title="View full profile"
          >
            <span className="material-symbols-outlined text-[20px]">{u.role === 'employee' ? 'badge' : 'shield_person'}</span>
          </div>
          <div className="min-w-0">
            <p
              onClick={() => onView(u)}
              className="font-bold text-on-surface truncate cursor-pointer hover:underline hover:text-primary transition-all"
              title="View full profile"
            >
              {u.name || u.id}
            </p>
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

// ---------------------------------------------------------------------------
// Employees / accounts
// ---------------------------------------------------------------------------
const EmployeesTab: React.FC<{ users: User[]; me: User; isSuper: boolean; onChange: () => void }> = ({ users, isSuper, onChange }) => {
  const [form, setForm] = useState({ id: '', name: '', password: '', role: 'employee' as Role, specialty: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [viewing, setViewing] = useState<User | null>(null);

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
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={`${inputCls} appearance-none cursor-pointer`} disabled={!isSuper}>
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
            <UserCard key={u.id} u={u} isSuper={isSuper} onToggle={toggleActive} onReset={reset} onRemove={remove} onEdit={setEditing} onView={setViewing} />
          ))}
        </div>
      </div>

      {/* Employees */}
      <div>
        <h3 className="text-label-md uppercase tracking-wider text-primary font-extrabold mb-3">Employees ({employees.length})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {employees.map((u) => (
            <UserCard key={u.id} u={u} isSuper={isSuper} onToggle={toggleActive} onReset={reset} onRemove={remove} onEdit={setEditing} onView={setViewing} />
          ))}
        </div>
      </div>

      {viewing && (
        <UserProfileModal
          u={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
        />
      )}

      {editing && <EditUserModal u={editing} isSuper={isSuper} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChange(); }} />}
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
            <select value={b.payment} onChange={(e) => setPayment(b, e.target.value as PaymentStatus)} className="appearance-none bg-transparent border border-outline-variant rounded-full py-1.5 px-3 text-sm text-on-surface focus:border-primary outline-none cursor-pointer">
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

// ---------------------------------------------------------------------------
// Database - Live Viewer and Raw SQL Query Editor
// ---------------------------------------------------------------------------
const DatabaseTab: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>('bookings');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [data, setData] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [customSql, setCustomSql] = useState<string>('SELECT * FROM bookings LIMIT 10;');
  const [executing, setExecuting] = useState<boolean>(false);
  const [execResult, setExecResult] = useState<{ rows: any[]; rowCount: number; fields: any[] } | null>(null);
  const [execError, setExecError] = useState<string>('');

  const tables = ['bookings', 'users', 'blocked_slots', 'staff', 'sessions'];

  const fetchTableData = async (table: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await executeDbQuery(`SELECT * FROM ${table} LIMIT 100;`);
      setData(res.rows);
      setFields(res.fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch table data');
      setData([]);
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData(selectedTable);
  }, [selectedTable]);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSql.trim()) return;
    setExecuting(true);
    setExecError('');
    setExecResult(null);
    try {
      const res = await executeDbQuery(customSql);
      setExecResult(res);
      const sqlLower = customSql.toLowerCase();
      if (sqlLower.includes('update') || sqlLower.includes('delete') || sqlLower.includes('insert') || sqlLower.includes('create') || sqlLower.includes('drop')) {
        fetchTableData(selectedTable);
      }
    } catch (err) {
      setExecError(err instanceof Error ? err.message : 'Database query execution failed');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Table Quick Viewer */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">table_chart</span> Database Table Viewer
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-0.5">Quickly browse live table records (capped at 100 rows)</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Select Table:</span>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="appearance-none bg-surface-container-high border border-outline-variant rounded-full py-1.5 px-3 text-sm text-on-surface focus:border-primary outline-none cursor-pointer font-bold"
            >
              {tables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FEE4E2] border border-[#FECDCA] rounded-xl text-[#B42318] text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-body-sm text-on-surface-variant">Loading table data...</p>
        ) : data.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant py-4 italic">No rows found in table '{selectedTable}'.</p>
        ) : (
          <div className="overflow-x-auto border border-outline-variant/60 rounded-xl max-h-[300px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-surface-container-high sticky top-0 border-b border-outline-variant/60">
                <tr>
                  {fields.map(f => (
                    <th key={f.name} className="p-3 font-extrabold text-on-surface-variant uppercase tracking-wider border-r border-outline-variant/30 last:border-0">{f.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-surface-container-low/40 transition-colors">
                    {fields.map(f => {
                      const val = row[f.name];
                      const displayVal = val === null || val === undefined ? (
                        <span className="text-on-surface-variant/40 italic">null</span>
                      ) : typeof val === 'object' ? (
                        JSON.stringify(val)
                      ) : typeof val === 'boolean' ? (
                        val ? 'TRUE' : 'FALSE'
                      ) : (
                        String(val)
                      );
                      return (
                        <td key={f.name} className="p-3 border-r border-outline-variant/30 last:border-0 truncate max-w-[200px]" title={String(val)}>
                          {displayVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SQL Query Editor */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-5 shadow-sm">
        <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary">terminal</span> Live SQL Query Editor
        </h2>
        <p className="text-body-sm text-on-surface-variant mb-4">
          Execute arbitrary SQL statements directly against the local system. 
          <span className="font-semibold text-amber-600 dark:text-amber-400"> Warning: INSERT, UPDATE, and DELETE operations will modify live data permanently.</span>
        </p>

        <form onSubmit={handleExecute} className="space-y-4">
          <div className="border border-outline-variant rounded-xl overflow-hidden focus-within:border-primary transition-colors">
            <textarea
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              rows={4}
              placeholder="SELECT * FROM bookings LIMIT 10;"
              className="w-full bg-surface-container-lowest p-4 font-mono text-sm text-on-surface outline-none border-none resize-y"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant font-bold">Suggestions:</span>
              <button
                type="button"
                onClick={() => setCustomSql('SELECT * FROM bookings ORDER BY requested_at DESC LIMIT 5;')}
                className="text-[11px] bg-surface-container-high hover:bg-primary/10 hover:text-primary transition px-2.5 py-1 rounded-full text-on-surface-variant font-bold border border-outline-variant/40"
              >
                Recent Bookings
              </button>
              <button
                type="button"
                onClick={() => setCustomSql('SELECT id, name, role, active FROM users;')}
                className="text-[11px] bg-surface-container-high hover:bg-primary/10 hover:text-primary transition px-2.5 py-1 rounded-full text-on-surface-variant font-bold border border-outline-variant/40"
              >
                List Users
              </button>
              <button
                type="button"
                onClick={() => setCustomSql('UPDATE bookings SET notes = \'Admin verified\' WHERE id = \'YOUR_ID_HERE\';')}
                className="text-[11px] bg-surface-container-high hover:bg-primary/10 hover:text-primary transition px-2.5 py-1 rounded-full text-on-surface-variant font-bold border border-outline-variant/40"
              >
                Update Booking
              </button>
            </div>
            <button
              type="submit"
              disabled={executing}
              className="bg-primary text-on-primary hover:brightness-95 active:scale-95 disabled:opacity-60 transition px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow"
            >
              {executing ? 'Executing...' : (
                <>
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span> Execute Query
                </>
              )}
            </button>
          </div>
        </form>

        {execError && (
          <div className="mt-5 p-4 bg-[#FEE4E2] border border-[#FECDCA] rounded-xl text-[#B42318] font-mono text-xs whitespace-pre-wrap flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            <div>
              <p className="font-bold mb-1">Database Error</p>
              {execError}
            </div>
          </div>
        )}

        {execResult && (
          <div className="mt-5 border border-outline-variant/60 rounded-xl overflow-hidden">
            <div className="bg-surface-container-high px-4 py-2 flex items-center justify-between border-b border-outline-variant/60">
              <span className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">Query Results</span>
              <span className="text-xs font-bold text-primary">{execResult.rowCount} rows affected / returned</span>
            </div>
            {execResult.rows && execResult.rows.length > 0 ? (
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead className="bg-surface-container-low sticky top-0 border-b border-outline-variant/60">
                    <tr>
                      {execResult.fields.map(f => (
                        <th key={f.name} className="p-3 border-r border-outline-variant/30 last:border-0 font-bold text-on-surface">{f.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {execResult.rows.map((row, index) => (
                      <tr key={index} className="hover:bg-surface-container-low/40">
                        {execResult.fields.map(f => {
                          const val = row[f.name];
                          const displayVal = val === null || val === undefined ? (
                            <span className="text-on-surface-variant/40 italic">null</span>
                          ) : typeof val === 'object' ? (
                            JSON.stringify(val)
                          ) : typeof val === 'boolean' ? (
                            val ? 'TRUE' : 'FALSE'
                          ) : (
                            String(val)
                          );
                          return (
                            <td key={f.name} className="p-3 border-r border-outline-variant/30 last:border-0 truncate max-w-[200px]" title={String(val)}>
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-surface-container-low text-body-sm text-on-surface-variant italic">
                Query executed successfully. No rows were returned (e.g. INSERT, UPDATE or DELETE operation).
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Employee — Sessions view
// ---------------------------------------------------------------------------
const EmployeeSessionsTab: React.FC<{ sessions: BookingRequest[] }> = ({ sessions }) => {
  const today = todayISO();
  const todays = useMemo(() => sessions.filter((s) => s.date === today), [sessions, today]);
  const upcoming = useMemo(() => sessions.filter((s) => s.date && s.date > today), [sessions, today]);

  const SessionRow: React.FC<{ s: BookingRequest }> = ({ s }) => (
    <div className="flex items-center justify-between gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3">
      <div className="min-w-0">
        <p className="font-bold text-on-surface text-sm truncate">{s.parentName || 'Client'} · {s.sessionType}</p>
        <p className="text-body-sm text-on-surface-variant">{s.mode === 'online' ? 'Online' : 'In-Clinic'} · {s.slot ? formatSlot(s.slot) : 'time TBD'}{s.date ? ` · ${s.date}` : ''}</p>
      </div>
      <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-fixed text-primary shrink-0">{s.status}</span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm">
        <h2 className="text-headline-sm font-bold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">today</span>Today's sessions
        </h2>
        {todays.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant italic">No sessions assigned for today.</p>
        ) : (
          <div className="space-y-2">{todays.map((s) => <SessionRow key={s.id} s={s} />)}</div>
        )}
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm">
        <h2 className="text-headline-sm font-bold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">event_upcoming</span>Upcoming sessions
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant italic">Nothing scheduled ahead.</p>
        ) : (
          <div className="space-y-2">{upcoming.slice(0, 8).map((s) => <SessionRow key={s.id} s={s} />)}</div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Employee — Profile edit view
// ---------------------------------------------------------------------------
const EmployeeProfileTab: React.FC<{
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  saving: boolean;
  savedAt: string;
  onSave: (e: React.FormEvent) => void;
}> = ({ form, setForm, saving, savedAt, onSave }) => {
  return (
    <form onSubmit={onSave} className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm max-w-2xl">
      <h2 className="text-headline-sm font-bold text-on-surface mb-1 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">person</span>My profile
      </h2>
      <p className="text-body-sm text-on-surface-variant mb-4">
        Your login ID, password, and specialty are managed by the clinic admin.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">Full name</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">Gender</span>
          <input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="e.g. Female" className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">Qualifications</span>
          <input value={form.qualifications} onChange={(e) => setForm({ ...form, qualifications: e.target.value })} placeholder="e.g. MASLP" className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">Work experience</span>
          <input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="e.g. 4 years" className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">Email</span>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">Phone</span>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
        </label>
      </div>
      <div className="flex items-center gap-3 mt-6">
        <button type="submit" disabled={saving} className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold text-sm hover:brightness-95 active:scale-95 transition disabled:opacity-60">
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {savedAt && <span className="text-body-sm text-[#027A48]">Saved at {savedAt}</span>}
      </div>
    </form>
  );
};

export default AdminPage;
