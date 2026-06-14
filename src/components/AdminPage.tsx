import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  login,
  logout,
  refreshMe,
  getCurrentUser,
  listBookings,
  updateBooking,
  deleteBooking,
  createAdminBooking,
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
  resetMyPassword,
  applyLeave,
  listMyLeaves,
  listAllLeaves,
  updateLeaveStatus,
  markLeavesSeen,
  punchIn,
  getTodayAttendance,
  type LeaveRequest,
  type AttendanceRecord,
  calculateSalary,
  getSalarySettings,
  updateSalarySettings,
  postSalarySlip,
  listSalarySlips,
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

type Tab = 'requests' | 'employees' | 'availability' | 'payments' | 'database' | 'dashboard' | 'sessions' | 'profile' | 'salary' | 'offer_letter' | 'leaves' | 'reset_password' | 'compensation';

const STATUS_META: Record<BookingStatus, { label: string; cls: string }> = {
  requested: { label: 'Requested', cls: 'bg-primary-fixed text-primary' },
  confirmed: { label: 'Confirmed', cls: 'bg-[#D1FADF] text-[#027A48]' },
  cancelled: { label: 'Cancelled', cls: 'bg-[#FEE4E2] text-[#B42318]' },
  completed: { label: 'Completed', cls: 'bg-surface-container-high text-on-surface-variant' },
  Blocked: { label: 'Blocked Slot', cls: 'bg-[#FEF0C7] text-[#B54708]' },
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
    return user.role === 'employee' ? 'dashboard' : 'requests';
  });
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string>('');
  const [query, setQuery] = useState('');

  // Employee-specific state
  const [mySessions, setMySessions] = useState<BookingRequest[]>([]);
  const [meUser, setMeUser] = useState<User>(user);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);


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
        const [s, l, att] = await Promise.all([
          listMySessions(),
          listMyLeaves(),
          getTodayAttendance().catch(() => null)
        ]);
        setMySessions(s);
        setMyLeaves(l);
        setTodayAttendance(att);
      } else {
        const [b, u, lr] = await Promise.all([
          listBookings(),
          listUsers(),
          listAllLeaves().catch(() => [])
        ]);
        setBookings(b);
        setUsers(u);
        setAllLeaves(lr);
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
  const pendingLeaves = useMemo(() => allLeaves.filter(lr => lr.status === 'pending'), [allLeaves]);
  const [noticeShown, setNoticeShown] = useState(false);
  useEffect(() => {
    if (!noticeShown && unseen.length > 0) {
      setNotice(`🔔 ${unseen.length} new since your last visit — ${unseenSessions} session${unseenSessions === 1 ? '' : 's'}, ${unseenConsults} consultation${unseenConsults === 1 ? '' : 's'}.`);
      setNoticeShown(true);
    } else if (!noticeShown && user.role !== 'employee' && pendingLeaves.length > 0) {
      setNotice(`🔔 There are ${pendingLeaves.length} pending leave request(s) requiring review.`);
      setNoticeShown(true);
    }
  }, [unseen.length, noticeShown, unseenSessions, unseenConsults, pendingLeaves.length, user.role]);

  const staffName = (id: string) => (id === 'any' ? 'No preference' : users.find((u) => u.id === id)?.name ?? id);

  const tabs = useMemo(() => {
    if (user.role === 'employee') {
      return [
        { id: 'dashboard' as Tab, label: 'Dashboard', icon: 'dashboard' },
        { id: 'sessions' as Tab, label: 'Sessions', icon: 'today' },
        { id: 'profile' as Tab, label: 'My Profile', icon: 'person' },
        { id: 'reset_password' as Tab, label: 'Reset Password', icon: 'lock_reset' },
        { id: 'salary' as Tab, label: 'Salary Slip', icon: 'receipt_long' },
        { id: 'offer_letter' as Tab, label: 'Offer Letter', icon: 'description' },
        { id: 'leaves' as Tab, label: 'Leave Requests', icon: 'event_busy' },
      ];
    }
    return [
      { id: 'requests' as Tab, label: 'Bookings', icon: 'inbox' },
      { id: 'employees' as Tab, label: 'Employees', icon: 'badge' },
      { id: 'availability' as Tab, label: 'Availability', icon: 'event_busy' },
      { id: 'payments' as Tab, label: 'Payments', icon: 'payments' },
      { id: 'compensation' as Tab, label: 'Salary & Incentive', icon: 'paid' },
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

          {user.role === 'employee' && (
            <div className="flex items-center">
              {todayAttendance ? (
                <div className="flex items-center gap-1.5 bg-[#D1FADF] text-[#027A48] px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm select-none">
                  <span className="material-symbols-outlined text-[16px] animate-pulse">check_circle</span>
                  Punched In {todayAttendance.punchIn.slice(0, 5)}
                </div>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      const res = await punchIn();
                      setTodayAttendance(res);
                      alert(`Punched in successfully at ${res.punchIn}! Marked as Present.`);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : 'Punch in failed');
                    }
                  }}
                  className="flex items-center gap-1.5 bg-primary text-on-primary hover:brightness-105 active:scale-95 px-4 py-1.5 rounded-full text-xs font-black transition-all shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                  Punch In
                </button>
              )}
              <div className="w-px h-4 bg-outline-variant/40 mx-3" />
            </div>
          )}

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
                  const badge = t.id === 'requests'
                    ? unseen.length
                    : (t.id === 'employees' ? pendingLeaves.length : 0);
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
            <RequestsTab bookings={bookings} staffName={staffName} isSuper={isSuper} unseenSessions={unseenSessions} unseenConsults={unseenConsults} onChange={refresh} query={query} users={users} />
          )}
          {tab === 'employees' && <EmployeesTab users={users} isSuper={isSuper} allLeaves={allLeaves} onChange={refresh} />}
          {tab === 'availability' && <AvailabilityTab users={users} />}
          {tab === 'payments' && <PaymentsTab bookings={bookings} onChange={refresh} />}
          {tab === 'compensation' && <CompensationTab users={users} allLeaves={allLeaves} onChange={refresh} />}
          {tab === 'database' && <DatabaseTab />}
          {tab === 'dashboard' && <EmployeeDashboardTab user={meUser} sessions={mySessions} />}
          {tab === 'sessions' && <EmployeeSessionsTab sessions={mySessions} />}
          {tab === 'profile' && (
            <EmployeeProfileTab
              user={meUser}
              onSave={async (payload) => {
                const updated = await updateMyProfile(payload);
                setMeUser(updated);
              }}
            />
          )}
          {tab === 'salary' && <EmployeeSalarySlipTab user={meUser} />}
          {tab === 'offer_letter' && <EmployeeOfferLetterTab user={meUser} />}
          {tab === 'reset_password' && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm max-w-xl">
              <SelfPasswordResetSection />
            </div>
          )}
          {tab === 'leaves' && (
            <EmployeeLeavesTab
              myLeaves={myLeaves}
              allLeaves={allLeaves}
              isSuper={isSuper}
              user={meUser}
              onRefresh={refresh}
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
  users: User[];
}> = ({ bookings, staffName, isSuper, unseenSessions, unseenConsults, onChange, query, users }) => {
  const [source, setSource] = useState<BookingSource>('booking'); // default: Book Sessions
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    source: 'booking' as BookingSource,
    specialistId: 'any',
    sessionType: 'Occupational Therapy',
    date: todayISO(),
    slot: '10:00',
    mode: 'clinic' as 'clinic' | 'online',
    parentName: '',
    childAge: '',
    phone: '',
    concern: '',
    notes: '',
    status: 'confirmed' as BookingStatus,
    payment: 'pay_on_visit' as PaymentStatus,
  });

  const employees = useMemo(() => users.filter((u) => u.role === 'employee'), [users]);

  const handleCreateBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.parentName) {
      alert('Client/Parent Name is required.');
      return;
    }
    setIsCreating(true);
    try {
      await createAdminBooking({
        ...form,
        seen: true,
      });
      alert('Booking created successfully.');
      setShowCreateModal(false);
      // Reset form
      setForm({
        source: 'booking',
        specialistId: 'any',
        sessionType: 'Occupational Therapy',
        date: todayISO(),
        slot: '10:00',
        mode: 'clinic',
        parentName: '',
        childAge: '',
        phone: '',
        concern: '',
        notes: '',
        status: 'confirmed',
        payment: 'pay_on_visit',
      });
      onChange();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create booking.');
    } finally {
      setIsCreating(false);
    }
  };

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary font-black">calendar_today</span>
            Booking Requests & Schedule Management
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Create, view, confirm, or cancel client sessions and consultations.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-on-primary hover:brightness-105 active:scale-95 px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px] font-bold">add</span>
          Create Manual Booking
        </button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <form 
            onSubmit={handleCreateBookingSubmit}
            className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-2xl space-y-4 animate-drop-down-spring max-h-[90vh] overflow-y-auto text-on-surface" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-3">
              <span className="material-symbols-outlined text-primary font-black">edit_calendar</span>
              Create Manual Booking
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="block col-span-2">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Booking Source</span>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value as BookingSource })}
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none"
                >
                  <option value="booking">Book Session (Standard)</option>
                  <option value="consultation">Consultation Request</option>
                </select>
              </label>

              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Assigned Specialist</span>
                <select
                  value={form.specialistId}
                  onChange={(e) => setForm({ ...form, specialistId: e.target.value })}
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none"
                >
                  <option value="any">Any Specialist / Auto</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.specialty || 'Therapist'})</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Session Type</span>
                <input
                  type="text"
                  value={form.sessionType}
                  onChange={(e) => setForm({ ...form, sessionType: e.target.value })}
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none"
                  placeholder="e.g. Speech Therapy"
                />
              </label>

              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none"
                />
              </label>

              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Time Slot</span>
                <select
                  value={form.slot}
                  onChange={(e) => setForm({ ...form, slot: e.target.value })}
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none"
                >
                  {SLOT_TIMES.map(t => (
                    <option key={t} value={t}>{formatSlot(t)}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Session Mode</span>
                <select
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value as 'clinic' | 'online' })}
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none"
                >
                  <option value="clinic">In-Clinic Session</option>
                  <option value="online">Online Session</option>
                </select>
              </label>

              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Payment Status</span>
                <select
                  value={form.payment}
                  onChange={(e) => setForm({ ...form, payment: e.target.value as PaymentStatus })}
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="paid_online">Paid (Online)</option>
                  <option value="pay_on_visit">Pay on Visit</option>
                </select>
              </label>

              <label className="block col-span-2 border-t border-outline-variant/30 pt-2">
                <span className="block font-bold text-primary mb-1 uppercase tracking-wide">Client/Parent Name *</span>
                <input
                  type="text"
                  value={form.parentName}
                  onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                  className="w-full bg-transparent border border-primary/30 focus:border-primary rounded-xl py-2.5 px-3 text-sm text-on-surface outline-none font-semibold"
                  placeholder="Full Name of Parent / Client"
                  required
                />
              </label>

              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Child's Age (years)</span>
                <input
                  type="text"
                  value={form.childAge}
                  onChange={(e) => setForm({ ...form, childAge: e.target.value })}
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none"
                  placeholder="e.g. 5"
                />
              </label>

              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Phone Number</span>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none"
                  placeholder="e.g. +91 9876543210"
                />
              </label>

              <label className="block col-span-2">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Concern / Primary Reason</span>
                <input
                  type="text"
                  value={form.concern}
                  onChange={(e) => setForm({ ...form, concern: e.target.value })}
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none"
                  placeholder="Primary concerns or goals..."
                />
              </label>

              <label className="block col-span-2">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Administrative Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none min-h-[60px]"
                  placeholder="Internal notes or special instructions..."
                />
              </label>

              <label className="block col-span-2">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Booking Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as BookingStatus })}
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none"
                >
                  <option value="confirmed">Confirmed (Approved)</option>
                  <option value="requested">Requested (Pending Review)</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-outline-variant hover:bg-surface-container-high/30 rounded-full font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="bg-primary text-on-primary hover:brightness-105 active:scale-95 px-5 py-2 rounded-full font-bold text-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-60"
              >
                {isCreating ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </form>
        </div>
      )}

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
  const parseJson = (str: any) => {
    try { return str ? JSON.parse(str) : null; } catch { return null; }
  };
  const ed10 = parseJson(u.education10th);
  const ed12 = parseJson(u.education12th);
  const edGrad = parseJson(u.educationGrad);
  const exp = parseJson(u.pastExperience);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-[2rem] p-6 shadow-2xl relative animate-drop-down-spring max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Actions at top right */}
        <div className="absolute top-5 right-5 flex items-center gap-2 print-hide">
          <button
            onClick={() => printDocument('admin-user-profile-print')}
            className="text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40 p-1.5 rounded-full transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            title="Print Profile"
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
          </button>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40 p-1.5 rounded-full transition-all active:scale-90 flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div id="admin-user-profile-print" className="space-y-6 text-on-surface bg-transparent">

        {/* Header Section */}
        <div className="flex items-center gap-4 mb-6">
          {u.profileImage ? (
            <img src={u.profileImage} alt="Profile" className="w-16 h-16 rounded-full object-cover border border-outline-variant shadow-inner select-none" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary-fixed text-primary font-black text-xl flex items-center justify-center shadow-inner select-none">
              {u.name ? u.name.substring(0, 2).toUpperCase() : u.id.substring(0, 2).toUpperCase()}
            </div>
          )}
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

        {/* Details Grid */}
        <div className="space-y-6">
          {/* General info */}
          <div className="border-t border-outline-variant/30 pt-4">
            <h4 className="text-label-md uppercase tracking-wider text-primary font-extrabold mb-3 text-xs">Profile Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm text-on-surface">
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Login ID</span>
                <span className="font-semibold">{u.id}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Specialty / Role</span>
                <span className="font-semibold">{u.specialty || ROLE_LABEL[u.role]}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Gender</span>
                <span className="font-semibold">{u.gender || <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Qualifications</span>
                <span className="font-semibold">{u.qualifications || <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Work Experience Summary</span>
                <span className="font-semibold">{u.experience || <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Email Address</span>
                <span className="font-semibold truncate block" title={u.email}>{u.email || <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Phone Number</span>
                <span className="font-semibold">{u.phone ? `+91 ${u.phone}` : <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Alternative Phone</span>
                <span className="font-semibold">{u.extraPhone ? `+91 ${u.extraPhone}` : <span className="text-on-surface-variant/40 italic">None</span>}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Address</span>
                <span className="font-semibold">{u.address || <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
              </div>
            </div>
          </div>

          {/* Parent/Guardian Info */}
          {u.role === 'employee' && (
            <div className="border-t border-outline-variant/30 pt-4">
              <h4 className="text-label-md uppercase tracking-wider text-primary font-extrabold mb-3 text-xs">Parent / Guardian Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm text-on-surface">
                <div>
                  <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Name</span>
                  <span className="font-semibold">{u.parentName || <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Relation</span>
                  <span className="font-semibold">{u.parentRelation || <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Contact Phone</span>
                  <span className="font-semibold">{u.parentPhone ? `+91 ${u.parentPhone}` : <span className="text-on-surface-variant/40 italic">Not specified</span>}</span>
                </div>
              </div>
            </div>
          )}

          {/* Education Details */}
          {u.role === 'employee' && (
            <div className="border-t border-outline-variant/30 pt-4">
              <h4 className="text-label-md uppercase tracking-wider text-primary font-extrabold mb-3 text-xs">Education Records</h4>
              <div className="space-y-3 text-xs text-on-surface">
                {/* 10th */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-high/20 border border-outline-variant/40 rounded-xl p-3">
                  <div>
                    <p className="font-bold text-sm">10th Standard</p>
                    <p className="text-on-surface-variant">School/Board: {ed10?.school || '—'} · Year: {ed10?.year || '—'} · Grade: {ed10?.grade || '—'}</p>
                  </div>
                  {ed10?.file && (
                    <a href={ed10.file} download={`${u.id}_10th_marksheet`} className="bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">download</span> Download Marksheet
                    </a>
                  )}
                </div>
                {/* 12th */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-high/20 border border-outline-variant/40 rounded-xl p-3">
                  <div>
                    <p className="font-bold text-sm">12th Standard</p>
                    <p className="text-on-surface-variant">School/Board: {ed12?.school || '—'} · Year: {ed12?.year || '—'} · Grade: {ed12?.grade || '—'}</p>
                  </div>
                  {ed12?.file && (
                    <a href={ed12.file} download={`${u.id}_12th_marksheet`} className="bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">download</span> Download Marksheet
                    </a>
                  )}
                </div>
                {/* Graduation */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-high/20 border border-outline-variant/40 rounded-xl p-3">
                  <div>
                    <p className="font-bold text-sm">{edGrad?.degree || 'Graduation / Degree'}</p>
                    <p className="text-on-surface-variant">College/Univ: {edGrad?.school || '—'} · Year: {edGrad?.year || '—'} · Grade/GPA: {edGrad?.grade || '—'}</p>
                  </div>
                  {edGrad?.file && (
                    <a href={edGrad.file} download={`${u.id}_degree_certificate`} className="bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">download</span> Download Degree
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Past Experience Details */}
          {u.role === 'employee' && (
            <div className="border-t border-outline-variant/30 pt-4">
              <h4 className="text-label-md uppercase tracking-wider text-primary font-extrabold mb-3 text-xs">Work History Documents</h4>
              {u.isFirstJob ? (
                <p className="text-xs text-on-surface-variant italic">This is the employee's first job (no prior experience letter).</p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-high/20 border border-outline-variant/40 rounded-xl p-3 text-xs text-on-surface">
                  <div>
                    <p className="font-bold text-sm">Previous Employer: {exp?.company || '—'}</p>
                    <p className="text-on-surface-variant">Role: {exp?.role || '—'} · Duration: {exp?.duration || '—'}</p>
                  </div>
                  {exp?.file && (
                    <a href={exp.file} download={`${u.id}_experience_letter`} className="bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">download</span> Download Letter
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status info */}
          <div className="border-t border-outline-variant/30 pt-4 flex flex-wrap justify-between items-center gap-2 text-xs">
            <div>
              <span className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Profile Status</span>
              <span className={`font-semibold ${u.profileComplete ? 'text-[#027A48]' : 'text-[#B54708]'}`}>
                {u.profileComplete ? 'Complete' : 'Pending profile fields completion'}
              </span>
            </div>
            {u.createdAt && (
              <div className="text-right">
                <span className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Joined On</span>
                <span className="font-semibold">{new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 border-t border-outline-variant/30 pt-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full font-bold text-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container-high/20 active:scale-95 transition-all cursor-pointer select-none"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-5 py-2 rounded-full font-bold text-sm bg-primary text-on-primary hover:brightness-95 active:scale-95 transition-all flex items-center gap-1.5 shadow cursor-pointer select-none"
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
const EmployeesTab: React.FC<{
  users: User[];
  isSuper: boolean;
  allLeaves: LeaveRequest[];
  onChange: () => void;
}> = ({ users, isSuper, allLeaves, onChange }) => {
  const [form, setForm] = useState({ id: '', name: '', password: '', role: 'employee' as Role, specialty: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [viewing, setViewing] = useState<User | null>(null);
  const [subTab, setSubTab] = useState<'accounts' | 'leaves'>('accounts');

  useEffect(() => {
    if (subTab === 'leaves') {
      markLeavesSeen().catch(console.error);
    }
  }, [subTab]);

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
  const pendingLeavesCount = allLeaves.filter((l) => l.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Sub tabs switcher */}
      <div className="flex gap-2 border-b border-outline-variant/20 pb-3 flex-wrap">
        <button
          onClick={() => setSubTab('accounts')}
          className={`px-4 py-2 rounded-full font-bold text-xs transition-colors cursor-pointer ${
            subTab === 'accounts'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Manage Accounts
        </button>
        <button
          onClick={() => setSubTab('leaves')}
          className={`px-4 py-2 rounded-full font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
            subTab === 'leaves'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Leave Requests
          {pendingLeavesCount > 0 && (
            <span className="bg-[#F04438] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full grid place-items-center animate-bounce">
              {pendingLeavesCount}
            </span>
          )}
        </button>
      </div>

      {subTab === 'accounts' ? (
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
        </div>
      ) : (
        <LeavesApprovalList leaves={allLeaves} isSuper={isSuper} onRefresh={onChange} />
      )}

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

const LeavesApprovalList: React.FC<{
  leaves: LeaveRequest[];
  isSuper: boolean;
  onRefresh: () => void;
}> = ({ leaves, isSuper, onRefresh }) => {
  const [acting, setActing] = useState<string | null>(null);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setActing(id);
    try {
      await updateLeaveStatus(id, status);
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(null);
    }
  };

  const pendingCount = leaves.filter((l) => l.status === 'pending').length;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-headline-sm font-bold text-on-surface">Employee Leave Requests</h3>
        <span className="bg-[#FEF0C7] text-[#B54708] text-xs font-bold px-3 py-1 rounded-full">{pendingCount} Pending</span>
      </div>

      {leaves.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant italic">No leave requests recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 text-xs text-on-surface-variant uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface">
              {leaves.map((l) => (
                <tr key={l.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-sm">{l.employeeName || l.userId}</p>
                    <p className="text-[11px] text-on-surface-variant">{l.employeeSpecialty || 'Therapist'}</p>
                  </td>
                  <td className="py-3.5 px-4 capitalize font-semibold text-xs text-primary">{l.leaveType}</td>
                  <td className="py-3.5 px-4 font-medium text-xs">
                    <div>{l.startDate} to {l.endDate}</div>
                    <div className="text-[10px] text-on-surface-variant mt-0.5">
                      Applied {new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-on-surface-variant max-w-xs truncate" title={l.reason}>
                    {l.reason || <span className="italic opacity-50">No reason provided</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      l.status === 'approved' ? 'bg-[#D1FADF] text-[#027A48]' :
                      l.status === 'rejected' ? 'bg-[#FEE4E2] text-[#B42318]' :
                      'bg-[#FEF0C7] text-[#B54708]'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {l.status === 'pending' ? (
                      isSuper ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            disabled={acting === l.id}
                            onClick={() => handleAction(l.id, 'approved')}
                            className="bg-[#D1FADF] text-[#027A48] hover:bg-[#027A48] hover:text-white px-3 py-1.5 rounded-full text-xs font-bold transition disabled:opacity-60 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            disabled={acting === l.id}
                            onClick={() => handleAction(l.id, 'rejected')}
                            className="bg-[#FEE4E2] text-[#B42318] hover:bg-[#B42318] hover:text-white px-3 py-1.5 rounded-full text-xs font-bold transition disabled:opacity-60 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#B54708] font-bold bg-[#FEF0C7]/40 px-2.5 py-1 rounded-full select-none">
                          Pending Super Admin Action
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-on-surface-variant font-bold capitalize select-none">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};



const EditUserModal: React.FC<{ u: User; isSuper: boolean; onClose: () => void; onSaved: () => void }> = ({ u, onClose, onSaved }) => {
  const [f, setF] = useState({ 
    name: u.name, 
    specialty: u.specialty, 
    gender: u.gender, 
    qualifications: u.qualifications, 
    experience: u.experience, 
    email: u.email, 
    phone: u.phone,
    baseSalary: u.baseSalary || 35000
  });
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
          <Field label="Phone">
            <div className="relative flex items-center">
              <span className="absolute left-3 text-on-surface-variant font-bold select-none text-xs">+91</span>
              <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={`${inputCls} pl-12`} />
            </div>
          </Field>
          {u.role === 'employee' && (
            <Field label="Base Salary (₹)">
              <input 
                type="number" 
                value={f.baseSalary} 
                onChange={(e) => setF({ ...f, baseSalary: parseInt(e.target.value) || 0 })} 
                className={inputCls} 
              />
            </Field>
          )}
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
const EmployeeDashboardTab: React.FC<{ user: User; sessions: BookingRequest[] }> = ({ user, sessions }) => {
  const today = todayISO();
  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [est, setEst] = useState<any>(null);
  const [loadingSalary, setLoadingSalary] = useState(false);

  useEffect(() => {
    setLoadingSalary(true);
    calculateSalary(user.id, currentMonth)
      .then(setEst)
      .catch(() => setEst(null))
      .finally(() => setLoadingSalary(false));
  }, [user.id, currentMonth]);

  const todays = useMemo(() => sessions.filter((s) => s.date === today), [sessions, today]);
  const clientSessions = useMemo(() => todays.filter((s) => s.source !== 'blocked'), [todays]);
  const blockedSessions = useMemo(() => todays.filter((s) => s.source === 'blocked'), [todays]);

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Welcome Card & Live Earnings Projections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Welcome */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-headline-md font-black text-on-surface">Hello, {user.name || 'Staff Member'}!</h2>
            <p className="text-body-sm text-on-surface-variant mt-1.5">
              Welcome to your dashboard. Here is an overview of your schedule and availability for today, <strong className="text-primary">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
            </p>
          </div>
          <div className="flex gap-4 shrink-0 flex-wrap">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-3 text-center min-w-[120px]">
              <span className="block text-[10px] uppercase font-black tracking-wider text-primary">Client Sessions</span>
              <span className="text-2xl font-black text-primary">{clientSessions.length}</span>
            </div>
            <div className="bg-[#FEF0C7] border border-[#FDE293] rounded-2xl px-5 py-3 text-center min-w-[120px]">
              <span className="block text-[10px] uppercase font-black tracking-wider text-[#B54708]">Blocked Slots</span>
              <span className="text-2xl font-black text-[#B54708]">{blockedSessions.length}</span>
            </div>
          </div>
        </div>

        {/* Live Earnings Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-extrabold text-xs text-on-surface-variant uppercase tracking-wider">Estimated Earnings Progress</h4>
            <span className="text-[10px] bg-primary/10 text-primary font-black uppercase px-2 py-0.5 rounded-full">{new Date().toLocaleDateString('en-IN', { month: 'short' })} projection</span>
          </div>
          
          {loadingSalary ? (
            <p className="text-xs text-on-surface-variant italic py-4">Calculating monthly earnings...</p>
          ) : est ? (
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-2xl font-black text-[#027A48]">₹{est.netSalary.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-on-surface-variant font-bold">Base: ₹{est.baseSalary.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[11px] text-on-surface-variant space-y-1 pt-1 border-t border-outline-variant/30">
                <div className="flex justify-between"><span>Sessions incentive:</span><span className="font-bold text-primary">+₹{est.incentive.toLocaleString('en-IN')} ({est.sessionsCount} sessions)</span></div>
                <div className="flex justify-between"><span>Leaves taken:</span><span className="font-bold text-[#B42318]">{est.totalLeaves} day(s) {est.sandwichLeavesCount > 0 && ` (+${est.sandwichLeavesCount} sandwich)`}</span></div>
                {est.deductions > 0 ? (
                  <div className="flex justify-between"><span>Leaves deduction:</span><span className="font-bold text-[#B42318]">-₹{est.deductions.toLocaleString('en-IN')}</span></div>
                ) : (
                  <div className="flex justify-between"><span>Unused leaves bonus:</span><span className="font-bold text-[#027A48]">+₹{est.bonus.toLocaleString('en-IN')}</span></div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant italic py-4">No payroll information available.</p>
          )}
        </div>
      </div>

      {/* Main Today View with chronologically detailed timeline (Booked vs Free Slots) */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm">
        <h3 className="text-title-large font-bold text-on-surface mb-4 flex items-center gap-2 border-b border-outline-variant/30 pb-3">
          <span className="material-symbols-outlined text-primary">today</span>
          Today's Schedule & Slot Timeline
        </h3>

        <div className="space-y-3">
          {SLOT_TIMES.map((time) => {
            const s = todays.find((x) => x.slot === time);
            if (s) {
              const isBlocked = s.source === 'blocked';
              return (
                <div
                  key={time}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border rounded-2xl p-4 transition-all hover:shadow-sm ${
                    isBlocked
                      ? 'bg-[#FEF0C7]/20 border-[#FDE293] text-on-surface'
                      : 'bg-surface-container-lowest border-outline-variant text-on-surface'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isBlocked ? 'bg-[#FEF0C7] text-[#B54708]' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {isBlocked ? 'block' : s.mode === 'online' ? 'laptop_mac' : 'home_clinic'}
                      </span>
                    </div>
                    <div>
                      {isBlocked ? (
                        <div>
                          <p className="font-extrabold text-[#B54708] text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{s.sessionType === 'CSV Schedule Block' ? `Child: ${s.parentName}` : `Blocked Slot: ${s.parentName}`}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-[#FEF0C7] text-[#B54708] rounded-full uppercase tracking-wider font-extrabold border border-[#FDE293]">
                              {s.sessionType}
                            </span>
                          </p>
                          <p className="text-xs text-on-surface-variant/80 mt-1">
                            {s.sessionType === 'CSV Schedule Block'
                              ? `This slot is scheduled for your daily session with child ${s.parentName}.`
                              : 'This time slot has been blocked for you by the Admin. No public bookings can be placed here.'}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-extrabold text-on-surface text-sm">
                            Client: {s.parentName || 'Client'} · <span className="text-primary">{s.sessionType}</span>
                          </p>
                          <p className="text-xs text-on-surface-variant/80 mt-1 font-semibold">
                            {s.mode === 'online' ? 'Online Session' : 'In-Clinic Session'}
                          </p>
                        </div>
                      )}
                      <p className="text-[11px] font-bold text-on-surface-variant mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        Time: {formatSlot(time)}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-outline-variant/20 pt-2.5 sm:pt-0">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                        isBlocked ? 'bg-[#FEF0C7] text-[#B54708]' : 'bg-[#D1FADF] text-[#027A48]'
                      }`}
                    >
                      {isBlocked ? 'Blocked' : s.status}
                    </span>
                    {!isBlocked && (
                      <span className="text-[10px] font-bold text-on-surface-variant">
                        Payment: {s.payment === 'paid_online' ? 'Paid' : s.payment === 'pay_on_visit' ? 'Pay on Visit' : s.payment}
                      </span>
                    )}
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  key={time}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-dashed border-[#D1FADF] bg-[#D1FADF]/5 rounded-2xl p-4 text-on-surface hover:bg-[#D1FADF]/10 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-[#D1FADF] text-[#027A48] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </div>
                    <div>
                      <p className="font-extrabold text-[#027A48] text-sm">
                        Free Slot
                      </p>
                      <p className="text-xs text-on-surface-variant/80 mt-1">
                        No bookings scheduled. You are available to receive direct appointments or walk-ins.
                      </p>
                      <p className="text-[11px] font-bold text-on-surface-variant mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        Time: {formatSlot(time)}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-[#D1FADF]/20 pt-2.5 sm:pt-0">
                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#D1FADF] text-[#027A48]">
                      Available
                    </span>
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Employee — Sessions view
// ---------------------------------------------------------------------------
const EmployeeSessionsTab: React.FC<{ sessions: BookingRequest[] }> = ({ sessions }) => {
  const today = todayISO();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const months = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (s.date) {
        set.add(s.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [sessions]);

  const formatYearMonth = (ym: string) => {
    if (ym === 'TBD') return 'Date TBD';
    const [year, month] = ym.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const groupedSessions = useMemo(() => {
    const filtered = sessions.filter((s) => {
      if (selectedPeriod === 'date') {
        return s.date === selectedDate;
      }
      if (selectedPeriod === 'all') return true;
      if (selectedPeriod === 'today_upcoming') return s.date >= today;
      if (selectedPeriod === 'past') return s.date < today;
      return s.date && s.date.startsWith(selectedPeriod);
    });

    const groups: Record<string, BookingRequest[]> = {};
    filtered.forEach((s) => {
      const key = s.date ? s.date.substring(0, 7) : 'TBD';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    // Sort keys descending
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .reduce((obj, key) => {
        obj[key] = groups[key];
        return obj;
      }, {} as Record<string, BookingRequest[]>);
  }, [sessions, selectedPeriod, selectedDate, today]);

  const SessionRow: React.FC<{ s: BookingRequest }> = ({ s }) => {
    const isBlocked = s.source === 'blocked';
    const isPast = s.date && s.date < today;
    return (
      <div
        className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 transition ${
          isBlocked
            ? 'bg-[#FEF0C7]/10 border-[#FDE293]/60'
            : isPast
            ? 'bg-surface-container-low/40 border-outline-variant/20'
            : 'bg-surface-container-lowest border-outline-variant'
        }`}
      >
        <div className="min-w-0">
          <p className="font-bold text-on-surface text-sm truncate flex items-center gap-1.5 flex-wrap">
            <span>{isBlocked && s.sessionType === 'CSV Schedule Block' ? `Child: ${s.parentName}` : s.parentName || 'Client'}</span>
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isBlocked ? 'bg-[#FEF0C7] text-[#B54708]' : 'bg-primary/10 text-primary'
            }`}>
              {s.sessionType}
            </span>
          </p>
          <p className="text-body-sm text-on-surface-variant">
            {s.mode === 'online' ? 'Online' : 'In-Clinic'} · {s.slot ? formatSlot(s.slot) : 'time TBD'}
            {s.date ? ` · ${s.date}` : ''}
          </p>
        </div>
        <span
          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
            isBlocked ? 'bg-[#FEF0C7] text-[#B54708]' : 'bg-primary-fixed text-primary'
          }`}
        >
          {isBlocked ? 'Blocked' : s.status}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Header and Filter panel */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">calendar_month</span>
            My Sessions Logs
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Browse and filter your history of assigned client sessions and blocked slots.
          </p>
        </div>

        {/* Dropdown & Calendar Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Calendar Picker */}
          <div className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-container-high/80 border border-outline-variant rounded-full py-1.5 px-4 text-xs font-bold text-on-surface transition focus-within:ring-2 focus-within:ring-primary/20">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant select-none">calendar_today</span>
            <span>Choose Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedPeriod(e.target.value ? 'date' : 'all');
              }}
              className="bg-transparent text-xs text-on-surface outline-none cursor-pointer border-none p-0 focus:ring-0 w-28 font-bold"
            />
            {selectedDate && (
              <button
                onClick={() => {
                  setSelectedDate('');
                  setSelectedPeriod('all');
                }}
                className="text-on-surface-variant hover:text-primary transition p-0.5"
                title="Clear date filter"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>

          <span className="text-xs text-on-surface-variant/40 font-bold hidden sm:inline">or</span>

          {/* Period Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant">Filter Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                if (e.target.value !== 'date') {
                  setSelectedDate('');
                }
              }}
              className="bg-surface-container-high border border-outline-variant rounded-full py-1.5 px-4 text-xs font-bold text-on-surface outline-none cursor-pointer focus:border-primary"
            >
              <option value="all">All Sessions</option>
              <option value="today_upcoming">Today & Upcoming</option>
              <option value="past">Previous Days (History)</option>
              <optgroup label="Previous Months">
                {months.map((m) => (
                  <option key={m} value={m}>
                    {formatYearMonth(m)}
                  </option>
                ))}
              </optgroup>
              {selectedPeriod === 'date' && (
                <option value="date" disabled>Selected Date</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Grouped Month Views */}
      <div className="space-y-6">
        {Object.keys(groupedSessions).length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-8 text-center">
            <p className="text-body-md text-on-surface-variant italic font-semibold">No sessions match the selected filter criteria.</p>
          </div>
        ) : (
          Object.keys(groupedSessions).map((monthKey) => (
            <div key={monthKey} className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm space-y-4">
              <h3 className="text-title-medium font-extrabold text-primary border-b border-outline-variant/30 pb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">event</span>
                {formatYearMonth(monthKey)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedSessions[monthKey].map((s) => (
                  <SessionRow key={s.id} s={s} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Employee — Profile edit view
// ---------------------------------------------------------------------------
const handleFileToBase64 = (file: File, callback: (base64: string) => void) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    callback(reader.result as string);
  };
  reader.readAsDataURL(file);
};

const printDocument = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) return;

  // Clone current document styles (style and link tags)
  let stylesHTML = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((style) => {
    stylesHTML += style.outerHTML;
  });

  const clone = element.cloneNode(true) as HTMLElement;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Print Document</title>
  ${stylesHTML}
  <style>
    body {
      background-color: #ffffff !important;
      color: #000000 !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    #offer-letter-print, #salary-slip-print, #employee-profile-print, #admin-user-profile-print {
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      padding: 1.5cm !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
    }
    @media print {
      body {
        padding: 0 !important;
        margin: 0 !important;
      }
      #offer-letter-print, #salary-slip-print, #employee-profile-print, #admin-user-profile-print {
        padding: 1.5cm !important;
      }
    }
  </style>
</head>
<body class="bg-white">
  <div>
    ${clone.outerHTML}
  </div>
  <script>
    window.onload = function() {
      window.focus();
      window.print();
      setTimeout(() => {
        window.frameElement.remove();
      }, 1000);
    };
    if (document.readyState === 'complete') {
      window.focus();
      window.print();
      setTimeout(() => {
        window.frameElement.remove();
      }, 1000);
    }
  </script>
</body>
</html>
  `;

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();
};

const downloadDocument = (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  const clone = element.cloneNode(true) as HTMLElement;
  const title = filename.replace(/\.[^/.]+$/, "");
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: #f8fafc;
      padding: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .download-wrapper {
      width: 100%;
      max-width: 800px;
    }
    #offer-letter-print, #salary-slip-print, #employee-profile-print, #admin-user-profile-print {
      background: #ffffff !important;
      color: #000000 !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 1.5rem !important;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
      padding: 3rem !important;
    }
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .download-wrapper {
        max-width: 100%;
      }
      #offer-letter-print, #salary-slip-print, #employee-profile-print, #admin-user-profile-print {
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="download-wrapper">
    ${clone.outerHTML}
  </div>
</body>
</html>
  `;
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const FileUploader: React.FC<{
  label: string;
  value?: string;
  onChange: (base64: string) => void;
}> = ({ label, value, onChange }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5 mt-2 bg-surface-container-high/20 border border-outline-variant/30 rounded-xl p-3">
      <span className="text-body-xs font-bold text-on-surface-variant">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-surface-container-high hover:bg-surface-container-high/80 text-on-surface hover:text-primary border border-outline-variant/50 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer select-none"
        >
          Select File
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileToBase64(file, onChange);
          }}
          className="hidden"
          accept="image/*,application/pdf"
        />
        {value ? (
          <div className="flex items-center gap-1.5 text-xs text-[#027A48] font-bold">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            File uploaded
            <a
              href={value}
              download={`${label.replace(/\s+/g, '_')}_document`}
              className="text-primary hover:underline ml-1 cursor-pointer flex items-center"
              title="Download file"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
            </a>
          </div>
        ) : (
          <span className="text-body-xs text-on-surface-variant/40 italic">No file uploaded (optional)</span>
        )}
      </div>
    </div>
  );
};

const SelfPasswordResetSection: React.FC = () => {
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!newPw) { alert('New password cannot be empty'); return; }
    if (newPw !== confirmPw) { alert('Passwords do not match'); return; }
    setBusy(true);
    try {
      await resetMyPassword(newPw);
      setNewPw('');
      setConfirmPw('');
      setMsg('✓ Password updated successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-headline-sm font-bold text-on-surface mb-2 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-primary text-[28px]">lock_reset</span>
        Reset Password
      </h3>
      <p className="text-body-sm text-on-surface-variant">
        Reset your own account password securely.
      </p>
      <form onSubmit={handleReset} className="space-y-4 max-w-md">
        <label className="block">
          <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">New Password</span>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="Type new password"
            className={inputCls}
            required
          />
        </label>
        <label className="block">
          <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">Confirm New Password</span>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Re-type new password"
            className={inputCls}
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy || !newPw || !confirmPw}
          className="w-full bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm hover:brightness-105 active:scale-95 transition disabled:opacity-60 cursor-pointer shadow"
        >
          {busy ? 'Updating…' : 'Change Password'}
        </button>
      </form>
      {msg && <p className="text-sm text-[#027A48] font-bold mt-2">{msg}</p>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Employee — Profile edit view
// ---------------------------------------------------------------------------
const EmployeeProfileTab: React.FC<{
  user: User;
  onSave: (updatedUser: any) => Promise<void>;
}> = ({ user, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState('');

  const parseJson = (str: any) => {
    try { return str ? (typeof str === 'string' ? JSON.parse(str) : str) : null; } catch { return null; }
  };

  // Local form state
  const [form, setForm] = useState(() => ({
    name: user.name || '',
    gender: user.gender || '',
    qualifications: user.qualifications || '',
    experience: user.experience || '',
    email: user.email || '',
    phone: user.phone || '',
    profileImage: user.profileImage || '',
    parentName: user.parentName || '',
    parentRelation: user.parentRelation || '',
    parentPhone: user.parentPhone || '',
    address: user.address || '',
    extraPhone: user.extraPhone || '',
    isFirstJob: !!user.isFirstJob,
    education10th: parseJson(user.education10th) || { school: '', year: '', grade: '', file: '' },
    education12th: parseJson(user.education12th) || { school: '', year: '', grade: '', file: '' },
    educationGrad: parseJson(user.educationGrad) || { degree: '', school: '', year: '', grade: '', file: '' },
    pastExperience: parseJson(user.pastExperience) || { company: '', role: '', duration: '', file: '' },
  }));

  // Synchronize local form when user changes (e.g. from props update or initial load)
  useEffect(() => {
    setForm({
      name: user.name || '',
      gender: user.gender || '',
      qualifications: user.qualifications || '',
      experience: user.experience || '',
      email: user.email || '',
      phone: user.phone || '',
      profileImage: user.profileImage || '',
      parentName: user.parentName || '',
      parentRelation: user.parentRelation || '',
      parentPhone: user.parentPhone || '',
      address: user.address || '',
      extraPhone: user.extraPhone || '',
      isFirstJob: !!user.isFirstJob,
      education10th: parseJson(user.education10th) || { school: '', year: '', grade: '', file: '' },
      education12th: parseJson(user.education12th) || { school: '', year: '', grade: '', file: '' },
      educationGrad: parseJson(user.educationGrad) || { degree: '', school: '', year: '', grade: '', file: '' },
      pastExperience: parseJson(user.pastExperience) || { company: '', role: '', duration: '', file: '' },
    });
  }, [user]);

  const handleCancel = () => {
    // Reset to user props and exit edit mode
    setForm({
      name: user.name || '',
      gender: user.gender || '',
      qualifications: user.qualifications || '',
      experience: user.experience || '',
      email: user.email || '',
      phone: user.phone || '',
      profileImage: user.profileImage || '',
      parentName: user.parentName || '',
      parentRelation: user.parentRelation || '',
      parentPhone: user.parentPhone || '',
      address: user.address || '',
      extraPhone: user.extraPhone || '',
      isFirstJob: !!user.isFirstJob,
      education10th: parseJson(user.education10th) || { school: '', year: '', grade: '', file: '' },
      education12th: parseJson(user.education12th) || { school: '', year: '', grade: '', file: '' },
      educationGrad: parseJson(user.educationGrad) || { degree: '', school: '', year: '', grade: '', file: '' },
      pastExperience: parseJson(user.pastExperience) || { company: '', role: '', duration: '', file: '' },
    });
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        education10th: JSON.stringify(form.education10th),
        education12th: JSON.stringify(form.education12th),
        educationGrad: JSON.stringify(form.educationGrad),
        pastExperience: JSON.stringify(form.pastExperience),
      };
      await onSave(payload);
      setSavedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      setIsEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    const edu10 = parseJson(user.education10th) || { school: '', year: '', grade: '', file: '' };
    const edu12 = parseJson(user.education12th) || { school: '', year: '', grade: '', file: '' };
    const grad = parseJson(user.educationGrad) || { degree: '', school: '', year: '', grade: '', file: '' };
    const exp = parseJson(user.pastExperience) || { company: '', role: '', duration: '', file: '' };

    return (
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        {/* Buttons Header (not printed) */}
        <div className="flex justify-end gap-2 flex-wrap print-hide">
          <button
            onClick={() => downloadDocument('employee-profile-print', `Profile_${user.name || 'Staff'}.html`)}
            className="bg-secondary text-on-secondary hover:brightness-105 active:scale-95 px-5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Download Profile
          </button>
          <button
            onClick={() => printDocument('employee-profile-print')}
            className="bg-primary text-on-primary hover:brightness-105 active:scale-95 px-5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Print Profile
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-surface-container-high hover:bg-surface-container-high/80 border border-outline-variant/60 text-on-surface px-5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Edit Profile
          </button>
        </div>

        {/* Profile Printable Area */}
        <div id="employee-profile-print" className="space-y-6 bg-transparent text-on-surface">
          {/* Profile Hero Header */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-28 h-28 rounded-full border-2 border-primary/20 overflow-hidden bg-surface-container-high/40 flex items-center justify-center shadow-inner shrink-0">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[64px] text-on-surface-variant/40">person</span>
                )}
              </div>
              <div className="text-center sm:text-left space-y-1.5 flex-1">
                <h2 className="text-headline-md font-black text-on-surface leading-tight">{user.name || 'Staff Member'}</h2>
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                    {user.specialty || 'Therapist'}
                  </span>
                  <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-xs font-bold">
                    ID: {user.id}
                  </span>
                </div>
                <p className="text-body-xs text-on-surface-variant">
                  Account registered on {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

        {/* Main Info Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Details & Contact */}
          <div className="space-y-6 md:col-span-1">
            {/* General Information */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm space-y-4">
              <h3 className="text-title-medium font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-2">
                <span className="material-symbols-outlined text-primary">badge</span>
                General Info
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider block">Gender</span>
                  <span className="font-semibold text-on-surface">{user.gender || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider block">Qualifications</span>
                  <span className="font-semibold text-on-surface">{user.qualifications || 'Not specified'}</span>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm space-y-4">
              <h3 className="text-title-medium font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-2">
                <span className="material-symbols-outlined text-primary">contacts</span>
                Contact Details
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider block">Email Address</span>
                  <span className="font-semibold text-on-surface break-all">{user.email || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider block">Primary Phone</span>
                  <span className="font-semibold text-on-surface">{user.phone ? `+91 ${user.phone}` : 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider block">Alternative Phone</span>
                  <span className="font-semibold text-on-surface">{user.extraPhone ? `+91 ${user.extraPhone}` : 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider block">Residential Address</span>
                  <span className="font-semibold text-on-surface whitespace-pre-line">{user.address || 'Not specified'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Columns - family, education, experience */}
          <div className="space-y-6 md:col-span-2">
            {/* Parent Info */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm space-y-4">
              <h3 className="text-title-medium font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-2">
                <span className="material-symbols-outlined text-primary">family_restroom</span>
                Parent / Guardian Info
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider block">Guardian Name</span>
                  <span className="font-semibold text-on-surface">{user.parentName || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider block">Relation</span>
                  <span className="font-semibold text-on-surface">{user.parentRelation || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider block">Contact Number</span>
                  <span className="font-semibold text-on-surface">{user.parentPhone ? `+91 ${user.parentPhone}` : 'Not specified'}</span>
                </div>
              </div>
            </div>

            {/* Education Info */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm space-y-4">
              <h3 className="text-title-medium font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-2">
                <span className="material-symbols-outlined text-primary">school</span>
                Education Records
              </h3>
              <div className="space-y-4">
                {/* Graduation */}
                <div className="bg-surface-container-low/20 border border-outline-variant/30 rounded-xl p-4">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-primary">Graduation / Postgrad / Diploma</h4>
                      <p className="text-xs text-on-surface font-semibold mt-1">{grad.degree || 'Degree not specified'} • {grad.school || 'College not specified'}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Completed: {grad.year || 'N/A'} | Grade: {grad.grade || 'N/A'}</p>
                    </div>
                    {grad.file && (
                      <a href={grad.file} download={`graduation_certificate_${user.name}.png`} className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-3 py-1 rounded-full text-[10px] font-black tracking-wider transition cursor-pointer">
                        <span className="material-symbols-outlined text-[14px]">download</span> Certificate
                      </a>
                    )}
                  </div>
                </div>

                {/* 12th Standard */}
                <div className="bg-surface-container-low/20 border border-outline-variant/30 rounded-xl p-4">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-primary">12th Standard / Intermediate</h4>
                      <p className="text-xs text-on-surface font-semibold mt-1">{edu12.school || 'School not specified'}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Completed: {edu12.year || 'N/A'} | Grade: {edu12.grade || 'N/A'}</p>
                    </div>
                    {edu12.file && (
                      <a href={edu12.file} download={`12th_marksheet_${user.name}.png`} className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-3 py-1 rounded-full text-[10px] font-black tracking-wider transition cursor-pointer">
                        <span className="material-symbols-outlined text-[14px]">download</span> Marksheet
                      </a>
                    )}
                  </div>
                </div>

                {/* 10th Standard */}
                <div className="bg-surface-container-low/20 border border-outline-variant/30 rounded-xl p-4">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-primary">10th Standard / Matriculation</h4>
                      <p className="text-xs text-on-surface font-semibold mt-1">{edu10.school || 'School not specified'}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Completed: {edu10.year || 'N/A'} | Grade: {edu10.grade || 'N/A'}</p>
                    </div>
                    {edu10.file && (
                      <a href={edu10.file} download={`10th_marksheet_${user.name}.png`} className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-3 py-1 rounded-full text-[10px] font-black tracking-wider transition cursor-pointer">
                        <span className="material-symbols-outlined text-[14px]">download</span> Marksheet
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Work Experience */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm space-y-4">
              <h3 className="text-title-medium font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-2">
                <span className="material-symbols-outlined text-primary">work</span>
                Employment History
              </h3>
              {user.isFirstJob ? (
                <div className="p-4 bg-surface-container-low/30 border border-outline-variant/30 rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">info</span>
                  <span className="text-sm font-semibold text-on-surface">This is my first professional job. No prior experience letter is applicable.</span>
                </div>
              ) : (
                <div className="bg-surface-container-low/20 border border-outline-variant/30 rounded-xl p-4">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-primary">Prior Experience</h4>
                      <p className="text-xs text-on-surface font-semibold mt-1">{exp.company || 'Not specified'} • {exp.role || 'Not specified'}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Duration: {exp.duration || 'N/A'}</p>
                    </div>
                    {exp.file && (
                      <a href={exp.file} download={`experience_letter_${user.name}.png`} className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-3 py-1 rounded-full text-[10px] font-black tracking-wider transition cursor-pointer">
                        <span className="material-symbols-outlined text-[14px]">download</span> Relieving Letter
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
        {savedAt && <p className="text-xs text-[#027A48] font-bold text-center mt-2 print-hide">Last saved at {savedAt}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Profile Header / Photo Uploader */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-28 h-28 rounded-full border border-outline-variant overflow-hidden bg-surface-container-high/40 flex items-center justify-center shrink-0">
          {form.profileImage ? (
            <img src={form.profileImage} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40">person</span>
          )}
        </div>
        <div className="space-y-2 text-center sm:text-left flex-1">
          <h3 className="text-headline-sm font-bold text-on-surface">Upload Profile Photo</h3>
          <p className="text-xs text-on-surface-variant max-w-md">Upload a professional headshot to display on the staff availability panel.</p>
          <div className="flex justify-center sm:justify-start">
            <FileUploader
              label="Profile Photo"
              value={form.profileImage}
              onChange={(base64) => setForm({ ...form, profileImage: base64 })}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-center sm:justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 border border-outline-variant rounded-full text-sm font-bold hover:bg-surface-container-high/20 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold text-sm hover:brightness-105 active:scale-95 transition shadow disabled:opacity-60 cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Structured Grid Layout for Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal & Contact Card */}
        <div className="space-y-6 md:col-span-1">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm space-y-4">
            <h3 className="text-title-medium font-bold text-on-surface flex items-center gap-1.5 border-b border-outline-variant/30 pb-2">
              <span className="material-symbols-outlined text-primary">badge</span>
              Personal Details
            </h3>
            <div className="space-y-4">
              <label className="block">
                <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1 text-xs">Full name</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} required />
              </label>
              <label className="block">
                <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1 text-xs">Gender</span>
                <input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="e.g. Female" className={inputCls} />
              </label>
              <label className="block">
                <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1 text-xs">Qualifications</span>
                <input value={form.qualifications} onChange={(e) => setForm({ ...form, qualifications: e.target.value })} placeholder="e.g. MASLP" className={inputCls} />
              </label>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm space-y-4">
            <h3 className="text-title-medium font-bold text-on-surface flex items-center gap-1.5 border-b border-outline-variant/30 pb-2">
              <span className="material-symbols-outlined text-primary">contacts</span>
              Contact Information
            </h3>
            <div className="space-y-4">
              <label className="block">
                <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1 text-xs">Email</span>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} required />
              </label>
              <label className="block">
                <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1 text-xs">Phone</span>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-on-surface-variant font-bold select-none text-xs">+91</span>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={`${inputCls} pl-12`} required />
                </div>
              </label>
              <label className="block">
                <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1 text-xs">Alternative Phone <span className="normal-case text-on-surface-variant/60 font-semibold">(Optional)</span></span>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-on-surface-variant font-bold select-none text-xs">+91</span>
                  <input value={form.extraPhone} onChange={(e) => setForm({ ...form, extraPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={`${inputCls} pl-12`} />
                </div>
              </label>
              <label className="block">
                <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1 text-xs">Address</span>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full residential address" className="w-full bg-transparent border border-outline-variant rounded-xl p-3 text-sm text-on-surface focus:border-primary outline-none resize-none" rows={3} />
              </label>
            </div>
          </div>
        </div>

        {/* Family, Education, Experience columns */}
        <div className="space-y-6 md:col-span-2">
          {/* Family Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm space-y-4">
            <h3 className="text-title-medium font-bold text-on-surface flex items-center gap-1.5 border-b border-outline-variant/30 pb-2">
              <span className="material-symbols-outlined text-primary">family_restroom</span>
              Parent / Guardian Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1 text-xs">Parent / Guardian Name</span>
                <input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} placeholder="Name" className={inputCls} required />
              </label>
              <label className="block">
                <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1 text-xs">Relation</span>
                <input value={form.parentRelation} onChange={(e) => setForm({ ...form, parentRelation: e.target.value })} placeholder="e.g. Father, Mother" className={inputCls} required />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1 text-xs">Contact Number</span>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-on-surface-variant font-bold select-none text-xs">+91</span>
                  <input value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={`${inputCls} pl-12`} required />
                </div>
              </label>
            </div>
          </div>

          {/* Education Records */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm space-y-4">
            <h3 className="text-title-medium font-bold text-on-surface flex items-center gap-1.5 border-b border-outline-variant/30 pb-2">
              <span className="material-symbols-outlined text-primary">school</span>
              Education Records
            </h3>

            {/* Graduation */}
            <div className="bg-surface-container-low/30 border border-outline-variant/30 rounded-xl p-4 space-y-3">
              <p className="font-extrabold text-xs text-primary uppercase tracking-wide">Graduation / Diploma / Postgrad</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Degree / Course</span>
                  <input value={form.educationGrad.degree} onChange={(e) => setForm({ ...form, educationGrad: { ...form.educationGrad, degree: e.target.value } })} placeholder="e.g. BASLP" className={inputCls} />
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">College / University</span>
                  <input value={form.educationGrad.school} onChange={(e) => setForm({ ...form, educationGrad: { ...form.educationGrad, school: e.target.value } })} placeholder="e.g. AIISH" className={inputCls} />
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Year of Completion</span>
                  <input value={form.educationGrad.year} onChange={(e) => setForm({ ...form, educationGrad: { ...form.educationGrad, year: e.target.value } })} placeholder="e.g. 2024" className={inputCls} />
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Grade / CGPA</span>
                  <input value={form.educationGrad.grade} onChange={(e) => setForm({ ...form, educationGrad: { ...form.educationGrad, grade: e.target.value } })} placeholder="e.g. 8.5 CGPA" className={inputCls} />
                </label>
              </div>
              <FileUploader
                label="Degree Certificate"
                value={form.educationGrad.file}
                onChange={(base64) => setForm({ ...form, educationGrad: { ...form.educationGrad, file: base64 } })}
              />
            </div>

            {/* 12th */}
            <div className="bg-surface-container-low/30 border border-outline-variant/30 rounded-xl p-4 space-y-3">
              <p className="font-extrabold text-xs text-primary uppercase tracking-wide">12th Standard / Intermediate</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Board / School</span>
                  <input value={form.education12th.school} onChange={(e) => setForm({ ...form, education12th: { ...form.education12th, school: e.target.value } })} placeholder="e.g. CBSE" className={inputCls} />
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Year of Completion</span>
                  <input value={form.education12th.year} onChange={(e) => setForm({ ...form, education12th: { ...form.education12th, year: e.target.value } })} placeholder="e.g. 2020" className={inputCls} />
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Grade / Percentage</span>
                  <input value={form.education12th.grade} onChange={(e) => setForm({ ...form, education12th: { ...form.education12th, grade: e.target.value } })} placeholder="e.g. 88%" className={inputCls} />
                </label>
              </div>
              <FileUploader
                label="12th Marksheet"
                value={form.education12th.file}
                onChange={(base64) => setForm({ ...form, education12th: { ...form.education12th, file: base64 } })}
              />
            </div>

            {/* 10th */}
            <div className="bg-surface-container-low/30 border border-outline-variant/30 rounded-xl p-4 space-y-3">
              <p className="font-extrabold text-xs text-primary uppercase tracking-wide">10th Standard / Matriculation</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Board / School</span>
                  <input value={form.education10th.school} onChange={(e) => setForm({ ...form, education10th: { ...form.education10th, school: e.target.value } })} placeholder="e.g. CBSE / KV" className={inputCls} />
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Year of Completion</span>
                  <input value={form.education10th.year} onChange={(e) => setForm({ ...form, education10th: { ...form.education10th, year: e.target.value } })} placeholder="e.g. 2018" className={inputCls} />
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Grade / Percentage</span>
                  <input value={form.education10th.grade} onChange={(e) => setForm({ ...form, education10th: { ...form.education10th, grade: e.target.value } })} placeholder="e.g. 92%" className={inputCls} />
                </label>
              </div>
              <FileUploader
                label="10th Marksheet"
                value={form.education10th.file}
                onChange={(base64) => setForm({ ...form, education10th: { ...form.education10th, file: base64 } })}
              />
            </div>
          </div>

          {/* Work Experience Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm space-y-4">
            <h3 className="text-title-medium font-bold text-on-surface flex items-center gap-1.5 border-b border-outline-variant/30 pb-2">
              <span className="material-symbols-outlined text-primary">work</span>
              Work Experience
            </h3>
            
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isFirstJob}
                onChange={(e) => setForm({ ...form, isFirstJob: e.target.checked })}
                className="w-4.5 h-4.5 border border-outline-variant rounded focus:ring-0 text-primary cursor-pointer"
              />
              <span className="text-body-sm font-bold text-on-surface-variant">This is my first job / I have no prior experience</span>
            </label>

            {!form.isFirstJob && (
              <div className="bg-surface-container-low/30 border border-outline-variant/30 rounded-xl p-4 space-y-3 animate-fade-in">
                <p className="font-extrabold text-xs text-primary uppercase tracking-wide">Previous Employment Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Company / Organization</span>
                    <input value={form.pastExperience.company} onChange={(e) => setForm({ ...form, pastExperience: { ...form.pastExperience, company: e.target.value } })} placeholder="Company Name" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Role / Designation</span>
                    <input value={form.pastExperience.role} onChange={(e) => setForm({ ...form, pastExperience: { ...form.pastExperience, role: e.target.value } })} placeholder="e.g. Speech Therapist" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Duration</span>
                    <input value={form.pastExperience.duration} onChange={(e) => setForm({ ...form, pastExperience: { ...form.pastExperience, duration: e.target.value } })} placeholder="e.g. 2 years" className={inputCls} />
                  </label>
                </div>
                <FileUploader
                  label="Experience Letter / Relieving Letter"
                  value={form.pastExperience.file}
                  onChange={(base64) => setForm({ ...form, pastExperience: { ...form.pastExperience, file: base64 } })}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-outline-variant/30 bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm">
        <button
          type="button"
          onClick={handleCancel}
          className="px-6 py-2.5 border border-outline-variant rounded-full text-sm font-bold hover:bg-surface-container-high/20 transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-on-primary px-8 py-2.5 rounded-full font-bold text-sm hover:brightness-105 active:scale-95 transition shadow-md disabled:opacity-60 cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// Employee — Salary Slips view
// ---------------------------------------------------------------------------
const CompensationTab: React.FC<{
  users: User[];
  allLeaves: LeaveRequest[];
  onChange: () => void;
}> = ({ users, allLeaves, onChange }) => {
  useEffect(() => {
    if (allLeaves && allLeaves.length > 0) {
      console.log("CompensationTab leave count:", allLeaves.length);
    }
  }, [allLeaves]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calculating, setCalculating] = useState(false);
  const [salaryEstimates, setSalaryEstimates] = useState<Record<string, any>>({});
  const [selectedEmployeeForSlip, setSelectedEmployeeForSlip] = useState<User | null>(null);
  const [slipData, setSlipData] = useState<any>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const employees = useMemo(() => users.filter(u => u.role === 'employee'), [users]);

  const fetchEstimates = useCallback(async () => {
    setCalculating(true);
    const estimates: Record<string, any> = {};
    for (const emp of employees) {
      try {
        const est = await calculateSalary(emp.id, selectedMonth);
        estimates[emp.id] = est;
      } catch (err) {
        console.error("Failed calculating salary for", emp.id, err);
      }
    }
    setSalaryEstimates(estimates);
    setCalculating(false);
  }, [employees, selectedMonth]);

  useEffect(() => {
    if (employees.length > 0) {
      fetchEstimates();
    }
  }, [selectedMonth, employees.length]);

  const downloadSessionReport = (emp: User, est: any) => {
    if (!est || !est.sessions || est.sessions.length === 0) {
      alert("No sessions recorded for this month.");
      return;
    }
    const headers = ["S.No", "Date", "Time Slot", "Child Name", "Type", "Mode", "Source"];
    const rows = est.sessions.map((s: any, idx: number) => [
      idx + 1,
      s.date,
      formatSlot(s.slot),
      s.childName || "TBD",
      s.type || "TBD",
      s.mode === 'online' ? "Online" : "Clinic",
      s.source === 'csv' ? "Daily Schedule" : "Direct Booking"
    ]);
    
    // Proper CSV format with BOM for Excel compatibility
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r: any) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const encodedUri = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SessionReport_${emp.name.replace(/\s+/g, '_')}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenPostModal = (emp: User, est: any) => {
    setSelectedEmployeeForSlip(emp);
    setSlipData({
      ...est,
      baseSalary: est.baseSalary,
      incentive: est.incentive,
      deductions: est.deductions,
      bonus: est.bonus,
      netSalary: est.netSalary
    });
  };

  const handleSaveSalarySlip = async () => {
    if (!selectedEmployeeForSlip || !slipData) return;
    setIsPosting(true);
    try {
      await postSalarySlip({
        userId: selectedEmployeeForSlip.id,
        month: selectedMonth,
        baseSalary: slipData.baseSalary,
        sessionsCount: slipData.sessionsCount,
        incentive: slipData.incentive,
        totalLeaves: slipData.totalLeaves,
        deductions: slipData.deductions,
        bonus: slipData.bonus,
        netSalary: slipData.netSalary
      });
      alert(`Salary slip for ${selectedEmployeeForSlip.name} posted successfully.`);
      setSelectedEmployeeForSlip(null);
      setSlipData(null);
      fetchEstimates();
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to post salary slip");
    } finally {
      setIsPosting(false);
    }
  };

  const openSettingsModal = async () => {
    try {
      const s = await getSalarySettings();
      setSettingsForm(s);
      setShowSettings(true);
    } catch (e) {
      alert("Failed to load incentive configurations");
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateSalarySettings(settingsForm);
      setShowSettings(false);
      alert("Clinic incentive and leave rules updated successfully.");
      fetchEstimates();
      onChange();
    } catch (e) {
      alert("Failed to save rules settings");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            Salary & Incentive Compensation
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Super Admin payroll controller. Calculate, customize, and post monthly payouts.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={openSettingsModal}
            className="border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">settings</span>
            Salary Slip & Incentive Rules
          </button>
          
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-on-surface-variant uppercase">Payroll Month</label>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              className="bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
            />
          </div>
        </div>
      </div>

      {calculating ? (
        <p className="text-body-md text-on-surface-variant italic">Recalculating employee earnings and attendance logs...</p>
      ) : employees.length === 0 ? (
        <p className="text-body-md text-on-surface-variant italic">No employees found in the system.</p>
      ) : (
        <div className="overflow-x-auto border border-outline-variant/40 rounded-xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-surface-container-high border-b border-outline-variant/40">
              <tr className="text-on-surface-variant uppercase tracking-wider font-extrabold text-[10px]">
                <th className="p-4">Employee</th>
                <th className="p-4">Base Salary</th>
                <th className="p-4">Sessions Count (CSV/Booked)</th>
                <th className="p-4">Incentive</th>
                <th className="p-4">Leaves (Sandwich)</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface font-medium">
              {employees.map((emp) => {
                const est = salaryEstimates[emp.id];
                return (
                  <tr key={emp.id} className="hover:bg-surface-container-low/20 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-on-surface">{emp.name || emp.id}</p>
                      <p className="text-[11px] text-on-surface-variant">{emp.specialty || 'Therapist'}</p>
                    </td>
                    <td className="p-4 text-xs font-semibold">
                      ₹{(emp.baseSalary || 35000).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      {est ? (
                        <button
                          onClick={() => downloadSessionReport(emp, est)}
                          className="bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20 px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                          title="Click to download whole month session details CSV"
                        >
                          <span className="material-symbols-outlined text-[14px]">download_for_offline</span>
                          {est.sessionsCount} session{est.sessionsCount === 1 ? '' : 's'}
                        </button>
                      ) : (
                        <span className="text-on-surface-variant/40 italic">-</span>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-primary">
                      {est ? `+₹${est.incentive.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="p-4 text-xs text-on-surface-variant">
                      {est ? (
                        <span>
                          {est.approvedLeavesCount} day{est.approvedLeavesCount === 1 ? '' : 's'} 
                          {est.sandwichLeavesCount > 0 && ` (+${est.sandwichLeavesCount} sandwich)`}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {est ? (
                        <button
                          onClick={() => handleOpenPostModal(emp, est)}
                          className="bg-primary text-on-primary hover:brightness-105 active:scale-95 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
                        >
                          Review & Post Slip
                        </button>
                      ) : (
                        <span className="text-on-surface-variant/40 italic">Calculating...</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review and Edit Slip Modal */}
      {selectedEmployeeForSlip && slipData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={() => { setSelectedEmployeeForSlip(null); setSlipData(null); }}>
          <div className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-2xl space-y-4 animate-drop-down-spring" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              Finalize Payout Slip
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Confirm or manually adjust the calculated fields for <strong>{selectedEmployeeForSlip.name}</strong> for the period <strong>{selectedMonth}</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Base Salary (₹)</span>
                <input 
                  type="number" 
                  value={slipData.baseSalary} 
                  onChange={(e) => {
                    const base = parseInt(e.target.value) || 0;
                    setSlipData({ ...slipData, baseSalary: base, netSalary: base + slipData.incentive - slipData.deductions + slipData.bonus });
                  }} 
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
                />
              </label>

              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Session Incentive (₹)</span>
                <input 
                  type="number" 
                  value={slipData.incentive} 
                  onChange={(e) => {
                    const inc = parseInt(e.target.value) || 0;
                    setSlipData({ ...slipData, incentive: inc, netSalary: slipData.baseSalary + inc - slipData.deductions + slipData.bonus });
                  }} 
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
                />
              </label>

              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Leaves Deductions (₹)</span>
                <input 
                  type="number" 
                  value={slipData.deductions} 
                  onChange={(e) => {
                    const ded = parseInt(e.target.value) || 0;
                    setSlipData({ ...slipData, deductions: ded, netSalary: slipData.baseSalary + slipData.incentive - ded + slipData.bonus });
                  }} 
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
                />
              </label>

              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Unused Leaves Bonus (₹)</span>
                <input 
                  type="number" 
                  value={slipData.bonus} 
                  onChange={(e) => {
                    const bon = parseInt(e.target.value) || 0;
                    setSlipData({ ...slipData, bonus: bon, netSalary: slipData.baseSalary + slipData.incentive - slipData.deductions + bon });
                  }} 
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
                />
              </label>

              <div className="col-span-2 bg-surface-container-high/30 border border-outline-variant/30 rounded-xl p-3 flex justify-between items-center mt-2">
                <div>
                  <span className="block text-[10px] text-on-surface-variant font-bold uppercase">Final Payout Net Pay</span>
                  <span className="text-lg font-black text-[#027A48]">₹{slipData.netSalary.toLocaleString('en-IN')}</span>
                </div>
                <span className="text-[10px] bg-[#D1FADF] text-[#027A48] font-bold px-3 py-1 rounded-full uppercase">Net Payable</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-outline-variant/30">
              <button 
                onClick={() => { setSelectedEmployeeForSlip(null); setSlipData(null); }} 
                className="px-4 py-2 border border-outline-variant hover:bg-surface-container-high/30 rounded-full font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSalarySlip} 
                disabled={isPosting} 
                className="bg-[#027A48] text-white hover:brightness-105 active:scale-95 px-5 py-2 rounded-full font-bold text-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-60"
              >
                {isPosting ? 'Posting...' : 'Post Salary Slip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary rules configurations modal */}
      {showSettings && settingsForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="w-full max-w-xl bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-2xl space-y-4 animate-drop-down-spring max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">settings</span>
              Configure Clinic Salary Rules
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Manage the default leaves allowances, leave deductions, and milestone incentives for completed sessions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="col-span-2 border-b border-outline-variant/30 pb-2">
                <h4 className="font-bold text-primary text-[11px] uppercase tracking-wider">Leaves Allowances & Adjustments</h4>
              </div>
              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1">Base Paid Leaves (CL)</span>
                <input 
                  type="number" 
                  value={settingsForm.salary_base_paid_leaves} 
                  onChange={(e) => setSettingsForm({ ...settingsForm, salary_base_paid_leaves: e.target.value })} 
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
                />
              </label>
              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1">Extra Leave Deduction (₹)</span>
                <input 
                  type="number" 
                  value={settingsForm.salary_extra_leave_deduction} 
                  onChange={(e) => setSettingsForm({ ...settingsForm, salary_extra_leave_deduction: e.target.value })} 
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
                />
              </label>
              <label className="block col-span-2">
                <span className="block font-bold text-on-surface-variant mb-1">Unused Leave Bonus (₹ for taking 0 leaves)</span>
                <input 
                  type="number" 
                  value={settingsForm.salary_unused_leave_bonus} 
                  onChange={(e) => setSettingsForm({ ...settingsForm, salary_unused_leave_bonus: e.target.value })} 
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
                />
              </label>

              <div className="col-span-2 border-b border-outline-variant/30 pb-2 pt-2">
                <h4 className="font-bold text-primary text-[11px] uppercase tracking-wider">Session Milestone Incentives</h4>
              </div>
              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1">Tier 1: Sessions Milestone</span>
                <input 
                  type="number" 
                  value={settingsForm.salary_incentive_tier1_sessions} 
                  onChange={(e) => setSettingsForm({ ...settingsForm, salary_incentive_tier1_sessions: e.target.value })} 
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
                />
              </label>
              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1">Tier 1: Incentive Amount (₹)</span>
                <input 
                  type="number" 
                  value={settingsForm.salary_incentive_tier1_amount} 
                  onChange={(e) => setSettingsForm({ ...settingsForm, salary_incentive_tier1_amount: e.target.value })} 
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
                />
              </label>

              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1">Tier 2: Sessions Milestone</span>
                <input 
                  type="number" 
                  value={settingsForm.salary_incentive_tier2_sessions} 
                  onChange={(e) => setSettingsForm({ ...settingsForm, salary_incentive_tier2_sessions: e.target.value })} 
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
                />
              </label>
              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1">Tier 2: Incentive Amount (₹)</span>
                <input 
                  type="number" 
                  value={settingsForm.salary_incentive_tier2_amount} 
                  onChange={(e) => setSettingsForm({ ...settingsForm, salary_incentive_tier2_amount: e.target.value })} 
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
                />
              </label>

              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1">Tier 3: Sessions Milestone</span>
                <input 
                  type="number" 
                  value={settingsForm.salary_incentive_tier3_sessions} 
                  onChange={(e) => setSettingsForm({ ...settingsForm, salary_incentive_tier3_sessions: e.target.value })} 
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
                />
              </label>
              <label className="block">
                <span className="block font-bold text-on-surface-variant mb-1">Tier 3: Incentive Amount (₹)</span>
                <input 
                  type="number" 
                  value={settingsForm.salary_incentive_tier3_amount} 
                  onChange={(e) => setSettingsForm({ ...settingsForm, salary_incentive_tier3_amount: e.target.value })} 
                  className="w-full bg-transparent border border-outline-variant rounded-xl py-2 px-3 text-sm text-on-surface focus:border-primary outline-none" 
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-outline-variant/30">
              <button 
                onClick={() => setShowSettings(false)} 
                className="px-4 py-2 border border-outline-variant hover:bg-surface-container-high/30 rounded-full font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSettings} 
                disabled={savingSettings} 
                className="bg-primary text-on-primary hover:brightness-105 active:scale-95 px-5 py-2 rounded-full font-bold text-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-60"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Employee — Salary Slips view
// ---------------------------------------------------------------------------
const EmployeeSalarySlipTab: React.FC<{ user: User }> = ({ user }) => {
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listSalarySlips()
      .then(setSlips)
      .catch(() => setSlips([]))
      .finally(() => setLoading(false));
  }, []);

  const getMonthName = (monthStr: string) => {
    const [year, monthVal] = monthStr.split('-');
    const d = new Date(parseInt(year), parseInt(monthVal) - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const getNumberWords = (num: number): string => {
    const words: Record<number, string> = {
      0: 'Zero', 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine',
      10: 'Ten', 11: 'Eleven', 12: 'Twelve', 13: 'Thirteen', 14: 'Fourteen', 15: 'Fifteen', 16: 'Sixteen', 17: 'Seventeen', 18: 'Eighteen', 19: 'Nineteen',
      20: 'Twenty', 30: 'Thirty', 40: 'Forty', 50: 'Fifty', 60: 'Sixty', 70: 'Seventy', 80: 'Eighty', 90: 'Ninety'
    };
    if (num <= 20) return words[num] || '';
    if (num < 100) return words[Math.floor(num / 10) * 10] + (num % 10 ? ' ' + words[num % 10] : '');
    if (num < 1000) return words[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + getNumberWords(num % 100) : '');
    if (num < 100000) return getNumberWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + getNumberWords(num % 1000) : '');
    if (num < 10000000) return getNumberWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + getNumberWords(num % 100000) : '');
    return getNumberWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + getNumberWords(num % 10000000) : '');
  };

  if (selectedSlip) {
    const gross = selectedSlip.baseSalary + selectedSlip.incentive;
    const grossEarningsStr = `₹${gross.toLocaleString('en-IN')}`;
    const basicPayStr = `₹${selectedSlip.baseSalary.toLocaleString('en-IN')}`;
    const incentiveStr = `₹${selectedSlip.incentive.toLocaleString('en-IN')}`;
    const bonusStr = `₹${selectedSlip.bonus.toLocaleString('en-IN')}`;
    const deductionsStr = `₹${selectedSlip.deductions.toLocaleString('en-IN')}`;
    const netSalaryStr = `₹${selectedSlip.netSalary.toLocaleString('en-IN')}`;
    const netWords = getNumberWords(selectedSlip.netSalary) + " Only";

    return (
      <div className="space-y-6 max-w-4xl mx-auto w-full">
        {/* Back header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={() => setSelectedSlip(null)}
            className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant hover:bg-surface-container-high/30 rounded-full font-bold text-xs transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Salary Slips
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadDocument('salary-slip-print', `Payslip_${selectedSlip.month}.html`)}
              className="bg-secondary text-on-secondary hover:brightness-105 active:scale-95 px-5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download Document
            </button>
            <button
              onClick={() => printDocument('salary-slip-print')}
              className="bg-primary text-on-primary hover:brightness-105 active:scale-95 px-5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              Print Document
            </button>
          </div>
        </div>

        {/* Payslip Content Area */}
        <div id="salary-slip-print" className="bg-white text-black p-8 sm:p-12 border border-slate-300 rounded-[1.5rem] shadow-md font-sans text-slate-800 text-xs leading-relaxed space-y-6">
          {/* Slip Header */}
          <div className="text-center pb-4 border-b-2 border-slate-300 space-y-1">
            <h2 className="text-lg font-black tracking-tight text-slate-950">RECHARGE REHABILITATION PRIVATE LIMITED</h2>
            <p className="text-[10px] text-slate-500">Regd Office: Sector 5, Dwarka, New Delhi - 110075</p>
            <h3 className="font-bold text-xs bg-slate-100 py-1 max-w-[250px] mx-auto rounded">PAYSLIP FOR {getMonthName(selectedSlip.month).toUpperCase()}</h3>
          </div>

          {/* Employee Details Grid */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
            <div className="space-y-1">
              <p><strong>Employee ID:</strong> {user.id.toUpperCase()}</p>
              <p><strong>Employee Name:</strong> {user.name || 'Staff'}</p>
              <p><strong>Designation:</strong> {user.specialty || 'Therapist'}</p>
              <p><strong>Department:</strong> Rehabilitation Services</p>
            </div>
            <div className="space-y-1 text-right sm:text-left">
              <p><strong>Sessions Completed:</strong> {selectedSlip.sessionsCount}</p>
              <p><strong>Leaves Counted (incl Sandwich):</strong> {selectedSlip.leavesCount}</p>
              <p><strong>Bank A/C No:</strong> ************5643</p>
              <p><strong>PAN:</strong> APM*****5D</p>
            </div>
          </div>

          {/* Earnings & Deductions Tables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 border-b border-slate-300 pb-4">
            {/* Earnings */}
            <div>
              <h4 className="font-bold border-b border-slate-200 pb-1 mb-2 text-slate-900">Earnings</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span>Basic Pay</span><span className="font-semibold">{basicPayStr}</span></div>
                <div className="flex justify-between"><span>Session Incentive</span><span className="font-semibold">{incentiveStr}</span></div>
                <div className="flex justify-between"><span>Unused Leaves Bonus</span><span className="font-semibold">{bonusStr}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900"><span>Gross Earnings</span><span>{grossEarningsStr}</span></div>
              </div>
            </div>
            {/* Deductions */}
            <div className="mt-4 sm:mt-0">
              <h4 className="font-bold border-b border-slate-200 pb-1 mb-2 text-slate-900">Deductions</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span>Extra Leaves Deduction</span><span className="font-semibold">{deductionsStr}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900"><span>Total Deductions</span><span>{deductionsStr}</span></div>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-center sm:text-left mb-2 sm:mb-0">
              <span className="block text-[10px] text-slate-500 uppercase font-black">Net Salary Payable</span>
              <span className="text-lg font-black text-slate-950">{netSalaryStr}</span>
            </div>
            <p className="text-slate-600 font-bold text-[10px] text-center sm:text-right">{netWords}</p>
          </div>

          {/* Signatures */}
          <div className="flex justify-between pt-8 text-[10px]">
            <div className="text-center border-t border-slate-200 pt-1.5 w-36">
              <p>Employee Signature</p>
            </div>
            <div className="text-center border-t border-slate-200 pt-1.5 w-36">
              <p>Authorised Signatory</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            My Salary Slips
          </h2>
          <p className="text-body-sm text-on-surface-variant">View and download your monthly payroll records.</p>
        </div>

        {loading ? (
          <p className="text-body-md text-on-surface-variant italic">Loading salary slip records...</p>
        ) : slips.length === 0 ? (
          <p className="text-body-md text-on-surface-variant italic">No finalized salary slips posted by the admin yet.</p>
        ) : (
          <div className="overflow-x-auto border border-outline-variant/40 rounded-xl">
            <table className="w-full text-left border-collapse text-sm text-on-surface">
              <thead className="bg-surface-container-high border-b border-outline-variant/40">
                <tr className="text-on-surface-variant uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="p-4">Period</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Basic Pay</th>
                  <th className="p-4">Total Deductions</th>
                  <th className="p-4">Net Salary</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-on-surface font-medium">
                {slips.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low/20 transition-colors">
                    <td className="p-4 font-bold text-primary">
                      {getMonthName(s.month)}
                    </td>
                    <td className="p-4 text-on-surface-variant text-xs font-semibold">
                      Recharge Rehabilitation Pvt Ltd
                    </td>
                    <td className="p-4 font-semibold">₹{s.baseSalary.toLocaleString('en-IN')}</td>
                    <td className="p-4 font-semibold text-[#B42318]">₹{s.deductions.toLocaleString('en-IN')}</td>
                    <td className="p-4 font-bold text-[#027A48]">₹{s.netSalary.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedSlip(s)}
                        className="bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer"
                      >
                        View Payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Employee — Offer Letter view
// ---------------------------------------------------------------------------
const EmployeeOfferLetterTab: React.FC<{ user: User }> = ({ user }) => {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const docs = [
    { id: 'offer_letter', name: 'Official Appointment & Offer Letter', date: 'June 1, 2026', type: 'Employment Agreement', status: 'Accepted' }
  ];

  if (selectedDoc === 'offer_letter') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto w-full">
        {/* Back header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={() => setSelectedDoc(null)}
            className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant hover:bg-surface-container-high/30 rounded-full font-bold text-xs transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Documents
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadDocument('offer-letter-print', `Offer_Letter_${user.name || 'Staff'}.html`)}
              className="bg-secondary text-on-secondary hover:brightness-105 active:scale-95 px-5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download Document
            </button>
            <button
              onClick={() => printDocument('offer-letter-print')}
              className="bg-primary text-on-primary hover:brightness-105 active:scale-95 px-5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              Print Document
            </button>
          </div>
        </div>

        {/* Offer Letter Frame */}
        <div id="offer-letter-print" className="bg-white text-black p-8 sm:p-12 border border-slate-300 rounded-[1.5rem] shadow-md font-serif text-slate-800 leading-relaxed text-sm space-y-6">
          {/* Company Letterhead */}
          <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
            <h1 className="text-xl font-black tracking-tight text-slate-950">RECHARGE REHABILITATION PRIVATE LIMITED</h1>
            <p className="text-[10px] text-slate-500 font-sans uppercase tracking-widest">Pediatric Therapy & Speech Rehabilitation Services</p>
            <p className="text-[10px] text-slate-500 font-sans">Contact: contact@rechargerehab.in | Web: www.rechargerehab.in</p>
          </div>

          {/* Date / Address */}
          <div className="space-y-1 font-sans text-xs">
            <p className="font-bold">Date: June 1, 2026</p>
            <p className="font-bold">To,</p>
            <p className="font-bold text-slate-950">{user.name || 'Staff'}</p>
            <p>{user.address || 'New Delhi, India'}</p>
          </div>

          {/* Subject */}
          <div className="text-center font-bold underline text-slate-950 text-xs font-sans uppercase">
            Subject: Offer of Appointment for the position of {user.specialty || 'Therapist'}
          </div>

          {/* Greeting / Body */}
          <div className="space-y-4">
            <p>Dear {user.name || 'Staff'},</p>
            
            <p>
              With reference to your application and subsequent interview you had with us, we are pleased to offer you the appointment as **{user.specialty || 'Therapist'}** at Recharge Rehabilitation.
            </p>

            <p>
              Your Date of Joining will be **June 15, 2026**. Your gross salary package (CTC) will be **₹6,60,000.00 per annum** (Rupees Six Lakhs Sixty Thousand Only) as agreed. Detailed annexure of compensation breakdown is attached herewith.
            </p>

            <h4 className="font-bold text-slate-950 font-sans text-xs uppercase pt-2">Terms & Conditions of Employment:</h4>
            
            <ul className="list-decimal pl-6 space-y-2 text-xs font-sans">
              <li>
                <strong>Probation Period:</strong> You will be on probation for a period of six (6) months from your date of joining. Upon successful evaluation, your employment will be confirmed in writing.
              </li>
              <li>
                <strong>Working Hours:</strong> The clinic operates from 09:30 AM to 06:30 PM, Monday through Saturday.
              </li>
              <li>
                <strong>Notice Period:</strong> During probation, either party can terminate the agreement with 15 days' notice. Post confirmation, the notice period will be one (1) month.
              </li>
              <li>
                <strong>Confidentiality:</strong> You will maintain strict confidentiality regarding all clinical data, patient profiles, treatment records, and company operations.
              </li>
            </ul>

            <p>
              Please sign and return the duplicate copy of this letter as a token of your formal acceptance. We look forward to a rewarding professional relationship with you.
            </p>
          </div>

          {/* Signatures */}
          <div className="flex justify-between pt-12 text-xs font-sans">
            <div className="space-y-4">
              <p>Sincerely,</p>
              <div className="h-8" />
              <p className="font-bold text-slate-900">Dr. Ankush Jha</p>
              <p className="text-slate-500">Founder & Director</p>
              <p className="text-[10px] text-slate-400">Recharge Rehabilitation Pvt Ltd</p>
            </div>
            <div className="space-y-4 text-right self-end">
              <div className="border-t border-slate-300 pt-2 w-48 text-center">
                <p>Accepted By</p>
                <p className="font-semibold text-slate-950 mt-1">{user.name || 'Staff'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">description</span>
            Official Documents & Letters
          </h2>
          <p className="text-body-sm text-on-surface-variant">Access your job offers, agreements, and official document copies.</p>
        </div>

        {/* Professional Documents Table */}
        <div className="overflow-x-auto border border-outline-variant/40 rounded-xl">
          <table className="w-full text-left border-collapse text-sm text-on-surface">
            <thead className="bg-surface-container-high border-b border-outline-variant/40">
              <tr className="text-on-surface-variant uppercase tracking-wider font-extrabold text-[10px]">
                <th className="p-4">Document Name</th>
                <th className="p-4">Date Issued</th>
                <th className="p-4">Document Type</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface font-medium">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface-container-low/20 transition-colors">
                  <td className="p-4 font-bold text-primary">
                    {doc.name}
                  </td>
                  <td className="p-4 text-on-surface-variant text-xs font-semibold">
                    {doc.date}
                  </td>
                  <td className="p-4 text-on-surface-variant text-xs font-semibold">{doc.type}</td>
                  <td className="p-4">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#D1FADF] text-[#027A48]">
                      {doc.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedDoc(doc.id)}
                      className="bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer"
                    >
                      View Document
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


// ---------------------------------------------------------------------------
// Employee — Leave Requests view
// ---------------------------------------------------------------------------
interface EmployeeLeavesTabProps {
  myLeaves: LeaveRequest[];
  allLeaves: LeaveRequest[];
  isSuper: boolean;
  user: User;
  onRefresh: () => void;
}

const EmployeeLeavesTab: React.FC<EmployeeLeavesTabProps> = ({ myLeaves, onRefresh }) => {
  const [leaveType, setLeaveType] = useState('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !reason) {
      alert('Please fill out all required fields.');
      return;
    }
    const finalEndDate = endDate || startDate;
    setSubmitting(true);
    try {
      await applyLeave({ leaveType, startDate, endDate: finalEndDate, reason });
      setStartDate('');
      setEndDate('');
      setReason('');
      onRefresh();
      alert('Leave request submitted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Apply Leave Request Form */}
      <div className="lg:col-span-1">
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm space-y-4">
          <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">edit_calendar</span>
            Apply for Leave
          </h3>
          <p className="text-body-sm text-on-surface-variant">Propose a leave of absence to the Super Admin.</p>

          <label className="block">
            <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">Leave Type</span>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className={`${inputCls} appearance-none cursor-pointer`}
            >
              <option value="casual">Casual Leave (CL)</option>
              <option value="sick">Sick Leave (SL)</option>
              <option value="medical">Medical / Privilege Leave (PL)</option>
              <option value="unpaid">Loss of Pay (LOP)</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">Start Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
                required
              />
            </label>
            <label className="block">
              <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">End Date <span className="normal-case font-normal text-on-surface-variant/60">(Optional)</span></span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Provide a reason for leave..."
              className="w-full bg-transparent border border-outline-variant rounded-xl p-3 text-sm text-on-surface focus:border-primary outline-none resize-none"
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-on-primary py-2.5 rounded-full font-bold text-sm hover:brightness-105 active:scale-95 transition disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5 shadow"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            {submitting ? 'Submitting…' : 'Submit Leave Request'}
          </button>
        </form>
      </div>

      {/* Leave Request History */}
      <div className="lg:col-span-2">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm space-y-4">
          <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">calendar_month</span>
            My Leave History
          </h3>
          <p className="text-body-sm text-on-surface-variant">View statuses of your current and past leave requests.</p>

          {myLeaves.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant italic">No leave history found.</p>
          ) : (
            <div className="overflow-x-auto border border-outline-variant/40 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-container-high border-b border-outline-variant/40">
                  <tr className="text-on-surface-variant uppercase tracking-wider font-extrabold text-[10px]">
                    <th className="p-3">Dates</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-on-surface font-medium">
                  {myLeaves.map((l) => (
                    <tr key={l.id} className="hover:bg-surface-container-low/20 transition-colors">
                      <td className="p-3 font-semibold">
                        <div>{l.startDate} to {l.endDate}</div>
                        <div className="text-[9px] text-on-surface-variant mt-0.5">
                          Applied {new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </td>
                      <td className="p-3 capitalize font-bold text-primary">{l.leaveType}</td>
                      <td className="p-3 text-on-surface-variant max-w-[200px] truncate" title={l.reason}>
                        {l.reason}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          l.status === 'approved' ? 'bg-[#D1FADF] text-[#027A48]' :
                          l.status === 'rejected' ? 'bg-[#FEE4E2] text-[#B42318]' :
                          'bg-[#FEF0C7] text-[#B54708]'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AdminPage;
