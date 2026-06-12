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
  SLOT_TIMES,
  formatSlot,
  type BookingRequest,
  type BookingStatus,
  type BookingSource,
  type PaymentStatus,
  type User,
  type Role,
  type BlockedSlot,
} from '../lib/store';
import EmployeeDashboard from './EmployeeDashboard';

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
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      onLoggedIn(await login(id.trim(), pw));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-grow bg-background flex items-center justify-center px-6 py-16">
      <form onSubmit={submit} className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-[2rem] p-8 shadow-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary-fixed grid place-items-center text-primary mx-auto mb-5">
          <span className="material-symbols-outlined text-[28px]">lock</span>
        </div>
        <h1 className="text-headline-md font-extrabold text-on-surface mb-1">Staff Sign In</h1>
        <p className="text-body-sm text-on-surface-variant mb-6">Admins and employees sign in here.</p>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Login ID"
          autoFocus
          autoCapitalize="none"
          className="w-full bg-transparent border border-outline-variant rounded-2xl py-3 px-4 text-body-md text-on-surface text-center focus:border-primary focus:ring-1 focus:ring-primary outline-none mb-3"
        />
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          className="w-full bg-transparent border border-outline-variant rounded-2xl py-3 px-4 text-body-md text-on-surface text-center focus:border-primary focus:ring-1 focus:ring-primary outline-none mb-3"
        />
        {err && <p className="text-body-sm text-[#B42318] mb-3">{err}</p>}
        <button type="submit" disabled={busy} className="w-full bg-primary text-on-primary py-3 rounded-full font-bold text-sm hover:brightness-95 active:scale-95 transition-all duration-200 shadow-md disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
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
        {tab === 'availability' && <AvailabilityTab />}
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
// Availability
// ---------------------------------------------------------------------------
const AvailabilityTab: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);
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
    <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.25rem] p-5 md:p-7 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Field label="Date"><input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
        <p className="text-body-sm text-on-surface-variant self-end">Click a time to block / unblock it. Blocked times disappear from the public booking grid.</p>
      </div>
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
  );
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
