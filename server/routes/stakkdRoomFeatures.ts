import { Router, type Request, type Response } from 'express';
import { requireAuthWithUser } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { requirePlan } from '../lib/subscription.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { getAuth } from '../utils/getAuth.js';

const router = Router();
const featureRateLimit = createRateLimit(30, 60);

const VALID_FEATURE_TYPES = ['door', 'window', 'closet', 'fireplace', 'stairs', 'opening'];
const VALID_WALLS = ['north', 'south', 'east', 'west'];

// ── POST /api/stakkd-room-features ───────────────────────────────────
// Creates a new room feature after verifying room ownership

router.post('/api/stakkd-room-features', requireAuthWithUser, featureRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);

    // Enthusiast+ only
    const sub = await requirePlan(userId, 'enthusiast', res);
    if (!sub) return;

    const { room_id, feature_type, wall, position_pct } = req.body;

    // Validate required fields
    if (!room_id || typeof room_id !== 'string') {
      res.status(400).json({ error: 'room_id is required' });
      return;
    }
    if (!feature_type || !VALID_FEATURE_TYPES.includes(feature_type)) {
      res.status(400).json({ error: `feature_type must be one of: ${VALID_FEATURE_TYPES.join(', ')}` });
      return;
    }
    if (!wall || !VALID_WALLS.includes(wall)) {
      res.status(400).json({ error: `wall must be one of: ${VALID_WALLS.join(', ')}` });
      return;
    }
    if (typeof position_pct !== 'number' || position_pct < 0 || position_pct > 100) {
      res.status(400).json({ error: 'position_pct must be a number between 0 and 100' });
      return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');

    // Verify room belongs to user
    const { data: room, error: roomError } = await supabase
      .from('stakkd_rooms')
      .select('id')
      .eq('id', room_id)
      .eq('user_id', userId)
      .single();

    if (roomError || !room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const insertData: Record<string, unknown> = {
      room_id,
      feature_type,
      wall,
      position_pct,
    };
    if (req.body.width_ft !== undefined) insertData.width_ft = req.body.width_ft;
    if (req.body.notes !== undefined) insertData.notes = req.body.notes;

    const { data, error } = await supabase
      .from('stakkd_room_features')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/stakkd-room-features error:', err);
    res.status(500).json({ error: 'Failed to create room feature' });
  }
});

// ── DELETE /api/stakkd-room-features/:id ─────────────────────────────
// Deletes a feature after verifying the parent room belongs to the user

router.delete('/api/stakkd-room-features/:id', requireAuthWithUser, featureRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = getAuth(req);
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');

    // Fetch the feature and verify its room belongs to the user
    const { data: feature, error: fetchError } = await supabase
      .from('stakkd_room_features')
      .select('id, room_id')
      .eq('id', id)
      .single();

    if (fetchError || !feature) {
      res.status(404).json({ error: 'Feature not found' });
      return;
    }

    const { data: room, error: roomError } = await supabase
      .from('stakkd_rooms')
      .select('id')
      .eq('id', (feature as { room_id: string }).room_id)
      .eq('user_id', userId)
      .single();

    if (roomError || !room) {
      res.status(404).json({ error: 'Feature not found' });
      return;
    }

    const { error } = await supabase
      .from('stakkd_room_features')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('DELETE /api/stakkd-room-features/:id error:', err);
    res.status(500).json({ error: 'Failed to delete room feature' });
  }
});

export default router;
