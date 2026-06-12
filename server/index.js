/**
 * Recharge Rehabilitation — booking/admin API backed by PostgreSQL.
 *
 * Protocol: a single POST /api receiving { action, token, payload } and returning
 * { ok, result } or { ok:false, error }. Same shape the frontend store uses.
 *
 * Auth model (one shared login screen, three roles):
 *   - super_admin : everything (manage admins + employees, delete, reset passwords).
 *   - admin       : day-to-day ops (bookings, consultations, availability) + create
 *                   employees, edit employee profiles, reset employee passwords.
 *   - employee    : own dashboard — own profile + own assigned sessions.
 * `token` is an opaque session token handed out at login (stored in `sessions`).
 * A few actions are public: login, createBooking, listSpecialists, listBlocked(date).
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PORT = process.env.PORT || 3000;

// ---- helpers ---------------------------------------------------------------
const httpErr = (status, message) => Object.assign(new Error(message), { status });
const newId = () => randomUUID();
const isoOrNull = (v) => (v instanceof Date ? v.toISOString() : v);

const toBooking = (r) => ({
  id: r.id, source: r.source, mode: r.mode, sessionType: r.session_type,
  specialistId: r.specialist_id, date: r.date, slot: r.slot,
  parentName: r.parent_name, childAge: r.child_age, phone: r.phone,
  concern: r.concern, notes: r.notes, status: r.status, payment: r.payment,
  seen: r.seen, requestedAt: isoOrNull(r.requested_at), updatedAt: isoOrNull(r.updated_at),
});
const toUser = (r) => ({
  id: r.id, name: r.name, role: r.role, active: r.active, specialty: r.specialty,
  gender: r.gender, qualifications: r.qualifications, experience: r.experience,
  email: r.email, phone: r.phone, profileComplete: r.profile_complete,
  createdAt: isoOrNull(r.created_at),
});
const toBlocked = (r) => ({ id: r.id, date: r.date, time: r.time, staffId: r.staff_id, reason: r.reason });

const BOOKING_PATCH = {
  status: 'status', payment: 'payment', updatedAt: 'updated_at', date: 'date', slot: 'slot',
  specialistId: 'specialist_id', notes: 'notes', concern: 'concern', mode: 'mode',
  sessionType: 'session_type', parentName: 'parent_name', childAge: 'child_age', phone: 'phone', seen: 'seen',
};
const PROFILE_COLS = {
  name: 'name', gender: 'gender', qualifications: 'qualifications',
  experience: 'experience', email: 'email', phone: 'phone', specialty: 'specialty',
};

async function resolveUser(token) {
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now() AND u.active = TRUE`, [token],
  );
  return rows[0] ? rows[0] : null;
}

// ---- default accounts (created once on first boot) -------------------------
const SEED_EMPLOYEES = [
  ['e1', 'Employee 1', 'Speech-Language Therapist'],
  ['e2', 'Employee 2', 'Speech-Language Therapist'],
  ['e3', 'Employee 3', 'Special Educator'],
  ['e4', 'Employee 4', 'Special Educator'],
  ['e5', 'Employee 5', 'Behavioural Therapist'],
  ['e6', 'Employee 6', 'Audiologist / Hearing Specialist'],
  ['e7', 'Employee 7', 'Special Educator'],
  ['e8', 'Employee 8', 'Speech Therapist'],
  ['e9', 'Employee 9', 'Counselor / Parent Trainer'],
  ['e10', 'Employee 10', 'Counselor / Parent Trainer'],
];

async function ensureSeedUsers() {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
  if (rows[0].n > 0) return;
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  await pool.query(
    `INSERT INTO users (id, name, password_hash, role) VALUES
       ('superadmin', 'Super Admin', $1, 'super_admin'),
       ('admin',      'Clinic Admin', $2, 'admin')`,
    [hash('super@recharge2026'), hash('admin@recharge2026')],
  );
  const empHash = hash('emp@recharge2026');
  for (const [id, name, specialty] of SEED_EMPLOYEES) {
    await pool.query(
      `INSERT INTO users (id, name, password_hash, role, specialty) VALUES ($1,$2,$3,'employee',$4)`,
      [id, name, empHash, specialty],
    );
  }
  console.log('Seeded default users: superadmin, admin, e1..e10');
}

// ---- action handlers -------------------------------------------------------
async function doLogin(p) {
  const { userId, password } = p || {};
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 AND active = TRUE', [userId]);
  const u = rows[0];
  if (!u || !bcrypt.compareSync(password || '', u.password_hash)) {
    throw httpErr(401, 'Invalid ID or password.');
  }
  const token = newId() + newId();
  await pool.query('INSERT INTO sessions (token, user_id) VALUES ($1,$2)', [token, u.id]);
  return { token, user: toUser(u) };
}

async function createBooking(b) {
  await pool.query(
    `INSERT INTO bookings
       (id, source, mode, session_type, specialist_id, date, slot, parent_name,
        child_age, phone, concern, notes, status, payment, seen, requested_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,FALSE,$15,$16)
     ON CONFLICT (id) DO NOTHING`,
    [b.id, b.source || 'booking', b.mode || 'clinic', b.sessionType || '', b.specialistId || 'any',
     b.date || '', b.slot || '', b.parentName || '', b.childAge || '', b.phone || '',
     b.concern || '', b.notes || '', b.status || 'requested', b.payment || 'pending',
     b.requestedAt || new Date().toISOString(), b.updatedAt || new Date().toISOString()],
  );
  return b;
}

async function listSpecialists() {
  const { rows } = await pool.query(
    `SELECT id, name, specialty FROM users WHERE role = 'employee' AND active = TRUE ORDER BY id`,
  );
  return rows.map((r) => ({ id: r.id, name: r.name, role: r.specialty, active: true }));
}

async function listBookings() {
  const { rows } = await pool.query('SELECT * FROM bookings ORDER BY requested_at DESC');
  return rows.map(toBooking);
}

async function updateBooking({ id, patch = {} }) {
  const sets = [], vals = [];
  let i = 1;
  for (const [k, col] of Object.entries(BOOKING_PATCH)) {
    if (k in patch) { sets.push(`${col} = $${i++}`); vals.push(patch[k]); }
  }
  if (!('updatedAt' in patch)) { sets.push(`updated_at = $${i++}`); vals.push(new Date().toISOString()); }
  vals.push(id);
  const { rows } = await pool.query(`UPDATE bookings SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals);
  if (!rows[0]) throw httpErr(404, 'Booking not found');
  return toBooking(rows[0]);
}

async function deleteBooking(id) {
  await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
  return { id };
}

async function markSeen(id) {
  await pool.query('UPDATE bookings SET seen = TRUE WHERE id = $1', [id]);
  return { id };
}
async function markAllSeen(source) {
  if (source) await pool.query('UPDATE bookings SET seen = TRUE WHERE source = $1', [source]);
  else await pool.query('UPDATE bookings SET seen = TRUE');
  return { ok: true };
}

async function listBlocked(date) {
  const { rows } = date
    ? await pool.query('SELECT * FROM blocked_slots WHERE date = $1', [date])
    : await pool.query('SELECT * FROM blocked_slots');
  return rows.map(toBlocked);
}
async function upsertBlocked(s) {
  await pool.query(
    `INSERT INTO blocked_slots (id, date, time, staff_id, reason) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE SET reason = EXCLUDED.reason`,
    [s.id, s.date, s.time, s.staffId || 'any', s.reason || ''],
  );
  return s;
}
async function removeBlocked(id) {
  await pool.query('DELETE FROM blocked_slots WHERE id = $1', [id]);
  return { id };
}

async function listUsers() {
  const { rows } = await pool.query(
    `SELECT * FROM users ORDER BY CASE role WHEN 'super_admin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, id`,
  );
  return rows.map(toUser);
}

async function createUser(actor, p) {
  const role = p.role || 'employee';
  if (actor.role !== 'super_admin' && role !== 'employee') {
    throw httpErr(403, 'Only the super admin can create admin accounts.');
  }
  if (!p.id || !p.password) throw httpErr(400, 'A login ID and password are required.');
  const exists = await pool.query('SELECT 1 FROM users WHERE id = $1', [p.id]);
  if (exists.rowCount) throw httpErr(409, 'That login ID is already taken.');
  const { rows } = await pool.query(
    `INSERT INTO users (id, name, password_hash, role, specialty, gender, qualifications, experience, email, phone)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [p.id, p.name || '', bcrypt.hashSync(p.password, 10), role, p.specialty || '',
     p.gender || '', p.qualifications || '', p.experience || '', p.email || '', p.phone || ''],
  );
  return toUser(rows[0]);
}

async function updateUser(actor, { id, patch = {} }) {
  const { rows: tr } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  const target = tr[0];
  if (!target) throw httpErr(404, 'User not found');
  if (actor.role !== 'super_admin') {
    if (actor.role !== 'admin' || target.role !== 'employee') {
      throw httpErr(403, 'Admins can only edit employee accounts.');
    }
  }
  const sets = [], vals = [];
  let i = 1;
  for (const [k, col] of Object.entries(PROFILE_COLS)) {
    if (k in patch) { sets.push(`${col} = $${i++}`); vals.push(patch[k]); }
  }
  if ('active' in patch) { sets.push(`active = $${i++}`); vals.push(!!patch.active); }
  if ('role' in patch && actor.role === 'super_admin') { sets.push(`role = $${i++}`); vals.push(patch.role); }
  if (!sets.length) return toUser(target);
  vals.push(id);
  const { rows } = await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals);
  return toUser(rows[0]);
}

async function resetPassword(actor, { id, password }) {
  if (!password) throw httpErr(400, 'A new password is required.');
  const { rows: tr } = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
  if (!tr[0]) throw httpErr(404, 'User not found');
  if (actor.role !== 'super_admin' && !(actor.role === 'admin' && tr[0].role === 'employee')) {
    throw httpErr(403, 'Not allowed to reset this password.');
  }
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [bcrypt.hashSync(password, 10), id]);
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]); // force re-login
  return { id };
}

async function deleteUser(id) {
  const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
  if (!rows[0]) return { id };
  if (rows[0].role === 'super_admin') {
    const { rows: c } = await pool.query(`SELECT count(*)::int n FROM users WHERE role = 'super_admin'`);
    if (c[0].n <= 1) throw httpErr(400, 'Cannot delete the only super admin.');
  }
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
  return { id };
}

async function updateMyProfile(user, patch = {}) {
  const sets = [], vals = [];
  let i = 1;
  for (const [k, col] of Object.entries(PROFILE_COLS)) {
    if (k in patch) { sets.push(`${col} = $${i++}`); vals.push(patch[k]); }
  }
  sets.push(`profile_complete = TRUE`);
  vals.push(user.id);
  const { rows } = await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals);
  return toUser(rows[0]);
}

async function listMySessions(user) {
  const { rows } = await pool.query(
    `SELECT * FROM bookings WHERE specialist_id = $1 ORDER BY date, slot`, [user.id],
  );
  return rows.map(toBooking);
}

// ---- router ----------------------------------------------------------------
async function route(action, payload, token) {
  // public
  if (action === 'login') return doLogin(payload);
  if (action === 'createBooking') return createBooking(payload);
  if (action === 'listSpecialists' || action === 'listStaff') return listSpecialists();
  if (action === 'listBlocked' && payload && payload.date) return listBlocked(payload.date);

  // authenticated
  const user = await resolveUser(token);
  if (!user) throw httpErr(401, 'Please sign in again.');
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  const isSuper = user.role === 'super_admin';
  const adminOnly = () => { if (!isAdmin) throw httpErr(403, 'Admins only.'); };
  const superOnly = () => { if (!isSuper) throw httpErr(403, 'Super admin only.'); };

  switch (action) {
    case 'me': return toUser(user);
    case 'logout': await pool.query('DELETE FROM sessions WHERE token = $1', [token]); return { ok: true };
    case 'updateMyProfile': return updateMyProfile(user, payload);
    case 'listMySessions': return listMySessions(user);

    case 'listBookings': adminOnly(); return listBookings();
    case 'updateBooking': adminOnly(); return updateBooking(payload);
    case 'deleteBooking': superOnly(); return deleteBooking(payload.id);
    case 'markSeen': adminOnly(); return markSeen(payload.id);
    case 'markAllSeen': adminOnly(); return markAllSeen(payload && payload.source);

    case 'listBlocked': adminOnly(); return listBlocked();
    case 'addBlocked': adminOnly(); return upsertBlocked(payload);
    case 'removeBlocked': adminOnly(); return removeBlocked(payload.id);

    case 'listUsers': adminOnly(); return listUsers();
    case 'createUser': adminOnly(); return createUser(user, payload);
    case 'updateUser': adminOnly(); return updateUser(user, payload);
    case 'resetPassword': adminOnly(); return resetPassword(user, payload);
    case 'deleteUser': superOnly(); return deleteUser(payload.id);

    default: throw httpErr(400, 'Unknown action: ' + action);
  }
}

// ---- HTTP ------------------------------------------------------------------
const app = express();
app.use(cors({ origin: true }));
const textBody = express.text({ type: () => true, limit: '256kb' });

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, result: 'Recharge API + Postgres are running.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

app.post('/api', textBody, async (req, res) => {
  let body;
  try {
    body = typeof req.body === 'string' && req.body ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }
  try {
    const result = await route(body.action, body.payload || {}, body.token);
    res.json({ ok: true, result });
  } catch (err) {
    const status = err.status && err.status < 500 ? 200 : 500;
    res.status(status).json({ ok: false, error: String(err.message || err) });
  }
});

// Serve the built SPA from the same origin (site + /api on one port).
const distDir = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distDir));
app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));

ensureSeedUsers()
  .catch((e) => console.error('Seed error:', e))
  .finally(() => app.listen(PORT, () => console.log(`Recharge server (site + API) listening on :${PORT}`)));
