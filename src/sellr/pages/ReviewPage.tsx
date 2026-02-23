import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Check, ArrowUpDown, ChevronDown } from 'lucide-react';
import SellrLayout from '../components/SellrLayout';
import { useSellrMeta } from '../hooks/useSellrMeta';
import { SELLR_TIERS } from '../types';
import type { SellrSession, SellrRecord, SellrTier } from '../types';

// ── Constants ────────────────────────────────────────────────────────

const VALID_CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'] as const;

const TIER_FEATURES = [
  'Discogs pricing per record',
  'AI-written ad copy',
  'Shareable report link',
  'PDF export',
];

type SortKey = 'artist' | 'title' | 'price_median';
type SortDir = 'asc' | 'desc';

// ── Helpers ──────────────────────────────────────────────────────────

function fmtPrice(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

// ── ReviewPage ───────────────────────────────────────────────────────

const ReviewPage: React.FC = () => {
  useSellrMeta({
    title: 'Review Your Collection',
    description: 'Review your records and select an appraisal plan.',
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');

  const [session, setSession] = useState<SellrSession | null>(null);
  const [records, setRecords] = useState<SellrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('artist');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Inline condition editing
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── Fetch session + records ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/sellr/sessions/${sessionId}`);
      if (!res.ok) {
        navigate('/sellr', { replace: true });
        showToast('Session expired — start a new appraisal.');
        return;
      }
      const data = await res.json();
      setSession(data.session);
      setRecords(data.records ?? []);
    } catch {
      navigate('/sellr', { replace: true });
      showToast('Session expired — start a new appraisal.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    if (!sessionId) {
      navigate('/sellr', { replace: true });
      return;
    }
    fetchData();
  }, [sessionId, fetchData, navigate]);

  // ── Toast ────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Sorting ──────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'artist') {
        cmp = a.artist.localeCompare(b.artist);
      } else if (sortKey === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else {
        cmp = (a.price_median ?? -1) - (b.price_median ?? -1);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [records, sortKey, sortDir]);

  // ── Inline condition update ──────────────────────────────────────
  const handleConditionChange = async (recordId: string, newCondition: string) => {
    setEditingId(null);
    try {
      const res = await fetch(`/api/sellr/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition: newCondition, session_id: sessionId }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setRecords(prev => prev.map(r => (r.id === recordId ? updated : r)));
    } catch {
      // Silent — user can retry
    }
  };

  // ── Tier selection ───────────────────────────────────────────────
  const handleSelectTier = async (tier: SellrTier) => {
    if (!session) return;
    try {
      const res = await fetch(`/api/sellr/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tier.id }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setSession(data.session);
    } catch {
      // Silent
    }
  };

  // ── Derived values ───────────────────────────────────────────────
  const pricedRecords = records.filter(r => r.price_median != null);
  const totalMedian = pricedRecords.reduce((sum, r) => sum + (r.price_median ?? 0), 0);
  const hasPricing = pricedRecords.length > 0;
  const tierSelected = session?.tier != null;

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) {
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
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-sellr-sage text-white px-4 py-2 rounded shadow-lg text-sm font-medium">
          <Check className="w-4 h-4" />
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* ── Section 1: Collection Summary ─────────────────────── */}
        <section className="pt-8 pb-6 border-b border-sellr-charcoal/10">
          <h1 className="font-display text-3xl md:text-4xl text-sellr-charcoal">
            Your Collection Appraisal
          </h1>
          <p className="mt-2 text-sellr-charcoal/60 text-lg">
            {records.length} record{records.length !== 1 ? 's' : ''}
            {hasPricing
              ? ` · Est. value ${fmtUsd(totalMedian)}`
              : ' · Pricing data loading — values will appear in your report.'}
          </p>
        </section>

        {/* ── Section 2: Record Table / Cards ────────────────────── */}
        <section className="py-8">
          {records.length === 0 ? (
            <p className="text-sellr-charcoal/40 text-center py-12">
              No records in this session yet.{' '}
              <Link
                to={`/sellr/scan?session=${sessionId}`}
                className="text-sellr-blue hover:text-sellr-blue-light underline"
              >
                Start scanning
              </Link>
            </p>
          ) : (
            <>
              {/* Sort controls — dropdown on mobile, inline on desktop */}
              <div className="flex items-center gap-2 mb-4 sm:hidden">
                <ArrowUpDown className="w-4 h-4 text-sellr-charcoal/40 flex-shrink-0" />
                <select
                  value={`${sortKey}_${sortDir}`}
                  onChange={e => {
                    const [key, dir] = e.target.value.split('_') as [SortKey, SortDir];
                    setSortKey(key);
                    setSortDir(dir);
                  }}
                  className="flex-1 text-sm px-3 py-2 rounded border border-sellr-charcoal/15 bg-white focus:outline-none focus:border-sellr-blue"
                >
                  <option value="artist_asc">Artist A–Z</option>
                  <option value="artist_desc">Artist Z–A</option>
                  <option value="title_asc">Title A–Z</option>
                  <option value="title_desc">Title Z–A</option>
                  <option value="price_median_asc">Value: Low → High</option>
                  <option value="price_median_desc">Value: High → Low</option>
                </select>
              </div>

              {/* ── Mobile card list ──────────────────────────────────── */}
              <div className="sm:hidden space-y-2">
                {sortedRecords.map(record => (
                  <div
                    key={record.id}
                    className="bg-sellr-surface rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      {record.cover_image ? (
                        <img
                          src={record.cover_image}
                          alt={`Cover for ${record.title} by ${record.artist}`}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-sellr-charcoal/5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{record.artist}</p>
                        <p className="text-sm text-sellr-charcoal/70 truncate">{record.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-sellr-charcoal/5">
                      <div className="flex items-center gap-2">
                        {record.year && (
                          <span className="text-xs text-sellr-charcoal/50">{record.year}</span>
                        )}
                        {editingId === record.id ? (
                          <select
                            defaultValue={record.condition}
                            onChange={e => handleConditionChange(record.id, e.target.value)}
                            onBlur={() => setEditingId(null)}
                            autoFocus
                            className="text-xs px-2 py-1 rounded border border-sellr-charcoal/20 bg-white focus:outline-none focus:border-sellr-blue"
                          >
                            {VALID_CONDITIONS.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingId(record.id)}
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded min-h-[32px] ${conditionColor(record.condition)}`}
                            title="Tap to change condition"
                          >
                            {record.condition}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                          </button>
                        )}
                      </div>
                      <span className="text-sm font-medium text-sellr-charcoal/70">
                        {record.price_median != null ? `~${fmtPrice(record.price_median)}` : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Desktop table ─────────────────────────────────────── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-sellr-charcoal/10 text-left text-xs text-sellr-charcoal/50 uppercase tracking-wide">
                      <th className="pb-3 pr-3 w-10"></th>
                      <th className="pb-3 pr-3">
                        <button
                          onClick={() => toggleSort('artist')}
                          className="flex items-center gap-1 hover:text-sellr-charcoal transition-colors"
                        >
                          Artist
                          <ArrowUpDown className={`w-3 h-3 ${sortKey === 'artist' ? 'text-sellr-blue' : ''}`} />
                        </button>
                      </th>
                      <th className="pb-3 pr-3">
                        <button
                          onClick={() => toggleSort('title')}
                          className="flex items-center gap-1 hover:text-sellr-charcoal transition-colors"
                        >
                          Title
                          <ArrowUpDown className={`w-3 h-3 ${sortKey === 'title' ? 'text-sellr-blue' : ''}`} />
                        </button>
                      </th>
                      <th className="pb-3 pr-3">Year</th>
                      <th className="pb-3 pr-3">Condition</th>
                      <th className="pb-3 text-right">
                        <button
                          onClick={() => toggleSort('price_median')}
                          className="flex items-center gap-1 ml-auto hover:text-sellr-charcoal transition-colors"
                        >
                          Est. Value
                          <ArrowUpDown className={`w-3 h-3 ${sortKey === 'price_median' ? 'text-sellr-blue' : ''}`} />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.map(record => (
                      <tr
                        key={record.id}
                        className="border-b border-sellr-charcoal/5 hover:bg-sellr-surface/50 transition-colors"
                      >
                        <td className="py-3 pr-3">
                          {record.cover_image ? (
                            <img
                              src={record.cover_image}
                              alt={`Cover for ${record.title} by ${record.artist}`}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-sellr-charcoal/5" />
                          )}
                        </td>
                        <td className="py-3 pr-3 font-medium truncate max-w-[140px]">
                          {record.artist}
                        </td>
                        <td className="py-3 pr-3 text-sellr-charcoal/70 truncate max-w-[160px]">
                          {record.title}
                        </td>
                        <td className="py-3 pr-3 text-sellr-charcoal/50">
                          {record.year ?? '—'}
                        </td>
                        <td className="py-3 pr-3">
                          {editingId === record.id ? (
                            <select
                              defaultValue={record.condition}
                              onChange={e => handleConditionChange(record.id, e.target.value)}
                              onBlur={() => setEditingId(null)}
                              autoFocus
                              className="text-xs px-2 py-1 rounded border border-sellr-charcoal/20 bg-white focus:outline-none focus:border-sellr-blue"
                            >
                              {VALID_CONDITIONS.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => setEditingId(record.id)}
                              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${conditionColor(record.condition)}`}
                              title="Click to change condition"
                            >
                              {record.condition}
                              <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                          )}
                        </td>
                        <td className="py-3 text-right text-sellr-charcoal/70">
                          {record.price_median != null ? `~${fmtPrice(record.price_median)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* ── Section 3: Tier Selector (if no tier chosen) ──────── */}
        {!tierSelected && (
          <section className="py-8 border-t border-sellr-charcoal/10">
            <h2 className="font-display text-2xl md:text-3xl text-center mb-2">
              Choose your plan
            </h2>
            <p className="text-center text-sellr-charcoal/60 mb-8 max-w-md mx-auto">
              Pay once, get your report. No subscriptions, no accounts required.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SELLR_TIERS.map(tier => {
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
                      {TIER_FEATURES.map(feature => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-sellr-charcoal/80">
                          <Check className="w-4 h-4 text-sellr-sage mt-0.5 flex-shrink-0" strokeWidth={2} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleSelectTier(tier)}
                      className={`mt-8 block text-center w-full px-5 py-3 rounded font-medium transition-colors ${
                        isPopular
                          ? 'bg-sellr-amber text-white hover:bg-sellr-amber-light'
                          : 'bg-sellr-blue text-white hover:bg-sellr-blue-light'
                      }`}
                    >
                      Select {tier.label}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Section 4: Checkout CTA (desktop inline) ──────────── */}
        <section className="py-8 border-t border-sellr-charcoal/10 hidden sm:block">
          <div className="relative group">
            <button
              disabled={!tierSelected}
              onClick={() => tierSelected && sessionId && navigate(`/sellr/checkout?session=${sessionId}`)}
              className={`w-full px-6 py-4 text-lg font-medium rounded transition-colors ${
                tierSelected
                  ? 'bg-sellr-amber text-white hover:bg-sellr-amber-light'
                  : 'bg-sellr-charcoal/10 text-sellr-charcoal/30 cursor-not-allowed'
              }`}
            >
              Get My Full Report
            </button>
            {!tierSelected && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-sellr-charcoal text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Select a plan above.
              </span>
            )}
          </div>

          <ul className="mt-6 space-y-2" role="list">
            {TIER_FEATURES.map(feature => (
              <li key={feature} className="flex items-center gap-2 text-sm text-sellr-charcoal/70">
                <Check className="w-4 h-4 text-sellr-sage flex-shrink-0" strokeWidth={2} />
                {feature}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-sellr-charcoal/50 text-center">
            Need to add more records?{' '}
            <Link
              to={`/sellr/scan?session=${sessionId}`}
              className="text-sellr-blue hover:text-sellr-blue-light underline"
            >
              Back to scanning
            </Link>
          </p>
        </section>

        {/* Desktop: back to scanning link */}
        <p className="sm:hidden pb-20 text-sm text-sellr-charcoal/50 text-center">
          Need to add more records?{' '}
          <Link
            to={`/sellr/scan?session=${sessionId}`}
            className="text-sellr-blue hover:text-sellr-blue-light underline"
          >
            Back to scanning
          </Link>
        </p>
      </div>

      {/* ── Mobile sticky bottom CTA ─────────────────────────────── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-sellr-charcoal/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          disabled={!tierSelected}
          onClick={() => tierSelected && sessionId && navigate(`/sellr/checkout?session=${sessionId}`)}
          className={`w-full px-6 py-3.5 text-base font-medium rounded transition-colors ${
            tierSelected
              ? 'bg-sellr-amber text-white hover:bg-sellr-amber-light'
              : 'bg-sellr-charcoal/10 text-sellr-charcoal/30 cursor-not-allowed'
          }`}
        >
          {tierSelected ? 'Get My Full Report' : 'Select a plan to continue'}
        </button>
      </div>
    </SellrLayout>
  );
};

export default ReviewPage;
