import { useState, useCallback } from 'react';
import { useSellrAccount } from './useSellrAccount';
import type { SellrRecord } from '../types';

interface UseSellrScannerOptions {
  sessionId: string | null;
  onRecordAdded?: (record: SellrRecord) => void;
}

interface UseSellrScannerReturn {
  scan: (base64DataUrl: string) => Promise<void>;
  scanFromFile: (file: File) => Promise<void>;
  scanFromUrl: (url: string) => Promise<void>;
  isScanning: boolean;
  scanError: string | null;
  tierLimitReached: boolean;
  noSlots: boolean;
  slotsRemaining: number;
}

/** Convert a File to a base64 data URL. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize a base64 data URL image so its longest edge is at most `maxPx`.
 * Mirrors the resizeForAI helper in geminiService.ts.
 */
function resizeForScan(base64DataUrl: string, maxPx = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w <= maxPx && h <= maxPx) { resolve(base64DataUrl); return; }
      const scale = maxPx / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(base64DataUrl);
    img.src = base64DataUrl;
  });
}

/** Call the unauthenticated Sellr identify endpoint. */
async function sellrIdentify(
  sessionId: string,
  base64DataUrl: string,
): Promise<{ artist: string; title: string; barcode?: string } | null> {
  const resized = await resizeForScan(base64DataUrl);
  const [header, base64Data] = resized.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

  const res = await fetch('/api/sellr/scan/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, base64Data, mimeType }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Identify failed', code: res.status }));
    throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { code: body.code ?? res.status });
  }

  const data = await res.json();
  if (!data || typeof data.artist !== 'string' || typeof data.title !== 'string') return null;

  return {
    artist: data.artist,
    title: data.title,
    ...(typeof data.barcode === 'string' && data.barcode.length > 0 ? { barcode: data.barcode } : {}),
  };
}

/** Call the unauthenticated Sellr metadata endpoint for pricing. */
async function sellrMetadata(
  sessionId: string,
  artist: string,
  title: string,
): Promise<{
  year?: string;
  label?: string;
  cover_url?: string;
  price_low?: number;
  price_median?: number;
  price_high?: number;
  discogs_url?: string;
}> {
  const res = await fetch('/api/sellr/scan/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, artist, title }),
  });

  if (!res.ok) {
    // Non-fatal — return minimal metadata so the record can still be saved
    return { year: undefined, cover_url: '' };
  }

  const data = await res.json();
  return {
    year: typeof data.year === 'string' ? data.year : undefined,
    label: typeof data.label === 'string' ? data.label : undefined,
    cover_url: typeof data.cover_url === 'string' ? data.cover_url : '',
    price_low: typeof data.price_low === 'number' ? data.price_low : undefined,
    price_median: typeof data.price_median === 'number' ? data.price_median : undefined,
    price_high: typeof data.price_high === 'number' ? data.price_high : undefined,
    discogs_url: typeof data.discogs_url === 'string' ? data.discogs_url : undefined,
  };
}

/** Post a scanned + appraised record to the Sellr records API. */
async function postSellrRecord(
  sessionId: string,
  identity: { artist: string; title: string; barcode?: string },
  metadata: {
    year?: string;
    label?: string;
    cover_url?: string;
    price_low?: number;
    price_median?: number;
    price_high?: number;
    discogs_url?: string;
  },
): Promise<SellrRecord> {
  let discogs_id: string | null = null;
  if (metadata.discogs_url) {
    const match = metadata.discogs_url.match(/\/release\/(\d+)/);
    if (match) discogs_id = match[1];
  }

  const res = await fetch('/api/sellr/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      title: identity.title,
      artist: identity.artist,
      year: metadata.year ? parseInt(metadata.year, 10) || null : null,
      label: metadata.label ?? null,
      condition: 'VG',
      discogs_id,
      cover_image: metadata.cover_url || null,
      price_low: metadata.price_low ?? null,
      price_median: metadata.price_median ?? null,
      price_high: metadata.price_high ?? null,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed', code: res.status }));
    throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { code: body.code ?? res.status });
  }

  return res.json();
}

export function useSellrScanner({ sessionId, onRecordAdded }: UseSellrScannerOptions): UseSellrScannerReturn {
  const { slotsRemaining } = useSellrAccount();
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [tierLimitReached, setTierLimitReached] = useState(false);
  const [noSlots, setNoSlots] = useState(false);

  const scan = useCallback(async (base64DataUrl: string) => {
    if (!sessionId) {
      setScanError('No active session');
      return;
    }

    if (slotsRemaining <= 0) {
      setNoSlots(true);
      setScanError('No slots remaining');
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setTierLimitReached(false);
    setNoSlots(false);

    try {
      // 1. Identify album via Sellr scan endpoint (unauthenticated)
      const identity = await sellrIdentify(sessionId, base64DataUrl);
      if (!identity) {
        setScanError("Couldn't identify that record. Try a clearer photo or different angle.");
        return;
      }

      // 2. Fetch metadata + Discogs pricing via Sellr metadata endpoint
      const metadata = await sellrMetadata(sessionId, identity.artist, identity.title);

      // 3. Save to Sellr records
      const record = await postSellrRecord(sessionId, identity, metadata);
      onRecordAdded?.(record);
    } catch (err: unknown) {
      const error = err as Error & { code?: number | string };
      if (error.code === 'NO_SLOTS' || error.code === 402) {
        setNoSlots(true);
        setScanError('No slots remaining');
      } else if (error.code === 403) {
        setTierLimitReached(true);
        setScanError('Tier limit reached');
      } else {
        setScanError(error.message || 'Scan failed');
      }
    } finally {
      setIsScanning(false);
    }
  }, [sessionId, slotsRemaining, onRecordAdded]);

  const scanFromFile = useCallback(async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      await scan(base64);
    } catch {
      setScanError('Failed to read image file');
      setIsScanning(false);
    }
  }, [scan]);

  const scanFromUrl = useCallback(async (url: string) => {
    if (!sessionId) {
      setScanError('No active session');
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setTierLimitReached(false);

    try {
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Failed to fetch image');

      const blob = await res.blob();
      const base64 = await fileToBase64(new File([blob], 'scan.jpg', { type: blob.type }));
      setIsScanning(false);
      await scan(base64);
    } catch (err: unknown) {
      const error = err as Error & { code?: number | string };
      if (error.code === 'NO_SLOTS' || error.code === 402) {
        setNoSlots(true);
        setScanError('No slots remaining');
      } else if (error.code === 403) {
        setTierLimitReached(true);
        setScanError('Tier limit reached');
      } else {
        setScanError(error.message || 'Failed to scan from URL');
      }
      setIsScanning(false);
    }
  }, [sessionId, scan]);

  return { scan, isScanning, scanError, scanFromFile, scanFromUrl, tierLimitReached, noSlots, slotsRemaining };
}
