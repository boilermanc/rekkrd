import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { GEAR_CATEGORIES } from '../../types.js';
import { getSubscription, PLAN_LIMITS } from '../lib/subscription.js';

const router = Router();
const gearRateLimit = createRateLimit(30, 60);

let _admin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (_admin) return _admin;
  _admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _admin;
}

function getAuth(req: Request): string {
  return (req as Request & { auth: AuthResult }).auth.userId;
}

const UPDATABLE_FIELDS = [
  'category', 'brand', 'model', 'year', 'description', 'specs',
  'manual_url', 'manual_pdf_url', 'image_url', 'original_photo_url',
  'purchase_price', 'purchase_date', 'notes', 'position',
] as const;

// ── POST /api/gear/check-limit ───────────────────────────────────
// Called before saving a gear item. Returns 403 if the user's plan
// has a finite gear limit and they've reached it.
router.post('/api/gear/check-limit', requireAuthWithUser, async (req: Request, res: Response) => {
  const userId = getAuth(req);

  try {
    const sub = await getSubscription(userId);
    const gearLimit = PLAN_LIMITS[sub.plan].gear;

    // Paid tiers have Infinity — skip the count query entirely
    if (gearLimit === Infinity) {
      res.status(200).json({ allowed: true });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from('gear')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error || count === null) {
      console.error('[gear] check-limit count error:', error?.message);
      // Fail open — don't block the save if we can't count
      res.status(200).json({ allowed: true });
      return;
    }

    if (count >= gearLimit) {
      res.status(403).json({
        error: 'Gear limit reached',
        code: 'GEAR_LIMIT_REACHED',
        limit: gearLimit,
        used: count,
        upgradeRequired: 'curator',
      });
      return;
    }

    res.status(200).json({ allowed: true, used: count, limit: gearLimit });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[gear] check-limit error:', message);
    // Fail open
    res.status(200).json({ allowed: true });
  }
});

// ── GET /api/gear ─────────────────────────────────────────────────

router.get('/api/gear', requireAuthWithUser, gearRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('gear')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.status(200).json(data || []);
  } catch (err) {
    console.error('GET /api/gear error:', err);
    res.status(500).json({ error: 'Failed to fetch gear' });
  }
});

// ── POST /api/gear ────────────────────────────────────────────────

router.post('/api/gear', requireAuthWithUser, gearRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const { category, brand, model } = req.body;

    // Validate required fields
    if (!category || typeof category !== 'string') {
      res.status(400).json({ error: 'category is required' });
      return;
    }
    if (!(GEAR_CATEGORIES as readonly string[]).includes(category)) {
      res.status(400).json({ error: `category must be one of: ${GEAR_CATEGORIES.join(', ')}` });
      return;
    }
    if (!brand || typeof brand !== 'string' || !brand.trim()) {
      res.status(400).json({ error: 'brand is required and must be a non-empty string' });
      return;
    }
    if (!model || typeof model !== 'string' || !model.trim()) {
      res.status(400).json({ error: 'model is required and must be a non-empty string' });
      return;
    }

    const supabase = getSupabaseAdmin();

    const insertData: Record<string, unknown> = { user_id: userId };
    for (const key of UPDATABLE_FIELDS) {
      if (key in req.body) {
        insertData[key] = req.body[key];
      }
    }

    const { data, error } = await supabase
      .from('gear')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/gear error:', err);
    res.status(500).json({ error: 'Failed to create gear' });
  }
});

// ── PUT /api/gear/reorder (before :id to avoid catch) ─────────────

router.put('/api/gear/reorder', requireAuthWithUser, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      res.status(400).json({ error: 'orderedIds must be a non-empty array of strings' });
      return;
    }

    const supabase = getSupabaseAdmin();

    // Verify all IDs belong to this user
    const { data: owned, error: verifyError } = await supabase
      .from('gear')
      .select('id')
      .eq('user_id', userId)
      .in('id', orderedIds);

    if (verifyError) throw verifyError;

    const ownedIds = new Set((owned || []).map((g: { id: string }) => g.id));
    const unowned = orderedIds.filter((id: string) => !ownedIds.has(id));
    if (unowned.length > 0) {
      res.status(403).json({ error: 'Some gear IDs do not belong to you' });
      return;
    }

    // Batch update positions
    const updates = orderedIds.map((id: string, index: number) =>
      supabase.from('gear').update({ position: index }).eq('id', id)
    );

    const results = await Promise.all(updates);
    for (const result of results) {
      if (result.error) throw result.error;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('PUT /api/gear/reorder error:', err);
    res.status(500).json({ error: 'Failed to reorder gear' });
  }
});

// ── PUT /api/gear/:id ─────────────────────────────────────────────

router.put('/api/gear/:id', requireAuthWithUser, gearRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('gear')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Gear not found' });
      return;
    }

    // Validate category if provided
    if ('category' in req.body) {
      if (!(GEAR_CATEGORIES as readonly string[]).includes(req.body.category)) {
        res.status(400).json({ error: `category must be one of: ${GEAR_CATEGORIES.join(', ')}` });
        return;
      }
    }

    const dbUpdates: Record<string, unknown> = {};
    for (const key of UPDATABLE_FIELDS) {
      if (key in req.body) {
        dbUpdates[key] = req.body[key];
      }
    }

    if (Object.keys(dbUpdates).length === 0) {
      res.status(400).json({ error: 'No updatable fields provided' });
      return;
    }

    const { data, error } = await supabase
      .from('gear')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error('PUT /api/gear/:id error:', err);
    res.status(500).json({ error: 'Failed to update gear' });
  }
});

// ── DELETE /api/gear/:id ──────────────────────────────────────────

router.delete('/api/gear/:id', requireAuthWithUser, gearRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('gear')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Gear not found' });
      return;
    }

    const { error } = await supabase
      .from('gear')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).end();
  } catch (err) {
    console.error('DELETE /api/gear/:id error:', err);
    res.status(500).json({ error: 'Failed to delete gear' });
  }
});

export default router;
