// ── Landing Section Types ──

export interface CmsHero {
  badge: string;
  heading: string;
  subheading: string;
  cta_primary: string;
  cta_secondary: string;
}

export interface CmsProofStat {
  value: string;
  label: string;
}

export interface CmsSectionHeader {
  label: string;
  title: string;
  subtitle: string;
}

export interface CmsFeature {
  icon: string;
  cls: string;
  title: string;
  desc: string;
}

export interface CmsStep {
  num: string;
  title: string;
  desc: string;
}

export interface CmsShowcase {
  label: string;
  title: string;
  title_em: string;
  subtitle: string;
  checklist: string[];
}

export interface CmsShowcaseCard {
  gradient: string;
  emoji: string;
  title: string;
  artist: string;
  price: string;
}

export interface CmsPlaylistHeader {
  label: string;
  title: string;
  title_em: string;
  subtitle: string;
  checklist: string[];
}

export interface CmsPlaylistTrack {
  num: string;
  cls: string;
  emoji: string;
  title: string;
  artist: string;
  duration: string;
}

export interface CmsStatItem {
  heading: string;
  description: string;
}

export interface CmsTestimonial {
  quote: string;
  author: string;
  detail: string;
}

export interface CmsFaq {
  q: string;
  a: string;
}

export interface CmsFinalCta {
  heading: string;
  description: string;
  cta_primary: string;
  cta_secondary: string;
}

export interface CmsFooter {
  brand_description: string;
  copyright: string;
  tagline: string;
}

export interface CmsLandingContent {
  hero: CmsHero;
  proof_stats: CmsProofStat[];
  features_header: CmsSectionHeader;
  features: CmsFeature[];
  how_it_works_header: CmsSectionHeader;
  how_it_works: CmsStep[];
  showcase: CmsShowcase;
  showcase_cards: CmsShowcaseCard[];
  playlist_header: CmsPlaylistHeader;
  playlist_moods: string[];
  playlist_tracks: CmsPlaylistTrack[];
  stakkd: CmsShowcase;
  stats_band: CmsStatItem[];
  testimonial: CmsTestimonial;
  faq_header: { label: string; title: string };
  faqs: CmsFaq[];
  final_cta: CmsFinalCta;
  footer: CmsFooter;
}

// ── Legal Page Types ──

export interface CmsLegalBody {
  html: string;
  last_updated?: string;
  effective_date?: string;
}

// ── DB Row Type ──

export interface CmsContentRow {
  id: string;
  page: string;
  section: string;
  content: unknown;
  updated_at: string;
  updated_by: string | null;
}
