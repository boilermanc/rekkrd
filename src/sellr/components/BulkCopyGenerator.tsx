import React, { useState, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2, RefreshCw, AlertTriangle, XCircle } from 'lucide-react';
import type { SellrRecord } from '../types';

type Tone = 'casual' | 'collector' | 'quicksale';

interface ToneOption {
  id: Tone;
  label: string;
  description: string;
}

const TONES: ToneOption[] = [
  { id: 'casual', label: 'Casual', description: 'Friendly, conversational' },
  { id: 'collector', label: 'Collector', description: 'For serious vinyl fans' },
  { id: 'quicksale', label: 'Quick Sale', description: 'Fast, price-forward' },
];

type Phase = 'idle' | 'generating' | 'done';

interface ProgressEvent {
  completed: number;
  total: number;
  record_id: string;
  success: boolean;
  error?: string;
  artist: string;
  title: string;
}

interface BulkCopyGeneratorProps {
  sessionId: string;
  records: SellrRecord[];
  onAllCopyGenerated: (updatedRecords: SellrRecord[]) => void;
}

const BulkCopyGenerator: React.FC<BulkCopyGeneratorProps> = ({
  sessionId,
  records,
  onAllCopyGenerated,
}) => {
  const [tone, setTone] = useState<Tone>('casual');
  const [phase, setPhase] = useState<Phase>('idle');
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentRecord, setCurrentRecord] = useState<{ artist: string; title: string } | null>(null);
  const [generated, setGenerated] = useState(0);
  const [failed, setFailed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const cancelledRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const pending = records.filter(r => !r.ad_copy).length;
  const ready = records.length - pending;

  // Don't render if all records have ad copy
  if (pending === 0 && phase !== 'done') return null;

  const handleGenerate = useCallback(async () => {
    cancelledRef.current = false;
    setPhase('generating');
    setCompleted(0);
    setTotal(pending);
    setGenerated(0);
    setFailed(0);
    setError(null);
    setCurrentRecord(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/sellr/copy/bulk/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Bulk generation failed');
      }

      // Check if the response is SSE or plain JSON (empty case)
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        // Empty records case — server returned JSON directly
        setPhase('done');
        setGenerated(0);
        setFailed(0);
        return;
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let genCount = 0;
      let failCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          try {
            const event = JSON.parse(json);

            if (event.done) {
              // Final summary event
              genCount = event.generated;
              failCount = event.failed;
              continue;
            }

            // Progress event
            const progress = event as ProgressEvent;
            setCompleted(progress.completed);
            setTotal(progress.total);
            setCurrentRecord({ artist: progress.artist, title: progress.title });

            if (progress.success) {
              genCount++;
            } else {
              failCount++;
            }
            setGenerated(genCount);
            setFailed(failCount);
          } catch {
            // Ignore malformed events
          }
        }

        if (cancelledRef.current) {
          reader.cancel();
          break;
        }
      }

      setGenerated(genCount);
      setFailed(failCount);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // Cancelled by user — keep whatever progress was made
      } else {
        setError(err instanceof Error ? err.message : 'Bulk generation failed');
      }
    }

    setPhase('done');
    setCurrentRecord(null);
    abortRef.current = null;

    // Refresh records from server to get the updated ad_copy values
    try {
      const res = await fetch(`/api/sellr/records/session/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.records) {
          onAllCopyGenerated(data.records);
        }
      }
    } catch {
      // Non-fatal — records will refresh on next page load
    }
  }, [sessionId, tone, pending, onAllCopyGenerated]);

  const handleCancel = () => {
    cancelledRef.current = true;
    abortRef.current?.abort();
  };

  const handleReset = () => {
    setPhase('idle');
    setCompleted(0);
    setTotal(0);
    setGenerated(0);
    setFailed(0);
    setError(null);
    setCurrentRecord(null);
  };

  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const estSeconds = pending * 3;

  return (
    <div className="bg-sellr-surface rounded-lg p-6 mb-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <h3 className="font-display text-xl text-sellr-charcoal">Generate Ad Copy</h3>
          <p className="text-sm text-sellr-charcoal/50 mt-1">
            {ready} of {records.length} records ready
          </p>
        </div>

        {/* Tone selector — shown in idle and done states */}
        {phase !== 'generating' && (
          <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
            {TONES.map(t => {
              const selected = tone === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`flex-1 sm:flex-none rounded-lg px-2 sm:px-3 py-2 text-center transition-colors ${
                    selected
                      ? 'bg-sellr-blue text-white'
                      : 'border border-sellr-blue/30 text-sellr-blue hover:border-sellr-blue'
                  }`}
                >
                  <span className="block text-xs sm:text-sm font-medium">{t.label}</span>
                  <span className={`hidden sm:block text-[11px] mt-0.5 ${selected ? 'text-white/70' : 'text-sellr-charcoal/40'}`}>
                    {t.description}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Idle state ──────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div>
          <p className="text-sm text-sellr-charcoal/60 mb-4">
            Generate ad copy for all {pending} record{pending !== 1 ? 's' : ''} at once
          </p>
          <button
            onClick={handleGenerate}
            className="w-full py-3 bg-sellr-amber text-white font-medium rounded-lg hover:bg-sellr-amber-light transition-colors"
          >
            Generate All
          </button>
          <p className="text-xs text-sellr-charcoal/40 text-center mt-2">
            ~{estSeconds} seconds estimated
          </p>
        </div>
      )}

      {/* ── Generating state ────────────────────────────────────────── */}
      {phase === 'generating' && (
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="w-full h-2 bg-sellr-charcoal/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-sellr-blue rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-sellr-charcoal font-medium">
                {completed} of {total} records done...
              </p>
              {currentRecord && (
                <p className="text-xs text-sellr-charcoal/40 italic mt-0.5">
                  Writing copy for {currentRecord.artist} &ndash; {currentRecord.title}...
                </p>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-300 text-red-500 rounded hover:bg-red-50 transition-colors"
            >
              <XCircle className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Done state ──────────────────────────────────────────────── */}
      {phase === 'done' && (
        <div className="space-y-3">
          {error ? (
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sellr-sage">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">All ad copy generated!</p>
            </div>
          )}

          <p className="text-sm text-sellr-charcoal/60">
            {generated} succeeded &middot; {failed} failed
          </p>

          {failed > 0 && (
            <p className="text-xs text-amber-600">
              Some records failed &mdash; you can generate them individually below.
            </p>
          )}

          {/* Show Regenerate All if there are still pending records, or if user wants to redo */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-sellr-charcoal/20 rounded hover:bg-white/60 transition-colors text-sellr-charcoal"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate All
          </button>
        </div>
      )}
    </div>
  );
};

export default BulkCopyGenerator;
