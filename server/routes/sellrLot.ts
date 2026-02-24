import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { ai } from '../lib/gemini.js';

const router = Router();

const GEMINI_TIMEOUT_MS = 60_000;

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function errorResponse(res: Response, code: number, message: string) {
  res.status(code).json({ error: message, code });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini request timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// ── POST /api/sellr/lot/:session_id/calculate ─────────────────────────
// Calculates lot pricing tiers for all priced records in a session.
router.post('/api/sellr/lot/:session_id/calculate', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      errorResponse(res, 401, 'Authentication required');
      return;
    }

    const supabase = getSupabaseAdmin();

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      errorResponse(res, 401, 'Invalid or expired token');
      return;
    }

    const { session_id } = req.params;

    // Verify session exists and belongs to authenticated user
    const { data: session, error: sessionErr } = await supabase
      .from('sellr_sessions')
      .select('id, user_id, record_count')
      .eq('id', session_id)
      .single();

    if (sessionErr || !session) {
      errorResponse(res, 404, 'Session not found');
      return;
    }

    if (session.user_id !== user.id) {
      errorResponse(res, 403, 'Session does not belong to this user');
      return;
    }

    // Fetch all records for the session
    const { data: records, error: recordsErr } = await supabase
      .from('sellr_records')
      .select('price_low, price_median, price_high')
      .eq('session_id', session_id);

    if (recordsErr) {
      console.error('[sellr-lot] Failed to fetch records:', recordsErr.message);
      errorResponse(res, 500, 'Failed to fetch records');
      return;
    }

    const allRecords = records ?? [];

    let total_median = 0;
    let total_low = 0;
    let total_high = 0;
    let priced_count = 0;
    let unpriced_count = 0;

    for (const r of allRecords) {
      const median = Number(r.price_median) || 0;
      if (median > 0) {
        total_median += median;
        total_low += Number(r.price_low) || 0;
        total_high += Number(r.price_high) || 0;
        priced_count++;
      } else {
        unpriced_count++;
      }
    }

    total_median = Math.round(total_median * 100) / 100;
    total_low = Math.round(total_low * 100) / 100;
    total_high = Math.round(total_high * 100) / 100;

    const quick_sale = Math.round(total_median * 0.55 * 100) / 100;
    const fair = Math.round(total_median * 0.65 * 100) / 100;
    const collector = Math.round(total_median * 0.75 * 100) / 100;

    res.json({
      total_median,
      total_low,
      total_high,
      priced_count,
      unpriced_count,
      lot_prices: {
        quick_sale,
        fair,
        collector,
      },
      record_count: allRecords.length,
    });
  } catch (err) {
    console.error('[sellr-lot] POST /calculate error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

// ── POST /api/sellr/lot/:session_id/post ──────────────────────────────
// Generates a Facebook Marketplace lot post via Gemini.
router.post('/api/sellr/lot/:session_id/post', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      errorResponse(res, 401, 'Authentication required');
      return;
    }

    const supabase = getSupabaseAdmin();

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      errorResponse(res, 401, 'Invalid or expired token');
      return;
    }

    const { session_id } = req.params;
    const { lot_price, seller_notes } = req.body ?? {};

    if (typeof lot_price !== 'number' || lot_price <= 0) {
      errorResponse(res, 400, 'lot_price must be a positive number');
      return;
    }

    // Verify session exists and belongs to authenticated user
    const { data: session, error: sessionErr } = await supabase
      .from('sellr_sessions')
      .select('id, user_id, record_count')
      .eq('id', session_id)
      .single();

    if (sessionErr || !session) {
      errorResponse(res, 404, 'Session not found');
      return;
    }

    if (session.user_id !== user.id) {
      errorResponse(res, 403, 'Session does not belong to this user');
      return;
    }

    // Fetch all records for the session
    const { data: records, error: recordsErr } = await supabase
      .from('sellr_records')
      .select('artist, title, genre, price_median')
      .eq('session_id', session_id);

    if (recordsErr || !records || records.length === 0) {
      errorResponse(res, 404, 'No records found for session');
      return;
    }

    // Calculate total_median
    const total_median = records.reduce((sum, r) => sum + (Number(r.price_median) || 0), 0);

    // Top 5 artists by record count
    const artistCounts = new Map<string, number>();
    for (const r of records) {
      artistCounts.set(r.artist, (artistCounts.get(r.artist) ?? 0) + 1);
    }
    const top_artists = [...artistCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name)
      .join(', ');

    // Genres from records where genre is not null
    const genreSet = new Set<string>();
    for (const r of records) {
      if (r.genre) genreSet.add(r.genre);
    }
    const genres = [...genreSet].join(', ') || 'Various';

    // Standout records where price_median >= 20, limit 3
    const standout = records
      .filter(r => (Number(r.price_median) || 0) >= 20)
      .sort((a, b) => (Number(b.price_median) || 0) - (Number(a.price_median) || 0))
      .slice(0, 3)
      .map(r => `${r.artist} - ${r.title} ($${Number(r.price_median)})`)
      .join(', ');

    const prompt = `Write a Facebook Marketplace post for a lot sale of ${records.length} vinyl records. Total collection estimated at $${Math.round(total_median * 100) / 100} based on Discogs pricing. Asking price: $${lot_price}. Top artists in the collection: ${top_artists}. Genres represented: ${genres}. ${standout ? `Standout records: ${standout}.` : ''} Seller notes: ${seller_notes || 'none'}.

Requirements:
- Conversational, authentic vinyl collector voice
- Lead with the asking price and record count
- Mention 2-3 standout records by name if value >= $20
- Include condition note (well-cared-for collection)
- End with pickup/payment preference placeholder
- 150-200 words, no hashtags, ready to paste`;

    const response = await withTimeout(ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    }), GEMINI_TIMEOUT_MS);

    const post = response.text?.trim();
    if (!post) {
      errorResponse(res, 500, 'Gemini returned empty response');
      return;
    }

    // Save generated post to session
    const { error: updateErr } = await supabase
      .from('sellr_sessions')
      .update({ collection_ad_copy: post })
      .eq('id', session_id);

    if (updateErr) {
      console.error('[sellr-lot] Failed to save lot post:', updateErr.message);
      errorResponse(res, 500, 'Failed to save lot post');
      return;
    }

    res.json({ post });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sellr-lot] POST /post error:', message);
    errorResponse(res, 500, message);
  }
});

export default router;
