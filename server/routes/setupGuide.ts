import { Router } from 'express';
import { Type } from '@google/genai';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { ai } from '../lib/gemini.js';
import { requirePlan } from '../lib/subscription.js';

interface GearInput {
  category: string;
  brand: string;
  model: string;
  specs?: Record<string, unknown>;
}

const router = Router();

router.post(
  '/api/setup-guide',
  requireAuthWithUser,
  createRateLimit(3, 60),
  async (req, res) => {
    const { userId } = (req as typeof req & { auth: AuthResult }).auth;

    // Curator+ only
    const sub = await requirePlan(userId, 'curator', res);
    if (!sub) return;

    try {
      const { gear, goals } = req.body;

      if (!Array.isArray(gear)) {
        res.status(400).json({ error: 'Missing gear array' });
        return;
      }

      if (gear.length < 2) {
        res.status(400).json({ error: 'At least 2 gear items are required to generate a setup guide' });
        return;
      }

      // Cap at 20 items to keep prompt reasonable
      const MAX_GEAR = 20;
      const gearList: GearInput[] = gear.slice(0, MAX_GEAR).map((g: GearInput) => ({
        category: String(g.category || '').trim(),
        brand: String(g.brand || '').trim(),
        model: String(g.model || '').trim(),
        specs: g.specs && typeof g.specs === 'object' ? g.specs : undefined,
      }));

      // Validate each item has at least brand and model
      for (let i = 0; i < gearList.length; i++) {
        if (!gearList[i].brand || !gearList[i].model) {
          res.status(400).json({ error: `Gear item at index ${i} is missing brand or model` });
          return;
        }
      }

      // Build the gear description for the prompt
      const gearDescription = gearList.map((g, i) => {
        let line = `${i + 1}. ${g.brand} ${g.model} (${g.category})`;
        if (g.specs && Object.keys(g.specs).length > 0) {
          const specStr = Object.entries(g.specs)
            .slice(0, 10)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          line += ` — Specs: ${specStr}`;
        }
        return line;
      }).join('\n');

      // Build optional goals context
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
          goalsContext += `\nIMPORTANT: Tailor the setup guide to the user's stated goals and use cases. Respect specialist roles — do not suggest removing or bypassing components the user has identified as serving a specific purpose.\n`;
        }
      }

      const prompt = `You are an expert audio engineer and hi-fi setup consultant. A user has the following audio gear, listed in their preferred signal chain order:

${gearDescription}
${goalsContext}
Generate a comprehensive wiring and setup guide for this specific combination of equipment. Return JSON with these fields:

1. signal_chain: string[] — The recommended signal path in order. Each entry should be formatted as "Brand Model (Category)", e.g. "Technics SL-1200MK7 (Turntable)". If the user's order makes sense, preserve it. If it doesn't (e.g. speakers before amp), correct it and note why in the warnings.

2. connections: Array of objects, each with:
   - from: string — the source component name (e.g. "Turntable")
   - to: string — the destination component name (e.g. "Phono Preamp")
   - cable_type: string — the type of cable needed (e.g. "RCA interconnect", "Speaker wire", "3.5mm to RCA", "Optical TOSLINK")
   - connection_type: string — the specific connection (e.g. "RCA out → RCA in", "Speaker terminals → Binding posts")
   - notes: string — important tips for this specific connection (grounding, cable quality, etc.)

3. settings: Array of objects, each with:
   - gear: string — which piece of gear (e.g. "Phono Preamp")
   - setting: string — the setting name (e.g. "Gain", "Input selector", "Impedance")
   - recommended_value: string — what to set it to (e.g. "40dB (MM)", "Phono input", "47kΩ")
   - explanation: string — why this setting is correct for this gear combination

4. tips: string[] — 3–5 general setup tips specific to THIS combination of gear. Be specific, not generic. Reference actual model names and their characteristics. Examples: speaker placement advice based on the speaker type, break-in recommendations, room treatment suggestions, cartridge alignment tips.

5. warnings: string[] — Any compatibility concerns or things to watch out for with this specific gear combination. Examples: impedance mismatches, insufficient amplifier power for the speakers, missing components in the chain (e.g. no phono preamp between turntable and amp). Return an empty array if there are no concerns.

Be specific to the actual gear models. Use your knowledge of these products' actual specifications, inputs, outputs, and recommended settings.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              signal_chain: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              connections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    from: { type: Type.STRING },
                    to: { type: Type.STRING },
                    cable_type: { type: Type.STRING },
                    connection_type: { type: Type.STRING },
                    notes: { type: Type.STRING },
                  },
                  required: ['from', 'to', 'cable_type', 'connection_type', 'notes'],
                },
              },
              settings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    gear: { type: Type.STRING },
                    setting: { type: Type.STRING },
                    recommended_value: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ['gear', 'setting', 'recommended_value', 'explanation'],
                },
              },
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              warnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['signal_chain', 'connections', 'settings', 'tips', 'warnings'],
          },
        },
      });

      const raw = response.text || '{}';
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(raw);
      } catch {
        console.error('Failed to parse Gemini setup-guide response:', raw);
        res.status(500).json({ error: 'Failed to parse AI response' });
        return;
      }

      // Validate top-level arrays exist
      const signalChain = Array.isArray(data.signal_chain)
        ? (data.signal_chain as unknown[]).filter((s): s is string => typeof s === 'string')
        : [];
      const connections = Array.isArray(data.connections)
        ? (data.connections as Record<string, unknown>[]).filter(c =>
            typeof c.from === 'string' && typeof c.to === 'string'
          ).map(c => ({
            from: String(c.from),
            to: String(c.to),
            cable_type: String(c.cable_type || ''),
            connection_type: String(c.connection_type || ''),
            notes: String(c.notes || ''),
          }))
        : [];
      const settings = Array.isArray(data.settings)
        ? (data.settings as Record<string, unknown>[]).filter(s =>
            typeof s.gear === 'string' && typeof s.setting === 'string'
          ).map(s => ({
            gear: String(s.gear),
            setting: String(s.setting),
            recommended_value: String(s.recommended_value || ''),
            explanation: String(s.explanation || ''),
          }))
        : [];
      const tips = Array.isArray(data.tips)
        ? (data.tips as unknown[]).filter((t): t is string => typeof t === 'string').slice(0, 10)
        : [];
      const warnings = Array.isArray(data.warnings)
        ? (data.warnings as unknown[]).filter((w): w is string => typeof w === 'string').slice(0, 10)
        : [];

      if (signalChain.length === 0 && connections.length === 0) {
        console.error('Gemini setup-guide returned empty signal_chain and connections:', raw);
        res.status(500).json({ error: 'AI returned an incomplete setup guide. Please try again.' });
        return;
      }

      res.status(200).json({
        signal_chain: signalChain,
        connections,
        settings,
        tips,
        warnings,
      });
    } catch (error) {
      console.error('Setup Guide Error:', error);
      res.status(500).json({ error: 'Failed to generate setup guide' });
    }
  }
);

export default router;
