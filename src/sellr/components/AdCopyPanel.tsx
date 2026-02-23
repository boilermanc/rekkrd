import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, Copy } from 'lucide-react';
import SellrLogo from './SellrLogo';
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

interface AdCopyPanelProps {
  record: SellrRecord;
  sessionId: string;
  onCopyUpdated: (record_id: string, ad_copy: string) => void;
}

const AdCopyPanel: React.FC<AdCopyPanelProps> = ({ record, sessionId, onCopyUpdated }) => {
  const [tone, setTone] = useState<Tone>('casual');
  const [copy, setCopy] = useState(record.ad_copy ?? '');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync if parent record changes
  useEffect(() => {
    setCopy(record.ad_copy ?? '');
  }, [record.ad_copy]);

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
      const res = await fetch(`/api/sellr/copy/record/${record.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, tone }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Generation failed');
      }

      const data = await res.json();
      setCopy(data.ad_copy);
      onCopyUpdated(record.id, data.ad_copy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [record.id, sessionId, tone, onCopyUpdated]);

  // ── Debounced save on edit ──────────────────────────────────────────
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setCopy(newText);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sellr/records/${record.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, ad_copy: newText }),
        });
        if (res.ok) {
          onCopyUpdated(record.id, newText);
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
      // Fallback for older browsers
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

  // ── Character count helpers ────────────────────────────────────────
  const wordCount = copy.trim() ? copy.trim().split(/\s+/).length : 0;
  const charCountColor =
    wordCount >= 200 ? 'text-red-500' : wordCount >= 150 ? 'text-amber-600' : 'text-sellr-charcoal/40';

  return (
    <div className="bg-sellr-surface px-4 sm:px-6 py-5 space-y-5">
      {/* ── Tone Selector ─────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-sellr-charcoal/50 uppercase tracking-wide mb-2">Tone</p>
        <div className="flex gap-1.5 sm:gap-2">
          {TONES.map(t => {
            const selected = tone === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={`flex-1 rounded-lg px-2 sm:px-3 py-2 text-center transition-colors ${
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
      </div>

      {/* ── Copy Display / Generate ───────────────────────────────── */}
      {generating ? (
        <div className="flex items-center justify-center gap-3 py-8 text-sellr-blue">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Writing your ad...</span>
        </div>
      ) : copy ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={copy}
            onChange={handleTextChange}
            rows={4}
            className="w-full bg-white/60 rounded-lg px-4 py-3 text-sm text-sellr-charcoal leading-relaxed resize-none border-0 focus:outline-none focus:ring-2 focus:ring-sellr-blue/30"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`text-xs ${charCountColor}`}>
              {wordCount} words
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium border border-sellr-charcoal/20 rounded hover:bg-white/60 transition-colors text-sellr-charcoal"
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </button>
              <button
                onClick={handleCopyToClipboard}
                className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded transition-colors ${
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
                    <span className="hidden sm:inline">Copy to Clipboard</span>
                    <span className="sm:hidden">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-sellr-charcoal/40 mb-3">No ad copy yet</p>
          <button
            onClick={handleGenerate}
            className="px-5 py-2 bg-sellr-amber text-white text-sm font-medium rounded hover:bg-sellr-amber-light transition-colors"
          >
            Generate
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* ── Facebook Preview ──────────────────────────────────────── */}
      {copy && (
        <div>
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
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                <span className="text-sm font-bold text-blue-600">Marketplace</span>
              </div>
              {/* Card body */}
              <div className="flex gap-4 p-4">
                {/* Cover image */}
                <div className="flex-shrink-0">
                  {record.cover_image ? (
                    <img
                      src={record.cover_image}
                      alt={`Cover for ${record.title}`}
                      className="w-24 h-24 rounded object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded bg-gray-100 flex items-center justify-center">
                      <SellrLogo className="w-10 h-10" color="#d1d5db" />
                    </div>
                  )}
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  {record.price_median != null && (
                    <p className="text-lg font-bold text-gray-900 mb-1">
                      ${record.price_median}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 line-clamp-4 whitespace-pre-wrap">{copy}</p>
                </div>
              </div>
              <p className="px-4 pb-2 text-[10px] text-gray-400">Preview (approximate)</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdCopyPanel;
