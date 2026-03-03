
import { supabase, getCurrentUserId } from './supabaseService';

// ── Types ───────────────────────────────────────────────────────

export interface RecentSpin {
  id: string;
  spun_at: string;
  album_id: string;
  title: string;
  artist: string;
  cover_url: string;
  play_count: number;
}

export interface MostPlayedAlbum {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
  play_count: number;
  spin_count: number;
}

export interface SpinStats {
  totalSpins: number;
  thisMonth: number;
  thisWeek: number;
  uniqueAlbums: number;
}

export interface SpinHistoryPage {
  spins: RecentSpin[];
  hasMore: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────

function assertClient() {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }
}

async function requireUserId(): Promise<string> {
  assertClient();
  const cached = getCurrentUserId();
  if (cached) return cached;
  const { data: { session } } = await supabase!.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
  return session.user.id;
}

function mapSpinRow(row: Record<string, unknown>): RecentSpin {
  const album = (row.albums ?? {}) as Record<string, unknown>;
  return {
    id: row.id as string,
    spun_at: row.spun_at as string,
    album_id: row.album_id as string,
    title: (album.title as string) || '',
    artist: (album.artist as string) || '',
    cover_url: (album.cover_url as string) || '',
    play_count: (album.play_count as number) || 0,
  };
}

// ── Service ─────────────────────────────────────────────────────

export const spinsService = {
  /**
   * Fetch the user's most recent spins, joined with album data.
   */
  async getRecentSpins(limit = 20): Promise<RecentSpin[]> {
    assertClient();
    const userId = await requireUserId();

    const { data, error } = await supabase!
      .from('spins')
      .select('id, spun_at, album_id, albums(title, artist, cover_url, play_count)')
      .eq('user_id', userId)
      .order('spun_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(mapSpinRow);
  },

  /**
   * Fetch albums ranked by total spin count.
   * Uses play_count (incremented per spin) as the primary sort,
   * which stays in sync with the spins table.
   */
  async getMostPlayed(limit = 10): Promise<MostPlayedAlbum[]> {
    assertClient();
    const userId = await requireUserId();

    const { data, error } = await supabase!
      .from('albums')
      .select('id, title, artist, cover_url, play_count')
      .eq('user_id', userId)
      .gt('play_count', 0)
      .order('play_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(a => ({
      id: a.id as string,
      title: a.title as string,
      artist: a.artist as string,
      cover_url: a.cover_url as string,
      play_count: (a.play_count as number) || 0,
      spin_count: (a.play_count as number) || 0,
    }));
  },

  /**
   * Fetch aggregate listening stats for the user.
   */
  async getSpinStats(): Promise<SpinStats> {
    assertClient();
    const userId = await requireUserId();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [totalResult, monthResult, weekResult, uniqueResult] = await Promise.all([
      supabase!.from('spins').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase!.from('spins').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('spun_at', startOfMonth),
      supabase!.from('spins').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('spun_at', weekAgo),
      supabase!.from('spins').select('album_id').eq('user_id', userId),
    ]);

    if (totalResult.error) throw totalResult.error;
    if (monthResult.error) throw monthResult.error;
    if (weekResult.error) throw weekResult.error;
    if (uniqueResult.error) throw uniqueResult.error;

    const uniqueAlbums = new Set(
      (uniqueResult.data || []).map((r: { album_id: string }) => r.album_id)
    ).size;

    return {
      totalSpins: totalResult.count || 0,
      thisMonth: monthResult.count || 0,
      thisWeek: weekResult.count || 0,
      uniqueAlbums,
    };
  },

  /**
   * Paginated full spin history.
   */
  async getSpinHistory(page = 0, pageSize = 50): Promise<SpinHistoryPage> {
    assertClient();
    const userId = await requireUserId();

    const from = page * pageSize;
    const to = from + pageSize; // range is inclusive — fetch one extra to detect hasMore

    const { data, error } = await supabase!
      .from('spins')
      .select('id, spun_at, album_id, albums(title, artist, cover_url, play_count)')
      .eq('user_id', userId)
      .order('spun_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const rows = data || [];
    const hasMore = rows.length > pageSize;
    const spins = (hasMore ? rows.slice(0, pageSize) : rows).map(mapSpinRow);

    return { spins, hasMore };
  },
};
