# Project Log — Recharge Rehabilitation

A running summary of the major work delivered. Newest first. For setup/operations,
see [ADMIN_SETUP.md](ADMIN_SETUP.md).

---

## Session — June 12–13, 2026

### 1. Services page + removed Occupational Therapy
- Built [`ServicesPage.tsx`](../src/components/ServicesPage.tsx) at **`/services`** (hero,
  core services, full "Conditions We Serve" list, "How we work" steps, CTA), matching
  the site's light-blue/beige texture. Wired into routing + navbar (was a "coming soon"
  popup before).
- Removed **Occupational Therapy** everywhere it appeared (home card → Behavioural
  Therapy, contact form option, about-page bio, SEO meta). We do not offer OT.
- Commit `feature: First draft 13th commit`.

### 2. Public Booking page — `/book`
- [`BookingPage.tsx`](../src/components/BookingPage.tsx): request an **online or in-clinic**
  session — session type, preferred specialist, date + time-slot grid (Mon–Sat
  10:00–17:45, Sundays closed, taken slots greyed out), parent/child details.
- Flow: parent submits a **request** → it's saved + a WhatsApp message opens → the clinic
  confirms by WhatsApp/call → parent pays by QR or on visit.
- Commit `feature: First draft 14th commit`.

### 3. Admin panel + data layer
- Backend-agnostic data layer [`store.ts`](../src/lib/store.ts) and a first **`/admin`**
  dashboard (requests, confirm/cancel + WhatsApp/call, staff, availability, payments).
- Originally wired for Google Sheets; **superseded by PostgreSQL** (below).
- Commit `feature: First draft 15th commit`.

### 4. PostgreSQL backend (replaced Sheets)
- Installed **PostgreSQL 16** on the server; database `recharge_rehab`, role
  `recharge_app`, schema `bookings` / `staff` / `blocked_slots`
  ([`server/schema.sql`](../server/schema.sql)).
- Built a **Node/Express API** in [`server/`](../server) speaking the same
  `{ action, token, payload }` protocol, with server-side auth. DB creds in
  `server/.env` (gitignored).
- Commit `feature: First draft 16th commit`.

### 5. Single-port deployment (port 3000)
- The Node server now serves the **built site AND `/api`** from one origin/port, so only
  **port 3000** must be open — no CORS, no reverse proxy. Runs under PM2 (`recharge-api`),
  `pm2 save`d.
- Firewall: local `ufw` allows 3000; the **Hetzner Cloud Firewall must also allow 3000**.
- Commit `feature: First draft 17th commit`.

### 6. Roles, accounts & split admin sections
- **Auth/RBAC**: `users` + `sessions` tables, bcrypt passwords. One shared login →
  session token → three roles: **super_admin / admin / employee**. Defaults auto-seeded
  (`superadmin`, `admin`, `e1`…`e10` — see [ADMIN_SETUP.md](ADMIN_SETUP.md); change them).
- **Admin dashboard**: Bookings split into **Book Sessions** (default) vs **Consultations**
  via filter, status filters + search, **"New" unseen badges + entry notification popup**,
  and an **Employees** section (create/edit/reset-password/delete, role-aware).
- **Employee dashboard** ([`EmployeeDashboard.tsx`](../src/components/EmployeeDashboard.tsx)):
  employee fills their own profile (name, gender, qualifications, experience) and sees
  sessions assigned to them. ID/password/role are admin-controlled.
- Booking page's specialist list now reflects **active employees**.
- Commit `feature: First draft 18th commit`.

### Permission model (default — adjustable)
- **Super Admin** — everything: manage admins + employees, reset any password, delete
  bookings/accounts.
- **Admin** — bookings/consultations, availability, payments; create employees, edit
  employee profiles, reset employee passwords. Cannot manage admin accounts or delete.
- **Employee** — own dashboard only.

---

## Current architecture
```
Browser ──HTTP:3000──> Node/Express (server/) ──> PostgreSQL (recharge_rehab)
            serves        - GET  /*        → built SPA (../dist)
            same origin   - POST /api      → { action, token, payload }
```
Stack: React 19 + Vite + Tailwind (frontend) · Express + pg + bcryptjs (API) ·
PostgreSQL 16 · PM2 · deployed at `http://65.109.15.215:3000`.

## Open follow-ups
- Polish the admin panel UI (next phase, per request).
- Replace `Employee 1…10` with real staff; set the payment **QR image**.
- Change all default passwords before real use.
- Optional: domain + HTTPS via Caddy/nginx in front of `:3000`.
