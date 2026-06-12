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
}

export interface BlockedSlot {
  id: string;
  date: string;
  time: string;
  staffId: string;
  reason: string;
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
