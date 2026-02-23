import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Camera, Search, Loader2, Plus, X, Check } from 'lucide-react';
import SellrLayout from '../components/SellrLayout';
import SellrSidebar from '../components/SellrSidebar';
import { useSellrMeta } from '../hooks/useSellrMeta';
import { useSellrSession } from '../hooks/useSellrSession';
import { useSellrScanner } from '../hooks/useSellrScanner';
import { useSellrSearch, type SellrSearchResult } from '../hooks/useSellrSearch';
import { SELLR_TIERS } from '../types';
import type { SellrRecord } from '../types';

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
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // Tier-limit modal
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Search adding — track which result is being added
  const [addingId, setAddingId] = useState<number | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      scanner.scanFromFile(file);
      // Reset so the same file can be re-selected
      e.target.value = '';
    }
  };

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

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Left: Scan / Search ──────────────────────────────── */}
        <section className="lg:w-[60%] w-full" aria-label="Record input">
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
                onChange={handleFileChange}
                className="hidden"
                aria-hidden="true"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={scanner.isScanning}
                className="relative w-full aspect-[4/3] min-h-[200px] border-2 border-dashed border-sellr-charcoal/20 rounded-lg flex flex-col items-center justify-center gap-4 hover:border-sellr-blue/40 hover:bg-sellr-surface/50 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                {scanner.isScanning ? (
                  <>
                    <Loader2 className="w-12 h-12 text-sellr-blue animate-spin" />
                    <span className="text-sm text-sellr-charcoal/60">Identifying and appraising...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-12 h-12 text-sellr-charcoal/30" strokeWidth={1.2} />
                    <span className="text-sm text-sellr-charcoal/50">Photograph your record</span>
                  </>
                )}
              </button>

              {scanner.scanError && !scanner.tierLimitReached && (
                <p className="mt-3 text-sm text-red-600">{scanner.scanError}</p>
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
    </SellrLayout>
  );
};

export default ScanPage;
