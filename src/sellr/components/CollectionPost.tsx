import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, Copy,
} from 'lucide-react';
import type { SellrSession, SellrRecord } from '../types';

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

interface CollectionPostProps {
  session: SellrSession;
  records: SellrRecord[];
  sessionId: string;
  onSessionUpdated: (session: SellrSession) => void;
}

const CollectionPost: React.FC<CollectionPostProps> = ({
  session,
  records,
  sessionId,
  onSessionUpdated,
}) => {
  const [tone, setTone] = useState<Tone>('casual');
  const [copy, setCopy] = useState(session.collection_ad_copy ?? '');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const totalMedian = records.reduce((sum, r) => sum + (r.price_median ?? 0), 0);
  const suggestedPrice = Math.round(totalMedian * 0.65);
  const firstCover = records.find(r => r.cover_image)?.cover_image ?? null;

  // Sync if parent session changes
  useEffect(() => {
    setCopy(session.collection_ad_copy ?? '');
  }, [session.collection_ad_copy]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [copy]);

  // ── Generate / Regenerate ───────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/sellr/copy/collection/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Generation failed');
      }

      const data = await res.json();
      setCopy(data.collection_ad_copy);
      onSessionUpdated({ ...session, collection_ad_copy: data.collection_ad_copy });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [sessionId, tone, session, onSessionUpdated]);

  // ── Debounced save on edit ──────────────────────────────────────────
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setCopy(newText);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sellr/sessions/${sessionId}/collection-copy`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection_ad_copy: newText, session_id_verify: sessionId }),
        });
        if (res.ok) {
          onSessionUpdated({ ...session, collection_ad_copy: newText });
        }
      } catch {
        // Silent — user can retry or regenerate
      }
    }, 1000);
  };

  // ── Copy to clipboard ──────────────────────────────────────────────
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = copy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Word count ─────────────────────────────────────────────────────
  const wordCount = copy.trim() ? copy.trim().split(/\s+/).length : 0;
  const charCountColor =
    wordCount >= 200 ? 'text-red-500' : wordCount >= 150 ? 'text-amber-600' : 'text-sellr-charcoal/40';

  if (session.status !== 'paid') return null;

  return (
    <div className="bg-sellr-surface rounded-lg p-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-5">
        <h3 className="font-display text-xl text-sellr-charcoal">
          Sell Your Entire Collection
        </h3>
        <p className="text-sm text-sellr-charcoal/50 mt-1">
          Generate a single Facebook post to sell everything at once.
        </p>
        <p className="text-xs text-sellr-charcoal/40 mt-1">
          {records.length} records &middot; Est. value ${totalMedian.toLocaleString()}
        </p>
      </div>

      {/* ── Tone Selector ─────────────────────────────────────────── */}
      <div className="mb-5">
        <p className="text-xs text-sellr-charcoal/50 uppercase tracking-wide mb-2">Tone</p>
        <div className="flex gap-2">
          {TONES.map(t => {
            const selected = tone === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                disabled={generating}
                className={`flex-1 rounded-lg px-3 py-2 text-center transition-colors ${
                  selected
                    ? 'bg-sellr-blue text-white'
                    : 'border border-sellr-blue/30 text-sellr-blue hover:border-sellr-blue'
                } disabled:opacity-50`}
              >
                <span className="block text-sm font-medium">{t.label}</span>
                <span className={`block text-[11px] mt-0.5 ${selected ? 'text-white/70' : 'text-sellr-charcoal/40'}`}>
                  {t.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Generation Area ───────────────────────────────────────── */}
      {generating ? (
        <div className="flex items-center justify-center gap-3 py-8 text-sellr-blue">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Writing your collection post...</span>
        </div>
      ) : copy ? (
        <div className="space-y-3">
          <textarea
            ref={textareaRef}
            value={copy}
            onChange={handleTextChange}
            rows={6}
            className="w-full bg-white/60 rounded-lg px-4 py-3 text-sm text-sellr-charcoal leading-relaxed resize-none border-0 focus:outline-none focus:ring-2 focus:ring-sellr-blue/30"
          />
          <div className="flex items-center justify-between">
            <span className={`text-xs ${charCountColor}`}>
              {wordCount} words
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-sellr-charcoal/20 rounded hover:bg-white/60 transition-colors text-sellr-charcoal"
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </button>
              <button
                onClick={handleCopyToClipboard}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  copied
                    ? 'bg-sellr-sage text-white'
                    : 'bg-sellr-amber text-white hover:bg-sellr-amber-light'
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={handleGenerate}
            className="w-full py-3 bg-sellr-amber text-white font-medium rounded-lg hover:bg-sellr-amber-light transition-colors"
          >
            Generate Collection Post
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}

      {/* ── Suggested Pricing ─────────────────────────────────────── */}
      {totalMedian > 0 && (
        <div className="mt-5 bg-sellr-amber/10 border-l-4 border-sellr-amber rounded-r-lg px-4 py-3">
          <p className="text-sm font-medium text-sellr-charcoal">
            Suggested asking price: ${suggestedPrice.toLocaleString()}
          </p>
          <p className="text-xs text-sellr-charcoal/50 mt-0.5">
            Based on 65% of estimated collection value &mdash; a common starting point for quick collection sales.
          </p>
        </div>
      )}

      {/* ── Facebook Preview ──────────────────────────────────────── */}
      {copy && (
        <div className="mt-5">
          <button
            onClick={() => setShowPreview(p => !p)}
            className="flex items-center gap-1.5 text-xs text-sellr-charcoal/50 hover:text-sellr-charcoal transition-colors"
          >
            Preview as Facebook post
            {showPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showPreview && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
              {/* FB header */}
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-300" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">You</p>
                  <p className="text-[10px] text-gray-400">Just now &middot; Public</p>
                </div>
              </div>
              {/* Post body */}
              <div className="px-4 py-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{copy}</p>
              </div>
              {/* Post image */}
              {firstCover && (
                <div className="border-t border-gray-100">
                  <img
                    src={firstCover}
                    alt="Collection preview"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              {/* FB reactions bar */}
              <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>Like &middot; Comment &middot; Share</span>
              </div>
              <p className="px-4 pb-2 text-[10px] text-gray-400">Preview (approximate)</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionPost;
