import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Camera, Search, Loader2, Plus, X, Check, AlertCircle, ScanLine, Image } from 'lucide-react';
import SellrLayout from '../components/SellrLayout';
import SellrSidebar from '../components/SellrSidebar';
import SideBPromptModal from '../../components/SideBPromptModal';
import LabelScanResultModal from '../../components/LabelScanResultModal';
import { useSellrMeta } from '../hooks/useSellrMeta';
import { useSellrSession } from '../hooks/useSellrSession';
import { useSellrScanner, type LabelScanMetadata } from '../hooks/useSellrScanner';
import { useSellrSearch, type SellrSearchResult } from '../hooks/useSellrSearch';
import { SELLR_TIERS } from '../types';
import type { SellrRecord } from '../types';
import type { LabelScanResult } from '../../types';

const STORAGE_KEY = 'sellr_session_id';
const VALID_TIERS = ['starter', 'standard', 'full'] as const;

// ── Session bootstrap ────────────────────────────────────────────────

async function createSession(tier?: string): Promise<string> {
  const body: Record<string, string> = {};
  if (tier && VALID_TIERS.includes(tier as typeof VALID_TIERS[number])) {
    body.tier = tier;
  }

  const res = await fetch('/api/sellr/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error('Failed to create session');
  const data = await res.json();
  const id: string = data.session_id;

  // Store in localStorage as cookie fallback (httpOnly cookie set by server)
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}

async function patchSessionTier(sessionId: string, tier: string): Promise<void> {
  await fetch(`/api/sellr/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier }),
  });
}

// ── Tab type ─────────────────────────────────────────────────────────

type Tab = 'scan' | 'search';

// ── ScanPage ─────────────────────────────────────────────────────────

const ScanPage: React.FC = () => {
  useSellrMeta({
    title: 'Appraise Your Collection',
    description: 'Scan or search your records to get live market pricing.',
  });

  const [searchParams] = useSearchParams();
  const tierParam = searchParams.get('tier');

  const { session, records, loading: sessionLoading, refreshSession } = useSellrSession();
  const [bootstrapping, setBootstrapping] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('scan');

  // Toast state
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Tier-limit modal
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Low-slot warning dismissal
  const [lowSlotsDismissed, setLowSlotsDismissed] = useState(false);

  // Search adding — track which result is being added
  const [addingId, setAddingId] = useState<number | null>(null);

  // Scan mode toggle
  const [scanMode, setScanMode] = useState<'cover' | 'label'>('cover');

  // Label scan state
  const [labelScanLoading, setLabelScanLoading] = useState(false);
  const [labelScanError, setLabelScanError] = useState<string | null>(null);
  const [showSideBPrompt, setShowSideBPrompt] = useState(false);
  const [pendingSideBResult, setPendingSideBResult] = useState<LabelScanResult | null>(null);
  const [pendingLabelRecord, setPendingLabelRecord] = useState<LabelScanMetadata | null>(null);
  const [savingLabel, setSavingLabel] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const handleRecordAdded = useCallback((_record: SellrRecord) => {
    refreshSession();
    showToast('Added!');
    setAddingId(null);
  }, [refreshSession, showToast]);

  const handleRecordDeleted = useCallback(() => {
    refreshSession();
  }, [refreshSession]);

  const scanner = useSellrScanner({
    sessionId: session?.id ?? null,
    onRecordAdded: handleRecordAdded,
  });

  const searcher = useSellrSearch({
    sessionId: session?.id ?? null,
    onRecordAdded: handleRecordAdded,
  });

  // Show tier limit modal when scanner detects it
  useEffect(() => {
    if (scanner.tierLimitReached) setShowLimitModal(true);
  }, [scanner.tierLimitReached]);

  // ── Bootstrap session on mount ───────────────────────────────────
  useEffect(() => {
    if (sessionLoading || session || bootstrapping) return;

    let cancelled = false;
    setBootstrapping(true);

    (async () => {
      try {
        const id = await createSession(tierParam ?? undefined);

        // If tier param exists but wasn't included in create (edge case), patch it
        if (tierParam && VALID_TIERS.includes(tierParam as typeof VALID_TIERS[number])) {
          await patchSessionTier(id, tierParam);
        }

        if (!cancelled) await refreshSession();
      } catch (err) {
        console.error('[sellr] Session bootstrap failed:', err);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionLoading, session, bootstrapping, tierParam, refreshSession]);

  // ── File input ref ───────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Label scan helpers ──────────────────────────────────────────
  const saveLabelRecord = useCallback(async (meta: LabelScanMetadata, matrix?: string) => {
    if (!session?.id) return;
    const artist = meta.labelResult?.artist || '';
    const title = meta.labelResult?.album_title || '';

    let discogs_id: string | null = null;
    if (meta.discogs_url) {
      const match = meta.discogs_url.match(/\/release\/(\d+)/);
      if (match) discogs_id = match[1];
    }

    const res = await fetch('/api/sellr/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id,
        title,
        artist,
        year: meta.pressing_year ?? null,
        label: meta.label ?? null,
        condition: 'VG',
        discogs_id,
        cover_image: meta.cover_url || null,
        price_low: meta.price_low ?? null,
        price_median: meta.price_median ?? null,
        price_high: meta.price_high ?? null,
        ...(matrix ? { matrix } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Save failed' }));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    const record: SellrRecord = await res.json();
    handleRecordAdded(record);
  }, [session?.id, handleRecordAdded]);

  const handleLabelFileChange = useCallback(async (file: File) => {
    setLabelScanLoading(true);
    setLabelScanError(null);
    setPendingLabelRecord(null);

    try {
      const meta = await scanner.scanFromLabel(file);

      if (meta.sideB && meta.labelResult) {
        setPendingSideBResult(meta.labelResult);
        setShowSideBPrompt(true);
        return;
      }

      setPendingLabelRecord(meta);
    } catch (err) {
      setLabelScanError((err as Error).message || 'Label scan failed');
    } finally {
      setLabelScanLoading(false);
    }
  }, [scanner]);

  const handleSideBSkip = useCallback(async () => {
    setShowSideBPrompt(false);
    if (!pendingSideBResult || !session?.id) return;

    setLabelScanLoading(true);
    setLabelScanError(null);

    try {
      // Fetch metadata using the Side B data
      const artist = pendingSideBResult.artist || '';
      const title = pendingSideBResult.album_title || '';

      const metaRes = await fetch('/api/sellr/scan/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          artist,
          title,
          catalog_number: pendingSideBResult.catalog_number ?? undefined,
        }),
      });

      let metadata: LabelScanMetadata = {
        sideB: false,
        labelResult: pendingSideBResult,
      };

      if (metaRes.ok) {
        const data = await metaRes.json();
        const yearStr = pendingSideBResult.year ?? (typeof data.year === 'string' ? data.year : undefined);
        const parsedYear = yearStr ? parseInt(yearStr, 10) : undefined;
        metadata = {
          ...metadata,
          catalog_number: pendingSideBResult.catalog_number ?? undefined,
          label: pendingSideBResult.label_name ?? (typeof data.label === 'string' ? data.label : undefined),
          year: yearStr,
          pressing_year: parsedYear && !isNaN(parsedYear) ? parsedYear : undefined,
          cover_url: typeof data.cover_url === 'string' ? data.cover_url : undefined,
          price_low: typeof data.price_low === 'number' ? data.price_low : undefined,
          price_median: typeof data.price_median === 'number' ? data.price_median : undefined,
          price_high: typeof data.price_high === 'number' ? data.price_high : undefined,
          discogs_url: typeof data.discogs_url === 'string' ? data.discogs_url : undefined,
        };
      }

      setPendingLabelRecord(metadata);
    } catch (err) {
      setLabelScanError((err as Error).message || 'Save failed');
    } finally {
      setLabelScanLoading(false);
      setPendingSideBResult(null);
    }
  }, [pendingSideBResult, session?.id]);

  const handleSideBScanA = useCallback(() => {
    setShowSideBPrompt(false);
    // Keep pendingSideBResult — user will scan again with label mode
  }, []);

  const handleConfirmLabel = useCallback(async (matrix: string) => {
    if (!pendingLabelRecord) return;
    setSavingLabel(true);
    setLabelScanError(null);
    try {
      await saveLabelRecord(pendingLabelRecord, matrix || undefined);
      setPendingLabelRecord(null);
    } catch (err) {
      setLabelScanError((err as Error).message || 'Save failed');
    } finally {
      setSavingLabel(false);
    }
  }, [pendingLabelRecord, saveLabelRecord]);

  const handleRetryLabel = useCallback(() => {
    setPendingLabelRecord(null);
    setLabelScanError(null);
    // Open file picker for a new scan
    fileInputRef.current?.click();
  }, []);

  const handleDiscardLabel = useCallback(() => {
    setPendingLabelRecord(null);
    setLabelScanError(null);
  }, []);

  // ── Search submit ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) searcher.search(searchQuery);
  };

  const handleAddResult = (result: SellrSearchResult) => {
    setAddingId(result.id);
    searcher.addResult(result);
  };

  // ── Loading state ────────────────────────────────────────────────
  if (sessionLoading || bootstrapping) {
    return (
      <SellrLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-sellr-blue animate-spin" />
        </div>
      </SellrLayout>
    );
  }

  const currentTier = session?.tier
    ? SELLR_TIERS.find(t => t.id === session.tier)
    : null;

  return (
    <SellrLayout>
      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-sellr-sage text-white px-4 py-2 rounded shadow-lg text-sm font-medium">
          <Check className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* ── Tier Limit Modal ──────────────────────────────────── */}
      {showLimitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Tier limit reached"
        >
          <div className="bg-white rounded-lg p-8 max-w-md w-full relative max-sm:fixed max-sm:inset-0 max-sm:max-w-none max-sm:rounded-none max-sm:flex max-sm:flex-col max-sm:justify-center">
            <button
              onClick={() => setShowLimitModal(false)}
              className="absolute top-3 right-3 text-sellr-charcoal/40 hover:text-sellr-charcoal"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-2xl text-sellr-charcoal mb-2">
              Tier limit reached
            </h2>
            <p className="text-sellr-charcoal/70 mb-1">
              Your <strong>{currentTier?.label ?? 'current'}</strong> plan supports up to{' '}
              <strong>{currentTier?.record_limit ?? '—'}</strong> records.
            </p>
            <p className="text-sellr-charcoal/70 mb-6">
              Upgrade to appraise more records in this session.
            </p>
            <Link
              to="/sellr#pricing"
              className="block text-center px-5 py-3 bg-sellr-amber text-white font-medium rounded hover:bg-sellr-amber-light transition-colors"
            >
              View Plans
            </Link>
          </div>
        </div>
      )}

      {/* ── Slot exhaustion banner ─────────────────────────────── */}
      {scanner.noSlots && (
        <div className="flex items-start gap-3 bg-sellr-amber/10 border border-sellr-amber rounded-lg p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-sellr-amber flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-sellr-charcoal">
              You've used all your record slots.
            </p>
            <p className="text-sm text-sellr-charcoal/60 mt-0.5">
              Purchase more slots to keep scanning.
            </p>
          </div>
          <Link
            to="/sellr/start"
            className="flex-shrink-0 px-4 py-2 bg-sellr-amber text-white text-sm font-medium rounded hover:bg-sellr-amber-light transition-colors"
          >
            Buy More Slots
          </Link>
        </div>
      )}

      {/* ── Low-slot warning banner ────────────────────────────── */}
      {!scanner.noSlots && scanner.slotsRemaining > 0 && scanner.slotsRemaining <= 5 && !lowSlotsDismissed && (
        <div className="flex items-center gap-3 bg-sellr-amber/5 border border-sellr-amber/30 rounded-lg p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-sellr-amber flex-shrink-0" />
          <p className="flex-1 text-sm text-sellr-charcoal/70">
            Only {scanner.slotsRemaining} slot{scanner.slotsRemaining !== 1 ? 's' : ''} remaining &mdash; scan your most important records first.
          </p>
          <button
            onClick={() => setLowSlotsDismissed(true)}
            className="flex-shrink-0 p-1 text-sellr-charcoal/30 hover:text-sellr-charcoal/60 transition-colors"
            aria-label="Dismiss warning"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Left: Scan / Search ──────────────────────────────── */}
        <section
          className={`lg:w-[60%] w-full ${scanner.noSlots ? 'opacity-50 pointer-events-none' : ''}`}
          aria-label="Record input"
          aria-disabled={scanner.noSlots || undefined}
        >
          {/* Tab bar */}
          <div className="flex border-b border-sellr-charcoal/10 mb-6" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'scan'}
              onClick={() => setActiveTab('scan')}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === 'scan'
                  ? 'border-sellr-blue text-sellr-blue'
                  : 'border-transparent text-sellr-charcoal/50 hover:text-sellr-charcoal/80'
              }`}
            >
              <Camera className="w-4 h-4" />
              Scan
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'search'}
              onClick={() => setActiveTab('search')}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === 'search'
                  ? 'border-sellr-blue text-sellr-blue'
                  : 'border-transparent text-sellr-charcoal/50 hover:text-sellr-charcoal/80'
              }`}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>

          {/* ── Scan tab ────────────────────────────────────────── */}
          {activeTab === 'scan' && (
            <div role="tabpanel" aria-label="Scan records">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  e.target.value = '';
                  if (scanMode === 'label') {
                    handleLabelFileChange(file);
                  } else {
                    scanner.scanFromFile(file);
                  }
                }}
                className="hidden"
                aria-hidden="true"
              />

              {/* ── Mode toggle ──────────────────────────────────── */}
              <div className="flex rounded-lg border border-sellr-charcoal/10 mb-4 overflow-hidden">
                <button
                  onClick={() => setScanMode('cover')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                    scanMode === 'cover'
                      ? 'bg-sellr-blue text-white'
                      : 'bg-sellr-surface text-sellr-charcoal/60 hover:text-sellr-charcoal/80'
                  }`}
                >
                  <Image className="w-4 h-4" />
                  Cover
                </button>
                <button
                  onClick={() => setScanMode('label')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                    scanMode === 'label'
                      ? 'bg-sellr-blue text-white'
                      : 'bg-sellr-surface text-sellr-charcoal/60 hover:text-sellr-charcoal/80'
                  }`}
                >
                  <ScanLine className="w-4 h-4" />
                  Label
                </button>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={scanner.isScanning || labelScanLoading}
                className="relative w-full aspect-[4/3] min-h-[200px] border-2 border-dashed border-sellr-charcoal/20 rounded-lg flex flex-col items-center justify-center gap-4 hover:border-sellr-blue/40 hover:bg-sellr-surface/50 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                {(scanner.isScanning || labelScanLoading) ? (
                  <>
                    <Loader2 className="w-12 h-12 text-sellr-blue animate-spin" />
                    <span className="text-sm text-sellr-charcoal/60">
                      {labelScanLoading ? 'Reading label...' : 'Identifying and appraising...'}
                    </span>
                  </>
                ) : scanMode === 'label' ? (
                  <>
                    <ScanLine className="w-12 h-12 text-sellr-charcoal/30" strokeWidth={1.2} />
                    <span className="text-sm text-sellr-charcoal/50">Photograph the label</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-12 h-12 text-sellr-charcoal/30" strokeWidth={1.2} />
                    <span className="text-sm text-sellr-charcoal/50">Photograph your record</span>
                  </>
                )}
              </button>

              {scanner.scanError && !scanner.tierLimitReached && !scanner.noSlots && scanMode === 'cover' && (
                <p className="mt-3 text-sm text-red-600">{scanner.scanError}</p>
              )}

              {labelScanError && scanMode === 'label' && !pendingLabelRecord && (
                <p className="mt-3 text-sm text-red-600">{labelScanError}</p>
              )}

              {scanMode === 'label' && !pendingLabelRecord && (
                <p className="mt-3 text-xs text-sellr-charcoal/50 text-center italic">
                  Point at the label — the paper circle in the center. Fill the frame, avoid glare. Side A preferred.
                </p>
              )}

              {session && (
                <p className="mt-4 text-xs text-sellr-charcoal/40 text-center">
                  {session.record_count} / {currentTier?.record_limit ?? '—'} records
                </p>
              )}
            </div>
          )}

          {/* ── Search tab ──────────────────────────────────────── */}
          {activeTab === 'search' && (
            <div role="tabpanel" aria-label="Search records">
              <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sellr-charcoal/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by artist, album, or barcode..."
                    className="w-full pl-10 pr-4 py-3 bg-sellr-surface rounded border border-sellr-charcoal/10 text-sm placeholder:text-sellr-charcoal/40 focus:outline-none focus:border-sellr-blue/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searcher.isSearching || !searchQuery.trim()}
                  className="px-5 py-3 bg-sellr-blue text-white text-sm font-medium rounded hover:bg-sellr-blue-light transition-colors disabled:opacity-50"
                >
                  {searcher.isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Search'
                  )}
                </button>
              </form>

              {searcher.searchError && (
                <p className="mb-4 text-sm text-red-600">{searcher.searchError}</p>
              )}

              {searcher.results.length > 0 && (
                <ul className="space-y-2" role="list">
                  {searcher.results.map(result => {
                    const isThisAdding = searcher.isAdding && addingId === result.id;
                    return (
                      <li
                        key={result.id}
                        className="flex items-center gap-3 bg-sellr-surface rounded-lg p-3"
                      >
                        {result.thumb ? (
                          <img
                            src={result.thumb}
                            alt={`Cover for ${result.title} by ${result.artist}`}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-sellr-charcoal/5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.artist}</p>
                          <p className="text-sm text-sellr-charcoal/60 truncate">{result.title}</p>
                          <p className="text-xs text-sellr-charcoal/40">
                            {[result.year, result.label, result.format].filter(Boolean).join(' · ')}
                          </p>
                          {result.notes && (
                            <div className="mt-2 text-xs text-sellr-charcoal/60 leading-relaxed line-clamp-3 font-['Inter']">
                              {result.notes}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddResult(result)}
                          disabled={searcher.isAdding}
                          className="flex-shrink-0 flex items-center gap-1 px-4 py-2 min-h-[44px] bg-sellr-amber text-white text-sm font-medium rounded hover:bg-sellr-amber-light transition-colors disabled:opacity-50"
                          aria-label={`Add ${result.title} by ${result.artist}`}
                        >
                          {isThisAdding ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          Add
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!searcher.isSearching && searcher.results.length === 0 && searchQuery.trim() && (
                <p className="text-sm text-sellr-charcoal/40 text-center py-8">
                  No results. Try a different search term.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Right: Record sidebar ──────────────────────────────── */}
        <SellrSidebar
          session={session}
          records={records}
          onRecordDeleted={handleRecordDeleted}
        />
      </div>

      {/* ── Side B Prompt ──────────────────────────────────────── */}
      <SideBPromptModal
        isOpen={showSideBPrompt}
        onScanA={handleSideBScanA}
        onSkip={handleSideBSkip}
      />

      {/* ── Label Scan Result Modal ───────────────────────── */}
      <LabelScanResultModal
        isOpen={!!pendingLabelRecord}
        brand="sellr"
        catalogNumber={pendingLabelRecord?.labelResult?.catalog_number ?? null}
        labelName={pendingLabelRecord?.labelResult?.label_name ?? null}
        artist={pendingLabelRecord?.labelResult?.artist ?? null}
        title={pendingLabelRecord?.labelResult?.album_title ?? null}
        year={pendingLabelRecord?.year ?? null}
        side={pendingLabelRecord?.labelResult?.side ?? null}
        confidenceScore={pendingLabelRecord?.labelResult?.confidence_score ?? 0}
        discogsMatch={pendingLabelRecord?.discogs_url ? {
          artist: pendingLabelRecord.labelResult?.artist || '',
          title: pendingLabelRecord.labelResult?.album_title || '',
          label: pendingLabelRecord.label || '',
          year: pendingLabelRecord.year || '',
          thumb: pendingLabelRecord.cover_url || null,
        } : null}
        showMatrix
        confirmLabel="Save to Listing"
        onConfirm={handleConfirmLabel}
        onRetry={handleRetryLabel}
        onCancel={handleDiscardLabel}
      />
    </SellrLayout>
  );
};

export default ScanPage;
