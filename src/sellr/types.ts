// ── Sellr Types ──────────────────────────────────────────────────────

export interface SellrSession {
  id: string;
  email: string | null;
  tier: 'starter' | 'standard' | 'full' | null;
  status: 'active' | 'paid' | 'expired';
  record_count: number;
  collection_ad_copy: string | null;
  created_at: string;
  expires_at: string;
}

export interface SellrRecord {
  id: string;
  session_id: string;
  title: string;
  artist: string;
  year: number | null;
  label: string | null;
  condition: 'M' | 'NM' | 'VG+' | 'VG' | 'G+' | 'G' | 'F' | 'P';
  discogs_id: string | null;
  cover_image: string | null;
  price_low: number | null;
  price_median: number | null;
  price_high: number | null;
  ad_copy: string | null;
}

export interface SellrOrder {
  id: string;
  session_id: string;
  email: string;
  tier: SellrSession['tier'];
  amount_cents: number;
  stripe_payment_intent: string;
  status: 'pending' | 'complete' | 'failed';
  report_token: string;
  created_at: string;
}

export interface SellrTier {
  id: SellrSession['tier'];
  label: string;
  record_limit: number;
  price_cents: number;
  price_display: string;
}

export interface SellrEmailLog {
  id: string;
  session_id: string;
  order_id: string | null;
  email_type: 'session_created' | 'payment_confirmed' | 'abandoned_session' | 'rekkrd_conversion' | 'admin_alert';
  recipient_email: string | null;
  success: boolean;
  error_message: string | null;
  sent_at: string;
}

export interface AdminOrder {
  id: string;
  session_id: string;
  email: string;
  tier: string;
  amount_cents: number;
  status: 'pending' | 'complete' | 'failed';
  report_token: string;
  record_count: number;
  created_at: string;
}

export const SELLR_TIERS: SellrTier[] = [
  { id: 'starter', label: 'Starter', record_limit: 25, price_cents: 499, price_display: '$4.99' },
  { id: 'standard', label: 'Standard', record_limit: 100, price_cents: 1499, price_display: '$14.99' },
  { id: 'full', label: 'Full', record_limit: 500, price_cents: 2999, price_display: '$29.99' },
];
