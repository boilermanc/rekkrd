import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import type { Request } from 'express';
import {
  getRequestToken,
  getAuthorizeUrl,
  getAccessToken,
  getAuthenticatedIdentity,
} from '../services/discogsOAuth.js';

const LOG_PREFIX = '[discogs-auth]';

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

// ── Temporary request-token store ─────────────────────────────────
// Short-lived in-memory Map. Entries are cleaned up on use or after
// 10 minutes, whichever comes first.

interface PendingToken {
  tokenSecret: string;
  userId: string;
  createdAt: number;
}

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const pendingTokens = new Map<string, PendingToken>();

function cleanExpiredTokens() {
  const now = Date.now();
  pendingTokens.forEach((value, key) => {
    if (now - value.createdAt > TOKEN_TTL_MS) {
      pendingTokens.delete(key);
    }
  });
}

// ── Router ────────────────────────────────────────────────────────

const router = Router();

// POST /api/discogs/auth/request-token
// Starts the OAuth flow — returns an authorizeUrl for the frontend to open.
router.post(
  '/api/discogs/auth/request-token',
  requireAuthWithUser,
  async (req, res) => {
    try {
      const { userId } = (req as Request & { auth: AuthResult }).auth;

      const { token, tokenSecret } = await getRequestToken();

      // Evict stale entries before inserting
      cleanExpiredTokens();

      pendingTokens.set(token, {
        tokenSecret,
        userId,
        createdAt: Date.now(),
      });

      const authorizeUrl = getAuthorizeUrl(token);

      console.log(`${LOG_PREFIX} Request token issued for user ${userId}`);
      res.json({ authorizeUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${LOG_PREFIX} request-token error:`, error);
      res.status(500).json({ error: 'Failed to start Discogs authorization', details: message });
    }
  },
);

// GET /api/discogs/auth/callback
// Discogs redirects the user here after they approve/deny access.
router.get('/api/discogs/auth/callback', async (req, res) => {
  try {
    const oauthToken = req.query.oauth_token as string | undefined;
    const oauthVerifier = req.query.oauth_verifier as string | undefined;

    if (!oauthToken || !oauthVerifier) {
      res.status(400).json({ error: 'Missing oauth_token or oauth_verifier query params' });
      return;
    }

    // Look up the pending request token
    cleanExpiredTokens();
    const pending = pendingTokens.get(oauthToken);

    if (!pending) {
      res.status(400).json({
        error: 'Invalid or expired OAuth request token. Please start the authorization flow again.',
      });
      return;
    }

    const { tokenSecret, userId } = pending;

    // Exchange for permanent access token
    const { accessToken, accessTokenSecret } = await getAccessToken(
      oauthToken,
      tokenSecret,
      oauthVerifier,
    );

    // Fetch the Discogs identity
    const identity = await getAuthenticatedIdentity(accessToken, accessTokenSecret);

    // Store credentials in the user's profile
    const admin = getSupabaseAdmin();
    const { error: updateError } = await admin
      .from('profiles')
      .update({
        discogs_oauth_token: accessToken,
        discogs_oauth_secret: accessTokenSecret,
        discogs_username: identity.username,
        discogs_user_id: identity.id,
        discogs_connected_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error(`${LOG_PREFIX} Failed to save Discogs credentials:`, updateError.message);
      throw new Error(`Failed to save Discogs credentials: ${updateError.message}`);
    }

    // Clean up the pending token
    pendingTokens.delete(oauthToken);

    console.log(`${LOG_PREFIX} User ${userId} connected Discogs account: ${identity.username}`);

    // Redirect to the frontend with a success indicator
    const frontendUrl = process.env.ALLOWED_ORIGINS?.split(',')[0]?.trim() || '/';
    const redirectUrl = frontendUrl === '/' ? '/?discogs=connected' : `${frontendUrl}/?discogs=connected`;
    res.redirect(302, redirectUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${LOG_PREFIX} callback error:`, error);
    res.status(500).json({ error: 'Failed to complete Discogs authorization', details: message });
  }
});

// POST /api/discogs/auth/disconnect
// Clears Discogs OAuth credentials from the user's profile.
router.post(
  '/api/discogs/auth/disconnect',
  requireAuthWithUser,
  async (req, res) => {
    try {
      const { userId } = (req as Request & { auth: AuthResult }).auth;

      const admin = getSupabaseAdmin();
      const { error: updateError } = await admin
        .from('profiles')
        .update({
          discogs_oauth_token: null,
          discogs_oauth_secret: null,
          discogs_username: null,
          discogs_user_id: null,
          discogs_connected_at: null,
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to clear Discogs credentials: ${updateError.message}`);
      }

      console.log(`${LOG_PREFIX} User ${userId} disconnected Discogs account`);
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${LOG_PREFIX} disconnect error:`, error);
      res.status(500).json({ error: 'Failed to disconnect Discogs account', details: message });
    }
  },
);

export default router;
