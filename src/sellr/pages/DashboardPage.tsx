import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import SellrLayout from '../components/SellrLayout';
import SlotCounter from '../components/SlotCounter';
import { useSellrAuth } from '../hooks/useSellrAuth';
import { useSellrMeta } from '../hooks/useSellrMeta';
import { supabase } from '../../services/supabaseService';

// ── API response types ──────────────────────────────────────────────

interface DashboardSlots {
  slots_purchased: number;
  slots_used: number;
  slots_remaining: number;
  last_tier: string | null;
}

interface DashboardSession {
  id: string;
  tier: 'starter' | 'standard' | 'full' | null;
  status: 'active' | 'paid' | 'expired';
  created_at: string;
  last_scanned_at: string | null;
  record_count: number;
  total_median_value: number;
  is_paid: boolean;
  report_token: string | null;
  collection_ad_copy: string | null;
}

interface DashboardData {
  slots: DashboardSlots;
  sessions: DashboardSession[];
}

// ── Tier label map ──────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  standard: 'Standard',
  full: 'Full Collection',
};

// ── Decorative vinyl SVG for empty state ────────────────────────────

const VinylDisc: React.FC = () => (
  <svg
    viewBox="0 0 80 80"
    className="w-20 h-20"
    aria-hidden="true"
  >
    <circle cx="40" cy="40" r="38" fill="#2C4A6E" opacity="0.08" />
    <circle cx="40" cy="40" r="30" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.15" />
    <circle cx="40" cy="40" r="22" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.18" />
    <circle cx="40" cy="40" r="14" fill="none" stroke="#2C4A6E" strokeWidth="0.5" opacity="0.22" />
    <circle cx="40" cy="40" r="10" fill="#2C4A6E" opacity="0.1" />
    <circle cx="40" cy="40" r="3" fill="#2C4A6E" opacity="0.15" />
  </svg>
);

// ── Session Card ────────────────────────────────────────────────────

const SessionCard: React.FC<{ session: DashboardSession }> = ({ session }) => {
  const isPaid = session.status === 'paid';
  const isActive = session.status === 'active';
  const isExpired = session.status === 'expired';

  const borderColor = isPaid
    ? 'border-sellr-sage'
    : isActive
      ? 'border-sellr-amber'
      : 'border-gray-300';

  const dateStr = new Date(session.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const totalValue = session.total_median_value > 0
    ? `$${session.total_median_value.toFixed(2)}`
    : null;

  return (
    <div className={`bg-sellr-surface rounded-xl p-5 border-l-4 ${borderColor}`}>
      {/* Top row: date + status badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-sellr-charcoal/50">{dateStr}</span>
        {isPaid && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sellr-sage/15 text-sellr-sage">
            Report Ready
          </span>
        )}
        {isActive && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sellr-amber/15 text-sellr-amber">
            In Progress
          </span>
        )}
        {isExpired && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            Expired
          </span>
        )}
      </div>

      {/* Middle row: record count, value, tier */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-sm text-sellr-charcoal">
          {session.record_count} record{session.record_count !== 1 ? 's' : ''}
          {totalValue && <> &middot; Est. {totalValue}</>}
        </span>
        {session.tier && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sellr-blue/10 text-sellr-blue">
            {TIER_LABELS[session.tier] ?? session.tier}
          </span>
        )}
        {session.collection_ad_copy && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sellr-sage/15 text-sellr-sage">
            Lot Post Ready
          </span>
        )}
      </div>

      {/* Bottom row: action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        {isPaid && session.report_token && (
          <>
            <Link
              to={`/sellr/report?token=${session.report_token}`}
              className="px-4 py-2 bg-sellr-blue text-white text-sm font-medium rounded hover:bg-sellr-blue-light transition-colors text-center"
            >
              View Report
            </Link>
            {session.collection_ad_copy && (
              <Link
                to={`/sellr/lot/share/${session.report_token}`}
                className="px-4 py-2 border border-sellr-sage text-sellr-sage text-sm font-medium rounded hover:bg-sellr-sage/10 transition-colors text-center"
              >
                View Lot Report
              </Link>
            )}
          </>
        )}
        {isActive && (
          <>
            <Link
              to={`/sellr/scan?session=${session.id}`}
              className="px-4 py-2 bg-sellr-amber text-white text-sm font-medium rounded hover:bg-sellr-amber-light transition-colors text-center"
            >
              Continue Scanning
            </Link>
            <Link
              to={`/sellr/checkout?session=${session.id}`}
              className="px-4 py-2 border border-sellr-charcoal/20 text-sellr-charcoal text-sm font-medium rounded hover:border-sellr-charcoal/40 transition-colors text-center"
            >
              Go to Checkout
            </Link>
          </>
        )}
        {isExpired && (
          <Link
            to={`/sellr/report?session=${session.id}`}
            className="px-4 py-2 border border-gray-300 text-gray-500 text-sm font-medium rounded hover:border-gray-400 transition-colors text-center"
          >
            View Records
          </Link>
        )}
      </div>
    </div>
  );
};

// ── Dashboard Page ──────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  useSellrMeta({
    title: 'My Appraisals',
    description: 'View your Sellr appraisals and slot balance.',
  });

  const { user } = useSellrAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function fetchDashboard() {
      setLoading(true);
      setError(null);

      try {
        const session = await supabase?.auth.getSession();
        const token = session?.data?.session?.access_token;
        if (!token) throw new Error('No auth token');

        const res = await fetch('/api/sellr/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
          setLoading(false);
        }
      }
    }

    fetchDashboard();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <SellrLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* ── Loading ────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-sellr-blue animate-spin" />
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────── */}
        {!loading && error && (
          <div className="flex flex-col items-center text-center py-16">
            <p className="text-sellr-charcoal/60 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-sellr-blue text-white text-sm font-medium rounded hover:bg-sellr-blue-light transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Loaded ─────────────────────────────────────────── */}
        {!loading && !error && data && (
          <>
            {/* Header row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
              <h1 className="font-display text-[28px] sm:text-[32px] text-sellr-blue">
                Your Appraisals
              </h1>
              <Link
                to="/sellr/start"
                className="self-start px-5 py-2.5 bg-sellr-amber text-white text-sm font-medium rounded hover:bg-sellr-amber-light transition-colors"
              >
                Start New Appraisal
              </Link>
            </div>

            {/* Slot summary card */}
            {data.slots.slots_purchased > 0 ? (
              <div className="mb-8">
                <SlotCounter
                  slotsUsed={data.slots.slots_used}
                  slotsPurchased={data.slots.slots_purchased}
                  size="lg"
                />
              </div>
            ) : (
              <div className="bg-sellr-surface rounded-xl p-6 mb-8 text-center">
                <p className="text-sellr-charcoal/60 mb-4">
                  You don't have any record slots yet.
                </p>
                <Link
                  to="/sellr/start"
                  className="inline-block px-6 py-3 bg-sellr-amber text-white text-sm font-medium rounded hover:bg-sellr-amber-light transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Stat pills */}
            {data.sessions.length > 0 && (() => {
              const totalRecords = data.sessions.reduce((sum, s) => sum + s.record_count, 0);
              const totalValue = data.sessions.reduce((sum, s) => sum + s.total_median_value, 0);
              const completedCount = data.sessions.filter(s => s.status === 'paid').length;
              return (
                <div className="grid grid-cols-3 gap-3 mb-8">
                  <div className="bg-sellr-surface rounded-lg p-3 text-center">
                    <p className="font-bold text-sellr-blue text-lg">{totalRecords}</p>
                    <p className="text-xs text-sellr-charcoal/50 mt-0.5">Records Scanned</p>
                  </div>
                  <div className="bg-sellr-surface rounded-lg p-3 text-center">
                    <p className="font-bold text-sellr-blue text-lg">
                      ${totalValue > 0 ? totalValue.toFixed(0) : '0'}
                    </p>
                    <p className="text-xs text-sellr-charcoal/50 mt-0.5">Total Est. Value</p>
                  </div>
                  <div className="bg-sellr-surface rounded-lg p-3 text-center">
                    <p className="font-bold text-sellr-blue text-lg">{completedCount}</p>
                    <p className="text-xs text-sellr-charcoal/50 mt-0.5">Completed</p>
                  </div>
                </div>
              );
            })()}

            {/* Sessions list */}
            {data.sessions.length === 0 ? (
              <div className="bg-sellr-surface rounded-xl p-8 flex flex-col items-center text-center">
                <VinylDisc />
                <h2 className="font-display text-xl text-sellr-charcoal mt-4">
                  No appraisals yet
                </h2>
                <p className="text-sm text-sellr-charcoal/60 mt-2 max-w-sm">
                  Start scanning your records to see them here
                </p>
                <Link
                  to="/sellr/start"
                  className="mt-6 px-6 py-3 bg-sellr-amber text-white text-sm font-medium rounded hover:bg-sellr-amber-light transition-colors"
                >
                  Start Your First Appraisal
                </Link>
              </div>
            ) : (() => {
              const nonExpired = data.sessions.filter(s => s.status !== 'expired');
              const expired = data.sessions.filter(s => s.status === 'expired');
              const allExpired = nonExpired.length === 0 && expired.length > 0;

              return (
                <div className="flex flex-col gap-4">
                  {allExpired && (
                    <div className="bg-sellr-surface rounded-xl p-6 text-center mb-2">
                      <p className="text-sellr-charcoal/70 font-medium">
                        Your previous appraisals have expired
                      </p>
                      <p className="text-sm text-sellr-charcoal/50 mt-1">
                        Start a new appraisal to scan more records
                      </p>
                      <Link
                        to="/sellr/start"
                        className="inline-block mt-4 px-6 py-2.5 bg-sellr-amber text-white text-sm font-medium rounded hover:bg-sellr-amber-light transition-colors"
                      >
                        Start New Appraisal
                      </Link>
                    </div>
                  )}
                  {nonExpired.map(session => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                  {expired.length > 0 && nonExpired.length > 0 && (
                    <p className="text-xs text-sellr-charcoal/40 mt-2">Previous appraisals</p>
                  )}
                  {expired.map(session => (
                    <div key={session.id} className="opacity-60">
                      <SessionCard session={session} />
                    </div>
                  ))}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </SellrLayout>
  );
};

export default DashboardPage;
