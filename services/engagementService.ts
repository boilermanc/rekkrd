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
        .single();

      return data?.album_id || null;
    } catch (error) {
      return null;
    }
  },
};
