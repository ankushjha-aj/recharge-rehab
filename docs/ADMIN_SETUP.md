# Booking + Admin Panel — Setup Guide

**Active backend: PostgreSQL** (installed and running on this server). The booking
page, contact form, and `/admin` panel all read/write a Postgres database through a
small Node API. See **"PostgreSQL backend"** below for how it's wired and operated.

> The Google Sheets path (further down) is kept only as an alternative. The app's
> data layer (`src/lib/store.ts`) is backend-agnostic, so switching backends only
> changes config — not page or admin code.

---

## PostgreSQL backend (current)

### What's running
| Piece | Detail |
|-------|--------|
| Database | PostgreSQL 16, db `recharge_rehab`, owner role `recharge_app`, port `5432` |
| Tables | `bookings`, `staff` (10 seeded), `blocked_slots` — see [`server/schema.sql`](../server/schema.sql) |
| Server | **One** Node/Express process in [`server/`](../server), PM2 **`recharge-api`**, port **3000** — serves the built site **and** `/api` from the same origin |
| Frontend wiring | `VITE_API_ENDPOINT=/api` (same origin, no CORS); in dev, Vite proxies `/api` to the API |
| Secrets | DB password + `ADMIN_TOKEN` live in `server/.env` (gitignored, chmod 600); `PORT` also set there |

### Operating it
```bash
pm2 status                       # see recharge-api + recharge-rehab
pm2 restart recharge-api         # after editing server code or server/.env
pm2 logs recharge-api            # tail API logs
curl -s localhost:4000/api/health

# Open the database directly:
set -a; . server/.env; set +a
psql "$DATABASE_URL"             # then: SELECT * FROM bookings;
psql "$DATABASE_URL" -f server/schema.sql   # re-apply schema (idempotent)
```

### Logins & roles (one shared sign-in at `/admin`)
Everyone signs in at `/admin` with a **Login ID + password**; the role decides the
dashboard. Default accounts are auto-created on first boot — **change these passwords
immediately**:

| Login ID | Password | Role | Can do |
|----------|----------|------|--------|
| `superadmin` | `super@recharge2026` | Super Admin | Everything: manage admins + employees, reset any password, delete bookings/accounts |
| `admin` | `admin@recharge2026` | Admin | Bookings/consultations, availability, payments; create employees, edit employee profiles, reset employee passwords |
| `e1` … `e10` | `emp@recharge2026` | Employee | Own dashboard only — own profile + sessions assigned to them |

Employees **cannot** change their own login ID/password/role (admin-controlled). The
booking page's specialist list is the **active employees**.

### Changing passwords
- In the panel: **Employees** tab → a user → **Reset PW** (admin can reset employees;
  super admin can reset anyone). Resetting forces that user to sign in again.
- Passwords are bcrypt-hashed in the `users` table — never stored in plain text.

### Production access (important)
The single Node server serves the site **and** `/api` on **port 3000**, so only that
one port needs to be reachable — no nginx/reverse proxy required.

Open **port 3000 inbound** in *both* firewall layers:
1. **Local `ufw`** — already allowed (`ufw status` shows `3000/tcp ALLOW`). Add with
   `ufw allow 3000/tcp` if needed.
2. **Hetzner Cloud Firewall** — add an inbound TCP rule for **3000** in the Hetzner
   console. (Port 4000 is no longer used publicly — the API is internal now.)

Rebuild the site after any frontend change so `dist` is fresh, then restart:
```bash
npm run build && pm2 restart recharge-api
```

> Later, for a real domain + HTTPS, put Caddy/nginx in front on 80/443 and proxy to
> `:3000` — no app changes needed.

### Dev workflow
`npm run dev` runs Vite on 3000 and proxies `/api`. Since the prod server also uses
3000, for local dev run the API on another port first, e.g.
`PORT=4000 node server/index.js`, and point the Vite proxy target at it.

### Restart-safety
`pm2 save` has been run so the API comes back with `pm2 resurrect`. To start PM2 on
boot, run `pm2 startup` once and follow the printed command.

---

## (Alternative) Google Sheets backend

This explains how to instead store bookings in **Google Sheets**. Skip it if you're
using Postgres above. Until configured, the app falls back to **local demo mode**
(data saved only in the current browser — fine for trying out, not for real use).

---

## What exists

| Page | URL | Who | What it does |
|------|-----|-----|--------------|
| Booking page | `/book` | Parents | Request an online/in-clinic session. Saves a request + opens WhatsApp. |
| Contact form | `/contact` & "Book Consultation" popup | Parents | Saves a consultation request + opens WhatsApp. |
| Admin panel | `/admin` | Staff (passcode) | View/filter requests, confirm/cancel + WhatsApp/call, manage staff & availability, track payments. |

The data flow (request → you confirm on WhatsApp/call → parent pays by QR or on visit)
is intentionally **out-of-band**: the website never auto-charges anyone. A parent's
request lands in the admin panel; you decide and confirm manually.

---

## A. Try it now (local demo mode)

1. `npm run dev`
2. Open `/book` and submit a request, or use the contact form.
3. Open `/admin`. Default passcode: **`recharge2026`**.
4. You'll see the request, plus sample data and the 10 reference staff.

> Demo data lives in *your* browser's localStorage, so a request made on a parent's
> phone will **not** appear in your admin on another device. That's exactly why you
> need step B for real use.

---

## B. Go live with Google Sheets (free)

### 1. Create the database (a Google Sheet)
- Go to <https://sheets.new>, name it e.g. "Recharge Bookings".

### 2. Add the backend script
- In that sheet: **Extensions → Apps Script**.
- Delete the placeholder code, paste the contents of [`google-apps-script/Code.gs`](../google-apps-script/Code.gs).
- Change the `TOKEN` value at the top to a **private passcode** (remember it).
- (Optional) In the editor's function dropdown choose **`seedStaff`** and click **Run**
  once to fill the Staff sheet with the 10 reference employees. Approve the
  permissions prompt the first time.

### 3. Deploy it as a web app
- **Deploy → New deployment → ⚙ → Web app**.
- **Execute as:** Me
- **Who has access:** Anyone
- Click **Deploy**, approve permissions, and **copy the Web app URL**
  (looks like `https://script.google.com/macros/s/AKfy.../exec`).

### 4. Point the website at it
Create a `.env` file in the project root (copy from `.env.example`):

```
VITE_SHEETS_ENDPOINT=https://script.google.com/macros/s/AKfy..../exec
VITE_ADMIN_PASSCODE=your-private-passcode   # must equal TOKEN in Code.gs
```

Then rebuild / redeploy:
- Local/PM2: `npm run build` (and restart `pm2`).
- Vercel: add the same two variables in **Project → Settings → Environment
  Variables**, then redeploy.

### 5. Verify
- The `/admin` top bar should show a green dot: **"Connected to Google Sheets"**.
- Submit a test booking → it appears in the `Bookings` tab of your Sheet **and** in
  `/admin`.

---

## Security notes (please read)

- The admin passcode is sent to the script and checked **server-side**, so no secret
  is exposed in the website's code. Creating a booking and reading a single day's
  availability are public (the booking page needs them); everything else (listing all
  bookings, editing, staff, blocking slots) requires the passcode.
- This is good protection for a small clinic. If you later want stronger security
  (named staff logins, audit history), we can move to Supabase — the website's data
  layer (`src/lib/store.ts`) is written so only that one file changes.
- Change `TOKEN` / `VITE_ADMIN_PASSCODE` from the default before going live, and share
  it only with staff.

---

## Switching to Airtable later

The whole app talks to `src/lib/store.ts` through a small set of functions
(`submitBooking`, `listBookings`, `updateBooking`, `listStaff`, …). To use Airtable
(or Supabase) instead of Sheets, only the `remote()` adapter in that file changes — no
page or admin code needs touching.
