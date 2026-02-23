import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2, Check, ArrowUpDown, Download, Link2, ChevronDown, ChevronUp,
} from 'lucide-react';
import SellrLayout from '../components/SellrLayout';
import { useSellrMeta } from '../hooks/useSellrMeta';
import AdCopyPanel from '../components/AdCopyPanel';
import BulkCopyGenerator from '../components/BulkCopyGenerator';
import CollectionPost from '../components/CollectionPost';
import CopyExport from '../components/CopyExport';
import RekkrdNudge from '../components/RekkrdNudge';
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

// ── Sort types ──────────────────────────────────────────────────────

type SortKey = 'artist' | 'title' | 'price_median';
type SortDir = 'asc' | 'desc';

// ── ReportPage ──────────────────────────────────────────────────────

const ReportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');
  const reportToken = searchParams.get('token');

  const [session, setSession] = useState<SellrSession | null>(null);
  const [records, setRecords] = useState<SellrRecord[]>([]);
  const [order, setOrder] = useState<SellrOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // PDF download state
  const [pdfLoading, setPdfLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Table sort
  const [sortKey, setSortKey] = useState<SortKey>('artist');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Expanded row for ad copy
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Fetch report data ─────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId && !reportToken) {
      navigate('/sellr', { replace: true });
      return;
    }

    const url = reportToken
      ? `/api/sellr/report/token/${reportToken}`
      : `/api/sellr/report/session/${sessionId}`;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          navigate('/sellr', { replace: true });
          showToast('Report not found or payment incomplete.');
          return;
        }
        const data = await res.json();
        setSession(data.session);
        setRecords(data.records ?? []);
        setOrder(data.order ?? null);
      } catch {
        navigate('/sellr', { replace: true });
        showToast('Report not found or payment incomplete.');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, reportToken, navigate, showToast]);

  // ── Sorting ───────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
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
  }, [records, sortKey, sortDir]);

  // ── Derived stats ─────────────────────────────────────────────────
  const totalMedian = records.reduce((sum, r) => sum + (r.price_median ?? 0), 0);
  const totalLow = records.reduce((sum, r) => sum + (r.price_low ?? 0), 0);
  const totalHigh = records.reduce((sum, r) => sum + (r.price_high ?? 0), 0);

  // ── OG meta tags ──────────────────────────────────────────────────
  const reportUrl = useMemo(() => {
    const token = order?.report_token ?? reportToken;
    return token
      ? `${window.location.origin}/sellr/report?token=${token}`
      : undefined;
  }, [order, reportToken]);

  useSellrMeta({
    title: 'Your Vinyl Appraisal Report',
    description: records.length > 0
      ? `${records.length} records · Est. value $${Math.round(totalMedian).toLocaleString()}`
      : 'Your vinyl collection appraisal report.',
    url: reportUrl,
  });

  const standoutRecords = useMemo(() => {
    return records
      .filter(r => (r.price_median ?? 0) >= 20)
      .sort((a, b) => (b.price_median ?? 0) - (a.price_median ?? 0))
      .slice(0, 5);
  }, [records]);

  // Resolve the session_id for API calls (needed when accessed via token)
  const resolvedSessionId = session?.id ?? sessionId;

  // ── PDF download ──────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!resolvedSessionId || pdfLoading) return;
    setPdfLoading(true);

    try {
      const res = await fetch('/api/sellr/report/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: resolvedSessionId }),
      });

      if (!res.ok) throw new Error('PDF generation failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sellr-appraisal-${resolvedSessionId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast('PDF generation failed — please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Copy share link (uses report_token for public URL) ────────────
  const handleCopyLink = async () => {
    try {
      const token = order?.report_token ?? reportToken;
      const shareUrl = token
        ? `${window.location.origin}/sellr/report?token=${token}`
        : window.location.href;
      await navigator.clipboard.writeText(shareUrl);
      showToast('Copied!');
    } catch {
      showToast('Failed to copy link.');
    }
  };

  // ── Ad copy update handlers ─────────────────────────────────────
  const handleCopyUpdated = useCallback((recordId: string, adCopy: string) => {
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ad_copy: adCopy } : r));
  }, []);

  const handleAllCopyGenerated = useCallback((updatedRecords: SellrRecord[]) => {
    setRecords(updatedRecords);
  }, []);

  const handleSessionUpdated = useCallback((updatedSession: SellrSession) => {
    setSession(updatedSession);
  }, []);

  // ── Loading state ─────────────────────────────────────────────────
  if (!sessionId && !reportToken) return null;

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

      <div className="max-w-5xl mx-auto">
        {/* ── Section 1: Report Header ──────────────────────────── */}
        <section className="pt-8 pb-6 border-b border-sellr-charcoal/10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl md:text-4xl text-sellr-charcoal">
                Collection Appraisal Report
              </h1>
              <p className="mt-2 text-sellr-charcoal/60">
                Prepared by Sellr &middot; {order ? fmtDate(order.created_at) : fmtDate(new Date().toISOString())}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto">
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-sellr-charcoal/20 rounded text-sm font-medium text-sellr-charcoal hover:bg-sellr-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pdfLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {pdfLoading ? 'Generating...' : 'Download PDF'}
              </button>
              <button
                onClick={handleCopyLink}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-sellr-charcoal/20 rounded text-sm font-medium text-sellr-charcoal hover:bg-sellr-surface transition-colors"
              >
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Copy Share Link</span>
                <span className="sm:hidden">Share</span>
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="bg-sellr-surface rounded-lg p-5">
              <p className="text-xs text-sellr-charcoal/50 uppercase tracking-wide mb-1">Total Records</p>
              <p className="font-display text-3xl text-sellr-blue">{records.length}</p>
            </div>
            <div className="bg-sellr-surface rounded-lg p-5">
              <p className="text-xs text-sellr-charcoal/50 uppercase tracking-wide mb-1">Est. Collection Value</p>
              <p className="font-display text-3xl text-sellr-blue">{fmtUsd(totalMedian)}</p>
            </div>
            <div className="bg-sellr-surface rounded-lg p-5">
              <p className="text-xs text-sellr-charcoal/50 uppercase tracking-wide mb-1">Value Range</p>
              <p className="font-display text-3xl text-sellr-blue">
                {fmtUsd(totalLow)} <span className="text-lg text-sellr-charcoal/40">&mdash;</span> {fmtUsd(totalHigh)}
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 2: Standout Records ───────────────────────── */}
        {standoutRecords.length > 0 && (
          <section className="py-8 border-b border-sellr-charcoal/10">
            <h2 className="font-display text-2xl text-sellr-charcoal mb-5">
              Records Worth Noting
            </h2>
            <div className="flex gap-4 overflow-x-auto flex-nowrap pb-2 -mx-1 px-1">
              {standoutRecords.map(record => (
                <div
                  key={record.id}
                  className="flex-shrink-0 w-56 bg-sellr-surface rounded-lg p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {record.cover_image ? (
                      <img
                        src={record.cover_image}
                        alt={`Cover for ${record.title} by ${record.artist}`}
                        className="w-20 h-20 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded bg-sellr-charcoal/5 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{record.artist}</p>
                  <p className="text-sm text-sellr-charcoal/60 truncate">{record.title}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-display text-xl text-sellr-amber">
                      {fmtPrice(record.price_median!)}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${conditionColor(record.condition)}`}>
                      {record.condition}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 3: Full Record Table ──────────────────────── */}
        <section className="py-8 border-b border-sellr-charcoal/10">
          {/* Bulk ad copy generator */}
          {resolvedSessionId && records.length > 0 && (
            <BulkCopyGenerator
              sessionId={resolvedSessionId}
              records={records}
              onAllCopyGenerated={handleAllCopyGenerated}
            />
          )}

          {records.length === 0 ? (
            <p className="text-sellr-charcoal/40 text-center py-12">No records in this report.</p>
          ) : (
            <>
              {/* Mobile sort dropdown */}
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

              {/* ── Mobile card list ────────────────────────────────── */}
              <div className="sm:hidden space-y-2">
                {sortedRecords.map(record => {
                  const isExpanded = expandedId === record.id;
                  return (
                    <div key={record.id}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : record.id)}
                        className="w-full text-left bg-sellr-surface rounded-lg p-3"
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
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-sellr-charcoal/40 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-sellr-charcoal/40 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-sellr-charcoal/5">
                          <div className="flex items-center gap-2">
                            {record.year && (
                              <span className="text-xs text-sellr-charcoal/50">{record.year}</span>
                            )}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${conditionColor(record.condition)}`}>
                              {record.condition}
                            </span>
                            {record.ad_copy ? (
                              <span className="text-xs font-medium px-2 py-0.5 rounded bg-sellr-sage/20 text-sellr-sage">
                                Copy Ready
                              </span>
                            ) : (
                              <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                                Pending
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-sellr-charcoal/70">
                            {record.price_median != null ? `~${fmtPrice(record.price_median)}` : '—'}
                          </span>
                        </div>
                      </button>
                      {isExpanded && resolvedSessionId && (
                        <AdCopyPanel
                          record={record}
                          sessionId={resolvedSessionId}
                          onCopyUpdated={handleCopyUpdated}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop table ──────────────────────────────────── */}
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
                      <th className="pb-3 pr-3 text-right">
                        <button
                          onClick={() => toggleSort('price_median')}
                          className="flex items-center gap-1 ml-auto hover:text-sellr-charcoal transition-colors"
                        >
                          Est. Value
                          <ArrowUpDown className={`w-3 h-3 ${sortKey === 'price_median' ? 'text-sellr-blue' : ''}`} />
                        </button>
                      </th>
                      <th className="pb-3 pr-3 text-center">Ad Copy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.map(record => {
                      const isExpanded = expandedId === record.id;
                      return (
                        <React.Fragment key={record.id}>
                          <tr
                            onClick={() => setExpandedId(isExpanded ? null : record.id)}
                            className="border-b border-sellr-charcoal/5 hover:bg-sellr-surface/50 transition-colors cursor-pointer"
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
                              <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${conditionColor(record.condition)}`}>
                                {record.condition}
                              </span>
                            </td>
                            <td className="py-3 pr-3 text-right text-sellr-charcoal/70">
                              {record.price_median != null ? `~${fmtPrice(record.price_median)}` : '—'}
                            </td>
                            <td className="py-3 text-center">
                              <span className="inline-flex items-center gap-1">
                                {record.ad_copy ? (
                                  <span className="text-xs font-medium px-2 py-1 rounded bg-sellr-sage/20 text-sellr-sage">
                                    Ready
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium px-2 py-1 rounded bg-amber-100 text-amber-700">
                                    Pending
                                  </span>
                                )}
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3 text-sellr-charcoal/40" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-sellr-charcoal/40" />
                                )}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && resolvedSessionId && (
                            <tr>
                              <td colSpan={7} className="p-0">
                                <AdCopyPanel
                                  record={record}
                                  sessionId={resolvedSessionId}
                                  onCopyUpdated={handleCopyUpdated}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* ── Section 4: Collection Post Generator ────────────── */}
        {session && resolvedSessionId && records.length > 0 && (
          <section className="py-8 border-b border-sellr-charcoal/10">
            <CollectionPost
              session={session}
              records={records}
              sessionId={resolvedSessionId}
              onSessionUpdated={handleSessionUpdated}
            />
          </section>
        )}

        {/* ── Section 5: Copy Export ─────────────────────────────── */}
        {session && resolvedSessionId && (
          <section className="py-8 border-b border-sellr-charcoal/10">
            <CopyExport
              session={session}
              records={records}
              sessionId={resolvedSessionId}
            />
          </section>
        )}

        {/* ── Section 6: Rekkrd Conversion CTA ──────────────────── */}
        <section className="py-8 pb-24 sm:pb-8">
          <div className="bg-sellr-surface rounded-lg p-8 text-center">
            <h2 className="font-display text-2xl text-sellr-charcoal mb-2">
              Want to keep this collection forever?
            </h2>
            <p className="text-sellr-charcoal/60 mb-8 max-w-md mx-auto">
              Import your records into Rekkrd and track value over time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={`/signup?import=${resolvedSessionId}`}
                className="px-6 py-3 bg-sellr-blue text-white font-medium rounded hover:bg-sellr-blue-light transition-colors"
              >
                Create Free Rekkrd Account
              </Link>
              <Link
                to={`/login?import=${resolvedSessionId}`}
                className="text-sm text-sellr-blue hover:text-sellr-blue-light transition-colors"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Rekkrd conversion nudge — fixed bottom bar */}
      {resolvedSessionId && (order?.report_token || reportToken) && (
        <RekkrdNudge
          sessionId={resolvedSessionId}
          recordCount={records.length}
          reportToken={(order?.report_token ?? reportToken)!}
        />
      )}
    </SellrLayout>
  );
};

export default ReportPage;
