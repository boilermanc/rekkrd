import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser } from './_auth';
import { cors } from './_cors';

const LOG_PREFIX = '[discogs-import]';
const MAX_RELEASES = 500;

// Strip Discogs artist disambiguation suffix, e.g. "Phil Collins (2)" → "Phil Collins"
const DISCOGS_ARTIST_SUFFIX = / \(\d+\)$/;

// ── Supabase admin client ─────────────────────────────────────────

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error(`${LOG_PREFIX} SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured`);
  _supabaseAdmin = createClient(url, key);
  return _supabaseAdmin;
}

// ── Types ─────────────────────────────────────────────────────────

interface DiscogsBasicInformation {
  id: number;
  title: string;
  year?: number;
  artists?: { name: string }[];
  genres?: string[];
  styles?: string[];
  cover_image?: string;
}

interface DiscogsRelease {
  basic_information: DiscogsBasicInformation;
}

// ── Handler ───────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res, 'POST')) return;
  const auth = await requireAuthWithUser(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { releases } = req.body as { releases?: DiscogsRelease[] };

    if (!Array.isArray(releases) || releases.length === 0) {
      return res.status(400).json({ error: 'Request body must include a non-empty releases array' });
    }

    if (releases.length > MAX_RELEASES) {
      return res.status(400).json({ error: `Maximum ${MAX_RELEASES} releases per request (received ${releases.length})` });
    }

    const admin = getSupabaseAdmin();
    const userId = auth.userId;

    // Collect all Discogs release IDs from the incoming batch
    const incomingIds = releases
      .map(r => r.basic_information?.id)
      .filter((id): id is number => typeof id === 'number');

    // Query existing discogs_release_id values for this user to skip duplicates
    let existingIds = new Set<number>();
    if (incomingIds.length > 0) {
      const { data: existing, error: queryError } = await admin
        .from('albums')
        .select('discogs_release_id')
        .eq('user_id', userId)
        .in('discogs_release_id', incomingIds);

      if (queryError) {
        console.error(`${LOG_PREFIX} Failed to check existing albums:`, queryError.message);
        return res.status(500).json({ error: 'Failed to check for existing albums' });
      }

      existingIds = new Set(
        (existing || [])
          .map(row => row.discogs_release_id as number)
          .filter(id => id != null)
      );
    }

    // Map releases to album rows, skipping already-imported ones
    const errors: string[] = [];
    const rows: Record<string, unknown>[] = [];
    let skipped = 0;

    for (const release of releases) {
      const info = release.basic_information;
      if (!info || typeof info.id !== 'number') {
        errors.push('Release missing basic_information or id');
        continue;
      }

      if (existingIds.has(info.id)) {
        skipped++;
        continue;
      }

      const artistRaw = info.artists?.[0]?.name || 'Unknown Artist';
      const artist = artistRaw.replace(DISCOGS_ARTIST_SUFFIX, '');

      rows.push({
        user_id: userId,
        artist,
        title: info.title || 'Unknown Title',
        year: info.year ? String(info.year) : null,
        genre: info.genres?.[0] || null,
        tags: info.styles || [],
        cover_url: info.cover_image || null,
        discogs_url: `https://www.discogs.com/release/${info.id}`,
        discogs_release_id: info.id,
      });
    }

    // Bulk insert
    let imported = 0;
    if (rows.length > 0) {
      const { error: insertError, count } = await admin
        .from('albums')
        .insert(rows, { count: 'exact', defaultToNull: true })
        .select('id')  // minimal return — just need count confirmation
        .then(result => ({
          error: result.error,
          count: result.data?.length ?? 0,
        }));

      if (insertError) {
        console.error(`${LOG_PREFIX} Insert error:`, insertError.message);
        errors.push(`Database insert failed: ${insertError.message}`);
      } else {
        imported = count;
      }
    }

    console.log(`${LOG_PREFIX} User ${userId}: imported=${imported}, skipped=${skipped}, errors=${errors.length}`);

    return res.status(200).json({ imported, skipped, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${LOG_PREFIX} Error:`, error);
    return res.status(500).json({ error: 'Failed to import Discogs collection', details: message });
  }
}
