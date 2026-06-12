import React, { useMemo, useState } from 'react';
import {
  submitBooking,
  dayAvailability,
  listSpecialists,
  takenTimesFor,
  todayISO,
  slotMinutes,
  SLOT_TIMES,
  formatSlot,
  type Staff,
  type DayAvailability,
} from '../lib/store';

interface BookingPageProps {
  onBookConsultation?: () => void;
}

const sessionTypes: { id: string; label: string; icon: string }[] = [
  { id: 'consultation', label: 'Initial Consultation', icon: 'stethoscope' },
  { id: 'speech', label: 'Speech & Language', icon: 'record_voice_over' },
  { id: 'special-ed', label: 'Special Education', icon: 'school' },
  { id: 'behavioural', label: 'Behavioural Therapy', icon: 'psychology' },
  { id: 'voice-feeding', label: 'Voice / Feeding', icon: 'restaurant' },
  { id: 'follow-up', label: 'Follow-up Session', icon: 'event_repeat' },
];

// Friendly label for today's locked booking date, e.g. "Monday, 1 July 2026".
const prettyDate = (iso: string) => {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return iso;
  }
};

// Current local time as minutes since midnight (for hiding slots already past).
const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

const StepCard: React.FC<{ n: string; icon: string; title: string; desc: string }> = ({ n, icon, title, desc }) => (
  <div className="relative bg-surface-container-lowest border border-outline-variant/50 rounded-[1.5rem] p-7 shadow-sm hover:shadow-lg hover:-translate-y-2.5 transition-all duration-300 ease-out">
    <span className="absolute top-5 right-6 text-headline-lg font-extrabold text-primary/15 select-none">{n}</span>
    <div className="w-12 h-12 rounded-2xl bg-primary-fixed grid place-items-center mb-5 text-primary shadow-sm">
      <span className="material-symbols-outlined text-primary text-[26px]">{icon}</span>
    </div>
    <h3 className="text-headline-sm font-bold text-on-surface mb-2">{title}</h3>
    <p className="text-body-md text-on-surface-variant leading-relaxed">{desc}</p>
  </div>
);

const BookingPage: React.FC<BookingPageProps> = ({ onBookConsultation }) => {
  const [mode, setMode] = useState<'online' | 'clinic'>('online');
  const [sessionType, setSessionType] = useState('consultation');
  const [specialist, setSpecialist] = useState('any');
  const [specialists, setSpecialists] = useState<Staff[]>([]);
  // Parents can only book for the day they visit — the date is locked to today.
  const [date] = useState(todayISO);
  const [slot, setSlot] = useState('');
  const [parentName, setParentName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [phone, setPhone] = useState('');
  const [concern, setConcern] = useState('');
  const [notes, setNotes] = useState('');
  const [avail, setAvail] = useState<DayAvailability>({ date, blocked: [], booked: [] });
  const [nowMin, setNowMin] = useState(nowMinutes);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  React.useEffect(() => {
    document.title = 'Book a Session - Recharge Rehabilitation';
    listSpecialists().then(setSpecialists).catch(() => setSpecialists([]));
    dayAvailability(date).then(setAvail).catch(() => setAvail({ date, blocked: [], booked: [] }));
    // Keep "past slot" greying fresh as the day rolls on.
    const id = setInterval(() => setNowMin(nowMinutes()), 60_000);
    return () => clearInterval(id);
  }, [date]);

  const isSunday = useMemo(() => new Date(date + 'T00:00:00').getDay() === 0, [date]);

  // Slots still bookable today (clinic day not yet past for that time).
  const remainingSlots = useMemo(() => SLOT_TIMES.filter((t) => slotMinutes(t) > nowMin), [nowMin]);

  // Times unavailable for the current pick, and — for the popups — for anyone.
  const takenForSel = useMemo(() => takenTimesFor(avail, specialist, specialists), [avail, specialist, specialists]);
  const takenForAny = useMemo(() => takenTimesFor(avail, 'any', specialists), [avail, specialists]);

  const slotTaken = (t: string) => slotMinutes(t) <= nowMin || takenForSel.has(t);

  // Reset the picked slot if it becomes unavailable (time passes / specialist changes).
  React.useEffect(() => {
    if (slot && (isSunday || slotTaken(slot))) setSlot('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialist, isSunday, takenForSel, nowMin]);

  // --- availability popups ---------------------------------------------------
  const ready = specialists.length > 0; // wait for data before judging "fully booked"
  const dayOver = ready && !isSunday && remainingSlots.length === 0;
  const everyoneFull =
    ready && !isSunday && remainingSlots.length > 0 && remainingSlots.every((t) => takenForAny.has(t));
  const specialistFull =
    ready && !isSunday && specialist !== 'any' && remainingSlots.length > 0 &&
    remainingSlots.every((t) => takenForSel.has(t));

  const popupKind: 'day-over' | 'all-full' | 'specialist-full' | null = isSunday
    ? null
    : dayOver
    ? 'day-over'
    : everyoneFull
    ? 'all-full'
    : specialistFull
    ? 'specialist-full'
    : null;
  const popupKey = `${popupKind}:${popupKind === 'specialist-full' ? specialist : ''}`;
  const showPopup = popupKind !== null && !dismissed.has(popupKey);
  const dismissPopup = () => setDismissed((prev) => new Set(prev).add(popupKey));
  const selectedSpecialistName = specialists.find((s) => s.id === specialist)?.name || 'This therapist';

  const canSubmit =
    !!parentName.trim() && !!phone.trim() && !!childAge.trim() && !!slot && !isSunday && !slotTaken(slot);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const sessionLabel = sessionTypes.find((s) => s.id === sessionType)?.label ?? sessionType;
    const specialistMeta = specialists.find((s) => s.id === specialist);
    const specialistLabel =
      specialist === 'any' ? 'No preference' : `${specialistMeta?.name} (${specialistMeta?.role})`;

    // Save into the admin store (Google Sheets when configured, else local demo).
    // The submit succeeds for the parent even if persistence hiccups — the
    // WhatsApp hand-off remains the guaranteed path.
    try {
      await submitBooking({
        source: 'booking',
        mode,
        sessionType: sessionLabel,
        specialistId: specialist,
        date,
        slot, // stored raw 'HH:mm'
        parentName: parentName.trim(),
        childAge: childAge.trim(),
        phone: phone.trim(),
        concern: concern.trim(),
        notes: notes.trim(),
      });
    } catch {
      /* non-blocking — WhatsApp hand-off still happens below */
    }

    const message =
      `Hello Recharge Rehabilitation,\n\nI'd like to *request a session*. Details:\n\n` +
      `🧩 *Type:* ${sessionLabel}\n` +
      `💻 *Mode:* ${mode === 'online' ? 'Online (Video)' : 'In-Clinic'}\n` +
      `👩‍⚕️ *Preferred Specialist:* ${specialistLabel}\n` +
      `📅 *Preferred Date:* ${date}\n` +
      `⏰ *Preferred Time:* ${formatSlot(slot)}\n\n` +
      `👤 *Parent Name:* ${parentName.trim()}\n` +
      `👶 *Child's Age:* ${childAge.trim()} years\n` +
      `📞 *Phone:* ${phone.trim()}\n` +
      `🩺 *Concern:* ${concern.trim() || '—'}\n` +
      `💬 *Notes:* ${notes.trim() || '—'}\n\n` +
      `Please confirm availability. Thank you!`;

    window.open(`https://wa.me/919910525100?text=${encodeURIComponent(message)}`, '_blank');
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const inputClass =
    'w-full bg-transparent border border-outline-variant rounded-2xl py-3 px-4 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200';

  return (
    <div className="flex-grow">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-fixed to-background pt-8 pb-10 px-6 md:px-12">
        <div className="absolute -right-16 -top-12 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 top-12 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="relative w-full text-center max-w-3xl mx-auto">
          <span className="inline-block bg-primary text-on-primary text-label-md uppercase tracking-widest font-extrabold px-4 py-1.5 rounded-full mb-4 shadow-sm">
            Book a Session
          </span>
          <h1 className="text-3xl md:text-headline-xl font-extrabold text-primary leading-tight mb-3">
            Request an Online or In-Clinic Session
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            Tell us what you need and a preferred time. Our team checks availability and confirms your slot over
            WhatsApp or a call — then you can pay by QR or on your visit.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-8 bg-background">
        <div className="w-full px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <StepCard n="01" icon="edit_calendar" title="Send a Request" desc="Pick a session type, preferred specialist, date and time, and share your details." />
            <StepCard n="02" icon="chat" title="We Confirm" desc="Our team reviews live availability and confirms your slot via WhatsApp or a phone call." />
            <StepCard n="03" icon="qr_code_2" title="Pay & Attend" desc="Once confirmed, pay securely by scanning our QR code, or simply pay on your visit." />
          </div>
        </div>
      </section>

      {/* BOOKING FORM */}
      <section className="py-4 pb-10 bg-background">
        <div className="w-full px-6 md:px-12">
          {submitted ? (
            <div className="max-w-2xl mx-auto bg-surface-container-lowest border border-outline-variant rounded-[2rem] p-8 md:p-10 shadow-md text-center">
              <div className="w-16 h-16 rounded-full bg-primary-fixed grid place-items-center text-primary mx-auto mb-6">
                <span className="material-symbols-outlined text-[34px]" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
              </div>
              <h2 className="text-headline-md font-extrabold text-on-surface mb-3">Request sent!</h2>
              <p className="text-body-md text-on-surface-variant leading-relaxed mb-6">
                Thanks, {parentName.split(' ')[0] || 'there'}. We've received your session request. Our team will
                check availability and confirm your slot on <strong className="text-primary">WhatsApp or by phone</strong>.
                After confirmation, you can pay by QR code or on your visit.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href="tel:09910525100"
                  className="bg-primary text-on-primary px-6 py-3 rounded-full font-bold text-sm hover:brightness-95 active:scale-95 transition-all duration-200 shadow-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">call</span>
                  Call the Clinic
                </a>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="border border-primary text-primary px-6 py-3 rounded-full font-bold text-sm hover:bg-primary hover:text-on-primary transition-colors duration-200"
                >
                  Make Another Request
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="max-w-4xl mx-auto bg-surface-container-lowest border border-outline-variant rounded-[2rem] p-6 md:p-10 shadow-md space-y-8"
            >
              {/* Mode toggle */}
              <div>
                <label className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-3">Session Mode</label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {([['online', 'videocam', 'Online (Video)'], ['clinic', 'apartment', 'In-Clinic']] as const).map(
                    ([val, icon, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMode(val)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-95 border ${
                          mode === val
                            ? 'bg-primary text-on-primary border-primary shadow-md'
                            : 'bg-transparent text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                        {label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Session type */}
              <div>
                <label className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-3">Session Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {sessionTypes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSessionType(s.id)}
                      className={`flex items-center gap-2 py-3 px-3 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-95 border text-left ${
                        sessionType === s.id
                          ? 'bg-primary-fixed text-primary border-primary shadow-sm'
                          : 'bg-transparent text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px] shrink-0">{s.icon}</span>
                      <span className="leading-tight">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred specialist */}
              <div>
                <label htmlFor="specialist" className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-3">
                  Preferred Specialist
                </label>
                <select
                  id="specialist"
                  value={specialist}
                  onChange={(e) => setSpecialist(e.target.value)}
                  className={`${inputClass} appearance-none cursor-pointer max-w-md`}
                >
                  <option value="any">No preference — assign the best fit</option>
                  {specialists.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date (locked to today) + slots */}
              <div>
                <label className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-3">
                  Choose a Time for Today
                </label>
                <div className="flex items-center gap-2.5 bg-primary-fixed/60 border border-primary/20 rounded-2xl px-4 py-3 max-w-md mb-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">event_available</span>
                  <span className="text-body-md font-bold text-on-surface">{prettyDate(date)}</span>
                  <span className="ml-auto text-[11px] font-extrabold uppercase tracking-wider text-primary bg-surface-container-lowest px-2 py-1 rounded-full">Today</span>
                </div>
                <p className="text-body-sm text-on-surface-variant mb-4">
                  Same-day booking · Working hours Mon–Sat, 10:00 AM – 5:45 PM · Sunday closed
                </p>

                {isSunday && (
                  <div className="flex items-center gap-2 text-body-sm text-[#b54708] bg-[#FEF0C7]/60 border border-[#FEC84B]/60 rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-[18px]">info</span>
                    We're closed on Sundays. Please reach us on WhatsApp and we'll help you book the next working day.
                  </div>
                )}

                {!isSunday && dayOver && (
                  <div className="flex items-center gap-2 text-body-sm text-[#b54708] bg-[#FEF0C7]/60 border border-[#FEC84B]/60 rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-[18px]">schedule</span>
                    Today's sessions are over. Please come back tomorrow or contact us directly to book.
                  </div>
                )}

                {!isSunday && !dayOver && (
                  <>
                    {(everyoneFull || specialistFull) && (
                      <div className="flex items-start gap-2 text-body-sm text-[#b54708] bg-[#FEF0C7]/60 border border-[#FEC84B]/60 rounded-xl px-4 py-3 mb-3">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                        {everyoneFull
                          ? 'All therapists are fully booked today. Please contact us directly to be fitted in.'
                          : `${selectedSpecialistName} is fully booked today — please pick another therapist below.`}
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                      {SLOT_TIMES.map((t) => {
                        const past = slotMinutes(t) <= nowMin;
                        const occupied = past || takenForSel.has(t);
                        const selected = slot === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={occupied}
                            title={past ? 'This time has passed' : occupied ? 'Already booked' : undefined}
                            onClick={() => setSlot(t)}
                            className={`py-2.5 rounded-xl text-sm font-bold border transition-all duration-200 ${
                              occupied
                                ? 'bg-surface-container-high/40 text-on-surface-variant/40 border-outline-variant/30 line-through cursor-not-allowed'
                                : selected
                                ? 'bg-primary text-on-primary border-primary shadow-md active:scale-95'
                                : 'bg-transparent text-on-surface border-outline-variant hover:border-primary hover:text-primary active:scale-95'
                            }`}
                          >
                            {formatSlot(t)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-body-sm text-on-surface-variant mt-3 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">lightbulb</span>
                      Greyed-out times are already booked or have passed. Final confirmation is done by our team.
                    </p>
                  </>
                )}
              </div>

              {/* Parent / child details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="parentName" className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-2">Parent / Guardian Name</label>
                  <input id="parentName" type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} required placeholder="Your full name" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-2">Phone (WhatsApp)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-on-surface-variant font-bold select-none text-sm">+91</span>
                    <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required placeholder="10-digit mobile number" className={`${inputClass} pl-12`} />
                  </div>
                </div>
                <div>
                  <label htmlFor="childAge" className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-2">Child's Age</label>
                  <input id="childAge" type="number" min="0" max="120" value={childAge} onChange={(e) => setChildAge(e.target.value)} required placeholder="e.g. 5" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="concern" className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-2">Primary Concern <span className="text-on-surface-variant font-medium normal-case">(optional)</span></label>
                  <input id="concern" type="text" value={concern} onChange={(e) => setConcern(e.target.value)} placeholder="e.g. Speech delay, ADHD…" className={inputClass} />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-label-md uppercase tracking-wider text-primary font-extrabold mb-2">Anything else? <span className="text-on-surface-variant font-medium normal-case">(optional)</span></label>
                <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Share anything that helps us prepare for the session." className={`${inputClass} resize-none`} />
              </div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full sm:w-auto bg-primary text-on-primary px-8 py-3.5 rounded-full font-bold text-sm hover:brightness-95 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  Send Session Request
                </button>
                <p className="text-body-sm text-on-surface-variant">
                  No payment now — we confirm your slot first, then you pay by QR or on visit.
                </p>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* PAYMENT NOTE / FALLBACK CTA */}
      <section className="py-8 px-6 md:px-12 bg-background">
        <div className="w-full rounded-[2rem] bg-gradient-to-br from-primary-fixed/25 to-background border border-outline-variant/40 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <div className="text-left max-w-3xl space-y-2 relative z-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">
              Prefer to talk it through first?
            </h2>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Reach us directly on WhatsApp or call <a href="tel:09910525100" className="text-primary font-bold">099105 25100</a> (Mon–Sat,
              10:00 AM – 5:45 PM) and we'll help you find the right session and slot.
            </p>
          </div>
          <div className="shrink-0 relative z-10 flex flex-wrap gap-3">
            <button
              onClick={onBookConsultation}
              type="button"
              className="bg-primary text-on-primary hover:brightness-95 active:scale-95 px-7 py-3.5 rounded-full font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              Quick Consultation
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <a
              href="/contact"
              className="border border-primary text-primary px-7 py-3.5 rounded-full font-bold text-sm hover:bg-primary hover:text-on-primary transition-colors duration-200 flex items-center"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Availability popup: selected therapist full, everyone full, or day over. */}
      {showPopup && (
        <div className="fixed inset-0 z-[120] bg-black/55 flex items-center justify-center p-4" onClick={dismissPopup}>
          <div
            className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-[1.75rem] p-7 shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-16 h-16 rounded-full grid place-items-center mx-auto mb-5 ${popupKind === 'specialist-full' ? 'bg-primary-fixed text-primary' : 'bg-[#FEF0C7] text-[#B54708]'}`}>
              <span className="material-symbols-outlined text-[32px]">
                {popupKind === 'specialist-full' ? 'group' : popupKind === 'day-over' ? 'schedule' : 'event_busy'}
              </span>
            </div>
            <h3 className="text-headline-sm font-extrabold text-on-surface mb-2">
              {popupKind === 'specialist-full'
                ? `${selectedSpecialistName} is fully booked today`
                : popupKind === 'day-over'
                ? "Today's sessions are over"
                : 'All therapists are booked today'}
            </h3>
            <p className="text-body-md text-on-surface-variant leading-relaxed mb-6">
              {popupKind === 'specialist-full'
                ? 'Every slot for this therapist is taken today. Please choose another therapist below, or contact us and we\'ll help you find the earliest opening.'
                : popupKind === 'day-over'
                ? 'Same-day booking has closed for today. Please come back tomorrow during working hours, or reach us directly to arrange a slot.'
                : 'All of our therapists are fully booked for today. Please contact us directly on WhatsApp or by phone and we\'ll do our best to fit you in.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {popupKind === 'specialist-full' ? (
                <button
                  type="button"
                  onClick={() => { setSpecialist('any'); dismissPopup(); }}
                  className="bg-primary text-on-primary px-6 py-3 rounded-full font-bold text-sm hover:brightness-95 active:scale-95 transition-all duration-200 shadow-md"
                >
                  Show all available therapists
                </button>
              ) : (
                <a
                  href={`https://wa.me/919910525100?text=${encodeURIComponent("Hello Recharge Rehabilitation, I'd like to book a session for today but the slots show full. Could you help me find an opening?")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary text-on-primary px-6 py-3 rounded-full font-bold text-sm hover:brightness-95 active:scale-95 transition-all duration-200 shadow-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  Contact us on WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={dismissPopup}
                className="border border-outline-variant text-on-surface-variant px-6 py-3 rounded-full font-bold text-sm hover:border-primary hover:text-primary transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingPage;
