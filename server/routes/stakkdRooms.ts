import { Router, type Request, type Response } from 'express';
import { requireAuthWithUser } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { requirePlan } from '../lib/subscription.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { getAuth } from '../utils/getAuth.js';

const router = Router();
const roomRateLimit = createRateLimit(30, 60);

const UPDATABLE_FIELDS = [
  'name', 'width_ft', 'length_ft', 'height_ft',
  'shape', 'floor_type', 'listening_position', 'notes',
] as const;

const VALID_SHAPES = ['rectangular', 'l_shaped', 'open_concept'];
const VALID_FLOOR_TYPES = ['hardwood', 'carpet', 'tile', 'concrete', 'mixed'];
const VALID_LISTENING_POSITIONS = ['centered', 'desk', 'couch', 'near_wall'];

// ── GET /api/stakkd-rooms ────────────────────────────────────────────
// Returns all rooms for the authenticated user with feature counts

router.get('/api/stakkd-rooms', requireAuthWithUser, roomRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');

    const { data, error } = await supabase
      .from('stakkd_rooms')
      .select('*, stakkd_room_features(count)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten the count from the nested aggregate
    const rooms = (data || []).map((room: Record<string, unknown>) => {
      const features = room.stakkd_room_features as { count: number }[] | undefined;
      const feature_count = features?.[0]?.count ?? 0;
      const { stakkd_room_features: _, ...rest } = room;
      return { ...rest, feature_count };
    });

    res.status(200).json(rooms);
  } catch (err) {
    console.error('GET /api/stakkd-rooms error:', err);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// ── POST /api/stakkd-rooms ───────────────────────────────────────────
// Creates a new room

router.post('/api/stakkd-rooms', requireAuthWithUser, roomRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);

    // Enthusiast+ only
    const sub = await requirePlan(userId, 'enthusiast', res);
    if (!sub) return;

    const { name, width_ft, length_ft } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'name is required and must be a non-empty string' });
      return;
    }

    if (typeof width_ft !== 'number' || width_ft <= 0 || width_ft > 100) {
      res.status(400).json({ error: 'width_ft must be a number > 0 and <= 100' });
      return;
    }
    if (typeof length_ft !== 'number' || length_ft <= 0 || length_ft > 100) {
      res.status(400).json({ error: 'length_ft must be a number > 0 and <= 100' });
      return;
    }

    // Validate optional enums if provided
    if (req.body.shape && !VALID_SHAPES.includes(req.body.shape)) {
      res.status(400).json({ error: `shape must be one of: ${VALID_SHAPES.join(', ')}` });
      return;
    }
    if (req.body.floor_type && !VALID_FLOOR_TYPES.includes(req.body.floor_type)) {
      res.status(400).json({ error: `floor_type must be one of: ${VALID_FLOOR_TYPES.join(', ')}` });
      return;
    }
    if (req.body.listening_position && !VALID_LISTENING_POSITIONS.includes(req.body.listening_position)) {
      res.status(400).json({ error: `listening_position must be one of: ${VALID_LISTENING_POSITIONS.join(', ')}` });
      return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');

    const insertData: Record<string, unknown> = { user_id: userId };
    for (const key of UPDATABLE_FIELDS) {
      if (key in req.body) {
        insertData[key] = req.body[key];
      }
    }

    const { data, error } = await supabase
      .from('stakkd_rooms')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/stakkd-rooms error:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// ── GET /api/stakkd-rooms/:id ────────────────────────────────────────
// Returns a single room with its features array

router.get('/api/stakkd-rooms/:id', requireAuthWithUser, roomRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');

    const { data, error } = await supabase
      .from('stakkd_rooms')
      .select('*, stakkd_room_features(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    // Rename nested relation to 'features' for cleaner API response
    const { stakkd_room_features, ...room } = data as Record<string, unknown>;
    res.status(200).json({ ...room, features: stakkd_room_features || [] });
  } catch (err) {
    console.error('GET /api/stakkd-rooms/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// ── PATCH /api/stakkd-rooms/:id ──────────────────────────────────────
// Updates allowed fields on a room

router.patch('/api/stakkd-rooms/:id', requireAuthWithUser, roomRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('stakkd_rooms')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    // Validate enums if provided
    if (req.body.shape && !VALID_SHAPES.includes(req.body.shape)) {
      res.status(400).json({ error: `shape must be one of: ${VALID_SHAPES.join(', ')}` });
      return;
    }
    if (req.body.floor_type && !VALID_FLOOR_TYPES.includes(req.body.floor_type)) {
      res.status(400).json({ error: `floor_type must be one of: ${VALID_FLOOR_TYPES.join(', ')}` });
      return;
    }
    if (req.body.listening_position && !VALID_LISTENING_POSITIONS.includes(req.body.listening_position)) {
      res.status(400).json({ error: `listening_position must be one of: ${VALID_LISTENING_POSITIONS.join(', ')}` });
      return;
    }

    // Validate dimension fields if provided
    if ('width_ft' in req.body && (typeof req.body.width_ft !== 'number' || req.body.width_ft <= 0 || req.body.width_ft > 100)) {
      res.status(400).json({ error: 'width_ft must be a number > 0 and <= 100' });
      return;
    }
    if ('length_ft' in req.body && (typeof req.body.length_ft !== 'number' || req.body.length_ft <= 0 || req.body.length_ft > 100)) {
      res.status(400).json({ error: 'length_ft must be a number > 0 and <= 100' });
      return;
    }

    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of UPDATABLE_FIELDS) {
      if (key in req.body) {
        dbUpdates[key] = req.body[key];
      }
    }

    if (Object.keys(dbUpdates).length === 1) {
      // Only updated_at — no real changes
      res.status(400).json({ error: 'No updatable fields provided' });
      return;
    }

    const { data, error } = await supabase
      .from('stakkd_rooms')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error('PATCH /api/stakkd-rooms/:id error:', err);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// ── DELETE /api/stakkd-rooms/:id ─────────────────────────────────────
// Deletes a room (features cascade via FK)

router.delete('/api/stakkd-rooms/:id', requireAuthWithUser, roomRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('stakkd_rooms')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const { error } = await supabase
      .from('stakkd_rooms')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('DELETE /api/stakkd-rooms/:id error:', err);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

export default router;
