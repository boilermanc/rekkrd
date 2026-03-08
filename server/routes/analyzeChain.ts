import { Router } from 'express';
import { Type } from '@google/genai';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { ai } from '../lib/gemini.js';
import { retryWithBackoff, isRetryableError } from '../utils/retry.js';

const router = Router();

// ── Per-user rate limiting (5 analyses per hour) ────────────────────

interface UserRateEntry {
  count: number;
  expiresAt: number;
}

const userRateStore = new Map<string, UserRateEntry>();
const USER_MAX_ANALYSES = 5;
const USER_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkUserRateLimit(userId: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();

  // Clean expired entries
  for (const [key, entry] of userRateStore) {
    if (entry.expiresAt <= now) userRateStore.delete(key);
  }

  const entry = userRateStore.get(userId);

  if (!entry || entry.expiresAt <= now) {
    userRateStore.set(userId, { count: 1, expiresAt: now + USER_WINDOW_MS });
    return { allowed: true };
  }

  entry.count++;
  if (entry.count > USER_MAX_ANALYSES) {
    const retryAfterSec = Math.ceil((entry.expiresAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  return { allowed: true };
}

// ── Signal chain categories (hardcoded to avoid cross-boundary import) ──

const SIGNAL_CHAIN_CATEGORIES = [
  'turntable',
  'cartridge',
  'phono_preamp',
  'dac',
  'preamp',
  'amplifier',
  'receiver',
  'speakers',
  'headphones',
  'subwoofer',
  'cables_other',
] as const;

// ── Gemini response schema ──────────────────────────────────────────

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overall_rating: { type: Type.STRING },
    summary: { type: Type.STRING },
    compatibility_notes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          severity: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          affected_gear: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['severity', 'title', 'description', 'affected_gear'],
      },
    },
    gaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          reason: { type: Type.STRING },
          insert_after: { type: Type.STRING },
          priority: { type: Type.STRING },
        },
        required: ['category', 'reason', 'insert_after', 'priority'],
      },
    },
    tips: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ['title', 'description'],
      },
    },
  },
  required: ['overall_rating', 'summary', 'compatibility_notes', 'gaps', 'tips'],
} as const;

// ── Route ───────────────────────────────────────────────────────────

router.post(
  '/api/analyze-chain',
  requireAuthWithUser,
  createRateLimit(10, 60),
  async (req, res) => {
    const { userId } = (req as typeof req & { auth: AuthResult }).auth;

    // Per-user hourly rate limit
    const rateCheck = checkUserRateLimit(userId);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSec));
      res.status(429).json({
        error: 'Analysis limit reached. You can run 5 analyses per hour.',
        retryAfterSec: rateCheck.retryAfterSec,
      });
      return;
    }

    try {
      const { gear, goals } = req.body;

      // Validate gear array
      if (!Array.isArray(gear) || gear.length === 0) {
        res.status(400).json({ error: 'gear array is required and must not be empty' });
        return;
      }

      if (gear.length > 50) {
        res.status(400).json({ error: 'Too many gear items (max 50)' });
        return;
      }

      // Validate each gear item has required fields
      for (const item of gear) {
        if (!item.id || typeof item.id !== 'string') {
          res.status(400).json({ error: 'Each gear item must have a string id' });
          return;
        }
        if (!item.name || typeof item.name !== 'string') {
          res.status(400).json({ error: 'Each gear item must have a string name' });
          return;
        }
        if (!item.category || typeof item.category !== 'string') {
          res.status(400).json({ error: 'Each gear item must have a string category' });
          return;
        }
      }

      // Build gear summary for the prompt
      const gearSummary = gear.map((g: { id: string; name: string; brand?: string; category: string; notes?: string }) => {
        const parts = [`ID: ${g.id}`, `Name: ${g.name}`, `Category: ${g.category}`];
        if (g.brand) parts.push(`Brand: ${g.brand}`);
        if (g.notes) parts.push(`Notes: ${g.notes}`);
        return parts.join(' | ');
      }).join('\n');

      // Build optional system goals context
      let goalsContext = '';
      if (goals && typeof goals === 'object') {
        const { useCases, listeningPriority, specialistRoles } = goals as {
          useCases?: string[];
          listeningPriority?: string;
          specialistRoles?: { gearId: string; gearName: string; role: string }[];
        };
        if (Array.isArray(useCases) && useCases.length > 0) {
          goalsContext += `\nUser system goals and context:\n`;
          goalsContext += `- Use cases: ${useCases.join(', ')}\n`;
        }
        if (typeof listeningPriority === 'string' && listeningPriority) {
          if (!goalsContext) goalsContext += `\nUser system goals and context:\n`;
          goalsContext += `- Listening priority: ${listeningPriority}\n`;
        }
        if (Array.isArray(specialistRoles) && specialistRoles.length > 0) {
          if (!goalsContext) goalsContext += `\nUser system goals and context:\n`;
          goalsContext += `- Specialist component roles:\n`;
          for (const r of specialistRoles) {
            if (r.gearName) {
              goalsContext += `  • ${r.gearName}: ${r.role || 'specialist/dedicated role'}\n`;
            }
          }
        }
        if (goalsContext) {
          goalsContext += `\nIMPORTANT: Respect these stated roles. Do not recommend removing or replacing components the user has identified as serving a specific purpose. Frame recommendations around the user's goals, not a generic ideal setup.\n`;
        }
      }

      const systemPrompt =
        'You are an expert audio equipment consultant specializing in hi-fi, vinyl playback, and home audio systems. '
        + 'You analyze signal chains — the path audio takes from source to speakers — and provide practical advice.\n\n'
        + 'The valid gear categories in signal chain order are:\n'
        + SIGNAL_CHAIN_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')
        + '\n\n'
        + goalsContext
        + 'Analyze the following gear list and return a JSON assessment.\n\n'
        + 'Rules:\n'
        + '- overall_rating must be one of: "excellent", "good", "needs_attention", "incomplete"\n'
        + '- compatibility_notes severity must be one of: "info", "warning", "issue"\n'
        + '- gaps priority must be one of: "required", "recommended", "nice_to_have"\n'
        + '- affected_gear values must be gear IDs from the list provided\n'
        + '- insert_after must be a category name from the valid categories list\n'
        + '- Be practical and specific — reference actual gear names, not generic advice\n'
        + '- If the setup is solid, say so — don\'t invent problems\n\n'
        + 'User\'s gear:\n' + gearSummary;

      const response = await retryWithBackoff(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: systemPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: ANALYSIS_SCHEMA,
        },
      }));

      const rawText = response.text || '{}';
      const analysis = JSON.parse(rawText);

      // Validate required top-level fields exist
      if (
        typeof analysis.overall_rating !== 'string' ||
        typeof analysis.summary !== 'string' ||
        !Array.isArray(analysis.compatibility_notes) ||
        !Array.isArray(analysis.gaps) ||
        !Array.isArray(analysis.tips)
      ) {
        console.warn('[analyze-chain] Gemini returned unexpected shape:', rawText.slice(0, 300));
        res.status(502).json({ error: 'AI returned an invalid response. Please try again.' });
        return;
      }

      res.status(200).json(analysis);
    } catch (error) {
      console.error('[analyze-chain] Error:', error instanceof Error ? error.message : error);

      if (isRetryableError(error)) {
        res.status(503).json({ error: 'AI service is temporarily busy. Please try again in a moment.' });
      } else {
        res.status(500).json({ error: 'Failed to analyze signal chain' });
      }
    }
  }
);

export default router;
