// ── Search ─────────────────────────────────────────────────────────

export interface DiscogsSearchParams {
  q?: string;
  type?: 'release' | 'master' | 'artist' | 'label';
  title?: string;
  artist?: string;
  barcode?: string;
  year?: string;
  format?: string;
  country?: string;
  per_page?: string;
  page?: string;
}

export interface DiscogsSearchResult {
  id: number;
  type: string;
  title: string;
  thumb: string;
  cover_image: string;
  resource_url: string;
  uri: string;
  master_id?: number;
  master_url?: string;
  country?: string;
  year?: string;
  format?: string[];
  label?: string[];
  genre?: string[];
  style?: string[];
  catno?: string;
  barcode?: string[];
  community?: {
    have: number;
    want: number;
  };
}

export interface DiscogsSearchResponse {
  pagination: DiscogsPagination;
  results: DiscogsSearchResult[];
}

// ── Pagination ─────────────────────────────────────────────────────

export interface DiscogsPagination {
  per_page: number;
  pages: number;
  page: number;
  items: number;
  urls: {
    next?: string;
    prev?: string;
  };
}

// ── Shared sub-types ───────────────────────────────────────────────

export interface DiscogsArtist {
  id: number;
  name: string;
  resource_url: string;
  role?: string;
}

export interface DiscogsTrack {
  position: string;
  title: string;
  duration: string;
  type_: string;
}

export interface DiscogsImage {
  type: string;
  uri: string;
  uri150: string;
  width: number;
  height: number;
}

export interface DiscogsLabel {
  id: number;
  name: string;
  catno: string;
}

export interface DiscogsFormat {
  name: string;
  qty: string;
  descriptions?: string[];
}

export interface DiscogsCommunity {
  rating: {
    average: number;
    count: number;
  };
  have: number;
  want: number;
}

// ── Release ────────────────────────────────────────────────────────

export interface DiscogsRelease {
  id: number;
  title: string;
  artists: DiscogsArtist[];
  year: number;
  genres: string[];
  styles: string[];
  tracklist: DiscogsTrack[];
  images?: DiscogsImage[];
  labels?: DiscogsLabel[];
  formats?: DiscogsFormat[];
  country?: string;
  released?: string;
  notes?: string;
  community?: DiscogsCommunity;
  master_id?: number;
  master_url?: string;
  estimated_weight?: number;
  num_for_sale?: number;
  lowest_price?: number;
  resource_url: string;
}

// ── Master Release ─────────────────────────────────────────────────

export interface DiscogsMasterRelease {
  id: number;
  title: string;
  main_release: number;
  main_release_url: string;
  year: number;
  images?: DiscogsImage[];
  artists: DiscogsArtist[];
  genres: string[];
  styles: string[];
  tracklist: DiscogsTrack[];
  versions_url: string;
  num_for_sale?: number;
  lowest_price?: number;
  resource_url: string;
}

// ── Rate Limit ─────────────────────────────────────────────────────

export interface DiscogsRateLimit {
  remaining: number;
  limit: number;
  used: number;
}
