import React, { useState, useEffect, useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useCheckout } from '../hooks/useCheckout';

interface TierPrice {
  priceId: string;
  amount: number;
  currency: string;
  interval: string;
}

interface PricingData {
  tiers: Record<string, { monthly?: TierPrice; annual?: TierPrice; name: string }>;
}

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

const FEATURE_LABELS: Record<string, string> = {
  playlist: 'AI Playlists',
  lyrics: 'Lyrics Lookup',
  covers: 'Cover Art Search',
  scan: 'Unlimited AI Scans',
  album_limit: 'Unlimited Albums',
  gear_limit: 'Unlimited Gear',
  setup_guide: 'Setup Guides',
  manual_finder: 'Manual Finder',
};

const CURATOR_FEATURES = [
  'Unlimited albums',
  'Unlimited AI scans',
  'AI playlist generation',
  'Lyrics for all tracks',
  'Multi-source cover art',
  'Stakkd \u2014 unlimited gear',
  'AI gear identification',
  'Manual finder & setup guides',
];

const ENTHUSIAST_FEATURES = [
  'Everything in Curator',
  'Bulk import & export',
  'API access',
  'Advanced analytics',
  'PDF collection catalogs',
  'Early beta access',
  'Priority support',
];

const CheckIcon: React.FC = () => (
  <svg className="w-4 h-4 text-[#4f6d7a] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, feature }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, onClose);

  const { checkout, isLoading } = useCheckout();
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/prices')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPricing(data); })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const heading = feature && FEATURE_LABELS[feature]
    ? `Upgrade to Unlock ${FEATURE_LABELS[feature]}`
    : 'Upgrade to Unlock';

  const curatorTier = pricing?.tiers?.curator;
  const enthusiastTier = pricing?.tiers?.enthusiast;

  const curatorPrice = isAnnual
    ? (curatorTier?.annual?.amount ?? 4900) / 100
    : (curatorTier?.monthly?.amount ?? 499) / 100;

  const enthusiastPrice = isAnnual
    ? (enthusiastTier?.annual?.amount ?? 9900) / 100
    : (enthusiastTier?.monthly?.amount ?? 999) / 100;

  const curatorPriceId = isAnnual
    ? curatorTier?.annual?.priceId
    : curatorTier?.monthly?.priceId;

  const enthusiastPriceId = isAnnual
    ? enthusiastTier?.annual?.priceId
    : enthusiastTier?.monthly?.priceId;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-th-bg/95 p-4 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl glass-morphism border border-th-surface/[0.10] p-6 md:p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#dd6e42]/10">
            <svg className="w-6 h-6 text-[#dd6e42]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-th-text mb-1">{heading}</h2>
          <p className="text-sm text-th-text3">
            Get unlimited albums, AI scans, playlists, gear identification, and more
          </p>
        </div>

        {/* Monthly / Annual toggle */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${!isAnnual ? 'text-th-text' : 'text-th-text3'}`}>
            Monthly
          </span>
          <button
            role="switch"
            aria-checked={isAnnual}
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative w-12 h-6 rounded-full border-2 transition-all ${
              isAnnual
                ? 'bg-[#dd6e42] border-[#dd6e42]'
                : 'bg-th-surface/[0.15] border-th-surface/[0.25]'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                isAnnual ? 'translate-x-6' : ''
              }`}
            />
          </button>
          <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${isAnnual ? 'text-th-text' : 'text-th-text3'}`}>
            Annual
          </span>
          {isAnnual && (
            <span className="text-[10px] font-bold uppercase tracking-widest bg-[#dd6e42]/10 text-[#dd6e42] px-2 py-0.5 rounded-full">
              Save 18%
            </span>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Curator */}
          <div className="relative rounded-xl border-2 border-[#4f6d7a]/30 bg-th-surface/[0.03] p-5">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#4f6d7a] text-[9px] font-label font-bold uppercase tracking-widest text-white whitespace-nowrap">
              Most Popular
            </span>
            <p className="font-label text-[10px] tracking-widest uppercase text-[#6a8c9a] mb-1 mt-1">Curator</p>
            <div className="flex items-baseline gap-0.5 mb-4">
              <span className="text-th-text3 text-sm font-semibold">$</span>
              <span className="text-3xl font-bold text-th-text">{curatorPrice}</span>
              <span className="text-th-text3 text-sm">/{isAnnual ? 'year' : 'month'}</span>
            </div>
            {isAnnual && (
              <p className="text-[10px] text-th-text3 -mt-3 mb-4">Billed annually</p>
            )}
            <ul className="space-y-2 mb-5">
              {CURATOR_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-th-text2">
                  <CheckIcon />{f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => curatorPriceId && checkout(curatorPriceId)}
              disabled={isLoading || !curatorPriceId}
              className="w-full rounded-xl bg-[#4f6d7a] px-4 py-2.5 text-[10px] font-label tracking-widest uppercase text-white font-bold hover:bg-[#3a525d] transition-all disabled:opacity-50"
            >
              {isLoading ? 'Loading\u2026' : 'Start Free Trial'}
            </button>
          </div>

          {/* Enthusiast */}
          <div className="rounded-xl border border-th-surface/[0.15] bg-th-surface/[0.03] p-5">
            <p className="font-label text-[10px] tracking-widest uppercase text-[#f0a882] mb-1 mt-1">Enthusiast</p>
            <div className="flex items-baseline gap-0.5 mb-4">
              <span className="text-th-text3 text-sm font-semibold">$</span>
              <span className="text-3xl font-bold text-th-text">{enthusiastPrice}</span>
              <span className="text-th-text3 text-sm">/{isAnnual ? 'year' : 'month'}</span>
            </div>
            {isAnnual && (
              <p className="text-[10px] text-th-text3 -mt-3 mb-4">Billed annually</p>
            )}
            <ul className="space-y-2 mb-5">
              {ENTHUSIAST_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-th-text2">
                  <CheckIcon />{f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => enthusiastPriceId && checkout(enthusiastPriceId)}
              disabled={isLoading || !enthusiastPriceId}
              className="w-full rounded-xl border border-[#dd6e42] px-4 py-2.5 text-[10px] font-label tracking-widest uppercase text-[#dd6e42] font-bold hover:bg-[#dd6e42] hover:text-white transition-all disabled:opacity-50"
            >
              {isLoading ? 'Loading\u2026' : 'Start Free Trial'}
            </button>
          </div>
        </div>

        {/* Dismiss */}
        <div className="text-center">
          <button
            onClick={onClose}
            className="text-xs text-th-text3 hover:text-th-text2 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
