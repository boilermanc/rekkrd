import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export interface AuthResult {
  userId: string;
}

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabaseAdmin = createClient(url, key);
  return _supabaseAdmin;
}

/**
 * Verifies Supabase JWT and returns user ID.
 * Falls back to API_SECRET check during migration period.
 * Returns AuthResult on success, null if unauthorized (response already sent).
 */
export async function requireAuthWithUser(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthResult | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const token = authHeader.slice(7);

  // Try Supabase JWT first
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (user && !error) {
      return { userId: user.id };
    }
  }

  // Fallback: legacy shared secret (migration period only)
  const secret = process.env.API_SECRET;
  if (secret && token === secret) {
    return { userId: '__legacy__' };
  }

  res.status(401).json({ error: 'Unauthorized' });
  return null;
}

/**
 * Legacy: validates Authorization header against API_SECRET.
 * Kept for backward compat during migration. Use requireAuthWithUser for new code.
 */
export function requireAuth(req: VercelRequest, res: VercelResponse): boolean {
  const secret = process.env.API_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'API_SECRET not configured' });
    return false;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}
