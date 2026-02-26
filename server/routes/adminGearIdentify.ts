import { Router, type Request, type Response } from 'express';
import { Type } from '@google/genai';
import { requireAdmin } from '../middleware/adminAuth.js';
import { validateBase64Size } from '../middleware/validate.js';
import { ai } from '../lib/gemini.js';
import { retryWithBackoff, isRetryableError } from '../utils/retry.js';

const router = Router();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const GEMINI_TIMEOUT_MS = 90_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini request timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

async function handleIdentify(req: Request, res: Response) {
  const { image, mimeType } = req.body;

  if (!image || typeof image !== 'string') {
    res.status(400).json({ error: 'Missing image (base64 string)' });
    return;
  }

  const sizeErr = validateBase64Size(image, 10, 'image');
  if (sizeErr) {
    res.status(400).json({ error: sizeErr });
    return;
  }

  if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
    res.status(400).json({
      error: 'Invalid or unsupported mimeType. Allowed: image/jpeg, image/png, image/webp, image/gif',
    });
    return;
  }

  const response = await withTimeout(retryWithBackoff(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType, data: image } },
        {
          text: `You are an audio equipment identification expert. Analyze this image of audio equipment.

Return a JSON object with these fields:
- brand: manufacturer name (string or null)
- model: model name/number (string or null)
- category: one of: turntable, cartridge, phono_preamp, preamp, amplifier, receiver, speakers, headphones, dac, subwoofer, cables_other (string or null)
- year: approximate year or decade e.g. '1978' or 'Late 1970s' (string or null)
- confidence: 0.0 to 1.0 (number)
- notes: any relevant observations (string)

If you cannot identify the equipment or it is not audio gear, return confidence: 0 and null for brand/model/category/year.`,
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          brand: { type: Type.STRING, nullable: true },
          model: { type: Type.STRING, nullable: true },
          category: { type: Type.STRING, nullable: true },
          year: { type: Type.STRING, nullable: true },
          confidence: { type: Type.NUMBER },
          notes: { type: Type.STRING },
        },
        required: ['brand', 'model', 'category', 'year', 'confidence', 'notes'],
      },
    },
  })), GEMINI_TIMEOUT_MS);

  const raw = response.text || '{}';
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error('[admin-gear-identify] Failed to parse Gemini response:', raw);
    res.status(500).json({ error: 'Failed to parse AI response' });
    return;
  }

  const confidence = typeof data.confidence === 'number' ? data.confidence : 0;

  if (confidence === 0 || (data.brand == null && data.model == null)) {
    res.status(422).json({ error: 'Could not identify gear in image' });
    return;
  }

  res.json({
    brand: data.brand,
    model: data.model,
    category: data.category,
    year: data.year,
    confidence,
    notes: data.notes || '',
  });
}

router.post('/api/admin/gear-catalog/identify-image', requireAdmin, async (req, res, next) => {
  try {
    await handleIdentify(req, res);
  } catch (error) {
    console.error('[admin-gear-identify] Error:', error instanceof Error ? error.message : error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('timed out')) {
      res.status(504).json({ error: 'AI identification timed out. Try a smaller or clearer image.' });
    } else if (isRetryableError(error)) {
      res.status(503).json({ error: 'AI service is temporarily busy. Please try again in a moment.' });
    } else {
      res.status(500).json({ error: 'Failed to identify gear' });
    }
  }
});

export default router;
