import { Router, type Request, type Response } from 'express';
import puppeteer from 'puppeteer';
import { requireAuthWithUser } from '../middleware/auth.js';
import { buildSetupGuidePdfHtml } from '../setupGuidePdfTemplate.js';

const router = Router();

function errorResponse(res: Response, code: number, message: string) {
  res.status(code).json({ error: message, code });
}

// ── POST /api/setup-guides/pdf ──────────────────────────────────────
// Generates a setup guide PDF for the user's gear signal chain.
router.post('/api/setup-guides/pdf', requireAuthWithUser, async (req: Request, res: Response) => {
  try {
    const { guide, name, gear } = req.body ?? {};

    // Validate guide object
    if (
      !guide ||
      typeof guide !== 'object' ||
      (!Array.isArray(guide.signal_chain) || guide.signal_chain.length === 0) &&
      (!Array.isArray(guide.connections) || guide.connections.length === 0) &&
      (!Array.isArray(guide.settings) || guide.settings.length === 0)
    ) {
      errorResponse(res, 400, 'Invalid guide: must have at least one of signal_chain, connections, or settings');
      return;
    }

    if (!name || typeof name !== 'string') {
      errorResponse(res, 400, 'Missing or invalid name');
      return;
    }

    // Build gear name string from gear array: "Brand Model + Brand Model + ..."
    let gearNameStr = name;
    if (Array.isArray(gear) && gear.length > 0) {
      const items = gear.slice(0, 3).map((g: { brand?: string; model?: string }) => {
        const brand = (g.brand || '').trim();
        const model = (g.model || '').trim();
        return [brand, model].filter(Boolean).join(' ');
      }).filter(Boolean);
      if (items.length > 0) {
        gearNameStr = items.join(' + ');
      }
    }

    // Normalize guide arrays (default to empty arrays if missing)
    const normalizedGuide = {
      signal_chain: Array.isArray(guide.signal_chain) ? guide.signal_chain : [],
      connections: Array.isArray(guide.connections) ? guide.connections : [],
      settings: Array.isArray(guide.settings) ? guide.settings : [],
      tips: Array.isArray(guide.tips) ? guide.tips : [],
      warnings: Array.isArray(guide.warnings) ? guide.warnings : [],
    };

    const html = buildSetupGuidePdfHtml(normalizedGuide, gearNameStr);

    let browser;
    try {
      browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.emulateMediaType('screen');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="rekkrd-setup-guide.pdf"');
      res.send(Buffer.from(pdfBuffer));
    } finally {
      if (browser) await browser.close();
    }
  } catch (err) {
    console.error('[setup-guide-pdf] POST /pdf error:', (err as Error).message);
    errorResponse(res, 500, 'PDF generation failed');
  }
});

export default router;
