import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { consumeSlots, releaseSlot } from '../sellrSlots.js';
import { requireSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { errorResponse } from '../utils/errorResponse.js';

const router = Router();

// Mirror of SELLR_TIERS from src/sellr/types.ts — server-side copy to
// avoid importing from frontend code.
const TIER_LIMITS: Record<string, number> = {
  starter: 25,
  standard: 100,
  full: 500,
};

/** Fetch a session and verify it's active + not expired. */
async function getActiveSession(supabase: ReturnType<typeof requireSupabaseAdmin>, sessionId: string) {
  const { data, error } = await supabase
    .from('sellr_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !data) return null;
  if (data.status === 'expired' || new Date(data.expires_at) < new Date()) return null;
  return data;
}

// ── POST /api/sellr/records ──────────────────────────────────────────
// Insert a new record. Requires auth, enforces tier + slot limits.
router.post('/api/sellr/records', async (req: Request, res: Response) => {
  try {
    // ── Auth: verify Supabase JWT ──
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      errorResponse(res, 401, 'Authentication required');
      return;
    }

    const supabase = requireSupabaseAdmin();

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      errorResponse(res, 401, 'Invalid or expired token');
      return;
    }

    const {
      session_id, title, artist, year, label, condition,
      discogs_id, cover_image, price_low, price_median, price_high,
    } = req.body ?? {};

    if (!session_id || !title || !artist) {
      errorResponse(res, 400, 'session_id, title, and artist are required');
      return;
    }

    const session = await getActiveSession(supabase, session_id);

    if (!session) {
      errorResponse(res, 404, 'Session not found or expired');
      return;
    }

    // Enforce tier limit
    if (session.tier) {
      const limit = TIER_LIMITS[session.tier];
      if (limit && session.record_count >= limit) {
        errorResponse(res, 403, 'Tier limit reached');
        return;
      }
    }

    // ── Slot check: consume 1 slot ──
    const slotConsumed = await consumeSlots(user.id, 1);
    if (!slotConsumed) {
      res.status(402).json({ error: 'No slots remaining', code: 'NO_SLOTS' });
      return;
    }

    // Insert record
    const { data: record, error: insertErr } = await supabase
      .from('sellr_records')
      .insert({
        session_id,
        title,
        artist,
        year: year ?? null,
        label: label ?? null,
        condition: condition ?? 'VG',
        discogs_id: discogs_id ?? null,
        cover_image: cover_image ?? null,
        price_low: price_low ?? null,
        price_median: price_median ?? null,
        price_high: price_high ?? null,
      })
      .select('*')
      .single();

    if (insertErr || !record) {
      console.error('[sellr] Failed to insert record:', insertErr?.message);
      errorResponse(res, 500, 'Failed to insert record');
      return;
    }

    // Increment record_count on session
    const { error: updateErr } = await supabase
      .from('sellr_sessions')
      .update({ record_count: session.record_count + 1 })
      .eq('id', session_id);

    if (updateErr) {
      console.error('[sellr] Failed to increment record_count:', updateErr.message);
      // Record was inserted — don't fail the response, count will be off by 1
    }

    res.status(201).json(record);
  } catch (err) {
    console.error('[sellr] POST /records error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

// ── DELETE /api/sellr/records/:record_id ─────────────────────────────
// Deletes a record and decrements the parent session's record_count.
router.delete('/api/sellr/records/:record_id', async (req: Request, res: Response) => {
  try {
    const { record_id } = req.params;
    const session_id = req.query.session_id as string;

    if (!session_id) {
      errorResponse(res, 400, 'session_id query parameter is required');
      return;
    }

    const supabase = requireSupabaseAdmin();
    const session = await getActiveSession(supabase, session_id);

    if (!session) {
      errorResponse(res, 404, 'Session not found or expired');
      return;
    }

    // Verify the record belongs to this session before deleting
    const { data: existing, error: lookupErr } = await supabase
      .from('sellr_records')
      .select('id')
      .eq('id', record_id)
      .eq('session_id', session_id)
      .single();

    if (lookupErr || !existing) {
      errorResponse(res, 404, 'Record not found');
      return;
    }

    const { error: deleteErr } = await supabase
      .from('sellr_records')
      .delete()
      .eq('id', record_id);

    if (deleteErr) {
      console.error('[sellr] Failed to delete record:', deleteErr.message);
      errorResponse(res, 500, 'Failed to delete record');
      return;
    }

    // Release the slot back to the user's account
    const released = await releaseSlot(session.user_id);
    if (!released) {
      console.error('[sellr] Failed to release slot for user:', session.user_id);
    }

    // Decrement record_count (floor at 0)
    const { error: updateErr } = await supabase
      .from('sellr_sessions')
      .update({ record_count: Math.max(0, session.record_count - 1) })
      .eq('id', session_id);

    if (updateErr) {
      console.error('[sellr] Failed to decrement record_count:', updateErr.message);
    }

    res.json({ deleted: true });
  } catch (err) {
    console.error('[sellr] DELETE /records/:id error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

// ── PATCH /api/sellr/records/:record_id ──────────────────────────────
// Updates condition grade and/or ad_copy on a record.
const VALID_CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'] as const;

router.patch('/api/sellr/records/:record_id', async (req: Request, res: Response) => {
  try {
    const { record_id } = req.params;
    const { condition, ad_copy, session_id } = req.body ?? {};

    if (!session_id) {
      errorResponse(res, 400, 'session_id is required');
      return;
    }

    if (condition === undefined && ad_copy === undefined) {
      errorResponse(res, 400, 'At least one of condition or ad_copy is required');
      return;
    }

    if (condition !== undefined && !VALID_CONDITIONS.includes(condition)) {
      errorResponse(res, 400, `Invalid condition. Must be one of: ${VALID_CONDITIONS.join(', ')}`);
      return;
    }

    if (ad_copy !== undefined && typeof ad_copy !== 'string') {
      errorResponse(res, 400, 'ad_copy must be a string');
      return;
    }

    const supabase = requireSupabaseAdmin();
    const session = await getActiveSession(supabase, session_id);

    if (!session) {
      errorResponse(res, 404, 'Session not found or expired');
      return;
    }

    // Verify the record belongs to this session
    const { data: existing, error: lookupErr } = await supabase
      .from('sellr_records')
      .select('id')
      .eq('id', record_id)
      .eq('session_id', session_id)
      .single();

    if (lookupErr || !existing) {
      errorResponse(res, 404, 'Record not found');
      return;
    }

    // Build update payload — only include provided fields
    const updates: Record<string, unknown> = {};
    if (condition !== undefined) updates.condition = condition;
    if (ad_copy !== undefined) updates.ad_copy = ad_copy;

    const { data: updated, error: updateErr } = await supabase
      .from('sellr_records')
      .update(updates)
      .eq('id', record_id)
      .select('*')
      .single();

    if (updateErr || !updated) {
      console.error('[sellr] Failed to update record:', updateErr?.message);
      errorResponse(res, 500, 'Failed to update record');
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error('[sellr] PATCH /records/:id error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

// ── GET /api/sellr/records/session/:session_id ───────────────────────
// Returns all records for a session, ordered by created_at desc.
router.get('/api/sellr/records/session/:session_id', async (req: Request, res: Response) => {
  try {
    const session_id = req.params.session_id as string;
    const supabase = requireSupabaseAdmin();

    const session = await getActiveSession(supabase, session_id);
    if (!session) {
      errorResponse(res, 404, 'Session not found or expired');
      return;
    }

    const { data: records, error: recordsErr } = await supabase
      .from('sellr_records')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: false });

    if (recordsErr) {
      console.error('[sellr] Failed to fetch records:', recordsErr.message);
      errorResponse(res, 500, 'Failed to fetch records');
      return;
    }

    res.json({ records: records ?? [] });
  } catch (err) {
    console.error('[sellr] GET /records/session/:id error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

export default router;
