/**
 * Recharge Rehabilitation — booking backend (Google Apps Script).
 *
 * This script turns a Google Sheet into the database + secure API for the
 * website's booking page, contact form, and /admin panel.
 *
 * SETUP (see docs/ADMIN_SETUP.md for the full walkthrough):
 *   1. Create a Google Sheet. Extensions → Apps Script. Paste this file in.
 *   2. Change TOKEN below to a private passcode (must match VITE_ADMIN_PASSCODE
 *      on the website).
 *   3. (Optional) Run seedStaff() once to fill the Staff sheet with the 10 staff.
 *   4. Deploy → New deployment → type "Web app":
 *        Execute as: Me     |     Who has access: Anyone
 *      Copy the web-app URL into VITE_SHEETS_ENDPOINT on the website, rebuild.
 *
 * The website sends POSTs as text/plain (avoids a CORS preflight). Sensitive
 * actions require the token; creating a booking and reading per-date availability
 * are public (the booking page needs them without a passcode).
 */

var TOKEN = 'recharge2026'; // <-- CHANGE THIS. Must equal VITE_ADMIN_PASSCODE.

var SHEET_BOOKINGS = 'Bookings';
var SHEET_STAFF = 'Staff';
var SHEET_BLOCKED = 'Blocked';

var BOOKING_COLS = ['id', 'source', 'mode', 'sessionType', 'specialistId', 'date', 'slot',
  'parentName', 'childAge', 'phone', 'concern', 'notes', 'status', 'payment', 'requestedAt', 'updatedAt'];
var STAFF_COLS = ['id', 'name', 'role', 'active'];
var BLOCKED_COLS = ['id', 'date', 'time', 'staffId', 'reason'];

function doGet() {
  return json({ ok: true, result: 'Recharge booking API is running.' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    return json({ ok: true, result: route(body.action, body.payload || {}, body.token) });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function route(action, payload, token) {
  function auth() { if (token !== TOKEN) throw new Error('Unauthorized'); }

  switch (action) {
    case 'createBooking':            return appendRow(SHEET_BOOKINGS, BOOKING_COLS, payload);
    case 'listBookings':   auth();   return readAll(SHEET_BOOKINGS, BOOKING_COLS);
    case 'updateBooking':  auth();   return updateById(SHEET_BOOKINGS, BOOKING_COLS, payload.id, payload.patch);
    case 'listStaff':                return readAll(SHEET_STAFF, STAFF_COLS); // public: booking page lists specialists
    case 'saveStaff':      auth();   return upsert(SHEET_STAFF, STAFF_COLS, payload);
    case 'removeStaff':    auth();   return removeById(SHEET_STAFF, payload.id);
    case 'listBlocked':
      if (!payload.date) auth();     // full list needs the token; per-date is public
      return readAll(SHEET_BLOCKED, BLOCKED_COLS).filter(function (r) {
        return payload.date ? String(r.date) === String(payload.date) : true;
      });
    case 'addBlocked':     auth();   return upsert(SHEET_BLOCKED, BLOCKED_COLS, payload);
    case 'removeBlocked':  auth();   return removeById(SHEET_BLOCKED, payload.id);
    default: throw new Error('Unknown action: ' + action);
  }
}

/* ---------- sheet helpers ---------- */

function getSheet(name, cols) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(cols);
  }
  return sh;
}

function readAll(name, cols) {
  var sh = getSheet(name, cols);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var header = values[0];
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var c = 0; c < header.length; c++) obj[header[c]] = values[i][c];
    out.push(obj);
  }
  return out;
}

function appendRow(name, cols, obj) {
  var sh = getSheet(name, cols);
  sh.appendRow(cols.map(function (c) { return obj[c] !== undefined ? obj[c] : ''; }));
  return obj;
}

function findRow(sh, id) {
  if (sh.getLastRow() < 2) return -1;
  var ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (var i = 1; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 1;
  return -1;
}

function updateById(name, cols, id, patch) {
  var sh = getSheet(name, cols);
  var r = findRow(sh, id);
  if (r === -1) throw new Error('Not found: ' + id);
  var current = sh.getRange(r, 1, 1, cols.length).getValues()[0];
  var obj = {};
  for (var c = 0; c < cols.length; c++) obj[cols[c]] = current[c];
  for (var k in patch) obj[k] = patch[k];
  sh.getRange(r, 1, 1, cols.length).setValues([cols.map(function (col) { return obj[col] !== undefined ? obj[col] : ''; })]);
  return obj;
}

function upsert(name, cols, obj) {
  var sh = getSheet(name, cols);
  var r = findRow(sh, obj.id);
  if (r === -1) return appendRow(name, cols, obj);
  sh.getRange(r, 1, 1, cols.length).setValues([cols.map(function (col) { return obj[col] !== undefined ? obj[col] : ''; })]);
  return obj;
}

function removeById(name, id) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) return { id: id };
  var r = findRow(sh, id);
  if (r !== -1) sh.deleteRow(r);
  return { id: id };
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- one-time helper: seed the 10 reference staff ---------- */

function seedStaff() {
  var staff = [
    ['e1', 'Employee 1', 'Speech-Language Therapist', true],
    ['e2', 'Employee 2', 'Speech-Language Therapist', true],
    ['e3', 'Employee 3', 'Special Educator', true],
    ['e4', 'Employee 4', 'Special Educator', true],
    ['e5', 'Employee 5', 'Behavioural Therapist', true],
    ['e6', 'Employee 6', 'Audiologist / Hearing Specialist', true],
    ['e7', 'Employee 7', 'Special Educator', true],
    ['e8', 'Employee 8', 'Speech Therapist', true],
    ['e9', 'Employee 9', 'Behavioural Therapist', true],
    ['e10', 'Employee 10', 'Counselor / Parent Trainer', true],
  ];
  var sh = getSheet(SHEET_STAFF, STAFF_COLS);
  staff.forEach(function (row) { sh.appendRow(row); });
}
