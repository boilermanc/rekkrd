import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import SpinningRecord from './SpinningRecord';
import DiscogsAttribution from './DiscogsAttribution';
import type { DiscogsRelease } from '../types/discogs';

interface DiscogsReleaseDetailProps {
  releaseId: number;
  onClose: () => void;
  onAddToCollection?: (release: DiscogsRelease) => void;
}

const DiscogsReleaseDetail: React.FC<DiscogsReleaseDetailProps> = ({ releaseId, onClose, onAddToCollection }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);

  const [release, setRelease] = useState<DiscogsRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRelease() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/discogs/releases/${releaseId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Failed to load release (${res.status})`);
        }
        const data: DiscogsRelease = await res.json();
        if (!cancelled) setRelease(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load release');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRelease();
    return () => { cancelled = true; };
  }, [releaseId]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const coverImage = release?.images?.find(img => img.type === 'primary')
    ?? release?.images?.[0];

  const artistNames = release?.artists?.map(a => a.name).join(', ') ?? '';

  const formatString = release?.formats
    ?.flatMap(f => [f.name, ...(f.descriptions ?? [])])
    .join(', ');

  const labelInfo = release?.labels?.[0];

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={release ? `${release.title} by ${artistNames}` : 'Release details'}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-th-bg/95 p-2 md:p-8 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-3xl max-h-[95vh] glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] flex flex-col animate-in zoom-in-95 duration-500">

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-th-bg/50 text-th-text flex items-center justify-center hover:bg-th-text hover:text-th-bg transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-6">
              <SpinningRecord size="w-20 h-20" />
              <p className="text-th-text3/70 text-[10px] font-label tracking-widest uppercase">
                Loading release...
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <svg className="w-12 h-12 text-[#dd6e42]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-th-text3/70 text-sm text-center">{error}</p>
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="mt-2 px-4 py-2 rounded-xl bg-th-surface/[0.06] border border-th-surface/[0.10] text-th-text2 text-xs hover:bg-th-surface/[0.10] transition-all"
              >
                Close
              </button>
            </div>
          )}

          {/* Release content */}
          {!loading && release && (
            <div className="p-4 sm:p-6 space-y-6">

              {/* Hero: cover + basic info */}
              <div className="flex flex-col sm:flex-row gap-5">
                {/* Cover image */}
                <div className="shrink-0 w-full sm:w-56 aspect-square rounded-2xl overflow-hidden bg-th-surface/[0.06] flex items-center justify-center">
                  {coverImage ? (
                    <img
                      src={coverImage.uri}
                      alt={`Cover for ${release.title} by ${artistNames}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-16 h-16 text-th-text3/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-3">
                  <h2 className="text-th-text text-lg sm:text-xl font-bold leading-tight">{release.title}</h2>
                  <p className="text-[#f0a882] text-sm font-medium">{artistNames}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-th-text3/70">
                    {release.year > 0 && <span>{release.year}</span>}
                    {release.country && <span>{release.country}</span>}
                  </div>

                  {/* Label + catno */}
                  {labelInfo && (
                    <p className="text-xs text-th-text3/50">
                      {labelInfo.name}
                      {labelInfo.catno && <span className="ml-2 text-th-text3/40">({labelInfo.catno})</span>}
                    </p>
                  )}

                  {/* Format badges */}
                  {formatString && (
                    <p className="text-[10px] font-label tracking-wider uppercase text-[#f0a882]/80">{formatString}</p>
                  )}

                  {/* Community stats */}
                  {release.community && (
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      {/* Rating */}
                      <div className="flex items-center gap-1.5" aria-label={`Rating: ${release.community.rating.average.toFixed(1)} out of 5 from ${release.community.rating.count} votes`}>
                        <StarRating value={release.community.rating.average} />
                        <span className="text-xs text-th-text3/50">({release.community.rating.count})</span>
                      </div>
                      {/* Have / Want */}
                      <div className="flex items-center gap-3 text-[10px] text-th-text3/50">
                        <span aria-label={`${release.community.have} people have this`}>
                          <span className="text-[#6a8c9a]">{release.community.have.toLocaleString()}</span> have
                        </span>
                        <span aria-label={`${release.community.want} people want this`}>
                          <span className="text-[#dd6e42]">{release.community.want.toLocaleString()}</span> want
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tracklist */}
              {release.tracklist.length > 0 && (
                <div>
                  <h3 className="text-[#f0a882] text-[11px] font-label tracking-[0.3em] uppercase font-bold mb-3">
                    Tracklist
                  </h3>
                  <ol className="space-y-0.5" aria-label="Tracklist">
                    {release.tracklist.map((track, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-th-surface/[0.04] transition-colors text-sm"
                      >
                        <span className="w-8 shrink-0 text-th-text3/40 text-xs text-right font-mono">
                          {track.position || String(i + 1)}
                        </span>
                        <span className="flex-1 text-th-text truncate">{track.title}</span>
                        {track.duration && (
                          <span className="shrink-0 text-th-text3/50 text-xs font-mono">{track.duration}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Notes */}
              {release.notes && (
                <div>
                  <h3 className="text-[#f0a882] text-[11px] font-label tracking-[0.3em] uppercase font-bold mb-2">
                    Notes
                  </h3>
                  <p className="text-th-text3/70 text-xs leading-relaxed whitespace-pre-line">{release.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-th-surface/[0.06]">
                {onAddToCollection && (
                  <button
                    onClick={() => onAddToCollection(release)}
                    aria-label="Add to collection"
                    className="px-5 py-2.5 rounded-xl bg-[#dd6e42] text-th-text text-sm font-medium hover:bg-[#c45a30] transition-all"
                  >
                    Add to Collection
                  </button>
                )}
                <a
                  href={`https://www.discogs.com/release/${release.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View on Discogs (opens in new tab)"
                  className="px-5 py-2.5 rounded-xl bg-th-surface/[0.06] border border-th-surface/[0.10] text-th-text2 text-sm hover:bg-th-surface/[0.10] transition-all"
                >
                  View on Discogs
                </a>
              </div>

              {/* Attribution */}
              <DiscogsAttribution size="full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Star Rating ────────────────────────────────────────────────────

const StarRating: React.FC<{ value: number }> = ({ value }) => {
  const stars: React.ReactNode[] = [];
  for (let i = 1; i <= 5; i++) {
    const fill = Math.min(1, Math.max(0, value - (i - 1)));
    stars.push(
      <span key={i} className="relative inline-block w-3.5 h-3.5">
        {/* Empty star */}
        <svg className="absolute inset-0 w-full h-full text-th-text3/20" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        {/* Filled portion */}
        {fill > 0 && (
          <svg className="absolute inset-0 w-full h-full text-[#dd6e42]" fill="currentColor" viewBox="0 0 20 20" style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }}>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
      </span>
    );
  }
  return <span className="inline-flex gap-0.5">{stars}</span>;
};

export default DiscogsReleaseDetail;
