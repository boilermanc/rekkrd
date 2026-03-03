import { Router, type Request, type Response } from 'express';
import { requireAuthWithUser } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { getAuth } from '../utils/getAuth.js';

const router = Router();

// ── GET /api/setup-guides ────────────────────────────────────────

router.get('/api/setup-guides', requireAuthWithUser, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');

    const { data, error } = await supabase
      .from('setup_guides')
      .select('id, name, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ guides: data || [] });
  } catch (err) {
    console.error('GET /api/setup-guides error:', err);
    res.status(500).json({ error: 'Failed to fetch setup guides' });
  }
});

// ── GET /api/setup-guides/:id ────────────────────────────────────

router.get('/api/setup-guides/:id', requireAuthWithUser, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');

    const { data, error } = await supabase
      .from('setup_guides')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Setup guide not found' });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('GET /api/setup-guides/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch setup guide' });
  }
});

// ── POST /api/setup-guides ───────────────────────────────────────

router.post('/api/setup-guides', requireAuthWithUser, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const { name, gear_snapshot, guide } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'name is required and must be a non-empty string' });
      return;
    }
    if (!Array.isArray(gear_snapshot)) {
      res.status(400).json({ error: 'gear_snapshot must be an array' });
      return;
    }
    if (!guide || typeof guide !== 'object' || Array.isArray(guide)) {
      res.status(400).json({ error: 'guide must be an object' });
      return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');

    const { data, error } = await supabase
      .from('setup_guides')
      .insert([{
        user_id: userId,
        name: name.trim(),
        gear_snapshot,
        guide,
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/setup-guides error:', err);
    res.status(500).json({ error: 'Failed to save setup guide' });
  }
});

// ── DELETE /api/setup-guides/:id ─────────────────────────────────

router.delete('/api/setup-guides/:id', requireAuthWithUser, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');

    const { data: existing, error: fetchError } = await supabase
      .from('setup_guides')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Setup guide not found' });
      return;
    }

    const { error } = await supabase
      .from('setup_guides')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(204).end();
  } catch (err) {
    console.error('DELETE /api/setup-guides/:id error:', err);
    res.status(500).json({ error: 'Failed to delete setup guide' });
  }
});

export default router;
