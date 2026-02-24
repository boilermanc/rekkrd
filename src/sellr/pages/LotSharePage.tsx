import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import SellrLayout from '../components/SellrLayout';
import { useSellrMeta } from '../hooks/useSellrMeta';
import type { SellrSession, SellrRecord } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────

function fmtUsd(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function conditionColor(condition: string): string {
  if (condition === 'M' || condition === 'NM') return 'bg-sellr-sage/20 text-sellr-sage';
  if (condition === 'VG+' || condition === 'VG') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-500';
}

// ── LotSharePage ─────────────────────────────────────────────────────

const LotSharePage: React.FC = () => {
  useSellrMeta({
    title: 'Vinyl Record Lot',
    description: 'View this vinyl record lot appraisal.',
  });

  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<SellrSession | null>(null);
  const [records, setRecords] = useState<SellrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No report token provided');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/sellr/report/token/${token}`);
        if (!res.ok) {
          setError('Report not found or not yet available.');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setSession(data.session);
        setRecords(data.records ?? []);
      } catch {
        setError('Failed to load report.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Compute value range and fair price
  const totalLow = records.reduce((sum, r) => sum + (r.price_low ?? 0), 0);
  const totalHigh = records.reduce((sum, r) => sum + (r.price_high ?? 0), 0);
  const totalMedian = records.reduce((sum, r) => sum + (r.price_median ?? 0), 0);
  const fairPrice = Math.round(totalMedian * 0.65);

  if (loading) {
    return (
      <SellrLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-sellr-blue animate-spin" />
        </div>
      </SellrLayout>
    );
  }

  if (error || !session) {
    return (
      <SellrLayout>
        <div className="max-w-2xl mx-auto py-16 text-center">
          <p className="text-sellr-charcoal/60 mb-4">{error || 'Report not found.'}</p>
          <Link
            to="/sellr"
            className="px-5 py-2.5 bg-sellr-blue text-white text-sm font-medium rounded hover:bg-sellr-blue-light transition-colors"
          >
            Go to Sellr
          </Link>
        </div>
      </SellrLayout>
    );
  }

  return (
    <SellrLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <h1 className="font-display text-[clamp(1.5rem,5vw,2rem)] text-sellr-charcoal">
          Vinyl Record Lot &mdash; {records.length} record{records.length !== 1 ? 's' : ''}
        </h1>

        {/* Price + Value Range */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-sellr-surface rounded-xl p-5">
            <p className="text-xs text-sellr-charcoal/50 uppercase tracking-wide">Lot Price</p>
            <p className="mt-1 font-display text-3xl text-sellr-amber">
              {fmtUsd(fairPrice)}
            </p>
          </div>
          <div className="bg-sellr-surface rounded-xl p-5">
            <p className="text-xs text-sellr-charcoal/50 uppercase tracking-wide">Value Range</p>
            <p className="mt-1 font-display text-xl text-sellr-charcoal">
              {fmtUsd(totalLow)} &ndash; {fmtUsd(totalHigh)}
            </p>
          </div>
        </div>

        {/* Record List */}
        <section className="mt-8">
          <h2 className="font-display text-lg text-sellr-charcoal mb-4">
            What&rsquo;s in the lot
          </h2>
          <div className="space-y-1.5">
            {records.map(record => (
              <div
                key={record.id}
                className="flex items-center justify-between bg-sellr-surface rounded-lg px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-sellr-charcoal truncate block">
                    {record.artist}
                  </span>
                  <span className="text-sm text-sellr-charcoal/60 truncate block">
                    {record.title}
                  </span>
                </div>
                <span className={`ml-3 flex-shrink-0 inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${conditionColor(record.condition)}`}>
                  {record.condition}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Contact seller note */}
        <div className="mt-8 bg-sellr-amber/10 border-l-4 border-sellr-amber rounded-r-lg p-4">
          <p className="font-semibold text-sellr-charcoal text-sm">
            Interested in this lot?
          </p>
          <p className="text-sm text-sellr-charcoal/60 mt-1">
            Message the seller on Facebook Marketplace to arrange a pickup.
          </p>
        </div>

        {/* Rekkrd branding footer */}
        <p className="mt-10 text-center text-xs text-sellr-charcoal/40">
          Appraisal powered by{' '}
          <Link to="/sellr" className="text-sellr-blue hover:text-sellr-blue-light underline">
            Sellr
          </Link>
          {' \u00b7 '}
          <Link to="/sellr" className="text-sellr-blue hover:text-sellr-blue-light underline">
            rekkrd.com/sellr
          </Link>
        </p>
      </div>
    </SellrLayout>
  );
};

export default LotSharePage;
