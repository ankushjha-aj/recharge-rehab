import React from 'react';

const WhatsAppFAB: React.FC = () => {
  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col space-y-4">
      {/* Call FAB */}
      <a
        href="tel:09910525100"
        className="group flex items-center justify-center bg-primary text-on-primary rounded-full w-14 h-14 hover:scale-110 active:scale-95 transition-all duration-300 shadow-xl border border-white/20 relative animate-pulse-ring"
        aria-label="Call Us"
        style={{ animationDuration: '3s' }}
      >
        <span className="material-symbols-outlined text-[24px]">call</span>
        {/* Tooltip hint */}
        <span className="absolute right-16 bg-surface border border-outline-variant text-on-surface text-xs font-bold py-1.5 px-3 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
          Call: 099105 25100
        </span>
      </a>

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/919910525100"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-center bg-[#25D366] text-white rounded-full w-14 h-14 hover:scale-110 active:scale-95 transition-all duration-300 shadow-xl border border-white/20 relative"
        aria-label="Chat on WhatsApp"
      >
        {/* SVG WhatsApp logo */}
        <svg
          className="w-7 h-7 fill-current"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.292 1.503 5.34 1.504 5.395 0 9.782-4.387 9.785-9.782.002-2.614-1.011-5.07-2.857-6.918C17.067 2.11 14.61 1.096 12.002 1.096c-5.402 0-9.79 4.386-9.793 9.782-.001 2.083.542 4.114 1.573 5.9l-.993 3.626 3.73-.978c1.78.973 3.328 1.488 5.07 1.488H12.008v-.002zM9.75 6.75c-.2-.45-.41-.46-.6-.46-.15-.01-.32-.01-.5-.01-.17 0-.46.06-.7.33-.24.26-.92.9-.92 2.2 0 1.3.95 2.56 1.08 2.74.13.18 1.87 2.85 4.53 4 .63.27 1.12.44 1.51.56.67.21 1.28.18 1.77.11.54-.08 1.67-.68 1.9-1.34.23-.66.23-1.23.16-1.34-.07-.11-.26-.18-.55-.33-.29-.15-1.67-.82-1.93-.91-.26-.1-.45-.15-.64.14-.19.29-.74.91-.91 1.1-.17.19-.34.21-.63.06-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.74-1.72-1.61-2-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.5.15-.17.2-.29.3-.49.1-.2.05-.38-.02-.53-.07-.15-.6-1.45-.82-1.98z" />
        </svg>
        {/* Tooltip hint */}
        <span className="absolute right-16 bg-surface border border-outline-variant text-on-surface text-xs font-bold py-1.5 px-3 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
          WhatsApp Us
        </span>
      </a>
    </div>
  );
};

export default WhatsAppFAB;
