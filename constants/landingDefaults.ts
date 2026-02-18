import type {
  CmsHero,
  CmsProofStat,
  CmsSectionHeader,
  CmsFeature,
  CmsStep,
  CmsShowcase,
  CmsShowcaseCard,
  CmsPlaylistHeader,
  CmsPlaylistTrack,
  CmsStatItem,
  CmsTestimonial,
  CmsFaq,
  CmsFinalCta,
  CmsFooter,
  CmsLandingContent,
} from '../types/cms';

export const DEFAULT_HERO: CmsHero = {
  badge: 'AI-Powered Vinyl',
  heading: 'Your Vinyl<br/>Collection, <em>Reimagined.</em>',
  subheading: 'Scan, catalog, and rediscover your record collection with AI. Get instant identification, valuations, tracklists, and curated playlists from what you already own.',
  cta_primary: 'Start Free',
  cta_secondary: 'See Features',
};

export const DEFAULT_PROOF_STATS: CmsProofStat[] = [
  { value: '10K+', label: 'Records Cataloged' },
  { value: '98%', label: 'Scan Accuracy' },
  { value: '2.5K+', label: 'Playlists Created' },
  { value: '4.9\u2605', label: 'User Rating' },
];

export const DEFAULT_FEATURES_HEADER: CmsSectionHeader = {
  label: 'Features',
  title: 'Everything Your Crate Deserves',
  subtitle: 'From AI scanning to playlist curation, Rekkrd is the most complete vinyl companion ever built.',
};

export const DEFAULT_FEATURES: CmsFeature[] = [
  { icon: '\uD83D\uDCF7', cls: 'fi-1', title: 'AI Camera Scan', desc: 'Point, snap, done. Our Gemini-powered AI identifies artist and album from cover art instantly. Upload a photo or use your camera.' },
  { icon: '\u26A1', cls: 'fi-2', title: 'Auto Enrichment', desc: 'Every album gets filled in automatically: tracklist, genre, year, cover art, market pricing, AI description, and streaming links.' },
  { icon: '\uD83D\uDCB0', cls: 'fi-3', title: 'Collection Valuation', desc: 'See low, median, and high market prices pulled from Discogs. Know what your crate is worth at a glance with portfolio stats.' },
  { icon: '\uD83C\uDFB5', cls: 'fi-4', title: 'Playlist Studio', desc: 'Type a mood. Get a curated playlist from your own collection. Choose albums, sides, or individual songs. Print to PDF.' },
  { icon: '\uD83D\uDD0D', cls: 'fi-5', title: 'Smart Search & Filter', desc: 'Real-time search across title, artist, and genre. Sort by year, value, or date added. Filter by decade, condition, or favorites.' },
  { icon: '\uD83C\uDFB6', cls: 'fi-6', title: 'Lyrics & Liner Notes', desc: 'Look up lyrics for any track in your collection. Add personal notes, tags, and condition grades to every album.' },
  { icon: '\uD83D\uDD27', cls: 'fi-stakkd', title: 'Stakkd Gear Catalog', desc: 'Document your audio equipment with AI. Get instant identification, specs, history, manuals, and custom setup guides for your entire signal chain.' },
  { icon: '\uD83D\uDCC8', cls: 'fi-analytics', title: 'Collection Analytics', desc: 'Track your collection\u2019s value over time, see genre breakdowns, and discover insights about your listening habits.' },
];

export const DEFAULT_HOW_IT_WORKS_HEADER: CmsSectionHeader = {
  label: 'How It Works',
  title: 'Three Steps to a Smarter Crate',
  subtitle: 'From physical vinyl to digital library in seconds.',
};

export const DEFAULT_HOW_IT_WORKS: CmsStep[] = [
  { num: '1', title: 'Scan or Add', desc: 'Point your camera at any record cover. AI identifies it instantly, or search and add manually.' },
  { num: '2', title: 'Enrich Automatically', desc: 'Tracklist, genre, cover art, market price, and an AI description all populate in seconds.' },
  { num: '3', title: 'Explore & Play', desc: 'Browse your collection, generate mood playlists, track value, and discover your vinyl from a new angle.' },
];

export const DEFAULT_SHOWCASE: CmsShowcase = {
  label: 'Your Collection',
  title: 'A Crate That',
  title_em: 'Knows Itself',
  subtitle: 'Every album in your collection is alive with data, art, and context.',
  checklist: [
    'High-res cover art from iTunes and MusicBrainz',
    'Live market valuations from Discogs',
    'Full tracklists with per-track lyrics',
    'AI-written poetic album descriptions',
    'Duplicate detection and smart categorization',
  ],
};

export const DEFAULT_SHOWCASE_CARDS: CmsShowcaseCard[] = [
  { gradient: 'var(--beige),var(--peach)', emoji: '\uD83C\uDFB6', title: 'Kind of Blue', artist: 'Miles Davis \u2022 1959', price: '$38.50' },
  { gradient: 'var(--sky),var(--slate)', emoji: '\uD83E\uDDE0', title: 'OK Computer', artist: 'Radiohead \u2022 1997', price: '$29.00' },
  { gradient: 'var(--peach-light),var(--slate)', emoji: '\uD83C\uDF2C', title: 'Purple Rain', artist: 'Prince \u2022 1984', price: '$22.75' },
  { gradient: 'var(--bg3),var(--slate-light)', emoji: '\uD83C\uDFB8', title: 'Rumours', artist: 'Fleetwood Mac \u2022 1977', price: '$41.00' },
];

export const DEFAULT_PLAYLIST_HEADER: CmsPlaylistHeader = {
  label: 'Playlist Studio',
  title: 'Spin a Mood,',
  title_em: 'Not Just a Record',
  subtitle: 'Tell Rekkrd a vibe and it builds a curated playlist from your actual collection. No streaming services, no algorithms from strangers.',
  checklist: [
    'Albums, sides, or individual songs',
    'Player and manifest views',
    'Print-ready PDF playlist cards',
    'Only picks albums that match from your crate',
  ],
};

export const DEFAULT_PLAYLIST_MOODS: string[] = [
  'Late Night Jazz',
  'Sunday Morning',
  'Road Trip Energy',
  'Rainy Day Vinyl',
];

export const DEFAULT_PLAYLIST_TRACKS: CmsPlaylistTrack[] = [
  { num: '01', cls: 'art-1', emoji: '\uD83C\uDFB7', title: 'So What', artist: 'Miles Davis \u2022 Kind of Blue', duration: '9:22' },
  { num: '02', cls: 'art-2', emoji: '\uD83E\uDDE0', title: 'Take Five', artist: 'Dave Brubeck \u2022 Time Out', duration: '5:24' },
  { num: '03', cls: 'art-3', emoji: '\uD83C\uDFBA', title: 'Round Midnight', artist: 'Thelonious Monk \u2022 Genius of Modern Music', duration: '5:47' },
  { num: '04', cls: 'art-4', emoji: '\uD83C\uDFB9', title: 'A Love Supreme Pt. I', artist: 'John Coltrane \u2022 A Love Supreme', duration: '7:43' },
];

export const DEFAULT_STAKKD: CmsShowcase = {
  label: 'Your Gear, Identified',
  title: 'Meet Stakkd',
  title_em: 'Your Audio Rig, Documented',
  subtitle: 'Snap a photo of any piece of gear \u2014 turntable, amp, speakers \u2014 and AI identifies it instantly. Get specs, history, manuals, and custom wiring guides for your exact setup.',
  checklist: [
    'AI-powered gear identification from photos',
    'Equipment history, specs & background',
    'Automatic manual finder with PDF links',
    'Custom setup & connection guides',
    'Signal chain visualization',
    'Drag-to-reorder your audio path',
  ],
};

export const DEFAULT_STATS_BAND: CmsStatItem[] = [
  { heading: '6 Sources', description: 'Enrichment from iTunes, MusicBrainz, Discogs, Gemini AI, and more' },
  { heading: '<3s', description: 'Average time from scan to fully enriched album entry' },
  { heading: '100%', description: 'Your data. Your collection. No ads, no tracking, no lock-in.' },
];

export const DEFAULT_TESTIMONIAL: CmsTestimonial = {
  quote: 'I scanned my entire crate in an afternoon. The playlist feature alone is worth it \u2014 it actually knows my collection better than I do.',
  author: 'Jordan M.',
  detail: 'Vinyl collector \u2022 340 records',
};

export const DEFAULT_FAQ_HEADER: { label: string; title: string } = {
  label: 'FAQ',
  title: 'Got Questions?',
};

export const DEFAULT_FAQS: CmsFaq[] = [
  { q: 'How does the AI scan work?', a: 'Point your phone camera at any vinyl record cover and snap a photo. Our Google Gemini-powered AI analyzes the image, identifies the artist and album, then pulls in tracklist, genre, cover art, pricing data, and more automatically. It works with most commercially released records and typically takes under 3 seconds.' },
  { q: 'Where does pricing data come from?', a: "Market valuations (low, median, and high) are sourced from Discogs, the world's largest music database and marketplace. This gives you real-world pricing based on actual recent sales, not guesswork." },
  { q: 'How do AI playlists work?', a: 'Type a mood or vibe like "Late Night Jazz" or "Sunday Morning Chill." The AI analyzes your actual collection and picks albums, sides, or individual songs that match. No hallucinated recommendations \u2014 every pick is something you own.' },
  { q: 'Can I try it before paying?', a: "Absolutely. Every new account gets a free 14-day trial of the Curator plan with full access to AI playlists, lyrics, and unlimited scans. After the trial, you can continue on the free Collector tier or upgrade to keep premium features." },
  { q: 'Is my data private?', a: "Your collection data is stored securely in Supabase (Postgres). We don't sell your data, serve ads, or track your listening habits. Your notes, tags, and collection details belong to you." },
  { q: "What if a scan doesn't recognize my record?", a: 'If the AI can\'t identify a cover, you can always search and add the album manually. Rekkrd pulls from iTunes and MusicBrainz databases with millions of releases.' },
  { q: 'What is Stakkd?', a: 'Stakkd is your personal audio gear catalog built into Rekkrd. Snap a photo of your turntable, amp, speakers, or any audio equipment \u2014 AI identifies it instantly and pulls up specs, history, and background. Think of it as Shazam for your gear.' },
  { q: 'Can Stakkd help me set up my equipment?', a: 'Yes! Once you\u2019ve added your gear, Stakkd generates a custom setup guide with wiring instructions, recommended settings, and tips specific to your exact equipment combination. It also finds PDF manuals for each piece of gear.' },
  { q: 'Is Stakkd included in the free plan?', a: 'Free Collector accounts can add up to 3 gear items manually. AI gear identification, the manual finder, and setup guide generation are available on the Curator plan and above. All plans include the signal chain visualization.' },
];

export const DEFAULT_FINAL_CTA: CmsFinalCta = {
  heading: 'Ready to <em>Rekkrd</em><br/>Your Collection?',
  description: 'Join thousands of collectors who\u2019ve digitized, valued, and rediscovered their vinyl with AI.',
  cta_primary: 'Start Free \u2014 No Card Required',
  cta_secondary: 'View Pricing',
};

export const DEFAULT_FOOTER: CmsFooter = {
  brand_description: 'The AI-powered vinyl collection manager for serious crate diggers and casual collectors alike.',
  copyright: '\u00A9 2025 Rekkrd. All rights reserved.',
  tagline: 'Made with \u2665 for vinyl lovers',
};

export const LANDING_DEFAULTS: CmsLandingContent = {
  hero: DEFAULT_HERO,
  proof_stats: DEFAULT_PROOF_STATS,
  features_header: DEFAULT_FEATURES_HEADER,
  features: DEFAULT_FEATURES,
  how_it_works_header: DEFAULT_HOW_IT_WORKS_HEADER,
  how_it_works: DEFAULT_HOW_IT_WORKS,
  showcase: DEFAULT_SHOWCASE,
  showcase_cards: DEFAULT_SHOWCASE_CARDS,
  playlist_header: DEFAULT_PLAYLIST_HEADER,
  playlist_moods: DEFAULT_PLAYLIST_MOODS,
  playlist_tracks: DEFAULT_PLAYLIST_TRACKS,
  stakkd: DEFAULT_STAKKD,
  stats_band: DEFAULT_STATS_BAND,
  testimonial: DEFAULT_TESTIMONIAL,
  faq_header: DEFAULT_FAQ_HEADER,
  faqs: DEFAULT_FAQS,
  final_cta: DEFAULT_FINAL_CTA,
  footer: DEFAULT_FOOTER,
};
