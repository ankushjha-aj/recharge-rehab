import React from 'react';

interface ContactInfoItemProps {
  icon: string;
  title: string;
  children: React.ReactNode;
}

const ContactInfoItem: React.FC<ContactInfoItemProps> = ({ icon, title, children }) => {
  return (
    <div className="flex items-start space-x-4 group">
      <div className="bg-primary-fixed w-12 h-12 flex items-center justify-center rounded-full shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors duration-300">
        <span className="material-symbols-outlined text-primary group-hover:text-on-primary transition-colors duration-300">
          {icon}
        </span>
      </div>
      <div>
        <h3 className="text-headline-sm text-on-surface mb-1">{title}</h3>
        <div className="text-body-md text-on-surface-variant">{children}</div>
      </div>
    </div>
  );
};

const ContactInfo: React.FC = () => {
  return (
    <div className="lg:col-span-5">
      <h2 className="text-headline-lg text-on-surface mb-6">Contact Details</h2>

      <div className="space-y-6 mb-10">
        <ContactInfoItem icon="call" title="Phone">
          <p>
            <a href="tel:09910525100" className="hover:text-primary transition-colors font-semibold">099105 25100</a>
          </p>
        </ContactInfoItem>

        <ContactInfoItem icon="mail" title="Email">
          <p>
            <a href="mailto:dummy@rechargerehabilation.com" className="hover:text-primary transition-colors font-semibold">dummy@rechargerehabilation.com</a>
          </p>
        </ContactInfoItem>

        <ContactInfoItem icon="location_on" title="Address">
          <p className="font-medium">
            F-74, F Block, Sector 39
            <br />
            Noida, Uttar Pradesh 201303
          </p>
        </ContactInfoItem>

        <ContactInfoItem icon="schedule" title="Working Hours">
          <p className="font-medium">
            Mon - Sat: 10:00 AM - 05:45 PM
            <br />
            Sunday: Closed (Off)
          </p>
        </ContactInfoItem>
      </div>

      {/* Embedded Google Map */}
      <div className="rounded-xl overflow-hidden h-64 border border-outline-variant bg-surface-container-high relative">
        <iframe
          title="Recharge Rehab Clinic Location"
          src="https://maps.google.com/maps?q=28.566385,77.3510364&t=&z=15&ie=UTF8&iwloc=&output=embed"
          className="w-full h-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </div>
  );
};

export default ContactInfo;
