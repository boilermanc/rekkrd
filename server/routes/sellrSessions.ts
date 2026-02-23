import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendSessionCreatedEmail } from '../sellrEmails.js';

const router = Router();

const VALID_TIERS = ['starter', 'standard', 'full'] as const;
type Tier = (typeof VALID_TIERS)[number];

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function errorResponse(res: Response, code: number, message: string) {
  res.status(code).json({ error: message, code });
}

// ── POST /api/sellr/sessions ─────────────────────────────────────────
// Creates a new session. No auth required.
router.post('/api/sellr/sessions', async (req: Request, res: Response) => {
  try {
    const { email, tier } = req.body ?? {};

    // Validate tier if provided
    if (tier && !VALID_TIERS.includes(tier)) {
      errorResponse(res, 400, `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}`);
      return;
    }

    const supabase = getSupabaseAdmin();

    const insert: Record<string, unknown> = { status: 'active' };
    if (email && typeof email === 'string') insert.email = email;
    if (tier) insert.tier = tier;

    const { data, error } = await supabase
      .from('sellr_sessions')
      .insert(insert)
      .select('id, expires_at')
      .single();

    if (error || !data) {
      console.error('[sellr] Failed to create session:', error?.message);
      errorResponse(res, 500, 'Failed to create session');
      return;
    }

    // Set httpOnly cookie (7 days)
    res.cookie('sellr_session_id', data.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    // Fire-and-forget: session created email if email was provided
    if (email && typeof email === 'string') {
      sendSessionCreatedEmail({
        email,
        session_id: data.id,
        record_count: 0,
        expires_at: data.expires_at,
      }).catch(err => console.error('[sellr] Session created email failed:', err));
    }

    res.status(201).json({ session_id: data.id, expires_at: data.expires_at });
  } catch (err) {
    console.error('[sellr] POST /sessions error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

// ── GET /api/sellr/sessions/:session_id ──────────────────────────────
// Returns session + associated records. 404 if expired or missing.
router.get('/api/sellr/sessions/:session_id', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.params;
    const supabase = getSupabaseAdmin();

    const { data: session, error: sessionErr } = await supabase
      .from('sellr_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionErr || !session) {
      errorResponse(res, 404, 'Session not found');
      return;
    }

    // Check expiry
    if (session.status === 'expired' || new Date(session.expires_at) < new Date()) {
      errorResponse(res, 404, 'Session expired');
      return;
    }

    const { data: records, error: recordsErr } = await supabase
      .from('sellr_records')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    if (recordsErr) {
      console.error('[sellr] Failed to fetch records for session', session_id, recordsErr.message);
      errorResponse(res, 500, 'Failed to fetch records');
      return;
    }

    res.json({ session, records: records ?? [] });
  } catch (err) {
    console.error('[sellr] GET /sessions/:id error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

// ── PATCH /api/sellr/sessions/:session_id ────────────────────────────
// Updates email or tier on a session.
router.patch('/api/sellr/sessions/:session_id', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.params;
    const { email, tier } = req.body ?? {};

    if (tier && !VALID_TIERS.includes(tier)) {
      errorResponse(res, 400, `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}`);
      return;
    }

    const updates: Record<string, unknown> = {};
    if (email !== undefined && typeof email === 'string') updates.email = email;
    if (tier !== undefined) updates.tier = tier as Tier;

    if (Object.keys(updates).length === 0) {
      errorResponse(res, 400, 'No valid fields to update. Accepts: email, tier');
      return;
    }

    const supabase = getSupabaseAdmin();

    // Verify session exists and is not expired
    const { data: existing, error: lookupErr } = await supabase
      .from('sellr_sessions')
      .select('status, expires_at, email, record_count')
      .eq('id', session_id)
      .single();

    if (lookupErr || !existing) {
      errorResponse(res, 404, 'Session not found');
      return;
    }

    if (existing.status === 'expired' || new Date(existing.expires_at) < new Date()) {
      errorResponse(res, 404, 'Session expired');
      return;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('sellr_sessions')
      .update(updates)
      .eq('id', session_id)
      .select('*')
      .single();

    if (updateErr || !updated) {
      console.error('[sellr] Failed to update session', session_id, updateErr?.message);
      errorResponse(res, 500, 'Failed to update session');
      return;
    }

    // Fire-and-forget: send session created email when email is captured for the first time
    const newEmail = updates.email as string | undefined;
    if (newEmail && !existing.email) {
      sendSessionCreatedEmail({
        email: newEmail,
        session_id: session_id as string,
        record_count: existing.record_count ?? 0,
        expires_at: updated.expires_at,
      }).catch(err => console.error('[sellr] Session created email (patch) failed:', err));
    }

    res.json({ session: updated });
  } catch (err) {
    console.error('[sellr] PATCH /sessions/:id error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

// ── PATCH /api/sellr/sessions/:session_id/collection-copy ────────────
// Updates the collection_ad_copy on a session.
router.patch('/api/sellr/sessions/:session_id/collection-copy', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.params;
    const { collection_ad_copy, session_id_verify } = req.body ?? {};

    if (!session_id_verify || session_id_verify !== session_id) {
      errorResponse(res, 400, 'session_id_verify must match the URL session_id');
      return;
    }

    if (typeof collection_ad_copy !== 'string') {
      errorResponse(res, 400, 'collection_ad_copy must be a string');
      return;
    }

    const supabase = getSupabaseAdmin();

    // Verify session exists and is paid
    const { data: existing, error: lookupErr } = await supabase
      .from('sellr_sessions')
      .select('status')
      .eq('id', session_id)
      .single();

    if (lookupErr || !existing) {
      errorResponse(res, 404, 'Session not found');
      return;
    }

    if (existing.status !== 'paid') {
      errorResponse(res, 403, 'Session is not paid');
      return;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('sellr_sessions')
      .update({ collection_ad_copy })
      .eq('id', session_id)
      .select('*')
      .single();

    if (updateErr || !updated) {
      console.error('[sellr] Failed to update collection_ad_copy:', updateErr?.message);
      errorResponse(res, 500, 'Failed to update collection ad copy');
      return;
    }

    res.json({ session: updated });
  } catch (err) {
    console.error('[sellr] PATCH /sessions/:id/collection-copy error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

export default router;
