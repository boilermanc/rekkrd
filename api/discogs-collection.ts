import type { VercelRequest, VercelResponse } from '@vercel/node';
import OAuthModule from 'oauth-1.0a';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser } from './_auth';
import { cors } from './_cors';

const LOG_PREFIX = '[discogs-collection]';
const USER_AGENT = 'Rekkrd/1.0 +https://rekkrd.com';

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

// ── OAuth 1.0a client ─────────────────────────────────────────────

const OAuth = (OAuthModule as any).default || OAuthModule;

function getOAuthClient() {
  const consumerKey = process.env.DISCOGS_CONSUMER_KEY;
  const consumerSecret = process.env.DISCOGS_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    throw new Error(`${LOG_PREFIX} DISCOGS_CONSUMER_KEY or DISCOGS_CONSUMER_SECRET not configured`);
  }

  return new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString: string, key: string) {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64');
    },
  });
}

// ── Handler ───────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res, 'GET')) return;
  const auth = await requireAuthWithUser(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      .eq('id', auth.userId)
      .single();

    if (profileError) {
      console.error(`${LOG_PREFIX} Failed to fetch profile:`, profileError.message);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    const accessToken = profile?.discogs_oauth_token as string | null;
    const accessTokenSecret = profile?.discogs_oauth_secret as string | null;
    const username = profile?.discogs_username as string | null;

    if (!accessToken || !accessTokenSecret || !username) {
      return res.status(401).json({ error: 'Discogs account not connected' });
    }

    // Build Discogs API URL
    const url =
      `https://api.discogs.com/users/${encodeURIComponent(username)}/collection/folders/0/releases` +
      `?page=${page}&per_page=${perPage}&sort=artist&sort_order=asc`;

    // Sign request with OAuth 1.0a
    const oauth = getOAuthClient();
    const requestData = { url, method: 'GET' };
    const token = { key: accessToken, secret: accessTokenSecret };
    const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...authHeader,
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage: string;
      try {
        const body = await response.json();
        errorMessage = (body as { message?: string }).message || JSON.stringify(body);
      } catch {
        errorMessage = response.statusText;
      }
      console.error(`${LOG_PREFIX} Discogs API error: ${response.status} ${errorMessage}`);
      return res.status(502).json({ error: `Discogs API error: ${errorMessage}` });
    }

    const data = await response.json();
    return res.status(200).json({
      releases: data.releases,
      pagination: data.pagination,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${LOG_PREFIX} Error:`, error);
    return res.status(500).json({ error: 'Failed to fetch Discogs collection', details: message });
  }
}
