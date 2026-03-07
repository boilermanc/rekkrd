import React from 'react';
import { Link } from 'react-router-dom';
import SpenndHeader from '../components/spennd/SpenndHeader';
import SpenndTool from '../components/spennd/SpenndTool';

const SpenndLandingPage: React.FC = () => {
  const scrollToTool = () => {
    const toolSection = document.getElementById('tool');
    if (toolSection) {
      toolSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <SpenndHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="min-h-[70vh] flex items-center px-6 py-16 relative overflow-hidden">
          <svg
            className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none select-none"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 800 800"
          >
            <defs>
              <radialGradient id="wmRecordGrad" cx="40%" cy="38%" r="55%">
                <stop offset="0%" stopColor="#3a3028"/>
                <stop offset="100%" stopColor="#1a1410"/>
              </radialGradient>
              <radialGradient id="wmLabelGrad" cx="40%" cy="36%" r="60%">
                <stop offset="0%" stopColor="#6fa88a"/>
                <stop offset="100%" stopColor="#3d6b54"/>
              </radialGradient>
            </defs>
            <circle cx="400" cy="400" r="380" fill="url(#wmRecordGrad)" opacity="0.08"/>
            <circle cx="400" cy="400" r="370" fill="none" stroke="#2a2016" strokeWidth="3" opacity="0.07"/>
            <circle cx="400" cy="400" r="352" fill="none" stroke="#2a2016" strokeWidth="2.5" opacity="0.07"/>
            <circle cx="400" cy="400" r="334" fill="none" stroke="#2a2016" strokeWidth="2.5" opacity="0.06"/>
            <circle cx="400" cy="400" r="316" fill="none" stroke="#2a2016" strokeWidth="2.5" opacity="0.06"/>
            <circle cx="400" cy="400" r="298" fill="none" stroke="#2a2016" strokeWidth="2" opacity="0.06"/>
            <circle cx="400" cy="400" r="280" fill="none" stroke="#2a2016" strokeWidth="2" opacity="0.05"/>
            <circle cx="400" cy="400" r="262" fill="none" stroke="#2a2016" strokeWidth="2" opacity="0.05"/>
            <circle cx="400" cy="400" r="244" fill="none" stroke="#2a2016" strokeWidth="1.5" opacity="0.05"/>
            <circle cx="400" cy="400" r="226" fill="none" stroke="#2a2016" strokeWidth="1.5" opacity="0.05"/>
            <circle cx="400" cy="400" r="210" fill="none" stroke="#2a2016" strokeWidth="1.5" opacity="0.04"/>
            <circle cx="400" cy="400" r="130" fill="url(#wmLabelGrad)" opacity="0.1"/>
            <circle cx="400" cy="400" r="130" fill="none" stroke="#5a8a6e" strokeWidth="1" opacity="0.08"/>
            <circle cx="400" cy="400" r="108" fill="none" stroke="#5a8a6e" strokeWidth="0.8" opacity="0.06"/>
            <text x="400" y="452" textAnchor="middle" fontFamily="Playfair Display, Georgia, serif"
              fontSize="160" fontWeight="700" fill="#5a8a6e" opacity="0.07">$</text>
          </svg>
          <div className="max-w-4xl mx-auto relative">
            <div className="flex items-center justify-between mb-4">
              <div className="font-mono text-[11px] text-ink uppercase tracking-widest">
                SPENND
              </div>
              <div className="font-mono text-[9px] text-ink/60">
                Powered by Rekkrd
              </div>
            </div>

            <h1 className="font-display text-[52px] md:text-[52px] text-ink leading-tight max-w-xl">
              Know what your record is worth.
            </h1>

            <p className="font-serif italic text-[20px] text-ink/60 mt-2">
              In about 3 minutes. For free.
            </p>

            <p className="font-serif text-[16px] text-ink/60 mt-4 max-w-lg">
              No account. No Discogs login. No jargon. We'll walk you through everything.
            </p>

            <button
              onClick={scrollToTool}
              className="mt-8 bg-[#5a8a6e] text-white font-serif text-[16px] rounded-full py-4 px-8 hover:bg-[#3d6b54] transition-colors"
            >
              Check My Record →
            </button>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-paper-dark py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-[28px] text-ink text-center mb-10">
              Three steps. Plain English.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="font-display text-[48px] text-[#5a8a6e]">1</div>
                <h3 className="font-serif text-[16px] font-bold text-ink mt-2">
                  Find your record
                </h3>
                <p className="font-serif text-[14px] text-ink/60 mt-2">
                  Type the artist and title. We search Discogs' 8 million+ release database and show you matching pressings.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="font-display text-[48px] text-[#5a8a6e]">2</div>
                <h3 className="font-serif text-[16px] font-bold text-ink mt-2">
                  Identify your pressing
                </h3>
                <p className="font-serif text-[14px] text-ink/60 mt-2">
                  We show you exactly where to look on the record and what to read. The pressing determines real value more than anything else.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="font-display text-[48px] text-[#5a8a6e]">3</div>
                <h3 className="font-serif text-[16px] font-bold text-ink mt-2">
                  Grade the condition
                </h3>
                <p className="font-serif text-[14px] text-ink/60 mt-2">
                  A few quick questions with clear instructions. Hold it under a light — we guide you step by step.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Strip */}
        <section className="bg-paper py-10 text-center px-6">
          <p className="font-serif text-[15px] text-ink mb-3">
            Prices come from two independent sources:
          </p>

          <div className="flex justify-center flex-wrap gap-3">
            <span className="border border-[#5a8a6e] text-[#5a8a6e] font-mono text-[11px] rounded-full px-3 py-1">
              Discogs Marketplace
            </span>
            <span className="border border-[#5a8a6e] text-[#5a8a6e] font-mono text-[11px] rounded-full px-3 py-1">
              eBay Completed Sales
            </span>
          </div>

          <p className="font-serif italic text-[14px] text-ink/60 mt-3">
            Real transactions — not asking prices, not estimates.
          </p>
        </section>

        {/* Tool Section */}
        <section id="tool" className="bg-paper py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-[28px] text-ink mb-8 text-center">
              Let's check your record
            </h2>
            <SpenndTool />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-paper-dark border-t border-paper-dark py-8 px-6 text-center">
        <p className="font-mono text-[10px] text-ink/60 mb-2">
          Spennd is a free tool by Rekkrd
        </p>
        <div className="flex justify-center gap-3 font-mono text-[10px] text-ink/60">
          <Link to="/" className="hover:text-ink transition-colors">
            Rekkrd
          </Link>
          <span>·</span>
          <Link to="/sellr" className="hover:text-ink transition-colors">
            Sellr
          </Link>
          <span>·</span>
          <a href="mailto:hello@rekkrd.com" className="hover:text-ink transition-colors">
            Contact
          </a>
        </div>
        <div className="mt-4 flex items-center justify-center gap-1.5">
          <span className="font-serif text-[12px] text-ink/60">Part of the</span>
          <Link to="/" className="font-display text-[12px] text-ink/60 hover:text-ink transition-colors">
            Rekkrd
          </Link>
          <span className="font-serif text-[12px] text-ink/60">family</span>
        </div>
      </footer>
    </div>
  );
};

export default SpenndLandingPage;
