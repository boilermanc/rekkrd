
import { supabase, getCurrentUserId } from './supabaseService';
import { WantlistItem, NewWantlistItem } from '../types';

function assertClient() {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }
}

async function requireUserId(): Promise<string> {
  assertClient();
  // Prefer the user ID set by the auth context (shared via supabaseService)
  const cached = getCurrentUserId();
  if (cached) return cached;
  // Fallback to getSession()
  const { data: { session } } = await supabase!.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
  return session.user.id;
}

export const wantlistService = {
  async getWantlist(): Promise<WantlistItem[]> {
    assertClient();
    const userId = await requireUserId();

    const { data, error } = await supabase!
      .from('wantlist')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wantlist:', error);
      return [];
    }

    return data || [];
  },

  async addToWantlist(item: NewWantlistItem): Promise<WantlistItem> {
    assertClient();
    const userId = await requireUserId();

    const { data, error } = await supabase!
      .from('wantlist')
      .insert([{
        user_id: userId,
        artist: item.artist,
        title: item.title,
        year: item.year,
        genre: item.genre,
        cover_url: item.cover_url,
        discogs_release_id: item.discogs_release_id,
        discogs_url: item.discogs_url,
        price_low: item.price_low,
        price_median: item.price_median,
        price_high: item.price_high,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding to wantlist:', error);
      throw error;
    }

    return data;
  },

  async removeFromWantlist(id: string): Promise<void> {
    assertClient();
    const userId = await requireUserId();

    const { error } = await supabase!
      .from('wantlist')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing from wantlist:', error);
      throw error;
    }
  },

  async markAsOwned(id: string): Promise<WantlistItem> {
    assertClient();
    const userId = await requireUserId();

    const { data, error } = await supabase!
      .from('wantlist')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching wantlist item:', error);
      throw error;
    }

    return data;
  },

  async updateWantlistPrices(id: string, prices: {
    price_low: number | null;
    price_median: number | null;
    price_high: number | null;
  }): Promise<void> {
    assertClient();
    const userId = await requireUserId();

    const { error } = await supabase!
      .from('wantlist')
      .update({
        price_low: prices.price_low,
        price_median: prices.price_median,
        price_high: prices.price_high,
        prices_updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating wantlist prices:', error);
      throw error;
    }
  },
};
