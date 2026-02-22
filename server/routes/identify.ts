import { Router } from 'express';
import { Type } from '@google/genai';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { validateBase64Size } from '../middleware/validate.js';
import { ai } from '../lib/gemini.js';
import { getSubscription, incrementScanCount, PLAN_LIMITS } from '../lib/subscription.js';
import { searchDiscogs } from '../services/discogsService.js';
import type { DiscogsMatch } from '../../types.js';

const router = Router();

const GEMINI_TIMEOUT_MS = 90_000;
const MIN_BARCODE_LENGTH = 8;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini request timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

/** Return the first barcode that is all digits and >= MIN_BARCODE_LENGTH, or null. */
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

router.post(
  '/api/identify',
  requireAuthWithUser,
  createRateLimit(5, 60),
  async (req, res) => {
    const { userId } = (req as typeof req & { auth: AuthResult }).auth;

    // Subscription check: enforce scan limits for free tier
    const sub = await getSubscription(userId);
    const isActive = ['active', 'trialing'].includes(sub.status);
    if (!isActive) {
      console.warn(`[identify] Subscription inactive for user ${userId}: status=${sub.status}, plan=${sub.plan}`);
      res.status(403).json({ error: 'Subscription inactive', status: sub.status });
      return;
    }
    const scanLimit = PLAN_LIMITS[sub.plan].scans;
    if (scanLimit !== Infinity && sub.aiScansUsed >= scanLimit) {
      res.status(403).json({
        error: 'Monthly scan limit reached',
        code: 'SCAN_LIMIT_REACHED',
        limit: scanLimit,
        used: sub.aiScansUsed,
        resetsAt: sub.aiScansResetAt,
      });
      return;
    }

    try {
      const { base64Data, mimeType } = req.body;
      if (!base64Data || typeof base64Data !== 'string') {
        res.status(400).json({ error: 'Missing base64Data' });
        return;
      }

      const sizeErr = validateBase64Size(base64Data, 10, 'base64Data');
      if (sizeErr) { res.status(400).json({ error: sizeErr }); return; }

      const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
        res.status(400).json({ error: 'Invalid or unsupported mimeType. Allowed: image/jpeg, image/png, image/webp, image/gif' });
        return;
      }

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
        console.warn(`[identify] Gemini returned invalid data:`, rawText.slice(0, 200));
        res.status(200).json(null);
        return;
      }

      // Extract first valid barcode (>= 8 digits)
      const barcode = extractValidBarcode(data.barcodes);

      // Increment scan counter on successful identification
      await incrementScanCount(userId);

      // Cross-reference with Discogs (non-blocking — never fails the overall request)
      let discogsMatches: DiscogsMatch[] | undefined;
      const skipDiscogs = req.query.skipDiscogs === 'true';

      if (!skipDiscogs) {
        try {
          // Barcode search first (higher confidence)
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

          // Text search to fill remaining slots (up to 3 total)
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
          console.warn('[identify] Discogs cross-reference failed (non-fatal):', discogsErr instanceof Error ? discogsErr.message : discogsErr);
        }
      }

      res.status(200).json({
        artist: data.artist,
        title: data.title,
        ...(barcode ? { barcode } : {}),
        discogsMatches,
      });
    } catch (error) {
      console.error('[identify] Gemini Identification Error:', error instanceof Error ? error.message : error);
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('timed out')) {
        res.status(504).json({ error: 'AI identification timed out. Try a smaller or clearer image.' });
      } else {
        res.status(500).json({ error: 'Failed to identify album' });
      }
    }
  }
);

export default router;
