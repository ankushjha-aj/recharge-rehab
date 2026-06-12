/*
 * Data layer for Recharge Rehabilitation bookings + admin panel.
 *
 * Backend-agnostic by design. Two backends are supported:
 *   1. "local"  — browser localStorage. Used for demo/dev and as a fallback when no
 *                 remote endpoint is configured. (Data lives only in that browser.)
 *   2. "remote" — a Google Apps Script web app (or any compatible JSON endpoint).
 *                 Activated by setting VITE_SHEETS_ENDPOINT. The admin passcode is
 *                 sent as a token and verified server-side, so no secret ships in the
 *                 frontend bundle. See docs/ADMIN_SETUP.md.
 *
 * Every function is async so swapping local ↔ remote needs no call-site changes.
 */

export type BookingStatus = 'requested' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'paid_online' | 'pay_on_visit' | 'waived';
export type BookingSource = 'booking' | 'consultation';
export type SessionMode = 'online' | 'clinic';

export interface BookingRequest {
  id: string;
  source: BookingSource;
  mode: SessionMode;
  sessionType: string;
  specialistId: string; // 'any' or a Staff id
  date: string; // preferred date, yyyy-mm-dd ('' if none)
  slot: string; // preferred time, 'HH:mm' ('' if none)
  parentName: string;
  childAge: string;
  phone: string;
  concern: string;
  notes: string;
  status: BookingStatus;
  payment: PaymentStatus;
  requestedAt: string; // ISO
  updatedAt: string; // ISO
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

export interface BlockedSlot {
  id: string; // `${date}|${time}|${staffId}`
  date: string; // yyyy-mm-dd
  time: string; // 'HH:mm'
  staffId: string; // 'any' blocks the time for everyone
  reason: string;
}

export type NewBooking = Omit<BookingRequest, 'id' | 'status' | 'payment' | 'requestedAt' | 'updatedAt'>;

// ---------------------------------------------------------------------------
// Shared scheduling constants (used by the booking page + admin availability).
// ---------------------------------------------------------------------------

// Working hours Mon–Sat 10:00 AM – 05:45 PM → 45-min slots.
export const SLOT_TIMES = ['10:00', '10:45', '11:30', '12:15', '13:00', '13:45', '14:30', '15:15', '16:00', '16:45'];

export const formatSlot = (t: string): string => {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${period}`;
};

// The 10 reference employees seeded on first run. Replace with real staff later.
export const DEFAULT_STAFF: Staff[] = [
  { id: 'e1', name: 'Employee 1', role: 'Speech-Language Therapist', active: true },
  { id: 'e2', name: 'Employee 2', role: 'Speech-Language Therapist', active: true },
  { id: 'e3', name: 'Employee 3', role: 'Special Educator', active: true },
  { id: 'e4', name: 'Employee 4', role: 'Special Educator', active: true },
  { id: 'e5', name: 'Employee 5', role: 'Behavioural Therapist', active: true },
  { id: 'e6', name: 'Employee 6', role: 'Audiologist / Hearing Specialist', active: true },
  { id: 'e7', name: 'Employee 7', role: 'Special Educator', active: true },
  { id: 'e8', name: 'Employee 8', role: 'Speech Therapist', active: true },
  { id: 'e9', name: 'Employee 9', role: 'Behavioural Therapist', active: true },
  { id: 'e10', name: 'Employee 10', role: 'Counselor / Parent Trainer', active: true },
];

// ---------------------------------------------------------------------------
// Config — where the remote backend lives + the admin passcode/token.
// ---------------------------------------------------------------------------

const ENV = import.meta.env as Record<string, string | undefined>;
const REMOTE_ENDPOINT = ENV.VITE_SHEETS_ENDPOINT || '';
export const ADMIN_PASSCODE = ENV.VITE_ADMIN_PASSCODE || 'recharge2026';

export const isRemote = (): boolean => REMOTE_ENDPOINT.length > 0;

// The admin passcode entered at runtime; doubles as the remote token.
let sessionToken = '';
export const setSessionToken = (t: string) => {
  sessionToken = t;
};

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Remote backend (Google Apps Script). text/plain avoids a CORS preflight.
// ---------------------------------------------------------------------------

type RemoteAction =
  | 'createBooking'
  | 'listBookings'
  | 'updateBooking'
  | 'listStaff'
  | 'saveStaff'
  | 'removeStaff'
  | 'listBlocked'
  | 'addBlocked'
  | 'removeBlocked';

async function remote<T>(action: RemoteAction, payload: unknown, withToken = true): Promise<T> {
  const res = await fetch(REMOTE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: withToken ? sessionToken : undefined, payload }),
  });
  if (!res.ok) throw new Error(`Sheets request failed (${res.status})`);
  const data = (await res.json()) as { ok: boolean; error?: string; result?: T };
  if (!data.ok) throw new Error(data.error || 'Sheets request rejected');
  return data.result as T;
}

// ---------------------------------------------------------------------------
// Local backend (localStorage) — demo/fallback.
// ---------------------------------------------------------------------------

const KEYS = {
  bookings: 'rr_bookings',
  staff: 'rr_staff',
  blocked: 'rr_blocked',
  seeded: 'rr_seeded_v1',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/availability errors */
  }
}

// Seed staff + a couple of sample requests so the admin panel is demoable offline.
function ensureSeed(): void {
  if (read(KEYS.seeded, false)) return;
  write(KEYS.staff, DEFAULT_STAFF);
  const sample: BookingRequest[] = [
    {
      id: newId(), source: 'booking', mode: 'online', sessionType: 'Speech & Language',
      specialistId: 'e1', date: '', slot: '', parentName: 'Sample Parent', childAge: '5',
      phone: '9876500001', concern: 'Speech delay', notes: 'Mornings preferred.',
      status: 'requested', payment: 'pending', requestedAt: now(), updatedAt: now(),
    },
    {
      id: newId(), source: 'consultation', mode: 'clinic', sessionType: 'Initial Consultation',
      specialistId: 'any', date: '', slot: '', parentName: 'Sample Guardian', childAge: '7',
      phone: '9876500002', concern: 'ADHD assessment', notes: '',
      status: 'requested', payment: 'pending', requestedAt: now(), updatedAt: now(),
    },
  ];
  write(KEYS.bookings, sample);
  write(KEYS.seeded, true);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function submitBooking(input: NewBooking): Promise<BookingRequest> {
  const record: BookingRequest = {
    ...input,
    id: newId(),
    status: 'requested',
    payment: 'pending',
    requestedAt: now(),
    updatedAt: now(),
  };
  if (isRemote()) {
    // Public write — no token needed; the script only appends, never reads here.
    await remote<unknown>('createBooking', record, false);
    return record;
  }
  ensureSeed();
  const all = read<BookingRequest[]>(KEYS.bookings, []);
  write(KEYS.bookings, [record, ...all]);
  return record;
}

export async function listBookings(): Promise<BookingRequest[]> {
  if (isRemote()) return remote<BookingRequest[]>('listBookings', {});
  ensureSeed();
  return read<BookingRequest[]>(KEYS.bookings, []);
}

export async function updateBooking(id: string, patch: Partial<BookingRequest>): Promise<void> {
  if (isRemote()) {
    await remote<unknown>('updateBooking', { id, patch: { ...patch, updatedAt: now() } });
    return;
  }
  const all = read<BookingRequest[]>(KEYS.bookings, []);
  write(
    KEYS.bookings,
    all.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: now() } : b)),
  );
}

export async function listStaff(): Promise<Staff[]> {
  if (isRemote()) return remote<Staff[]>('listStaff', {});
  ensureSeed();
  return read<Staff[]>(KEYS.staff, DEFAULT_STAFF);
}

export async function saveStaff(staff: Staff): Promise<Staff> {
  const record: Staff = { ...staff, id: staff.id || newId() };
  if (isRemote()) {
    await remote<unknown>('saveStaff', record);
    return record;
  }
  const all = read<Staff[]>(KEYS.staff, DEFAULT_STAFF);
  const exists = all.some((s) => s.id === record.id);
  write(KEYS.staff, exists ? all.map((s) => (s.id === record.id ? record : s)) : [...all, record]);
  return record;
}

export async function removeStaff(id: string): Promise<void> {
  if (isRemote()) {
    await remote<unknown>('removeStaff', { id });
    return;
  }
  const all = read<Staff[]>(KEYS.staff, DEFAULT_STAFF);
  write(KEYS.staff, all.filter((s) => s.id !== id));
}

export async function listBlocked(date?: string): Promise<BlockedSlot[]> {
  let all: BlockedSlot[];
  if (isRemote()) {
    // Per-date availability is public (the booking grid shows it); the full list needs the token.
    all = await remote<BlockedSlot[]>('listBlocked', { date }, !date);
  } else {
    all = read<BlockedSlot[]>(KEYS.blocked, []);
  }
  return date ? all.filter((b) => b.date === date) : all;
}

export async function addBlocked(date: string, time: string, staffId = 'any', reason = ''): Promise<BlockedSlot> {
  const record: BlockedSlot = { id: `${date}|${time}|${staffId}`, date, time, staffId, reason };
  if (isRemote()) {
    await remote<unknown>('addBlocked', record);
    return record;
  }
  const all = read<BlockedSlot[]>(KEYS.blocked, []);
  if (!all.some((b) => b.id === record.id)) write(KEYS.blocked, [...all, record]);
  return record;
}

export async function removeBlocked(id: string): Promise<void> {
  if (isRemote()) {
    await remote<unknown>('removeBlocked', { id });
    return;
  }
  const all = read<BlockedSlot[]>(KEYS.blocked, []);
  write(KEYS.blocked, all.filter((b) => b.id !== id));
}

// Convenience: the set of blocked 'HH:mm' times for a date (public booking grid).
export async function blockedTimesFor(date: string): Promise<Set<string>> {
  if (!date) return new Set();
  try {
    const list = await listBlocked(date);
    return new Set(list.filter((b) => b.staffId === 'any').map((b) => b.time));
  } catch {
    return new Set();
  }
}
