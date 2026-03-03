import { supabase } from './supabaseService';

type EventType = 'album_open' | 'tracklist_expand' | 'lyrics_lookup' | 'play_logged' | 'cover_view' | 'now_spinning';

export const engagementService = {
  async logEvent(albumId: string, eventType: EventType): Promise<void> {
    try {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('engagement_events').insert({
        user_id: user.id,
        album_id: albumId,
        event_type: eventType,
      });
    } catch (error) {
      // Silent fail — engagement tracking should never block the user
      console.debug('Engagement log failed:', error);
    }
  },

  async setNowSpinning(albumId: string): Promise<void> {
    try {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upsert — one row per user, always the latest album
      await supabase.from('now_spinning').upsert({
        user_id: user.id,
        album_id: albumId,
        started_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      // Also log as an engagement event
      await this.logEvent(albumId, 'now_spinning');
    } catch (error) {
      console.debug('Now Spinning failed:', error);
    }
  },

  /**
   * Record a spin in the spins table and increment album play_count.
   * Throws on failure so callers can show error toasts.
   */
  async recordSpin(albumId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Insert into spins table
    const { error: spinError } = await supabase.from('spins').insert({
      user_id: user.id,
      album_id: albumId,
      spun_at: new Date().toISOString(),
    });
    if (spinError) throw spinError;

    // 2. Increment play_count on the album
    // Use rpc if available, otherwise read-then-write
    const { data: album, error: fetchError } = await supabase
      .from('albums')
      .select('play_count')
      .eq('id', albumId)
      .eq('user_id', user.id)
      .single();
    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
      .from('albums')
      .update({ play_count: (album.play_count || 0) + 1 })
      .eq('id', albumId)
      .eq('user_id', user.id);
    if (updateError) throw updateError;
  },

  async clearNowSpinning(): Promise<void> {
    try {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('now_spinning').delete().eq('user_id', user.id);
    } catch (error) {
      console.debug('Clear Now Spinning failed:', error);
    }
  },

  async getNowSpinningId(): Promise<string | null> {
    return this.getNowSpinning();
  },

  async getNowSpinning(): Promise<string | null> {
    try {
      if (!supabase) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('now_spinning')
        .select('album_id')
        .eq('user_id', user.id)
        .maybeSingle();

      return data?.album_id || null;
    } catch (error) {
      return null;
    }
  },
};
