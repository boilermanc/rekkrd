import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2, Check, Copy, ChevronDown, ChevronUp, Link2,
} from 'lucide-react';
import SellrLayout from '../components/SellrLayout';
import RekkrdNudge from '../components/RekkrdNudge';
import { supabase } from '../../../services/supabaseService';
import type { SellrSession, SellrRecord, SellrOrder } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────

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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function conditionColor(condition: string): string {
  if (condition === 'M' || condition === 'NM') return 'bg-sellr-sage/20 text-sellr-sage';
  if (condition === 'VG+' || condition === 'VG') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-500';
}

// ── Types ───────────────────────────────────────────────────────────

interface LotCalculation {
  total_median: number;
  total_low: number;
  total_high: number;
  priced_count: number;
  unpriced_count: number;
  lot_prices: {
    quick_sale: number;
    fair: number;
    collector: number;
  };
  record_count: number;
}

// ── LotReportPage ───────────────────────────────────────────────────

const LotReportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');

  const [session, setSession] = useState<SellrSession | null>(null);
  const [records, setRecords] = useState<SellrRecord[]>([]);
  const [order, setOrder] = useState<SellrOrder | null>(null);
  const [lotData, setLotData] = useState<LotCalculation | null>(null);
  const [loading, setLoading] = useState(true);

  const [showRecords, setShowRecords] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Fetch session + lot data ──────────────────────────────────────
  useEffect(() => {
    if (!sessionId) {
      navigate('/sellr', { replace: true });
      return;
    }

    (async () => {
      try {
        // Get auth token for lot/calculate
        const authSession = await supabase?.auth.getSession();
        const token = authSession?.data?.session?.access_token;

        // Fetch session + records and lot calculation in parallel
        const [sessionRes, lotRes] = await Promise.all([
          fetch(`/api/sellr/sessions/${sessionId}`),
          token
            ? fetch(`/api/sellr/lot/${sessionId}/calculate`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              })
            : Promise.resolve(null),
        ]);

        if (!sessionRes.ok) {
          navigate('/sellr', { replace: true });
          showToast('Session not found or expired.');
          return;
        }

        const sessionData = await sessionRes.json();
        setSession(sessionData.session);
        setRecords(sessionData.records ?? []);
        setOrder(sessionData.order ?? null);

        if (lotRes && lotRes.ok) {
          const lotJson = await lotRes.json();
          setLotData(lotJson);
        }
      } catch {
        navigate('/sellr', { replace: true });
        showToast('Failed to load lot report.');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, navigate, showToast]);

  // ── Derived values ────────────────────────────────────────────────
  const totalMedian = records.reduce((sum, r) => sum + (r.price_median ?? 0), 0);
  const askingPrice = lotData?.lot_prices.fair ?? Math.round(totalMedian * 0.65);
  const reportToken = order?.report_token ?? null;

  // ── Copy handlers ─────────────────────────────────────────────────
  const copyToClipboard = async (text: string, onSuccess: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
      onSuccess();
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      onSuccess();
    }
  };

  const handleCopyPost = () => {
    if (!session?.collection_ad_copy) return;
    copyToClipboard(session.collection_ad_copy, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyLink = () => {
    const shareUrl = reportToken
      ? `${window.location.origin}/sellr/lot?token=${reportToken}`
      : window.location.href;
    copyToClipboard(shareUrl, () => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      showToast('Link copied!');
    });
  };

  // ── Loading / guard ───────────────────────────────────────────────
  if (!sessionId) return null;

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

      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* ── Section 1: Report Header ──────────────────────────── */}
        <section className="pb-6 border-b border-sellr-charcoal/10">
          <h1 className="font-display text-3xl md:text-4xl text-sellr-charcoal">
            Lot Appraisal Report
          </h1>
          <p className="mt-2 text-sm text-sellr-charcoal/60">
            {fmtDate(new Date().toISOString())}
            {sessionId && (
              <span className="ml-2 text-sellr-charcoal/40">
                &middot; {sessionId.slice(-8)}
              </span>
            )}
          </p>
          <p className="mt-1 text-sellr-charcoal/70">
            {records.length} Records &middot; Est. {fmtUsd(totalMedian)}
          </p>
        </section>

        {/* ── Section 2: Lot Price Card ─────────────────────────── */}
        <section className="py-8 border-b border-sellr-charcoal/10">
          <div className="bg-sellr-amber/10 border border-sellr-amber/30 rounded-lg p-6 text-center">
            <p className="text-xs text-sellr-charcoal/50 uppercase tracking-wide mb-2">
              Asking Price
            </p>
            <p className="font-display text-5xl text-sellr-charcoal">
              {fmtUsd(askingPrice)}
            </p>
            <p className="text-sm text-sellr-charcoal/50 mt-2">
              Based on live Discogs market data
            </p>

            {/* Price tier chips */}
            {lotData && (
              <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
                <span className="text-xs px-3 py-1 rounded-full bg-white border border-sellr-charcoal/10 text-sellr-charcoal/70">
                  Quick Sale {fmtUsd(lotData.lot_prices.quick_sale)}
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-sellr-amber/20 border border-sellr-amber/40 text-sellr-charcoal font-medium">
                  Fair {fmtUsd(lotData.lot_prices.fair)}
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-white border border-sellr-charcoal/10 text-sellr-charcoal/70">
                  Collector {fmtUsd(lotData.lot_prices.collector)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 3: Facebook Post ──────────────────────────── */}
        {session?.collection_ad_copy && (
          <section className="py-8 border-b border-sellr-charcoal/10">
            <h2 className="font-display text-2xl text-sellr-charcoal mb-4">
              Facebook Marketplace Post
            </h2>
            <div className="bg-sellr-surface rounded-lg p-5">
              <p className="text-sm text-sellr-charcoal leading-relaxed whitespace-pre-wrap">
                {session.collection_ad_copy}
              </p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-sellr-charcoal/5">
                <Link
                  to={`/sellr/review?session=${sessionId}`}
                  className="text-xs text-sellr-blue hover:text-sellr-blue-light transition-colors"
                >
                  Edit in scanner
                </Link>
                <button
                  onClick={handleCopyPost}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    copied
                      ? 'bg-sellr-sage text-white'
                      : 'bg-sellr-amber text-white hover:bg-sellr-amber-light'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Post
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── Section 4: Full Record List (collapsible) ─────────── */}
        <section className="py-8 border-b border-sellr-charcoal/10">
          <button
            onClick={() => setShowRecords(prev => !prev)}
            className="flex items-center gap-2 text-sm font-medium text-sellr-charcoal hover:text-sellr-blue transition-colors"
          >
            View all {records.length} records
            {showRecords ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showRecords && records.length > 0 && (
            <div className="mt-4">
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-sellr-charcoal/10 text-left text-xs text-sellr-charcoal/50 uppercase tracking-wide">
                      <th className="pb-3 pr-3">Artist</th>
                      <th className="pb-3 pr-3">Title</th>
                      <th className="pb-3 pr-3">Year</th>
                      <th className="pb-3 pr-3">Condition</th>
                      <th className="pb-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(record => (
                      <tr
                        key={record.id}
                        className="border-b border-sellr-charcoal/5"
                      >
                        <td className="py-3 pr-3 font-medium truncate max-w-[160px]">
                          {record.artist}
                        </td>
                        <td className="py-3 pr-3 text-sellr-charcoal/70 truncate max-w-[180px]">
                          {record.title}
                        </td>
                        <td className="py-3 pr-3 text-sellr-charcoal/50">
                          {record.year ?? '—'}
                        </td>
                        <td className="py-3 pr-3">
                          <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${conditionColor(record.condition)}`}>
                            {record.condition}
                          </span>
                        </td>
                        <td className="py-3 text-right text-sellr-charcoal/70">
                          {record.price_median != null ? fmtPrice(record.price_median) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden space-y-2">
                {records.map(record => (
                  <div
                    key={record.id}
                    className="bg-sellr-surface rounded-lg p-3"
                  >
                    <p className="text-sm font-medium truncate">{record.artist}</p>
                    <p className="text-sm text-sellr-charcoal/70 truncate">{record.title}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-sellr-charcoal/5">
                      <div className="flex items-center gap-2">
                        {record.year && (
                          <span className="text-xs text-sellr-charcoal/50">{record.year}</span>
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${conditionColor(record.condition)}`}>
                          {record.condition}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-sellr-charcoal/70">
                        {record.price_median != null ? fmtPrice(record.price_median) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Section 5: Share Section ───────────────────────────── */}
        <section className="py-8 border-b border-sellr-charcoal/10">
          <h2 className="font-display text-2xl text-sellr-charcoal mb-4">
            Share this appraisal
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm font-medium rounded transition-colors ${
                linkCopied
                  ? 'bg-sellr-sage text-white'
                  : 'border border-sellr-charcoal/20 text-sellr-charcoal hover:bg-sellr-surface'
              }`}
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </section>

        {/* ── Section 6: Rekkrd Conversion CTA ──────────────────── */}
        <section className="py-8 pb-24 sm:pb-8">
          <div className="bg-sellr-surface rounded-lg p-8 text-center">
            <h2 className="font-display text-2xl text-sellr-charcoal mb-2">
              Want to track your collection permanently?
            </h2>
            <p className="text-sellr-charcoal/60 mb-8 max-w-md mx-auto">
              Import to Rekkrd — free forever for up to 100 albums.
            </p>
            <Link
              to={`/sellr/import?session=${sessionId}`}
              className="inline-block px-6 py-3 bg-sellr-blue text-white font-medium rounded hover:bg-sellr-blue-light transition-colors"
            >
              Import to Rekkrd
            </Link>
          </div>
        </section>
      </div>

      {/* Rekkrd conversion nudge — fixed bottom bar */}
      {sessionId && reportToken && (
        <RekkrdNudge
          sessionId={sessionId}
          recordCount={records.length}
          reportToken={reportToken}
        />
      )}
    </SellrLayout>
  );
};

export default LotReportPage;
