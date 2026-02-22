import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedIdentity } from '../services/discogsOAuth.js';
import type { AuthResult } from './auth.js';

const LOG_PREFIX = '[discogs-auth-mw]';

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

export interface DiscogsAuthResult {
  accessToken: string;
  accessTokenSecret: string;
  username: string;
  discogsUserId: number;
}

// ── Error classes ─────────────────────────────────────────────────

class DiscogsNotConnectedError extends Error {
  constructor() {
    super('Discogs account not connected');
    this.name = 'DiscogsNotConnectedError';
  }
}

class DiscogsTokenExpiredError extends Error {
  constructor() {
    super('Discogs authorization expired. Please reconnect your account.');
    this.name = 'DiscogsTokenExpiredError';
  }
}

// ── Token validation ──────────────────────────────────────────────

export async function validateDiscogsTokens(userId: string): Promise<DiscogsAuthResult> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('profiles')
    .select('discogs_oauth_token, discogs_oauth_secret, discogs_username, discogs_user_id')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`${LOG_PREFIX} Failed to fetch profile: ${error.message}`);
  }

  const accessToken = data?.discogs_oauth_token as string | null;
  const accessTokenSecret = data?.discogs_oauth_secret as string | null;

  if (!accessToken || !accessTokenSecret) {
    throw new DiscogsNotConnectedError();
  }

  // Verify tokens are still valid with Discogs
  try {
    const identity = await getAuthenticatedIdentity(accessToken, accessTokenSecret);

    return {
      accessToken,
      accessTokenSecret,
      username: identity.username,
      discogsUserId: identity.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '';

    // 401 means Discogs revoked or the tokens expired
    if (message.includes(' 401 ')) {
      console.warn(`${LOG_PREFIX} Discogs tokens expired for user ${userId}, clearing credentials`);

      await admin
        .from('profiles')
        .update({
          discogs_oauth_token: null,
          discogs_oauth_secret: null,
          discogs_username: null,
          discogs_user_id: null,
          discogs_connected_at: null,
        })
        .eq('id', userId);

      throw new DiscogsTokenExpiredError();
    }

    throw err;
  }
}

// ── Express middleware ────────────────────────────────────────────

/**
 * Middleware that validates a user's Discogs OAuth tokens.
 * Must be used after requireAuthWithUser (expects req.auth to be set).
 * On success, attaches Discogs credentials to req.discogs.
 */
export async function requireDiscogsAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { userId } = (req as Request & { auth: AuthResult }).auth;

  try {
    const discogs = await validateDiscogsTokens(userId);
    (req as Request & { auth: AuthResult; discogs: DiscogsAuthResult }).discogs = discogs;
    next();
  } catch (err) {
    if (err instanceof DiscogsNotConnectedError) {
      res.status(403).json({
        error: err.message,
        code: 'DISCOGS_NOT_CONNECTED',
      });
      return;
    }

    if (err instanceof DiscogsTokenExpiredError) {
      res.status(401).json({
        error: err.message,
        code: 'DISCOGS_TOKEN_EXPIRED',
      });
      return;
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`${LOG_PREFIX} Unexpected error:`, err);
    res.status(500).json({ error: 'Failed to validate Discogs credentials', details: message });
  }
}
