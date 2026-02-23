import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, RefreshCw, Loader2, X } from 'lucide-react';
import SellrLayout from '../components/SellrLayout';
import { useSellrMeta } from '../hooks/useSellrMeta';
import type { SellrSession, SellrRecord } from '../types';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 10;

// ── Spinning vinyl SVG (matches LandingPage decorative style) ───────

const SpinningVinyl: React.FC = () => (
  <svg
    viewBox="0 0 320 320"
    className="w-40 h-40 md:w-48 md:h-48 animate-[spin_4s_linear_infinite]"
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

// ── SuccessPage ─────────────────────────────────────────────────────

const SuccessPage: React.FC = () => {
  useSellrMeta({
    title: 'Your Report is Ready',
    description: 'Your vinyl collection appraisal is complete.',
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');

  const [session, setSession] = useState<SellrSession | null>(null);
  const [records, setRecords] = useState<SellrRecord[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Rekkrd nudge (inline card after success) ────────────────────
  const nudgeKey = sessionId ? `sellr_success_nudge_${sessionId}` : '';
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    if (!isPaid || !sessionId) return;
    if (localStorage.getItem(nudgeKey)) return;

    const timer = setTimeout(() => setShowNudge(true), 5000);
    return () => clearTimeout(timer);
  }, [isPaid, sessionId, nudgeKey]);

  const dismissNudge = () => {
    localStorage.setItem(nudgeKey, '1');
    setShowNudge(false);
  };

  // Redirect if no session param
  useEffect(() => {
    if (!sessionId) {
      navigate('/sellr', { replace: true });
    }
  }, [sessionId, navigate]);

  // ── Poll for paid status ──────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!sessionId) return;

    try {
      const res = await fetch(`/api/sellr/report/session/${sessionId}`);

      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setRecords(data.records ?? []);
        setIsPaid(true);
        return; // Stop polling
      }

      // Not ready yet — schedule next attempt
      attemptRef.current += 1;
      if (attemptRef.current >= MAX_POLL_ATTEMPTS) {
        setTimedOut(true);
        return;
      }

      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    } catch {
      attemptRef.current += 1;
      if (attemptRef.current >= MAX_POLL_ATTEMPTS) {
        setTimedOut(true);
        return;
      }
      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || isPaid || timedOut) return;

    // Start polling
    poll();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sessionId, isPaid, timedOut, poll]);

  // ── Manual retry ──────────────────────────────────────────────────
  const handleRetry = () => {
    attemptRef.current = 0;
    setTimedOut(false);
    poll();
  };

  // ── Compute total median value ────────────────────────────────────
  const totalMedian = records.reduce((sum, r) => sum + (r.price_median ?? 0), 0);
  const formattedTotal = totalMedian > 0
    ? `$${totalMedian.toFixed(2)}`
    : null;

  if (!sessionId) return null;

  return (
    <SellrLayout>
      <div className="max-w-2xl mx-auto py-16 md:py-24">
        {/* ── Polling / Loading State ────────────────────────────── */}
        {!isPaid && !timedOut && (
          <div className="flex flex-col items-center text-center">
            <SpinningVinyl />
            <h1 className="font-display text-2xl md:text-3xl text-sellr-charcoal mt-8">
              Processing your payment...
            </h1>
            <p className="mt-3 text-sellr-charcoal/60">
              Pulling Discogs pricing for your records...
            </p>
          </div>
        )}

        {/* ── Timed Out State ────────────────────────────────────── */}
        {!isPaid && timedOut && (
          <div className="flex flex-col items-center text-center">
            <Loader2 className="w-12 h-12 text-sellr-charcoal/30 mb-6" />
            <h1 className="font-display text-2xl md:text-3xl text-sellr-charcoal">
              Taking longer than expected
            </h1>
            <p className="mt-3 text-sellr-charcoal/60 max-w-md">
              Your payment was received. The report is still being prepared.
              Try refreshing, or contact us if it doesn't resolve.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-6 py-3 bg-sellr-blue text-white font-medium rounded hover:bg-sellr-blue-light transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <a
                href="mailto:support@rekkrd.com"
                className="text-sm text-sellr-blue hover:text-sellr-blue-light transition-colors"
              >
                Contact support@rekkrd.com
              </a>
            </div>
          </div>
        )}

        {/* ── Success State ──────────────────────────────────────── */}
        {isPaid && (
          <div className="flex flex-col items-center text-center">
            <CheckCircle2
              className="text-sellr-sage"
              size={64}
              strokeWidth={1.5}
            />

            <h1 className="font-display text-3xl md:text-4xl text-sellr-charcoal mt-6">
              Your appraisal is ready.
            </h1>

            <p className="mt-4 text-lg text-sellr-charcoal/70">
              {session?.record_count ?? records.length} record{(session?.record_count ?? records.length) !== 1 ? 's' : ''}
              {formattedTotal && <> &middot; Est. value {formattedTotal}</>}
            </p>

            <Link
              to={`/sellr/report?session=${sessionId}`}
              className="mt-8 inline-block w-full sm:w-auto px-8 py-4 min-h-[52px] bg-sellr-amber text-white text-lg font-medium rounded hover:bg-sellr-amber-light transition-colors text-center"
            >
              View My Report
            </Link>

            {session?.email && (
              <p className="mt-6 text-sm text-sellr-charcoal/50">
                A copy has been sent to {session.email}
              </p>
            )}

            {/* Rekkrd conversion nudge — appears after 5s delay */}
            {showNudge && (
              <div className="mt-8 w-full max-w-md bg-sellr-surface rounded-lg p-4 relative text-left">
                <button
                  onClick={dismissNudge}
                  className="absolute top-3 right-3 text-sellr-charcoal/40 hover:text-sellr-charcoal transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-sm text-sellr-charcoal/80 pr-6">
                  <span className="font-medium text-sellr-charcoal">Did you know?</span>{' '}
                  You can import this collection into Rekkrd and track its value over time.
                </p>
                <a
                  href={`/signup?import=${sessionId}`}
                  className="inline-block mt-3 text-sm font-medium text-sellr-blue hover:text-sellr-blue-light transition-colors"
                >
                  Learn More &rarr;
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </SellrLayout>
  );
};

export default SuccessPage;
