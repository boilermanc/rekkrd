import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { requireSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { errorResponse } from '../utils/errorResponse.js';

const router = Router();

function getAuth(req: Request): AuthResult {
  return (req as Request & { auth: AuthResult }).auth;
}

// ── POST /api/sellr/import/preview ────────────────────────────────────
// Shows what would be imported before committing.
router.post(
  '/api/sellr/import/preview',
  requireAuthWithUser,
  async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    const { session_id } = req.body ?? {};

    if (!session_id) {
      errorResponse(res, 400, 'session_id is required', 'MISSING_SESSION_ID');
      return;
    }

    try {
      const supabase = requireSupabaseAdmin();

      // Fetch the session
      const { data: session, error: sessionErr } = await supabase
        .from('sellr_sessions')
        .select('*')
        .eq('id', session_id)
        .single();

      if (sessionErr || !session) {
        errorResponse(res, 404, 'Session not found', 'SESSION_NOT_FOUND');
        return;
      }

      // Fetch all sellr_records for the session
      const { data: records, error: recordsErr } = await supabase
        .from('sellr_records')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true });

      if (recordsErr) {
        console.error('[sellr-import] Failed to fetch records:', recordsErr.message);
        errorResponse(res, 500, 'Failed to fetch records', 'RECORDS_FETCH_FAILED');
        return;
      }

      const sellrRecords = records ?? [];

      // Fetch user's existing albums for duplicate detection
      const { data: existingAlbums, error: albumsErr } = await supabase
        .from('albums')
        .select('id, discogs_release_id, title, artist')
        .eq('user_id', userId);

      if (albumsErr) {
        console.error('[sellr-import] Failed to fetch albums:', albumsErr.message);
        errorResponse(res, 500, 'Failed to fetch existing albums', 'ALBUMS_FETCH_FAILED');
        return;
      }

      const albums = existingAlbums ?? [];

      // Build lookup structures
      const byDiscogsId = new Map<number, (typeof albums)[number]>();
      for (const album of albums) {
        if (album.discogs_release_id != null) {
          byDiscogsId.set(album.discogs_release_id, album);
        }
      }

      const byTitleArtist = new Map<string, (typeof albums)[number]>();
      for (const album of albums) {
        const key = `${(album.title ?? '').toLowerCase()}|||${(album.artist ?? '').toLowerCase()}`;
        byTitleArtist.set(key, album);
      }

      // Classify each record
      const to_import: typeof sellrRecords = [];
      const duplicates: Array<{ sellr_record: (typeof sellrRecords)[number]; existing_album: (typeof albums)[number] }> = [];

      for (const record of sellrRecords) {
        // Check exact match by discogs_id first
        const discogsNum = record.discogs_id ? Number(record.discogs_id) : null;
        if (discogsNum && byDiscogsId.has(discogsNum)) {
          duplicates.push({ sellr_record: record, existing_album: byDiscogsId.get(discogsNum)! });
          continue;
        }

        // Check fuzzy match by title + artist (case-insensitive)
        const fuzzyKey = `${(record.title ?? '').toLowerCase()}|||${(record.artist ?? '').toLowerCase()}`;
        if (byTitleArtist.has(fuzzyKey)) {
          duplicates.push({ sellr_record: record, existing_album: byTitleArtist.get(fuzzyKey)! });
          continue;
        }

        // No match — new record
        to_import.push(record);
      }

      res.json({
        total: sellrRecords.length,
        to_import,
        duplicates,
        session,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[sellr-import] Preview error:', message);
      errorResponse(res, 500, 'Internal server error', 'INTERNAL_ERROR');
    }
  },
);

// ── POST /api/sellr/import/commit ─────────────────────────────────────
// Performs the actual import into the user's Rekkrd collection.
router.post(
  '/api/sellr/import/commit',
  requireAuthWithUser,
  async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    const { session_id, skip_duplicate_ids } = req.body ?? {};

    if (!session_id) {
      errorResponse(res, 400, 'session_id is required', 'MISSING_SESSION_ID');
      return;
    }

    const skipSet = new Set<string>(Array.isArray(skip_duplicate_ids) ? skip_duplicate_ids : []);

    try {
      const supabase = requireSupabaseAdmin();

      // Verify session exists
      const { data: session, error: sessionErr } = await supabase
        .from('sellr_sessions')
        .select('*')
        .eq('id', session_id)
        .single();

      if (sessionErr || !session) {
        errorResponse(res, 404, 'Session not found', 'SESSION_NOT_FOUND');
        return;
      }

      // Fetch all sellr_records for the session
      const { data: records, error: recordsErr } = await supabase
        .from('sellr_records')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true });

      if (recordsErr) {
        console.error('[sellr-import] Failed to fetch records:', recordsErr.message);
        errorResponse(res, 500, 'Failed to fetch records', 'RECORDS_FETCH_FAILED');
        return;
      }

      // Filter out skipped duplicates
      const toImport = (records ?? []).filter(r => !skipSet.has(r.id));

      let imported = 0;
      let failed = 0;
      const album_ids: string[] = [];

      for (const record of toImport) {
        try {
          // Build album row matching the same shape as supabaseService.saveAlbum
          const notes: string[] = [];
          if (record.label) notes.push(`Label: ${record.label}`);

          const albumRow: Record<string, unknown> = {
            user_id: userId,
            title: record.title,
            artist: record.artist,
            year: record.year != null ? String(record.year) : null,
            cover_url: record.cover_image ?? '',
            condition: record.condition ?? null,
            personal_notes: notes.length > 0 ? notes.join('\n') : null,
            discogs_release_id: record.discogs_id ? Number(record.discogs_id) : null,
            price_low: record.price_low ?? null,
            price_median: record.price_median ?? null,
            price_high: record.price_high ?? null,
            play_count: 0,
          };

          const { data: newAlbum, error: insertErr } = await supabase
            .from('albums')
            .insert([albumRow])
            .select('id')
            .single();

          if (insertErr || !newAlbum) {
            console.error('[sellr-import] Failed to insert album:', insertErr?.message, record.title);
            failed++;
            continue;
          }

          album_ids.push(newAlbum.id);
          imported++;
        } catch (insertCatch) {
          console.error('[sellr-import] Album insert threw:', (insertCatch as Error).message, record.title);
          failed++;
        }
      }

      // Mark session as imported
      const { error: flagErr } = await supabase
        .from('sellr_sessions')
        .update({ imported_to_rekkrd: true, imported_at: new Date().toISOString() })
        .eq('id', session_id);

      if (flagErr) {
        console.error('[sellr-import] Failed to flag session:', flagErr.message);
        // Non-fatal — albums are already inserted
      }

      res.json({
        imported,
        skipped: skipSet.size,
        failed,
        album_ids,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[sellr-import] Commit error:', message);
      errorResponse(res, 500, 'Internal server error', 'INTERNAL_ERROR');
    }
  },
);

export default router;
