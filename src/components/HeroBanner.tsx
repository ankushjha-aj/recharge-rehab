import React, { useEffect, useRef, useState } from 'react';
import House3D from './House3D';

const lettersData = [
  { id: 0, char: 'R', src: '/images/logo_parts/letter_0_R.png' },
  { id: 1, char: 'e', src: '/images/logo_parts/letter_1_e.png' },
  { id: 2, char: 'c', src: '/images/logo_parts/letter_2_c.png' },
  { id: 3, char: 'h', src: '/images/logo_parts/letter_3_h.png' },
  { id: 4, char: 'a', src: '/images/logo_parts/letter_4_a.png' },
  { id: 5, char: 'r', src: '/images/logo_parts/letter_5_r.png' },
  { id: 6, char: 'g', src: '/images/logo_parts/letter_6_g.png' },
  { id: 7, char: 'e', src: '/images/logo_parts/letter_7_e.png' },
];

const clothingPalettes = [
  { parent: '#E08470', child: '#6A9A8A', playChild: '#EC4899' },
  { parent: '#F97316', child: '#0EA5E9', playChild: '#84CC16' },
  { parent: '#A855F7', child: '#F59E0B', playChild: '#14B8A6' },
  { parent: '#10B981', child: '#6366F1', playChild: '#F43F5E' },
  { parent: '#DB2777', child: '#65A30D', playChild: '#3B82F6' },
] as const;

const logoBirdPalettes = [
  { bodyColor: '#3B82F6', wingColor: '#1D4ED8' },
  { bodyColor: '#F59E0B', wingColor: '#B45309' },
  { bodyColor: '#10B981', wingColor: '#047857' },
  { bodyColor: '#EF4444', wingColor: '#B91C1C' },
  { bodyColor: '#8B5CF6', wingColor: '#6D28D9' },
] as const;

const getRandomItem = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

// Flight excursion lifecycle for a bird that perches on a RECHARGE letter.
type BirdFlightStatus = 'landing' | 'perched' | 'departing' | 'resting' | 'returning';

type RestSpot = { x: number; y: number; scale: number };

// Spots on the building (in SVG viewBox coords) where a visiting bird can rest:
// rooftop ridge, balcony ledge, and second-floor windowsills.
const buildingRestSpots: RestSpot[] = [
  { x: 330, y: 54, scale: 0.85 },
  { x: 410, y: 54, scale: 0.85 },
  { x: 560, y: 54, scale: 0.82 },
  { x: 680, y: 54, scale: 0.8 },
  { x: 300, y: 146, scale: 0.8 },
  { x: 520, y: 146, scale: 0.78 },
  { x: 700, y: 146, scale: 0.76 },
  { x: 312, y: 106, scale: 0.7 },
  { x: 382, y: 106, scale: 0.7 },
  { x: 462, y: 106, scale: 0.7 },
];

type BirdFlight = { status: BirdFlightStatus; spot: RestSpot; mirrored: boolean };

const buildLogoBirds = () => {
  const availableLetters = lettersData.map((letter) => letter.id);

  return Array.from({ length: 4 }, (_, index) => {
    const slotIndex = Math.floor(Math.random() * availableLetters.length);
    const letterId = availableLetters.splice(slotIndex, 1)[0];
    const colors = getRandomItem(logoBirdPalettes);
    const landDelayMs = 2400 + index * 280 + Math.round(Math.random() * 350);

    return {
      id: `logo-bird-${index}-${letterId}`,
      letterId,
      offset: 38 + Math.round(Math.random() * 24),
      mirrored: Math.random() > 0.5,
      landDelayMs,
      delay: `${landDelayMs}ms`,
      // Per-bird flight character so excursions to the building feel individual.
      flyX: `${48 + Math.round(Math.random() * 70)}px`,
      flyY: `-${120 + Math.round(Math.random() * 70)}%`,
      flyRot: `${8 + Math.round(Math.random() * 12)}deg`,
      departDur: `${(1.5 + Math.random() * 0.5).toFixed(2)}s`,
      returnDur: `${(1.5 + Math.random() * 0.5).toFixed(2)}s`,
      ...colors,
    };
  });
};

type LogoPerchBirdProps = {
  bodyColor: string;
  wingColor: string;
  offset: number;
  mirrored: boolean;
  delay: string;
  status: BirdFlightStatus;
  flyX: string;
  flyY: string;
  flyRot: string;
  departDur: string;
  returnDur: string;
};

const statusClassName: Record<BirdFlightStatus, string> = {
  landing: 'logo-perch-bird--land',
  perched: '',
  departing: 'logo-perch-bird--away',
  resting: 'logo-perch-bird--away',
  returning: 'logo-perch-bird--return',
};

const LogoPerchBird: React.FC<LogoPerchBirdProps> = ({
  bodyColor,
  wingColor,
  offset,
  mirrored,
  delay,
  status,
  flyX,
  flyY,
  flyRot,
  departDur,
  returnDur,
}) => {
  const style = {
    left: `${offset}%`,
    animationDelay: status === 'landing' ? delay : '0ms',
    '--fly-x': flyX,
    '--fly-y': flyY,
    '--fly-rot': flyRot,
    '--depart-dur': departDur,
    '--return-dur': returnDur,
  } as React.CSSProperties;

  return (
    <span className={`logo-perch-bird ${statusClassName[status]}`} style={style}>
      <svg
        viewBox="-10 -10 24 18"
        aria-hidden="true"
        style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
      >
        <line x1="-2" y1="3" x2="-3" y2="6" stroke="#475569" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="2" y1="3" x2="1" y2="6" stroke="#475569" strokeWidth="1.4" strokeLinecap="round" />
        <ellipse cx="0" cy="0" rx="5.5" ry="3.6" fill={bodyColor} />
        <circle cx="-5" cy="-3" r="2.7" fill={bodyColor} />
        <polygon points="-8,-3.5 -5.3,-2.4 -5.2,-4.1" fill="#F59E0B" />
        <polygon points="3,-1 8,-4.5 6,2" fill={wingColor} />
        <circle cx="-6" cy="-4" r="0.7" fill="#FFFFFF" />
      </svg>
    </span>
  );
};

type SceneBirdProps = {
  x: number;
  y: number;
  bodyColor: string;
  wingColor: string;
  mirrored?: boolean;
  delay?: string;
  scale?: number;
};

const SceneBird: React.FC<SceneBirdProps> = ({
  x,
  y,
  bodyColor,
  wingColor,
  mirrored = false,
  delay = '0s',
  scale = 1,
}) => (
  <g className="animate-tree-bird" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: delay }}>
    <g transform={`translate(${x}, ${y}) ${mirrored ? 'scale(-1, 1)' : ''} scale(${scale})`}>
      <ellipse cx="0" cy="0" rx="4.5" ry="3" fill={bodyColor} />
      <circle cx="-4" cy="-3" r="2.2" fill={bodyColor} />
      <polygon points="-6.5,-3.5 -4,-2.5 -4,-3.5" fill="#F59E0B" />
      <polygon points="3,-1 7,-4 5,1" fill={wingColor} />
      <circle cx="-4.8" cy="-3.8" r="0.55" fill="#FFFFFF" />
    </g>
  </g>
);

interface HeroBannerProps {
  onComplete?: () => void;
  mode?: 'home' | 'contact' | 'backdrop';
  onBookConsultation?: () => void;
  typingState?: 'username' | 'password' | 'none';
}

const HeroBanner: React.FC<HeroBannerProps> = ({ onComplete, mode = 'home', onBookConsultation, typingState = 'none' }) => {
  const [animState, setAnimState] = useState<'idle' | 'walking' | 'knocking' | 'welcoming' | 'entering' | 'inside'>('idle');
  const [doorState, setDoorState] = useState<'closed' | 'open' | 'closing'>('closed');
  const [showRipple, setShowRipple] = useState(false);
  // Whether a staff member steps out to greet on the current visit (decided per
  // cycle so it only happens occasionally, and only while the family is present).
  const [staffStepsOut, setStaffStepsOut] = useState(false);

  // Track the current theme so we can show sun in light mode, moon in dark mode
  // NOTE: Visibility is handled entirely by CSS (.dark .animate-sun-cycle { animation: none })
  // so no React state is needed here.
  const [birdsActive, setBirdsActive] = useState(false);
  const [clothingColors] = useState(() => getRandomItem(clothingPalettes));
  const [logoBirds] = useState(buildLogoBirds);

  // Per-bird flight state: each letter bird's current excursion phase + rest spot.
  const [flights, setFlights] = useState<BirdFlight[]>(() =>
    logoBirds.map(() => ({ status: 'landing' as BirdFlightStatus, spot: buildingRestSpots[0], mirrored: false })),
  );

  // Hover tilt target for the 3D house (radians). Written by pointer handlers,
  // read every frame inside the House3D canvas — a ref avoids re-renders.
  const houseTiltRef = useRef({ x: 0, y: 0 });

  // Play area states
  const [playState, setPlayState] = useState<'inside' | 'coming-out' | 'playing' | 'entering-rain'>('inside');
  const [isRaining, setIsRaining] = useState(false);
  const isRainingRef = React.useRef(false);
  const playStateRef = React.useRef(playState);

  // Keep refs updated to avoid stale closure issues
  useEffect(() => {
    isRainingRef.current = isRaining;
  }, [isRaining]);

  useEffect(() => {
    playStateRef.current = playState;
  }, [playState]);

  // Trigger main page load, activate birds, and load other content (3.5 seconds)
  useEffect(() => {
    const dataLoadTimer = setTimeout(() => {
      setBirdsActive(true);
      if (onComplete) {
        onComplete();
      }
    }, 3500);

    return () => clearTimeout(dataLoadTimer);
  }, [onComplete]);

  // Staggered, randomized flights: each letter bird periodically lifts off,
  // visits the building to rest on a roof ridge / ledge / sill, then returns to
  // its letter. Per-bird randomness keeps them from moving all at once.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const pickSpot = () => buildingRestSpots[Math.floor(Math.random() * buildingRestSpots.length)];

    const update = (index: number, changes: Partial<BirdFlight>) => {
      setFlights((prev) => prev.map((flight, i) => (i === index ? { ...flight, ...changes } : flight)));
    };

    const scheduleExcursion = (index: number) => {
      // Perched pause before the next trip; randomness keeps birds out of sync.
      const idle = setTimeout(() => {
        update(index, { status: 'departing', spot: pickSpot(), mirrored: Math.random() > 0.5 });

        const toResting = setTimeout(() => {
          update(index, { status: 'resting' });

          const toReturning = setTimeout(() => {
            update(index, { status: 'returning' });

            const toPerched = setTimeout(() => {
              update(index, { status: 'perched' });
              scheduleExcursion(index);
            }, 2050);
            timers.push(toPerched);
          }, rand(3200, 6800));
          timers.push(toReturning);
        }, 1700);
        timers.push(toResting);
      }, rand(5000, 11000));
      timers.push(idle);
    };

    logoBirds.forEach((bird, index) => {
      const settle = setTimeout(() => {
        update(index, { status: 'perched' });
        scheduleExcursion(index);
      }, bird.landDelayMs + 1000);
      timers.push(settle);
    });

    return () => timers.forEach(clearTimeout);
  }, [logoBirds]);

  // Rain trigger: triggers exactly once at 45 seconds of page stay
  useEffect(() => {
    const rainStartTimeout = setTimeout(() => {
      setIsRaining(true);

      const currentPlay = playStateRef.current;
      if (currentPlay === 'coming-out' || currentPlay === 'playing') {
        setPlayState('entering-rain');
        setDoorState('open');

        setTimeout(() => {
          setPlayState('inside');
          setDoorState('closing');

          setTimeout(() => {
            setDoorState('closed');
          }, 1000);
        }, 2000); // 2s to run inside
      } else {
        setPlayState('inside');
      }

      // Stop rain after 48 seconds
      setTimeout(() => {
        setIsRaining(false);
      }, 48000);

    }, 45000);

    return () => {
      clearTimeout(rainStartTimeout);
    };
  }, []);

  // Handle the automatic animation sequence timeline
  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const clearAllTimeouts = () => {
      timeouts.forEach(clearTimeout);
      timeouts = [];
    };

    const runCycle = () => {
      clearAllTimeouts();

      setAnimState('idle');
      setDoorState('closed');
      // Occasionally a staff member will step out to greet this visit (~60% of cycles).
      setStaffStepsOut(Math.random() < 0.6);
      setShowRipple(false);

      if (!isRainingRef.current) {
        setPlayState('inside');
      }

      // 1. Walk starts at 1000ms (so walk starts at 4500ms after page mount on the first cycle)
      const walkTimer = setTimeout(() => {
        setAnimState('walking');
      }, 1000);

      // 2. Walking finishes, start knocking at 5000ms (after 4s walk)
      const knockTimer = setTimeout(() => {
        setAnimState('knocking');
        setShowRipple(true);
      }, 5000);

      // 3. Knocking finishes, stop ripple, open door (staff steps out if this is a
      //    greeting visit; gating happens in the render) at 6500ms
      const welcomeTimer = setTimeout(() => {
        setAnimState('welcoming');
        setShowRipple(false);
        setDoorState('open');
      }, 6500);

      // 4. Greeting finishes, all 3 walk inside together at 8000ms
      const enterTimer = setTimeout(() => {
        setAnimState('entering');
      }, 8000);

      // 5. Entering finishes, all are fully inside at 10000ms, door begins closing
      const insideTimer = setTimeout(() => {
        setAnimState('inside');
        setDoorState('closing');
      }, 10000);

      // 6. Door completes closing at 11000ms
      const doorCloseTimer = setTimeout(() => {
        setDoorState('closed');
      }, 11000);

      // 7. Door opens again at 16000ms to let the play group out (if not raining)
      const playGroupTimer = setTimeout(() => {
        if (!isRainingRef.current) {
          setDoorState('open');
          setPlayState('coming-out');

          // Play group reaches yard at 19000ms
          const playStartTimer = setTimeout(() => {
            setPlayState('playing');
            setDoorState('closing');

            const doorCloseTimer2 = setTimeout(() => {
              setDoorState('closed');
            }, 1000);
            timeouts.push(doorCloseTimer2);
          }, 3000); // 3 seconds walk out

          timeouts.push(playStartTimer);
        }
      }, 16000);

      timeouts.push(walkTimer, knockTimer, welcomeTimer, enterTimer, insideTimer, doorCloseTimer, playGroupTimer);
    };

    // First run starts at 3500ms so walkTimer fires at 4500ms
    const initialTimer = setTimeout(() => {
      runCycle();

      // Start looping every 30 seconds
      intervalId = setInterval(() => {
        runCycle();
      }, 30000);
    }, 3500);

    return () => {
      clearTimeout(initialTimer);
      if (intervalId) clearInterval(intervalId);
      clearAllTimeouts();
    };
  }, []);

  // Map pointer position (in SVG viewBox coords) to a tilt target while the
  // cursor is over the house's footprint; ease back to rest elsewhere.
  const handleScenePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const sx = ((event.clientX - rect.left) / rect.width) * 800;
    const sy = ((event.clientY - rect.top) / rect.height) * 320;
    if (sx > 225 && sx < 775 && sy > -10 && sy < 298) {
      houseTiltRef.current.y = Math.max(-1, Math.min(1, (sx - 500) / 270)) * 0.6;
      houseTiltRef.current.x = Math.max(-1, Math.min(1, (sy - 160) / 160)) * 0.12;
    } else {
      houseTiltRef.current.y = 0;
      houseTiltRef.current.x = 0;
    }
  };

  const handleScenePointerLeave = () => {
    houseTiltRef.current.y = 0;
    houseTiltRef.current.x = 0;
  };

  // "backdrop" mode renders only the animated scene (no brand letters, text or
  // buttons) so other screens — e.g. the staff login — can use it as a dimmed,
  // non-interactive background.
  const isBackdrop = mode === 'backdrop';

  return (
    <header
      className={`relative overflow-hidden ${
        isBackdrop
          ? 'bg-transparent w-full h-full flex items-center px-0'
          : 'bg-gradient-to-b from-primary-fixed to-background pt-8 pb-8 px-6 md:px-12'
      }`}
    >
      <div className="w-full">
        <div className={`grid items-center text-left gap-6 md:gap-8 ${isBackdrop ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-12'}`}>
          {/* Left Column: Brand & Texts — hidden when used as a login backdrop */}
          {!isBackdrop && (
          <div className="md:col-span-5">
            {/* Subtitle / Brand Animations */}
            <div className="flex flex-col overflow-visible max-w-[350px] sm:max-w-[600px] md:max-w-[900px]">
              {/* RECHARGE Letters */}
              <div className="relative flex items-center h-14 sm:h-20 md:h-24 overflow-visible">
                {lettersData.map((letter, index) => {
                  const perchIndex = logoBirds.findIndex((bird) => bird.letterId === letter.id);
                  const perchBird = perchIndex >= 0 ? logoBirds[perchIndex] : undefined;
                  const flight = perchIndex >= 0 ? flights[perchIndex] : undefined;

                  return (
                    <div
                      key={letter.id}
                      className="relative flex items-center h-full animate-logo-letter-bounce"
                      style={{
                        animationDelay: `${1200 + index * 115}ms`,
                      }}
                    >
                      <img
                        alt={letter.char}
                        src={letter.src}
                        className="h-14 sm:h-20 md:h-24 w-auto object-contain logo-word-rehabilitation logo-letter-3d cursor-pointer"
                      />
                      {perchBird && flight && (
                        <LogoPerchBird
                          bodyColor={perchBird.bodyColor}
                          wingColor={perchBird.wingColor}
                          offset={perchBird.offset}
                          mirrored={perchBird.mirrored}
                          delay={perchBird.delay}
                          status={flight.status}
                          flyX={perchBird.flyX}
                          flyY={perchBird.flyY}
                          flyRot={perchBird.flyRot}
                          departDur={perchBird.departDur}
                          returnDur={perchBird.returnDur}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Conditional Left Text Block based on mode */}
              {mode === 'home' ? (
                <div className="mt-6 md:mt-8 animate-drop-down-fade" style={{ animationDelay: '2200ms' }}>
                  <span className="inline-block bg-primary-fixed text-primary text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                    Pediatric &amp; Adult Rehabilitation
                  </span>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface leading-tight mb-4">
                    Empowering Every Step of Their Journey
                  </h1>
                  <p className="text-body-md text-on-surface-variant leading-relaxed max-w-[450px] mb-6">
                    Over 8 years of compassionate, evidence-based rehabilitation. We create a sanctuary for healing, growth, and renewed potential.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={onBookConsultation}
                      type="button"
                      className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold text-sm hover:brightness-95 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      Book a Consultation
                    </button>
                    <a
                      href="#approach"
                      className="border border-primary text-primary px-6 py-2.5 rounded-full font-bold text-sm hover:bg-primary hover:text-on-primary transition-colors duration-200 flex items-center"
                    >
                      Explore Services
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-6 md:mt-8 animate-drop-down-fade" style={{ animationDelay: '2200ms' }}>
                  <h2 className="text-headline-md text-primary font-extrabold mb-3">Get in Touch</h2>
                  <p className="text-body-md text-on-surface-variant leading-relaxed max-w-[450px]">
                    Let them grow! We are here to answer your questions and help you schedule the perfect time for your child's visit.
                  </p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Right Column: SVG Scene Container (Wide Landscape, fitting right side) */}
          <div className={`relative w-full flex justify-center ${isBackdrop ? '' : 'md:col-span-7'}`}>
            <div
              className={`relative w-full ${isBackdrop ? 'max-w-[1000px]' : 'max-w-[720px]'}`}
              onPointerMove={handleScenePointerMove}
              onPointerLeave={handleScenePointerLeave}
            >
              {/* Background Layer SVG (Sky, Sun, Moon, Flying Birds) - placed behind the house */}
              <svg viewBox="0 0 800 320" className="absolute inset-0 w-full h-auto select-none overflow-visible pointer-events-none">
                <defs>
                  <mask id="moon-mask">
                    <circle cx="70" cy="180" r="16" fill="white" />
                    <circle cx="78" cy="172" r="16" fill="black" />
                  </mask>
                </defs>

                {/* Celestial parent container that fades out during rain */}
                <g id="celestial-container" style={{ opacity: isRaining ? 0 : 1, transition: 'opacity 3.0s ease' }}>
                  {/* Sun — CSS class `.dark .animate-sun-cycle` hides it in dark mode */}
                  <g id="celestial-sun" className="animate-sun-cycle">
                    <circle cx="70" cy="180" r="24" fill="#FBBF24" opacity="0.35" />
                    <circle cx="70" cy="180" r="16" fill="#F59E0B" />
                    <circle cx="70" cy="180" r="10" fill="#FFF9E6" />
                  </g>

                  {/* Moon — CSS class `:root:not(.dark) .animate-moon-cycle` hides it in light mode */}
                  <g id="celestial-moon" className="animate-moon-cycle">
                    <circle cx="70" cy="180" r="24" fill="#38BDF8" opacity="0.2" />
                    <circle cx="70" cy="180" r="16" fill="#F8FAFC" mask="url(#moon-mask)" />
                  </g>
                </g>

                {/* Continuous Flying Birds Overhead */}
                {birdsActive && (
                  <g id="flying-birds">
                    {/* Bird 1: blue, slow, left to right, high */}
                    <g className="animate-fly-ltr-slow" style={{ transformOrigin: 'center' }}>
                      <g transform="translate(0, 25) scale(0.6)">
                        <path
                          d="M 0 0 C 4 -6, 8 -6, 12 0 C 16 -6, 20 -6, 24 0 C 16 3, 8 3, 0 0 Z"
                          fill="#3B82F6"
                          className="animate-bird-flap"
                          style={{ transformOrigin: '12px 0px' }}
                        />
                      </g>
                    </g>

                    {/* Bird 2: red, fast, left to right, lower */}
                    <g className="animate-fly-ltr-fast" style={{ transformOrigin: 'center' }}>
                      <g transform="translate(0, 42) scale(0.6)">
                        <path
                          d="M 0 0 C 3 -5, 6 -5, 9 0 C 12 -5, 15 -5, 18 0 C 12 2, 6 2, 0 0 Z"
                          fill="#EF4444"
                          className="animate-bird-flap"
                          style={{ transformOrigin: '9px 0px', animationDelay: '0.2s' }}
                        />
                      </g>
                    </g>

                    {/* Bird 3: green, mid speed, right to left, high */}
                    <g className="animate-fly-rtl-mid" style={{ transformOrigin: 'center', animationDelay: '2s' }}>
                      <g transform="translate(0, 15) scale(0.6)">
                        <path
                          d="M 0 0 C 3 -5, 6 -5, 9 0 C 12 -5, 15 -5, 18 0 C 12 2, 6 2, 0 0 Z"
                          fill="#10B981"
                          className="animate-bird-flap"
                          style={{ transformOrigin: '9px 0px', animationDelay: '0.15s' }}
                        />
                      </g>
                    </g>

                    {/* Bird 4: sky blue, slow, right to left, low (in front of building) */}
                    <g className="animate-fly-rtl-mid" style={{ transformOrigin: 'center', animationDelay: '4s' }}>
                      <g transform="translate(0, 165) scale(0.6)">
                        <path
                          d="M 0 0 C 4 -6, 8 -6, 12 0 C 16 -6, 20 -6, 24 0 C 16 3, 8 3, 0 0 Z"
                          fill="#38BDF8"
                          className="animate-bird-flap"
                          style={{ transformOrigin: '12px 0px', animationDelay: '0.25s' }}
                        />
                      </g>
                    </g>
                  </g>
                )}
              </svg>

              {/* 3D house layer: sits in the middle so the 2D fence,
                  ripples and perch birds keep painting in front of
                  the building. Extends above the viewBox for chimney smoke. */}
              <div
                className="pointer-events-none absolute inset-x-0 animate-home-slide-in"
                style={{ top: '-20%', height: '120%', animationDelay: '100ms' }}
              >
                <House3D
                  doorState={doorState}
                  birdsActive={birdsActive}
                  tiltRef={houseTiltRef}
                  animState={animState}
                  playState={playState}
                  clothingColors={clothingColors}
                  staffStepsOut={staffStepsOut}
                  typingState={typingState}
                />
              </div>

              {/* Foreground Layer SVG (Ground, Fence, Bench, Visiting Birds, Ripples) */}
              <svg viewBox="0 0 800 320" className="relative w-full h-auto select-none overflow-visible">
                <defs>
                  <pattern id="grass-texture" width="18" height="12" patternUnits="userSpaceOnUse">
                    <rect width="18" height="12" fill="#7DAA65" opacity="0.12" />
                    <path d="M2 12 L4 5 M7 12 L7 4 M12 12 L10 6 M16 12 L15 5" stroke="#2F6F34" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
                    <path d="M5 12 L3 8 M10 12 L12 7 M14 12 L17 8" stroke="#8BC66B" strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
                    <circle cx="3" cy="10" r="0.7" fill="#365F2E" opacity="0.35" />
                    <circle cx="13" cy="9" r="0.6" fill="#B7D98D" opacity="0.55" />
                  </pattern>
                </defs>

                {/* Ground & Picket Fence & visiting birds overlay */}
                <g className="animate-home-slide-in" style={{ animationDelay: '100ms', transformOrigin: '500px 300px' }}>
                  {/* Textured ground and clustered grass */}
                  <path d="M0 292 C92 284 155 295 246 286 C372 276 514 288 800 282 L800 320 L0 320 Z" fill="#C7BFA6" opacity="0.22" />
                  <path d="M0 289 C26 276 108 276 143 287 C116 311 31 313 0 302 Z" fill="url(#grass-texture)" opacity="0.92" />
                  <path d="M126 291 C150 275 221 275 256 290 C234 307 159 311 128 302 Z" fill="url(#grass-texture)" opacity="0.62" />
                  <path d="M262 286 C375 278 591 280 746 287 L740 306 C582 296 388 296 264 305 Z" fill="url(#grass-texture)" opacity="0.34" />
                  <path d="M730 288 C753 275 790 277 800 286 L800 314 C770 313 736 305 724 298 Z" fill="url(#grass-texture)" opacity="0.72" />

                  <g id="grass-tufts">
                    <path d="M 22,290 L 18,280 L 22,290 L 24,276 L 22,290 L 29,281" stroke="#1F5E2B" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 36,291 L 32,281 L 36,291 L 39,278 L 36,291 L 44,283" stroke="#2F6F34" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M 51,290 L 47,278 L 51,290 L 53,275 L 51,290 L 58,279" stroke="#426F32" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 66,291 L 60,280 L 66,291 L 68,276 L 66,291 L 75,281" stroke="#1F5E2B" strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M 82,290 L 78,279 L 82,290 L 85,275 L 82,290 L 90,280" stroke="#365F2E" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 98,291 L 94,280 L 98,291 L 100,276 L 98,291 L 106,281" stroke="#2F6F34" strokeWidth="1.9" strokeLinecap="round" />
                    <path d="M 116,290 L 111,279 L 116,290 L 118,276 L 116,290 L 124,281" stroke="#426F32" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M 148,292 L 144,283 L 148,292 L 150,279 L 148,292 L 155,284" stroke="#2F6F34" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M 171,292 L 167,282 L 171,292 L 174,279 L 171,292 L 179,284" stroke="#426F32" strokeWidth="1.7" strokeLinecap="round" />
                    <path d="M 203,292 L 199,283 L 203,292 L 206,279 L 203,292 L 211,284" stroke="#365F2E" strokeWidth="1.7" strokeLinecap="round" />
                    <path d="M 236,291 L 232,282 L 236,291 L 238,279 L 236,291 L 244,284" stroke="#2F6F34" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M 285,291 L 281,281 L 285,291 L 287,276 L 285,291 L 292,282" stroke="#2F6F34" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M 330,290 L 326,279 L 330,290 L 333,275 L 330,290 L 337,280" stroke="#426F32" strokeWidth="2.0" strokeLinecap="round" />
                    <path d="M 385,291 L 381,280 L 385,291 L 387,276 L 385,291 L 393,281" stroke="#1F5E2B" strokeWidth="1.9" strokeLinecap="round" />
                    <path d="M 440,292 L 436,283 L 440,292 L 442,279 L 440,292 L 447,284" stroke="#2F6F34" strokeWidth="1.7" strokeLinecap="round" />
                    <path d="M 665,291 L 661,281 L 665,291 L 667,278 L 665,291 L 672,283" stroke="#426F32" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M 710,292 L 706,282 L 710,292 L 713,279 L 710,292 L 718,284" stroke="#365F2E" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M 744,290 L 740,281 L 744,290 L 746,277 L 744,290 L 752,281" stroke="#2F6F34" strokeWidth="1.7" strokeLinecap="round" />
                    <path d="M 768,291 L 764,280 L 768,291 L 770,276 L 768,291 L 777,281" stroke="#365F2E" strokeWidth="1.9" strokeLinecap="round" />
                    <path d="M 791,291 L 787,281 L 791,291 L 793,278 L 791,291 L 798,283" stroke="#426F32" strokeWidth="1.6" strokeLinecap="round" />
                    <ellipse cx="67" cy="291" rx="55" ry="8" fill="#1F5E2B" opacity="0.18" />
                    <circle cx="38" cy="286" r="5" fill="#365F2E" opacity="0.55" />
                    <circle cx="96" cy="285" r="4" fill="#426F32" opacity="0.5" />
                    <circle cx="129" cy="288" r="3.5" fill="#2F6F34" opacity="0.48" />
                    <circle cx="211" cy="287" r="4.5" fill="#365F2E" opacity="0.42" />
                  </g>



                </g>

                {/* Letter birds resting on the building (roof ridge, ledges, sills) */}
                {flights.map((flight, index) =>
                  flight.status === 'resting' ? (
                    <g key={`rest-${logoBirds[index].id}`} className="animate-rest-bird-land">
                      <SceneBird
                        x={flight.spot.x}
                        y={flight.spot.y}
                        bodyColor={logoBirds[index].bodyColor}
                        wingColor={logoBirds[index].wingColor}
                        mirrored={flight.mirrored}
                        scale={flight.spot.scale}
                      />
                    </g>
                  ) : null,
                )}

                {/* Sound knock waves (concentric circles near door panel) */}
                {showRipple && (
                  <>
                    <circle cx="560" cy="215" r="12" fill="none" stroke="#E4C15B" strokeWidth="2.5" className="animate-ripple-ring" style={{ transformOrigin: '560px 215px' }} />
                    <circle cx="560" cy="215" r="22" fill="none" stroke="#E4C15B" strokeWidth="1.5" className="animate-ripple-ring" style={{ transformOrigin: '560px 215px', animationDelay: '0.3s' }} />
                    <circle cx="560" cy="215" r="32" fill="none" stroke="#E4C15B" strokeWidth="1.0" className="animate-ripple-ring" style={{ transformOrigin: '560px 215px', animationDelay: '0.6s' }} />
                  </>
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroBanner;
