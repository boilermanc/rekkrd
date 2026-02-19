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

interface ProfileRow {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  subscription_tier: string | null;
  created_at: string;
}

function groupBy(rows: ProfileRow[], key: keyof ProfileRow): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const val = row[key] as string | null;
    if (val) {
      counts[val] = (counts[val] || 0) + 1;
    }
  }
  return counts;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res, 'GET')) return;

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Fetch all UTM-tracked profiles (utm_source IS NOT NULL)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('utm_source, utm_medium, utm_campaign, subscription_tier, created_at')
      .not('utm_source', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (profiles || []) as ProfileRow[];

    // Total signups
    const total_signups = rows.length;

    // Grouped counts
    const by_source = groupBy(rows, 'utm_source');
    const by_medium = groupBy(rows, 'utm_medium');
    const by_campaign = groupBy(rows, 'utm_campaign');
    const by_tier = groupBy(rows, 'subscription_tier');

    // Recent signups (last 10, no PII)
    const recent_signups = rows.slice(0, 10).map(r => ({
      created_at: r.created_at,
      utm_source: r.utm_source,
      utm_medium: r.utm_medium,
      utm_campaign: r.utm_campaign,
      subscription_tier: r.subscription_tier,
    }));

    // Daily signup counts for last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyCounts: Record<string, number> = {};
    // Initialize all 30 days with 0
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      dailyCounts[d.toISOString().slice(0, 10)] = 0;
    }
    // Count actual signups
    for (const row of rows) {
      const date = row.created_at.slice(0, 10);
      if (date in dailyCounts) {
        dailyCounts[date]++;
      }
    }
    const by_date = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return res.status(200).json({
      total_signups,
      by_source,
      by_medium,
      by_campaign,
      by_tier,
      recent_signups,
      by_date,
    });
  } catch (err) {
    console.error('UTM stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch UTM stats' });
  }
}
