import { Router, type Request, type Response } from 'express';
import { ai } from '../lib/gemini.js';
import { requireSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { withTimeout } from '../utils/timeout.js';
import { errorResponse } from '../utils/errorResponse.js';

const router = Router();

const GEMINI_TIMEOUT_MS = 60_000;
const BULK_DELAY_MS = 500;

type Tone = 'casual' | 'collector' | 'quicksale';
const VALID_TONES: Tone[] = ['casual', 'collector', 'quicksale'];

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  casual: 'Write like a friendly person clearing out their collection. Conversational, warm.',
  collector: 'Write for serious vinyl collectors. Mention pressing details, collectibility, audiophile appeal.',
  quicksale: 'Write for a fast sale. Lead with price, keep it brief, emphasize condition.',
};

const CONDITION_DESCRIPTIONS: Record<string, string> = {
  M: 'Mint, never played',
  NM: 'Near Mint, essentially perfect',
  'VG+': 'Very Good Plus, light signs of play',
  VG: 'Very Good, some surface noise',
  'G+': 'Good Plus, plays through with noise',
  G: 'Good, heavy wear',
  F: 'Fair, plays but significantly damaged',
  P: 'Poor, barely playable',
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidTone(tone: unknown): tone is Tone {
  return typeof tone === 'string' && VALID_TONES.includes(tone as Tone);
}

// ── Generate ad copy for a single record ─────────────────────────────
async function generateAdCopy(record: {
  artist: string;
  title: string;
  year: number | null;
  label: string | null;
  condition: string;
  price_median: number | null;
}, tone: Tone): Promise<string> {
  const conditionDesc = CONDITION_DESCRIPTIONS[record.condition] ?? record.condition;

  const prompt = `You are writing a Facebook Marketplace listing for a vinyl record.

Record details:
- Artist: ${record.artist}
- Title: ${record.title}
- Year: ${record.year ?? 'Unknown'}
- Label: ${record.label ?? 'Unknown'}
- Condition: ${record.condition} (${conditionDesc})
- Estimated value: ${record.price_median ? '$' + record.price_median : 'not available'}

Tone: ${TONE_INSTRUCTIONS[tone]}

Write a Facebook Marketplace ad for this record. Include:
1. An attention-grabbing first line
2. Key details about the record (pressing info if known, why it's desirable)
3. Condition description in plain language
4. Asking price suggestion based on the estimated value
5. A call to action

Keep it under 150 words. No hashtags. Sound like a real person, not a bot.`;

  const response = await withTimeout(ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  }), GEMINI_TIMEOUT_MS);

  const text = response.text?.trim();
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

// ── POST /api/sellr/copy/record/:record_id ───────────────────────────
router.post('/api/sellr/copy/record/:record_id', async (req: Request, res: Response) => {
  try {
    const { record_id } = req.params;
    const { session_id, tone } = req.body ?? {};

    if (!record_id || typeof record_id !== 'string') {
      errorResponse(res, 400, 'Missing record_id');
      return;
    }
    if (!session_id || typeof session_id !== 'string') {
      errorResponse(res, 400, 'Missing session_id');
      return;
    }
    if (!isValidTone(tone)) {
      errorResponse(res, 400, 'Invalid tone. Must be one of: casual, collector, quicksale');
      return;
    }

    const supabase = requireSupabaseAdmin();

    // Validate session is paid
    const { data: session, error: sessionErr } = await supabase
      .from('sellr_sessions')
      .select('id, status')
      .eq('id', session_id)
      .single();

    if (sessionErr || !session) {
      errorResponse(res, 404, 'Session not found');
      return;
    }
    if (session.status !== 'paid') {
      errorResponse(res, 403, 'Session is not paid');
      return;
    }

    // Fetch record and validate it belongs to session
    const { data: record, error: recordErr } = await supabase
      .from('sellr_records')
      .select('id, session_id, artist, title, year, label, condition, price_median')
      .eq('id', record_id)
      .single();

    if (recordErr || !record) {
      errorResponse(res, 404, 'Record not found');
      return;
    }
    if (record.session_id !== session_id) {
      errorResponse(res, 403, 'Record does not belong to this session');
      return;
    }

    const ad_copy = await generateAdCopy(record, tone);

    // Save to DB
    const { error: updateErr } = await supabase
      .from('sellr_records')
      .update({ ad_copy })
      .eq('id', record_id);

    if (updateErr) {
      console.error('[sellr-copy] Failed to save ad copy:', updateErr.message);
      errorResponse(res, 500, 'Failed to save ad copy');
      return;
    }

    res.status(200).json({ record_id, ad_copy, tone });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sellr-copy] Single record error:', message);
    errorResponse(res, 500, message);
  }
});

// ── POST /api/sellr/copy/bulk/:session_id ────────────────────────────
// Uses Server-Sent Events to stream progress for each record processed.
router.post('/api/sellr/copy/bulk/:session_id', async (req: Request, res: Response) => {
  const { session_id } = req.params;
  const { tone } = req.body ?? {};

  if (!session_id || typeof session_id !== 'string') {
    errorResponse(res, 400, 'Missing session_id');
    return;
  }
  if (!isValidTone(tone)) {
    errorResponse(res, 400, 'Invalid tone. Must be one of: casual, collector, quicksale');
    return;
  }

  const supabase = requireSupabaseAdmin();

  // Validate session is paid
  const { data: session, error: sessionErr } = await supabase
    .from('sellr_sessions')
    .select('id, status')
    .eq('id', session_id)
    .single();

  if (sessionErr || !session) {
    errorResponse(res, 404, 'Session not found');
    return;
  }
  if (session.status !== 'paid') {
    errorResponse(res, 403, 'Session is not paid');
    return;
  }

  // Fetch records without ad copy
  const { data: records, error: recordsErr } = await supabase
    .from('sellr_records')
    .select('id, session_id, artist, title, year, label, condition, price_median')
    .eq('session_id', session_id)
    .is('ad_copy', null);

  if (recordsErr) {
    errorResponse(res, 500, 'Failed to fetch records');
    return;
  }

  if (!records || records.length === 0) {
    // No SSE needed — just return JSON for the empty case
    res.status(200).json({ done: true, generated: 0, failed: 0 });
    return;
  }

  // Switch to SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const total = records.length;
  let generated = 0;
  let failed = 0;
  let clientDisconnected = false;

  req.on('close', () => { clientDisconnected = true; });

  for (let i = 0; i < records.length; i++) {
    if (clientDisconnected) break;

    const record = records[i];
    let success = true;
    let error: string | undefined;

    try {
      const ad_copy = await generateAdCopy(record, tone);

      const { error: updateErr } = await supabase
        .from('sellr_records')
        .update({ ad_copy })
        .eq('id', record.id);

      if (updateErr) {
        success = false;
        error = updateErr.message;
        failed++;
      } else {
        generated++;
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      failed++;
    }

    const completed = i + 1;
    const event = JSON.stringify({
      completed,
      total,
      record_id: record.id,
      success,
      error,
      artist: record.artist,
      title: record.title,
    });
    res.write(`data: ${event}\n\n`);

    // Delay between calls (skip after last)
    if (i < records.length - 1) {
      await sleep(BULK_DELAY_MS);
    }
  }

  // Final done event
  if (!clientDisconnected) {
    res.write(`data: ${JSON.stringify({ done: true, generated, failed })}\n\n`);
  }
  res.end();
});

// ── POST /api/sellr/copy/collection/:session_id ──────────────────────
router.post('/api/sellr/copy/collection/:session_id', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.params;
    const { tone } = req.body ?? {};

    if (!session_id || typeof session_id !== 'string') {
      errorResponse(res, 400, 'Missing session_id');
      return;
    }
    if (!isValidTone(tone)) {
      errorResponse(res, 400, 'Invalid tone. Must be one of: casual, collector, quicksale');
      return;
    }

    const supabase = requireSupabaseAdmin();

    // Validate session is paid
    const { data: session, error: sessionErr } = await supabase
      .from('sellr_sessions')
      .select('id, status')
      .eq('id', session_id)
      .single();

    if (sessionErr || !session) {
      errorResponse(res, 404, 'Session not found');
      return;
    }
    if (session.status !== 'paid') {
      errorResponse(res, 403, 'Session is not paid');
      return;
    }

    // Fetch all records for session
    const { data: records, error: recordsErr } = await supabase
      .from('sellr_records')
      .select('artist, title, condition, price_median')
      .eq('session_id', session_id);

    if (recordsErr || !records || records.length === 0) {
      errorResponse(res, 404, 'No records found for session');
      return;
    }

    // Build collection summary
    const count = records.length;

    // Top 10 artists by frequency
    const artistCounts = new Map<string, number>();
    for (const r of records) {
      artistCounts.set(r.artist, (artistCounts.get(r.artist) ?? 0) + 1);
    }
    const topArtists = [...artistCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name)
      .join(', ');

    // Notable records (price_median >= 20)
    const notable = records
      .filter(r => r.price_median != null && r.price_median >= 20)
      .sort((a, b) => (b.price_median ?? 0) - (a.price_median ?? 0))
      .slice(0, 10)
      .map(r => `${r.artist} - ${r.title} ($${r.price_median})`)
      .join(', ');

    // Total estimated value
    const totalMedian = records.reduce((sum, r) => sum + (r.price_median ?? 0), 0);

    // Condition range
    const conditionOrder = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'];
    const presentConditions = [...new Set(records.map(r => r.condition))];
    presentConditions.sort((a, b) => conditionOrder.indexOf(a) - conditionOrder.indexOf(b));
    const conditionRange = presentConditions.length > 1
      ? `${presentConditions[0]} to ${presentConditions[presentConditions.length - 1]}`
      : presentConditions[0] ?? 'Unknown';

    const prompt = `Write a Facebook Marketplace post for someone selling their entire vinyl collection. Make it compelling and personal.

Collection summary:
- Total records: ${count}
- Artists include: ${topArtists}
- Notable records: ${notable || 'None over $20'}
- Total estimated value: $${totalMedian}
- Condition range: ${conditionRange}
- Tone: ${TONE_INSTRUCTIONS[tone]}

Write the post in 200 words or less. Include a suggested asking price (suggest 60-70% of total estimated value for a quick collection sale). Sound authentic. No hashtags.`;

    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    }), GEMINI_TIMEOUT_MS);

    const collection_ad_copy = response.text?.trim();
    if (!collection_ad_copy) {
      errorResponse(res, 500, 'Gemini returned empty response');
      return;
    }

    // Save to session
    const { error: updateErr } = await supabase
      .from('sellr_sessions')
      .update({ collection_ad_copy })
      .eq('id', session_id);

    if (updateErr) {
      console.error('[sellr-copy] Failed to save collection ad copy:', updateErr.message);
      errorResponse(res, 500, 'Failed to save collection ad copy');
      return;
    }

    res.status(200).json({ collection_ad_copy });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sellr-copy] Collection error:', message);
    errorResponse(res, 500, message);
  }
});

export default router;
