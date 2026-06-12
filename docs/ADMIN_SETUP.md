# Booking + Admin Panel — Setup Guide

This explains how bookings are stored and how to take the admin panel **live** with
Google Sheets. Until you do step B, everything runs in **local demo mode** (data is
saved only in the browser you're using — fine for trying it out, not for real use).

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
