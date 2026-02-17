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

    const { data: albums, error } = await supabase
      .from('albums')
      .select('id, artist, title, year, genre, cover_url, condition, price_median, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const allAlbums = albums || [];

    // Compute stats
    const genreBreakdown: Record<string, number> = {};
    const decadeBreakdown: Record<string, number> = {};
    let totalValue = 0;

    allAlbums.forEach((a: Record<string, unknown>) => {
      const genre = (a.genre as string) || 'Unknown';
      genreBreakdown[genre] = (genreBreakdown[genre] || 0) + 1;

      const year = parseInt((a.year as string) || '0');
      if (year > 0) {
        const decade = Math.floor(year / 10) * 10 + 's';
        decadeBreakdown[decade] = (decadeBreakdown[decade] || 0) + 1;
      }

      totalValue += (a.price_median as number) || 0;
    });

    return res.status(200).json({
      albums: allAlbums,
      stats: {
        totalAlbums: allAlbums.length,
        totalValue,
        genreBreakdown,
        decadeBreakdown,
      },
    });
  } catch (err) {
    console.error('Admin collections error:', err);
    return res.status(500).json({ error: 'Failed to fetch collections' });
  }
}
