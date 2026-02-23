import { useState, useCallback } from 'react';
import type { SellrRecord } from '../types';

export interface SellrSearchResult {
  id: number;
  title: string;
  artist: string;
  year: string;
  label: string;
  format: string;
  country: string;
  thumb: string;
  cover_image: string;
  catno: string;
  lowest_price: number | null;
}

interface UseSellrSearchOptions {
  sessionId: string | null;
  onRecordAdded?: (record: SellrRecord) => void;
}

interface UseSellrSearchReturn {
  results: SellrSearchResult[];
  isSearching: boolean;
  searchError: string | null;
  search: (query: string) => Promise<void>;
  addResult: (result: SellrSearchResult) => Promise<void>;
  isAdding: boolean;
}

/** Parse artist from Discogs-style "Artist - Title" string. */
function parseDiscogsTitle(raw: string): { artist: string; title: string } {
  const parts = raw.split(' - ');
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  }
  return { artist: '', title: raw.trim() };
}

export function useSellrSearch({ sessionId, onRecordAdded }: UseSellrSearchOptions): UseSellrSearchReturn {
  const [results, setResults] = useState<SellrSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const params = new URLSearchParams({
        q: trimmed,
        type: 'release',
        format: 'vinyl',
        per_page: '20',
      });

      const res = await fetch(`/api/discogs/search?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Search failed' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const mapped: SellrSearchResult[] = (data.results ?? []).map((r: Record<string, unknown>) => {
        const parsed = parseDiscogsTitle(r.title as string || '');
        return {
          id: r.id as number,
          title: parsed.title,
          artist: parsed.artist,
          year: (r.year as string) || '',
          label: Array.isArray(r.label) ? r.label[0] || '' : '',
          format: Array.isArray(r.format) ? r.format.join(', ') : '',
          country: (r.country as string) || '',
          thumb: (r.thumb as string) || '',
          cover_image: (r.cover_image as string) || '',
          catno: (r.catno as string) || '',
          lowest_price: null, // Populated when user fetches release details
        };
      });

      setResults(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setSearchError(message);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const addResult = useCallback(async (result: SellrSearchResult) => {
    if (!sessionId) {
      setSearchError('No active session');
      return;
    }

    setIsAdding(true);
    setSearchError(null);

    try {
      // Fetch full release details for pricing
      let priceLow: number | null = null;
      let priceMedian: number | null = null;
      let priceHigh: number | null = null;
      let label: string | null = result.label || null;

      try {
        const releaseRes = await fetch(`/api/discogs/releases/${result.id}`);
        if (releaseRes.ok) {
          const release = await releaseRes.json();
          if (release.lowest_price != null) priceLow = release.lowest_price;
          if (release.community?.rating?.count > 0 && release.num_for_sale > 0) {
            // lowest_price is the actual cheapest listing; estimate median as ~1.5x
            priceMedian = priceLow != null ? Math.round(priceLow * 1.5 * 100) / 100 : null;
            priceHigh = priceLow != null ? Math.round(priceLow * 2.5 * 100) / 100 : null;
          }
          if (release.labels?.[0]?.name) label = release.labels[0].name;
        }
      } catch {
        // Non-fatal — save without pricing
      }

      const res = await fetch('/api/sellr/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          title: result.title,
          artist: result.artist,
          year: result.year ? parseInt(result.year, 10) || null : null,
          label,
          condition: 'VG',
          discogs_id: String(result.id),
          cover_image: result.cover_image || result.thumb || null,
          price_low: priceLow,
          price_median: priceMedian,
          price_high: priceHigh,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to add record' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const record: SellrRecord = await res.json();
      onRecordAdded?.(record);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add record';
      setSearchError(message);
    } finally {
      setIsAdding(false);
    }
  }, [sessionId, onRecordAdded]);

  return { results, isSearching, searchError, search, addResult, isAdding };
}
