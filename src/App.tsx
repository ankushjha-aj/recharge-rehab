import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import ContactForm from './components/ContactForm';
import Footer from './components/Footer';
import WhatsAppFAB from './components/WhatsAppFAB';
import AboutPage from './components/AboutPage';
import HomePage from './components/HomePage';
import ContactPage from './components/ContactPage';
import GalleryPage from './components/GalleryPage';
import ServicesPage from './components/ServicesPage';

// Path routes start with "/" so in-page anchors (e.g. "#approach") are ignored.
const getRoute = () => {
  const path = window.location.pathname;
  if (path.startsWith('/about')) return '/about';
  if (path.startsWith('/contact')) return '/contact';
  if (path.startsWith('/gallery')) return '/gallery';
  if (path.startsWith('/services')) return '/services';
  return '/';
};

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [route, setRoute] = useState(getRoute);
  const [isWIPOpen, setIsWIPOpen] = useState(false);
  const [wipPageName, setWipPageName] = useState('');

  useEffect(() => {
    const onPopState = () => {
      setRoute(getRoute());
    };
    window.addEventListener('popstate', onPopState);

    const handleGlobalClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      // Intercept relative URL paths starting with '/' but not '//'
      if (href && href.startsWith('/') && !href.startsWith('//')) {
        e.preventDefault();
        window.history.pushState({}, '', href);
        setRoute(getRoute());
      }
    };
    window.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);

  const openModal = () => setIsModalOpen(true);
  const triggerWIP = (pageName: string) => {
    setWipPageName(pageName);
    setIsWIPOpen(true);
  };


  return (
    <div className="bg-background text-on-surface flex flex-col min-h-screen">
      {/* Navigation — rendered outside any transformed wrapper so `sticky` works
          (a transformed ancestor becomes the sticky containing block and breaks it). */}
      <Navbar route={route} onBookConsultation={openModal} onWIP={triggerWIP} />

      {route === '/about' ? (
        <AboutPage onBookConsultation={openModal} />
      ) : route === '/contact' ? (
        <ContactPage onBookConsultation={openModal} />
      ) : route === '/gallery' ? (
        <GalleryPage onBookConsultation={openModal} />
      ) : route === '/services' ? (
        <ServicesPage onBookConsultation={openModal} />
      ) : (
        <HomePage onBookConsultation={openModal} />
      )}

      {/* Footer */}
      <Footer />

      {/* WhatsApp FAB */}
      <WhatsAppFAB />

      {/* Modal Dialog for Book Consultation */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xl animate-drop-down-spring" onClick={(e) => e.stopPropagation()}>
            <ContactForm isModal={true} onClose={() => setIsModalOpen(false)} />
          </div>
          {/* Clicking backdrop closes modal */}
          <div className="absolute inset-0 -z-10" onClick={() => setIsModalOpen(false)} />
        </div>
      )}

      {/* Work in Progress Popup Overlay */}
      {isWIPOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-surface border border-outline-variant rounded-[2rem] p-8 shadow-xl animate-drop-down-spring text-center relative" onClick={(e) => e.stopPropagation()}>
            {/* Close icon button at top right */}
            <button
              onClick={() => setIsWIPOpen(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors p-1"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            
            <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-primary mx-auto mb-6">
              <span className="material-symbols-outlined text-[32px]">construction</span>
            </div>
            
            <h3 className="text-headline-md font-extrabold text-on-surface mb-3">Under Construction</h3>
            <p className="text-body-md text-on-surface-variant mb-8 leading-relaxed">
              The <strong className="text-primary">{wipPageName}</strong> page is currently under development. We are building a specialized experience for you—stay tuned!
            </p>
            
            <button
              onClick={() => setIsWIPOpen(false)}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold text-sm hover:brightness-110 active:scale-95 transition-all duration-200 shadow-md w-full"
            >
              Got It!
            </button>
          </div>
          {/* Clicking backdrop closes modal */}
          <div className="absolute inset-0 -z-10" onClick={() => setIsWIPOpen(false)} />
        </div>
      )}
    </div>
  );
}

export default App;
