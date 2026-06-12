-- Recharge Rehabilitation — admin database schema (PostgreSQL).
-- Mirrors the types in src/lib/store.ts. Safe to re-run (idempotent).

CREATE TABLE IF NOT EXISTS bookings (
  id            TEXT PRIMARY KEY,
  source        TEXT NOT NULL DEFAULT 'booking',   -- 'booking' | 'consultation'
  mode          TEXT NOT NULL DEFAULT 'clinic',     -- 'online'  | 'clinic'
  session_type  TEXT NOT NULL DEFAULT '',
  specialist_id TEXT NOT NULL DEFAULT 'any',
  date          TEXT NOT NULL DEFAULT '',           -- preferred yyyy-mm-dd ('' = none)
  slot          TEXT NOT NULL DEFAULT '',           -- preferred HH:mm  ('' = none)
  parent_name   TEXT NOT NULL DEFAULT '',
  child_age     TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  concern       TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'requested',  -- requested|confirmed|cancelled|completed
  payment       TEXT NOT NULL DEFAULT 'pending',    -- pending|paid_online|pay_on_visit|waived
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_requested_at_idx ON bookings (requested_at DESC);

CREATE TABLE IF NOT EXISTS staff (
  id     TEXT PRIMARY KEY,
  name   TEXT NOT NULL DEFAULT '',
  role   TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS blocked_slots (
  id       TEXT PRIMARY KEY,            -- `${date}|${time}|${staff_id}`
  date     TEXT NOT NULL,               -- yyyy-mm-dd
  time     TEXT NOT NULL,               -- HH:mm
  staff_id TEXT NOT NULL DEFAULT 'any', -- 'any' blocks the time for everyone
  reason   TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS blocked_date_idx ON blocked_slots (date);

-- Seed the 10 reference staff once (no-op if they already exist).
INSERT INTO staff (id, name, role, active) VALUES
  ('e1',  'Employee 1',  'Speech-Language Therapist',        TRUE),
  ('e2',  'Employee 2',  'Speech-Language Therapist',        TRUE),
  ('e3',  'Employee 3',  'Special Educator',                 TRUE),
  ('e4',  'Employee 4',  'Special Educator',                 TRUE),
  ('e5',  'Employee 5',  'Behavioural Therapist',            TRUE),
  ('e6',  'Employee 6',  'Audiologist / Hearing Specialist', TRUE),
  ('e7',  'Employee 7',  'Special Educator',                 TRUE),
  ('e8',  'Employee 8',  'Speech Therapist',                 TRUE),
  ('e9',  'Employee 9',  'Behavioural Therapist',            TRUE),
  ('e10', 'Employee 10', 'Counselor / Parent Trainer',       TRUE)
ON CONFLICT (id) DO NOTHING;
