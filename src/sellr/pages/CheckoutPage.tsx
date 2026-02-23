import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import SellrLayout from '../components/SellrLayout';
import { useSellrMeta } from '../hooks/useSellrMeta';
import { useSellrSession } from '../hooks/useSellrSession';
import { SELLR_TIERS } from '../types';

// ── Stripe setup ────────────────────────────────────────────────────

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const STRIPE_APPEARANCE = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#2C4A6E',
    colorBackground: '#F5F0E8',
    colorText: '#1A1A2E',
    colorDanger: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '6px',
  },
};

const INCLUDED_FEATURES = [
  'Discogs pricing per record',
  'AI-written ad copy',
  'Shareable report + PDF export',
];

// ── Payment form (inside Elements provider) ─────────────────────────

interface PaymentFormProps {
  sessionId: string;
  amountCents: number;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ sessionId, amountCents }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitErr } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/sellr/success?session=${sessionId}`,
      },
    });

    // Only reaches here if there's an error (otherwise redirects)
    if (submitErr) {
      setError(submitErr.message ?? 'Payment failed. Please try again.');
    }
    setProcessing(false);
  };

  const price = `$${(amountCents / 100).toFixed(2)}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || processing}
        className="w-full px-5 py-3 min-h-[52px] bg-sellr-amber text-white font-medium rounded hover:bg-sellr-amber-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay ${price}`
        )}
      </button>
    </form>
  );
};

// ── Checkout Page ───────────────────────────────────────────────────

const CheckoutPage: React.FC = () => {
  useSellrMeta({
    title: 'Complete Your Appraisal',
    description: 'One-time payment. No subscription.',
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');

  const { session, loading: sessionLoading } = useSellrSession();

  // Email capture state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);

  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState(0);

  // Redirect if no session param
  useEffect(() => {
    if (!sessionId) {
      navigate('/sellr', { replace: true });
    }
  }, [sessionId, navigate]);

  // Redirect if session is already paid
  useEffect(() => {
    if (!sessionLoading && session?.status === 'paid' && sessionId) {
      navigate(`/sellr/report?session=${sessionId}`, { replace: true });
    }
  }, [sessionLoading, session, sessionId, navigate]);

  // Pre-fill email from session if available
  useEffect(() => {
    if (session?.email && !email) {
      setEmail(session.email);
    }
  }, [session, email]);

  // Tier info
  const tier = session?.tier
    ? SELLR_TIERS.find(t => t.id === session.tier)
    : null;

  // Stripe Elements options (memoized to avoid remounting)
  const elementsOptions = useMemo(() => {
    if (!clientSecret) return null;
    return { clientSecret, appearance: STRIPE_APPEARANCE };
  }, [clientSecret]);

  // ── Email submit → create PaymentIntent ───────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setIntentError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setCreatingIntent(true);

    try {
      const res = await fetch('/api/sellr/checkout/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, email: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setClientSecret(data.client_secret);
      setAmountCents(data.amount_cents);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize payment';
      setIntentError(message);
    } finally {
      setCreatingIntent(false);
    }
  };

  // ── Loading / redirect states ─────────────────────────────────────
  if (!sessionId) return null;

  if (sessionLoading) {
    return (
      <SellrLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-sellr-blue animate-spin" />
        </div>
      </SellrLayout>
    );
  }

  return (
    <SellrLayout>
      <div className="max-w-2xl mx-auto py-12">
        {/* ── Section 1: Order Summary ─────────────────────────────── */}
        <section className="bg-sellr-surface rounded-lg p-5 sm:p-8 mb-8">
          <h1 className="font-display text-2xl md:text-3xl text-sellr-charcoal mb-6">
            Your Appraisal Summary
          </h1>

          {tier && (
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <span className="text-lg font-medium text-sellr-charcoal">{tier.label}</span>
                <span className="ml-2 text-sm text-sellr-charcoal/60">
                  {session?.record_count ?? 0} record{(session?.record_count ?? 0) !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="font-display text-2xl text-sellr-blue">{tier.price_display}</span>
            </div>
          )}

          <ul className="space-y-2 mb-6" role="list">
            {INCLUDED_FEATURES.map(feature => (
              <li key={feature} className="flex items-center gap-2 text-sm text-sellr-charcoal/80">
                <Check className="w-4 h-4 text-sellr-sage flex-shrink-0" strokeWidth={2} />
                {feature}
              </li>
            ))}
          </ul>

          <p className="flex items-center gap-1.5 text-xs text-sellr-charcoal/50">
            <ShieldCheck className="w-3.5 h-3.5" />
            One-time payment. No subscription.
          </p>
        </section>

        {/* ── Section 2: Email Capture ─────────────────────────────── */}
        {!clientSecret && (
          <section className="bg-white rounded-lg p-5 sm:p-8 mb-8 border border-sellr-charcoal/10">
            <h2 className="font-display text-xl text-sellr-charcoal mb-1">
              Where should we send your report?
            </h2>
            <p className="text-sm text-sellr-charcoal/50 mb-6">
              We'll email you a link to your completed appraisal report.
            </p>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="sellr-email" className="block text-sm font-medium text-sellr-charcoal mb-1.5">
                  Email address
                </label>
                <input
                  id="sellr-email"
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-sellr-surface rounded border border-sellr-charcoal/10 text-sm placeholder:text-sellr-charcoal/40 focus:outline-none focus:border-sellr-blue/40"
                  autoComplete="email"
                  required
                />
                {emailError && (
                  <p className="mt-1.5 text-sm text-red-600" role="alert">{emailError}</p>
                )}
              </div>

              {intentError && (
                <p className="text-sm text-red-600" role="alert">{intentError}</p>
              )}

              <button
                type="submit"
                disabled={creatingIntent}
                className="w-full px-5 py-3 min-h-[52px] bg-sellr-amber text-white font-medium rounded hover:bg-sellr-amber-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creatingIntent ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up payment...
                  </>
                ) : (
                  'Continue to Payment'
                )}
              </button>
            </form>
          </section>
        )}

        {/* ── Section 3: Stripe Payment ───────────────────────────── */}
        {clientSecret && elementsOptions && (
          <section className="bg-white rounded-lg p-5 sm:p-8 border border-sellr-charcoal/10">
            <h2 className="font-display text-xl text-sellr-charcoal mb-6">
              Payment details
            </h2>

            <Elements stripe={stripePromise} options={elementsOptions}>
              <PaymentForm sessionId={sessionId} amountCents={amountCents} />
            </Elements>
          </section>
        )}
      </div>
    </SellrLayout>
  );
};

export default CheckoutPage;
