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
    {/* Outer disc */}
    <circle cx="160" cy="160" r="156" fill="#2C4A6E" opacity="0.08" />

    {/* Grooves */}
    <circle cx="160" cy="160" r="140" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.15" />
    <circle cx="160" cy="160" r="120" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.18" />
    <circle cx="160" cy="160" r="100" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.22" />
    <circle cx="160" cy="160" r="80" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.25" />
    <circle cx="160" cy="160" r="60" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.28" />

    {/* Center label */}
    <circle cx="160" cy="160" r="40" fill="#2C4A6E" opacity="0.1" />

    {/* Dollar sign */}
    <text
      x="160"
      y="160"
      textAnchor="middle"
      dominantBaseline="central"
      fill="#2C4A6E"
      fontSize="44"
      fontWeight="700"
      fontFamily="system-ui, -apple-system, sans-serif"
      opacity="0.25"
    >
      $
    </text>

    {/* Spindle hole */}
    <circle cx="160" cy="160" r="6" fill="#2C4A6E" opacity="0.15" />
  </svg>
);

// ── How-it-works step data ───────────────────────────────────────────
const STEPS = [
  {
    number: 1,
    title: 'Create your account',
    description: 'Sign up free. Your progress saves automatically so you can scan 10 records today and come back for the rest tomorrow.',
    icon: Camera,
  },
  {
    number: 2,
    title: 'Scan at your pace',
    description: 'Photograph each record or search by title. We pull live Discogs pricing, pressing info, and condition grades — one record at a time.',
    icon: BarChart3,
  },
  {
    number: 3,
    title: 'Sell your way',
    description: 'List records individually with AI-written ad copy, or price your whole crate as a lot. One report, ready to post anywhere.',
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
              Scan at your own pace, get live Discogs pricing, and walk away with ready-to-post ad copy — individual listings or one price for the whole crate.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
              <Link
                to="/sellr/signup"
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

      {/* ── Lot Mode Callout ─────────────────────────────────── */}
      <section aria-labelledby="lot-heading" className="py-16 md:py-20 bg-sellr-surface rounded-2xl px-5 sm:px-8 md:px-12">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <span className="text-xs font-bold tracking-widest text-sellr-sage uppercase">
              Lot Mode
            </span>
            <h2 id="lot-heading" className="font-display text-3xl md:text-4xl mt-2 mb-4 text-sellr-charcoal">
              Selling the whole crate?
            </h2>
            <p className="text-sellr-charcoal/70 text-lg leading-relaxed max-w-md">
              Sellr can price your entire collection as a single lot. Get a suggested asking price based on live Discogs data, then generate one Facebook post for everything — perfect if you just want it gone.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Suggested lot price at 3 tiers — quick sale, fair, collector',
                'AI-written single post for the whole collection',
                'Public shareable link to your lot listing',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-sellr-charcoal/80">
                  <Check className="w-4 h-4 text-sellr-sage mt-0.5 flex-shrink-0" strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-shrink-0 bg-white rounded-xl p-6 shadow-sm max-w-xs w-full">
            <div className="text-xs font-bold tracking-widest text-sellr-sage uppercase mb-3">Sample Lot</div>
            <div className="font-display text-2xl text-sellr-charcoal mb-1">47 records</div>
            <div className="text-sellr-charcoal/60 text-sm mb-4">Est. collection value $840</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Quick Sale', price: '$462' },
                { label: 'Fair Price', price: '$546', highlight: true },
                { label: 'Collector', price: '$630' },
              ].map(opt => (
                <div key={opt.label} className={`rounded-lg p-2 text-center text-xs ${
                  opt.highlight
                    ? 'bg-sellr-amber/10 border border-sellr-amber'
                    : 'bg-sellr-bg'
                }`}>
                  <div className={`font-bold text-sm ${
                    opt.highlight ? 'text-sellr-amber' : 'text-sellr-charcoal'
                  }`}>
                    {opt.price}
                  </div>
                  <div className="text-sellr-charcoal/50 mt-0.5">{opt.label}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-sellr-charcoal/40 italic">
              Sample output — your records, your prices
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────── */}
      <section aria-labelledby="pricing-heading" className="py-16 md:py-20">
        <h2 id="pricing-heading" className="font-display text-3xl md:text-4xl text-center mb-4">
          Simple pricing
        </h2>
        <p className="text-center text-sellr-charcoal/60 mb-12 max-w-md mx-auto">
          Buy a slot pack once. Scan until they're gone — no time limits, no subscriptions.
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
                  {tier.record_limit} record slots · use anytime
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
                  to="/sellr/signup"
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
      <footer role="contentinfo" className="border-t border-sellr-charcoal/10 pt-12 pb-8 mt-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <a href="https://rekkrd.com" className="inline-flex items-center gap-2 mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="11" fill="#3a525d"/>
                <circle cx="12" cy="12" r="9.5" fill="none" stroke="#4f6d7a" strokeWidth="0.4" opacity="0.5"/>
                <circle cx="12" cy="12" r="8" fill="none" stroke="#4f6d7a" strokeWidth="0.3" opacity="0.4"/>
                <circle cx="12" cy="12" r="6.5" fill="none" stroke="#4f6d7a" strokeWidth="0.3" opacity="0.3"/>
                <circle cx="12" cy="12" r="5.2" fill="#2a3d46"/>
                <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#dd6e42">R</text>
              </svg>
              <span className="font-display text-lg text-sellr-charcoal">Rekk<span className="text-sellr-amber">r</span>d</span>
            </a>
            <p className="text-sm text-sellr-charcoal/60 leading-relaxed">
              The AI-powered vinyl collection manager for serious crate diggers and casual collectors alike.
            </p>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-medium text-sm text-sellr-charcoal mb-3">Products</h4>
            <ul className="space-y-2 text-sm text-sellr-charcoal/60">
              <li><Link to="/sellr" className="hover:text-sellr-blue transition-colors">Sellr</Link></li>
              <li><a href="https://rekkrd.com#features" className="hover:text-sellr-blue transition-colors">Features</a></li>
              <li><a href="https://rekkrd.com#pricing" className="hover:text-sellr-blue transition-colors">Pricing</a></li>
              <li><a href="https://rekkrd.com#playlist" className="hover:text-sellr-blue transition-colors">Playlists</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-medium text-sm text-sellr-charcoal mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-sellr-charcoal/60">
              <li><a href="https://rekkrd.com#faq" className="hover:text-sellr-blue transition-colors">FAQ</a></li>
              <li><a href="https://rekkrd.com/support" className="hover:text-sellr-blue transition-colors">Support</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-medium text-sm text-sellr-charcoal mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-sellr-charcoal/60">
              <li><a href="https://rekkrd.com/blog" className="hover:text-sellr-blue transition-colors">Blog</a></li>
              <li><a href="https://rekkrd.com/privacy" className="hover:text-sellr-blue transition-colors">Privacy</a></li>
              <li><a href="https://rekkrd.com/terms" className="hover:text-sellr-blue transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-sellr-charcoal/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-sellr-charcoal/40">
          <span>&copy; {new Date().getFullYear()} <a href="https://www.sweetwater.technology" target="_blank" rel="noopener noreferrer" className="hover:text-sellr-charcoal/60 transition-colors">Sweetwater Technology</a></span>
          <span>Made with &#9829; for vinyl lovers</span>
        </div>
      </footer>
    </SellrLayout>
  );
};

export default LandingPage;
