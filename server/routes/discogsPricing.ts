import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { discogsRequest } from '../services/discogsService.js';
import type { Request } from 'express';

const router = Router();
const LOG_PREFIX = '[discogs-pricing]';
const MAX_RELEASE_IDS = 50;
const DELAY_BETWEEN_REQUESTS_MS = 1000;

// ── Types ────────────────────────────────────────────────────────────

interface MarketplacePriceValue {
  value: number;
  currency: string;
}

interface MarketplaceStats {
  lowest_price: MarketplacePriceValue | null;
  median_price: MarketplacePriceValue | null;
  highest_price: MarketplacePriceValue | null;
  num_for_sale: number;
  blocked_from_sale: boolean;
}

interface DiscogsImage {
  type: string;
  uri: string;
  resource_url: string;
}

interface DiscogsReleasePartial {
  images?: DiscogsImage[];
}

// ── Helpers ──────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getUserId(req: Request): string {
  return (req as Request & { auth: AuthResult }).auth.userId;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── POST /api/discogs-pricing ────────────────────────────────────────
router.post(
  '/api/discogs-pricing',
  requireAuthWithUser,
  async (req, res) => {
    const userId = getUserId(req);

    try {
      const { release_ids } = req.body as { release_ids: unknown };

      // Validate input
      if (!Array.isArray(release_ids) || release_ids.length === 0) {
        res.status(400).json({ error: 'release_ids must be a non-empty array' });
        return;
      }

      if (release_ids.length > MAX_RELEASE_IDS) {
        res.status(400).json({ error: `release_ids must contain at most ${MAX_RELEASE_IDS} items` });
        return;
      }

      if (!release_ids.every((id) => typeof id === 'number' && Number.isFinite(id) && id > 0)) {
        res.status(400).json({ error: 'All release_ids must be positive numbers' });
        return;
      }

      const supabase = getSupabaseAdmin();

      // Pre-fetch which release IDs are missing cover art so we only
      // call the heavier /releases endpoint when needed.
      const { data: missingCoverRows } = await supabase
        .from('wantlist')
        .select('discogs_release_id')
        .eq('user_id', userId)
        .in('discogs_release_id', release_ids)
        .is('cover_url', null);

      const missingCoverIds = new Set(
        (missingCoverRows ?? []).map((r: { discogs_release_id: number }) => r.discogs_release_id),
      );

      let updated = 0;
      let coverUrlsUpdated = 0;
      const errors: string[] = [];

      for (let i = 0; i < release_ids.length; i++) {
        const releaseId = release_ids[i];

        // Rate limit delay between Discogs API calls
        if (i > 0) {
          await delay(DELAY_BETWEEN_REQUESTS_MS);
        }

        try {
          // Fire both calls in parallel when cover art is missing;
          // otherwise just fetch pricing stats.
          const needsCover = missingCoverIds.has(releaseId);

          const [stats, release] = await Promise.all([
            discogsRequest<MarketplaceStats>(
              `/marketplace/stats/${releaseId}`,
              { curr_abbr: 'USD' },
            ),
            needsCover
              ? discogsRequest<DiscogsReleasePartial>(`/releases/${releaseId}`)
              : Promise.resolve(null),
          ]);

          const priceLow = stats.lowest_price?.value ?? null;
          const priceMedian = stats.median_price?.value ?? null;
          const priceHigh = stats.highest_price?.value ?? null;

          // Extract primary image if available
          const coverUrl = release?.images?.[0]?.uri
            ?? release?.images?.[0]?.resource_url
            ?? null;

          const hasValidPrices = (priceLow && priceLow > 0) || (priceMedian && priceMedian > 0) || (priceHigh && priceHigh > 0);

          // Only include pricing fields that are > 0 — don't overwrite Gemini estimates with zeros
          const updateFields: Record<string, unknown> = {};
          if (priceLow && priceLow > 0) updateFields.price_low = priceLow;
          if (priceMedian && priceMedian > 0) updateFields.price_median = priceMedian;
          if (priceHigh && priceHigh > 0) updateFields.price_high = priceHigh;
          if (hasValidPrices) updateFields.prices_updated_at = new Date().toISOString();

          if (coverUrl) {
            updateFields.cover_url = coverUrl;
          }

          // Skip DB update if there's nothing to write
          if (Object.keys(updateFields).length === 0) {
            console.log(`${LOG_PREFIX} skipping ${releaseId} — no marketplace data`);
            continue;
          }

          const { error: updateError } = await supabase
            .from('wantlist')
            .update(updateFields)
            .eq('user_id', userId)
            .eq('discogs_release_id', releaseId);

          if (updateError) {
            console.error(`${LOG_PREFIX} DB update error for release ${releaseId}:`, updateError.message);
            errors.push(`Failed to save prices for release ${releaseId}`);
            continue;
          }

          updated++;
          if (coverUrl) coverUrlsUpdated++;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error(`${LOG_PREFIX} Error fetching stats for release ${releaseId}:`, message);
          errors.push(`Failed to fetch prices for release ${releaseId}`);
        }
      }

      console.log(`${LOG_PREFIX} Done: updated=${updated}, covers=${coverUrlsUpdated}, errors=${errors.length}`);
      res.json({ updated, cover_urls_updated: coverUrlsUpdated, errors });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`${LOG_PREFIX} Handler error:`, message);
      res.status(500).json({ error: 'Failed to refresh prices' });
    }
  },
);

export default router;
