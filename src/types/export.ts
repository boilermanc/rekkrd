export interface ExportOptions {
  format: 'csv' | 'pdf';
  includeFields?: string[];
  filterFavorites?: boolean;
  sortBy?: 'artist' | 'title' | 'year' | 'date_added';
}

export interface ExportResult {
  success: boolean;
  albumCount: number;
  filename: string;
}
