import React, { useState, useRef, useCallback } from 'react';
import { ScanConfirmation, DiscogsMatch } from '../types';
import { proxyImageUrl } from '../services/imageProxy';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { ScanBarcode, Disc3, Sparkles } from 'lucide-react';

interface ScanConfirmModalProps {
  scan: ScanConfirmation;
  onConfirm: (artist: string, title: string, discogsReleaseId?: number, barcode?: string) => void;
  onCancel: () => void;
}

/** Parse Discogs "Artist - Title" format into separate fields. */
function parseDiscogsTitle(raw: string): { artist: string; title: string } {
  const idx = raw.indexOf(' - ');
  if (idx === -1) return { artist: raw, title: '' };
  return { artist: raw.slice(0, idx).trim(), title: raw.slice(idx + 3).trim() };
}

const ScanConfirmModal: React.FC<ScanConfirmModalProps> = ({ scan, onConfirm, onCancel }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnCancel = useCallback(onCancel, [onCancel]);
  useFocusTrap(modalRef, stableOnCancel);

  const matches = scan.discogsMatches?.slice(0, 3) ?? [];
  const hasMatches = matches.length > 0;

  // null = use AI result; otherwise the Discogs release id
  const [selectedId, setSelectedId] = useState<number | null>(
    hasMatches ? matches[0].id : null
  );

  const selectedMatch = selectedId !== null ? matches.find(m => m.id === selectedId) : undefined;

  const handleConfirm = () => {
    if (selectedId !== null) {
      const match = matches.find(m => m.id === selectedId);
      if (match) {
        const parsed = parseDiscogsTitle(match.title);
        onConfirm(
          parsed.artist || scan.artist,
          parsed.title || scan.title,
          match.id,
          scan.barcode,
        );
        return;
      }
    }
    onConfirm(scan.artist, scan.title, undefined, scan.barcode);
  };

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Review scan result"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-th-bg/95 p-4 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] flex flex-col animate-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-th-surface/[0.10] flex-shrink-0">
          <h2 className="font-label text-[#dd6e42] font-bold tracking-widest text-sm uppercase">
            Review Scan Result
          </h2>
          <button
            onClick={onCancel}
            className="text-th-text2 hover:text-th-text transition-colors"
            aria-label="Cancel"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Confidence banner — reactive to selected match and scan mode */}
          {selectedMatch?.matchType === 'barcode' || (scan.scanMode === 'barcode' && scan.barcode) ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-start gap-3">
              <ScanBarcode className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">High Confidence — Barcode Match</p>
                <p className="text-th-text3 text-[10px] mt-1 leading-relaxed">
                  We found an exact match using the barcode on your record sleeve. This is the most accurate identification method.
                </p>
              </div>
            </div>
          ) : selectedMatch?.matchType === 'text' ? (
            <div className="flex justify-center">
              <span className="rounded-full px-3 py-1 inline-flex items-center gap-1.5 bg-slate-500/15 text-slate-400 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                AI Identified
              </span>
            </div>
          ) : null}

          {/* AI identification summary */}
          <div className="text-center">
            <p className="text-th-text text-base font-bold">{scan.artist}</p>
            <p className="text-[#dd6e42] text-sm font-medium">{scan.title}</p>
          </div>

          {/* Discogs matches */}
          {hasMatches && (
            <div className="space-y-3">
              <h3 className="text-th-text3 text-[9px] uppercase tracking-widest border-b border-th-surface/[0.06] pb-2">
                Select the best match
              </h3>
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  isSelected={selectedId === match.id}
                  onSelect={() => setSelectedId(match.id)}
                />
              ))}

              {/* Option to use AI result instead */}
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedId === null
                    ? 'border-[#dd6e42] bg-[#dd6e42]/10'
                    : 'border-th-surface/[0.10] hover:border-th-surface/[0.20]'
                }`}
              >
                <span className="text-sm text-th-text font-medium">Use AI result instead</span>
                <span className="block text-[10px] text-th-text3/70 mt-0.5">
                  {scan.artist} — {scan.title}
                </span>
              </button>
            </div>
          )}

          {/* No matches state */}
          {!hasMatches && (
            <div className="text-center py-4">
              <Disc3 className="w-10 h-10 text-th-text3/30 mx-auto mb-3" />
              <p className="text-th-text3 text-sm">
                No Discogs matches found. The AI identified this as:
              </p>
              <p className="text-th-text text-base font-bold mt-2">
                {scan.artist} — {scan.title}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-th-surface/[0.10] flex gap-3 flex-shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 border border-th-surface/[0.10] text-th-text font-bold py-3 rounded-xl hover:bg-th-surface/[0.08] transition-all uppercase tracking-[0.2em] text-[10px]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-[#dd6e42] text-th-text font-bold py-3 rounded-xl hover:bg-[#c45a30] transition-all uppercase tracking-[0.2em] text-[10px]"
          >
            Add to Collection
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Match Card ─────────────────────────────────────────────

const MatchCard: React.FC<{
  match: DiscogsMatch;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ match, isSelected, onSelect }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const proxiedThumb = proxyImageUrl(match.thumb);
  const hasThumb = !!proxiedThumb && !imgFailed;

  const parsed = parseDiscogsTitle(match.title);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${
        isSelected
          ? 'border-[#dd6e42] bg-[#dd6e42]/10'
          : 'border-th-surface/[0.10] hover:border-th-surface/[0.20]'
      }`}
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg bg-th-surface/[0.06] flex items-center justify-center overflow-hidden flex-shrink-0">
        {hasThumb ? (
          <img
            src={proxiedThumb}
            alt={`Cover for ${match.title}`}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <Disc3 className="w-6 h-6 text-th-text3/20" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-th-text font-medium truncate">{parsed.artist}</p>
        {parsed.title && <p className="text-xs text-[#dd6e42] truncate">{parsed.title}</p>}
        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-th-text3/70">
          {match.year && <span>{match.year}</span>}
          {match.year && match.format && <span className="text-th-text3/30">/</span>}
          {match.format && <span>{match.format}</span>}
          {match.label && (
            <>
              <span className="text-th-text3/30">/</span>
              <span className="truncate">{match.label}</span>
            </>
          )}
        </div>
      </div>

      {/* Match type badge */}
      <span className={`rounded-full px-2 py-0.5 text-[9px] font-label tracking-wider uppercase flex-shrink-0 ${
        match.matchType === 'barcode'
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-slate-500/15 text-slate-400'
      }`}>
        {match.matchType === 'barcode' ? 'Barcode' : 'Text'}
      </span>
    </button>
  );
};

export default ScanConfirmModal;
