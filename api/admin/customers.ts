import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { cors } from '../_cors';
import { requireAdmin } from '../_adminAuth';

export const config = { maxDuration: 15 };

let _admin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (_admin) return _admin;
  _admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _admin;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res, 'GET')) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    const supabase = getSupabaseAdmin();

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    // Fetch auth users for email + last_sign_in
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) throw usersError;

    const userMap = new Map(users.map(u => [u.id, u] as const));

    // Fetch album counts per user (albums don't have user_id, so we get global count)
    const { count: totalAlbums } = await supabase
      .from('albums')
      .select('*', { count: 'exact', head: true });

    // Fetch subscriptions
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('user_id, plan, status');

    interface SubRow { user_id: string; plan: string; status: string }
    const subMap = new Map<string, SubRow>(
      ((subscriptions || []) as SubRow[]).map(s => [s.user_id, s])
    );

    interface ProfileRow {
      id: string;
      display_name: string | null;
      favorite_genres: string[] | null;
      listening_setup: string | null;
      collecting_goal: string | null;
      onboarding_completed: boolean;
      role: string;
      created_at: string;
      updated_at: string;
    }

    const customers = ((profiles || []) as unknown as ProfileRow[]).map(p => {
      const authUser = userMap.get(p.id);
      const sub = subMap.get(p.id);
      return {
        id: p.id,
        email: authUser?.email || 'unknown',
        display_name: p.display_name,
        favorite_genres: p.favorite_genres,
        listening_setup: p.listening_setup,
        collecting_goal: p.collecting_goal,
        onboarding_completed: p.onboarding_completed,
        role: p.role || 'user',
        created_at: p.created_at,
        updated_at: p.updated_at,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        album_count: totalAlbums || 0,
        subscription_plan: sub?.plan || null,
        subscription_status: sub?.status || null,
      };
    });

    return res.status(200).json(customers);
  } catch (err) {
    console.error('Admin customers error:', err);
    return res.status(500).json({ error: 'Failed to fetch customers' });
  }
}
