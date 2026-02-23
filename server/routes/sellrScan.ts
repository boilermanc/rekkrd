import { Router, type Request, type Response } from 'express';
import { Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { validateBase64Size, validateStringLength } from '../middleware/validate.js';
import { sanitizePromptInput } from '../middleware/sanitize.js';
import { ai } from '../lib/gemini.js';
import { USER_AGENT } from '../lib/constants.js';
import { searchItunes } from '../lib/itunes.js';
import { searchDiscogs } from '../services/discogsService.js';
import type { DiscogsMatch } from '../../types.js';

const router = Router();

const GEMINI_TIMEOUT_MS = 90_000;
const MIN_BARCODE_LENGTH = 8;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// ── In-memory per-session rate limiter ───────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count++;
  return true;
}

// Periodic cleanup to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 10 * 60 * 1000); // every 10 minutes

// ── Helpers ──────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function errorResponse(res: Response, code: number, message: string) {
  res.status(code).json({ error: message, code });
}

async function requireActiveSession(sessionId: unknown): Promise<boolean> {
  if (!sessionId || typeof sessionId !== 'string') return false;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('sellr_sessions')
    .select('status, expires_at')
    .eq('id', sessionId)
    .single();

  if (error || !data) return false;
  if (data.status === 'expired' || new Date(data.expires_at) < new Date()) return false;
  return true;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini request timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

function extractValidBarcode(barcodes: unknown): string | null {
  if (!Array.isArray(barcodes)) return null;
  for (const bc of barcodes) {
    if (typeof bc === 'string' && /^\d+$/.test(bc) && bc.length >= MIN_BARCODE_LENGTH) {
      return bc;
    }
  }
  return null;
}

function mapDiscogsResults(
  results: Awaited<ReturnType<typeof searchDiscogs>>['results'],
  matchType: 'barcode' | 'text',
  limit: number,
): DiscogsMatch[] {
  return results.slice(0, limit).map(r => ({
    id: r.id,
    title: r.title,
    year: r.year || '',
    country: r.country || '',
    format: r.format?.join(', ') || '',
    thumb: r.thumb || '',
    catno: r.catno || '',
    label: r.label?.[0] || '',
    matchType,
  }));
}

async function findCoverUrl(artist: string, title: string, geminiUrl?: string): Promise<string> {
  if (geminiUrl) {
    try {
      const check = await fetch(geminiUrl, { method: 'HEAD', headers: { 'User-Agent': USER_AGENT } });
      if (check.ok) return geminiUrl;
    } catch { /* fall through */ }
  }

  const results = await searchItunes(artist, title, 1);
  if (results.length > 0) return results[0].url;

  return '';
}

// ── POST /api/sellr/scan/identify ────────────────────────────────────
// Gemini Vision album identification — no user auth, session_id only.
router.post('/api/sellr/scan/identify', async (req: Request, res: Response) => {
  try {
    const { session_id, base64Data, mimeType } = req.body ?? {};

    if (!session_id) {
      errorResponse(res, 400, 'session_id is required');
      return;
    }

    const active = await requireActiveSession(session_id);
    if (!active) {
      errorResponse(res, 404, 'Session not found or expired');
      return;
    }

    if (!checkRateLimit(session_id)) {
      errorResponse(res, 429, 'Rate limit exceeded');
      return;
    }

    if (!base64Data || typeof base64Data !== 'string') {
      errorResponse(res, 400, 'Missing base64Data');
      return;
    }

    const sizeErr = validateBase64Size(base64Data, 10, 'base64Data');
    if (sizeErr) { errorResponse(res, 400, sizeErr); return; }

    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
      errorResponse(res, 400, 'Invalid or unsupported mimeType. Allowed: image/jpeg, image/png, image/webp, image/gif');
      return;
    }

    // Gemini Vision identify — identical prompt to /api/identify
    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: 'Identify this vinyl record album. Return the Artist and Album Title. '
              + 'Also look for any barcode numbers visible on the sleeve, label, or sticker. '
              + 'Return JSON with keys "artist", "title", and "barcodes" (an array of barcode number strings found, or empty array if none visible). '
              + 'If you cannot identify the album, return null.',
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            artist: { type: Type.STRING },
            title: { type: Type.STRING },
            barcodes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['artist', 'title', 'barcodes']
        }
      }
    }), GEMINI_TIMEOUT_MS);

    const rawText = response.text || '{}';
    const data = JSON.parse(rawText);
    if (typeof data.artist !== 'string' || typeof data.title !== 'string') {
      console.warn('[sellr-scan] Gemini returned invalid data:', rawText.slice(0, 200));
      res.status(200).json(null);
      return;
    }

    const barcode = extractValidBarcode(data.barcodes);

    // Cross-reference with Discogs (non-fatal)
    let discogsMatches: DiscogsMatch[] | undefined;
    try {
      if (barcode) {
        const barcodeResult = await searchDiscogs({
          barcode,
          type: 'release',
          per_page: '3',
        });
        if (barcodeResult.results?.length) {
          discogsMatches = mapDiscogsResults(barcodeResult.results, 'barcode', 3);
        }
      }

      const textSlots = 3 - (discogsMatches?.length || 0);
      if (textSlots > 0) {
        const textResult = await searchDiscogs({
          artist: data.artist,
          title: data.title,
          type: 'release',
          per_page: String(textSlots),
        });
        if (textResult.results?.length) {
          const barcodeIds = new Set(discogsMatches?.map(m => m.id) || []);
          const textMatches = mapDiscogsResults(
            textResult.results.filter(r => !barcodeIds.has(r.id)),
            'text',
            textSlots,
          );
          discogsMatches = [...(discogsMatches || []), ...textMatches];
        }
      }
    } catch (discogsErr) {
      console.warn('[sellr-scan] Discogs cross-reference failed (non-fatal):', discogsErr instanceof Error ? discogsErr.message : discogsErr);
    }

    res.status(200).json({
      artist: data.artist,
      title: data.title,
      ...(barcode ? { barcode } : {}),
      discogsMatches,
    });
  } catch (error) {
    console.error('[sellr-scan] Identify error:', error instanceof Error ? error.message : error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('timed out')) {
      errorResponse(res, 504, 'AI identification timed out. Try a smaller or clearer image.');
    } else {
      errorResponse(res, 500, 'Failed to identify album');
    }
  }
});

// ── POST /api/sellr/scan/metadata ────────────────────────────────────
// Gemini metadata + pricing enrichment — no user auth, session_id only.
router.post('/api/sellr/scan/metadata', async (req: Request, res: Response) => {
  try {
    const { session_id, artist: rawArtist, title: rawTitle } = req.body ?? {};

    if (!session_id) {
      errorResponse(res, 400, 'session_id is required');
      return;
    }

    const active = await requireActiveSession(session_id);
    if (!active) {
      errorResponse(res, 404, 'Session not found or expired');
      return;
    }

    if (!checkRateLimit(session_id)) {
      errorResponse(res, 429, 'Rate limit exceeded');
      return;
    }

    if (!rawArtist || !rawTitle || typeof rawArtist !== 'string' || typeof rawTitle !== 'string') {
      errorResponse(res, 400, 'artist and title are required');
      return;
    }

    const artistErr = validateStringLength(rawArtist, 500, 'artist');
    if (artistErr) { errorResponse(res, 400, artistErr); return; }
    const titleErr = validateStringLength(rawTitle, 500, 'title');
    if (titleErr) { errorResponse(res, 400, titleErr); return; }

    const artist = sanitizePromptInput(rawArtist, 500);
    const title = sanitizePromptInput(rawTitle, 500);

    // Identical prompt to /api/metadata
    const prompt = `Search for the official high-quality album details for "${title}" by "${artist}".

I need the following information:
1. Release year and primary genre.
2. A short poetic description and 3-5 tags.
3. Link to high-quality cover art (cover_url).
4. Discogs marketplace pricing in USD based on recent sales — you MUST include all three: "price_low", "price_median", and "price_high" as numbers.
5. Official links: "discogs_url" and "musicbrainz_url".
6. A "sample_url" (YouTube or Preview link).
7. The tracklist as an array of strings.

Respond with ONLY valid JSON matching this exact structure (no markdown, no code fences):
{"artist":"...","title":"...","year":"...","genre":"...","description":"...","cover_url":"...","price_low":0,"price_median":0,"price_high":0,"discogs_url":"...","musicbrainz_url":"...","sample_url":"...","tracklist":["..."],"tags":["..."]}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let rawText = (response.text || '{}').replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    let data = JSON.parse(rawText);

    if (typeof data.artist !== 'string') data.artist = artist;
    if (typeof data.title !== 'string') data.title = title;
    if (data.price_low != null) data.price_low = Number(data.price_low) || 0;
    if (data.price_median != null) data.price_median = Number(data.price_median) || 0;
    if (data.price_high != null) data.price_high = Number(data.price_high) || 0;
    if (!Array.isArray(data.tracklist)) data.tracklist = [];
    if (!Array.isArray(data.tags)) data.tags = [];

    data.cover_url = await findCoverUrl(artist, title, data.cover_url);

    // Fallback for missing pricing/year/genre
    const missingPricing = !data.price_low || !data.price_median || !data.price_high;
    if (!data.year || !data.genre || missingPricing) {
      try {
        const fallbackPrompt = `Find missing info for "${title}" by "${artist}": year, genre, and Discogs marketplace pricing in USD (price_low, price_median, price_high). Respond with valid JSON only — no markdown, no code fences.`;
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fallbackPrompt,
          config: {
            tools: [{ googleSearch: {} }],
          }
        });
        const fallbackRaw = (fallbackResponse.text || '{}').replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        const fallbackData = JSON.parse(fallbackRaw);
        if (!data.year && fallbackData.year) data.year = fallbackData.year;
        if (!data.genre && fallbackData.genre) data.genre = fallbackData.genre;
        if (!data.price_low && fallbackData.price_low) data.price_low = Number(fallbackData.price_low) || 0;
        if (!data.price_median && fallbackData.price_median) data.price_median = Number(fallbackData.price_median) || 0;
        if (!data.price_high && fallbackData.price_high) data.price_high = Number(fallbackData.price_high) || 0;
      } catch (fallbackErr) {
        console.warn('[sellr-scan] Metadata fallback failed (non-fatal):', fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
      }
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('[sellr-scan] Metadata error:', error instanceof Error ? error.message : error);
    errorResponse(res, 500, 'Failed to fetch metadata');
  }
});

export default router;
