import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { makeAuthenticatedRequest } from '../services/discogsOAuth.js';
import type { Request } from 'express';

const LOG_PREFIX = '[discogs-wantlist]';

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

// ── Router ────────────────────────────────────────────────────────

const router = Router();

router.get(
  '/api/discogs-wantlist',
  requireAuthWithUser,
  async (req, res) => {
    const { userId } = (req as Request & { auth: AuthResult }).auth;

    try {
      // Parse & clamp query params
      let page = 1;
      if (req.query.page && typeof req.query.page === 'string') {
        const parsed = parseInt(req.query.page, 10);
        if (Number.isFinite(parsed) && parsed >= 1) page = parsed;
      }

      let perPage = 50;
      if (req.query.per_page && typeof req.query.per_page === 'string') {
        const parsed = parseInt(req.query.per_page, 10);
        if (Number.isFinite(parsed)) perPage = Math.max(1, Math.min(100, parsed));
      }

      // Fetch user's Discogs credentials from profiles
      const admin = getSupabaseAdmin();
      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('discogs_oauth_token, discogs_oauth_secret, discogs_username')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error(`${LOG_PREFIX} Failed to fetch profile:`, profileError.message);
        res.status(500).json({ error: 'Failed to fetch user profile' });
        return;
      }

      const accessToken = profile?.discogs_oauth_token as string | null;
      const accessTokenSecret = profile?.discogs_oauth_secret as string | null;
      const username = profile?.discogs_username as string | null;

      if (!accessToken || !accessTokenSecret || !username) {
        res.status(401).json({ error: 'Discogs account not connected' });
        return;
      }

      // Fetch wantlist from Discogs using the shared OAuth helper
      const url =
        `https://api.discogs.com/users/${encodeURIComponent(username)}/wants` +
        `?page=${page}&per_page=${perPage}&sort=artist&sort_order=asc`;

      const data = await makeAuthenticatedRequest<{ wants: unknown; pagination: unknown }>(
        url,
        accessToken,
        accessTokenSecret,
      );

      res.status(200).json({ wants: data.wants, pagination: data.pagination });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${LOG_PREFIX} Error:`, error);
      res.status(500).json({ error: 'Failed to fetch Discogs wantlist', details: message });
    }
  },
);

export default router;
