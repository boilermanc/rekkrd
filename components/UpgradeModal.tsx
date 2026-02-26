import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { loadStripe, type Stripe as StripeType } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useCheckout } from '../hooks/useCheckout';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useToast } from '../contexts/ToastContext';

// ── Stripe setup ────────────────────────────────────────────────────

let _stripePromise: Promise<StripeType | null> | null = null;
function getStripePromise(): Promise<StripeType | null> {
  if (_stripePromise) return _stripePromise;
  _stripePromise = fetch('/api/stripe-config')
    .then(r => r.ok ? r.json() : null)
    .then(data => loadStripe(data?.publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY))
    .catch(() => loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY));
  return _stripePromise;
}

const STRIPE_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#dd6e42',
    colorBackground: '#1a1f25',
    colorText: '#e0e0e0',
    colorTextSecondary: '#8a9aa4',
    colorDanger: '#ef4444',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      backgroundColor: '#141920',
      border: '1px solid rgba(255,255,255,0.08)',
    },
    '.Input:focus': {
      border: '1px solid #dd6e42',
      boxShadow: '0 0 0 1px #dd6e42',
    },
    '.Label': {
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
  },
};

// ── Types ────────────────────────────────────────────────────────────

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
  defaultPriceId?: string;
}

type ModalStep = 'plan_select' | 'loading' | 'payment';

// ── Constants ────────────────────────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
  playlist: 'AI Playlists',
  lyrics: 'Lyrics Lookup',
  covers: 'Cover Art Search',
  scan: 'Unlimited AI Scans',
  album_limit: 'Unlimited Albums',
  gear_limit: 'Unlimited Gear',
  setup_guide: 'Setup Guides',
  manual_finder: 'Manual Finder',
  plan_upgrade: 'Premium Features',
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

// ── Payment form (inside Elements provider) ─────────────────────────

interface PaymentFormProps {
  priceLabel: string;
  onSuccess: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ priceLabel, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.');
      setProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess();
    } else {
      setError('Payment was not completed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || processing}
        className="w-full rounded-xl bg-[#dd6e42] px-4 py-3 text-sm font-bold text-white hover:bg-[#c45a30] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </>
        ) : (
          `Pay ${priceLabel}`
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-[10px] text-th-text3/60">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        Secured by Stripe. Your card details never touch our servers.
      </p>
    </form>
  );
};

// ── Main modal ──────────────────────────────────────────────────────

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, feature, defaultPriceId }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, onClose);

  const { createSubscription, isLoading } = useCheckout();
  const { plan, isTrialing, refresh: refreshSubscription } = useSubscription();
  const { showToast } = useToast();
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  // Payment flow state
  const [step, setStep] = useState<ModalStep>('plan_select');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedPriceLabel, setSelectedPriceLabel] = useState('');

  // Context-aware button labels
  const alreadyHasPlan = isTrialing || plan !== 'collector';
  const curatorButtonLabel = alreadyHasPlan && plan === 'curator'
    ? 'Subscribe Now'
    : alreadyHasPlan
      ? 'Switch to Curator'
      : 'Start Free Trial';
  const enthusiastButtonLabel = alreadyHasPlan && plan === 'enthusiast'
    ? 'Subscribe Now'
    : alreadyHasPlan
      ? 'Upgrade to Enthusiast'
      : 'Start Free Trial';

  // Track whether auto-proceed has fired for the current defaultPriceId
  const autoProceedFired = useRef(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      autoProceedFired.current = false;
      setStep(defaultPriceId ? 'loading' : 'plan_select');
      setClientSecret(null);
      setSelectedPriceLabel('');
    }
  }, [isOpen, defaultPriceId]);

  useEffect(() => {
    if (!isOpen) return;
    console.log('[upgrade-modal] opened, fetching prices…');
    fetch('/api/prices')
      .then(r => {
        if (!r.ok) {
          console.error('[upgrade-modal] /api/prices failed:', r.status);
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (data) {
          console.log('[upgrade-modal] prices loaded', {
            curatorMonthly: data.tiers?.curator?.monthly?.priceId,
            enthusiastMonthly: data.tiers?.enthusiast?.monthly?.priceId,
          });
          setPricing(data);
        } else {
          console.error('[upgrade-modal] no pricing data received');
        }
      })
      .catch(err => console.error('[upgrade-modal] prices fetch error:', err));
  }, [isOpen]);

  // Auto-proceed: when defaultPriceId is provided and prices are loaded,
  // resolve the Stripe priceId and skip straight to payment
  useEffect(() => {
    if (!isOpen || !defaultPriceId || !pricing || autoProceedFired.current) return;
    autoProceedFired.current = true;

    // defaultPriceId format: "curator:monthly" or "enthusiast:annual"
    const [tier, interval] = defaultPriceId.split(':') as [string, string];
    const tierData = pricing.tiers?.[tier];
    const priceObj = interval === 'annual' ? tierData?.annual : tierData?.monthly;

    if (priceObj?.priceId) {
      const label = `$${((priceObj.amount ?? 0) / 100).toFixed(2)}/${interval === 'annual' ? 'year' : 'month'}`;
      console.log('[upgrade-modal] auto-proceeding with', { tier, interval, priceId: priceObj.priceId, label });
      // Call handleSelectPlan inline to avoid stale closure
      (async () => {
        setStep('loading');
        setSelectedPriceLabel(label);
        const result = await createSubscription(priceObj.priceId);
        if (result?.alreadyActive) {
          onClose();
          refreshSubscription().then(() => {
            showToast('Welcome! Your subscription is now active.', 'success');
          });
        } else if (result?.clientSecret) {
          setClientSecret(result.clientSecret);
          setStep('payment');
        } else {
          setStep('plan_select');
        }
      })();
    } else {
      console.error('[upgrade-modal] could not resolve priceId for', { tier, interval, tierData });
      setStep('plan_select');
    }
  }, [isOpen, defaultPriceId, pricing, createSubscription, onClose, refreshSubscription, showToast]);

  const handleSelectPlan = useCallback(async (priceId: string, priceLabel: string) => {
    setStep('loading');
    setSelectedPriceLabel(priceLabel);

    const result = await createSubscription(priceId);
    if (result?.alreadyActive) {
      // Subscription activated without payment (e.g. $0 or saved method)
      handlePaymentSuccess();
    } else if (result?.clientSecret) {
      setClientSecret(result.clientSecret);
      setStep('payment');
    } else {
      // createSubscription already showed a toast on failure
      setStep('plan_select');
    }
  }, [createSubscription]);

  const handlePaymentSuccess = useCallback(() => {
    onClose();
    refreshSubscription().then(() => {
      showToast('Welcome! Your subscription is now active.', 'success');
    });
  }, [onClose, refreshSubscription, showToast]);

  const elementsOptions = useMemo(() => {
    if (!clientSecret) return null;
    return { clientSecret, appearance: STRIPE_APPEARANCE };
  }, [clientSecret]);

  if (!isOpen) return null;

  const heading = alreadyHasPlan
    ? 'Choose Your Plan'
    : feature && FEATURE_LABELS[feature]
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

  const intervalLabel = isAnnual ? '/year' : '/month';

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-th-bg/95 p-4 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl glass-morphism border border-th-surface/[0.10] p-6 md:p-8 shadow-2xl">

        {/* ── Step: Loading ──────────────────────────────────────── */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="w-8 h-8 text-[#dd6e42] animate-spin mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium text-th-text">Setting up payment...</p>
            <p className="text-xs text-th-text3 mt-1">This will only take a moment</p>
          </div>
        )}

        {/* ── Step: Payment form ─────────────────────────────────── */}
        {step === 'payment' && clientSecret && elementsOptions && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => { setStep('plan_select'); setClientSecret(null); }}
                className="p-1.5 rounded-lg hover:bg-th-surface/[0.1] transition-colors text-th-text3 hover:text-th-text"
                aria-label="Back to plan selection"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div>
                <h2 className="text-lg font-bold text-th-text">Payment details</h2>
                <p className="text-xs text-th-text3">{selectedPriceLabel}</p>
              </div>
            </div>

            <Elements stripe={getStripePromise()} options={elementsOptions}>
              <PaymentForm
                priceLabel={selectedPriceLabel}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          </>
        )}

        {/* ── Step: Plan selection (default) ─────────────────────── */}
        {step === 'plan_select' && (
          <>
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
                {isTrialing
                  ? 'Subscribe to keep your features when your trial ends'
                  : 'Get unlimited albums, AI scans, playlists, gear identification, and more'}
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
                  <span className="text-th-text3 text-sm">{intervalLabel}</span>
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
                  onClick={() => curatorPriceId && handleSelectPlan(curatorPriceId, `$${curatorPrice}${intervalLabel}`)}
                  disabled={isLoading || !curatorPriceId}
                  className="w-full rounded-xl bg-[#4f6d7a] px-4 py-2.5 text-[10px] font-label tracking-widest uppercase text-white font-bold hover:bg-[#3a525d] transition-all disabled:opacity-50"
                >
                  {curatorButtonLabel}
                </button>
              </div>

              {/* Enthusiast */}
              <div className="rounded-xl border border-th-surface/[0.15] bg-th-surface/[0.03] p-5">
                <p className="font-label text-[10px] tracking-widest uppercase text-[#f0a882] mb-1 mt-1">Enthusiast</p>
                <div className="flex items-baseline gap-0.5 mb-4">
                  <span className="text-th-text3 text-sm font-semibold">$</span>
                  <span className="text-3xl font-bold text-th-text">{enthusiastPrice}</span>
                  <span className="text-th-text3 text-sm">{intervalLabel}</span>
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
                  onClick={() => enthusiastPriceId && handleSelectPlan(enthusiastPriceId, `$${enthusiastPrice}${intervalLabel}`)}
                  disabled={isLoading || !enthusiastPriceId}
                  className="w-full rounded-xl border border-[#dd6e42] px-4 py-2.5 text-[10px] font-label tracking-widest uppercase text-[#dd6e42] font-bold hover:bg-[#dd6e42] hover:text-white transition-all disabled:opacity-50"
                >
                  {enthusiastButtonLabel}
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
          </>
        )}
      </div>
    </div>
  );
};

export default UpgradeModal;
