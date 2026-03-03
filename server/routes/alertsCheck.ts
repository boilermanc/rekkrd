import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendTemplatedEmail } from '../services/emailService.js';
import { discogsRequest } from '../services/discogsService.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { timingSafeCompare } from '../utils/timingSafeCompare.js';

const router = Router();
const LOG_PREFIX = '[alerts-check]';
const DELAY_BETWEEN_ALERTS_MS = 500;



function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Types ────────────────────────────────────────────────────────────

interface ActiveAlert {
  id: string;
  user_id: string;
  discogs_release_id: number;
  artist: string;
  title: string;
  target_price: number;
}

interface MarketplacePriceValue {
  value: number;
  currency: string;
}

interface MarketplaceStats {
  lowest_price: MarketplacePriceValue | null;
  median_price: MarketplacePriceValue | null;
  num_for_sale: number;
  blocked_from_sale: boolean;
}

// ── POST /api/alerts/check ──────────────────────────────────────────
// Internal endpoint for n8n workflow. Authenticated via X-Internal-Secret
// header, NOT JWT. Checks active price alerts against Discogs marketplace
// stats and sends email notifications when targets are met.
router.post(
  '/api/alerts/check',
  async (req: Request, res: Response) => {
    const secret = req.headers['x-internal-secret'] as string | undefined;
    const expected = process.env.INTERNAL_ALERTS_SECRET;
    if (!secret || !expected || !timingSafeCompare(secret, expected)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    let checked = 0;
    let triggered = 0;
    let errors = 0;

    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('Supabase admin not configured');

      // Fetch active alerts where last_checked_at is null or older than 23 hours
      const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
      const { data: alerts, error: fetchError } = await supabase
        .from('discogs_price_alerts')
        .select('id, user_id, discogs_release_id, artist, title, target_price')
        .eq('is_active', true)
        .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`);

      if (fetchError) {
        console.error(`${LOG_PREFIX} Fetch error:`, fetchError.message);
        res.status(500).json({ error: 'Failed to fetch alerts' });
        return;
      }

      const activeAlerts = (alerts ?? []) as ActiveAlert[];
      console.log(`${LOG_PREFIX} Found ${activeAlerts.length} alerts to check`);

      for (let i = 0; i < activeAlerts.length; i++) {
        const alert = activeAlerts[i];

        // Rate limit delay between checks
        if (i > 0) {
          await delay(DELAY_BETWEEN_ALERTS_MS);
        }

        try {
          // Fetch marketplace stats from Discogs
          const stats = await discogsRequest<MarketplaceStats>(
            `/marketplace/stats/${alert.discogs_release_id}`,
            { curr_abbr: 'USD' },
          );

          const priceLow = stats.lowest_price?.value ?? null;

          if (priceLow !== null && priceLow <= alert.target_price) {
            // Price target met — trigger the alert
            const { error: triggerError } = await supabase
              .from('discogs_price_alerts')
              .update({
                triggered_at: new Date().toISOString(),
                is_active: false,
                last_checked_at: new Date().toISOString(),
              })
              .eq('id', alert.id);

            if (triggerError) {
              console.error(`${LOG_PREFIX} Trigger update error for ${alert.id}:`, triggerError.message);
              errors++;
              continue;
            }

            triggered++;

            // Look up user email from Supabase Auth
            const { data: { user }, error: userErr } =
              await supabase.auth.admin.getUserById(alert.user_id);

            if (userErr || !user?.email) {
              console.error(`${LOG_PREFIX} Could not resolve email for user ${alert.user_id}:`, userErr?.message);
            } else {
              const discogsUrl = `https://www.discogs.com/sell/release/${alert.discogs_release_id}`;

              // Fire-and-forget: price alert email
              sendTemplatedEmail({
                to: user.email,
                presetId: 'price-alert',
                variableOverrides: {
                  artist: alert.artist,
                  title: alert.title,
                  target_price: alert.target_price.toFixed(2),
                  current_price: priceLow.toFixed(2),
                  discogs_url: discogsUrl,
                },
              })
                .then(result => result && console.log(`${LOG_PREFIX} Price alert email sent to ${user.email}`))
                .catch(err => console.error(`${LOG_PREFIX} Price alert email failed:`, err));
            }
          } else {
            // Not triggered — just update last_checked_at
            const { error: updateError } = await supabase
              .from('discogs_price_alerts')
              .update({ last_checked_at: new Date().toISOString() })
              .eq('id', alert.id);

            if (updateError) {
              console.error(`${LOG_PREFIX} Update last_checked_at error for ${alert.id}:`, updateError.message);
              errors++;
              continue;
            }
          }

          checked++;
        } catch (alertErr) {
          const message = alertErr instanceof Error ? alertErr.message : 'Unknown error';
          console.error(`${LOG_PREFIX} Error checking alert ${alert.id}:`, message);
          errors++;
        }
      }

      console.log(`${LOG_PREFIX} Done: checked=${checked}, triggered=${triggered}, errors=${errors}`);
      res.json({ checked, triggered, errors });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`${LOG_PREFIX} Handler error:`, message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
