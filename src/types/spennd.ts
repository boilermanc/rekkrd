export interface DiscogsRelease {
  id: number;
  title: string;
  artist: string;
  year: string;
  label: string;
  country: string;
  format: string;
  thumb: string;
}

export interface LabelValidation {
  confirmed: boolean;
  notes: string[];
}

export interface MatrixResult {
  matched: boolean;
  partial_match: boolean;
  pressing_label: string | null;
  engineer_notes: Array<{ mark: string; description: string }>;
  is_double_album: boolean;
  all_known_matrices: string[];
  no_matrix_data: boolean;
  notes: string | null;
}

export interface PriceData {
  low: number | null;
  median: number | null;
  high: number | null;
  num_for_sale: number;
  available: boolean;
  cached: boolean;
}

export interface EbayData {
  low: number | null;
  median: number | null;
  high: number | null;
  count: number;
  available: boolean;
  cached: boolean;
}
