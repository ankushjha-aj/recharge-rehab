import React from 'react';
import { Logo } from './Navbar';

const Footer: React.FC = () => {
  return (
    <>
      {/* Spacer to guarantee visual spacing between footer and the above section */}
      <div className="h-6 md:h-10 w-full flex-shrink-0" />

      <footer className="bg-gradient-to-b from-background via-[#aecaf2]/60 to-[#7ea8ee] dark:from-background dark:via-[#13243a]/85 dark:to-[#0f1d30] text-body-sm w-full pb-8 pt-4 px-6 md:px-12 mt-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full">

          {/* Column 1: Brand info and Socials */}
          <div className="space-y-5">
            <a href="/" className="inline-block" aria-label="Recharge Rehabilitation Home">
              <Logo />
            </a>
            <p className="text-on-surface-variant/90 leading-relaxed max-w-xs font-semibold text-sm">
              Compassionate, data-driven therapies designed to help children and adults achieve real-world functional milestones.
            </p>

            {/* Social Media Links */}
            <div className="flex gap-3 pt-2">
              {/* Twitter / X */}
              <a
                href="javascript:void(0)"
                className="w-8 h-8 rounded-full bg-surface-container-high dark:bg-surface-container-low hover:bg-primary hover:text-on-primary hover:-translate-y-1 hover:scale-110 hover:rotate-6 hover:shadow-md hover:shadow-primary/20 text-primary transition-all duration-300 flex items-center justify-center border border-outline-variant/30"
                title="Twitter / X"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* Instagram */}
              <a
                href="https://www.instagram.com/recharge_rehab/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-surface-container-high dark:bg-surface-container-low hover:bg-primary hover:text-on-primary hover:-translate-y-1 hover:scale-110 hover:rotate-6 hover:shadow-md hover:shadow-primary/20 text-primary transition-all duration-300 flex items-center justify-center border border-outline-variant/30"
                title="Instagram"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/recharge-rehab"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-surface-container-high dark:bg-surface-container-low hover:bg-primary hover:text-on-primary hover:-translate-y-1 hover:scale-110 hover:rotate-6 hover:shadow-md hover:shadow-primary/20 text-primary transition-all duration-300 flex items-center justify-center border border-outline-variant/30"
                title="LinkedIn"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="space-y-4">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
              Quick Links
            </div>
            <ul className="space-y-2">
              <li>
                <a href="/" className="inline-flex items-center text-on-surface-variant hover:text-primary hover:translate-x-1.5 transition-all duration-300 font-bold text-[13px]">
                  Home
                </a>
              </li>
              <li>
                <a href="/about" className="inline-flex items-center text-on-surface-variant hover:text-primary hover:translate-x-1.5 transition-all duration-300 font-bold text-[13px]">
                  About Us
                </a>
              </li>
              <li>
                <a href="/services" className="inline-flex items-center text-on-surface-variant hover:text-primary hover:translate-x-1.5 transition-all duration-300 font-bold text-[13px]">
                  Services
                </a>
              </li>
              <li>
                <a href="/gallery" className="inline-flex items-center text-on-surface-variant hover:text-primary hover:translate-x-1.5 transition-all duration-300 font-bold text-[13px]">
                  Gallery
                </a>
              </li>
              <li>
                <a href="/blog" className="inline-flex items-center text-on-surface-variant hover:text-primary hover:translate-x-1.5 transition-all duration-300 font-bold text-[13px]">
                  Blog
                </a>
              </li>
              <li>
                <a href="/contact" className="inline-flex items-center text-on-surface-variant hover:text-primary hover:translate-x-1.5 transition-all duration-300 font-bold text-[13px]">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact details */}
          <div className="space-y-4">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
              Contact Info
            </div>
            <div className="space-y-4 text-on-surface-variant">
              <div className="flex items-start gap-3 group">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300">location_on</span>
                <span className="leading-relaxed font-bold text-[13px]">
                  F-74, F Block, Sector 39
                  <br />
                  Noida, Uttar Pradesh 201303
                </span>
              </div>
              <div className="flex items-center gap-3 group">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0 group-hover:scale-110 transition-transform duration-300">call</span>
                <a href="tel:09910525100" className="hover:text-primary transition-colors duration-200 font-bold text-[13px]">
                  099105 25100
                </a>
              </div>
              <div className="flex items-center gap-3 group">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0 group-hover:scale-110 transition-transform duration-300">mail</span>
                <a href="mailto:dummy@rechargerehabilation.com" className="hover:text-primary transition-colors duration-200 font-bold text-[13px] break-all">
                  dummy@rechargerehabilation.com
                </a>
              </div>
              <div className="flex items-start gap-3 group">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300">schedule</span>
                <span className="leading-relaxed font-bold text-[13px]">
                  Mon - Sat: 10:00 AM - 05:45 PM
                  <br />
                  Sunday: Closed (Off)
                </span>
              </div>
            </div>
          </div>

          {/* Column 4: Location Map */}
          <div className="space-y-4 w-full">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
              Our Location
            </div>
            <div className="rounded-2xl overflow-hidden h-40 border border-outline-variant bg-surface-container-high relative w-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-500 group">
              <iframe
                title="Footer Google Map Location"
                src="https://maps.google.com/maps?q=28.566385,77.3510364&t=&z=15&ie=UTF8&iwloc=&output=embed"
                className="w-full h-full border-0 grayscale-[50%] dark:grayscale-[70%] group-hover:grayscale-0 scale-100 group-hover:scale-105 transition-all duration-700 ease-out"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
              {/* View on Google Maps overlay button */}
              <a
                href="https://maps.google.com/maps?q=28.566385,77.3510364"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 bg-surface/90 backdrop-blur-xs text-primary font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg shadow-sm hover:bg-primary hover:text-on-primary transition-all duration-300 flex items-center gap-1 border border-outline-variant/30 active:scale-95"
              >
                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                View Map
              </a>
            </div>
          </div>

        </div>

        <div className="border-t border-outline-variant/20 mt-8 pt-4 text-center text-on-surface-variant text-body-sm w-full">
          <p>© {new Date().getFullYear()} Recharge Rehabilitation Clinic. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
};

export default Footer;
