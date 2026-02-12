
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Album } from '../types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Fix: Export the supabase variable so it can be accessed in App.tsx
export let supabase: SupabaseClient | null = null;

// Only initialize if keys are present to avoid startup crashes
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn("Supabase credentials missing. Database functionality will be disabled until SUPABASE_URL and SUPABASE_ANON_KEY are set in environment variables.");
}

export const supabaseService = {
  async getAlbums(): Promise<Album[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching albums:', error);
      return [];
    }

    return (data || []).map(a => ({
      ...a,
      isFavorite: a.is_favorite
    }));
  },

  async uploadPhoto(base64Data: string): Promise<string | null> {
    if (!supabase) return null;
    
    try {
      const fileName = `${crypto.randomUUID()}.jpg`;
      const base64Content = base64Data.split(',')[1];
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const { data, error } = await supabase.storage
        .from('album-photos')
        .upload(fileName, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('album-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (e) {
      console.error('Upload error:', e);
      return null;
    }
  },

  async saveAlbum(album: Album): Promise<Album> {
    if (!supabase) throw new Error("Supabase not initialized");
    
    let photoUrl: string | undefined = undefined;

    if (album.original_photo_url && album.original_photo_url.startsWith('data:image')) {
      const uploadedUrl = await this.uploadPhoto(album.original_photo_url);
      if (uploadedUrl) photoUrl = uploadedUrl;
      // If upload fails, don't store the raw base64 — it's too large for a text column
    } else if (album.original_photo_url) {
      photoUrl = album.original_photo_url;
    }

    const { data, error } = await supabase
      .from('albums')
      .insert([{
        artist: album.artist,
        title: album.title,
        year: album.year,
        genre: album.genre,
        cover_url: album.cover_url,
        original_photo_url: photoUrl,
        description: album.description,
        tracklist: album.tracklist,
        tags: album.tags,
        is_favorite: album.isFavorite,
        condition: album.condition,
        personal_notes: album.personal_notes,
        price_low: album.price_low,
        price_median: album.price_median,
        price_high: album.price_high,
        play_count: album.play_count || 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving album:', error);
      throw error;
    }

    return { ...data, isFavorite: data.is_favorite };
  },

  async updateAlbum(id: string, updates: Partial<Album>): Promise<void> {
    if (!supabase) return;
    
    const { isFavorite, ...rest } = updates;
    const dbUpdates: Record<string, unknown> = { ...rest };
    if (isFavorite !== undefined) {
      dbUpdates.is_favorite = isFavorite;
    }

    const { error } = await supabase
      .from('albums')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating album:', error);
      throw error;
    }
  },

  async deleteAlbum(id: string): Promise<void> {
    if (!supabase) return;
    
    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting album:', error);
      throw error;
    }
  }
};
