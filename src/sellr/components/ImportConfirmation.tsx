import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Info, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../services/supabaseService';
import { useToast } from '../../../contexts/ToastContext';
import type { SellrRecord, SellrSession } from '../types';

// ── Types ────────────────────────────────────────────────────────────

interface ExistingAlbum {
  id: string;
  title: string;
  artist: string;
  discogs_release_id?: number | null;
}

interface ImportPreview {
  total: number;
  to_import: SellrRecord[];
  duplicates: Array<{ sellr_record: SellrRecord; existing_album: ExistingAlbum }>;
  session: SellrSession;
}

interface ImportResult {
  imported: number;
  skipped: number;
  album_ids: string[];
}

interface ImportConfirmationProps {
  preview: ImportPreview;
  sessionId: string;
  onImportComplete: (result: ImportResult) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmtPrice(value: number): string {
  return `~$${Math.round(value)}`;
}

// ── Component ────────────────────────────────────────────────────────

const ImportConfirmation: React.FC<ImportConfirmationProps> = ({
  preview,
  sessionId,
  onImportComplete,
}) => {
  const { showToast } = useToast();
  const { total, to_import, duplicates } = preview;

  // Per-duplicate decision: true = skip (default), false = import anyway
  const [skipMap, setSkipMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const d of duplicates) {
      map[d.sellr_record.id] = true; // default: skip
    }
    return map;
  });

  const [showAllNew, setShowAllNew] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const toggleSkip = (recordId: string) => {
    setSkipMap(prev => ({ ...prev, [recordId]: !prev[recordId] }));
  };

  const selectedDuplicateCount = useMemo(
    () => duplicates.filter(d => !skipMap[d.sellr_record.id]).length,
    [duplicates, skipMap],
  );

  const skippedCount = duplicates.length - selectedDuplicateCount;
  const importingCount = to_import.length + selectedDuplicateCount;

  const skipDuplicateIds = useMemo(
    () => duplicates.filter(d => skipMap[d.sellr_record.id]).map(d => d.sellr_record.id),
    [duplicates, skipMap],
  );

  // ── Empty state ──────────────────────────────────────────────────
  if (to_import.length === 0 && duplicates.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sellr-charcoal/60 text-lg mb-4">
          Nothing to import — your Sellr collection is empty.
        </p>
        <Link
          to="/sellr/scan"
          className="inline-block px-6 py-3 bg-sellr-amber text-white text-sm font-medium rounded hover:bg-sellr-amber-light transition-colors"
        >
          Start Scanning
        </Link>
      </div>
    );
  }

  // ── Commit handler ───────────────────────────────────────────────
  const handleCommit = async () => {
    setCommitting(true);
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session?.access_token) {
        showToast('Session expired. Please sign in again.', 'error');
        setCommitting(false);
        return;
      }

      const res = await fetch('/api/sellr/import/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          skip_duplicate_ids: skipDuplicateIds,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Import failed (${res.status})`);
      }

      const result = await res.json();
      onImportComplete(result);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Import failed. Please try again.',
        'error',
      );
    } finally {
      setCommitting(false);
    }
  };

  // ── Visible new records (with show more/less) ────────────────────
  const COLLAPSE_THRESHOLD = 5;
  const visibleNew = showAllNew ? to_import : to_import.slice(0, COLLAPSE_THRESHOLD);
  const hiddenNewCount = to_import.length - COLLAPSE_THRESHOLD;

  return (
    <div className="space-y-8">
      {/* ── Section 1: Header ────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-3xl tracking-tight text-sellr-charcoal">
          Import to Rekkrd
        </h1>
        <p className="text-sellr-charcoal/60 mt-1">
          {total} record{total !== 1 ? 's' : ''} from your Sellr appraisal.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-sellr-sage/15 text-sellr-sage">
            {to_import.length} new record{to_import.length !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-sellr-amber/15 text-sellr-amber">
            {duplicates.length} already in your collection
          </span>
        </div>
      </div>

      {/* ── Section 2: New records ───────────────────────────────── */}
      {to_import.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-sellr-charcoal mb-3">
            Adding to your collection
          </h2>
          <div className="rounded-lg border border-sellr-charcoal/10 bg-white overflow-hidden">
            <div className="max-h-64 overflow-y-auto divide-y divide-sellr-charcoal/5">
              {visibleNew.map(record => (
                <RecordRow key={record.id} record={record} />
              ))}
            </div>
            {to_import.length > COLLAPSE_THRESHOLD && (
              <button
                onClick={() => setShowAllNew(v => !v)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm text-sellr-blue hover:text-sellr-blue-light transition-colors border-t border-sellr-charcoal/5"
              >
                {showAllNew ? (
                  <>Show less <ChevronUp className="w-4 h-4" /></>
                ) : (
                  <>and {hiddenNewCount} more... <ChevronDown className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Section 3: Duplicates ────────────────────────────────── */}
      {duplicates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold text-sellr-charcoal">
              Already in your collection
            </h2>
            <div className="relative">
              <button
                onClick={() => setTooltipOpen(v => !v)}
                onBlur={() => setTimeout(() => setTooltipOpen(false), 150)}
                className="text-sellr-charcoal/40 hover:text-sellr-charcoal/60 transition-colors"
                aria-label="Duplicate info"
              >
                <Info className="w-4 h-4" />
              </button>
              {tooltipOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-7 z-10 w-64 rounded-lg bg-sellr-charcoal text-white text-xs p-3 shadow-lg">
                  These records match something you already own. You can skip or import anyway.
                </div>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-sellr-charcoal/10 bg-white divide-y divide-sellr-charcoal/5">
            {duplicates.map(({ sellr_record, existing_album }) => (
              <DuplicateRow
                key={sellr_record.id}
                sellrRecord={sellr_record}
                existingAlbum={existing_album}
                skip={skipMap[sellr_record.id]}
                onToggle={() => toggleSkip(sellr_record.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Section 4: Commit CTA ────────────────────────────────── */}
      <div className="rounded-lg border border-sellr-charcoal/10 bg-sellr-surface p-5">
        <p className="text-sm text-sellr-charcoal/70 mb-4">
          Importing <strong className="text-sellr-charcoal">{importingCount}</strong> record{importingCount !== 1 ? 's' : ''},
          skipping <strong className="text-sellr-charcoal">{skippedCount}</strong>.
        </p>
        <button
          onClick={handleCommit}
          disabled={committing || importingCount === 0}
          className="w-full sm:w-auto px-8 py-3 bg-sellr-blue text-white text-sm font-semibold tracking-wide rounded hover:bg-sellr-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {committing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing your records...
            </>
          ) : (
            'Import to My Collection'
          )}
        </button>
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────

const RecordRow: React.FC<{ record: SellrRecord }> = ({ record }) => {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {record.cover_image ? (
        <img
          src={record.cover_image}
          alt=""
          className="w-8 h-8 rounded object-cover flex-shrink-0 bg-sellr-charcoal/5"
        />
      ) : (
        <div className="w-8 h-8 rounded bg-sellr-charcoal/5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-sellr-charcoal truncate">
          <span className="font-medium">{record.artist}</span>
          {' — '}
          {record.title}
        </p>
        {record.year && (
          <p className="text-xs text-sellr-charcoal/50">{record.year}</p>
        )}
      </div>
      {record.price_median != null && (
        <span className="text-sm font-medium text-sellr-amber flex-shrink-0">
          {fmtPrice(record.price_median)}
        </span>
      )}
    </div>
  );
}

const DuplicateRow: React.FC<{
  sellrRecord: SellrRecord;
  existingAlbum: ExistingAlbum;
  skip: boolean;
  onToggle: () => void;
}> = ({ sellrRecord, existingAlbum, skip, onToggle }) => {
  return (
    <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Side-by-side comparison */}
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4">
        <div className="truncate">
          <span className="text-[10px] uppercase tracking-wider text-sellr-charcoal/40 font-medium">Sellr</span>
          <p className="text-sm text-sellr-charcoal truncate">
            {sellrRecord.artist} — {sellrRecord.title}
          </p>
        </div>
        <div className="truncate">
          <span className="text-[10px] uppercase tracking-wider text-sellr-charcoal/40 font-medium">Yours</span>
          <p className="text-sm text-sellr-charcoal truncate">
            {existingAlbum.artist} — {existingAlbum.title}
          </p>
        </div>
      </div>

      {/* Skip / Import toggle */}
      <div className="flex rounded-md overflow-hidden border border-sellr-charcoal/10 flex-shrink-0 self-start sm:self-center">
        <button
          onClick={skip ? undefined : onToggle}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            skip
              ? 'bg-sellr-charcoal/8 text-sellr-charcoal'
              : 'bg-transparent text-sellr-charcoal/40 hover:text-sellr-charcoal/60'
          }`}
        >
          Skip
        </button>
        <button
          onClick={skip ? onToggle : undefined}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            !skip
              ? 'bg-sellr-amber text-white'
              : 'bg-transparent text-sellr-charcoal/40 hover:text-sellr-charcoal/60'
          }`}
        >
          Import anyway
        </button>
      </div>
    </div>
  );
}

export default ImportConfirmation;
