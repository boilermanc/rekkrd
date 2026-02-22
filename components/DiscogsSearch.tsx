import React, { useState, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import SpinningRecord from './SpinningRecord';
import Pagination from './Pagination';
import DiscogsAttribution from './DiscogsAttribution';
import type { DiscogsSearchResponse, DiscogsSearchResult } from '../types/discogs';

const FORMAT_OPTIONS = ['All', 'Vinyl', 'CD', 'Cassette'] as const;
const PER_PAGE = 20;

interface DiscogsSearchProps {
  onSelectResult?: (result: DiscogsSearchResult) => void;
}

const DiscogsSearch: React.FC<DiscogsSearchProps> = ({ onSelectResult }) => {
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [format, setFormat] = useState<string>('All');
  const [year, setYear] = useState('');
  const [country, setCountry] = useState('');

  const [results, setResults] = useState<DiscogsSearchResult[]>([]);
  const [pagination, setPagination] = useState<DiscogsSearchResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchResults = useCallback(async (page: number) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ q: trimmed, per_page: String(PER_PAGE), page: String(page) });
      if (format !== 'All') params.set('format', format);
      if (year.trim()) params.set('year', year.trim());
      if (country.trim()) params.set('country', country.trim());

      const res = await fetch(`/api/discogs/search?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Search failed (${res.status})`);
      }

      const data: DiscogsSearchResponse = await res.json();
      setResults(data.results);
      setPagination(data.pagination);
      setHasSearched(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [query, format, year, country, showToast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    fetchResults(1);
  };

  const handlePageChange = (page: number) => {
    fetchResults(page);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {/* Search form */}
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Discogs by artist, album, barcode..."
            aria-label="Search Discogs"
            className="flex-1 px-4 py-3 rounded-xl bg-th-surface/[0.06] border border-th-surface/[0.10] text-th-text placeholder:text-th-text3/50 text-sm focus:outline-none focus:border-[#dd6e42]/50 focus:ring-1 focus:ring-[#dd6e42]/30 transition-all"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            aria-label="Search"
            className="px-5 py-3 rounded-xl bg-[#dd6e42] text-th-text text-sm font-medium hover:bg-[#c45a30] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            aria-label="Filter by format"
            className="px-3 py-2 rounded-lg bg-th-surface/[0.06] border border-th-surface/[0.10] text-th-text text-xs focus:outline-none focus:border-[#dd6e42]/50 transition-all"
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>{f === 'All' ? 'All Formats' : f}</option>
            ))}
          </select>
          <input
            type="text"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Year"
            aria-label="Filter by year"
            className="w-20 px-3 py-2 rounded-lg bg-th-surface/[0.06] border border-th-surface/[0.10] text-th-text placeholder:text-th-text3/50 text-xs focus:outline-none focus:border-[#dd6e42]/50 transition-all"
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country"
            aria-label="Filter by country"
            className="w-24 px-3 py-2 rounded-lg bg-th-surface/[0.06] border border-th-surface/[0.10] text-th-text placeholder:text-th-text3/50 text-xs focus:outline-none focus:border-[#dd6e42]/50 transition-all"
          />
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-6">
          <SpinningRecord size="w-20 h-20" />
          <p className="text-th-text3/70 text-[10px] font-label tracking-widest uppercase">
            Searching Discogs...
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <svg className="w-12 h-12 text-th-text3/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-th-text3/70 text-sm text-center">
            No releases found. Try a different search.
          </p>
        </div>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((result) => (
              <ResultCard key={`${result.type}-${result.id}`} result={result} onSelect={onSelectResult} />
            ))}
          </div>

          {pagination && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalItems={pagination.items}
              pageSize={pagination.per_page}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
};

// ── Result Card ────────────────────────────────────────────────────

const PLACEHOLDER_SVG = (
  <svg className="w-10 h-10 text-th-text3/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
  </svg>
);

const ResultCard: React.FC<{ result: DiscogsSearchResult; onSelect?: (result: DiscogsSearchResult) => void }> = ({ result, onSelect }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = result.cover_image && !result.cover_image.includes('spacer.gif') && !imgFailed;

  return (
    <div
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(result)}
      onKeyDown={(e) => { if (onSelect && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(result); } }}
      aria-label={onSelect ? `View details for ${result.title}` : undefined}
      className={`group rounded-2xl border border-th-surface/[0.10] bg-th-surface/[0.04] overflow-hidden hover:border-[#dd6e42]/30 hover:bg-th-surface/[0.08] transition-all ${onSelect ? 'cursor-pointer' : ''}`}
    >
      {/* Cover image */}
      <div className="aspect-square bg-th-surface/[0.06] flex items-center justify-center overflow-hidden">
        {hasImage ? (
          <img
            src={result.cover_image}
            alt={`Cover for ${result.title}`}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          PLACEHOLDER_SVG
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <h3 className="text-th-text text-sm font-medium leading-tight line-clamp-2" title={result.title}>
          {result.title}
        </h3>

        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {result.year && (
            <span className="text-th-text3/70">{result.year}</span>
          )}
          {result.country && (
            <span className="text-th-text3/50">{result.country}</span>
          )}
        </div>

        {/* Format badges */}
        {result.format && result.format.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {result.format.map((f, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-[#dd6e42]/15 text-[#f0a882] text-[10px] font-label tracking-wider uppercase"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Label */}
        {result.label && result.label.length > 0 && (
          <p className="text-th-text3/50 text-[10px] truncate" title={result.label.join(', ')}>
            {result.label[0]}
          </p>
        )}

        {/* Community stats */}
        {result.community && (
          <div className="flex items-center gap-3 text-[10px] text-th-text3/50 pt-1">
            <span aria-label={`${result.community.have} people have this`}>
              <span className="text-[#6a8c9a]">{result.community.have}</span> have
            </span>
            <span aria-label={`${result.community.want} people want this`}>
              <span className="text-[#dd6e42]">{result.community.want}</span> want
            </span>
          </div>
        )}

        {/* Attribution */}
        <div className="pt-1 border-t border-th-surface/[0.06] mt-auto">
          <DiscogsAttribution size="compact" />
        </div>
      </div>
    </div>
  );
};

export default DiscogsSearch;
