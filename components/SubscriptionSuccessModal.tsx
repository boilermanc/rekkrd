import React, { useRef, useEffect, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SubscriptionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
}

const SubscriptionSuccessModal: React.FC<SubscriptionSuccessModalProps> = ({ isOpen, onClose, planName }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, onClose);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setShowContent(true), 400);
      return () => clearTimeout(t);
    }
    setShowContent(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const displayName = planName === 'curator' ? 'Curator' : planName === 'enthusiast' ? 'Enthusiast' : planName;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Subscription successful"
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 outline-none"
      style={{ backgroundColor: 'rgba(14, 13, 11, 0.97)', backdropFilter: 'blur(20px)' }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-none text-center"
        style={{
          backgroundColor: '#1a1916',
          border: '1px solid rgba(200, 135, 42, 0.15)',
          padding: '1.5rem 2rem',
        }}
      >

        {/* Spinning vinyl */}
        <div className="mx-auto mb-4 relative" style={{ width: 100, height: 100 }}>
          <div
            className="absolute inset-0 rounded-full animate-[spin_8s_linear_infinite]"
            style={{
              background: 'conic-gradient(from 0deg, #1a1814, #222019, #1a1814, #222019, #1a1814, #222019, #1a1814, #222019, #1a1814, #222019, #1a1814, #222019)',
              boxShadow: '0 0 0 2px #2e2b24, 0 0 40px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* Grooves */}
            <div className="absolute inset-2 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.015)' }} />
            <div className="absolute inset-4 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.015)' }} />
            <div className="absolute inset-6 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.015)' }} />
            <div className="absolute inset-8 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.015)' }} />
            {/* Label */}
            <div
              className="absolute inset-[30%] rounded-full flex items-center justify-center"
              style={{ background: 'radial-gradient(circle, #c8872a 0%, #9a5a1a 70%)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#0e0d0b' }} />
            </div>
          </div>
          {/* Amber glow */}
          <div
            className="absolute rounded-full"
            style={{ inset: -20, background: 'radial-gradient(circle, rgba(200,135,42,0.1) 0%, transparent 70%)' }}
          />
          {/* Success checkmark overlay */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#c8872a', boxShadow: '0 0 20px rgba(200,135,42,0.4)' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="#0e0d0b" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className={`transition-all duration-500 delay-100 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 700, color: '#f2ede6', marginBottom: 4 }}>
            Welcome to Rekkrd <em style={{ fontStyle: 'italic', color: '#c8872a' }}>{displayName}</em>
          </h2>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6b6459', marginBottom: '1rem' }}>
            Your subscription is now active
          </p>
        </div>

        {/* Personal note */}
        <div className={`transition-all duration-500 delay-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div
            className="text-left mb-4"
            style={{ backgroundColor: '#232118', border: '1px solid rgba(200,135,42,0.15)', padding: '1.25rem' }}
          >
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.88rem', color: '#e8e0d4', lineHeight: 1.8, fontStyle: 'italic' }}>
              "Hey, thanks for joining — seriously. I built Rekkrd because I needed it, and every person who signs up tells me I wasn't the only one. Enjoy the collection. Spin something good tonight."
            </p>
            <p className="text-white/40" style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '0.75rem' }}>
              — Clint
            </p>
          </div>
        </div>

        {/* Quick-start tips */}
        <div className={`transition-all duration-500 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="grid grid-cols-1 gap-0 mb-4 text-left" style={{ border: '1px solid rgba(200,135,42,0.15)', background: 'rgba(200,135,42,0.15)' }}>
            {[
              {
                num: '01',
                title: 'Scan a record',
                desc: 'Point your camera at any album cover to identify and add it instantly.',
              },
              {
                num: '02',
                title: 'Generate playlists',
                desc: 'Use AI to create mood-based playlists from your collection.',
              },
              {
                num: '03',
                title: 'Rate and organize',
                desc: 'Add condition grades, tags, notes, and mark favorites.',
              },
            ].map((tip) => (
              <div
                key={tip.num}
                style={{ backgroundColor: '#1a1916', padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(200,135,42,0.15)' }}
              >
                <div className="flex items-start gap-3">
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.25em', color: '#c8872a', opacity: 0.6, marginTop: 2 }}>
                    {tip.num}
                  </span>
                  <div>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 700, color: '#f2ede6', marginBottom: 2 }}>
                      {tip.title}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#6b6459', lineHeight: 1.6 }}>
                      {tip.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className={`transition-all duration-500 delay-[400ms] ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              backgroundColor: '#c8872a',
              color: '#0e0d0b',
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              padding: '0.85rem 2rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s, transform 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e8a84a'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#c8872a'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Start Collecting
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccessModal;
