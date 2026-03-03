import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseService';
import { wantlistService } from '../services/wantlistService';
import { useToast } from '../contexts/ToastContext';
import SpinningRecord from './SpinningRecord';
import Pagination from './Pagination';
import DiscogsAttribution from './DiscogsAttribution';
import type { DiscogsBasicInformation, DiscogsPagination, NewWantlistItem } from '../types';

// ── Discogs wantlist API types ────────────────────────────────────

interface DiscogsWantItem {
  id: number;
  basic_information: DiscogsBasicInformation;
}

interface DiscogsWantlistResponse {
  wants: DiscogsWantItem[];
  pagination: DiscogsPagination;
}

// Strip Discogs artist disambiguation suffix: "Phil Collins (2)" → "Phil Collins"
const DISCOGS_ARTIST_SUFFIX = / \(\d+\)$/;

function formatArtist(want: DiscogsWantItem): string {
  const raw = want.basic_information.artists?.[0]?.name || 'Unknown Artist';
  return raw.replace(DISCOGS_ARTIST_SUFFIX, '');
}

function mapToNewWantlistItem(want: DiscogsWantItem): NewWantlistItem {
  const info = want.basic_information;
  const artist = info.artists?.[0]?.name?.replace(DISCOGS_ARTIST_SUFFIX, '') || 'Unknown Artist';
  return {
    artist,
    title: info.title,
    year: info.year ? info.year.toString() : null,
    genre: info.genres?.[0] || null,
    cover_url: info.cover_image || null,
    discogs_release_id: info.id,
    discogs_url: `https://www.discogs.com/release/${info.id}`,
    price_low: null,
    price_median: null,
    price_high: null,
  };
}

// ── Vinyl placeholder icon ────────────────────────────────────────

const VinylPlaceholder: React.FC = () => (
  <svg className="w-5 h-5 text-th-text3/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
  </svg>
);

// ── Auth helpers ──────────────────────────────────────────────────

const PER_PAGE = 50;

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ── Props ─────────────────────────────────────────────────────────

interface DiscogsWantlistBrowserProps {
  onImportComplete: () => void;
}

// ── Component ─────────────────────────────────────────────────────

const DiscogsWantlistBrowser: React.FC<DiscogsWantlistBrowserProps> = ({ onImportComplete }) => {
  const { showToast } = useToast();

  const [wants, setWants] = useState<DiscogsWantItem[]>([]);
  const [pagination, setPagination] = useState<DiscogsPagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notConnected, setNotConnected] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Fetch a single page ──────────────────────────────────────────

  const fetchPage = useCallback(async (page: number) => {
    const headers = await authHeaders();
    if (!headers['Authorization']) return;

    setLoading(true);
    setNotConnected(false);
    try {
      const res = await fetch(
        `/api/discogs-wantlist?page=${page}&per_page=${PER_PAGE}`,
        { headers },
      );

      if (res.status === 401) {
        setNotConnected(true);
        setWants([]);
        setPagination(null);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error || `Failed to fetch wantlist (${res.status})`,
        );
      }

      const data: DiscogsWantlistResponse = await res.json();
      setWants(data.wants || []);
      setPagination(data.pagination || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch wantlist';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  // ── Selection helpers ────────────────────────────────────────────

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const w of wants) {
        next.add(w.basic_information.id);
      }
      return next;
    });
  }, [wants]);

  const deselectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const w of wants) {
        next.delete(w.basic_information.id);
      }
      return next;
    });
  }, [wants]);

  // ── Import selected ──────────────────────────────────────────────

  const importSelected = useCallback(async () => {
    const selected = wants.filter(w => selectedIds.has(w.basic_information.id));
    if (selected.length === 0) return;

    setImporting(true);
    try {
      // Fetch existing wantlist for deduplication
      const existing = await wantlistService.getWantlist();
      const existingReleaseIds = new Set(
        existing
          .map(item => item.discogs_release_id)
          .filter((id): id is number => id !== null),
      );

      let added = 0;
      let skipped = 0;

      for (const want of selected) {
        const releaseId = want.basic_information.id;
        if (existingReleaseIds.has(releaseId)) {
          skipped++;
          continue;
        }

        const newItem = mapToNewWantlistItem(want);
        await wantlistService.addToWantlist(newItem);
        added++;
      }

      if (added > 0) {
        showToast(
          `Added ${added} record${added !== 1 ? 's' : ''} to your wantlist${
            skipped > 0 ? ` (${skipped} already existed)` : ''
          }`,
          'success',
        );
      } else {
        showToast(
          `All ${skipped} selected record${skipped !== 1 ? 's' : ''} already in your wantlist`,
          'success',
        );
      }

      setSelectedIds(new Set());
      onImportComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      showToast(message, 'error');
    } finally {
      setImporting(false);
    }
  }, [wants, selectedIds, onImportComplete, showToast]);

  // ── Not connected state ──────────────────────────────────────────

  if (notConnected) {
    return (
      <div className="glass-morphism rounded-xl p-8 text-center">
        <svg className="w-12 h-12 mx-auto text-th-text3/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <p className="text-th-text3/70 text-sm">
          Connect your Discogs account above to import your wantlist
        </p>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <SpinningRecord size="w-20 h-20" />
        <p className="text-th-text3/70 text-[10px] font-label tracking-widest uppercase">
          Loading Discogs wantlist...
        </p>
      </div>
    );
  }

  // ── Empty wantlist ───────────────────────────────────────────────

  if (wants.length === 0) {
    return (
      <div className="glass-morphism rounded-xl p-8 text-center">
        <svg className="w-12 h-12 mx-auto text-th-text3/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-th-text3/70 text-sm">
          Your Discogs wantlist is empty
        </p>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────

  const allOnPageSelected = wants.every(w => selectedIds.has(w.basic_information.id));
  const selectedCount = selectedIds.size;

  const handleToggleSelectAll = () => {
    if (allOnPageSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleToggleSelectAll}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-th-surface/[0.10] bg-th-surface/[0.04] text-th-text2 hover:text-th-text hover:bg-th-surface/[0.08] transition-all"
          aria-label={allOnPageSelected ? 'Deselect all releases on this page' : 'Select all releases on this page'}
        >
          {allOnPageSelected ? 'Deselect All' : 'Select All'}
        </button>

        <button
          type="button"
          onClick={importSelected}
          disabled={selectedCount === 0 || importing}
          aria-label={`Import ${selectedCount} selected record${selectedCount !== 1 ? 's' : ''} from Discogs`}
          className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#dd6e42] text-th-text hover:bg-[#c45a30] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {importing ? `Importing ${selectedCount} record${selectedCount !== 1 ? 's' : ''}...` : `Import from Discogs (${selectedCount})`}
        </button>

        {pagination && (
          <span className="ml-auto text-th-text3/50 text-xs font-label tracking-widest uppercase">
            {pagination.items} release{pagination.items !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Importing overlay */}
      {importing && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#dd6e42]/10 border border-[#dd6e42]/20">
          <svg
            className="animate-spin h-4 w-4 text-[#dd6e42]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-[#f0a882] text-sm">
            Importing records to wantlist...
          </span>
        </div>
      )}

      {/* Want list */}
      <div className="glass-morphism rounded-xl divide-y divide-th-surface/[0.06] overflow-hidden">
        {wants.map(want => {
          const info = want.basic_information;
          const artist = formatArtist(want);
          const isSelected = selectedIds.has(info.id);
          const hasImage = info.thumb && !info.thumb.includes('spacer.gif');
          const genre = info.genres?.[0];

          return (
            <label
              key={want.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-th-surface/[0.04] transition-colors ${isSelected ? 'bg-[#dd6e42]/5' : ''}`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(info.id)}
                aria-label={`Select ${artist} - ${info.title}`}
                className="w-4 h-4 rounded border-th-surface/[0.20] bg-th-surface/[0.06] text-[#dd6e42] focus:ring-[#dd6e42]/30 focus:ring-offset-0 shrink-0"
              />

              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-lg bg-th-surface/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                {hasImage ? (
                  <img
                    src={info.thumb}
                    alt={`Cover for ${info.title} by ${artist}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <VinylPlaceholder />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-th-text text-sm leading-tight truncate">
                  <span className="font-medium">{artist}</span>
                  <span className="text-th-text3/50"> — </span>
                  <span>{info.title}</span>
                  {info.year > 0 && (
                    <span className="text-th-text3/50 ml-1">({info.year})</span>
                  )}
                </p>
              </div>

              {/* Genre tag */}
              {genre && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-[#dd6e42]/10 text-[#f0a882] text-[10px] font-label tracking-wider uppercase shrink-0">
                  {genre}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          totalItems={pagination.items}
          pageSize={pagination.per_page}
          onPageChange={fetchPage}
        />
      )}

      {/* Attribution */}
      <div className="flex justify-center pt-2">
        <DiscogsAttribution size="compact" />
      </div>
    </div>
  );
};

export default DiscogsWantlistBrowser;
