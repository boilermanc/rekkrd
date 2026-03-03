import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import SEO from './SEO';

interface FAQItem {
  category: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'How does AI album scanning work?',
    answer:
      "Point your phone camera at any vinyl record cover and Rekkrd's AI identifies the album, artist, and pressing details in seconds. It pulls metadata from MusicBrainz and iTunes to fill in your collection automatically.",
  },
  {
    category: 'Collection',
    question: 'Is there a limit to how many records I can add?',
    answer:
      'The free Collector tier supports up to 100 albums and 10 AI scans per month. Upgrade to Curator or Enthusiast for unlimited storage and scans.',
  },
  {
    category: 'Stakkd',
    question: 'What is Stakkd?',
    answer:
      'Stakkd is our gear catalog feature. Photograph your turntable, amp, or speakers and Rekkrd identifies the equipment, pulls specs, and helps you document your entire audio setup.',
  },
  {
    category: 'Account',
    question: 'Can I export my collection?',
    answer:
      'Yes. All tiers can export their collection as CSV. Curator and Enthusiast tiers also get JSON export with full metadata.',
  },
  {
    category: 'Privacy',
    question: 'What happens to my album photos?',
    answer:
      "Photos are sent to Google Gemini for identification only. We don't store your photos after processing, and they're never used to train AI models.",
  },
];

const SUPPORT_EMAIL = 'support@rekkrd.com';

const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-display text-[var(--slate)] mb-2">
          Frequently Asked Questions
        </h2>
        <p className="text-th-text3 font-medium">
          Quick answers to common questions from collectors.
        </p>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          const panelId = `faq-panel-${idx}`;
          const buttonId = `faq-button-${idx}`;

          return (
            <div
              key={idx}
              className={`group glass-morphism rounded-2xl border transition-all duration-300 ${
                isOpen
                  ? 'border-[var(--peach)]/30 shadow-lg shadow-[var(--peach)]/10'
                  : 'border-th-surface/[0.10] hover:border-[var(--peach)]/20 shadow-sm'
              }`}
            >
              <button
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full flex items-center justify-between px-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--peach)] focus-visible:ring-offset-2 focus-visible:ring-offset-th-bg rounded-2xl"
              >
                <div className="space-y-1">
                  <span className="font-label text-[10px] font-bold uppercase tracking-widest text-[var(--peach)]">
                    {faq.category}
                  </span>
                  <p
                    className={`font-bold transition-colors ${
                      isOpen ? 'text-[var(--peach)]' : 'text-th-text'
                    }`}
                  >
                    {faq.question}
                  </p>
                </div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ml-4 ${
                    isOpen
                      ? 'bg-[var(--peach)] text-white rotate-180'
                      : 'bg-th-surface/[0.06] text-th-text3 group-hover:bg-[var(--peach)]/10'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={`overflow-hidden transition-all duration-300 ${
                  isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-6 text-th-text2 leading-relaxed border-t border-[var(--peach)]/10 pt-4 mt-2">
                  {faq.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SupportForm: React.FC = () => {
  const { showToast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Technical Support',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Failed to send message');
      }
      setSubmitted(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send message. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-[var(--peach)]/5 border border-[var(--peach)]/20 p-12 rounded-2xl text-center space-y-4">
        <div className="w-16 h-16 bg-[var(--peach)] text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[var(--peach)]/30">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold font-display text-th-text">Message Received!</h3>
        <p className="text-th-text2 max-w-md mx-auto">
          Thanks for reaching out, <span className="font-bold text-th-text">{formData.name}</span>.
          We'll get back to you at{' '}
          <span className="font-bold text-th-text">{formData.email}</span> within 24 hours.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setFormData({ name: '', email: '', subject: 'Technical Support', message: '' });
          }}
          className="text-[var(--peach)] font-bold hover:underline mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--peach)] focus-visible:ring-offset-2 rounded-md px-2 py-1"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="glass-morphism p-8 md:p-10 rounded-2xl border border-th-surface/[0.10]">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-display text-[var(--slate)] mb-2">
          Send us a Message
        </h2>
        <p className="text-th-text3 font-medium">
          Have a specific question? Fill out the form and we'll help you out.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label htmlFor="support-name" className="font-label text-xs font-bold uppercase tracking-widest text-th-text3">
              Full Name
            </label>
            <input
              id="support-name"
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-5 py-3.5 text-th-text focus:outline-none focus:ring-2 focus:ring-[var(--peach)]/40 focus:border-[var(--peach)] transition-all placeholder:text-th-text3/50"
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="support-email" className="font-label text-xs font-bold uppercase tracking-widest text-th-text3">
              Email Address
            </label>
            <input
              id="support-email"
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-5 py-3.5 text-th-text focus:outline-none focus:ring-2 focus:ring-[var(--peach)]/40 focus:border-[var(--peach)] transition-all placeholder:text-th-text3/50"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="support-subject" className="font-label text-xs font-bold uppercase tracking-widest text-th-text3">
            Subject
          </label>
          <select
            id="support-subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-5 py-3.5 text-th-text focus:outline-none focus:ring-2 focus:ring-[var(--peach)]/40 focus:border-[var(--peach)] transition-all appearance-none cursor-pointer"
          >
            <option>Technical Support</option>
            <option>Billing Question</option>
            <option>Account Issue</option>
            <option>Feature Request</option>
            <option>Bug Report</option>
            <option>Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="support-message" className="font-label text-xs font-bold uppercase tracking-widest text-th-text3">
            Message
          </label>
          <textarea
            id="support-message"
            required
            rows={5}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-5 py-3.5 text-th-text focus:outline-none focus:ring-2 focus:ring-[var(--peach)]/40 focus:border-[var(--peach)] transition-all resize-none placeholder:text-th-text3/50"
            placeholder="Tell us everything..."
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="w-full bg-[var(--peach)] text-white font-bold py-4 rounded-xl shadow-lg shadow-[var(--peach)]/30 hover:bg-[var(--peach-dark)] hover:-translate-y-0.5 transition-all active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--peach)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {sending ? 'Sending...' : 'Send Message'}
        </button>

        <p className="text-center text-sm text-th-text3">
          Prefer direct email? Reach us at{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-[var(--peach)] font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--peach)] rounded-sm"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </form>
    </div>
  );
};

const SupportPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-th-bg">
      <SEO
        title="Support"
        description="Get help with Rekkrd. Browse FAQs or contact our support team."
      />
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-th-bg/90 backdrop-blur-xl border-b border-th-surface/[0.10] h-[72px] flex items-center">
        <div className="max-w-6xl mx-auto w-full px-4 flex items-center">
          <Link to="/" className="flex items-center gap-2.5 font-display text-xl font-bold text-th-text hover:opacity-80 transition-opacity">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="32" height="32">
              <circle cx="12" cy="12" r="11" fill="#f0a882"/>
              <circle cx="12" cy="12" r="9.5" fill="none" stroke="#d48a6a" strokeWidth="0.4" opacity="0.5"/>
              <circle cx="12" cy="12" r="8" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.4"/>
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.3"/>
              <circle cx="12" cy="12" r="5.2" fill="#c45a30"/>
              <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#f0a882">R</text>
            </svg>
            <span>Rekk<span className="text-[var(--peach-dark)]">r</span>d</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto space-y-16 pb-20 px-4">
      {/* Hero */}
      <div className="text-center space-y-6 pt-8">
        <span className="inline-block font-label px-5 py-2 bg-[var(--peach)]/10 text-[var(--peach)] rounded-full text-xs font-bold uppercase tracking-widest">
          Support Center
        </span>
        <h1 className="text-5xl md:text-7xl font-bold text-th-text tracking-tighter leading-tight">
          How can we help you{' '}
          <br className="hidden md:block" />
          <span className="text-[var(--peach)] italic font-display">spin the crate?</span>
        </h1>
        <p className="text-lg text-th-text2 max-w-2xl mx-auto leading-relaxed">
          Whether you're troubleshooting a scan, managing your collection, or setting up Stakkd,
          our team is here to help.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <a
            href="#faqs"
            className="glass-morphism text-th-text border border-th-surface/[0.10] px-8 py-3.5 rounded-xl font-bold shadow-sm hover:shadow-md hover:border-[var(--peach)]/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--peach)]"
          >
            Browse FAQs
          </a>
          <a
            href="#contact"
            className="bg-[var(--peach)] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-[var(--peach)]/30 hover:bg-[var(--peach-dark)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--peach)]"
          >
            Contact Us
          </a>
        </div>
      </div>

      {/* Main 2-column grid */}
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Left — FAQs */}
        <div id="faqs" className="scroll-mt-32">
          <FaqSection />

          <div className="mt-12 p-8 bg-[var(--beige)]/10 border border-dashed border-[var(--beige)]/40 rounded-2xl text-th-text3 text-center">
            <p className="text-sm italic font-medium font-display">
              "Music is the universal language of mankind." — Henry Wadsworth Longfellow
            </p>
          </div>
        </div>

        {/* Right — Contact Form */}
        <div id="contact" className="scroll-mt-32">
          <SupportForm />

          {/* Info cards */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="glass-morphism p-5 rounded-2xl border border-th-surface/[0.10]">
              <div className="w-10 h-10 bg-[var(--peach)]/10 text-[var(--peach)] rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-bold text-th-text mb-1 text-sm">Email Support</h4>
              <p className="text-xs text-th-text3 font-label">{SUPPORT_EMAIL}</p>
            </div>
            <div className="glass-morphism p-5 rounded-2xl border border-th-surface/[0.10]">
              <div className="w-10 h-10 bg-[var(--beige)]/10 text-[var(--beige)] rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-th-text mb-1 text-sm">Response Time</h4>
              <p className="text-xs text-th-text3 font-label">Usually under 24 hours</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default SupportPage;
