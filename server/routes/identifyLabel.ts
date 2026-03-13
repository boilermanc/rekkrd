import { Router } from 'express';
import { Type } from '@google/genai';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { validateBase64Size } from '../middleware/validate.js';
import { ai } from '../lib/gemini.js';
import { retryWithBackoff, isRetryableError } from '../utils/retry.js';
import { withTimeout } from '../utils/timeout.js';
import type { LabelScanResult } from '../../src/types.js';

const router = Router();

const GEMINI_TIMEOUT_MS = 90_000;

const LABEL_PROMPT =
  'This is a photograph of a vinyl record label. Extract structured data from the label text only. '
  + 'Ignore dead wax or runout groove text. '
  + 'Extract: catalog_number (short alphanumeric code on the label), label_name (e.g. Blue Note, Columbia), '
  + 'artist, album_title, year, side (normalize to A or B, return null if unknown), '
  + 'confidence_score (0.0-1.0, use 0.9+ for clear labels, 0.5-0.8 for partial, below 0.5 for unreadable). '
  + 'Return a JSON object with exactly these 7 keys. Return null for any field you cannot determine. '
  + 'Return null for the whole response on failure.';

router.post(
  '/api/identify-label',
  requireAuthWithUser,
  createRateLimit(5, 60),
  async (req, res) => {
    const { userId } = (req as typeof req & { auth: AuthResult }).auth;

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

      const response = await withTimeout(retryWithBackoff(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: LABEL_PROMPT },
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              catalog_number: { type: Type.STRING, nullable: true },
              label_name: { type: Type.STRING, nullable: true },
              artist: { type: Type.STRING, nullable: true },
              album_title: { type: Type.STRING, nullable: true },
              year: { type: Type.STRING, nullable: true },
              side: { type: Type.STRING, nullable: true },
              confidence_score: { type: Type.NUMBER },
            },
            required: ['catalog_number', 'label_name', 'artist', 'album_title', 'year', 'side', 'confidence_score'],
          }
        }
      })), GEMINI_TIMEOUT_MS);

      const rawText = response.text || '{}';
      const data = JSON.parse(rawText);

      // Validate confidence_score exists and is a number
      if (typeof data.confidence_score !== 'number') {
        console.warn(`[identify-label] Gemini returned invalid data for user ${userId}:`, rawText.slice(0, 200));
        res.status(200).json(null);
        return;
      }

      // Normalize side to allowed values
      const VALID_SIDES = ['A', 'B', '1', '2'];
      const normalizedSide = typeof data.side === 'string' && VALID_SIDES.includes(data.side.toUpperCase())
        ? data.side.toUpperCase() as LabelScanResult['side']
        : null;

      const result: LabelScanResult = {
        catalog_number: typeof data.catalog_number === 'string' ? data.catalog_number : null,
        label_name: typeof data.label_name === 'string' ? data.label_name : null,
        artist: typeof data.artist === 'string' ? data.artist : null,
        album_title: typeof data.album_title === 'string' ? data.album_title : null,
        year: typeof data.year === 'string' ? data.year : null,
        side: normalizedSide,
        confidence_score: Math.max(0, Math.min(1, data.confidence_score)),
      };

      res.status(200).json(result);
    } catch (error) {
      console.error('[identify-label] Gemini Error:', error instanceof Error ? error.message : error);
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('timed out')) {
        res.status(504).json({ error: 'AI identification timed out. Try a smaller or clearer image.' });
      } else if (isRetryableError(error)) {
        res.status(503).json({ error: 'AI service is temporarily busy. Please try again in a moment.' });
      } else {
        res.status(500).json({ error: 'Failed to identify label' });
      }
    }
  }
);

export default router;
