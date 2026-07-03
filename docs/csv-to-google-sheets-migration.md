# Admin Panel — Daily Availability: Current CSV Flow → Google Sheets

A summary of how we currently test daily availability with a **dummy CSV**, and what
it takes to switch the source to **Google Sheets** (your Google "Excel" sheet).

---

## 1. What the feature does

Every morning the clinic has a schedule of which therapist is booked at which time
slot (the real sheet looks like [`dummy_daily_schedule.csv`](../dummy_daily_schedule.csv)).
The Admin panel takes that schedule and **blocks those slots** on the public Booking
page, so parents can only book times that are actually free.

---

## 2. How we test it today (dummy CSV)

**The dummy data**
- [`dummy_daily_schedule.csv`](../dummy_daily_schedule.csv) — a real-shaped export of a
  day's schedule. Columns are paired: `THERAPIST NAME, TIMESLOTS, THERAPIST NAME, TIMESLOTS, …`
  with child names written in the therapist's cell for each booked slot.
- [`docs/sample-availability.csv`](sample-availability.csv) — a simpler sample.

**The flow**
1. **Admin panel → Availability tab** renders `CsvImportCard`
   ([AdminPage.tsx:2572](../src/components/AdminPage.tsx#L2572)). Admin picks a date and
   clicks **Upload CSV**, selecting the day's file.
2. The file text is parsed **in the browser** by `parseAvailabilityCsv()`
   ([store.ts:148](../src/lib/store.ts#L148)). It auto-detects the multi-column clinic
   format (`parseMultiColumnCsv`) vs. a simple one-row-per-therapist format, normalizes
   times, and produces entries: `[{ identifier, times[] }]` where `identifier` is the
   therapist's name/login **exactly as written in the sheet**.
3. `applyCsvAvailability(date, entries)` ([store.ts:619](../src/lib/store.ts#L619)) sends
   those entries to the backend.
4. Backend `applyCsvAvailability(date, entries)`
   ([server/index.js:403](../server/index.js#L403)) **replaces** that day's CSV-sourced
   blocks: `DELETE ... WHERE source = 'csv'` then inserts fresh rows into the
   `blocked_slots` table tagged `source = 'csv'`.
5. The public Booking page reads `dayAvailability(date)` and hides those slots. In the
   admin/employee views these appear as **"CSV Schedule Block"**.
6. **Clear** removes them: `clearCsvAvailability(date)` → `DELETE ... source = 'csv'`.

**Where it's stored:** a **PostgreSQL** database (via `pg`), served by the Node/Express
app `recharge-api` (run under PM2). It is *not* a spreadsheet today — "CSV" here is only
the daily *import format*, and the word "sheet"/`VITE_SHEETS_ENDPOINT` in the code is
leftover naming from an earlier design.

**Key point:** the CSV step is **manual** — a human downloads/exports the schedule and
uploads the file into the admin panel each day.

---

## 3. What "change it to Google Sheets" means

Goal: instead of exporting a file and uploading it, the admin panel pulls the day's
schedule **directly from a Google Sheet** (single source of truth, no daily file
juggling).

There are two realistic approaches:

### Option A — Google Sheet as the *import source* (smallest change)
Keep the current Postgres backend. Add a "Pull from Google Sheet" button next to
"Upload CSV" that fetches the sheet, runs it through the **same** `parseAvailabilityCsv`
+ `applyCsvAvailability` pipeline. Almost nothing else changes.
- Publish the sheet as CSV (`File → Share → Publish to web → CSV`) **or** add a Google
  Apps Script Web App that returns the rows.
- New store function `fetchSheetAvailability(date)` → returns text → existing parser.
- **Pros:** minimal, reuses all parsing/blocking logic. **Cons:** still a "pull" action
  (can be automated on a timer / on page load).

### Option B — Google Sheet (Apps Script) as the whole backend
Replace the Postgres/Express backend with a Google Apps Script Web App that reads/writes
the sheet for *all* actions (bookings, availability, logins). The code already has the
switch for this: `REMOTE_ENDPOINT = VITE_API_ENDPOINT || VITE_SHEETS_ENDPOINT`
([store.ts:391](../src/lib/store.ts#L391)) and every call routes through `remote(action, payload)`.
- **Pros:** no database/server to host. **Cons:** bigger rewrite (reimplement all `action`
  handlers in Apps Script), auth/quotas/latency of Apps Script.

**Recommendation:** start with **Option A**. It gets you off manual file uploads fast and
touches the least code, and you can move to Option B later if you want to retire Postgres.

---

## 4. Things to decide before we build

1. **Which option** (A: keep DB + pull from sheet, or B: sheet as full backend)?
2. **Sheet format:** will it match the current multi-column layout the parser already
   understands, or a new/simpler layout (one therapist per row)?
3. **Access:** publish-to-web CSV link (easy, read-only, public URL) vs. Apps Script Web
   App (private, needs deploy) vs. Google Sheets API + service-account key (most control).
4. **Trigger:** manual "Sync now" button, on every booking-page load, or a timed refresh?
5. **Therapist matching:** names in the sheet must map to employee IDs — confirm the
   `identifier` values in the sheet exactly match what the admin panel expects.

Tell me your answers to #1–#4 and I'll implement it.
