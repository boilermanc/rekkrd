import { Router, type Request, type Response } from 'express';
import { Type } from '@google/genai';
import { requireAuthWithUser } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { requirePlan } from '../lib/subscription.js';
import { ai } from '../lib/gemini.js';
import { retryWithBackoff } from '../utils/retry.js';
import { withTimeout } from '../utils/timeout.js';
import { getAuth } from '../utils/getAuth.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

const router = Router();
const placementRateLimit = createRateLimit(10, 60);

const GEMINI_TIMEOUT_MS = 90_000;

// ── Helpers ──────────────────────────────────────────────────────────

interface RoomFeatureRow {
  feature_type: string;
  wall: string;
  position_pct: number;
  width_ft: number;
  notes: string | null;
}

interface GearRow {
  id: string;
  category: string;
  brand: string;
  model: string;
}

const WALL_ORDER: string[] = ['north', 'east', 'south', 'west'];

function buildFeaturesDescription(features: RoomFeatureRow[]): string {
  if (!features || features.length === 0) return 'No features (plain rectangular room).';

  const byWall: Record<string, RoomFeatureRow[]> = {};
  for (const wall of WALL_ORDER) byWall[wall] = [];
  for (const f of features) {
    if (byWall[f.wall]) byWall[f.wall].push(f);
  }

  return WALL_ORDER.map(wall => {
    const items = byWall[wall];
    if (items.length === 0) return `${wall.charAt(0).toUpperCase() + wall.slice(1)} wall: none.`;
    const desc = items
      .map(f => `${f.feature_type} at ${f.position_pct}% (${f.width_ft}ft wide)`)
      .join(', ');
    return `${wall.charAt(0).toUpperCase() + wall.slice(1)} wall: ${desc}.`;
  }).join(' ');
}

function buildGearList(gear: GearRow[]): string {
  return gear
    .map(g => `- [${g.id}] ${g.category}: ${g.brand} ${g.model}`)
    .join('\n');
}

// ── POST /api/stakkd-rooms/:id/placement ────────────────────────────

router.post(
  '/api/stakkd-rooms/:id/placement',
  requireAuthWithUser,
  placementRateLimit,
  async (req: Request, res: Response) => {
    try {
      const userId = getAuth(req);

      // Enthusiast+ only
      const sub = await requirePlan(userId, 'enthusiast', res);
      if (!sub) return;

      const { id } = req.params;
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('Supabase admin not configured');

      // 1. Fetch room with features (verify ownership)
      const { data: roomData, error: roomError } = await supabase
        .from('stakkd_rooms')
        .select('*, stakkd_room_features(*)')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (roomError || !roomData) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const { stakkd_room_features: features, ...room } = roomData as Record<string, unknown>;

      // 2. Fetch user's gear
      const { data: gearData, error: gearError } = await supabase
        .from('gear')
        .select('id, category, brand, model')
        .eq('user_id', userId)
        .order('position', { ascending: true });

      if (gearError) throw gearError;

      const gear = (gearData || []) as GearRow[];

      if (gear.length === 0) {
        res.status(400).json({ error: 'Add some gear to Stakkd first to get placement recommendations' });
        return;
      }

      // 3. Build prompt
      const featuresDescription = buildFeaturesDescription((features || []) as RoomFeatureRow[]);
      const gearList = buildGearList(gear);

      const prompt = `You are an expert audio room setup consultant. Given a room's dimensions, features, and a list of audio/vinyl gear, recommend the optimal placement for each piece of equipment.

ROOM:
- Name: ${room.name}
- Dimensions: ${room.width_ft}ft wide × ${room.length_ft}ft long × ${room.height_ft}ft ceiling
- Shape: ${room.shape}
- Floor type: ${room.floor_type}
- Listening position preference: ${room.listening_position}
- Room features: ${featuresDescription}

GEAR TO PLACE:
${gearList}

RULES:
- Place speakers to form an equilateral triangle with the listening position when possible
- Keep turntables away from speakers and subwoofers to prevent vibration feedback
- Consider door swings and window reflections for speaker placement
- Account for cable run distances between connected components
- Subwoofers work best in corners or along walls (boundary reinforcement)
- Avoid placing sensitive electronics in direct sunlight (near windows)
- Consider the floor type for vibration isolation recommendations

Where x_pct (0-100) is the position across the room width (0=west wall, 100=east wall) and y_pct (0-100) is the position along the room length (0=north wall, 100=south wall). "facing" is the direction the gear faces (north/south/east/west).

If there are no speakers in the gear list, set stereo_triangle to null.

Each gear item MUST appear exactly once in the placements array. Use the exact gear_id values from the list above.`;

      // 4. Call Gemini
      const response = await withTimeout(
        retryWithBackoff(() =>
          ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  placements: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        gear_id: { type: Type.STRING },
                        gear_name: { type: Type.STRING },
                        x_pct: { type: Type.NUMBER },
                        y_pct: { type: Type.NUMBER },
                        facing: { type: Type.STRING },
                        notes: { type: Type.STRING },
                      },
                      required: ['gear_id', 'gear_name', 'x_pct', 'y_pct', 'facing', 'notes'],
                    },
                  },
                  listening_position: {
                    type: Type.OBJECT,
                    properties: {
                      x_pct: { type: Type.NUMBER },
                      y_pct: { type: Type.NUMBER },
                      notes: { type: Type.STRING },
                    },
                    required: ['x_pct', 'y_pct', 'notes'],
                  },
                  stereo_triangle: {
                    type: Type.OBJECT,
                    nullable: true,
                    properties: {
                      left_speaker_id: { type: Type.STRING },
                      right_speaker_id: { type: Type.STRING },
                      angle_degrees: { type: Type.NUMBER },
                      notes: { type: Type.STRING },
                    },
                    required: ['left_speaker_id', 'right_speaker_id', 'angle_degrees', 'notes'],
                  },
                  tips: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['placements', 'listening_position', 'tips'],
              },
            },
          })
        ),
        GEMINI_TIMEOUT_MS,
      );

      // 5. Parse response
      let parsed: unknown;
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch {
        console.error('[placement] Gemini returned invalid JSON:', response.text?.slice(0, 500));
        res.status(502).json({ error: 'AI placement engine returned an invalid response. Try again.' });
        return;
      }

      const result = parsed as Record<string, unknown>;

      // Basic validation
      if (!Array.isArray(result.placements) || !result.listening_position) {
        console.error('[placement] Gemini response missing required fields:', JSON.stringify(result).slice(0, 500));
        res.status(502).json({ error: 'AI placement engine returned an invalid response. Try again.' });
        return;
      }

      res.status(200).json({
        placements: result.placements,
        listening_position: result.listening_position,
        stereo_triangle: result.stereo_triangle ?? null,
        tips: Array.isArray(result.tips) ? result.tips : [],
      });
    } catch (err) {
      console.error('POST /api/stakkd-rooms/:id/placement error:', err);

      if (err instanceof Error && err.message.includes('timed out')) {
        res.status(504).json({ error: 'AI placement request timed out. Try again.' });
        return;
      }

      res.status(500).json({ error: 'Failed to generate placement recommendations' });
    }
  },
);

export default router;
