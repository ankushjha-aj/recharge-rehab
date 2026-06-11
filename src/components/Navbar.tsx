import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact Us', href: '/contact' },
];

export const Logo: React.FC = () => {
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

const Navbar: React.FC<NavbarProps> = ({ onBookConsultation, route = '/', onWIP }) => {
  const [activeLabel, setActiveLabel] = useState('Home');

  useEffect(() => {
    // Base the active link on the actual route (the page), not the raw hash, so in-page
    // anchors like "#approach" don't downgrade the highlight to Home.
    if (route.startsWith('/about')) {
      setActiveLabel('About Us');
    } else if (route.startsWith('/gallery')) {
      setActiveLabel('Gallery');
    } else if (route.startsWith('/contact')) {
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
        <a href="/" className="flex items-center" aria-label="Recharge Rehabilitation Home">
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
          {/* Instagram */}
          <a
            href="https://www.instagram.com/recharge_rehab/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-on-surface-variant hover:text-primary hover:scale-110 transition-all duration-200 flex items-center justify-center p-1"
            title="Instagram"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </a>
          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/company/recharge-rehab"
            target="_blank"
            rel="noopener noreferrer"
            className="text-on-surface-variant hover:text-primary hover:scale-110 transition-all duration-200 flex items-center justify-center p-1 mr-1"
            title="LinkedIn"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
          </a>

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
