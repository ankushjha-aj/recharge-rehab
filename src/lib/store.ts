/*
 * Data layer for Recharge Rehabilitation — bookings, auth/roles, and admin.
 *
 * Backends:
 *   - "remote": the Postgres API (VITE_API_ENDPOINT, default "/api"). All auth and
 *               admin features require this.
 *   - "local":  localStorage fallback used only for the PUBLIC booking flow when no
 *               endpoint is configured (so the marketing site/demo still works).
 *
 * Protocol: POST { action, token, payload } → { ok, result }.
 */

export type BookingStatus = 'requested' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'paid_online' | 'pay_on_visit' | 'waived';
export type BookingSource = 'booking' | 'consultation';
export type SessionMode = 'online' | 'clinic';
export type Role = 'super_admin' | 'admin' | 'employee';

export interface BookingRequest {
  id: string;
  source: BookingSource;
  mode: SessionMode;
  sessionType: string;
  specialistId: string;
  date: string;
  slot: string;
  parentName: string;
  childAge: string;
  phone: string;
  concern: string;
  notes: string;
  status: BookingStatus;
  payment: PaymentStatus;
  seen: boolean;
  requestedAt: string;
  updatedAt: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string; // specialty label
  active: boolean;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  specialty: string;
  gender: string;
  qualifications: string;
  experience: string;
  email: string;
  phone: string;
  profileComplete: boolean;
  createdAt?: string;
  profileImage?: string;
  parentName?: string;
  parentRelation?: string;
  parentPhone?: string;
  address?: string;
  extraPhone?: string;
  education10th?: string;
  education12th?: string;
  educationGrad?: string;
  isFirstJob?: boolean;
  pastExperience?: string;
}

export interface BlockedSlot {
  id: string;
  date: string;
  time: string;
  staffId: string;
  reason: string;
  source?: 'manual' | 'csv';
}

/** Same-day availability for the public booking grid (see dayAvailability). */
export interface DayAvailability {
  date: string;
  blocked: { time: string; staffId: string; source?: string }[]; // staffId 'any' = clinic-wide
  booked: { specialistId: string; slot: string }[]; // slots already taken via the website
}

/** One employee's busy times for a day, parsed from the admin's daily CSV. */
export interface CsvAvailabilityEntry {
  identifier: string; // employee login id or name as written in the sheet
  times: string[]; // canonical 'HH:mm' values (already expanded for full-day)
}

export type NewBooking = Omit<BookingRequest, 'id' | 'status' | 'payment' | 'seen' | 'requestedAt' | 'updatedAt'>;

// --- scheduling constants ---------------------------------------------------
export const SLOT_TIMES = ['10:00', '10:45', '11:30', '12:15', '13:00', '13:45', '14:30', '15:15', '16:00', '16:45'];

export const formatSlot = (t: string): string => {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${period}`;
};

// Today's date as a local yyyy-mm-dd (parents can only book same-day).
export const todayISO = (): string => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// Minutes-since-midnight of a 'HH:mm' slot, for past-slot greying.
export const slotMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const FULL_DAY_WORDS = new Set(['all', 'full', 'off', 'leave', 'busy', 'unavailable', 'holiday', 'closed']);

/**
 * Normalise a single time token from the CSV to a canonical SLOT_TIMES value.
 * Accepts '10:00', '10', '10am', '10:00 AM', '1pm', '13:00'. Returns null if it
 * isn't a recognised clinic slot.
 */
export const normalizeSlotTime = (raw: string): string | null => {
  const s = raw.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  const t = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  return SLOT_TIMES.includes(t) ? t : null;
};

/**
 * Parse the admin's daily availability CSV into per-employee busy times.
 * Layout (header row optional):  employee, time, time, …
 *   e1, 10:00, 10:45 11:30          → e1 busy at those three slots
 *   Employee 3, all                 → Employee 3 unavailable all day
 * The first cell is the employee (login id OR name); the rest are times (comma,
 * space or semicolon separated). 'all'/'off'/'leave' = the whole day.
 * Returns the entries plus any unrecognised time tokens (for a warning).
 */
export function parseAvailabilityCsv(text: string): { entries: CsvAvailabilityEntry[]; badTimes: string[] } {
  const entries: CsvAvailabilityEntry[] = [];
  const badTimes: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const cells = line.split(',').map((c) => c.trim()).filter((c, i) => i === 0 || c.length > 0);
    const identifier = cells[0];
    if (!identifier) continue;
    // Skip an obvious header row.
    if (/^(employee|name|staff|therapist|id)$/i.test(identifier) && cells.length <= 1) continue;
    if (entries.length === 0 && /^(employee|name|staff|therapist|id)$/i.test(identifier)) {
      const rest = cells.slice(1).join(' ').toLowerCase();
      if (/time|slot|busy|session/.test(rest)) continue; // header line
    }
    const tokens = cells.slice(1).flatMap((c) => c.split(/[\s;]+/)).filter(Boolean);
    const times = new Set<string>();
    let fullDay = false;
    for (const tok of tokens) {
      if (FULL_DAY_WORDS.has(tok.toLowerCase())) {
        fullDay = true;
        continue;
      }
      const t = normalizeSlotTime(tok);
      if (t) times.add(t);
      else badTimes.push(`${identifier}: "${tok}"`);
    }
    if (fullDay) SLOT_TIMES.forEach((t) => times.add(t));
    if (times.size === 0 && !fullDay) continue;
    entries.push({ identifier, times: SLOT_TIMES.filter((t) => times.has(t)) });
  }
  return { entries, badTimes };
}

/** Is a specific employee busy at `time` (clinic-wide block, own block, or a booking)? */
export function isStaffBusyAt(avail: DayAvailability, staffId: string, time: string): boolean {
  for (const b of avail.blocked) {
    if (b.time === time && (b.staffId === 'any' || b.staffId === staffId)) return true;
  }
  for (const b of avail.booked) {
    if (b.slot === time && b.specialistId === staffId) return true;
  }
  return false;
}

/**
 * The set of times unavailable for a given selection.
 *   - a specific specialist: their own blocks + clinic-wide blocks + their bookings
 *   - 'any': only times where every active specialist is busy (no one free)
 */
export function takenTimesFor(avail: DayAvailability, specialistId: string, specialists: Staff[]): Set<string> {
  const out = new Set<string>();
  if (specialistId !== 'any') {
    for (const t of SLOT_TIMES) if (isStaffBusyAt(avail, specialistId, t)) out.add(t);
    return out;
  }
  const active = specialists.filter((s) => s.active);
  for (const t of SLOT_TIMES) {
    const clinicWide = avail.blocked.some((b) => b.time === t && b.staffId === 'any');
    if (clinicWide || (active.length > 0 && active.every((s) => isStaffBusyAt(avail, s.id, t)))) out.add(t);
  }
  return out;
}

// Local-only fallback specialist list (used when no backend is configured).
export const DEFAULT_STAFF: Staff[] = [
  { id: 'e1', name: 'Employee 1', role: 'Speech-Language Therapist', active: true },
  { id: 'e2', name: 'Employee 2', role: 'Speech-Language Therapist', active: true },
  { id: 'e3', name: 'Employee 3', role: 'Special Educator', active: true },
  { id: 'e4', name: 'Employee 4', role: 'Special Educator', active: true },
  { id: 'e5', name: 'Employee 5', role: 'Behavioural Therapist', active: true },
  { id: 'e6', name: 'Employee 6', role: 'Audiologist / Hearing Specialist', active: true },
  { id: 'e7', name: 'Employee 7', role: 'Special Educator', active: true },
  { id: 'e8', name: 'Employee 8', role: 'Speech Therapist', active: true },
  { id: 'e9', name: 'Employee 9', role: 'Counselor / Parent Trainer', active: true },
  { id: 'e10', name: 'Employee 10', role: 'Counselor / Parent Trainer', active: true },
];

// --- config -----------------------------------------------------------------
const ENV = import.meta.env as Record<string, string | undefined>;
const REMOTE_ENDPOINT = ENV.VITE_API_ENDPOINT || ENV.VITE_SHEETS_ENDPOINT || '';
export const isRemote = (): boolean => REMOTE_ENDPOINT.length > 0;

// --- session ----------------------------------------------------------------
const TOKEN_KEY = 'rr_session_token';
const USER_KEY = 'rr_session_user';

let sessionToken = sessionStorage.getItem(TOKEN_KEY) || '';
let currentUser: User | null = (() => {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
})();

export const getToken = (): string => sessionToken;
export const getCurrentUser = (): User | null => currentUser;

function setSession(token: string, user: User): void {
  sessionToken = token;
  currentUser = user;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearSession(): void {
  sessionToken = '';
  currentUser = null;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}
function setCurrentUser(user: User): void {
  currentUser = user;
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

// --- remote helper ----------------------------------------------------------
async function remote<T>(action: string, payload: unknown = {}, withToken = true): Promise<T> {
  const res = await fetch(REMOTE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: withToken ? sessionToken : undefined, payload }),
  });
  const data = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as {
    ok: boolean;
    error?: string;
    result?: T;
  };
  if (!data.ok) throw new Error(data.error || 'Request failed');
  return data.result as T;
}

const requireRemote = () => {
  if (!isRemote()) throw new Error('The admin backend is not configured (set VITE_API_ENDPOINT).');
};

// --- localStorage fallback (public booking demo only) -----------------------
const LKEYS = { bookings: 'rr_bookings', blocked: 'rr_blocked' };
function lread<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function lwrite<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();

// ===========================================================================
// Auth
// ===========================================================================
export async function login(userId: string, password: string): Promise<User> {
  requireRemote();
  const { token, user } = await remote<{ token: string; user: User }>('login', { userId, password }, false);
  setSession(token, user);
  return user;
}

export async function logout(): Promise<void> {
  if (isRemote() && sessionToken) {
    try {
      await remote('logout', {});
    } catch {
      /* ignore */
    }
  }
  clearSession();
}

// Re-validate the stored session against the server (call on admin mount).
export async function refreshMe(): Promise<User | null> {
  if (!isRemote() || !sessionToken) return null;
  try {
    const user = await remote<User>('me', {});
    setCurrentUser(user);
    return user;
  } catch {
    clearSession();
    return null;
  }
}

// ===========================================================================
// Public booking flow (works offline via localStorage)
// ===========================================================================
export async function submitBooking(input: NewBooking): Promise<BookingRequest> {
  const record: BookingRequest = {
    ...input,
    id: newId(),
    status: 'requested',
    payment: 'pending',
    seen: false,
    requestedAt: now(),
    updatedAt: now(),
  };
  if (isRemote()) {
    await remote('createBooking', record, false);
    return record;
  }
  lwrite(LKEYS.bookings, [record, ...lread<BookingRequest[]>(LKEYS.bookings, [])]);
  return record;
}

export async function listSpecialists(): Promise<Staff[]> {
  if (isRemote()) return remote<Staff[]>('listSpecialists', {}, false);
  return DEFAULT_STAFF;
}

export async function listBlocked(date?: string): Promise<BlockedSlot[]> {
  if (isRemote()) return remote<BlockedSlot[]>('listBlocked', { date }, !date);
  const all = lread<BlockedSlot[]>(LKEYS.blocked, []);
  return date ? all.filter((b) => b.date === date) : all;
}

export async function blockedTimesFor(date: string): Promise<Set<string>> {
  if (!date) return new Set();
  try {
    const list = await listBlocked(date);
    return new Set(list.filter((b) => b.staffId === 'any').map((b) => b.time));
  } catch {
    return new Set();
  }
}

// Full same-day availability for the public booking grid (per-staff blocks +
// slots already taken by website bookings). Empty/offline → nothing taken.
export async function dayAvailability(date: string): Promise<DayAvailability> {
  const empty: DayAvailability = { date, blocked: [], booked: [] };
  if (!date) return empty;
  if (isRemote()) {
    try {
      return await remote<DayAvailability>('dayAvailability', { date }, false);
    } catch {
      return empty;
    }
  }
  const all = lread<BlockedSlot[]>(LKEYS.blocked, []).filter((b) => b.date === date);
  return { date, blocked: all.map((b) => ({ time: b.time, staffId: b.staffId, source: b.source })), booked: [] };
}

// ===========================================================================
// Admin — bookings (remote-only)
// ===========================================================================
export async function listBookings(): Promise<BookingRequest[]> {
  requireRemote();
  return remote<BookingRequest[]>('listBookings', {});
}
export async function updateBooking(id: string, patch: Partial<BookingRequest>): Promise<void> {
  requireRemote();
  await remote('updateBooking', { id, patch: { ...patch, updatedAt: now() } });
}
export async function deleteBooking(id: string): Promise<void> {
  requireRemote();
  await remote('deleteBooking', { id });
}
export async function markSeen(id: string): Promise<void> {
  requireRemote();
  await remote('markSeen', { id });
}
export async function markAllSeen(source?: BookingSource): Promise<void> {
  requireRemote();
  await remote('markAllSeen', { source });
}

// Availability
export async function addBlocked(date: string, time: string, staffId = 'any', reason = ''): Promise<BlockedSlot> {
  requireRemote();
  const record: BlockedSlot = { id: `${date}|${time}|${staffId}`, date, time, staffId, reason };
  await remote('addBlocked', record);
  return record;
}
export async function removeBlocked(id: string): Promise<void> {
  requireRemote();
  await remote('removeBlocked', { id });
}

export interface CsvApplyResult {
  date: string;
  blockedSlots: number;
  matched: { identifier: string; staffId: string; name: string; count: number }[];
  unmatched: string[];
}

// Replace a day's CSV-imported blocks with a freshly parsed set (manual blocks untouched).
export async function applyCsvAvailability(date: string, entries: CsvAvailabilityEntry[]): Promise<CsvApplyResult> {
  requireRemote();
  return remote<CsvApplyResult>('applyCsvAvailability', { date, entries });
}
export async function clearCsvAvailability(date: string): Promise<{ date: string; removed: number }> {
  requireRemote();
  return remote<{ date: string; removed: number }>('clearCsvAvailability', { date });
}

// ===========================================================================
// Admin — users / employees (remote-only)
// ===========================================================================
export interface NewUser {
  id: string;
  name: string;
  password: string;
  role: Role;
  specialty?: string;
  gender?: string;
  qualifications?: string;
  experience?: string;
  email?: string;
  phone?: string;
}

export async function listUsers(): Promise<User[]> {
  requireRemote();
  return remote<User[]>('listUsers', {});
}
export async function createUser(input: NewUser): Promise<User> {
  requireRemote();
  return remote<User>('createUser', input);
}
export async function updateUser(id: string, patch: Partial<User>): Promise<User> {
  requireRemote();
  return remote<User>('updateUser', { id, patch });
}
export async function resetPassword(id: string, password: string): Promise<void> {
  requireRemote();
  await remote('resetPassword', { id, password });
}
export async function deleteUser(id: string): Promise<void> {
  requireRemote();
  await remote('deleteUser', { id });
}

// ===========================================================================
// Employee self-service (remote-only)
// ===========================================================================
export async function updateMyProfile(patch: Partial<User>): Promise<User> {
  requireRemote();
  const user = await remote<User>('updateMyProfile', patch);
  setCurrentUser(user);
  return user;
}
export async function listMySessions(): Promise<BookingRequest[]> {
  requireRemote();
  return remote<BookingRequest[]>('listMySessions', {});
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  seenByAdmin: boolean;
  employeeName?: string;
  employeeSpecialty?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  punchIn: string;
  status: 'present';
}

export async function resetMyPassword(password: string): Promise<void> {
  requireRemote();
  await remote('resetMyPassword', { newPassword: password });
}

export async function applyLeave(payload: { leaveType: string; startDate: string; endDate: string; reason: string }): Promise<LeaveRequest> {
  requireRemote();
  return remote<LeaveRequest>('applyLeave', payload);
}

export async function listMyLeaves(): Promise<LeaveRequest[]> {
  requireRemote();
  return remote<LeaveRequest[]>('listMyLeaves', {});
}

export async function listAllLeaves(): Promise<LeaveRequest[]> {
  requireRemote();
  return remote<LeaveRequest[]>('listAllLeaves', {});
}

export async function updateLeaveStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
  requireRemote();
  await remote('updateLeaveStatus', { id, status });
}

export async function markLeavesSeen(): Promise<void> {
  requireRemote();
  await remote('markLeavesSeen', {});
}

export async function punchIn(): Promise<AttendanceRecord> {
  requireRemote();
  return remote<AttendanceRecord>('punchIn', {});
}

export async function getTodayAttendance(): Promise<AttendanceRecord | null> {
  requireRemote();
  return remote<AttendanceRecord | null>('getTodayAttendance', {});
}


// Database query tools
export interface DbQueryResult {
  rows: any[];
  rowCount: number;
  fields: { name: string; dataTypeID: number }[];
}

export async function executeDbQuery(sql: string, params?: unknown[]): Promise<DbQueryResult> {
  requireRemote();
  return remote<DbQueryResult>('dbQuery', { sql, params });
}

