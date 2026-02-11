
export interface Album {
  id?: string;
  artist: string;
  title: string;
  year?: string;
  year_range?: string;
  genre?: string;
  cover_url: string;
  original_photo_url?: string;
  description?: string;
  tracklist?: string[];
  tags?: string[];
  isFavorite?: boolean;
  created_at?: string;
  discogs_url?: string;
  musicbrainz_url?: string;
  sample_url?: string;
  // Collector fields
  condition?: string;
  personal_notes?: string;
  price_estimate?: string;
  price_low?: number;
  price_median?: number;
  price_high?: number;
  play_count?: number;
}

export interface PlaylistItem {
  albumId: string;
  artist: string;
  albumTitle: string;
  itemTitle: string;
  cover_url: string;
  type: 'album' | 'side' | 'song';
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  mood: string;
}

export interface RecognitionResult {
  artist: string;
  title: string;
  confidence: number;
}

export interface AppState {
  albums: Album[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
}
