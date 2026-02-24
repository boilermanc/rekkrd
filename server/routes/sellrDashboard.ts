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

// ── GET /api/sellr/dashboard ─────────────────────────────────────────
// Returns slots + sessions + orders for the authenticated user.
router.get('/api/sellr/dashboard', async (req: Request, res: Response) => {
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

    // 1. Slot status
    const slots = await getSlotStatus(user.id);

    // 2. Sessions with aggregated record stats
    const { data: rawSessions, error: sessionsErr } = await supabase
      .from('sellr_sessions')
      .select('id, tier, status, created_at, record_count, collection_ad_copy')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (sessionsErr) {
      console.error('[sellr] Dashboard sessions query failed:', sessionsErr.message);
      errorResponse(res, 500, 'Failed to fetch sessions');
      return;
    }

    const sessionList = rawSessions ?? [];
    const sessionIds = sessionList.map(s => s.id);

    // Aggregate record stats per session
    let recordStats: Record<string, { total_median_value: number; last_scanned_at: string | null }> = {};
    if (sessionIds.length > 0) {
      const { data: records, error: recordsErr } = await supabase
        .from('sellr_records')
        .select('session_id, price_median, created_at')
        .in('session_id', sessionIds);

      if (!recordsErr && records) {
        for (const r of records) {
          const sid = r.session_id as string;
          if (!recordStats[sid]) {
            recordStats[sid] = { total_median_value: 0, last_scanned_at: null };
          }
          recordStats[sid].total_median_value += (r.price_median as number) ?? 0;
          const ts = r.created_at as string;
          if (!recordStats[sid].last_scanned_at || ts > recordStats[sid].last_scanned_at!) {
            recordStats[sid].last_scanned_at = ts;
          }
        }
      }
    }

    // 3. Most recent order per session
    let orderMap: Record<string, { is_paid: boolean; report_token: string | null }> = {};
    if (sessionIds.length > 0) {
      const { data: orders, error: ordersErr } = await supabase
        .from('sellr_orders')
        .select('session_id, status, report_token, created_at')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false });

      if (!ordersErr && orders) {
        // Keep only the most recent order per session
        for (const o of orders) {
          const sid = o.session_id as string;
          if (!orderMap[sid]) {
            orderMap[sid] = {
              is_paid: o.status === 'paid',
              report_token: (o.report_token as string) ?? null,
            };
          }
        }
      }
    }

    // Shape sessions
    const sessions = sessionList.map(s => {
      const stats = recordStats[s.id] ?? { total_median_value: 0, last_scanned_at: null };
      const order = orderMap[s.id] ?? { is_paid: false, report_token: null };
      return {
        id: s.id,
        tier: s.tier,
        status: s.status,
        created_at: s.created_at,
        last_scanned_at: stats.last_scanned_at,
        record_count: s.record_count ?? 0,
        total_median_value: stats.total_median_value,
        is_paid: order.is_paid,
        report_token: order.report_token,
        collection_ad_copy: s.collection_ad_copy ?? null,
      };
    });

    res.json({ slots, sessions });
  } catch (err) {
    console.error('[sellr] GET /dashboard error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

export default router;
