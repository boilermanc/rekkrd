import { Router, type Request, type Response } from 'express';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { discogsRequest } from '../services/discogsService.js';

const router = Router();
const CACHE_TTL_HOURS = 24;

router.get('/api/discogs-price', async (req: Request, res: Response) => {
  const { releaseId } = req.query;

  if (!releaseId || typeof releaseId !== 'string' || !/^\d+$/.test(releaseId)) {
    res.status(400).json({ error: 'Invalid release ID' });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(503).json({ error: 'Supabase admin not configured' });
    return;
  }

  try {
    // Check cache first
    const { data: cached } = await supabase
      .from('discogs_price_cache')
      .select('prices, fetched_at')
      .eq('release_id', releaseId)
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      const ageHours = age / (1000 * 60 * 60);
      if (ageHours < CACHE_TTL_HOURS) {
        res.status(200).json({ prices: cached.prices, cached: true });
        return;
      }
    }

    // Fetch from Discogs
    const data = await discogsRequest(
      `/marketplace/price_suggestions/${releaseId}`,
      {}
    );

    // Upsert cache
    await supabase.from('discogs_price_cache').upsert({
      release_id: releaseId,
      prices: data,
      fetched_at: new Date().toISOString(),
    });

    res.status(200).json({ prices: data, cached: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // Check for 404 from Discogs
    if (message.includes('404')) {
      res.status(404).json({ error: 'Release not found on Discogs' });
      return;
    }

    console.error('Price fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
