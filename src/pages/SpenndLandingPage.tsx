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
        <section className="min-h-[70vh] flex items-center px-6 py-16">
          <div className="max-w-4xl mx-auto">
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
              className="mt-8 bg-burnt-peach text-white font-serif text-[16px] rounded-full py-4 px-8 hover:opacity-90 transition-opacity"
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
                <div className="font-display text-[48px] text-burnt-peach">1</div>
                <h3 className="font-serif text-[16px] font-bold text-ink mt-2">
                  Find your record
                </h3>
                <p className="font-serif text-[14px] text-ink/60 mt-2">
                  Type the artist and title. We search Discogs' 8 million+ release database and show you matching pressings.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="font-display text-[48px] text-burnt-peach">2</div>
                <h3 className="font-serif text-[16px] font-bold text-ink mt-2">
                  Identify your pressing
                </h3>
                <p className="font-serif text-[14px] text-ink/60 mt-2">
                  We show you exactly where to look on the record and what to read. The pressing determines real value more than anything else.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="font-display text-[48px] text-burnt-peach">3</div>
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
            <span className="border border-burnt-peach text-burnt-peach font-mono text-[11px] rounded-full px-3 py-1">
              Discogs Marketplace
            </span>
            <span className="border border-burnt-peach text-burnt-peach font-mono text-[11px] rounded-full px-3 py-1">
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
      </footer>
    </div>
  );
};

export default SpenndLandingPage;
