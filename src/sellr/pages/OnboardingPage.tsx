import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Check, CheckCircle2, Copy, Disc3, HelpCircle, Loader2, Package, Archive, RefreshCw, ScanLine, Search, Sun, Tag } from 'lucide-react';
import SellrLayout from '../components/SellrLayout';
import { useSellrMeta } from '../hooks/useSellrMeta';
import { SELLR_TIERS } from '../types';
import type { SellrTier } from '../types';
import { supabase } from '../../../services/supabaseService';

// ── Types ────────────────────────────────────────────────────────────

interface WizardState {
  estimated_records: number | null;
  tier: SellrTier['id'] | null;
}

interface StepProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  onNext: () => void;
}

// ── Steps config ─────────────────────────────────────────────────────

const STEPS = [
  'Welcome',
  'Collection Size',
  'Pick Your Plan',
  'How to Scan',
  'See What You Get',
] as const;

const STORAGE_KEY = 'sellr_session_id';
const COOKIE_NAME = 'sellr_session_id';
const VALID_TIERS = ['starter', 'standard', 'full'] as const;

// ── Session creation (mirrors ScanPage pattern) ──────────────────────

async function createSession(tier: string | undefined, token: string): Promise<string> {
  const body: Record<string, string> = {};
  if (tier && VALID_TIERS.includes(tier as typeof VALID_TIERS[number])) {
    body.tier = tier;
  }

  const res = await fetch('/api/sellr/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error('Failed to create session');
  const data = await res.json();
  const id: string = data.session_id;

  // Store in localStorage as cookie fallback (httpOnly cookie set by server)
  localStorage.setItem(STORAGE_KEY, id);
  // Also set a client-readable cookie so useSellrSession can find it
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)};path=/;max-age=${60 * 60 * 24 * 7};samesite=lax`;
  return id;
}

// ── Step 0 — Welcome ─────────────────────────────────────────────────

const WELCOME_BULLETS = [
  'Scan your collection with your phone camera',
  'Get live Discogs market pricing for every record',
  'Walk away with ready-to-post Facebook ad copy',
] as const;

const StepWelcome: React.FC<StepProps> = ({ onNext }) => (
  <div className="text-center">
    <h1 className="font-display text-[clamp(1.75rem,6vw,2.5rem)] leading-tight text-sellr-charcoal">
      Know what your records are worth.
    </h1>

    <ul className="mt-10 space-y-4 text-left max-w-md mx-auto">
      {WELCOME_BULLETS.map((text) => (
        <li key={text} className="flex items-start gap-3">
          <CheckCircle2
            className="w-5 h-5 text-sellr-sage mt-0.5 flex-shrink-0"
            strokeWidth={2}
          />
          <span className="text-sellr-charcoal/80 text-base leading-relaxed">
            {text}
          </span>
        </li>
      ))}
    </ul>

    <p className="mt-8 text-sellr-charcoal/60 text-sm">
      Used by vinyl sellers to stop leaving money on the table.
    </p>

    <button
      onClick={onNext}
      className="mt-8 w-full min-h-[52px] bg-sellr-amber text-white font-medium rounded hover:bg-sellr-amber-light transition-colors text-base"
    >
      Let's Get Started
    </button>

    <p className="mt-3 text-sellr-charcoal/40 text-sm">
      Takes about 2 minutes
    </p>
  </div>
);

// ── Step 1 — Collection Size ─────────────────────────────────────────

const SIZE_OPTIONS: {
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
  label: string;
  descriptor: string;
  priceTag: string;
  records: number | null;
  tier: SellrTier['id'] | null;
}[] = [
  {
    icon: Disc3,
    label: 'Under 25 records',
    descriptor: 'A small stack, a few boxes',
    priceTag: 'from $4.99',
    records: 15,
    tier: 'starter',
  },
  {
    icon: Package,
    label: '25 to 100 records',
    descriptor: 'A solid collection worth knowing',
    priceTag: 'from $14.99',
    records: 50,
    tier: 'standard',
  },
  {
    icon: Archive,
    label: '100 to 500 records',
    descriptor: 'Years of collecting, serious value',
    priceTag: 'from $29.99',
    records: 200,
    tier: 'full',
  },
  {
    icon: HelpCircle,
    label: "I'm not sure",
    descriptor: "We'll help you figure it out",
    priceTag: 'all plans available',
    records: null,
    tier: null,
  },
];

const StepCollectionSize: React.FC<StepProps> = ({ state, setState, onNext }) => {
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleSelect = (records: number | null, tier: SellrTier['id'] | null) => {
    clearTimeout(advanceTimer.current);
    setState({ estimated_records: records, tier });
    advanceTimer.current = setTimeout(onNext, 400);
  };

  // Determine which option is currently selected
  const selectedTier = state.tier;
  const selectedRecords = state.estimated_records;
  const isSelected = (opt: typeof SIZE_OPTIONS[number]) =>
    opt.tier === selectedTier && opt.records === selectedRecords;

  return (
    <div>
      <h2 className="font-display text-[clamp(1.5rem,5vw,2rem)] leading-tight text-sellr-charcoal text-center">
        How many records are you selling?
      </h2>
      <p className="mt-3 text-sellr-charcoal/60 text-center">
        This helps us recommend the right plan for you.
      </p>

      <div className="mt-10 space-y-3">
        {SIZE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = isSelected(opt);

          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => handleSelect(opt.records, opt.tier)}
              className={`relative w-full flex items-center gap-4 p-5 rounded-lg text-left transition-all duration-150 ${
                active
                  ? 'bg-sellr-blue/5 border-2 border-sellr-blue'
                  : 'bg-sellr-surface border-2 border-transparent hover:border-sellr-blue/40'
              }`}
            >
              <Icon
                className="w-7 h-7 text-sellr-blue flex-shrink-0"
                strokeWidth={1.5}
              />

              <div className="flex-1 min-w-0">
                <span className="block font-semibold text-sellr-charcoal">
                  {opt.label}
                </span>
                <span className="block text-sm text-sellr-charcoal/60 mt-0.5">
                  {opt.descriptor}
                </span>
              </div>

              <span className="text-sm text-sellr-charcoal/50 whitespace-nowrap flex-shrink-0">
                {opt.priceTag}
              </span>

              {active && (
                <CheckCircle2
                  className="absolute top-3 right-3 w-5 h-5 text-sellr-sage"
                  strokeWidth={2}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Step 2 — Pick Your Plan ──────────────────────────────────────────

const TIER_FEATURES = [
  'Discogs pricing per record',
  'AI-written ad copy',
  'Shareable report link',
  'PDF export',
] as const;

/** Shared tier card used in both confirmation and full picker layouts. */
const TierCard: React.FC<{
  tier: SellrTier;
  highlighted: boolean;
  onSelect: () => void;
  buttonLabel: string;
}> = ({ tier, highlighted, onSelect, buttonLabel }) => {
  const isPopular = tier.id === 'standard';

  return (
    <div
      className={`relative bg-sellr-surface rounded-lg p-8 flex flex-col ${
        highlighted ? 'border-2 border-sellr-amber' : 'border-2 border-transparent'
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

      <button
        type="button"
        onClick={onSelect}
        className="mt-8 w-full text-center px-5 py-3 min-h-[44px] rounded font-medium transition-colors bg-sellr-amber text-white hover:bg-sellr-amber-light"
      >
        {buttonLabel}
      </button>
    </div>
  );
};

const StepPickPlan: React.FC<StepProps> = ({ state, setState, onNext }) => {
  const [showAll, setShowAll] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>();

  const hasTier = state.tier !== null;
  const showFullPicker = !hasTier || showAll;

  const handleSelectTier = (tierId: SellrTier['id']) => {
    clearTimeout(advanceTimer.current);
    setState((prev) => ({ ...prev, tier: tierId }));
    advanceTimer.current = setTimeout(onNext, 300);
  };

  // Confirmation layout — tier was pre-selected in Step 1
  if (!showFullPicker) {
    const selectedTier = SELLR_TIERS.find((t) => t.id === state.tier)!;

    return (
      <div>
        <h2 className="font-display text-[clamp(1.5rem,5vw,2rem)] leading-tight text-sellr-charcoal text-center">
          Here&rsquo;s your recommended plan
        </h2>

        <div className="mt-10">
          <TierCard
            tier={selectedTier}
            highlighted
            onSelect={onNext}
            buttonLabel="Looks good to me"
          />
        </div>

        <p className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-sellr-blue text-sm hover:text-sellr-blue-light transition-colors underline"
          >
            See all plans
          </button>
        </p>
      </div>
    );
  }

  // Full picker layout
  return (
    <div>
      <h2 className="font-display text-[clamp(1.5rem,5vw,2rem)] leading-tight text-sellr-charcoal text-center">
        Choose your plan
      </h2>
      <p className="mt-3 text-sellr-charcoal/60 text-center">
        One-time payment. No subscription. No account required.
      </p>

      <div className="mt-10 space-y-4">
        {SELLR_TIERS.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            highlighted={state.tier === tier.id}
            onSelect={() => handleSelectTier(tier.id)}
            buttonLabel="Select this plan"
          />
        ))}
      </div>
    </div>
  );
};

// ── Step 3 — How to Scan ─────────────────────────────────────────────

const SCAN_TIPS = [
  {
    icon: Sun,
    iconColor: 'text-sellr-amber',
    title: 'Good lighting makes all the difference',
    body: 'Natural light or a well-lit room works best. Avoid harsh shadows across the album cover.',
  },
  {
    icon: ScanLine,
    iconColor: 'text-sellr-blue',
    title: 'Photograph straight on',
    body: 'Hold your phone parallel to the record. The full cover should fill the frame — no angles.',
  },
  {
    icon: Tag,
    iconColor: 'text-sellr-sage',
    title: 'Show the label if you can',
    body: 'Flipping to show the record label helps identify pressings and can significantly affect value.',
  },
] as const;

type ScanMethod = 'camera' | 'search';

const SCAN_METHODS: {
  id: ScanMethod;
  icon: typeof Camera;
  label: string;
  subtext: string;
}[] = [
  {
    id: 'camera',
    icon: Camera,
    label: 'Photograph Records',
    subtext: 'Point and shoot — AI identifies the record instantly',
  },
  {
    id: 'search',
    icon: Search,
    label: 'Search by Title',
    subtext: 'Type the artist and title to find and add records',
  },
];

const StepHowToScan: React.FC<StepProps> = ({ onNext }) => {
  const [method, setMethod] = useState<ScanMethod>('camera');

  return (
    <div>
      <h2 className="font-display text-[clamp(1.5rem,5vw,2rem)] leading-tight text-sellr-charcoal text-center">
        Scanning your records
      </h2>
      <p className="mt-3 text-sellr-charcoal/60 text-center">
        Get the best results with these quick tips.
      </p>

      {/* Tip cards */}
      <div className="mt-10 space-y-3">
        {SCAN_TIPS.map((tip) => {
          const Icon = tip.icon;
          return (
            <div
              key={tip.title}
              className="bg-sellr-surface rounded-lg p-5 flex items-start gap-4"
            >
              <Icon
                className={`w-6 h-6 ${tip.iconColor} flex-shrink-0 mt-0.5`}
                strokeWidth={1.5}
              />
              <div>
                <p className="font-semibold text-sellr-charcoal">
                  {tip.title}
                </p>
                <p className="mt-1 text-sm text-sellr-charcoal/60 leading-relaxed">
                  {tip.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scan method selector */}
      <div className="mt-10">
        <p className="font-display text-lg text-sellr-charcoal text-center mb-4">
          How would you like to add records?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SCAN_METHODS.map((opt) => {
            const Icon = opt.icon;
            const active = method === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMethod(opt.id)}
                className={`flex flex-col items-center text-center p-5 rounded-lg transition-all duration-150 ${
                  active
                    ? 'bg-sellr-blue/5 border-2 border-sellr-blue'
                    : 'bg-sellr-surface border-2 border-transparent hover:border-sellr-blue/40'
                }`}
              >
                <Icon
                  className="w-7 h-7 text-sellr-blue mb-2"
                  strokeWidth={1.5}
                />
                <span className="font-semibold text-sellr-charcoal">
                  {opt.label}
                </span>
                <span className="mt-1 text-xs text-sellr-charcoal/60">
                  {opt.subtext}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-10 w-full min-h-[52px] bg-sellr-amber text-white font-medium rounded hover:bg-sellr-amber-light transition-colors text-base"
      >
        Got It — Start Scanning
      </button>
    </div>
  );
};

// ── Step 4 — See What You Get ────────────────────────────────────────

/** Small decorative vinyl record SVG, 80×80. */
const MiniVinyl: React.FC = () => (
  <svg viewBox="0 0 80 80" className="w-20 h-20 flex-shrink-0" aria-hidden="true">
    <circle cx="40" cy="40" r="38" fill="#2C4A6E" opacity="0.08" />
    <circle cx="40" cy="40" r="32" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.15" />
    <circle cx="40" cy="40" r="24" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.2" />
    <circle cx="40" cy="40" r="16" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.25" />
    <circle cx="40" cy="40" r="10" fill="#2C4A6E" opacity="0.1" />
    <circle cx="40" cy="40" r="3" fill="#2C4A6E" opacity="0.15" />
  </svg>
);

const MOCK_AD_COPY = `Classic Fleetwood Mac — Rumours (1977, Warner Bros.)

One of the greatest albums ever made and this copy shows it. Very Good Plus condition — plays perfectly with just the faintest signs of love. All original inserts included.

Discogs median puts these at $27–$45 depending on pressing. Asking $30 — fair price for a fast sale.

Local pickup preferred. Cash or Venmo. DM with any questions!`;

const MOCK_LOT_AD_COPY = `47 Vinyl Records — Classic Rock, Soul & Jazz Collection

Solid, well-cared-for collection built over 20 years. Highlights include Fleetwood Mac — Rumours (VG+, ~$28), Marvin Gaye — What's Going On (VG, ~$35), and Miles Davis — Kind of Blue (VG+, ~$42).

Total collection valued at ~$840 on Discogs. Asking $520 — fair deal for the whole crate.

Pickup only. Cash or Venmo. DM me if you want the full list.`;

const StepSeeWhatYouGet: React.FC<StepProps & { completing: boolean }> = ({
  state,
  onNext,
  completing,
}) => {
  const tierInfo = state.tier ? SELLR_TIERS.find((t) => t.id === state.tier) : null;
  const [previewMode, setPreviewMode] = useState<'individual' | 'lot'>('individual');

  return (
    <div>
      <h2 className="font-display text-[clamp(1.5rem,5vw,2rem)] leading-tight text-sellr-charcoal text-center">
        Here&rsquo;s what you&rsquo;ll get
      </h2>
      <p className="mt-3 text-sellr-charcoal/60 text-center">
        {previewMode === 'individual'
          ? 'For every record in your collection, Sellr generates this.'
          : 'Selling a whole crate? Sellr handles lot pricing too.'}
      </p>

      {/* ── Individual mock appraisal card ──────────────────────── */}
      {previewMode === 'individual' && (
        <div className="mt-10 bg-sellr-surface rounded-xl p-6">
          {/* Top row — album info */}
          <div className="flex gap-4">
            <MiniVinyl />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sellr-charcoal">Fleetwood Mac</p>
              <p className="font-display text-xl text-sellr-charcoal mt-0.5">Rumours</p>
              <p className="text-sm text-sellr-charcoal/60 mt-1">1977 &middot; Warner Bros.</p>
              <span className="inline-block mt-2 px-2.5 py-0.5 text-xs font-bold rounded bg-sellr-amber/15 text-sellr-amber">
                VG+
              </span>
            </div>
          </div>

          {/* Pricing row */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="bg-sellr-bg rounded-lg py-3 text-center">
              <p className="text-lg font-semibold text-sellr-charcoal">$18.00</p>
              <p className="text-xs text-sellr-charcoal/50 mt-0.5">Low</p>
            </div>
            <div className="bg-sellr-bg rounded-lg py-3 text-center ring-1 ring-sellr-amber/30">
              <p className="text-xl font-bold text-sellr-amber">~$27.50</p>
              <p className="text-xs text-sellr-charcoal/50 mt-0.5">Est. Value</p>
            </div>
            <div className="bg-sellr-bg rounded-lg py-3 text-center">
              <p className="text-lg font-semibold text-sellr-charcoal">$45.00</p>
              <p className="text-xs text-sellr-charcoal/50 mt-0.5">High</p>
            </div>
          </div>

          {/* Divider */}
          <hr className="my-6 border-sellr-charcoal/10" />

          {/* Facebook Ad Copy section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-[#1877F2] flex items-center justify-center">
                  <span className="text-white text-xs font-bold leading-none">f</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: '#1877F2' }}>
                  Marketplace
                </span>
              </div>
              <span className="text-xs text-sellr-charcoal/40">AI-Generated Ad Copy</span>
            </div>

            <div className="bg-sellr-bg rounded-lg p-4">
              <p className="text-sm text-sellr-charcoal/80 leading-relaxed whitespace-pre-line">
                {MOCK_AD_COPY}
              </p>
            </div>

            {/* Mock action buttons */}
            <div className="flex gap-2 mt-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-sellr-charcoal/20 text-sellr-charcoal/40 opacity-50 cursor-default"
                title="Available after your appraisal"
              >
                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                Copy to Clipboard
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-sellr-charcoal/20 text-sellr-charcoal/40 opacity-50 cursor-default"
                title="Available after your appraisal"
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                Regenerate
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Lot mock card ──────────────────────────────────────── */}
      {previewMode === 'lot' && (
        <div className="mt-10 bg-sellr-surface rounded-xl p-6">
          {/* Lot header */}
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-8 h-8 text-sellr-blue flex-shrink-0" strokeWidth={1.5} />
            <div>
              <p className="font-display text-xl text-sellr-charcoal">Full Crate Lot</p>
              <p className="text-sm text-sellr-charcoal/60">47 records &middot; Est. value $840</p>
            </div>
          </div>

          {/* Lot pricing row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-sellr-bg rounded-lg py-3 text-center">
              <p className="text-lg font-semibold text-sellr-charcoal">$462</p>
              <p className="text-xs text-sellr-charcoal/50 mt-0.5">Quick Sale</p>
            </div>
            <div className="bg-sellr-bg rounded-lg py-3 text-center ring-1 ring-sellr-amber/30">
              <p className="text-xl font-bold text-sellr-amber">$520</p>
              <p className="text-xs text-sellr-charcoal/50 mt-0.5">Fair Price</p>
            </div>
            <div className="bg-sellr-bg rounded-lg py-3 text-center">
              <p className="text-lg font-semibold text-sellr-charcoal">$630</p>
              <p className="text-xs text-sellr-charcoal/50 mt-0.5">Collector</p>
            </div>
          </div>

          {/* Divider */}
          <hr className="my-6 border-sellr-charcoal/10" />

          {/* Facebook lot post */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-[#1877F2] flex items-center justify-center">
                  <span className="text-white text-xs font-bold leading-none">f</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: '#1877F2' }}>
                  Marketplace
                </span>
              </div>
              <span className="text-xs text-sellr-charcoal/40">AI-Generated Lot Post</span>
            </div>

            <div className="bg-sellr-bg rounded-lg p-4">
              <p className="text-sm text-sellr-charcoal/80 leading-relaxed whitespace-pre-line">
                {MOCK_LOT_AD_COPY}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Mode toggle link ───────────────────────────────────── */}
      <p className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setPreviewMode(previewMode === 'individual' ? 'lot' : 'individual')}
          className="text-sellr-blue text-sm hover:text-sellr-blue-light transition-colors underline"
        >
          {previewMode === 'individual'
            ? 'Selling as a lot instead?'
            : 'See individual pricing instead'}
        </button>
      </p>

      {/* Value callout */}
      <div className="mt-8 bg-sellr-amber/10 border-l-4 border-sellr-amber rounded-r-lg p-4">
        <p className="font-semibold text-sellr-charcoal text-sm">
          Your collection could be worth more than you think.
        </p>
        <p className="text-sm text-sellr-charcoal/60 mt-1">
          Sellr checks live Discogs sales data for every record you own.
        </p>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onNext}
        disabled={completing}
        className="mt-8 w-full min-h-[52px] bg-sellr-amber text-white font-medium rounded hover:bg-sellr-amber-light transition-colors text-base disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {completing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating session…
          </>
        ) : (
          'Start My Appraisal'
        )}
      </button>

      {/* Tier confirmation line */}
      <p className="mt-3 text-center text-sm text-sellr-charcoal/40">
        {tierInfo ? (
          <span className="inline-flex items-center gap-1.5">
            <Check className="w-4 h-4 text-sellr-sage" strokeWidth={2} />
            You selected: {tierInfo.label} &middot; {tierInfo.price_display} &middot; up to {tierInfo.record_limit} records
          </span>
        ) : (
          "You'll pick your plan at checkout."
        )}
      </p>
    </div>
  );
};

// ── Progress Bar ─────────────────────────────────────────────────────

const ProgressBar: React.FC<{ currentStep: number }> = ({ currentStep }) => (
  <div className="mb-10">
    <div className="flex gap-1.5">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
            i <= currentStep ? 'bg-sellr-amber' : 'bg-sellr-charcoal/10'
          }`}
        />
      ))}
    </div>
    <p className="mt-2 text-xs text-sellr-charcoal/40 text-center">
      Step {currentStep + 1} of {STEPS.length}
    </p>
  </div>
);

// ── Onboarding Page ──────────────────────────────────────────────────

const OnboardingPage: React.FC = () => {
  useSellrMeta({
    title: 'Get Started',
    description: 'Set up your vinyl appraisal in a few quick steps.',
  });

  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardState, setWizardState] = useState<WizardState>({
    estimated_records: null,
    tier: null,
  });
  const [completing, setCompleting] = useState(false);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);

    try {
      // Get current Supabase session JWT
      const { data: authData } = await supabase!.auth.getSession();
      const token = authData.session?.access_token;

      if (!token) {
        // User not logged in — redirect to signup, then back here
        navigate('/sellr/signup?redirect=/sellr/start', { replace: true });
        return;
      }

      const tier = wizardState.tier ?? undefined;
      const sessionId = await createSession(tier, token);
      navigate(
        `/sellr/checkout?tier=${tier || 'starter'}&session=${sessionId}`,
      );
    } catch {
      setCompleting(false);
    }
  };

  const stepProps: StepProps = {
    state: wizardState,
    setState: setWizardState,
    onNext: handleNext,
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepWelcome {...stepProps} />;
      case 1:
        return <StepCollectionSize {...stepProps} />;
      case 2:
        return <StepPickPlan {...stepProps} />;
      case 3:
        return <StepHowToScan {...stepProps} />;
      case 4:
        return <StepSeeWhatYouGet {...stepProps} completing={completing} />;
      default:
        return null;
    }
  };

  return (
    <SellrLayout>
      <div className="max-w-2xl mx-auto min-h-screen pt-8 sm:pt-12">
        <Link
          to="/sellr"
          className="inline-flex items-center gap-1 text-sm text-sellr-charcoal/50 hover:text-sellr-blue transition-colors mb-4"
        >
          &larr; Back to Sellr
        </Link>
        <ProgressBar currentStep={currentStep} />

        <div
          key={currentStep}
          className="animate-fade-in"
          style={{
            animation: 'fadeIn 200ms ease-in-out',
          }}
        >
          {renderStep()}
        </div>
      </div>

      {/* Inline keyframes for the fade transition */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 200ms ease-in-out;
        }
      `}</style>
    </SellrLayout>
  );
};

export default OnboardingPage;
