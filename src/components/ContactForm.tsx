import React, { useState } from 'react';

interface ContactFormProps {
  isModal?: boolean;
  onClose?: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ isModal = false, onClose }) => {
  const [formData, setFormData] = useState({
    parentName: '',
    childAge: '',
    phone: '',
    service: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const serviceLabels: { [key: string]: string } = {
      speech: 'Speech Therapy',
      occupational: 'Occupational Therapy',
      physical: 'Physical Therapy',
      behavioral: 'Behavioral Therapy',
      other: 'Other Services',
    };
    
    const serviceName = serviceLabels[formData.service] || formData.service || 'General Inquiry';

    const messageText = `Hello Recharge Rehabilitation,\n\nI would like to book an appointment. Here are my details:\n\n👤 *Parent Name:* ${formData.parentName}\n👶 *Child's Age:* ${formData.childAge} years\n📞 *Phone Number:* ${formData.phone}\n🏥 *Service Interested:* ${serviceName}\n💬 *Message:* ${formData.message || 'No additional message'}`;

    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/919910525100?text=${encodedText}`;

    // Simulate form submission and redirect to WhatsApp
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);

      // Open WhatsApp link in a new tab/window
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      setTimeout(() => setIsSubmitted(false), 4000);
      setFormData({
        parentName: '',
        childAge: '',
        phone: '',
        service: '',
        message: '',
      });
      if (onClose) {
        onClose();
      }
    }, 1200);
  };

  return (
    <div className={isModal ? 'w-full' : 'lg:col-span-7'}>
      <div className={`bg-surface-container-lowest p-6 md:p-8 lg:p-10 border border-outline-variant rounded-[2rem] relative transition-shadow duration-300 ${
        isModal ? 'shadow-2xl' : 'shadow-sm hover:shadow-md'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-headline-lg text-primary">Book a Free Consultation</h2>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-primary transition-colors duration-200 p-1.5 rounded-full hover:bg-surface-variant/50 flex items-center justify-center"
              type="button"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          )}
        </div>

        {isSubmitted && (
          <div className="mb-6 bg-tertiary-fixed text-on-tertiary-fixed p-4 rounded-xl flex items-center space-x-3 animate-fade-in-up">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <p className="text-body-md font-semibold">
              Thank you! We'll get back to you within 24 hours.
            </p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Row 1: Name + Age */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                className="block text-label-md text-primary mb-2"
                htmlFor="parentName"
              >
                Parent/Guardian Name
              </label>
              <input
                className="w-full bg-transparent border border-outline-variant rounded-full py-3 px-6 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
                id="parentName"
                name="parentName"
                placeholder="Amit Sharma"
                type="text"
                value={formData.parentName}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label
                className="block text-label-md text-primary mb-2"
                htmlFor="childAge"
              >
                Child's Age
              </label>
              <input
                className="w-full bg-transparent border border-outline-variant rounded-full py-3 px-6 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
                id="childAge"
                name="childAge"
                placeholder="e.g., 6"
                type="number"
                min="0"
                max="18"
                value={formData.childAge}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Row 2: Phone + Service */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                className="block text-label-md text-primary mb-2"
                htmlFor="phone"
              >
                Phone Number <span className="text-on-surface-variant text-xs font-normal">(10-digit mobile)</span>
              </label>
              <input
                className="w-full bg-transparent border border-outline-variant rounded-full py-3 px-6 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
                id="phone"
                name="phone"
                placeholder="e.g. 99105 25100"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label
                className="block text-label-md text-primary mb-2"
                htmlFor="service"
              >
                Service Interested In
              </label>
              <select
                className="w-full bg-transparent border border-outline-variant rounded-full py-3 px-6 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200 appearance-none cursor-pointer"
                id="service"
                name="service"
                value={formData.service}
                onChange={handleChange}
                required
              >
                <option value="">Select a service...</option>
                <option value="speech">Speech Therapy</option>
                <option value="occupational">Occupational Therapy</option>
                <option value="physical">Physical Therapy</option>
                <option value="behavioral">Behavioral Therapy</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Message */}
          <div>
             <label
              className="block text-label-md text-primary mb-2"
              htmlFor="message"
            >
              How can we help?
            </label>
            <textarea
              className="w-full bg-transparent border border-outline-variant rounded-[1.5rem] p-4 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200 resize-none"
              id="message"
              name="message"
              placeholder="Briefly describe your child's needs..."
              rows={4}
              value={formData.message}
              onChange={handleChange}
            />
          </div>

          {/* Submit Button */}
          <button
            className={`w-full bg-primary text-on-primary text-xs font-semibold py-2.5 rounded-full hover:brightness-95 transition-all duration-200 flex justify-center items-center space-x-2 active:scale-[0.98] shadow-md hover:shadow-lg ${
              isSubmitting ? 'opacity-80 cursor-wait' : ''
            }`}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-on-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>Request Appointment</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Privacy Note */}
        <div className="mt-6 flex items-center justify-center space-x-2 text-on-surface-variant border-t border-surface-variant pt-6">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          <p className="text-body-md text-sm">
            Your information is 100% confidential. We respond within 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;
