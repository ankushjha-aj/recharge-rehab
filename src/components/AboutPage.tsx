import React, { useEffect, useState } from 'react';

interface AboutPageProps {
  onBookConsultation?: () => void;
}

const collagePool = [
  { src: '/images/therapy_speech.png', alt: 'A therapist and child during a speech and language session' },
  { src: '/images/therapy_art.png', alt: 'A child and therapist painting together during an art therapy session' },
  { src: '/images/therapy_sign_language.png', alt: 'Special educator teaching sign language and communication signs to a child' },
  { src: '/images/therapy_sensory.png', alt: 'Sensory play session with colorful kinetic sand for tactile coordination' },
  { src: '/images/therapy_physical_ball.png', alt: 'Physical therapist guiding a child balancing on a colorful exercise ball' },
  { src: '/images/therapy_speech_mirror.png', alt: 'Speech therapy session practicing articulation and mouth movements in front of a mirror' },
  { src: '/images/therapy_fine_motor.png', alt: 'Fine motor skills exercise threading colorful beads with a therapist' },
  { src: '/images/therapy_behavioral_group.png', alt: 'Group communication and social play session with a board game' },
  { src: '/images/therapy_music.png', alt: 'Music therapy session exploring rhythms and playing a xylophone' },
  { src: '/images/therapy_cognitive_reading.png', alt: 'Cognitive and language development session reading a picture book in a cozy corner' },
  { src: '/images/therapy_interactive_screen.png', alt: 'Interactive tablet-based learning game for cognitive skill development' },
];

interface CollageBoxProps {
  image: { src: string; alt: string };
  className?: string;
}

const CollageBox: React.FC<CollageBoxProps> = ({ image, className }) => {
  const [currentImage, setCurrentImage] = useState(image);
  const [nextImage, setNextImage] = useState<{ src: string; alt: string } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (image.src !== currentImage.src) {
      setNextImage(image);
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setCurrentImage(image);
        setNextImage(null);
        setIsTransitioning(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [image]);

  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] p-2 bg-primary-fixed/20 border border-outline-variant/50 shadow-md ${className}`}>
      <div className="relative w-full h-full rounded-[1rem] overflow-hidden bg-background">
        <img
          src={currentImage.src}
          alt={currentImage.alt}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
            isTransitioning ? 'opacity-0 scale-95 blur-xs' : 'opacity-85 scale-100 blur-none'
          }`}
        />
        {nextImage && (
          <img
            src={nextImage.src}
            alt={nextImage.alt}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
              isTransitioning ? 'opacity-85 scale-100 blur-none' : 'opacity-0 scale-95 blur-xs'
            }`}
          />
        )}
      </div>
    </div>
  );
};



const AboutPage: React.FC<AboutPageProps> = ({ onBookConsultation }) => {
  useEffect(() => {
    document.title = "About Us - Recharge Rehabilitation";
  }, []);

  const [activeIndices, setActiveIndices] = useState([0, 1, 2, 3]);
  const [animPhase, setAnimPhase] = useState<'build-0' | 'build-1' | 'build-2' | 'build-3' | 'shuffle' | 'full-view'>('build-0');
  const [fullViewIndex, setFullViewIndex] = useState<number | null>(null);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const runTimeline = () => {
      // 1. Reset phase to build-0 and pick 4 new unique images
      setAnimPhase('build-0');

      const getNewIndices = () => {
        const indices: number[] = [];
        while (indices.length < 4) {
          const rand = Math.floor(Math.random() * collagePool.length);
          if (!indices.includes(rand)) {
            indices.push(rand);
          }
        }
        return indices;
      };

      const newIndices = getNewIndices();
      setActiveIndices(newIndices);
      
      // Select one of the images to display during the full-view mode
      setFullViewIndex(newIndices[Math.floor(Math.random() * 4)]);

      // 2. Transition to build-1 at 1.2s
      timer = setTimeout(() => {
        setAnimPhase('build-1');

        // 3. Transition to build-2 at 2.4s
        timer = setTimeout(() => {
          setAnimPhase('build-2');

          // 4. Transition to build-3 at 3.6s
          timer = setTimeout(() => {
            setAnimPhase('build-3');

            // 5. Transition to shuffle at 5.5s (after showing all 4)
            timer = setTimeout(() => {
              setAnimPhase('shuffle');

              // Shuffle: swap slots 1 and 2 with unused images from the pool
              setActiveIndices((prev) => {
                const next = [...prev];
                const unused = Array.from({ length: collagePool.length }, (_, i) => i)
                  .filter((i) => !prev.includes(i));
                if (unused.length >= 2) {
                  next[1] = unused[Math.floor(Math.random() * unused.length)];
                  next[2] = unused.filter(i => i !== next[1])[Math.floor(Math.random() * (unused.length - 1))];
                }
                return next;
              });

              // 6. Transition to full-view at 7.5s (wait 2s)
              timer = setTimeout(() => {
                setAnimPhase('full-view');

                // 7. Restart the entire timeline loop after 4s of full-view
                timer = setTimeout(() => {
                  runTimeline();
                }, 4000);
              }, 2000);
            }, 1900);
          }, 1200);
        }, 1200);
      }, 1200);
    };

    runTimeline();
    return () => clearTimeout(timer);
  }, []);

  const activeImages = activeIndices.map((index) => collagePool[index]);

  return (
    <div className="flex-grow">
      {/* HERO — compact, mirrors the Contact page header proportions */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-fixed to-background pt-3 pb-3 px-6 md:px-12">
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
          <div className="md:col-span-5">
            <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface leading-tight mb-3">
              About Recharge Rehabilitation Clinic
            </h1>
            <p className="text-body-md text-on-surface-variant max-w-[480px] mb-6">
              With over 8 years of compassionate, evidence-based care, we provide specialized therapeutic solutions designed to empower children and their families in a nurturing environment. Our multidisciplinary specialists coordinate closely to deliver speech therapy, special education, sensory-motor training, and parental coaching under one supportive roof, bridging the gap between clinical guidance and functional real-world progress.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onBookConsultation}
                type="button"
                className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm hover:brightness-95 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                Book a Consultation
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <a
                href="#approach"
                className="border border-primary text-primary px-5 py-2.5 rounded-full font-bold text-sm hover:bg-primary hover:text-on-primary transition-colors duration-200"
              >
                Our Method
              </a>
            </div>
          </div>

          {/* Animating Asymmetrical Collage Container */}
          <div className="md:col-span-7 relative w-full flex justify-center py-2">
            <div className="relative w-full max-w-[380px] aspect-[4/3] md:aspect-square">
              {/* Grid Collage Mode */}
              <div
                className={`grid grid-cols-2 gap-4 w-full h-full transition-all duration-700 ${
                  animPhase === 'full-view' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                }`}
              >
                {/* Column 1 */}
                <div className="space-y-4">
                  <CollageBox
                    image={activeImages[0]}
                    className="w-full aspect-[4/3] transition-all duration-700 opacity-100 scale-100"
                  />
                  <CollageBox
                    image={activeImages[1]}
                    className={`w-full aspect-[1/1] transition-all duration-700 ${
                      animPhase !== 'build-0' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
                    }`}
                  />
                </div>
                {/* Column 2 */}
                <div className="space-y-4 pt-6">
                  <CollageBox
                    image={activeImages[2]}
                    className={`w-full aspect-[1/1] transition-all duration-700 ${
                      animPhase !== 'build-0' && animPhase !== 'build-1'
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-90 pointer-events-none'
                    }`}
                  />
                  <CollageBox
                    image={activeImages[3]}
                    className={`w-full aspect-[4/3] transition-all duration-700 ${
                      animPhase === 'build-3' || animPhase === 'shuffle'
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-90 pointer-events-none'
                    }`}
                  />
                </div>
              </div>

              {/* Full View Mode Box */}
              <div
                className={`absolute inset-0 w-full h-full transition-all duration-700 ${
                  animPhase === 'full-view' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                {fullViewIndex !== null && (
                  <div className="p-3 bg-primary-fixed/20 border border-outline-variant/50 rounded-[2rem] shadow-xl w-full h-full flex items-center justify-center">
                    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-background">
                      <img
                        src={collagePool[fullViewIndex].src}
                        alt={collagePool[fullViewIndex].alt}
                        className="w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity duration-300"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OWNER PROFILE SECTION — Wide rectangle layout, full-width card */}
      <section className="pb-8 pt-4 bg-background">
        <div className="w-full px-6 md:px-12">
          <div className="w-full rounded-[2rem] bg-surface-container-lowest border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-0">

              {/* Portrait image — top on mobile, right column on desktop */}
              <div className="relative flex items-end justify-center min-h-[280px] md:min-h-[460px] md:order-2">
                <img
                  src="/images/owner-pic.png"
                  alt="Dr. Siddharth Upadhyay"
                  className="w-full max-h-[480px] object-contain object-bottom select-none"
                />
              </div>

              {/* Content — below image on mobile, left column on desktop */}
              <div className="flex flex-col justify-center gap-5 p-6 md:p-10 md:order-1">
                {/* Name & title */}
                <div>
                  <span className="inline-block bg-primary-fixed text-primary text-label-md uppercase tracking-widest font-extrabold px-3 py-1 rounded-full mb-3 shadow-xs">
                    Clinic Director
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight mb-1">
                    Dr. Siddharth Upadhyay (SLP)
                  </h2>
                  <p className="text-body-lg text-primary font-bold">
                    Leading Speech &amp; Language &amp; Voice and Swallow Specialist
                  </p>
                </div>

                {/* Credentials */}
                <div className="space-y-2 border-l-4 border-primary/45 pl-4 py-1">
                  <p className="text-body-sm text-on-surface-variant font-semibold uppercase tracking-wider mb-2">
                    Credentials &amp; Education
                  </p>
                  <div className="flex items-start gap-2 text-body-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    <span>Certified and Registered by the Rehabilitation Council of India (RCI)</span>
                  </div>
                  <div className="flex items-start gap-2 text-body-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">school</span>
                    <span>B.A.S.L.P. — Ali Yavar Jung National Institute of Speech &amp; Hearing Disabilities (Delhi)</span>
                  </div>
                  <div className="flex items-start gap-2 text-body-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">workspace_premium</span>
                    <span>Masters in Deglutology and Swallowing Disorders — AIMS (Kochi)</span>
                  </div>
                </div>

                {/* Bio paragraph */}
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  Experience the best speech and language pathology teamwork and therapy programs at Recharge Rehabilitation Clinic. Dr. Siddharth Upadhyay leads our team with compassionate, evidence-based care tailored to each individual's developmental journey.
                </p>

                {/* Learn More CTA */}
                <div>
                  <button
                    onClick={() => setIsOwnerModalOpen(true)}
                    type="button"
                    className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm hover:brightness-95 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Learn More
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Dr. Siddharth Upadhyay Detailed Info Modal */}
      {isOwnerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsOwnerModalOpen(false)}>
          <div 
            className="w-full max-w-2xl bg-surface border border-outline-variant rounded-[2.5rem] p-8 shadow-xl animate-drop-down-spring relative max-h-[90vh] overflow-y-auto text-left" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsOwnerModalOpen(false)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-primary transition-colors p-1"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>

            {/* Modal Header: Title */}
            <div className="flex flex-col md:flex-row gap-6 items-center pb-6 border-b border-outline-variant/30 mb-6">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-surface-container-high border border-outline-variant/30 shrink-0">
                <img
                  src="/images/owner-pic.png"
                  alt="Dr. Siddharth Upadhyay"
                  className="w-full h-full object-contain object-bottom select-none"
                />
              </div>
              <div className="text-center md:text-left">
                <span className="inline-block bg-primary-fixed text-primary text-label-md uppercase tracking-widest font-extrabold px-3 py-1 rounded-full mb-2 shadow-xs">
                  Clinic Director
                </span>
                <h3 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">
                  Dr. Siddharth Upadhyay (SLP)
                </h3>
                <p className="text-body-md text-primary font-bold">
                  Leading Speech &amp; Language &amp; Voice and Swallow Specialist
                </p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="space-y-6">
              {/* Credentials Section */}
              <div className="space-y-3 border-l-4 border-primary/45 pl-4 py-1">
                <p className="text-body-sm text-on-surface-variant font-semibold uppercase tracking-wider">
                  Credentials &amp; Education
                </p>
                <div className="space-y-2.5 text-body-md text-on-surface-variant leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    <span>Certified and Registered by the Rehabilitation Council of India (RCI)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">school</span>
                    <span>B.A.S.L.P. — Ali Yavar Jung National Institute of Speech &amp; Hearing Disabilities (Delhi)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">workspace_premium</span>
                    <span>Masters in Deglutology and Swallowing Disorders — AIMS (Kochi)</span>
                  </div>
                </div>
              </div>

              {/* Comprehensive Bio */}
              <div className="text-body-md text-on-surface-variant leading-relaxed space-y-4">
                <p>
                  Experience the best speech and language pathology teamwork and therapy programs at Recharge Rehabilitation Clinic. Dr. Siddharth Upadhyay leads our team with compassionate, evidence-based care tailored to each individual's developmental journey.
                </p>
                <p>
                  Specializing in advanced Deglutology (swallow science) and voice disorders, Dr. Upadhyay focuses on reinforcing clinical targets inside a nurturing, home-inspired environment, bridging outpatient clinical care with real-world functional independence.
                </p>
                <p>
                  Dr. Upadhyay coordinates closely with our team of speech therapists, special educators, and occupational therapists to design individual pathways for pediatric, adult, and geriatric rehabilitation. He is committed to training caregivers to build a supportive, 24/7 ecosystem around the clients for long-term functional success.
                </p>
              </div>
            </div>

            {/* Footer action */}
            <div className="mt-8 pt-6 border-t border-outline-variant/30 flex justify-end">
              <button
                onClick={() => setIsOwnerModalOpen(false)}
                className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold text-sm hover:brightness-110 active:scale-95 transition-all duration-200 shadow-md"
              >
                Close Biography
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A CHILD-CENTERED APPROACH */}
      <section className="py-6 bg-background">
        <div className="w-full px-6 md:px-12 text-center">
          {/* Badge */}
          <span className="inline-block bg-primary text-on-primary text-label-md uppercase tracking-widest font-extrabold px-4 py-1.5 rounded-full mb-4 shadow-sm">
            Approach
          </span>
          
          {/* Title */}
          <h2 className="text-headline-xl font-extrabold text-on-surface mb-3">
            A Child-Centered Approach
          </h2>
          
          {/* Subtitle */}
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-8">
            Providing a warm, home-inspired environment designed to bridge the gap between clinical milestones and real-world confidence.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full items-stretch">
            {/* Card 1 */}
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[1.5rem] p-6 md:p-8 flex flex-col items-center text-center shadow-sm hover:shadow-lg hover:-translate-y-3 transition-all duration-300 ease-out">
              <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary mb-6 shadow-inner">
                <span className="material-symbols-outlined text-[24px]">home</span>
              </div>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                We foster a warm, home-inspired environment where children feel safe to explore and express
                themselves. Our clinic isn't just a medical facility; it's a sanctuary designed to bridge the gap
                between therapy and real-world application.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[1.5rem] p-6 md:p-8 flex flex-col items-center text-center shadow-sm hover:shadow-lg hover:-translate-y-3 transition-all duration-300 ease-out">
              <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary mb-6 shadow-inner">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                Our primary aim is the application of home-based skills before venturing into the wider world. We
                believe that mastery begins in comfortable, familiar settings, enabling children to build the
                confidence needed for social integration.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[1.5rem] p-6 md:p-8 flex flex-col items-center text-center shadow-sm hover:shadow-lg hover:-translate-y-3 transition-all duration-300 ease-out">
              <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary mb-6 shadow-inner">
                <span className="material-symbols-outlined text-[24px]">child_care</span>
              </div>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                We align structured therapeutic milestones with active play and natural curiosity. By integrating clinical targets into a child's favorite activities, we ensure high engagement, making therapy feel like a pathway to discovery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RECHARGE CTA SECTION (Light-themed horizontal split layout) */}
      <section className="py-6 px-6 md:px-12 bg-background">
        <div className="w-full rounded-[2rem] bg-gradient-to-br from-primary-fixed/25 to-background border border-outline-variant/40 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm relative overflow-hidden">
          {/* Subtle decorative theme glows */}
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          
          <div className="text-left max-w-3xl space-y-2 relative z-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">
              Discharged from another hospital? <span className="text-primary">RECHARGE</span> with us.
            </h2>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Your journey doesn't end at discharge. Join our community for continuous, specialized outpatient care that bridges the gap between clinical recovery and thriving daily life.
            </p>
          </div>
          
          <div className="shrink-0 relative z-10">
            <button
              onClick={onBookConsultation}
              type="button"
              className="bg-primary text-on-primary hover:brightness-95 active:scale-95 px-8 py-3.5 rounded-full font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              Start Your Recovery Today
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
