
/** Shape of an album before it has been persisted (no DB-generated fields). */
export interface NewAlbum {
  artist: string;
  title: string;
  year?: string;
  genre?: string;
  cover_url: string;
  original_photo_url?: string;
  description?: string;
  tracklist?: string[];
  tags?: string[];
  isFavorite?: boolean;
  discogs_url?: string;
  musicbrainz_url?: string;
  sample_url?: string;
  // Collector fields
  condition?: string;
  personal_notes?: string;
  price_low?: number;
  price_median?: number;
  price_high?: number;
  play_count?: number;
}

/** A saved album — always has an id and created_at from the database. */
export interface Album extends NewAlbum {
  id: string;
  created_at: string;
}

/** Unvalidated playlist item from Gemini / API response (before enrichment) */
export interface RawPlaylistItem {
  albumId?: string;
  artist?: string;
  albumTitle?: string;
  itemTitle?: string;
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

// ── Stakkd (Gear) ──────────────────────────────────────────────

export const GEAR_CATEGORIES = [
  'turntable',
  'cartridge',
  'phono_preamp',
  'preamp',
  'amplifier',
  'receiver',
  'speakers',
  'headphones',
  'dac',
  'subwoofer',
  'cables_other',
] as const;

export type GearCategory = typeof GEAR_CATEGORIES[number];

/** Shape of a gear item before it has been persisted (no DB-generated fields). */
export interface NewGear {
  category: GearCategory;
  brand: string;
  model: string;
  year?: string;
  description?: string;
  specs?: Record<string, string | number>;
  manual_url?: string;
  manual_pdf_url?: string;
  image_url?: string;
  original_photo_url?: string;
  purchase_price?: number;
  purchase_date?: string;
  notes?: string;
  position?: number;
}

/** A saved gear item — always has an id and created_at from the database. */
export interface Gear extends NewGear {
  id: string;
  created_at: string;
}

/** Shape returned by the /api/setup-guide endpoint. */
export interface SetupGuideConnection {
  from: string;
  to: string;
  cable_type: string;
  connection_type: string;
  notes: string;
}

export interface SetupGuideSetting {
  gear: string;
  setting: string;
  recommended_value: string;
  explanation: string;
}

export interface SetupGuide {
  signal_chain: string[];
  connections: SetupGuideConnection[];
  settings: SetupGuideSetting[];
  tips: string[];
  warnings: string[];
}

/** Shape returned by the /api/find-manual endpoint. */
export interface ManualSearchResult {
  manual_url: string | null;
  source: string;
  confidence: string;
  alternative_urls: string[];
  search_url: string;
}

// ── Discogs Collection ────────────────────────────────────────

export interface DiscogsCollectionArtist {
  name: string;
  id: number;
}

export interface DiscogsBasicInformation {
  id: number;
  title: string;
  year: number;
  artists: DiscogsCollectionArtist[];
  genres: string[];
  styles: string[];
  cover_image: string;
  thumb: string;
}

export interface DiscogsCollectionRelease {
  id: number;
  instance_id: number;
  basic_information: DiscogsBasicInformation;
}

export interface DiscogsPagination {
  page: number;
  pages: number;
  per_page: number;
  items: number;
}

export interface DiscogsCollectionResponse {
  releases: DiscogsCollectionRelease[];
  pagination: DiscogsPagination;
}

export interface DiscogsImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/** A Discogs release match returned alongside Gemini identification. */
export interface DiscogsMatch {
  id: number;
  title: string;
  year: string;
  country: string;
  format: string;
  thumb: string;
  catno: string;
  label: string;
  matchType: 'barcode' | 'text';
}

/** Shape returned by the /api/identify-gear endpoint. */
export interface IdentifiedGear {
  category: string;
  brand: string;
  model: string;
  year: string;
  description: string;
  specs: Record<string, string | number>;
  manual_search_query: string;
}
