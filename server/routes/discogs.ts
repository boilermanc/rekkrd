import { Router } from 'express';
import { discogsRateLimiter } from '../middleware/discogsRateLimit.js';
import { searchDiscogs } from '../services/discogsService.js';
import type { DiscogsSearchParams } from '../../types/discogs.js';

const router = Router();

// Apply Discogs rate limiter to all routes in this router
router.use(discogsRateLimiter);

router.get('/api/discogs/search', async (req, res) => {
  try {
    const { q, type, artist, title, barcode, year, format, country, per_page, page } = req.query;

    // At least one search param required
    if (!q && !artist && !title && !barcode) {
      res.status(400).json({ error: 'At least one search param (q, artist, title, or barcode) is required' });
      return;
    }

    // Clamp per_page to 1–100, default 20
    let perPage = 20;
    if (per_page && typeof per_page === 'string') {
      const parsed = parseInt(per_page, 10);
      if (Number.isFinite(parsed)) {
        perPage = Math.max(1, Math.min(100, parsed));
      }
    }

    // Default page to 1
    let pageNum = 1;
    if (page && typeof page === 'string') {
      const parsed = parseInt(page, 10);
      if (Number.isFinite(parsed) && parsed >= 1) {
        pageNum = parsed;
      }
    }

    const params: DiscogsSearchParams = {
      per_page: String(perPage),
      page: String(pageNum),
    };

    if (q && typeof q === 'string') params.q = q;
    if (type && typeof type === 'string') params.type = type as DiscogsSearchParams['type'];
    if (artist && typeof artist === 'string') params.artist = artist;
    if (title && typeof title === 'string') params.title = title;
    if (barcode && typeof barcode === 'string') params.barcode = barcode;
    if (year && typeof year === 'string') params.year = year;
    if (format && typeof format === 'string') params.format = format;
    if (country && typeof country === 'string') params.country = country;

    const result = await searchDiscogs(params);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Discogs search error:', error);
    res.status(500).json({ error: 'Failed to search Discogs', details: message });
  }
});

export default router;
