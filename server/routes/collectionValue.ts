import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';

const router = Router();

let _admin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (_admin) return _admin;
  _admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _admin;
}

function getAuth(req: Request): string {
  return (req as Request & { auth: AuthResult }).auth.userId;
}

interface AlbumRow {
  artist: string;
  title: string;
  price_low: number | null;
  price_median: number | null;
  price_high: number | null;
  genre: string | null;
  year: string | null;
  condition: string | null;
  discogs_release_id: number | null;
}

interface GenreBucket {
  genre: string;
  value: number;
  count: number;
}

interface DecadeBucket {
  decade: string;
  value: number;
  count: number;
}

function toDecade(year: string | null): string | null {
  if (!year) return null;
  const num = parseInt(year, 10);
  if (isNaN(num) || num < 1900 || num > 2099) return null;
  return `${Math.floor(num / 10) * 10}s`;
}

// ── GET /api/collection/value ────────────────────────────────────────
router.get('/api/collection/value', requireAuthWithUser, async (req: Request, res: Response) => {
  const userId = getAuth(req);

  try {
    const supabase = getSupabaseAdmin();

    const { data: albums, error } = await supabase
      .from('albums')
      .select('artist, title, price_low, price_median, price_high, genre, year, condition, discogs_release_id')
      .eq('user_id', userId);

    if (error) throw error;

    const rows = (albums || []) as AlbumRow[];
    const totalCount = rows.length;

    let totalLow = 0;
    let totalMedian = 0;
    let totalHigh = 0;
    let valuedCount = 0;

    const genreMap = new Map<string, { value: number; count: number }>();
    const decadeMap = new Map<string, { value: number; count: number }>();

    for (const row of rows) {
      const hasValue = row.price_low != null || row.price_median != null || row.price_high != null;
      if (hasValue) valuedCount++;

      if (row.price_low != null) totalLow += row.price_low;
      if (row.price_median != null) totalMedian += row.price_median;
      if (row.price_high != null) totalHigh += row.price_high;

      // Genre aggregation (use median, skip if no median)
      if (row.genre && row.price_median != null) {
        const existing = genreMap.get(row.genre);
        if (existing) {
          existing.value += row.price_median;
          existing.count++;
        } else {
          genreMap.set(row.genre, { value: row.price_median, count: 1 });
        }
      }

      // Decade aggregation (use median, skip if no median or year)
      const decade = toDecade(row.year);
      if (decade && row.price_median != null) {
        const existing = decadeMap.get(decade);
        if (existing) {
          existing.value += row.price_median;
          existing.count++;
        } else {
          decadeMap.set(decade, { value: row.price_median, count: 1 });
        }
      }
    }

    // Collect all unique discogs release IDs
    const allDiscogsIds: number[] = [
      ...new Set(
        rows
          .map(r => r.discogs_release_id)
          .filter((id): id is number => id != null)
      ),
    ];

    // Top 10 by price_median desc, fallback to price_high
    const topRecords = rows
      .filter(r => r.price_median != null || r.price_high != null)
      .sort((a, b) => {
        const aVal = a.price_median ?? a.price_high ?? 0;
        const bVal = b.price_median ?? b.price_high ?? 0;
        return bVal - aVal;
      })
      .slice(0, 10);

    // Genre: top 8 sorted by value desc
    const byGenre: GenreBucket[] = Array.from(genreMap.entries())
      .map(([genre, { value, count }]) => ({ genre, value: Math.round(value * 100) / 100, count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Decade: sorted by decade asc
    const byDecade: DecadeBucket[] = Array.from(decadeMap.entries())
      .map(([decade, { value, count }]) => ({ decade, value: Math.round(value * 100) / 100, count }))
      .sort((a, b) => a.decade.localeCompare(b.decade));

    // Fire-and-forget: upsert daily snapshot into discogs_value_history
    if (totalMedian > 0) {
      const snapshotDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      supabase
        .from('discogs_value_history')
        .upsert(
          {
            user_id: userId,
            snapshot_date: snapshotDate,
            total_value_low: totalLow,
            total_value_median: totalMedian,
            total_value_high: totalHigh,
            record_count: valuedCount,
          },
          { onConflict: 'user_id,snapshot_date' },
        )
        .then(({ error: snapErr }) => {
          if (snapErr) console.error('[collection-value] snapshot upsert error:', snapErr.message);
        });
    }

    res.status(200).json({
      totalLow,
      totalMedian,
      totalHigh,
      valuedCount,
      totalCount,
      topRecords,
      byGenre,
      byDecade,
      allDiscogsIds,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[collection-value] error:', message);
    res.status(500).json({ error: 'Failed to calculate collection value' });
  }
});

// ── GET /api/collection/value/history ─────────────────────────────────
router.get('/api/collection/value/history', requireAuthWithUser, async (req: Request, res: Response) => {
  const userId = getAuth(req);

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('discogs_value_history')
      .select('snapshot_date, total_value_median')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: true })
      .limit(90);

    if (error) throw error;

    const history = (data || []).map((row: { snapshot_date: string; total_value_median: number }) => ({
      date: row.snapshot_date,
      median: row.total_value_median,
    }));

    res.status(200).json({ history });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[collection-value] history error:', message);
    res.status(500).json({ error: 'Failed to fetch value history' });
  }
});

export default router;
