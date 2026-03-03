import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import { ai } from '../lib/gemini.js';
import { retryWithBackoff, isRetryableError } from '../utils/retry.js';
import { withTimeout } from '../utils/timeout.js';

const router = Router();

const GEMINI_TIMEOUT_MS = 90_000;

async function handleEnrich(req: Request, res: Response) {
  const { brand, model, category } = req.body;

  if (!brand || typeof brand !== 'string' || !brand.trim()) {
    res.status(400).json({ error: 'Missing or empty brand' });
    return;
  }
  if (!model || typeof model !== 'string' || !model.trim()) {
    res.status(400).json({ error: 'Missing or empty model' });
    return;
  }

  const categoryHint = (category && typeof category === 'string') ? category.trim() : 'unknown';

  const response = await withTimeout(retryWithBackoff(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          text: `You are an expert audio equipment database curator. Return detailed information about this specific piece of audio equipment:

Brand: ${brand.trim()}
Model: ${model.trim()}
Category hint: ${categoryHint}

Return a JSON object with:
- category: one of: turntable, cartridge, phono_preamp, preamp, amplifier, receiver, speakers, headphones, dac, subwoofer, cables_other
- year: release year or approximate era as string e.g. '1978' or 'Late 1970s'
- description: 2-3 sentences about this gear — when it was made, what it's known for, its reputation in the audiophile community
- specs: YOU MUST populate this object with real technical specifications found via web search. Do not return an empty object. Search for the actual manufacturer specs for this exact model and include ALL of the following that apply:

  For receivers/amplifiers: power_output, thd, frequency_response, snr, damping_factor, inputs, speaker_impedance, dimensions, weight

  For turntables: drive_type, speeds, wow_flutter, signal_to_noise, channel_separation, tonearm, cartridge_weight_range, dimensions, weight

  For speakers: type, impedance, sensitivity, frequency_response, power_handling, driver_configuration, dimensions, weight

  For headphones: type, impedance, sensitivity, frequency_response, driver_size, cable_length, weight

  For cartridges: type, output_voltage, frequency_response, channel_separation, tracking_force, stylus_type, impedance

  For DACs: inputs, outputs, sample_rate, bit_depth, snr, thd, chip

  For phono preamps: gain, riaa_accuracy, input_impedance, output_impedance, snr, thd, inputs, outputs

  Use real values from manufacturer documentation or spec sheets. All values must be strings. Never return an empty specs object.
- confidence: 0.0 to 1.0

If you don't recognize the equipment, return confidence: 0 and empty/null fields.

Respond with ONLY a raw JSON object — no markdown, no code fences, no explanation.
Start your response with { and end with }`,
        },
      ],
    },
    config: {
      tools: [{ googleSearch: {} }],
    },
  })), GEMINI_TIMEOUT_MS);

  const rawText = response.text || '';
  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const stripped = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(stripped || '{}');
  } catch {
    console.error('[admin-gear-enrich] Failed to parse Gemini response:', rawText);
    res.status(500).json({ error: 'Failed to parse AI response' });
    return;
  }

  const confidence = typeof data.confidence === 'number' ? data.confidence : 0;

  if (confidence === 0) {
    res.status(422).json({ error: 'Gear not recognized — try different brand/model' });
    return;
  }

  res.json({
    category: data.category || null,
    year: data.year || null,
    description: data.description || null,
    specs: (data.specs && typeof data.specs === 'object') ? data.specs : null,
    confidence,
  });
}

router.post('/api/admin/gear-catalog/enrich', requireAdmin, async (req, res, next) => {
  try {
    await handleEnrich(req, res);
  } catch (error) {
    console.error('[admin-gear-enrich] Error:', error instanceof Error ? error.message : error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('timed out')) {
      res.status(504).json({ error: 'AI enrichment timed out. Please try again.' });
    } else if (isRetryableError(error)) {
      res.status(503).json({ error: 'AI service is temporarily busy. Please try again in a moment.' });
    } else {
      res.status(500).json({ error: 'Enrichment failed' });
    }
  }
});

export default router;
