import React, { useEffect } from 'react';

interface ServicesPageProps {
  onBookConsultation?: () => void;
}

/* Core therapeutic services we actually provide (no occupational therapy). */
const coreServices: { icon: string; title: string; desc: string }[] = [
  {
    icon: 'record_voice_over',
    title: 'Speech & Language Therapy',
    desc: 'Building expressive and receptive language, articulation, and confident, functional communication.',
  },
  {
    icon: 'interpreter_mode',
    title: 'Childhood Apraxia & Articulation',
    desc: 'Targeted motor-speech programs that help children plan, sequence, and produce clear sounds.',
  },
  {
    icon: 'graphic_eq',
    title: 'Fluency & Stuttering Therapy',
    desc: 'Evidence-based techniques to ease stuttering, improve fluency, and rebuild speaking confidence.',
  },
  {
    icon: 'restaurant',
    title: 'Voice, Feeding & Swallowing',
    desc: 'Specialist Deglutology and voice care for swallowing difficulties and vocal health.',
  },
  {
    icon: 'hearing',
    title: 'Hearing & Auditory Rehabilitation',
    desc: 'Listening, auditory training, and communication support for children with hearing impairment.',
  },
  {
    icon: 'school',
    title: 'Special Education & Learning Support',
    desc: 'Individualized learning plans for learning disabilities and academic skill-building.',
  },
  {
    icon: 'psychology',
    title: 'Behavioural Therapy',
    desc: 'Structured strategies for behavioural and communication challenges, focus, and self-regulation.',
  },
  {
    icon: 'groups',
    title: 'Social & Group Communication',
    desc: 'Peer-based sessions where children practise turn-taking, play, and real-world social skills.',
  },
  {
    icon: 'diversity_1',
    title: 'Parent Counseling & Training',
    desc: 'Equipping families to extend therapy at home and build a supportive 24/7 ecosystem.',
  },
];

/* The full range of conditions we serve, grouped for readability. */
const conditionGroups: { label: string; icon: string; items: string[] }[] = [
  {
    label: 'Developmental & Neurological',
    icon: 'neurology',
    items: [
      'Autism Spectrum Disorder (ASD)',
      'Attention Deficit Hyperactivity Disorder (ADHD)',
      'Down Syndrome',
      'Cerebral Palsy (CP)',
      'Intellectual Disability (ID)',
      'Global Developmental Delay (GDD)',
      'Genetic & Neurodevelopmental Syndromes',
    ],
  },
  {
    label: 'Speech, Language & Communication',
    icon: 'record_voice_over',
    items: [
      'Developmental Speech & Language Delay (DSLD)',
      'Childhood Apraxia of Speech',
      'Stuttering & Fluency Disorders',
      'Social Communication Disorders',
      'Behavioural & Communication Challenges',
    ],
  },
  {
    label: 'Learning & Sensory',
    icon: 'school',
    items: [
      'Learning Disabilities',
      'Hearing Impairment',
    ],
  },
];

/* How a journey with us unfolds. */
const process: { step: string; icon: string; title: string; desc: string }[] = [
  {
    step: '01',
    icon: 'fact_check',
    title: 'Assessment',
    desc: 'A thorough, play-based evaluation to understand each child’s unique strengths and needs.',
  },
  {
    step: '02',
    icon: 'map',
    title: 'Personalized Plan',
    desc: 'Clear, measurable goals shaped around the family and the individual’s developmental journey.',
  },
  {
    step: '03',
    icon: 'cardiology',
    title: 'Therapy & Practice',
    desc: 'Consistent, evidence-based sessions in a warm, home-inspired environment.',
  },
  {
    step: '04',
    icon: 'trending_up',
    title: 'Progress & Review',
    desc: 'Ongoing tracking, caregiver training, and reviews that celebrate every milestone.',
  },
];

const ServiceCard: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="bg-surface-container-lowest border border-outline-variant rounded-[1.5rem] p-6 shadow-sm hover:shadow-lg hover:-translate-y-2.5 transition-all duration-300 ease-out flex flex-col">
    <div className="w-11 h-11 rounded-full bg-primary-fixed grid place-items-center mb-4">
      <span className="material-symbols-outlined text-primary">{icon}</span>
    </div>
    <h3 className="text-headline-sm text-on-surface mb-2 font-bold">{title}</h3>
    <p className="text-body-md text-on-surface-variant leading-relaxed">{desc}</p>
  </div>
);

const ConditionItem: React.FC<{ label: string }> = ({ label }) => (
  <li className="flex items-center gap-2 py-1.5 text-body-md text-on-surface-variant">
    <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
    {label}
  </li>
);

const ServicesPage: React.FC<ServicesPageProps> = ({ onBookConsultation }) => {
  useEffect(() => {
    document.title = 'Services - Recharge Rehabilitation';
  }, []);

  return (
    <div className="flex-grow">
      {/* HERO — blends out of the header, same blue→beige rhythm as the rest of the site */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-fixed to-background pt-8 pb-10 px-6 md:px-12">
        <div className="absolute -right-16 -top-12 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 top-12 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="relative w-full text-center max-w-3xl mx-auto">
          <span className="inline-block bg-primary text-on-primary text-label-md uppercase tracking-widest font-extrabold px-4 py-1.5 rounded-full mb-4 shadow-sm">
            Our Services
          </span>
          <h1 className="text-3xl md:text-headline-xl font-extrabold text-primary leading-tight mb-3">
            Therapy for Every Voice &amp; Every Journey
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            We provide expert, evidence-based support across a wide range of developmental, neurological,
            communication, and learning conditions — for children, adults, and seniors alike.
          </p>
        </div>
      </section>

      {/* CORE SERVICES */}
      <section className="py-8 bg-background">
        <div className="w-full px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-headline-xl font-extrabold text-on-surface mb-3">Core Therapeutic Services</h2>
            <p className="text-body-lg text-on-surface-variant leading-relaxed">
              A multidisciplinary team designs every interaction around a specific developmental goal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {coreServices.map((service) => (
              <ServiceCard key={service.title} icon={service.icon} title={service.title} desc={service.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* CONDITIONS WE SERVE */}
      <section className="py-8 bg-background">
        <div className="w-full px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
            <div>
              <h2 className="text-headline-xl text-primary font-bold mb-4">Conditions We Serve</h2>
              <p className="text-body-lg text-on-surface-variant mb-8 leading-relaxed">
                Our specialists support a broad spectrum of developmental, neurological, communication, and
                learning needs — and many more beyond this list.
              </p>
              <div className="bg-primary-fixed rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-out border border-outline-variant/30">
                <h3 className="flex items-center gap-2 text-headline-sm text-on-surface mb-2 font-bold">
                  <span className="material-symbols-outlined text-primary text-[22px]">workspace_premium</span>
                  Not sure where to start?
                </h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  If a condition isn’t listed here, reach out — our team will guide you to the right pathway.
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
              {conditionGroups.map((group) => (
                <div
                  key={group.label}
                  className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-out"
                >
                  <h3 className="flex items-center gap-2 text-label-md uppercase tracking-wider text-primary mb-4 font-extrabold">
                    <span className="material-symbols-outlined text-primary text-[20px]">{group.icon}</span>
                    {group.label}
                  </h3>
                  <ul className="space-y-1">
                    {group.items.map((c) => (
                      <ConditionItem key={c} label={c} />
                    ))}
                  </ul>
                </div>
              ))}

              {/* "And many more" accent card */}
              <div className="bg-secondary-container text-on-secondary-container rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-out flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white/30 grid place-items-center shrink-0">
                  <span className="material-symbols-outlined">add_circle</span>
                </div>
                <div>
                  <h3 className="text-headline-sm font-bold mb-1">And many more</h3>
                  <p className="text-body-sm leading-relaxed">
                    Every individual is unique — we tailor therapy to needs that don’t fit a single label.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OUR APPROACH */}
      <section className="py-8 bg-background">
        <div className="w-full px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-headline-xl font-extrabold text-on-surface mb-3">How We Work With You</h2>
            <p className="text-body-lg text-on-surface-variant leading-relaxed">
              A purposeful, measurable, result-oriented pathway from first visit to lasting independence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {process.map((stage) => (
              <div
                key={stage.step}
                className="relative bg-surface-container-lowest border border-outline-variant/50 rounded-[1.5rem] p-7 shadow-sm hover:shadow-lg hover:-translate-y-2.5 transition-all duration-300 ease-out flex flex-col"
              >
                <span className="absolute top-5 right-6 text-headline-lg font-extrabold text-primary/15 select-none">
                  {stage.step}
                </span>
                <div className="w-12 h-12 rounded-2xl bg-primary-fixed grid place-items-center mb-5 text-primary shadow-sm">
                  <span className="material-symbols-outlined text-primary text-[26px]">{stage.icon}</span>
                </div>
                <h3 className="text-headline-sm font-bold text-on-surface mb-2">{stage.title}</h3>
                <p className="text-body-md text-on-surface-variant leading-relaxed">{stage.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — keeps the site theme; ends on bg-background so the footer blends in */}
      <section className="py-8 px-6 md:px-12 bg-background">
        <div className="w-full rounded-[2rem] bg-gradient-to-br from-primary-fixed/25 to-background border border-outline-variant/40 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

          <div className="text-left max-w-3xl space-y-2 relative z-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">
              Let’s find the right path, <span className="text-primary">together</span>.
            </h2>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Book a consultation and our specialists will help you understand the options and next steps for
              your child or loved one.
            </p>
          </div>

          <div className="shrink-0 relative z-10 flex flex-wrap gap-3">
            <button
              onClick={onBookConsultation}
              type="button"
              className="bg-primary text-on-primary hover:brightness-95 active:scale-95 px-7 py-3.5 rounded-full font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              Book a Consultation
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
    </div>
  );
};

export default ServicesPage;
