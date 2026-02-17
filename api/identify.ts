import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Type } from '@google/genai';
import { requireAuthWithUser } from './_auth';
import { cors } from './_cors';
import { ai } from './_gemini';
import { rateLimit } from './_rateLimit';
import { getSubscription, incrementScanCount, PLAN_LIMITS } from './_subscription';
import { validateBase64Size, validateStringLength } from './_validate';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res, 'POST')) return;
  const auth = await requireAuthWithUser(req, res);
  if (!auth) return;
  if (rateLimit(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Subscription check: enforce scan limits for free tier
  const sub = await getSubscription(auth.userId);
  const isActive = ['active', 'trialing'].includes(sub.status);
  if (!isActive) {
    return res.status(403).json({ error: 'Subscription inactive', status: sub.status });
  }
  const scanLimit = PLAN_LIMITS[sub.plan].scans;
  if (scanLimit !== Infinity && sub.aiScansUsed >= scanLimit) {
    return res.status(403).json({
      error: 'Monthly scan limit reached',
      code: 'SCAN_LIMIT_REACHED',
      limit: scanLimit,
      used: sub.aiScansUsed,
      resetsAt: sub.aiScansResetAt,
    });
  }

  try {
    const { base64Data, mimeType } = req.body;
    if (!base64Data || typeof base64Data !== 'string') {
      return res.status(400).json({ error: 'Missing base64Data' });
    }

    const sizeErr = validateBase64Size(base64Data, 10, 'base64Data');
    if (sizeErr) return res.status(400).json({ error: sizeErr });

    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({ error: 'Invalid or unsupported mimeType. Allowed: image/jpeg, image/png, image/webp, image/gif' });
    }

    const response = await ai.models.generateContent({
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
    });

    const data = JSON.parse(response.text || '{}');
    if (typeof data.artist !== 'string' || typeof data.title !== 'string') {
      return res.status(200).json(null);
    }

    // Increment scan counter on successful identification
    await incrementScanCount(auth.userId);

    return res.status(200).json({ artist: data.artist, title: data.title });
  } catch (error) {
    console.error('Gemini Identification Error:', error);
    return res.status(500).json({ error: 'Failed to identify album' });
  }
}
