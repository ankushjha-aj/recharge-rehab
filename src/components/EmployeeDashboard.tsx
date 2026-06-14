import React, { useEffect, useMemo, useState } from 'react';
import { updateMyProfile, listMySessions, formatSlot, type User, type BookingRequest } from '../lib/store';

const inputCls = 'w-full bg-transparent border border-outline-variant rounded-xl py-2.5 px-3 text-sm text-on-surface focus:border-primary outline-none';
const todayStr = () => new Date().toISOString().slice(0, 10);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-1.5 text-xs">{label}</span>
    {children}
  </label>
);

/**
 * Minimal employee dashboard: the employee fills their own profile and sees the
 * sessions assigned to them. (The full employee panel is a later phase.)
 * Login ID, password and role are controlled by the admin — not editable here.
 */
const EmployeeDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [me, setMe] = useState<User>(user);
  const [sessions, setSessions] = useState<BookingRequest[]>([]);
  const [form, setForm] = useState({
    name: user.name, gender: user.gender, qualifications: user.qualifications,
    experience: user.experience, email: user.email, phone: user.phone,
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState('');

  useEffect(() => {
    document.title = 'My Dashboard - Recharge Rehabilitation';
    listMySessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  const today = todayStr();
  const todays = useMemo(() => sessions.filter((s) => s.date === today), [sessions, today]);
  const upcoming = useMemo(() => sessions.filter((s) => s.date && s.date > today), [sessions, today]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateMyProfile(form);
      setMe(updated);
      setSavedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const SessionRow: React.FC<{ s: BookingRequest }> = ({ s }) => {
    const isCsvBlock = s.source === 'blocked' && s.sessionType === 'CSV Schedule Block';
    return (
      <div className="flex items-center justify-between gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3">
        <div className="min-w-0">
          <p className="font-bold text-on-surface text-sm truncate">{isCsvBlock ? `Child: ${s.parentName}` : s.parentName || 'Client'} · {s.sessionType}</p>
          <p className="text-body-sm text-on-surface-variant">{s.mode === 'online' ? 'Online' : 'In-Clinic'} · {s.slot ? formatSlot(s.slot) : 'time TBD'}{s.date ? ` · ${s.date}` : ''}</p>
        </div>
        <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-fixed text-primary shrink-0">{s.status}</span>
      </div>
    );
  };

  return (
    <div className="flex-grow bg-background px-4 md:px-8 py-8">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-headline-lg font-extrabold text-on-surface">My Dashboard</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              {me.name || me.id} · <span className="text-primary font-bold">{me.specialty || 'Employee'}</span>
              {!me.profileComplete && <span className="ml-2 text-[#B54708]">• please complete your profile</span>}
            </p>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant hover:text-[#B42318] hover:border-[#B42318] px-4 py-2 rounded-full font-bold text-sm transition-colors">
            <span className="material-symbols-outlined text-[18px]">logout</span>Log out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today + upcoming sessions */}
          <div className="space-y-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm">
              <h2 className="text-headline-sm font-bold text-on-surface mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-primary">today</span>Today's sessions</h2>
              {todays.length === 0 ? <p className="text-body-sm text-on-surface-variant">No sessions assigned for today.</p> : <div className="space-y-2">{todays.map((s) => <SessionRow key={s.id} s={s} />)}</div>}
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm">
              <h2 className="text-headline-sm font-bold text-on-surface mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-primary">event_upcoming</span>Upcoming</h2>
              {upcoming.length === 0 ? <p className="text-body-sm text-on-surface-variant">Nothing scheduled ahead.</p> : <div className="space-y-2">{upcoming.slice(0, 8).map((s) => <SessionRow key={s.id} s={s} />)}</div>}
            </div>
          </div>

          {/* Profile */}
          <form onSubmit={save} className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-5 shadow-sm">
            <h2 className="text-headline-sm font-bold text-on-surface mb-1 flex items-center gap-2"><span className="material-symbols-outlined text-primary">person</span>My profile</h2>
            <p className="text-body-sm text-on-surface-variant mb-4">Your login ID and password are managed by the admin.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
              <Field label="Gender"><input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="e.g. Female" className={inputCls} /></Field>
              <Field label="Qualifications"><input value={form.qualifications} onChange={(e) => setForm({ ...form, qualifications: e.target.value })} placeholder="e.g. MASLP" className={inputCls} /></Field>
              <Field label="Work experience"><input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="e.g. 4 years" className={inputCls} /></Field>
              <Field label="Email"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} /></Field>
              <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button type="submit" disabled={saving} className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm hover:brightness-95 active:scale-95 transition disabled:opacity-60">{saving ? 'Saving…' : 'Save profile'}</button>
              {savedAt && <span className="text-body-sm text-[#027A48]">Saved at {savedAt}</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
