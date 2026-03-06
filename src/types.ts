
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
  discogs_release_id?: number;
  musicbrainz_url?: string;
  sample_url?: string;
  barcode?: string;
  format?: string;
  label?: string;
  // Collector fields
  condition?: string;
  personal_notes?: string;
  price_low?: number;
  price_median?: number;
  price_high?: number;
  play_count?: number;
  matrix?: string;
  // My Copy fields (Batch 37)
  purchase_price?: number;
  acquired_date?: string;
  acquired_from?: string;
  copy_notes?: string;
  pressing_country?: string;
  pressing_year?: number;
  catalog_number?: string;
  is_for_sale?: boolean;
}

/** A saved album — always has an id and created_at from the database. */
export interface Album extends NewAlbum {
  id: string;
  created_at: string;
  shelf_unit?: number | null;
  shelf_manual_override?: boolean;
  shelf_config_id?: string | null;
}

/** Unvalidated playlist item from Gemini / API response (before enrichment) */
export interface RawPlaylistItem {
  albumId?: string;
  artist?: string;
  albumTitle?: string;
  itemTitle?: string;
  reason?: string;
}

export interface PlaylistItem {
  albumId: string;
  artist: string;
  albumTitle: string;
  itemTitle: string;
  cover_url: string;
  type: 'album' | 'side' | 'song';
  reason?: string;
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
  catalog_id?: string;
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

/** Pending scan result awaiting user confirmation before save. */
export interface ScanConfirmation {
  artist: string;
  title: string;
  barcode?: string;
  discogsMatches?: DiscogsMatch[];
  scanMode?: 'cover' | 'barcode';
  format?: string;
}

/** Shape returned by the /api/identify-gear endpoint. */
export interface IdentifiedGear {
  category: GearCategory;
  brand: string;
  model: string;
  year: string;
  description: string;
  specs: Record<string, string | number>;
  manual_search_query: string;
}

// ── Wantlist ──────────────────────────────────────────────────

/** A saved wantlist item — always has id, user_id, and created_at from the database. */
export interface WantlistItem {
  id: string;
  user_id: string;
  artist: string;
  title: string;
  year: string | null;
  genre: string | null;
  cover_url: string | null;
  discogs_release_id: number | null;
  discogs_url: string | null;
  price_low: number | null;
  price_median: number | null;
  price_high: number | null;
  prices_updated_at: string | null;
  created_at: string;
}

/** Shape of a wantlist item before it has been persisted (no DB-generated fields). */
export type NewWantlistItem = Omit<WantlistItem, 'id' | 'user_id' | 'created_at' | 'prices_updated_at'>;

// ── Price Alerts ───────────────────────────────────────────────

export interface PriceAlert {
  id: string;
  user_id: string;
  discogs_release_id: number;
  artist: string;
  title: string;
  cover_url: string | null;
  target_price: number;
  condition_minimum: string;
  is_active: boolean;
  last_checked_at: string | null;
  triggered_at: string | null;
  created_at: string;
}
