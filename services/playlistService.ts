import { supabase } from './supabaseService';
import { PlaylistItem } from '../types';

export interface SavedPlaylist {
  id: string;
  name: string;
  mood: string;
  focus: 'album' | 'side' | 'song';
  items: PlaylistItem[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export const playlistService = {
  async save(playlist: { name: string; mood: string; focus: string; items: PlaylistItem[] }): Promise<SavedPlaylist | null> {
    try {
      if (!supabase) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('saved_playlists')
        .insert({
          user_id: user.id,
          name: playlist.name,
          mood: playlist.mood,
          focus: playlist.focus,
          items: JSON.stringify(playlist.items),
        })
        .select()
        .single();

      if (error) throw error;
      return data ? { ...data, items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items } : null;
    } catch (error) {
      console.error('Save playlist failed:', error);
      return null;
    }
  },

  async getAll(): Promise<SavedPlaylist[]> {
    try {
      if (!supabase) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('saved_playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(p => ({
        ...p,
        items: typeof p.items === 'string' ? JSON.parse(p.items) : p.items,
      }));
    } catch (error) {
      console.error('Load playlists failed:', error);
      return [];
    }
  },

  async getById(playlistId: string): Promise<SavedPlaylist | null> {
    try {
      if (!supabase) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('saved_playlists')
        .select('*')
        .eq('id', playlistId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data ? { ...data, items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items } : null;
    } catch (error) {
      console.error('Load playlist failed:', error);
      return null;
    }
  },

  async getPublic(playlistId: string): Promise<SavedPlaylist | null> {
    try {
      if (!supabase) return null;

      const { data, error } = await supabase
        .from('saved_playlists')
        .select('*')
        .eq('id', playlistId)
        .eq('is_public', true)
        .single();

      if (error) throw error;
      return data ? { ...data, items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items } : null;
    } catch (error) {
      console.error('Load public playlist failed:', error);
      return null;
    }
  },

  async togglePublic(playlistId: string, isPublic: boolean): Promise<boolean> {
    try {
      if (!supabase) return false;

      const { error } = await supabase
        .from('saved_playlists')
        .update({ is_public: isPublic, updated_at: new Date().toISOString() })
        .eq('id', playlistId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Toggle public failed:', error);
      return false;
    }
  },

  async remove(playlistId: string): Promise<boolean> {
    try {
      if (!supabase) return false;

      const { error } = await supabase
        .from('saved_playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete playlist failed:', error);
      return false;
    }
  },
};
