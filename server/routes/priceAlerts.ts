import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';

const router = Router();

interface PriceAlert {
  id: string;
  user_id: string;
  discogs_release_id: number;
  artist: string;
  title: string;
  cover_url: string | null;
  target_price: number;
  condition_minimum: string;
  is_active: boolean;
  last_checked_at: string | null;
  triggered_at: string | null;
  created_at: string;
}

const VALID_CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'];

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getUserId(req: Parameters<typeof requireAuthWithUser>[0]): string {
  return (req as typeof req & { auth: AuthResult }).auth.userId;
}

// ── GET /api/price-alerts ────────────────────────────────────────────
router.get(
  '/api/price-alerts',
  requireAuthWithUser,
  async (req, res) => {
    const userId = getUserId(req);

    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('discogs_price_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[price-alerts] Fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch price alerts' });
        return;
      }

      res.json({ alerts: (data ?? []) as PriceAlert[] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[price-alerts] GET error:', message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ── POST /api/price-alerts ───────────────────────────────────────────
router.post(
  '/api/price-alerts',
  requireAuthWithUser,
  async (req, res) => {
    const userId = getUserId(req);

    try {
      const { discogs_release_id, artist, title, cover_url, target_price, condition_minimum } =
        req.body as {
          discogs_release_id: number;
          artist: string;
          title: string;
          cover_url: string | null;
          target_price: number;
          condition_minimum: string;
        };

      // Validate target_price
      if (typeof target_price !== 'number' || target_price <= 0) {
        res.status(400).json({ error: 'target_price must be a number greater than 0' });
        return;
      }

      // Validate condition_minimum
      if (!VALID_CONDITIONS.includes(condition_minimum)) {
        res.status(400).json({
          error: `condition_minimum must be one of: ${VALID_CONDITIONS.join(', ')}`,
        });
        return;
      }

      const supabase = getSupabaseAdmin();

      // Check for duplicate active alert
      const { data: existing, error: dupError } = await supabase
        .from('discogs_price_alerts')
        .select('id')
        .eq('user_id', userId)
        .eq('discogs_release_id', discogs_release_id)
        .eq('is_active', true)
        .maybeSingle();

      if (dupError) {
        console.error('[price-alerts] Duplicate check error:', dupError.message);
        res.status(500).json({ error: 'Failed to check for existing alert' });
        return;
      }

      if (existing) {
        res.status(409).json({ error: 'Alert already exists for this release' });
        return;
      }

      const { data, error } = await supabase
        .from('discogs_price_alerts')
        .insert({
          user_id: userId,
          discogs_release_id,
          artist,
          title,
          cover_url: cover_url ?? null,
          target_price,
          condition_minimum,
        })
        .select()
        .single();

      if (error) {
        console.error('[price-alerts] Insert error:', error.message);
        res.status(500).json({ error: 'Failed to create price alert' });
        return;
      }

      res.status(201).json({ alert: data as PriceAlert });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[price-alerts] POST error:', message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ── DELETE /api/price-alerts/:id ─────────────────────────────────────
router.delete(
  '/api/price-alerts/:id',
  requireAuthWithUser,
  async (req, res) => {
    const userId = getUserId(req);
    const alertId = req.params.id;

    try {
      const supabase = getSupabaseAdmin();

      // Verify ownership
      const { data: alert, error: fetchError } = await supabase
        .from('discogs_price_alerts')
        .select('id')
        .eq('id', alertId)
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('[price-alerts] Fetch for delete error:', fetchError.message);
        res.status(500).json({ error: 'Failed to verify alert ownership' });
        return;
      }

      if (!alert) {
        res.status(404).json({ error: 'Price alert not found' });
        return;
      }

      const { error: deleteError } = await supabase
        .from('discogs_price_alerts')
        .delete()
        .eq('id', alertId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('[price-alerts] Delete error:', deleteError.message);
        res.status(500).json({ error: 'Failed to delete price alert' });
        return;
      }

      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[price-alerts] DELETE error:', message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ── PATCH /api/price-alerts/:id/toggle ───────────────────────────────
router.patch(
  '/api/price-alerts/:id/toggle',
  requireAuthWithUser,
  async (req, res) => {
    const userId = getUserId(req);
    const alertId = req.params.id;

    try {
      const supabase = getSupabaseAdmin();

      // Fetch current state + verify ownership
      const { data: alert, error: fetchError } = await supabase
        .from('discogs_price_alerts')
        .select('id, is_active')
        .eq('id', alertId)
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('[price-alerts] Fetch for toggle error:', fetchError.message);
        res.status(500).json({ error: 'Failed to verify alert ownership' });
        return;
      }

      if (!alert) {
        res.status(404).json({ error: 'Price alert not found' });
        return;
      }

      const newIsActive = !alert.is_active;

      const updatePayload: { is_active: boolean; triggered_at?: null } = {
        is_active: newIsActive,
      };

      // Clear triggered_at when re-activating
      if (newIsActive) {
        updatePayload.triggered_at = null;
      }

      const { data: updated, error: updateError } = await supabase
        .from('discogs_price_alerts')
        .update(updatePayload)
        .eq('id', alertId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('[price-alerts] Toggle error:', updateError.message);
        res.status(500).json({ error: 'Failed to toggle price alert' });
        return;
      }

      res.json({ alert: updated as PriceAlert });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[price-alerts] PATCH toggle error:', message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
