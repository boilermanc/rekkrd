import { Router } from 'express';
import { Type } from '@google/genai';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { validateBase64Size } from '../middleware/validate.js';
import { ai } from '../lib/gemini.js';
import { getSubscription, incrementScanCount, PLAN_LIMITS } from '../lib/subscription.js';

const router = Router();

const GEMINI_TIMEOUT_MS = 90_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini request timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
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
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: 'Identify this vinyl record album. Return only the Artist and Album Title as JSON with keys "artist" and "title". If you cannot identify it, return null.' }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              artist: { type: Type.STRING },
              title: { type: Type.STRING }
            },
            required: ['artist', 'title']
          }
        }
      }), GEMINI_TIMEOUT_MS);

      const data = JSON.parse(response.text || '{}');
      if (typeof data.artist !== 'string' || typeof data.title !== 'string') {
        res.status(200).json(null);
        return;
      }

      // Increment scan counter on successful identification
      await incrementScanCount(userId);

      res.status(200).json({ artist: data.artist, title: data.title });
    } catch (error) {
      console.error('Gemini Identification Error:', error);
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
