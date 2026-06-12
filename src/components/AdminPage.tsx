import React, { useEffect, useMemo, useState } from 'react';
import {
  ADMIN_PASSCODE,
  setSessionToken,
  isRemote,
  listBookings,
  updateBooking,
  listStaff,
  saveStaff,
  removeStaff,
  listBlocked,
  addBlocked,
  removeBlocked,
  SLOT_TIMES,
  formatSlot,
  DEFAULT_STAFF,
  type BookingRequest,
  type BookingStatus,
  type PaymentStatus,
  type Staff,
  type BlockedSlot,
} from '../lib/store';

type Tab = 'requests' | 'staff' | 'availability' | 'payments';

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

const digits = (p: string) => p.replace(/\D/g, '');
const waLink = (phone: string, text: string) => {
  let d = digits(phone);
  if (d.length === 10) d = '91' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
};
const telLink = (phone: string) => `tel:${digits(phone)}`;

const Pill: React.FC<{ cls: string; children: React.ReactNode }> = ({ cls, children }) => (
  <span className={`inline-block text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${cls}`}>
    {children}
  </span>
);

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const AdminPage: React.FC = () => {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('rr_admin_ok') === '1');
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState<Tab>('requests');

  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Admin - Recharge Rehabilitation';
  }, []);

  // Restore the session token (passcode) so remote calls keep working on refresh.
  useEffect(() => {
    if (authed) setSessionToken(sessionStorage.getItem('rr_admin_token') || '');
  }, [authed]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([listBookings(), listStaff()]);
      setBookings(b);
      setStaff(s.length ? s : DEFAULT_STAFF);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) refresh();
  }, [authed, refresh]);

  const staffName = (id: string) => (id === 'any' ? 'No preference' : staff.find((s) => s.id === id)?.name ?? id);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === ADMIN_PASSCODE) {
      sessionStorage.setItem('rr_admin_ok', '1');
      sessionStorage.setItem('rr_admin_token', passcode);
      setSessionToken(passcode);
      setAuthed(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect passcode. Try again.');
    }
  };

  const logout = () => {
    sessionStorage.removeItem('rr_admin_ok');
    sessionStorage.removeItem('rr_admin_token');
    setSessionToken('');
    setAuthed(false);
    setPasscode('');
  };

  // -------------------------------------------------------------------------
  // Passcode gate
  // -------------------------------------------------------------------------
  if (!authed) {
    return (
      <div className="flex-grow bg-background flex items-center justify-center px-6 py-16">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-[2rem] p-8 shadow-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-fixed grid place-items-center text-primary mx-auto mb-5">
            <span className="material-symbols-outlined text-[28px]">admin_panel_settings</span>
          </div>
          <h1 className="text-headline-md font-extrabold text-on-surface mb-2">Admin Access</h1>
          <p className="text-body-sm text-on-surface-variant mb-6">Enter the staff passcode to manage bookings.</p>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            autoFocus
            className="w-full bg-transparent border border-outline-variant rounded-2xl py-3 px-4 text-body-md text-on-surface text-center focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200 mb-3"
          />
          {authError && <p className="text-body-sm text-[#B42318] mb-3">{authError}</p>}
          <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-full font-bold text-sm hover:brightness-95 active:scale-95 transition-all duration-200 shadow-md">
            Enter
          </button>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'requests', label: 'Requests', icon: 'inbox' },
    { id: 'staff', label: 'Staff', icon: 'groups' },
    { id: 'availability', label: 'Availability', icon: 'event_busy' },
    { id: 'payments', label: 'Payments', icon: 'payments' },
  ];

  return (
    <div className="flex-grow bg-background px-4 md:px-8 py-8">
      <div className="w-full max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-headline-lg font-extrabold text-on-surface">Booking Admin</h1>
            <p className="text-body-sm text-on-surface-variant flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${isRemote() ? 'bg-[#12B76A]' : 'bg-[#F79009]'}`} />
              {isRemote() ? 'Connected to Google Sheets' : 'Local demo mode — configure VITE_SHEETS_ENDPOINT to go live'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary px-4 py-2 rounded-full font-bold text-sm transition-colors">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refresh
            </button>
            <button onClick={logout} className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant hover:text-[#B42318] hover:border-[#B42318] px-4 py-2 rounded-full font-bold text-sm transition-colors">
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Log out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 active:scale-95 ${
                tab === t.id ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/60 hover:border-primary hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-body-sm text-on-surface-variant mb-4">Loading…</p>}

        {tab === 'requests' && <RequestsTab bookings={bookings} staffName={staffName} onChange={refresh} />}
        {tab === 'payments' && <PaymentsTab bookings={bookings} onChange={refresh} />}
        {tab === 'staff' && <StaffTab staff={staff} setStaff={setStaff} onChange={refresh} />}
        {tab === 'availability' && <AvailabilityTab />}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Requests tab
// ---------------------------------------------------------------------------
const RequestsTab: React.FC<{ bookings: BookingRequest[]; staffName: (id: string) => string; onChange: () => void }> = ({ bookings, staffName, onChange }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      const q = query.trim().toLowerCase();
      if (q && !(`${b.parentName} ${b.phone} ${b.sessionType} ${b.concern}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [bookings, statusFilter, query]);

  const setStatus = async (b: BookingRequest, status: BookingStatus) => {
    await updateBooking(b.id, { status });
    onChange();
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bookings.length };
    for (const b of bookings) c[b.status] = (c[b.status] || 0) + 1;
    return c;
  }, [bookings]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(['all', 'requested', 'confirmed', 'cancelled', 'completed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${statusFilter === s ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/60 hover:border-primary'}`}
          >
            {s === 'all' ? 'All' : STATUS_META[s].label} ({counts[s] || 0})
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, type…"
          className="ml-auto bg-transparent border border-outline-variant rounded-full py-2 px-4 text-sm text-on-surface focus:border-primary outline-none w-full sm:w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="inbox" text="No requests match your filters yet." />
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-headline-sm font-bold text-on-surface">{b.parentName || 'Unknown'}</h3>
                    <Pill cls={STATUS_META[b.status].cls}>{STATUS_META[b.status].label}</Pill>
                    <Pill cls="bg-surface-container-high text-on-surface-variant">{b.source === 'booking' ? 'Booking' : 'Consultation'}</Pill>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">
                    {b.sessionType} · {b.mode === 'online' ? 'Online' : 'In-Clinic'} · {staffName(b.specialistId)}
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    {b.date ? <>📅 {b.date}{b.slot ? ` · ${formatSlot(b.slot)}` : ''} · </> : null}
                    📞 {b.phone} · 👶 {b.childAge || '—'} yrs
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
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {b.status !== 'confirmed' && (
                      <button onClick={() => setStatus(b, 'confirmed')} className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#D1FADF] text-[#027A48] hover:brightness-95 transition">Confirm</button>
                    )}
                    {b.status !== 'completed' && (
                      <button onClick={() => setStatus(b, 'completed')} className="text-xs font-bold px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:brightness-95 transition">Complete</button>
                    )}
                    {b.status !== 'cancelled' && (
                      <button onClick={() => setStatus(b, 'cancelled')} className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#FEE4E2] text-[#B42318] hover:brightness-95 transition">Cancel</button>
                    )}
                  </div>
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
// Payments tab
// ---------------------------------------------------------------------------
const PaymentsTab: React.FC<{ bookings: BookingRequest[]; onChange: () => void }> = ({ bookings, onChange }) => {
  const setPayment = async (b: BookingRequest, payment: PaymentStatus) => {
    await updateBooking(b.id, { payment });
    onChange();
  };
  // Payments matter most for confirmed/completed bookings; show those first.
  const ordered = useMemo(
    () => [...bookings].sort((a, b) => Number(b.status === 'confirmed') - Number(a.status === 'confirmed')),
    [bookings],
  );

  if (bookings.length === 0) return <EmptyState icon="payments" text="No bookings to track payments for yet." />;

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
            <select
              value={b.payment}
              onChange={(e) => setPayment(b, e.target.value as PaymentStatus)}
              className="bg-transparent border border-outline-variant rounded-full py-1.5 px-3 text-sm text-on-surface focus:border-primary outline-none cursor-pointer"
            >
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

// ---------------------------------------------------------------------------
// Staff tab
// ---------------------------------------------------------------------------
const StaffTab: React.FC<{ staff: Staff[]; setStaff: React.Dispatch<React.SetStateAction<Staff[]>>; onChange: () => void }> = ({ staff, setStaff, onChange }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const persist = async (s: Staff) => {
    const saved = await saveStaff(s);
    setStaff((prev) => (prev.some((p) => p.id === saved.id) ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved]));
    onChange();
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await persist({ id: '', name: name.trim(), role: role.trim() || 'Therapist', active: true });
    setName('');
    setRole('');
  };

  const remove = async (id: string) => {
    await removeStaff(id);
    setStaff((prev) => prev.filter((p) => p.id !== id));
    onChange();
  };

  return (
    <div>
      <form onSubmit={add} className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-5 shadow-sm mb-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dr. Asha" className="w-full bg-transparent border border-outline-variant rounded-xl py-2.5 px-3 text-sm text-on-surface focus:border-primary outline-none" />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">Role</label>
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Speech Therapist" className="w-full bg-transparent border border-outline-variant rounded-xl py-2.5 px-3 text-sm text-on-surface focus:border-primary outline-none" />
        </div>
        <button type="submit" className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm hover:brightness-95 active:scale-95 transition flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">person_add</span>Add
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {staff.map((s) => (
          <div key={s.id} className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-4 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary-fixed grid place-items-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">badge</span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-on-surface truncate">{s.name}</p>
                <p className="text-body-sm text-on-surface-variant truncate">{s.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => persist({ ...s, active: !s.active })}
                title={s.active ? 'Active — click to set inactive' : 'Inactive — click to activate'}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition ${s.active ? 'bg-[#D1FADF] text-[#027A48]' : 'bg-surface-container-high text-on-surface-variant'}`}
              >
                {s.active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => remove(s.id)} title="Remove" className="w-8 h-8 grid place-items-center rounded-full text-on-surface-variant hover:bg-[#FEE4E2] hover:text-[#B42318] transition">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Availability tab
// ---------------------------------------------------------------------------
const AvailabilityTab: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);

  const load = React.useCallback(async (d: string) => {
    setBlocked(await listBlocked(d));
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  const blockedTimes = new Set(blocked.filter((b) => b.staffId === 'any').map((b) => b.time));

  const toggle = async (time: string) => {
    if (blockedTimes.has(time)) {
      await removeBlocked(`${date}|${time}|any`);
    } else {
      await addBlocked(date, time, 'any', 'Blocked by admin');
    }
    load(date);
  };

  const isSunday = new Date(date + 'T00:00:00').getDay() === 0;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-5 md:p-7 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div>
          <label className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">Date</label>
          <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border border-outline-variant rounded-xl py-2.5 px-3 text-sm text-on-surface focus:border-primary outline-none" />
        </div>
        <p className="text-body-sm text-on-surface-variant self-end">Click a time to block / unblock it. Blocked times disappear from the public booking grid (once Sheets is connected).</p>
      </div>

      {isSunday ? (
        <p className="text-body-md text-on-surface-variant">Sunday is closed — no slots to manage.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {SLOT_TIMES.map((t) => {
            const isBlocked = blockedTimes.has(t);
            return (
              <button
                key={t}
                onClick={() => toggle(t)}
                className={`py-2.5 rounded-xl text-sm font-bold border transition-all duration-200 active:scale-95 ${
                  isBlocked ? 'bg-[#FEE4E2] text-[#B42318] border-[#FDA29B] line-through' : 'bg-transparent text-on-surface border-outline-variant hover:border-primary hover:text-primary'
                }`}
              >
                {formatSlot(t)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const EmptyState: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div className="text-center py-16">
    <div className="w-14 h-14 rounded-full bg-primary-fixed grid place-items-center text-primary mx-auto mb-4">
      <span className="material-symbols-outlined text-[28px]">{icon}</span>
    </div>
    <p className="text-body-md text-on-surface-variant">{text}</p>
  </div>
);

export default AdminPage;
