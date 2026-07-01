import React from 'react';
import HeroBanner from './HeroBanner';

interface PediatricService {
  icon: string;
  title: string;
  desc: string;
  overview: string;
  helpsWith: string[];
  whatToExpect: string;
}

const pediatricServices: PediatricService[] = [
  {
    icon: 'record_voice_over',
    title: 'Speech Therapy',
    desc: 'Unlocking communication through articulation, fluency, and language development support.',
    overview:
      'Our speech-language pathologists help children find their voice — building the articulation, fluency, and language skills they need to express themselves with confidence.',
    helpsWith: [
      'Articulation & pronunciation clarity',
      'Stuttering and fluency disorders',
      'Expressive & receptive language delays',
      'Social communication and conversation skills',
      'Feeding & swallowing (dysphagia) difficulties',
    ],
    whatToExpect:
      'We begin with a detailed assessment, then build a personalized, play-based plan. Parents receive practical home strategies so progress continues between sessions.',
  },
  {
    icon: 'psychology',
    title: 'Behavioural Therapy',
    desc: 'Structured strategies for behavioural and communication challenges, focus, and self-regulation.',
    overview:
      'Using evidence-based approaches like Applied Behaviour Analysis (ABA), we help children develop focus, self-regulation, and positive behaviours that support learning and daily life.',
    helpsWith: [
      'Autism Spectrum Disorder (ASD) support',
      'ADHD & attention challenges',
      'Emotional regulation and reducing meltdowns',
      'Building daily-living and social skills',
      'Replacing challenging behaviours with positive ones',
    ],
    whatToExpect:
      'Therapists observe and measure behaviour, set clear goals, and use structured reinforcement. Progress is tracked with data and reviewed with families regularly.',
  },
  {
    icon: 'school',
    title: 'Special Education',
    desc: 'Personalized learning strategies to help every child reach their academic potential.',
    overview:
      'Every child learns differently. Our special educators design individualized learning plans that meet children where they are and move them toward their academic potential.',
    helpsWith: [
      'Learning disabilities (dyslexia, dysgraphia, dyscalculia)',
      'Developmental and cognitive delays',
      'Pre-academic and school-readiness skills',
      'Attention, memory, and processing support',
      'Individualized Education Plans (IEPs)',
    ],
    whatToExpect:
      'We assess each child’s strengths and needs, then deliver one-on-one, goal-driven teaching. Milestones are tracked and shared so families see measurable growth.',
  },
  {
    icon: 'diversity_1',
    title: 'Parent Counseling',
    desc: 'Empowering caregivers with emotional support and practical guidance for home.',
    overview:
      'Caregivers are a child’s most important therapists. We equip parents with the knowledge, tools, and emotional support to confidently carry therapy into everyday life.',
    helpsWith: [
      'Understanding your child’s diagnosis and needs',
      'Practical strategies for home routines',
      'Managing stress and caregiver burnout',
      'Consistent techniques across therapy and home',
      'Navigating school and community resources',
    ],
    whatToExpect:
      'Through guided sessions, parents learn hands-on techniques and receive ongoing emotional support — building a strong, consistent team around the child.',
  },
];

const developmentalConditions = [
  'Autism Spectrum Disorder (ASD)',
  'ADHD & Attention Challenges',
  'Down Syndrome',
  'Cerebral Palsy',
  'Developmental Delay',
];

const pediatricConditions = [
  'Stuttering & Fluency Disorders',
  'Hearing Impairment Support',
  'Dysphagia (Feeding Difficulties)',
  'Articulation Disorders',
  'Social Communication Disorder',
];

const ageGroupServices = [
  {
    icon: 'neurology',
    title: 'Neuro Recovery',
    desc: 'Dedicated support for Stroke recovery and Traumatic Brain Injury (TBI) management.',
  },
  {
    icon: 'elderly',
    title: 'Geriatric Care',
    desc: "Specialized communication and physical therapies for Parkinson's and Alzheimer's.",
  },
  {
    icon: 'all_inclusive',
    title: 'Lifelong Wellness',
    desc: 'Ongoing therapy for congenital conditions as patients transition into adulthood.',
  },
];

const differentiators = [
  {
    icon: 'track_changes',
    title: 'Purposeful Therapy',
    desc: 'Every interaction is designed with a specific developmental goal in mind.',
  },
  {
    icon: 'monitoring',
    title: 'Measurable Progress',
    desc: 'We use data-driven insights to track and celebrate every milestone achieved.',
  },
  {
    icon: 'emoji_events',
    title: 'Result-Oriented',
    desc: 'Our success is measured by the functional independence of our clients in the real world.',
  },
];

const ServiceCard: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm hover:shadow-lg hover:-translate-y-2.5 transition-all duration-300 ease-out flex flex-col justify-between">
    <div>
      <div className="w-11 h-11 rounded-full bg-primary-fixed grid place-items-center mb-4">
        <span className="material-symbols-outlined text-primary">{icon}</span>
      </div>
      <h3 className="text-headline-sm text-on-surface mb-2 font-bold">{title}</h3>
      <p className="text-body-md text-on-surface-variant leading-relaxed">{desc}</p>
    </div>
  </div>
);

const ConditionItem: React.FC<{ label: string }> = ({ label }) => (
  <li className="flex items-center gap-2 py-1.5 text-body-md text-on-surface-variant">
    <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
    {label}
  </li>
);

interface HomePageProps {
  onBookConsultation?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onBookConsultation }) => {
  const [activeService, setActiveService] = React.useState<PediatricService | null>(null);

  React.useEffect(() => {
    document.title = "Recharge Rehabilitation";
  }, []);

  // Close the details modal on Escape and lock body scroll while it's open.
  React.useEffect(() => {
    if (!activeService) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveService(null);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [activeService]);

  return (
    <div className="flex-grow">
      {/* Hero Section - rendered immediately for instant blend */}
      <HeroBanner mode="home" onBookConsultation={onBookConsultation} />

      {/* PEDIATRIC SPECIALTY CARE */}
      <section id="approach" className="py-8 bg-background">
        <div className="w-full px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-headline-xl font-extrabold text-on-surface mb-2">Pediatric Specialty Care</h2>
            <p className="text-body-md text-on-surface-variant">
              Holistic support tailored to the unique developmental needs of children aged 3-18.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {pediatricServices.map((service) => (
              <div
                key={service.title}
                className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="w-10 h-10 rounded-full bg-primary-fixed grid place-items-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[20px]">{service.icon}</span>
                </div>
                <h3 className="text-headline-sm text-on-surface font-bold">{service.title}</h3>
                <p className="text-body-md text-on-surface-variant leading-relaxed">{service.desc}</p>
                <button
                  type="button"
                  onClick={() => setActiveService(service)}
                  className="text-primary font-bold text-sm hover:underline mt-auto pt-4 flex items-center gap-1 self-start"
                >
                  Learn More
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OUR PHILOSOPHY */}
      <section className="py-8">
        <div className="w-full px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Image (order-last on mobile, order-first on desktop) */}
          <div className="lg:col-span-5 flex justify-center w-full relative order-last lg:order-first">
            <div className="relative w-full max-w-[340px] rounded-[2rem] shadow-xl overflow-visible bg-surface-container-high border border-outline-variant/50">
              <img
                src="/images/therapy_sanctuary.png"
                alt="Cozy children sensory playroom with canopy tent"
                className="w-full h-auto object-cover rounded-[2rem]"
              />
              {/* Orange Heart Floating Badge */}
              <div className="absolute -left-4 -bottom-4 bg-[#F29D4E] text-white py-3 px-5 rounded-2xl shadow-lg flex items-center gap-2 animate-bounce" style={{ animationDuration: '3s' }}>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                <span className="font-bold text-xs uppercase tracking-wider">Safe Haven</span>
              </div>
            </div>
          </div>

          {/* Right Column: Text */}
          <div className="lg:col-span-7">
            <span className="inline-block text-primary text-label-md uppercase tracking-wider font-extrabold mb-2">
              Our Philosophy
            </span>
            <h2 className="text-headline-lg text-on-surface font-extrabold mb-6">A Second Home for Healing</h2>
            <div className="space-y-4 text-body-md text-on-surface-variant leading-relaxed max-w-[620px] mb-8">
              <p>
                We believe that rehabilitation shouldn't feel clinical or cold. Our facility is designed to feel like a warm, home-inspired environment where children can settle naturally and feel safe to explore.
              </p>
              <p>
                By integrating play-based therapy into a serene, quiet atmosphere, we reduce the cognitive load on caregivers while fostering an optimistic spirit for the children. Every corner of Recharge is crafted to be a supportive sanctuary.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[480px]">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">spa</span>
                <div>
                  <h4 className="font-bold text-on-surface text-sm">Pill-Shaped</h4>
                  <p className="text-body-sm text-on-surface-variant">Soft, organic design</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">sentiment_satisfied</span>
                <div>
                  <h4 className="font-bold text-on-surface text-sm">Quiet Mood</h4>
                  <p className="text-body-sm text-on-surface-variant">Low-stress experience</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* SERVICES WE OFFER */}
      <section className="py-8 bg-background">
        <div className="w-full px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-headline-xl font-extrabold text-on-surface mb-3">Services We Offer</h2>
            <p className="text-body-lg text-on-surface-variant leading-relaxed">
              Comprehensive therapeutic interventions tailored to individual development needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full items-stretch">
            <ServiceCard
              icon="record_voice_over"
              title="Speech & Language Therapy"
              desc="Enhancing articulation and expressive communication through playful interaction."
            />

            {/* Featured card */}
            <div className="md:row-span-2 bg-primary text-on-primary rounded-[1.5rem] p-8 flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-3 transition-all duration-300 ease-out">
              <div>
                <div className="w-11 h-11 rounded-full bg-white/15 grid place-items-center mb-6">
                  <span className="material-symbols-outlined text-white">diversity_1</span>
                </div>
                <h3 className="text-headline-md font-extrabold mb-3 text-white">Parent Counseling &amp; Training</h3>
                <p className="text-body-md opacity-90 leading-relaxed">
                  Empowering families with the tools to continue progress at home, creating a 24/7 supportive
                  ecosystem.
                </p>
              </div>
              <span className="material-symbols-outlined mt-auto pt-8 text-[26px] opacity-80 self-end">arrow_outward</span>
            </div>

            <ServiceCard
              icon="school"
              title="Special Education"
              desc="Individualized learning strategies for cognitive growth."
            />

            <ServiceCard
              icon="restaurant"
              title="Voice & Feeding"
              desc="Specialized care for vocal health and swallowing challenges."
            />

            {/* Wide accent card */}
            <div className="md:col-span-2 bg-secondary-container text-on-secondary-container rounded-[1.5rem] p-8 flex items-start gap-4 shadow-sm hover:shadow-lg hover:-translate-y-3 transition-all duration-300 ease-out">
              <div className="w-11 h-11 rounded-full bg-white/30 grid place-items-center shrink-0">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <div>
                <h3 className="text-headline-sm font-bold mb-2">Group Communication</h3>
                <p className="text-body-md leading-relaxed">
                  Social-focused sessions where children practice communication in peer environments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONDITIONS WE SERVE */}
      <section className="py-8 bg-background">
        <div className="w-full px-6 md:px-12 grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
          <div>
            <h2 className="text-headline-xl text-primary font-bold mb-4">Conditions We Serve</h2>
            <p className="text-body-lg text-on-surface-variant mb-8 leading-relaxed">
              We provide expert diagnostic and therapeutic support for a wide range of developmental and neurological
              needs.
            </p>
            <div className="bg-primary-fixed rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-out border border-outline-variant/30">
              <h3 className="flex items-center gap-2 text-headline-sm text-on-surface mb-2 font-bold">
                <span className="material-symbols-outlined text-primary text-[22px]">workspace_premium</span>
                Expert Team
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                Our multidisciplinary specialists bring years of clinical experience to every session.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-out">
              <h3 className="text-label-md uppercase tracking-wider text-primary mb-4 font-extrabold">Developmental &amp; Neurological</h3>
              <ul className="space-y-1">
                {developmentalConditions.map((c) => (
                  <ConditionItem key={c} label={c} />
                ))}
              </ul>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-out">
              <h3 className="text-label-md uppercase tracking-wider text-primary mb-4 font-extrabold">Pediatric Specific</h3>
              <ul className="space-y-1">
                {pediatricConditions.map((c) => (
                  <ConditionItem key={c} label={c} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT SETS US APART */}
      <section className="py-8 bg-background">
        <div className="w-full px-6 md:px-12 text-center">
          <h2 className="text-headline-xl font-extrabold text-on-surface mb-12">What Sets Us Apart</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full">
            {differentiators.map((item) => (
              <div key={item.title} className="flex flex-col items-center bg-surface-container-lowest border border-outline-variant/50 rounded-[1.5rem] p-8 shadow-sm hover:shadow-lg hover:-translate-y-2.5 transition-all duration-300 ease-out">
                <div className="w-14 h-14 rounded-2xl bg-primary-fixed grid place-items-center mb-6 text-primary shadow-sm">
                  <span className="material-symbols-outlined text-primary text-[28px]">{item.icon}</span>
                </div>
                <h3 className="text-headline-sm font-bold text-on-surface mb-3">{item.title}</h3>
                <p className="text-body-md text-on-surface-variant max-w-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIFELONG WELLNESS FOR ALL AGES */}
      <section className="py-6 bg-background text-on-surface">
        <div className="w-full px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <h2 className="text-headline-lg font-extrabold text-primary mb-4">Lifelong Wellness for All Ages</h2>
            <p className="text-body-md text-on-surface-variant leading-relaxed max-w-[620px] mb-8">
              Our clinical expertise extends beyond childhood. We provide specialized rehabilitation for adults and seniors, focusing on neurological recovery and functional independence.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 max-w-[560px] mb-8">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-body-md font-semibold text-on-surface">Advanced Stroke Rehabilitation</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-body-md font-semibold text-on-surface">Parkinson's Disease Management</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-body-md font-semibold text-on-surface">Post-Operative Recovery</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-body-md font-semibold text-on-surface">Geriatric Mobility Programs</span>
              </div>
            </div>

            <button
              onClick={onBookConsultation}
              type="button"
              className="border border-primary text-primary hover:bg-primary hover:text-on-primary px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              View Adult Care Programs
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>

          <div className="lg:col-span-5 flex justify-center w-full">
            <div className="w-full max-w-[340px] rounded-[2rem] shadow-md overflow-hidden bg-primary-fixed/20 border border-outline-variant/30">
              <img
                src="/images/therapy_adult.png"
                alt="Adult stroke rehabilitation exercises with physical therapist"
                className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity duration-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES ACROSS ALL AGE GROUPS */}
      <section className="py-6 bg-background text-on-surface">
        <div className="w-full px-6 md:px-12">
          <h2 className="text-headline-xl font-extrabold text-on-surface mb-3">Services Across All Age Groups</h2>
          <p className="text-body-md text-on-surface-variant max-w-2xl mb-10 leading-relaxed">
            While our heart beats for pediatrics, our expertise knows no bounds. We provide world-class
            rehabilitation services for adolescents, adults, and geriatric clients navigating neurological
            transitions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {ageGroupServices.map((service) => (
              <div key={service.title} className="bg-surface-container-lowest border border-outline-variant/60 rounded-[1.5rem] p-8 shadow-sm hover:shadow-lg hover:-translate-y-3 transition-all duration-300 ease-out flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center mb-6 text-primary">
                    <span className="material-symbols-outlined text-primary text-[24px]">
                      {service.icon === 'neurology' ? 'psychiatry' : service.icon === 'elderly' ? 'elderly' : 'all_inclusive'}
                    </span>
                  </div>
                  <h3 className="text-headline-sm font-extrabold text-on-surface mb-3">{service.title}</h3>
                  <p className="text-body-md text-on-surface-variant leading-relaxed">{service.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PEDIATRIC SERVICE DETAILS MODAL */}
      {activeService && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in"
            onClick={() => setActiveService(null)}
          />
          <div className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-[1.75rem] shadow-2xl animate-scale-bounce-in">
            <button
              type="button"
              onClick={() => setActiveService(null)}
              aria-label="Close"
              className="absolute top-4 right-4 w-9 h-9 rounded-full grid place-items-center text-on-surface-variant hover:bg-primary-fixed hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>

            <div className="p-7 sm:p-8">
              <div className="w-12 h-12 rounded-full bg-primary-fixed grid place-items-center shrink-0 mb-4">
                <span className="material-symbols-outlined text-primary text-[24px]">{activeService.icon}</span>
              </div>
              <h3 id="service-modal-title" className="text-headline-md font-extrabold text-on-surface mb-3">
                {activeService.title}
              </h3>
              <p className="text-body-md text-on-surface-variant leading-relaxed mb-6">
                {activeService.overview}
              </p>

              <h4 className="text-body-md font-bold text-on-surface mb-3">How we help</h4>
              <ul className="mb-6 space-y-1">
                {activeService.helpsWith.map((item) => (
                  <li key={item} className="flex items-start gap-2 py-1 text-body-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>

              <h4 className="text-body-md font-bold text-on-surface mb-2">What to expect</h4>
              <p className="text-body-md text-on-surface-variant leading-relaxed mb-7">
                {activeService.whatToExpect}
              </p>

              <button
                type="button"
                onClick={() => {
                  setActiveService(null);
                  onBookConsultation?.();
                }}
                className="w-full bg-primary text-on-primary font-bold text-sm rounded-full py-3.5 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                Book a Consultation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
