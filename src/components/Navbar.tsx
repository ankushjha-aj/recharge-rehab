import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

const navLinks = [
  { label: 'Home', href: '#/' },
  { label: 'About Us', href: '#/about' },
  { label: 'Services', href: '#/services' },
  { label: 'Gallery', href: '#/gallery' },
  { label: 'Blog', href: '#/blog' },
  { label: 'Contact Us', href: '#/contact' },
];

const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-1 select-none" aria-label="Recharge Rehabilitation">
      {/* Circular R icon — identical to the Chrome tab favicon */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: '#ffffff',
          border: '2.5px solid #2f6fd0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 1px 4px rgba(47,111,208,0.18)',
        }}
      >
        <img
          src="/images/logo_parts/letter_0_R.png"
          alt="R"
          style={{
            width: '22px',
            height: '22px',
            objectFit: 'contain',
            display: 'block',
          }}
          className="logo-word-rehabilitation"
        />
      </div>

      {/* REHABILITATION word — brand's hand-drawn distorted font */}
      <img
        src="/images/logo-half.png"
        alt="Rehabilitation"
        className="logo-word-rehabilitation"
        style={{
          height: '20px',
          width: 'auto',
          display: 'block',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

interface NavbarProps {
  onBookConsultation?: () => void;
  route?: string;
  onWIP?: (pageName: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onBookConsultation, route = '#/', onWIP }) => {
  const [activeLabel, setActiveLabel] = useState('Home');

  useEffect(() => {
    // Base the active link on the actual route (the page), not the raw hash, so in-page
    // anchors like "#approach" don't downgrade the highlight to Home.
    if (route.startsWith('#/about')) {
      setActiveLabel('About Us');
    } else if (route.startsWith('#/gallery')) {
      setActiveLabel('Gallery');
    } else if (route.startsWith('#/contact')) {
      setActiveLabel('Contact Us');
    } else {
      setActiveLabel('Home');
    }
  }, [route]);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroElement = document.querySelector('.from-primary-fixed');
      if (heroElement) {
        const rect = heroElement.getBoundingClientRect();
        // The Navbar height is 64px (h-16). As long as the bottom of the blue gradient
        // hero is below 64px, the Navbar is over the blue section.
        // Once the hero bottom scrolls up past 64px, the beige page content goes under the Navbar.
        setIsScrolled(rect.bottom <= 64);
      } else {
        setIsScrolled(window.scrollY > 10);
      }
    };
    // Initialize scroll state on mount/refresh
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <nav
      className={`sticky top-0 w-full transition-all duration-300 z-50 ${isScrolled
          ? 'bg-background'
          : 'bg-primary-fixed'
        }`}
    >
      <div className="flex justify-between items-center px-6 md:px-12 w-full h-16">
        {/* Brand Logo — full logo.png with RECHARGE + REHABILITATION */}
        <a href="#/" className="flex items-center" aria-label="Recharge Rehabilitation Home">
          <Logo />
        </a>

        {/* Navigation Links */}
        <ul className="hidden md:flex space-x-6 items-center">
          {navLinks.map((link) => (
            <li key={link.label}>
              <a
                onClick={(e) => {
                  if (link.label === 'Services' || link.label === 'Blog') {
                    e.preventDefault();
                    onWIP?.(link.label);
                  }
                }}
                className={
                  link.label === activeLabel
                    ? 'text-primary font-extrabold border-b-2 border-primary pb-1 transition-colors duration-200 text-sm'
                    : 'text-on-surface-variant hover:text-primary transition-colors duration-200 text-sm font-bold'
                }
                href={link.href}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Right cluster: theme toggle + CTA */}
        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />

          {/* CTA Button */}
          <button
            onClick={onBookConsultation}
            className="bg-primary text-on-primary px-4 py-1.5 rounded-full hover:bg-primary-container hover:text-on-primary-container transition-all font-bold text-[11px] uppercase tracking-wider active:scale-95 duration-200 shadow-md hover:shadow-lg"
          >
            Book Consultation
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
