import { Router, type Request, type Response } from 'express';
import { requireAuthWithUser } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { requirePlan } from '../lib/subscription.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { getAuth } from '../utils/getAuth.js';

const router = Router();
const layoutRateLimit = createRateLimit(30, 60);

// ── GET /api/stakkd-rooms/:roomId/layouts ────────────────────────────
// Returns all layouts for a room (summary only — id, name, is_active, created_at)

router.get(
  '/api/stakkd-rooms/:roomId/layouts',
  requireAuthWithUser,
  layoutRateLimit,
  async (req: Request, res: Response) => {
    try {
      const userId = getAuth(req);
      const { roomId } = req.params;
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('Supabase admin not configured');

      // Verify room ownership
      const { data: room, error: roomErr } = await supabase
        .from('stakkd_rooms')
        .select('id')
        .eq('id', roomId)
        .eq('user_id', userId)
        .single();

      if (roomErr || !room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const { data, error } = await supabase
        .from('stakkd_room_layouts')
        .select('id, name, is_active, created_at')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.status(200).json(data || []);
    } catch (err) {
      console.error('GET /api/stakkd-rooms/:roomId/layouts error:', err);
      res.status(500).json({ error: 'Failed to fetch layouts' });
    }
  },
);

// ── GET /api/stakkd-rooms/:roomId/layouts/active ─────────────────────
// Returns the active layout for a room (full data)

router.get(
  '/api/stakkd-rooms/:roomId/layouts/active',
  requireAuthWithUser,
  layoutRateLimit,
  async (req: Request, res: Response) => {
    try {
      const userId = getAuth(req);
      const { roomId } = req.params;
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('Supabase admin not configured');

      const { data, error } = await supabase
        .from('stakkd_room_layouts')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        res.status(404).json({ error: 'No active layout' });
        return;
      }

      res.status(200).json(data);
    } catch (err) {
      console.error('GET /api/stakkd-rooms/:roomId/layouts/active error:', err);
      res.status(500).json({ error: 'Failed to fetch active layout' });
    }
  },
);

// ── POST /api/stakkd-rooms/:roomId/layouts ───────────────────────────
// Creates a new layout. Deactivates existing active layout first.

router.post(
  '/api/stakkd-rooms/:roomId/layouts',
  requireAuthWithUser,
  layoutRateLimit,
  async (req: Request, res: Response) => {
    try {
      const userId = getAuth(req);

      // Enthusiast+ only
      const sub = await requirePlan(userId, 'enthusiast', res);
      if (!sub) return;

      const { roomId } = req.params;
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('Supabase admin not configured');

      // Verify room ownership
      const { data: room, error: roomErr } = await supabase
        .from('stakkd_rooms')
        .select('id')
        .eq('id', roomId)
        .eq('user_id', userId)
        .single();

      if (roomErr || !room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const { name, placements, listening_position, stereo_triangle, tips } = req.body;

      if (!Array.isArray(placements) || !listening_position) {
        res.status(400).json({ error: 'placements (array) and listening_position are required' });
        return;
      }

      // Deactivate any current active layout for this room
      await supabase
        .from('stakkd_room_layouts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('stakkd_room_layouts')
        .insert([{
          room_id: roomId,
          user_id: userId,
          name: (typeof name === 'string' && name.trim()) ? name.trim() : 'Untitled Layout',
          is_active: true,
          placements,
          listening_position,
          stereo_triangle: stereo_triangle ?? null,
          tips: Array.isArray(tips) ? tips : [],
        }])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json(data);
    } catch (err) {
      console.error('POST /api/stakkd-rooms/:roomId/layouts error:', err);
      res.status(500).json({ error: 'Failed to save layout' });
    }
  },
);

// ── PATCH /api/stakkd-rooms/:roomId/layouts/:layoutId ────────────────
// Updates name and/or is_active on a layout

router.patch(
  '/api/stakkd-rooms/:roomId/layouts/:layoutId',
  requireAuthWithUser,
  layoutRateLimit,
  async (req: Request, res: Response) => {
    try {
      const userId = getAuth(req);
      const { roomId, layoutId } = req.params;
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('Supabase admin not configured');

      // Verify ownership
      const { data: existing, error: fetchErr } = await supabase
        .from('stakkd_room_layouts')
        .select('id')
        .eq('id', layoutId)
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (fetchErr || !existing) {
        res.status(404).json({ error: 'Layout not found' });
        return;
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (typeof req.body.name === 'string' && req.body.name.trim()) {
        updates.name = req.body.name.trim();
      }

      if (typeof req.body.is_active === 'boolean') {
        // If activating this layout, deactivate others first
        if (req.body.is_active) {
          await supabase
            .from('stakkd_room_layouts')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('room_id', roomId)
            .eq('user_id', userId)
            .eq('is_active', true)
            .neq('id', layoutId);
        }
        updates.is_active = req.body.is_active;
      }

      if (Object.keys(updates).length === 1) {
        res.status(400).json({ error: 'No updatable fields provided' });
        return;
      }

      const { data, error } = await supabase
        .from('stakkd_room_layouts')
        .update(updates)
        .eq('id', layoutId)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json(data);
    } catch (err) {
      console.error('PATCH /api/stakkd-rooms/:roomId/layouts/:layoutId error:', err);
      res.status(500).json({ error: 'Failed to update layout' });
    }
  },
);

// ── DELETE /api/stakkd-rooms/:roomId/layouts/:layoutId ───────────────
// Deletes a saved layout

router.delete(
  '/api/stakkd-rooms/:roomId/layouts/:layoutId',
  requireAuthWithUser,
  layoutRateLimit,
  async (req: Request, res: Response) => {
    try {
      const userId = getAuth(req);
      const { roomId, layoutId } = req.params;
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('Supabase admin not configured');

      // Verify ownership
      const { data: existing, error: fetchErr } = await supabase
        .from('stakkd_room_layouts')
        .select('id')
        .eq('id', layoutId)
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (fetchErr || !existing) {
        res.status(404).json({ error: 'Layout not found' });
        return;
      }

      const { error } = await supabase
        .from('stakkd_room_layouts')
        .delete()
        .eq('id', layoutId);

      if (error) throw error;

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('DELETE /api/stakkd-rooms/:roomId/layouts/:layoutId error:', err);
      res.status(500).json({ error: 'Failed to delete layout' });
    }
  },
);

export default router;
