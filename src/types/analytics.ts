export interface GenreData {
  genre: string;
  count: number;
  percentage: number;
}

export interface DecadeData {
  decade: string;
  count: number;
}

export interface GrowthData {
  date: string;
  totalAlbums: number;
}

export interface FormatData {
  format: string;
  count: number;
  percentage: number;
}

export interface CollectionStats {
  totalAlbums: number;
  totalArtists: number;
  oldestAlbum: { title: string; artist: string; year: string } | null;
  newestAlbum: { title: string; artist: string; year: string } | null;
  mostCommonGenre: string;
  mostCommonDecade: string;
  avgAlbumsPerArtist: number;
  collectionStartDate: string;
}
