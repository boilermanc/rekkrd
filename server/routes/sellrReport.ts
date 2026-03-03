import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import { buildSellrPdfHtml } from '../sellrPdfTemplate.js';
import { requireSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { errorResponse } from '../utils/errorResponse.js';

const router = Router();

// ── GET /api/sellr/report/token/:report_token ────────────────────────
// Public report access by token. Verifies order is complete.
router.get('/api/sellr/report/token/:report_token', async (req: Request, res: Response) => {
  try {
    const { report_token } = req.params;
    const supabase = requireSupabaseAdmin();

    const { data: order, error: orderErr } = await supabase
      .from('sellr_orders')
      .select('*')
      .eq('report_token', report_token)
      .single();

    if (orderErr || !order) {
      errorResponse(res, 404, 'Report not found');
      return;
    }

    if (order.status !== 'complete') {
      errorResponse(res, 403, 'Report is not yet available');
      return;
    }

    // Fetch session
    const { data: session, error: sessionErr } = await supabase
      .from('sellr_sessions')
      .select('*')
      .eq('id', order.session_id)
      .single();

    if (sessionErr || !session) {
      console.error('[sellr-report] Session not found for order', order.id, sessionErr?.message);
      errorResponse(res, 500, 'Failed to load session');
      return;
    }

    // Fetch records
    const { data: records, error: recordsErr } = await supabase
      .from('sellr_records')
      .select('*')
      .eq('session_id', order.session_id)
      .order('created_at', { ascending: true });

    if (recordsErr) {
      console.error('[sellr-report] Failed to fetch records', recordsErr.message);
      errorResponse(res, 500, 'Failed to load records');
      return;
    }

    res.json({ order, session, records: records ?? [] });
  } catch (err) {
    console.error('[sellr-report] GET /token/:token error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

// ── GET /api/sellr/report/session/:session_id ────────────────────────
// Lookup by session_id. Used by success page to check if report is ready.
router.get('/api/sellr/report/session/:session_id', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.params;
    const supabase = requireSupabaseAdmin();

    // Fetch session
    const { data: session, error: sessionErr } = await supabase
      .from('sellr_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionErr || !session) {
      errorResponse(res, 404, 'Session not found');
      return;
    }

    if (session.status !== 'paid') {
      errorResponse(res, 404, 'Report not ready yet');
      return;
    }

    // Fetch order for this session
    const { data: order, error: orderErr } = await supabase
      .from('sellr_orders')
      .select('*')
      .eq('session_id', session_id)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (orderErr || !order) {
      errorResponse(res, 404, 'Report not ready yet');
      return;
    }

    // Fetch records
    const { data: records, error: recordsErr } = await supabase
      .from('sellr_records')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    if (recordsErr) {
      console.error('[sellr-report] Failed to fetch records', recordsErr.message);
      errorResponse(res, 500, 'Failed to load records');
      return;
    }

    res.json({ order, session, records: records ?? [] });
  } catch (err) {
    console.error('[sellr-report] GET /session/:id error:', (err as Error).message);
    errorResponse(res, 500, 'Internal server error');
  }
});

// ── POST /api/sellr/report/pdf ───────────────────────────────────────
// Generates a PDF for a paid Sellr session.
router.post('/api/sellr/report/pdf', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.body ?? {};

    if (!session_id || typeof session_id !== 'string') {
      errorResponse(res, 400, 'Missing or invalid session_id');
      return;
    }

    const supabase = requireSupabaseAdmin();

    // Fetch session
    const { data: session, error: sessionErr } = await supabase
      .from('sellr_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionErr || !session) {
      errorResponse(res, 404, 'Session not found');
      return;
    }

    if (session.status !== 'paid') {
      errorResponse(res, 403, 'Payment incomplete');
      return;
    }

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('sellr_orders')
      .select('*')
      .eq('session_id', session_id)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (orderErr || !order) {
      errorResponse(res, 404, 'Order not found');
      return;
    }

    // Fetch records
    const { data: records, error: recordsErr } = await supabase
      .from('sellr_records')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    if (recordsErr) {
      console.error('[sellr-report] PDF: failed to fetch records', recordsErr.message);
      errorResponse(res, 500, 'Failed to load records');
      return;
    }

    // Build HTML and render PDF
    const html = buildSellrPdfHtml({ session, records: records ?? [], order });

    let browser;
    try {
      browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.emulateMediaType('screen');

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });

      const shortId = session_id.slice(0, 8);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="sellr-appraisal-${shortId}.pdf"`);
      res.send(Buffer.from(pdfBuffer));
    } finally {
      if (browser) await browser.close();
    }
  } catch (err) {
    console.error('[sellr-report] POST /pdf error:', (err as Error).message);
    errorResponse(res, 500, 'PDF generation failed');
  }
});

export default router;
