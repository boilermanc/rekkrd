import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import type { Request } from 'express';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

const LOG_PREFIX = '[discogs-import]';
const MAX_RELEASES = 500;

// Strip Discogs artist disambiguation suffix, e.g. "Phil Collins (2)" → "Phil Collins"
const DISCOGS_ARTIST_SUFFIX = / \(\d+\)$/;





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

// ── Router ────────────────────────────────────────────────────────

const router = Router();

router.post(
  '/api/discogs-import',
  requireAuthWithUser,
  async (req, res) => {
    const { userId } = (req as Request & { auth: AuthResult }).auth;

    try {
      const { releases } = req.body as { releases?: DiscogsRelease[] };

      if (!Array.isArray(releases) || releases.length === 0) {
        res.status(400).json({ error: 'Request body must include a non-empty releases array' });
        return;
      }

      if (releases.length > MAX_RELEASES) {
        res.status(400).json({ error: `Maximum ${MAX_RELEASES} releases per request (received ${releases.length})` });
        return;
      }

      const admin = getSupabaseAdmin();
      if (!admin) throw new Error('Supabase admin not configured');

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
          res.status(500).json({ error: 'Failed to check for existing albums' });
          return;
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
          .select('id')
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

      res.status(200).json({ imported, skipped, errors });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${LOG_PREFIX} Error:`, error);
      res.status(500).json({ error: 'Failed to import Discogs collection', details: message });
    }
  },
);

export default router;
