import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, BarChart3, FileText, Check } from 'lucide-react';
import SellrLayout from '../components/SellrLayout';
import { useSellrMeta } from '../hooks/useSellrMeta';
import { SELLR_TIERS } from '../types';

// ── Decorative vinyl record SVG ──────────────────────────────────────
const VinylRecord: React.FC = () => (
  <svg
    viewBox="0 0 320 320"
    className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 max-w-full"
    aria-hidden="true"
    role="img"
  >
    <circle cx="160" cy="160" r="156" fill="#2C4A6E" opacity="0.08" />
    <circle cx="160" cy="160" r="140" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.15" />
    <circle cx="160" cy="160" r="120" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.18" />
    <circle cx="160" cy="160" r="100" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.22" />
    <circle cx="160" cy="160" r="80" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.25" />
    <circle cx="160" cy="160" r="60" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.28" />
    <circle cx="160" cy="160" r="40" fill="#2C4A6E" opacity="0.06" />
    <circle cx="160" cy="160" r="18" fill="#2C4A6E" opacity="0.12" />
    <circle cx="160" cy="160" r="6" fill="#2C4A6E" opacity="0.2" />
  </svg>
);

// ── How-it-works step data ───────────────────────────────────────────
const STEPS = [
  {
    number: 1,
    title: 'Scan',
    description: 'Photograph each record or search by title. We identify the pressing, label, and catalog number automatically.',
    icon: Camera,
  },
  {
    number: 2,
    title: 'Appraise',
    description: 'We pull live Discogs market pricing for every record. You get low, median, and high values by condition.',
    icon: BarChart3,
  },
  {
    number: 3,
    title: 'Sell',
    description: 'Get your full report and AI-written ad copy. Post to Marketplace, Craigslist, or wherever you sell.',
    icon: FileText,
  },
] as const;

// ── Features included in every tier ──────────────────────────────────
const TIER_FEATURES = [
  'Discogs pricing per record',
  'AI-written ad copy',
  'Shareable report link',
  'PDF export',
];

// ── Landing Page ─────────────────────────────────────────────────────
const LandingPage: React.FC = () => {
  useSellrMeta({
    title: 'Know what your records are worth',
    description: 'Scan your vinyl collection, get Discogs market pricing, and walk away with ready-to-post ad copy.',
  });

  const handleScrollToHowItWorks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <SellrLayout>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section aria-labelledby="hero-heading" className="pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
          <div className="flex-1 text-center md:text-left">
            <h1
              id="hero-heading"
              className="font-display text-[clamp(1.75rem,6vw,2.25rem)] md:text-5xl lg:text-6xl leading-tight text-sellr-charcoal"
            >
              Know what your records are worth.
            </h1>
            <p className="mt-5 text-lg md:text-xl text-sellr-charcoal/70 max-w-lg mx-auto md:mx-0">
              Scan your collection, get market pricing, and walk away with ready-to-post ad copy.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
              <Link
                to="/sellr/scan"
                className="px-7 py-3 min-h-[44px] bg-sellr-amber text-white font-medium rounded hover:bg-sellr-amber-light transition-colors text-base"
              >
                Start Your Appraisal
              </Link>
              <a
                href="#how-it-works"
                onClick={handleScrollToHowItWorks}
                className="text-sellr-blue font-medium hover:text-sellr-blue-light transition-colors text-base min-h-[44px] inline-flex items-center"
              >
                See how it works
              </a>
            </div>
          </div>
          <div className="flex-shrink-0">
            <VinylRecord />
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────── */}
      <section id="how-it-works" aria-labelledby="how-heading" className="py-16 md:py-20">
        <h2 id="how-heading" className="font-display text-3xl md:text-4xl text-center mb-12">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <article
              key={step.number}
              className="bg-sellr-surface rounded-lg p-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-sellr-blue text-white text-sm font-bold">
                  {step.number}
                </span>
                <step.icon className="w-5 h-5 text-sellr-blue" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-xl mb-2">{step.title}</h3>
              <p className="text-sellr-charcoal/70 leading-relaxed">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────── */}
      <section aria-labelledby="pricing-heading" className="py-16 md:py-20">
        <h2 id="pricing-heading" className="font-display text-3xl md:text-4xl text-center mb-4">
          Simple pricing
        </h2>
        <p className="text-center text-sellr-charcoal/60 mb-12 max-w-md mx-auto">
          Pay once, get your report. No subscriptions, no accounts required.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SELLR_TIERS.map((tier) => {
            const isPopular = tier.id === 'standard';
            return (
              <article
                key={tier.id}
                className={`relative bg-sellr-surface rounded-lg p-8 flex flex-col ${
                  isPopular ? 'ring-2 ring-sellr-amber' : ''
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sellr-amber text-white text-xs font-bold tracking-wide uppercase px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="font-display text-2xl">{tier.label}</h3>
                <p className="mt-1 text-sellr-charcoal/60 text-sm">
                  Up to {tier.record_limit} records
                </p>
                <p className="mt-4 font-display text-4xl text-sellr-blue">
                  {tier.price_display}
                </p>
                <ul className="mt-6 space-y-3 flex-1" role="list">
                  {TIER_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-sellr-charcoal/80">
                      <Check className="w-4 h-4 text-sellr-sage mt-0.5 flex-shrink-0" strokeWidth={2} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/sellr/scan?tier=${tier.id}`}
                  className={`mt-8 block text-center px-5 py-3 min-h-[44px] rounded font-medium transition-colors ${
                    isPopular
                      ? 'bg-sellr-amber text-white hover:bg-sellr-amber-light'
                      : 'bg-sellr-blue text-white hover:bg-sellr-blue-light'
                  }`}
                >
                  Get Started
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer role="contentinfo" className="border-t border-sellr-charcoal/10 py-8 mt-8 text-center text-sm text-sellr-charcoal/50">
        Sellr is a product of{' '}
        <a
          href="https://rekkrd.com"
          className="text-sellr-blue hover:text-sellr-blue-light transition-colors"
        >
          Rekkrd
        </a>
      </footer>
    </SellrLayout>
  );
};

export default LandingPage;
