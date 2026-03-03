import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

const router = Router();



// ── Helpers ──────────────────────────────────────────────────────────

function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

function collectStoragePaths(urls: (string | null | undefined)[], bucket: string): string[] {
  const paths: string[] = [];
  for (const url of urls) {
    if (!url) continue;
    const path = extractStoragePath(url, bucket);
    if (path) paths.push(path);
  }
  return paths;
}

// ── POST /api/account/delete ─────────────────────────────────────────
// Self-service account deletion. Deletes all user data and auth record.
router.post(
  '/api/account/delete',
  requireAuthWithUser,
  async (req, res) => {
    const { userId } = (req as typeof req & { auth: AuthResult }).auth;

    if (userId === '__legacy__') {
      res.status(400).json({ error: 'Cannot delete account with legacy auth' });
      return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) { res.status(500).json({ error: 'Server not configured' }); return; }

    try {
      // Verify user exists
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Prevent admin self-deletion via this endpoint
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profile?.role === 'admin') {
        res.status(403).json({ error: 'Admin accounts cannot be deleted via self-service' });
        return;
      }

      // Step 1: Gather storage URLs before deleting DB rows
      const { data: albums } = await supabase
        .from('albums')
        .select('id, original_photo_url, cover_url')
        .eq('user_id', userId);

      const albumPhotoPaths = collectStoragePaths(
        (albums || []).flatMap((a: Record<string, unknown>) => [a.original_photo_url as string, a.cover_url as string]),
        'album-photos',
      );

      const { data: gear } = await supabase
        .from('gear')
        .select('id, image_url, original_photo_url, manual_pdf_url')
        .eq('user_id', userId);

      const gearPhotoPaths = collectStoragePaths(
        (gear || []).flatMap((g: Record<string, unknown>) => [g.image_url as string, g.original_photo_url as string]),
        'gear-photos',
      );
      const gearManualPaths = collectStoragePaths(
        (gear || []).map((g: Record<string, unknown>) => g.manual_pdf_url as string),
        'gear-manuals',
      );

      // Step 2: Delete storage files
      const deleteFromBucket = async (bucket: string, paths: string[]) => {
        if (paths.length === 0) return;
        const { error } = await supabase.storage.from(bucket).remove(paths);
        if (error) {
          console.error(`[account] Storage delete error (${bucket}):`, error.message);
        }
      };

      await deleteFromBucket('album-photos', albumPhotoPaths);
      await deleteFromBucket('gear-photos', gearPhotoPaths);
      await deleteFromBucket('gear-manuals', gearManualPaths);

      // Step 3: Delete database rows (order respects FK constraints)
      await supabase.from('wantlist').delete().eq('user_id', userId);
      await supabase.from('albums').delete().eq('user_id', userId);
      await supabase.from('gear').delete().eq('user_id', userId);
      await supabase.from('subscriptions').delete().eq('user_id', userId);
      await supabase.from('discogs_value_history').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);

      // Step 4: Delete auth user
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteAuthError) {
        console.error('[account] Failed to delete auth user:', deleteAuthError.message);
        res.status(500).json({ error: 'Data deleted but failed to remove auth record. Please contact support.' });
        return;
      }

      console.log(`[account] User ${userId} (${user.email}) self-deleted their account`);
      res.status(200).json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[account] Delete account error:', message);
      res.status(500).json({ error: message });
    }
  },
);

export default router;
