import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '../lib/stripe.js';
import {
  sendSessionCreatedEmail,
  sendPaymentConfirmedEmail,
  sendAbandonedSessionEmail,
  sendRekkrdConversionEmail,
  sendAdminOrderAlert,
} from '../sellrEmails.js';
import crypto from 'crypto';
import {
  getCronJobHistory,
  runAbandonedSessionEmailsTracked,
  runExpireSessionsTracked,
  runRekkrdConversionEmailsTracked,
} from '../sellrCron.js';

const router = Router();

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── Simple bearer token check for Sellr admin endpoints ─────────────
function requireSellrAdmin(req: Request, res: Response): boolean {
  const token = process.env.SELLR_ADMIN_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'SELLR_ADMIN_TOKEN not configured' });
    return false;
  }

  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${token}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}

// ── GET /api/sellr/admin/cron-status ────────────────────────────────
router.get('/api/sellr/admin/cron-status', (req: Request, res: Response) => {
  if (!requireSellrAdmin(req, res)) return;

  res.json({
    status: 'running',
    uptime: process.uptime(),
    jobs: getCronJobHistory(),
    server: {
      node_version: process.version,
      memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      env: process.env.NODE_ENV || 'development',
    },
  });
});

// ── POST /api/sellr/admin/cron/run/:job ─────────────────────────────
// Manual trigger for cron jobs.
const CRON_RUNNERS: Record<string, () => Promise<void>> = {
  abandoned_sessions: runAbandonedSessionEmailsTracked,
  expire_sessions: runExpireSessionsTracked,
  rekkrd_conversion: runRekkrdConversionEmailsTracked,
};

router.post('/api/sellr/admin/cron/run/:job', async (req: Request, res: Response) => {
  if (!requireSellrAdmin(req, res)) return;

  const job = req.params.job as string;
  const runner = CRON_RUNNERS[job];
  if (!runner) {
    res.status(400).json({ success: false, message: `Unknown job: ${job}` });
    return;
  }

  try {
    await runner();
    res.json({ success: true, message: `Job "${job}" completed` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[sellr-admin] Manual cron run "${job}" failed:`, message);
    res.status(500).json({ success: false, message });
  }
});

// ── GET /api/sellr/admin/email-log ──────────────────────────────────
// Paginated email log. Optional ?session_id filter.
router.get('/api/sellr/admin/email-log', async (req: Request, res: Response) => {
  if (!requireSellrAdmin(req, res)) return;

  try {
    const sessionIdFilter = req.query.session_id as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('sellr_email_log')
      .select('*', { count: 'exact' })
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (sessionIdFilter) {
      query = query.eq('session_id', sessionIdFilter);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('[sellr-admin] Email log query failed:', error.message);
      res.status(500).json({ error: 'Failed to fetch email logs' });
      return;
    }

    res.json({ logs: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error('[sellr-admin] GET /email-log error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/sellr/admin/email-log/session/:session_id ──────────────
// All logs for a specific session (admin session inspector).
router.get('/api/sellr/admin/email-log/session/:session_id', async (req: Request, res: Response) => {
  if (!requireSellrAdmin(req, res)) return;

  try {
    const { session_id } = req.params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('sellr_email_log')
      .select('*')
      .eq('session_id', session_id)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('[sellr-admin] Session email log query failed:', error.message);
      res.status(500).json({ error: 'Failed to fetch email logs' });
      return;
    }

    res.json({ logs: data ?? [] });
  } catch (err) {
    console.error('[sellr-admin] GET /email-log/session error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/sellr/admin/orders ─────────────────────────────────────
// Paginated orders list with optional status/search filters.
// Joins sellr_sessions to get record_count.
router.get('/api/sellr/admin/orders', async (req: Request, res: Response) => {
  if (!requireSellrAdmin(req, res)) return;

  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const statusFilter = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('sellr_orders')
      .select('id, session_id, email, tier, amount_cents, status, report_token, created_at, stripe_payment_intent, sellr_sessions(record_count)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusFilter && ['pending', 'complete', 'failed'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    if (search) {
      query = query.ilike('email', `%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('[sellr-admin] Orders query failed:', error.message);
      res.status(500).json({ error: 'Failed to fetch orders' });
      return;
    }

    // Flatten the joined session data
    const orders = (data ?? []).map((row: Record<string, unknown>) => {
      const session = row.sellr_sessions as { record_count: number } | null;
      return {
        id: row.id,
        session_id: row.session_id,
        email: row.email,
        tier: row.tier,
        amount_cents: row.amount_cents,
        status: row.status,
        report_token: row.report_token,
        stripe_payment_intent: row.stripe_payment_intent,
        record_count: session?.record_count ?? 0,
        created_at: row.created_at,
      };
    });

    res.json({ orders, total: count ?? 0 });
  } catch (err) {
    console.error('[sellr-admin] GET /orders error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/sellr/admin/session/:session_id ────────────────────────
// Full session inspector: session details, records, and order.
router.get('/api/sellr/admin/session/:session_id', async (req: Request, res: Response) => {
  if (!requireSellrAdmin(req, res)) return;

  try {
    const { session_id } = req.params;
    const supabase = getSupabaseAdmin();

    const [sessionRes, recordsRes, orderRes] = await Promise.all([
      supabase
        .from('sellr_sessions')
        .select('*')
        .eq('id', session_id)
        .single(),
      supabase
        .from('sellr_records')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true }),
      supabase
        .from('sellr_orders')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (sessionRes.error) {
      console.error('[sellr-admin] Session fetch failed:', sessionRes.error.message);
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({
      session: sessionRes.data,
      records: recordsRes.data ?? [],
      order: orderRes.data ?? null,
    });
  } catch (err) {
    console.error('[sellr-admin] GET /session/:id error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/sellr/admin/analytics ──────────────────────────────────
// Revenue, funnel, records, and top artists for a given period.
router.get('/api/sellr/admin/analytics', async (req: Request, res: Response) => {
  if (!requireSellrAdmin(req, res)) return;

  try {
    const periodParam = req.query.period as string | undefined;
    const days = periodParam === '7d' ? 7 : periodParam === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    const supabase = getSupabaseAdmin();

    const [
      ordersRes,
      sessionsRes,
      sessionsWithEmailRes,
      paidOrdersRes,
      recordsRes,
      artistsRes,
      sessionRecordSumsRes,
    ] = await Promise.all([
      // Complete orders in period (for by_day + by_tier + total)
      supabase
        .from('sellr_orders')
        .select('amount_cents, tier, created_at')
        .eq('status', 'complete')
        .gte('created_at', since)
        .order('created_at', { ascending: true }),
      // Total sessions in period
      supabase
        .from('sellr_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since),
      // Sessions with email in period
      supabase
        .from('sellr_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since)
        .not('email', 'is', null),
      // Paid orders in period (count only)
      supabase
        .from('sellr_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'complete')
        .gte('created_at', since),
      // Total records scanned in period
      supabase
        .from('sellr_records')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since),
      // Top artists (fetch artist column for records in period)
      supabase
        .from('sellr_records')
        .select('artist')
        .gte('created_at', since)
        .limit(10000),
      // Records per session + collection value (session_id, price_median)
      supabase
        .from('sellr_records')
        .select('session_id, price_median')
        .gte('created_at', since)
        .limit(10000),
    ]);

    // ── Revenue aggregation ────────────────────────────────────────
    const completeOrders = ordersRes.data ?? [];
    let totalCents = 0;
    const byTier: Record<string, number> = { starter: 0, standard: 0, full: 0 };
    const dayMap = new Map<string, { date: string; amount_cents: number; order_count: number }>();

    for (const o of completeOrders) {
      const row = o as { amount_cents: number; tier: string; created_at: string };
      totalCents += row.amount_cents || 0;
      if (row.tier in byTier) byTier[row.tier] += row.amount_cents || 0;
      const dateKey = row.created_at.slice(0, 10); // YYYY-MM-DD
      const existing = dayMap.get(dateKey);
      if (existing) {
        existing.amount_cents += row.amount_cents || 0;
        existing.order_count += 1;
      } else {
        dayMap.set(dateKey, { date: dateKey, amount_cents: row.amount_cents || 0, order_count: 1 });
      }
    }

    // Fill in zero-days so the chart has no gaps
    const byDay: Array<{ date: string; amount_cents: number; order_count: number }> = [];
    const startDate = new Date(since);
    const today = new Date();
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      byDay.push(dayMap.get(key) ?? { date: key, amount_cents: 0, order_count: 0 });
    }

    // ── Sessions / funnel ──────────────────────────────────────────
    const totalSessions = sessionsRes.count ?? 0;
    const withEmail = sessionsWithEmailRes.count ?? 0;
    const paid = paidOrdersRes.count ?? 0;
    const abandoned = Math.max(0, withEmail - paid);
    const conversionRate = withEmail > 0
      ? Math.round((paid / withEmail) * 10000) / 10000
      : 0;

    // ── Records stats ──────────────────────────────────────────────
    const totalScanned = recordsRes.count ?? 0;
    const avgPerSession = totalSessions > 0
      ? Math.round((totalScanned / totalSessions) * 10) / 10
      : 0;

    // Avg collection value: sum price_median per session, then average
    const sessionValueMap = new Map<string, number>();
    for (const r of (sessionRecordSumsRes.data ?? []) as Array<{ session_id: string; price_median: number | null }>) {
      if (r.price_median != null) {
        sessionValueMap.set(r.session_id, (sessionValueMap.get(r.session_id) ?? 0) + r.price_median);
      }
    }
    const sessionValues = Array.from(sessionValueMap.values());
    const avgCollectionValue = sessionValues.length > 0
      ? Math.round(sessionValues.reduce((a, b) => a + b, 0) / sessionValues.length)
      : 0;

    // ── Top artists ────────────────────────────────────────────────
    const artistCounts = new Map<string, number>();
    for (const r of (artistsRes.data ?? []) as Array<{ artist: string }>) {
      const name = (r.artist || '').trim();
      if (name) artistCounts.set(name, (artistCounts.get(name) ?? 0) + 1);
    }
    const topArtists = Array.from(artistCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([artist, count]) => ({ artist, count }));

    res.json({
      revenue: {
        total_cents: totalCents,
        by_tier: byTier,
        by_day: byDay,
      },
      sessions: {
        total: totalSessions,
        with_email: withEmail,
        paid,
        abandoned,
        conversion_rate: conversionRate,
      },
      records: {
        total_scanned: totalScanned,
        avg_per_session: avgPerSession,
        avg_collection_value: avgCollectionValue,
      },
      top_artists: topArtists,
    });
  } catch (err) {
    console.error('[sellr-admin] GET /analytics error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ── POST /api/sellr/admin/tools/resend-email ────────────────────────
// Resend a specific email type for a session.
const VALID_EMAIL_TYPES = ['session_created', 'payment_confirmed', 'abandoned_session', 'rekkrd_conversion', 'admin_alert'] as const;
type SellrEmailType = (typeof VALID_EMAIL_TYPES)[number];

router.post('/api/sellr/admin/tools/resend-email', async (req: Request, res: Response) => {
  if (!requireSellrAdmin(req, res)) return;

  try {
    const { session_id, email_type } = req.body as { session_id?: string; email_type?: string };

    if (!session_id || !email_type || !VALID_EMAIL_TYPES.includes(email_type as SellrEmailType)) {
      res.status(400).json({ success: false, message: 'Missing or invalid session_id / email_type' });
      return;
    }

    const supabase = getSupabaseAdmin();

    // Fetch session
    const { data: session, error: sessErr } = await supabase
      .from('sellr_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessErr || !session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    // Fetch order (needed for payment_confirmed, admin_alert)
    const { data: order } = await supabase
      .from('sellr_orders')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch records (needed for payment_confirmed, abandoned, conversion)
    const { data: records } = await supabase
      .from('sellr_records')
      .select('artist, title, price_median')
      .eq('session_id', session_id)
      .order('price_median', { ascending: false });

    const allRecords = records ?? [];
    const totalMedian = allRecords.reduce((sum: number, r: { price_median: number | null }) => sum + (r.price_median ?? 0), 0);
    const email = session.email || order?.email;

    if (!email && email_type !== 'admin_alert') {
      res.status(400).json({ success: false, message: 'No email address found for this session' });
      return;
    }

    switch (email_type as SellrEmailType) {
      case 'session_created':
        await sendSessionCreatedEmail({
          email: email!,
          session_id,
          record_count: session.record_count ?? 0,
          expires_at: session.expires_at,
        });
        break;

      case 'payment_confirmed':
        if (!order) {
          res.status(400).json({ success: false, message: 'No order found for this session' });
          return;
        }
        await sendPaymentConfirmedEmail({
          email: email!,
          session_id,
          report_token: order.report_token,
          record_count: session.record_count ?? 0,
          total_median: totalMedian,
          top_records: allRecords
            .filter((r: { price_median: number | null }) => r.price_median != null)
            .slice(0, 5) as Array<{ artist: string; title: string; price_median: number }>,
        });
        break;

      case 'abandoned_session':
        await sendAbandonedSessionEmail({
          email: email!,
          session_id,
          record_count: session.record_count ?? 0,
          total_median: totalMedian,
        });
        break;

      case 'rekkrd_conversion':
        await sendRekkrdConversionEmail({
          email: email!,
          session_id,
          record_count: session.record_count ?? 0,
          report_token: order?.report_token ?? '',
        });
        break;

      case 'admin_alert':
        if (!order) {
          res.status(400).json({ success: false, message: 'No order found for admin alert' });
          return;
        }
        await sendAdminOrderAlert({
          order_id: order.id,
          email: order.email,
          tier: order.tier,
          record_count: session.record_count ?? 0,
          amount_cents: order.amount_cents,
          total_median: totalMedian,
        });
        break;
    }

    res.json({ success: true, message: `${email_type} email sent` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sellr-admin] resend-email error:', message);
    res.status(500).json({ success: false, message });
  }
});

// ── POST /api/sellr/admin/tools/expire-session ─────────────────────
router.post('/api/sellr/admin/tools/expire-session', async (req: Request, res: Response) => {
  if (!requireSellrAdmin(req, res)) return;

  try {
    const { session_id } = req.body as { session_id?: string };
    if (!session_id) {
      res.status(400).json({ success: false, message: 'Missing session_id' });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('sellr_sessions')
      .update({ status: 'expired' })
      .eq('id', session_id);

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sellr-admin] expire-session error:', message);
    res.status(500).json({ success: false, message });
  }
});

// ── POST /api/sellr/admin/tools/refund-order ────────────────────────
router.post('/api/sellr/admin/tools/refund-order', async (req: Request, res: Response) => {
  if (!requireSellrAdmin(req, res)) return;

  try {
    const { order_id } = req.body as { order_id?: string };
    if (!order_id) {
      res.status(400).json({ success: false, message: 'Missing order_id' });
      return;
    }

    const supabase = getSupabaseAdmin();

    const { data: order, error: orderErr } = await supabase
      .from('sellr_orders')
      .select('id, status, stripe_payment_intent')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (order.status !== 'complete') {
      res.status(400).json({ success: false, message: `Cannot refund order with status "${order.status}"` });
      return;
    }

    if (!order.stripe_payment_intent) {
      res.status(400).json({ success: false, message: 'No Stripe payment intent on this order' });
      return;
    }

    // Issue Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent,
    });

    // Update order status
    const { error: updateErr } = await supabase
      .from('sellr_orders')
      .update({ status: 'refunded' })
      .eq('id', order_id);

    if (updateErr) {
      console.error('[sellr-admin] Failed to update order status after refund:', updateErr.message);
    }

    res.json({ success: true, refund_id: refund.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sellr-admin] refund-order error:', message);
    res.status(500).json({ success: false, message });
  }
});

// ── POST /api/sellr/admin/tools/regenerate-report-token ─────────────
router.post('/api/sellr/admin/tools/regenerate-report-token', async (req: Request, res: Response) => {
  if (!requireSellrAdmin(req, res)) return;

  try {
    const { order_id } = req.body as { order_id?: string };
    if (!order_id) {
      res.status(400).json({ success: false, message: 'Missing order_id' });
      return;
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('sellr_orders')
      .update({ report_token: newToken })
      .eq('id', order_id);

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.json({ success: true, new_token: newToken });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sellr-admin] regenerate-report-token error:', message);
    res.status(500).json({ success: false, message });
  }
});

// ── GET /api/sellr/admin/stats ──────────────────────────────────────
// Quick summary stats for the Sellr admin header.
router.get('/api/sellr/admin/stats', async (req: Request, res: Response) => {
  if (!requireSellrAdmin(req, res)) return;

  try {
    const supabase = getSupabaseAdmin();

    const [ordersRes, sessionsRes, recordsRes, sessionsWithEmailRes, paidSessionsRes] = await Promise.all([
      // Total orders + revenue
      supabase
        .from('sellr_orders')
        .select('amount_cents', { count: 'exact' })
        .eq('status', 'paid'),
      // Active sessions (status = 'active')
      supabase
        .from('sellr_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      // Total records scanned
      supabase
        .from('sellr_records')
        .select('id', { count: 'exact', head: true }),
      // Sessions with email (for conversion rate denominator)
      supabase
        .from('sellr_sessions')
        .select('id', { count: 'exact', head: true })
        .not('email', 'is', null),
      // Paid sessions (for conversion rate numerator)
      supabase
        .from('sellr_orders')
        .select('session_id', { count: 'exact', head: true })
        .eq('status', 'paid'),
    ]);

    const totalOrders = ordersRes.count ?? 0;
    const totalRevenueCents = (ordersRes.data ?? []).reduce(
      (sum: number, o: { amount_cents: number }) => sum + (o.amount_cents || 0),
      0,
    );
    const activeSessions = sessionsRes.count ?? 0;
    const totalRecordsScanned = recordsRes.count ?? 0;
    const sessionsWithEmail = sessionsWithEmailRes.count ?? 0;
    const paidSessions = paidSessionsRes.count ?? 0;
    const conversionRate = sessionsWithEmail > 0
      ? Math.round((paidSessions / sessionsWithEmail) * 10000) / 10000
      : 0;

    res.json({
      total_orders: totalOrders,
      total_revenue_cents: totalRevenueCents,
      active_sessions: activeSessions,
      total_records_scanned: totalRecordsScanned,
      conversion_rate: conversionRate,
    });
  } catch (err) {
    console.error('[sellr-admin] GET /stats error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
