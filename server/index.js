/**
 * Recharge Rehabilitation — booking/admin API backed by PostgreSQL.
 *
 * Speaks the exact protocol the website's data layer (src/lib/store.ts) already
 * uses: a single POST endpoint that receives { action, token, payload } and
 * returns { ok, result } or { ok: false, error }. So pointing the frontend here
 * is just a URL change — no page/admin code changes.
 *
 * Auth: sensitive actions require `token` to equal ADMIN_TOKEN (the staff
 * passcode). Creating a booking and reading a single day's availability are
 * public (the booking page needs them without a passcode).
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'recharge2026';
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors({ origin: true }));
// The browser sends text/plain (avoids a CORS preflight); accept any type as text.
app.use(express.text({ type: () => true, limit: '256kb' }));

// ---- row <-> API object mappers (snake_case DB <-> camelCase JSON) ----
const toBooking = (r) => ({
  id: r.id, source: r.source, mode: r.mode, sessionType: r.session_type,
  specialistId: r.specialist_id, date: r.date, slot: r.slot,
  parentName: r.parent_name, childAge: r.child_age, phone: r.phone,
  concern: r.concern, notes: r.notes, status: r.status, payment: r.payment,
  requestedAt: r.requested_at instanceof Date ? r.requested_at.toISOString() : r.requested_at,
  updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
});
const toStaff = (r) => ({ id: r.id, name: r.name, role: r.role, active: r.active });
const toBlocked = (r) => ({ id: r.id, date: r.date, time: r.time, staffId: r.staff_id, reason: r.reason });

// Whitelisted columns that updateBooking may patch (camelCase -> column).
const BOOKING_PATCH = {
  status: 'status', payment: 'payment', updatedAt: 'updated_at', date: 'date', slot: 'slot',
  specialistId: 'specialist_id', notes: 'notes', concern: 'concern', mode: 'mode',
  sessionType: 'session_type', parentName: 'parent_name', childAge: 'child_age', phone: 'phone',
};

async function route(action, payload, token) {
  const auth = () => {
    if (token !== ADMIN_TOKEN) {
      const e = new Error('Unauthorized');
      e.status = 401;
      throw e;
    }
  };

  switch (action) {
    case 'createBooking': {
      const b = payload || {};
      await pool.query(
        `INSERT INTO bookings
           (id, source, mode, session_type, specialist_id, date, slot, parent_name,
            child_age, phone, concern, notes, status, payment, requested_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [b.id, b.source || 'booking', b.mode || 'clinic', b.sessionType || '', b.specialistId || 'any',
         b.date || '', b.slot || '', b.parentName || '', b.childAge || '', b.phone || '',
         b.concern || '', b.notes || '', b.status || 'requested', b.payment || 'pending',
         b.requestedAt || new Date().toISOString(), b.updatedAt || new Date().toISOString()],
      );
      return b;
    }

    case 'listBookings': {
      auth();
      const { rows } = await pool.query('SELECT * FROM bookings ORDER BY requested_at DESC');
      return rows.map(toBooking);
    }

    case 'updateBooking': {
      auth();
      const { id, patch = {} } = payload || {};
      const sets = [];
      const vals = [];
      let i = 1;
      for (const [k, col] of Object.entries(BOOKING_PATCH)) {
        if (k in patch) { sets.push(`${col} = $${i++}`); vals.push(patch[k]); }
      }
      if (!('updatedAt' in patch)) { sets.push(`updated_at = $${i++}`); vals.push(new Date().toISOString()); }
      vals.push(id);
      const { rows } = await pool.query(
        `UPDATE bookings SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals,
      );
      if (!rows[0]) { const e = new Error('Not found'); e.status = 404; throw e; }
      return toBooking(rows[0]);
    }

    case 'listStaff': {
      const { rows } = await pool.query('SELECT * FROM staff ORDER BY id');
      return rows.map(toStaff);
    }

    case 'saveStaff': {
      auth();
      const s = payload || {};
      const { rows } = await pool.query(
        `INSERT INTO staff (id, name, role, active) VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, active = EXCLUDED.active
         RETURNING *`,
        [s.id, s.name || '', s.role || '', s.active !== false],
      );
      return toStaff(rows[0]);
    }

    case 'removeStaff': {
      auth();
      await pool.query('DELETE FROM staff WHERE id = $1', [payload.id]);
      return { id: payload.id };
    }

    case 'listBlocked': {
      const date = payload && payload.date;
      if (!date) auth(); // full list needs the token; per-date is public
      const { rows } = date
        ? await pool.query('SELECT * FROM blocked_slots WHERE date = $1', [date])
        : await pool.query('SELECT * FROM blocked_slots');
      return rows.map(toBlocked);
    }

    case 'addBlocked': {
      auth();
      const s = payload || {};
      await pool.query(
        `INSERT INTO blocked_slots (id, date, time, staff_id, reason) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET reason = EXCLUDED.reason`,
        [s.id, s.date, s.time, s.staffId || 'any', s.reason || ''],
      );
      return s;
    }

    case 'removeBlocked': {
      auth();
      await pool.query('DELETE FROM blocked_slots WHERE id = $1', [payload.id]);
      return { id: payload.id };
    }

    default: {
      const e = new Error('Unknown action: ' + action);
      e.status = 400;
      throw e;
    }
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, result: 'Recharge API + Postgres are running.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

app.post('/api', async (req, res) => {
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
    // Logical failures (auth/not-found/unknown action) return 200 + ok:false so the
    // frontend reads the message; only unexpected faults use a 5xx.
    const status = err.status && err.status < 500 ? 200 : 500;
    res.status(status).json({ ok: false, error: String(err.message || err) });
  }
});

app.listen(PORT, () => console.log(`Recharge API listening on http://127.0.0.1:${PORT}`));
