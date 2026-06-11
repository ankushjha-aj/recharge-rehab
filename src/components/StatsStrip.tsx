import React, { useEffect, useRef, useState } from 'react';

interface StatItemProps {
  icon: string;
  value: string;
  label: string;
  delay: number;
}

const StatItem: React.FC<StatItemProps> = ({ icon, value, label, delay }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`flex flex-col items-center transition-all duration-700 ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span
        className="material-symbols-outlined text-primary text-4xl mb-3"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {icon}
      </span>
      <h3 className="text-headline-xl text-on-primary-container mb-1">{value}</h3>
      <p className="text-body-md text-on-surface-variant">{label}</p>
    </div>
  );
};

const stats = [
  { icon: 'child_care', value: '500+', label: 'Happy Kids' },
  { icon: 'volunteer_activism', value: '10+', label: 'Caring Therapists' },
  { icon: 'toys', value: '2', label: 'Playful Clinics' },
  { icon: 'sentiment_very_satisfied', value: '98%', label: 'Parent Satisfaction' },
];

const StatsStrip: React.FC = () => {
  return (
    <section className="bg-gradient-to-b from-background via-primary-fixed to-background py-16 px-6 md:px-12">
      <div className="w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <StatItem
              key={stat.label}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              delay={index * 150}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsStrip;
