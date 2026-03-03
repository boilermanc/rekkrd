import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, Copy, AlertTriangle } from 'lucide-react';
import { supabase } from '../../services/supabaseService';
import SellrLogo from './SellrLogo';
import type { SellrRecord } from '../types';

// ── Types ────────────────────────────────────────────────────────────

interface LotPricing {
  total_median: number;
  total_low: number;
  total_high: number;
  priced_count: number;
  unpriced_count: number;
  lot_prices: {
    quick_sale: number;
    fair: number;
    collector: number;
  };
  record_count: number;
}

type PresetTier = 'quick_sale' | 'fair' | 'collector';

interface TierCard {
  id: PresetTier;
  label: string;
  subtext: string;
  badge?: string;
}

const TIER_CARDS: TierCard[] = [
  { id: 'quick_sale', label: 'Quick Sale', subtext: 'Move it fast' },
  { id: 'fair', label: 'Fair Price', subtext: 'Fair for both sides', badge: 'Recommended' },
  { id: 'collector', label: 'Collector Price', subtext: 'For the right buyer' },
];

interface LotPricingPanelProps {
  sessionId: string;
  records: SellrRecord[];
  onPostGenerated: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmtUsd(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function getAuthToken(): Promise<string | null> {
  const session = await supabase?.auth.getSession();
  return session?.data?.session?.access_token ?? null;
}

// ── Component ────────────────────────────────────────────────────────

const LotPricingPanel: React.FC<LotPricingPanelProps> = ({ sessionId, records, onPostGenerated }) => {
  const recordCount = records.length;

  // Pricing state
  const [pricing, setPricing] = useState<LotPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedTier, setSelectedTier] = useState<PresetTier | null>('fair');
  const [customPrice, setCustomPrice] = useState('');
  const [sellerNotes, setSellerNotes] = useState('');

  // Post generation state
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [post, setPost] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch pricing on mount ───────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function fetchPricing() {
      setLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();
        if (!token) throw new Error('Sign in to use lot pricing');

        const res = await fetch(`/api/sellr/lot/${sessionId}/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'Failed to calculate lot pricing');
        }

        const data: LotPricing = await res.json();
        if (!cancelled) {
          setPricing(data);
          setCustomPrice(data.lot_prices.fair.toFixed(2));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load pricing');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPricing();
    return () => { cancelled = true; };
  }, [sessionId]);

  // ── Auto-resize post textarea ────────────────────────────────────

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [post]);

  // ── Price helpers ────────────────────────────────────────────────

  const selectedPrice = parseFloat(customPrice) || 0;

  const handleTierSelect = (tier: PresetTier) => {
    if (!pricing) return;
    setSelectedTier(tier);
    setCustomPrice(pricing.lot_prices[tier].toFixed(2));
  };

  const handleCustomPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomPrice(val);
    // Deselect preset if the typed value doesn't match any tier
    if (pricing) {
      const num = parseFloat(val);
      if (num === pricing.lot_prices.quick_sale) setSelectedTier('quick_sale');
      else if (num === pricing.lot_prices.fair) setSelectedTier('fair');
      else if (num === pricing.lot_prices.collector) setSelectedTier('collector');
      else setSelectedTier(null);
    }
  };

  // ── Generate lot post ────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (selectedPrice <= 0) return;
    setGenerating(true);
    setGenError(null);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Sign in to generate a lot post');

      const res = await fetch(`/api/sellr/lot/${sessionId}/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lot_price: selectedPrice,
          seller_notes: sellerNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Generation failed');
      }

      const data = await res.json();
      setPost(data.post);
      onPostGenerated();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [sessionId, selectedPrice, sellerNotes, onPostGenerated]);

  // ── Post editing (debounced save) ────────────────────────────────

  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setPost(newText);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;
        await fetch(`/api/sellr/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ collection_ad_copy: newText }),
        });
      } catch {
        // Silent — user can regenerate
      }
    }, 1000);
  };

  // ── Copy to clipboard ────────────────────────────────────────────

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(post);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = post;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Character / word count ───────────────────────────────────────

  const wordCount = post.trim() ? post.trim().split(/\s+/).length : 0;
  const charCountColor =
    wordCount >= 200 ? 'text-red-500' : wordCount >= 150 ? 'text-amber-600' : 'text-sellr-charcoal/40';

  // ── Loading state ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-sellr-surface rounded-xl p-6 flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-sellr-blue animate-spin" />
        <span className="ml-3 text-sm text-sellr-charcoal/60">Calculating lot pricing…</span>
      </div>
    );
  }

  if (error || !pricing) {
    return (
      <div className="bg-sellr-surface rounded-xl p-6 text-center py-12">
        <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
        <p className="text-sm text-sellr-charcoal/60">{error ?? 'Unable to load pricing'}</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="bg-sellr-surface rounded-xl p-6 space-y-8">

      {/* ── Section 1: Collection Summary ──────────────────────────── */}
      <div>
        <div className="grid grid-cols-3 gap-3">
          {/* Low */}
          <div className="bg-white/60 rounded-lg px-3 py-3 text-center">
            <p className="text-xs text-sellr-charcoal/50 uppercase tracking-wide mb-1">Low</p>
            <p className="font-display text-lg sm:text-xl text-sellr-charcoal">
              {fmtUsd(pricing.total_low)}
            </p>
          </div>
          {/* Estimated (amber, larger) */}
          <div className="bg-white/60 rounded-lg px-3 py-3 text-center">
            <p className="text-xs text-sellr-charcoal/50 uppercase tracking-wide mb-1">Estimated</p>
            <p className="font-display text-xl sm:text-2xl text-amber-600 font-semibold">
              {fmtUsd(pricing.total_median)}
            </p>
          </div>
          {/* High */}
          <div className="bg-white/60 rounded-lg px-3 py-3 text-center">
            <p className="text-xs text-sellr-charcoal/50 uppercase tracking-wide mb-1">High</p>
            <p className="font-display text-lg sm:text-xl text-sellr-charcoal">
              {fmtUsd(pricing.total_high)}
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm text-sellr-charcoal/60 text-center">
          {pricing.priced_count} of {recordCount} records priced
        </p>

        {pricing.unpriced_count > 0 && (
          <div className="mt-3 bg-sellr-amber/10 border-l-4 border-sellr-amber rounded-r-lg px-4 py-3">
            <p className="text-sm text-amber-700">
              {pricing.unpriced_count} record{pricing.unpriced_count !== 1 ? 's' : ''} couldn't
              be priced — consider searching for them manually
            </p>
          </div>
        )}
      </div>

      {/* ── Section 2: Suggested Lot Prices ────────────────────────── */}
      <div>
        <h3 className="font-display text-xl sm:text-2xl text-sellr-charcoal mb-4">
          Suggested asking prices
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TIER_CARDS.map(card => {
            const price = pricing.lot_prices[card.id];
            const isSelected = selectedTier === card.id;
            return (
              <button
                key={card.id}
                onClick={() => handleTierSelect(card.id)}
                className={`relative rounded-lg px-4 py-5 text-center transition-colors ${
                  isSelected
                    ? 'border-2 border-sellr-amber bg-white/80'
                    : 'border-2 border-sellr-charcoal/10 bg-white/60 hover:border-sellr-charcoal/20'
                }`}
              >
                {card.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-sellr-sage text-white text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full">
                    {card.badge}
                  </span>
                )}
                <p className="text-xs text-sellr-charcoal/50 uppercase tracking-wide mb-1">
                  {card.label}
                </p>
                <p className="font-display text-2xl sm:text-3xl text-sellr-charcoal">
                  {fmtUsd(price)}
                </p>
                <p className="text-xs text-sellr-charcoal/40 mt-1">{card.subtext}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Custom Price ────────────────────────────────── */}
      <div>
        <label className="block text-sm text-sellr-charcoal/60 mb-2">
          Or set your own price
        </label>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sellr-charcoal/40 text-sm">
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={customPrice}
            onChange={handleCustomPriceChange}
            className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-sellr-charcoal/15 bg-white text-sm text-sellr-charcoal focus:outline-none focus:border-sellr-blue focus:ring-2 focus:ring-sellr-blue/20"
          />
        </div>
      </div>

      {/* ── Section 4: Seller Notes ────────────────────────────────── */}
      <div>
        <label className="block text-sm text-sellr-charcoal/60 mb-2">
          Anything special about your collection?
        </label>
        <textarea
          value={sellerNotes}
          onChange={e => setSellerNotes(e.target.value)}
          placeholder="e.g. All records cleaned and stored in sleeves, includes some rare pressings..."
          maxLength={300}
          rows={3}
          className="w-full bg-white/60 rounded-lg px-4 py-3 text-sm text-sellr-charcoal leading-relaxed resize-none border border-sellr-charcoal/15 focus:outline-none focus:border-sellr-blue focus:ring-2 focus:ring-sellr-blue/20"
        />
        <p className="mt-1 text-xs text-sellr-charcoal/40 text-right">
          {sellerNotes.length}/300
        </p>
      </div>

      {/* ── Section 5: Generate Lot Post ───────────────────────────── */}
      <div className="border-t border-sellr-charcoal/10 pt-6">
        {generating ? (
          <div className="flex items-center justify-center gap-3 py-8 text-sellr-blue">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Generating your lot post…</span>
          </div>
        ) : post ? (
          /* ── Ad Copy Display (inline) ─────────────────────────────── */
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={post}
              onChange={handlePostChange}
              rows={6}
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

            {/* Facebook Preview (collapsible) */}
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
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                    <span className="text-sm font-bold text-blue-600">Marketplace</span>
                  </div>
                  <div className="flex gap-4 p-4">
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 rounded bg-gray-100 flex items-center justify-center">
                        <SellrLogo className="w-10 h-10" color="#d1d5db" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-gray-900 mb-1">
                        {fmtUsd(selectedPrice)}
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-4 whitespace-pre-wrap">{post}</p>
                    </div>
                  </div>
                  <p className="px-4 pb-2 text-[10px] text-gray-400">Preview (approximate)</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Generate Button ──────────────────────────────────────── */
          <button
            onClick={handleGenerate}
            disabled={selectedPrice <= 0}
            className={`w-full px-6 py-4 text-base font-medium rounded transition-colors ${
              selectedPrice > 0
                ? 'bg-sellr-amber text-white hover:bg-sellr-amber-light'
                : 'bg-sellr-charcoal/10 text-sellr-charcoal/30 cursor-not-allowed'
            }`}
          >
            Generate Facebook Post
          </button>
        )}

        {genError && (
          <p className="mt-2 text-xs text-red-500">{genError}</p>
        )}
      </div>
    </div>
  );
};

export default LotPricingPanel;
