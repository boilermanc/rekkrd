export const SORT_SCHEMES = [
  'artist_alpha',
  'genre_artist',
  'year_asc',
  'year_desc',
  'date_added',
  'custom',
] as const;

export type SortScheme = typeof SORT_SCHEMES[number];

export interface ShelfConfig {
  id: string;
  user_id: string;
  name: string;
  unit_count: number;
  capacity_per_unit: number;
  created_at: string;
  updated_at: string;
}

export interface ShelfSortPreference {
  id: string;
  user_id: string;
  sort_scheme: SortScheme;
  created_at: string;
  updated_at: string;
}
