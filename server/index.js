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
  profileImage: r.profile_image,
  parentName: r.parent_name, parentRelation: r.parent_relation, parentPhone: r.parent_phone,
  address: r.address, extraPhone: r.extra_phone,
  education10th: r.education_10th, education12th: r.education_12th, educationGrad: r.education_grad,
  isFirstJob: r.is_first_job, pastExperience: r.past_experience,
  baseSalary: r.base_salary,
});
const toBlocked = (r) => ({ id: r.id, date: r.date, time: r.time, staffId: r.staff_id, reason: r.reason, source: r.source });

const BOOKING_PATCH = {
  status: 'status', payment: 'payment', updatedAt: 'updated_at', date: 'date', slot: 'slot',
  specialistId: 'specialist_id', notes: 'notes', concern: 'concern', mode: 'mode',
  sessionType: 'session_type', parentName: 'parent_name', childAge: 'child_age', phone: 'phone', seen: 'seen',
};
const PROFILE_COLS = {
  name: 'name', gender: 'gender', qualifications: 'qualifications',
  experience: 'experience', email: 'email', phone: 'phone', specialty: 'specialty',
  profileImage: 'profile_image',
  parentName: 'parent_name', parentRelation: 'parent_relation', parentPhone: 'parent_phone',
  address: 'address', extraPhone: 'extra_phone',
  education10th: 'education_10th', education12th: 'education_12th', educationGrad: 'education_grad',
  isFirstJob: 'is_first_job', pastExperience: 'past_experience',
  baseSalary: 'base_salary',
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

// Idempotent boot migration: bring an existing DB up to the current schema
// (so a plain `pm2 restart` is enough — no manual psql step needed).
async function ensureSchema() {
  await pool.query(`ALTER TABLE blocked_slots ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'`);
  await pool.query(`CREATE INDEX IF NOT EXISTS blocked_date_source_idx ON blocked_slots (date, source)`);

  // Update users table with new columns
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_name TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_relation TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_phone TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS extra_phone TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS education_10th TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS education_12th TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS education_grad TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_job BOOLEAN DEFAULT FALSE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS past_experience TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS base_salary INTEGER DEFAULT 35000`);
  await pool.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS base_salary INTEGER DEFAULT 35000`);

  // Create global_settings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Seed default settings
  const seedSettings = [
    ['salary_incentive_tier1_sessions', '150'],
    ['salary_incentive_tier1_amount', '5000'],
    ['salary_incentive_tier2_sessions', '180'],
    ['salary_incentive_tier2_amount', '10000'],
    ['salary_incentive_tier3_sessions', '210'],
    ['salary_incentive_tier3_amount', '15000'],
    ['salary_base_paid_leaves', '2'],
    ['salary_extra_leave_deduction', '1000'],
    ['salary_unused_leave_bonus', '2000']
  ];
  for (const [k, v] of seedSettings) {
    await pool.query(
      `INSERT INTO global_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [k, v]
    );
  }

  // Create salary_slips table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS salary_slips (
      id             TEXT PRIMARY KEY,
      user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      month          TEXT NOT NULL,
      base_salary    INTEGER NOT NULL,
      sessions_count INTEGER NOT NULL,
      incentive      INTEGER NOT NULL,
      leaves_count   INTEGER NOT NULL,
      deductions     INTEGER NOT NULL,
      bonus          INTEGER NOT NULL,
      net_salary     INTEGER NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Create leave_requests table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      leave_type    TEXT NOT NULL,
      start_date    TEXT NOT NULL,
      end_date      TEXT NOT NULL,
      reason        TEXT NOT NULL DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'pending',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      seen_by_admin BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);

  // Create attendance table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id         TEXT PRIMARY KEY, -- user_id|date
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date       TEXT NOT NULL,
      punch_in   TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'present'
    )
  `);
}

async function ensureSeedUsers() {
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  
  // Ensure admins exist
  await pool.query(
    `INSERT INTO users (id, name, password_hash, role) VALUES
       ('superadmin', 'Super Admin', $1, 'super_admin'),
       ('admin',      'Clinic Admin', $2, 'admin')
     ON CONFLICT (id) DO NOTHING`,
    [hash('super@recharge2026'), hash('admin@recharge2026')],
  );

  const empHash = hash('emp@recharge2026');
  const employeesToSeed = [
    ['e1', 'SIDDHARTH AJ', 'Speech-Language Therapist'],
    ['e2', 'PRACHI AR', 'Speech-Language Therapist'],
    ['e3', 'KHUSHALI R3', 'Therapist'],
    ['e4', 'ADITI R4', 'Therapist'],
    ['e5', 'SULEKHA R5', 'Behavioural Therapist'],
    ['e6', 'UMAKANTI R1', 'Audiologist / Hearing Specialist'],
    ['e7', 'AVNI', 'Therapist'],
    ['e8', 'ABHIYANSHI', 'Speech Therapist'],
    ['e9', 'AARTI', 'Behavioural Therapist'],
    ['e10', 'SHIKHA', 'Special Educator'],
    ['e11', 'SANIYA', 'Special Educator'],
    ['e12', 'KUMKUM', 'Special Educator'],
  ];

  for (const [id, name, specialty] of employeesToSeed) {
    // Upsert into users (update name & specialty, keep password_hash if exists)
    await pool.query(
      `INSERT INTO users (id, name, password_hash, role, specialty)
       VALUES ($1, $2, $3, 'employee', $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, specialty = EXCLUDED.specialty`,
      [id, name, empHash, specialty],
    );

    // Upsert into staff table
    await pool.query(
      `INSERT INTO staff (id, name, role, active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role`,
      [id, name, specialty],
    );
  }
  console.log('Seeded and updated default users/staff: superadmin, admin, e1..e12');
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
    `INSERT INTO blocked_slots (id, date, time, staff_id, reason, source) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET reason = EXCLUDED.reason, source = EXCLUDED.source`,
    [s.id, s.date, s.time, s.staffId || 'any', s.reason || '', s.source || 'manual'],
  );
  return s;
}
async function removeBlocked(id) {
  await pool.query('DELETE FROM blocked_slots WHERE id = $1', [id]);
  return { id };
}

// ---- daily availability (CSV import + public read) -------------------------
/*
 * Public same-day availability for the booking page: every block for the date
 * (per-staff and clinic-wide) plus the slots already taken by website bookings
 * for a specific specialist. No parent details are exposed — only (specialist, slot).
 */
async function dayAvailability(date) {
  if (!date) return { date: '', blocked: [], booked: [] };
  const [{ rows: blocked }, { rows: booked }] = await Promise.all([
    pool.query('SELECT time, staff_id, source FROM blocked_slots WHERE date = $1', [date]),
    pool.query(
      `SELECT specialist_id, slot FROM bookings
       WHERE date = $1 AND status <> 'cancelled' AND specialist_id <> 'any' AND slot <> ''`,
      [date],
    ),
  ]);
  return {
    date,
    blocked: blocked.map((r) => ({ time: r.time, staffId: r.staff_id, source: r.source })),
    booked: booked.map((r) => ({ specialistId: r.specialist_id, slot: r.slot })),
  };
}

// Replace the CSV-sourced blocks for a date with a fresh set parsed from the
// uploaded sheet. `entries` is [{ identifier, times[] }]; identifier matches an
// employee by login id or (case-insensitive) name. Manual blocks are untouched.
async function applyCsvAvailability(date, entries) {
  if (!date) throw httpErr(400, 'A date is required.');
  const list = Array.isArray(entries) ? entries : [];
  const { rows: emps } = await pool.query(
    `SELECT id, name FROM users WHERE role = 'employee'`,
  );
  const byId = new Map(emps.map((e) => [e.id.toLowerCase(), e]));
  const byName = new Map(emps.map((e) => [(e.name || '').trim().toLowerCase(), e]));

  const matched = [];
  const unmatched = [];
  const rows = []; // { staffId, time, reason }
  for (const entry of list) {
    const idRaw = String(entry.identifier ?? '').trim();
    if (!idRaw) continue;
    const emp = byId.get(idRaw.toLowerCase()) || byName.get(idRaw.toLowerCase());
    if (!emp) {
      unmatched.push(idRaw);
      continue;
    }
    const times = Array.from(new Set((entry.times || []).filter(Boolean)));
    const reasons = entry.reasons || {};
    for (const t of times) {
      rows.push({
        staffId: emp.id,
        time: t,
        reason: String(reasons[t] || 'Booked (daily upload)').trim()
      });
    }
    matched.push({ identifier: idRaw, staffId: emp.id, name: emp.name, count: times.length });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const staffIdsToClear = Array.from(new Set(rows.map(r => r.staffId)));
    if (staffIdsToClear.length > 0) {
      await client.query(
        `DELETE FROM blocked_slots WHERE date = $1 AND source = 'csv' AND staff_id = ANY($2::text[])`,
        [date, staffIdsToClear]
      );
    }
    for (const r of rows) {
      await client.query(
        `INSERT INTO blocked_slots (id, date, time, staff_id, reason, source)
         VALUES ($1,$2,$3,$4,$5,'csv')
         ON CONFLICT (id) DO UPDATE SET reason = EXCLUDED.reason, source = 'csv'`,
        [`csv|${date}|${r.time}|${r.staffId}`, date, r.time, r.staffId, r.reason],
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return { date, blockedSlots: rows.length, matched, unmatched };
}

async function clearCsvAvailability(date) {
  if (!date) throw httpErr(400, 'A date is required.');
  const { rowCount } = await pool.query(`DELETE FROM blocked_slots WHERE date = $1 AND source = 'csv'`, [date]);
  return { date, removed: rowCount };
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
  const bookingsRes = await pool.query(
    `SELECT * FROM bookings WHERE specialist_id = $1`, [user.id],
  );
  const blocksRes = await pool.query(
    `SELECT * FROM blocked_slots WHERE staff_id = $1`, [user.id],
  );

  const bookings = bookingsRes.rows.map(toBooking);
  const blocks = blocksRes.rows.map((r) => ({
    id: r.id,
    source: 'blocked',
    mode: 'clinic',
    sessionType: r.source === 'csv' ? 'CSV Schedule Block' : 'Manual Block',
    specialistId: r.staff_id,
    date: r.date,
    slot: r.time,
    parentName: r.reason || 'Blocked Slot',
    status: 'Blocked',
    notes: r.reason || '',
    childAge: '',
    phone: '',
    concern: '',
    payment: 'pending',
    seen: true,
    requestedAt: isoOrNull(new Date()),
    updatedAt: isoOrNull(new Date()),
  }));

  const combined = [...bookings, ...blocks];
  combined.sort((a, b) => {
    if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
    return (a.slot || '').localeCompare(b.slot || '');
  });
  return combined;
}

async function resetMyPassword(user, { newPassword }) {
  if (!newPassword) throw httpErr(400, 'New password is required.');
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [bcrypt.hashSync(newPassword, 10), user.id]);
  return { ok: true };
}

async function applyLeave(user, { leaveType, startDate, endDate, reason }) {
  if (!leaveType || !startDate || !endDate) throw httpErr(400, 'Missing leave details.');
  const id = newId();
  await pool.query(
    `INSERT INTO leave_requests (id, user_id, leave_type, start_date, end_date, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, user.id, leaveType, startDate, endDate, reason || '']
  );
  return { id, userId: user.id, leaveType, startDate, endDate, reason, status: 'pending' };
}

async function listMyLeaves(user) {
  const { rows } = await pool.query(
    `SELECT * FROM leave_requests WHERE user_id = $1 ORDER BY start_date DESC`,
    [user.id]
  );
  return rows.map(r => ({
    id: r.id, userId: r.user_id, leaveType: r.leave_type,
    startDate: r.start_date, endDate: r.end_date, reason: r.reason,
    status: r.status, createdAt: isoOrNull(r.created_at), updatedAt: isoOrNull(r.updated_at),
    seenByAdmin: r.seen_by_admin
  }));
}

async function listAllLeaves() {
  const { rows } = await pool.query(
    `SELECT lr.*, u.name as employee_name, u.specialty as employee_specialty
     FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id
     ORDER BY lr.created_at DESC`
  );
  return rows.map(r => ({
    id: r.id, userId: r.user_id, leaveType: r.leave_type,
    startDate: r.start_date, endDate: r.end_date, reason: r.reason,
    status: r.status, createdAt: isoOrNull(r.created_at), updatedAt: isoOrNull(r.updated_at),
    seenByAdmin: r.seen_by_admin, employeeName: r.employee_name, employeeSpecialty: r.employee_specialty
  }));
}

async function updateLeaveStatus(actor, { id, status }) {
  if (actor.role !== 'super_admin') throw httpErr(403, 'Only the super admin can approve/reject leaves.');
  await pool.query(
    `UPDATE leave_requests SET status = $1, updated_at = now() WHERE id = $2`,
    [status, id]
  );
  return { id, status };
}

async function markLeavesSeen() {
  await pool.query(`UPDATE leave_requests SET seen_by_admin = TRUE`);
  return { ok: true };
}

async function punchIn(user) {
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toTimeString().slice(0, 8);
  const id = `${user.id}|${date}`;
  await pool.query(
    `INSERT INTO attendance (id, user_id, date, punch_in)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [id, user.id, date, time]
  );
  return { date, time, status: 'present' };
}

async function getTodayAttendance(user) {
  const date = new Date().toISOString().slice(0, 10);
  const { rows } = await pool.query(
    `SELECT * FROM attendance WHERE user_id = $1 AND date = $2`,
    [user.id, date]
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    userId: rows[0].user_id,
    date: rows[0].date,
    punchIn: rows[0].punch_in,
    status: rows[0].status
  };
}

async function calculateEmployeeSalary(userId, month) {
  // month is 'yyyy-mm' (e.g. '2026-06')
  const { rows: userRows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userRows[0];
  if (!user) throw httpErr(404, 'User not found');

  const baseSalary = user.base_salary || 35000;

  // Get settings
  const { rows: settingRows } = await pool.query('SELECT * FROM global_settings');
  const settings = {};
  settingRows.forEach(r => settings[r.key] = parseInt(r.value, 10));

  const tier1Sessions = settings.salary_incentive_tier1_sessions ?? 150;
  const tier1Amount = settings.salary_incentive_tier1_amount ?? 5000;
  const tier2Sessions = settings.salary_incentive_tier2_sessions ?? 180;
  const tier2Amount = settings.salary_incentive_tier2_amount ?? 10000;
  const tier3Sessions = settings.salary_incentive_tier3_sessions ?? 210;
  const tier3Amount = settings.salary_incentive_tier3_amount ?? 15000;
  const basePaidLeaves = settings.salary_base_paid_leaves ?? 2;
  const extraLeaveDeduction = settings.salary_extra_leave_deduction ?? 1000;
  const unusedLeaveBonus = settings.salary_unused_leave_bonus ?? 2000;

  // 1. Get completed sessions in this month
  // Confirmed/completed/requested bookings + daily CSV blocks
  const bookingsRes = await pool.query(
    `SELECT id, date, slot, parent_name, session_type, mode FROM bookings 
     WHERE specialist_id = $1 AND SUBSTRING(date, 1, 7) = $2 AND status != 'cancelled'
     ORDER BY date, slot`,
    [userId, month]
  );
  
  const csvBlocksRes = await pool.query(
    `SELECT id, date, time as slot, reason as parent_name, 'CSV Block' as session_type, 'clinic' as mode FROM blocked_slots 
     WHERE staff_id = $1 AND SUBSTRING(date, 1, 7) = $2 AND source = 'csv'
     ORDER BY date, time`,
    [userId, month]
  );

  const seenSlots = new Set();
  const sessions = [];

  // Add bookings first (they take precedence)
  bookingsRes.rows.forEach(r => {
    const key = `${r.date}|${r.slot}`;
    seenSlots.add(key);
    sessions.push({
      id: r.id,
      date: r.date,
      slot: r.slot,
      childName: r.parent_name,
      type: r.session_type,
      mode: r.mode,
      source: 'booking'
    });
  });

  // Add CSV blocks only if there is no booking overriding it
  csvBlocksRes.rows.forEach(r => {
    const key = `${r.date}|${r.slot}`;
    if (!seenSlots.has(key)) {
      seenSlots.add(key);
      sessions.push({
        id: r.id,
        date: r.date,
        slot: r.slot,
        childName: r.parent_name,
        type: r.session_type,
        mode: r.mode,
        source: 'csv'
      });
    }
  });

  sessions.sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot));
  const sessionsCount = sessions.length;

  // Calculate incentive
  let incentive = 0;
  if (sessionsCount >= tier3Sessions) {
    incentive = tier3Amount;
  } else if (sessionsCount >= tier2Sessions) {
    incentive = tier2Amount;
  } else if (sessionsCount >= tier1Sessions) {
    incentive = tier1Amount;
  }

  // 2. Calculate leaves
  const { rows: leaves } = await pool.query(
    `SELECT * FROM leave_requests WHERE user_id = $1 AND status = 'approved'`,
    [userId]
  );

  const isLeaveDay = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return leaves.some(l => {
      const s = new Date(l.start_date + 'T00:00:00');
      const e = new Date(l.end_date + 'T00:00:00');
      return d >= s && d <= e;
    });
  };

  const [year, monthStr] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthStr, 0).getDate();

  const leaveDates = new Set();
  let approvedLeavesCount = 0;
  let sandwichLeavesCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${month}-${String(d).padStart(2, '0')}`;
    const currentDay = new Date(dayStr + 'T00:00:00');
    
    if (isLeaveDay(dayStr)) {
      leaveDates.add(dayStr);
      approvedLeavesCount++;
    } else if (currentDay.getDay() === 0) { // Sunday
      const prevDay = new Date(currentDay.getTime() - 86400000).toISOString().slice(0, 10);
      const nextDay = new Date(currentDay.getTime() + 86400000).toISOString().slice(0, 10);
      
      if (isLeaveDay(prevDay) && isLeaveDay(nextDay)) {
        leaveDates.add(dayStr);
        sandwichLeavesCount++;
      }
    }
  }

  const totalLeaves = leaveDates.size;

  // Calculate deductions and bonuses
  let deductions = 0;
  let bonus = 0;

  if (totalLeaves > basePaidLeaves) {
    deductions = (totalLeaves - basePaidLeaves) * extraLeaveDeduction;
  } else {
    const valuePerUnusedLeave = Math.floor(unusedLeaveBonus / basePaidLeaves);
    bonus = Math.max(0, basePaidLeaves - totalLeaves) * valuePerUnusedLeave;
  }

  const netSalary = baseSalary + incentive - deductions + bonus;

  return {
    userId,
    employeeName: user.name,
    month,
    baseSalary,
    sessionsCount,
    incentive,
    approvedLeavesCount,
    sandwichLeavesCount,
    totalLeaves,
    deductions,
    bonus,
    netSalary,
    sessions,
    settings: {
      tier1Sessions,
      tier1Amount,
      tier2Sessions,
      tier2Amount,
      tier3Sessions,
      tier3Amount,
      basePaidLeaves,
      extraLeaveDeduction,
      unusedLeaveBonus
    }
  };
}

// ---- router ----------------------------------------------------------------
async function route(action, payload, token) {
  // public
  if (action === 'login') return doLogin(payload);
  if (action === 'createBooking') return createBooking(payload);
  if (action === 'listSpecialists' || action === 'listStaff') return listSpecialists();
  if (action === 'listBlocked' && payload && payload.date) return listBlocked(payload.date);
  if (action === 'dayAvailability') return dayAvailability(payload && payload.date);

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

    case 'getSalarySettings': {
      adminOnly();
      const { rows } = await pool.query('SELECT * FROM global_settings');
      const settings = {};
      rows.forEach(r => settings[r.key] = r.value);
      return settings;
    }
    case 'updateSalarySettings': {
      superOnly();
      const settings = payload || {};
      for (const [k, v] of Object.entries(settings)) {
        await pool.query(
          `INSERT INTO global_settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [k, String(v)]
        );
      }
      return { ok: true };
    }
    case 'calculateSalary': {
      const targetUserId = payload.userId || user.id;
      if (targetUserId !== user.id) adminOnly();
      return calculateEmployeeSalary(targetUserId, payload.month);
    }
    case 'postSalarySlip': {
      superOnly();
      const { userId: targetUserId, month, baseSalary, sessionsCount, incentive, totalLeaves, deductions, bonus, netSalary } = payload || {};
      if (!targetUserId || !month) throw httpErr(400, 'Missing user or month');
      const id = `${targetUserId}|${month}`;
      await pool.query(
        `INSERT INTO salary_slips (id, user_id, month, base_salary, sessions_count, incentive, leaves_count, deductions, bonus, net_salary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET 
           base_salary = EXCLUDED.base_salary,
           sessions_count = EXCLUDED.sessions_count,
           incentive = EXCLUDED.incentive,
           leaves_count = EXCLUDED.leaves_count,
           deductions = EXCLUDED.deductions,
           bonus = EXCLUDED.bonus,
           net_salary = EXCLUDED.net_salary`,
        [id, targetUserId, month, baseSalary, sessionsCount, incentive, totalLeaves, deductions, bonus, netSalary]
      );
      return { id };
    }
    case 'listSalarySlips': {
      const targetUserId = payload.userId || user.id;
      if (targetUserId !== user.id) adminOnly();
      const { rows } = await pool.query(
        `SELECT * FROM salary_slips WHERE user_id = $1 ORDER BY month DESC`,
        [targetUserId]
      );
      return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        month: r.month,
        baseSalary: r.base_salary,
        sessionsCount: r.sessions_count,
        incentive: r.incentive,
        leavesCount: r.leaves_count,
        deductions: r.deductions,
        bonus: r.bonus,
        netSalary: r.net_salary,
        createdAt: r.created_at
      }));
    }
    case 'resetMyPassword': return resetMyPassword(user, payload);
    case 'applyLeave': return applyLeave(user, payload);
    case 'listMyLeaves': return listMyLeaves(user);
    case 'listAllLeaves': adminOnly(); return listAllLeaves();
    case 'updateLeaveStatus': return updateLeaveStatus(user, payload);
    case 'markLeavesSeen': adminOnly(); return markLeavesSeen();
    case 'punchIn': return punchIn(user);
    case 'getTodayAttendance': return getTodayAttendance(user);

    case 'listBookings': adminOnly(); return listBookings();
    case 'updateBooking': adminOnly(); return updateBooking(payload);
    case 'deleteBooking': superOnly(); return deleteBooking(payload.id);
    case 'markSeen': adminOnly(); return markSeen(payload.id);
    case 'markAllSeen': adminOnly(); return markAllSeen(payload && payload.source);

    case 'listBlocked': adminOnly(); return listBlocked();
    case 'addBlocked': adminOnly(); return upsertBlocked(payload);
    case 'removeBlocked': adminOnly(); return removeBlocked(payload.id);
    case 'applyCsvAvailability': adminOnly(); return applyCsvAvailability(payload.date, payload.entries);
    case 'clearCsvAvailability': adminOnly(); return clearCsvAvailability(payload.date);

    case 'listUsers': adminOnly(); return listUsers();
    case 'createUser': adminOnly(); return createUser(user, payload);
    case 'updateUser': adminOnly(); return updateUser(user, payload);
    case 'resetPassword': adminOnly(); return resetPassword(user, payload);
    case 'deleteUser': superOnly(); return deleteUser(payload.id);

    case 'dbQuery': {
      adminOnly();
      const { sql, params } = payload || {};
      if (!sql) throw httpErr(400, 'SQL query is required.');
      const res = await pool.query(sql, params || []);
      return {
        rows: res.rows,
        rowCount: res.rowCount,
        fields: res.fields ? res.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })) : [],
      };
    }

    default: throw httpErr(400, 'Unknown action: ' + action);
  }
}

// ---- HTTP ------------------------------------------------------------------
const app = express();
app.use(cors({ origin: true }));
const textBody = express.text({ type: () => true, limit: '50mb' });

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

ensureSchema()
  .then(ensureSeedUsers)
  .catch((e) => console.error('Boot/seed error:', e))
  .finally(() => app.listen(PORT, () => console.log(`Recharge server (site + API) listening on :${PORT}`)));
