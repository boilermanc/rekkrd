import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { getSlotStatus } from '../sellrSlots.js';

const router = Router();

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function errorResponse(res: Response, code: number, message: string) {
  res.status(code).json({ error: message, code });
}

// ── GET /api/sellr/account/slots ─────────────────────────────────────
// Returns slot status for the authenticated user.
router.get('/api/sellr/account/slots', async (req: Request, res: Response) => {
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

    const status = await getSlotStatus(user.id);
    res.json(status);
  } catch (err) {
    console.error('[sellr] GET /account/slots error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

// ── GET /api/sellr/account/orders ─────────────────────────────────────
// Returns all orders for the authenticated user's sessions.
router.get('/api/sellr/account/orders', async (req: Request, res: Response) => {
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

    // Get all session IDs for this user
    const { data: sessions, error: sessErr } = await supabase
      .from('sellr_sessions')
      .select('id')
      .eq('user_id', user.id);

    if (sessErr) {
      console.error('[sellr] Failed to fetch user sessions:', sessErr.message);
      errorResponse(res, 500, 'Failed to fetch orders');
      return;
    }

    const sessionIds = (sessions ?? []).map(s => s.id);
    if (sessionIds.length === 0) {
      res.json({ orders: [] });
      return;
    }

    const { data: orders, error: ordersErr } = await supabase
      .from('sellr_orders')
      .select('id, session_id, tier, amount_cents, status, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false });

    if (ordersErr) {
      console.error('[sellr] Failed to fetch orders:', ordersErr.message);
      errorResponse(res, 500, 'Failed to fetch orders');
      return;
    }

    res.json({ orders: orders ?? [] });
  } catch (err) {
    console.error('[sellr] GET /account/orders error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

// ── POST /api/sellr/account/delete ───────────────────────────────────
// Permanently deletes the user's Sellr account and auth record.
router.post('/api/sellr/account/delete', async (req: Request, res: Response) => {
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

    // Delete all records for user's sessions
    const { data: sessions } = await supabase
      .from('sellr_sessions')
      .select('id')
      .eq('user_id', user.id);

    const sessionIds = (sessions ?? []).map(s => s.id);
    if (sessionIds.length > 0) {
      await supabase.from('sellr_records').delete().in('session_id', sessionIds);
      await supabase.from('sellr_orders').delete().in('session_id', sessionIds);
      await supabase.from('sellr_sessions').delete().eq('user_id', user.id);
    }

    // Delete account row
    await supabase.from('sellr_accounts').delete().eq('user_id', user.id);

    // Delete auth user
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      console.error('[sellr] Failed to delete auth user:', deleteErr.message);
      errorResponse(res, 500, 'Failed to delete account');
      return;
    }

    // Clear session cookie
    res.clearCookie('sellr_session_id', { path: '/' });
    res.json({ success: true });
  } catch (err) {
    console.error('[sellr] POST /account/delete error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

export default router;
