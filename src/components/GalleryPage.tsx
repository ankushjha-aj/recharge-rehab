import React, { useEffect, useRef, useState } from 'react';

interface GalleryPageProps {
  onBookConsultation?: () => void;
}

type CategoryId =
  | 'all'
  | 'speech'
  | 'trips'
  | 'space'
  | 'workshops'
  | 'festive'
  | 'misc';

const categories: { id: CategoryId; label: string; icon: string }[] = [
  { id: 'all', label: 'All Moments', icon: 'auto_awesome' },
  { id: 'speech', label: 'Speech & Language', icon: 'record_voice_over' },
  { id: 'trips', label: 'Our Trips', icon: 'directions_bus' },
  { id: 'space', label: 'Our Space', icon: 'cottage' },
  { id: 'workshops', label: 'Our Workshops', icon: 'palette' },
  { id: 'festive', label: 'Festive Celebrations', icon: 'celebration' },
  { id: 'misc', label: 'Miscellaneous', icon: 'category' },
];

/*
 * Reference image pool — feeds the "All Moments" animated collage for now.
 * These are placeholders; when real photos/videos are added they simply replace
 * this array. The framed-tile treatment (blue border + rounded frame) and the
 * hover-to-preview behaviour are intentionally kept for the real images too.
 */
const showcasePool: string[] = [
  '/images/therapy_sanctuary.png',
  '/images/therapy_speech.png',
  '/images/therapy_art.png',
  '/images/therapy_physical_ball.png',
  '/images/therapy_sensory.png',
  '/images/therapy_music.png',
  '/images/therapy_sign_language.png',
  '/images/therapy_behavioral_group.png',
  '/images/therapy_fine_motor.png',
  '/images/therapy_cognitive_reading.png',
  '/images/therapy_speech_mirror.png',
  '/images/therapy_interactive_screen.png',
  '/images/therapy_adult.png',
  '/images/therapy_horizontal.png',
];

/* Full-width collage — 7 slots: rest position (% of stage) + fly-in / wipe-out transforms. */
const SLOTS = [
  // Top row (4)
  { top: '3%', left: '2%', width: '20%', rot: -5, z: 2, aspect: 'aspect-[4/3]',
    enter: 'translate(-80%, -20%) rotate(-16deg) scale(0.7)', exit: 'translate(-90%, 25%) rotate(-12deg) scale(0.8)' },
  { top: '7%', left: '26%', width: '18%', rot: 4, z: 3, aspect: 'aspect-square',
    enter: 'translate(0, -110%) rotate(15deg) scale(0.7)', exit: 'translate(0, -120%) rotate(11deg) scale(0.8)' },
  { top: '2%', left: '48%', width: '21%', rot: -3, z: 4, aspect: 'aspect-[4/3]',
    enter: 'translate(0, -120%) rotate(-14deg) scale(0.7)', exit: 'translate(0, -130%) rotate(-10deg) scale(0.8)' },
  { top: '6%', left: '74%', width: '19%', rot: 5, z: 3, aspect: 'aspect-[3/4]',
    enter: 'translate(85%, -20%) rotate(15deg) scale(0.7)', exit: 'translate(95%, 25%) rotate(11deg) scale(0.8)' },
  // Bottom row (3)
  { top: '55%', left: '8%', width: '21%', rot: 6, z: 5, aspect: 'aspect-[4/3]',
    enter: 'translate(-85%, 25%) rotate(16deg) scale(0.7)', exit: 'translate(-95%, 35%) rotate(12deg) scale(0.8)' },
  { top: '52%', left: '40%', width: '18%', rot: -4, z: 6, aspect: 'aspect-square',
    enter: 'translate(0, 115%) rotate(-16deg) scale(0.7)', exit: 'translate(0, 125%) rotate(-12deg) scale(0.8)' },
  { top: '56%', left: '65%', width: '22%', rot: -6, z: 5, aspect: 'aspect-[4/3]',
    enter: 'translate(85%, 25%) rotate(-15deg) scale(0.7)', exit: 'translate(95%, 35%) rotate(-11deg) scale(0.8)' },
];

const TILE_COUNT = SLOTS.length;
const SHOW_MS = 4200; // collage holds on screen
const EXIT_MS = 950; // wipe-out duration before the next batch
const HOVER_PREVIEW_MS = 1000; // hover this long on a photo to pop it out

type Phase = 'enter' | 'show' | 'exit';

/** Auto-playing montage: a batch of framed photos flies in, forms a collage, holds, wipes out — looping. */
const AllMomentsShowcase: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('enter');
  const [start, setStart] = useState(0); // offset into showcasePool
  const [paused, setPaused] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Drive the enter → show → exit → next-batch loop (frozen while hovering).
  useEffect(() => {
    if (paused) return;

    if (phase === 'enter') {
      const raf = requestAnimationFrame(() => setPhase('show'));
      return () => cancelAnimationFrame(raf);
    }
    if (phase === 'show') {
      timer.current = setTimeout(() => setPhase('exit'), SHOW_MS);
      return () => clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      setStart((s) => (s + TILE_COUNT) % showcasePool.length);
      setPhase('enter');
    }, EXIT_MS);
    return () => clearTimeout(timer.current);
  }, [phase, paused]);

  // Clean up the hover timer on unmount.
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const handleTileEnter = (src: string) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setPreview(src), HOVER_PREVIEW_MS);
  };
  const handleTileLeave = () => {
    clearTimeout(hoverTimer.current);
    setPreview(null);
  };

  const resting = phase === 'show';

  return (
    <>
      <div
        className="relative w-full"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => { setPaused(false); handleTileLeave(); }}
      >
        <div className="relative w-full aspect-[3/2] md:aspect-[5/2] overflow-hidden">
          {SLOTS.map((slot, i) => {
            const src = showcasePool[(start + i) % showcasePool.length];
            const transform = resting
              ? `rotate(${slot.rot}deg)`
              : phase === 'exit'
              ? slot.exit
              : slot.enter;
            return (
              <div
                key={i}
                className="absolute cursor-pointer"
                onMouseEnter={() => handleTileEnter(src)}
                onMouseLeave={handleTileLeave}
                style={{
                  top: slot.top,
                  left: slot.left,
                  width: slot.width,
                  zIndex: slot.z,
                  transform,
                  opacity: resting ? 1 : 0,
                  transition:
                    phase === 'enter'
                      ? 'none'
                      : 'transform 0.85s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.85s ease',
                  transitionDelay: phase === 'enter' ? '0ms' : `${i * 90}ms`,
                }}
              >
                <div className="p-2 bg-primary-fixed/25 border border-outline-variant/50 rounded-[1.5rem] shadow-xl transition-transform duration-300 hover:scale-[1.03]">
                  <div className={`relative w-full ${slot.aspect} rounded-[1rem] overflow-hidden bg-background`}>
                    <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-body-sm text-on-surface-variant mt-4 flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">slideshow</span>
          Auto-playing highlights — hover a photo to take a closer look
        </p>
      </div>

      {/* Hover preview pop-up (pointer-events-none so the underlying hover keeps working) */}
      {preview && (
        <div className="fixed inset-0 z-[90] pointer-events-none flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in" />
          <div className="relative animate-scale-bounce-in">
            <div className="p-2.5 bg-primary-fixed/30 border border-outline-variant/50 rounded-[2rem] shadow-2xl">
              <div className="rounded-[1.5rem] overflow-hidden bg-background w-[min(82vw,460px)] max-h-[72vh] flex items-center justify-center">
                <img src={preview} alt="" className="w-full h-full object-contain max-h-[72vh]" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ComingSoon: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-center py-16">
    <div className="w-16 h-16 rounded-full bg-primary-fixed grid place-items-center text-primary mx-auto mb-5">
      <span className="material-symbols-outlined text-[32px]">photo_library</span>
    </div>
    <h3 className="text-headline-sm font-extrabold text-on-surface mb-2">{label} — coming soon</h3>
    <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
      We're putting this collection together. Photos and videos from our {label.toLowerCase()} will
      appear here shortly.
    </p>
  </div>
);

const GalleryPage: React.FC<GalleryPageProps> = ({ onBookConsultation }) => {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');

  useEffect(() => {
    document.title = 'Gallery - Recharge Rehabilitation';
  }, []);

  const activeLabel = categories.find((c) => c.id === activeCategory)?.label ?? '';

  return (
    <div className="flex-grow">
      {/* HERO — blends out of the header, same blue→beige rhythm as the rest of the site */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-fixed to-background pt-8 pb-10 px-6 md:px-12">
        <div className="absolute -right-16 -top-12 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 top-12 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="relative w-full text-center max-w-3xl mx-auto">
          <span className="inline-block bg-primary text-on-primary text-label-md uppercase tracking-widest font-extrabold px-4 py-1.5 rounded-full mb-4 shadow-sm">
            Gallery
          </span>
          <h1 className="text-3xl md:text-headline-xl font-extrabold text-primary leading-tight mb-3">
            Spaces, Smiles &amp; Milestones
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            A living glimpse into Recharge Rehabilitation — therapy moments, trips, workshops, and
            festive celebrations, all in one place.
          </p>
        </div>
      </section>

      {/* GALLERY — filters + content stage (full-bleed within the page gutter) */}
      <section className="py-8 bg-background min-h-[60vh]">
        <div className="w-full px-6 md:px-12">
          {/* Category filter pills */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-12">
            {categories.map((cat) => {
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-body-sm font-bold transition-all duration-200 active:scale-95 ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-md'
                      : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/60 hover:border-primary hover:text-primary hover:shadow-sm'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>

          {activeCategory === 'all' ? (
            <AllMomentsShowcase />
          ) : (
            <ComingSoon label={activeLabel} />
          )}
        </div>
      </section>

      {/* CTA — keeps the site theme; ends on surface-container-low so the footer blends in */}
      <section className="py-8 px-6 md:px-12 bg-background">
        <div className="w-full rounded-[2rem] bg-gradient-to-br from-primary-fixed/25 to-background border border-outline-variant/40 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

          <div className="text-left max-w-3xl space-y-2 relative z-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">
              See it for yourself, <span className="text-primary">in person</span>.
            </h2>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Photos only tell half the story. Visit our space, meet the team, and feel the warmth that
              makes Recharge a true sanctuary for healing.
            </p>
          </div>

          <div className="shrink-0 relative z-10 flex flex-wrap gap-3">
            <button
              onClick={onBookConsultation}
              type="button"
              className="bg-primary text-on-primary hover:brightness-95 active:scale-95 px-7 py-3.5 rounded-full font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              Book a Visit
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <a
              href="#/contact"
              className="border border-primary text-primary px-7 py-3.5 rounded-full font-bold text-sm hover:bg-primary hover:text-on-primary transition-colors duration-200 flex items-center"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GalleryPage;
