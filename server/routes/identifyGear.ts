import { Router } from 'express';
import { Type } from '@google/genai';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { validateBase64Size } from '../middleware/validate.js';
import { ai } from '../lib/gemini.js';
import { getSubscription, incrementScanCount, PLAN_LIMITS } from '../lib/subscription.js';
import { GEAR_CATEGORIES } from '../../types.js';

const router = Router();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const GEMINI_TIMEOUT_MS = 90_000; // 90s — under typical proxy timeouts (120s)

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini request timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

router.post(
  '/api/identify-gear',
  requireAuthWithUser,
  createRateLimit(5, 60),
  async (req, res) => {
    const { userId } = (req as typeof req & { auth: AuthResult }).auth;

    // Subscription check: enforce scan limits
    const sub = await getSubscription(userId);
    const isActive = ['active', 'trialing'].includes(sub.status);
    if (!isActive) {
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
      const { image, mimeType } = req.body;

      if (!image || typeof image !== 'string') {
        res.status(400).json({ error: 'Missing image (base64 string)' });
        return;
      }

      const sizeErr = validateBase64Size(image, 10, 'image');
      if (sizeErr) { res.status(400).json({ error: sizeErr }); return; }

      if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
        res.status(400).json({
          error: 'Invalid or unsupported mimeType. Allowed: image/jpeg, image/png, image/webp, image/gif',
        });
        return;
      }

      const categoryList = GEAR_CATEGORIES.join(', ');

      const response = await withTimeout(ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType, data: image } },
            {
              text: `Identify this audio equipment / hi-fi gear. Return JSON with these fields:

- category: one of ${categoryList}
- brand: manufacturer name (string)
- model: model name/number (string)
- year: release year or approximate era, e.g. "1972" or "early 1980s" (string)
- description: 2-3 sentences about this specific piece of gear — when it was made, what it's known for, its reputation in the audiophile community (string)
- specs: an object with category-appropriate technical specifications. Examples:
  - turntable: drive_type, speeds, tonearm_type, platter_material
  - speakers: type, driver_size, impedance, sensitivity, frequency_response
  - amplifier: power_output, type (tube/solid-state/class-D), inputs, impedance
  - headphones: type (open/closed), driver_size, impedance, sensitivity
  - cartridge: type (MM/MC), output, stylus_type, tracking_force
  Use your judgment for other categories. Values should be strings.
- manual_search_query: a suggested Google search query to find the PDF manual, e.g. "Technics SL-1200MK7 owner's manual PDF" (string)

If you cannot identify the gear, return null for all fields.`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              brand: { type: Type.STRING },
              model: { type: Type.STRING },
              year: { type: Type.STRING },
              description: { type: Type.STRING },
              specs: { type: Type.OBJECT, properties: {} },
              manual_search_query: { type: Type.STRING },
            },
            required: ['category', 'brand', 'model', 'year', 'description', 'specs', 'manual_search_query'],
          },
        },
      }), GEMINI_TIMEOUT_MS);

      const raw = response.text || '{}';
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(raw);
      } catch {
        console.error('Failed to parse Gemini gear response:', raw);
        res.status(500).json({ error: 'Failed to parse AI response' });
        return;
      }

      // Validate required string fields
      if (
        typeof data.brand !== 'string' ||
        typeof data.model !== 'string' ||
        typeof data.category !== 'string'
      ) {
        res.status(200).json(null);
        return;
      }

      // Normalize category to allowed value
      if (!(GEAR_CATEGORIES as readonly string[]).includes(data.category)) {
        data.category = 'cables_other';
      }

      // Increment shared scan counter on success
      await incrementScanCount(userId);

      res.status(200).json({
        category: data.category,
        brand: data.brand,
        model: data.model,
        year: data.year || '',
        description: data.description || '',
        specs: data.specs && typeof data.specs === 'object' ? data.specs : {},
        manual_search_query: data.manual_search_query || '',
      });
    } catch (error) {
      console.error('Gemini Gear Identification Error:', error);
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('timed out')) {
        res.status(504).json({ error: 'AI identification timed out. Try a smaller or clearer image.' });
      } else {
        res.status(500).json({ error: 'Failed to identify gear' });
      }
    }
  }
);

export default router;
