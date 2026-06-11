import React from 'react';
import HeroBanner from './HeroBanner';
import ContactInfo from './ContactInfo';
import ContactForm from './ContactForm';
import StatsStrip from './StatsStrip';

interface ContactPageProps {
  onBookConsultation?: () => void;
}

const ContactPage: React.FC<ContactPageProps> = ({ onBookConsultation }) => {
  React.useEffect(() => {
    document.title = "Contact Us - Recharge Rehabilitation";
  }, []);

  return (
    <div className="flex-grow">
      {/* Hero Section in contact mode */}
      <HeroBanner mode="contact" onBookConsultation={onBookConsultation} />

      {/* Main Content: Two-column Section */}
      <main className="py-10 md:py-12 px-6 md:px-12 flex-grow">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full">
            <ContactInfo />
            <ContactForm isModal={false} />
          </div>
        </div>
      </main>

      {/* Stats Trust Strip */}
      <div>
        <StatsStrip />
      </div>
    </div>
  );
};

export default ContactPage;
