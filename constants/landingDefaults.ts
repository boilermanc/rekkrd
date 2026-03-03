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
} from '../src/types/cms';

export const DEFAULT_HERO: CmsHero = {
  badge: 'AI-Powered Collection',
  heading: 'Your Music<br/>Collection, <em>Reimagined.</em>',
  subheading: 'Scan, catalog, and rediscover your music collection with AI. Get instant identification, valuations, tracklists, and curated playlists from what you already own.',
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
  subtitle: 'From AI scanning to playlist curation, Rekkrd is the most complete music collection companion ever built.',
};

export const DEFAULT_FEATURES: CmsFeature[] = [
  { icon: '\uD83D\uDCF7', cls: 'fi-1', title: 'AI Camera Scan', tier: 'all', desc: 'Photograph any vinyl, cassette, or 8-track \u2014 or scan the barcode. Rekkrd cross-references Discogs\u2019 40M+ release database to identify the exact pressing, pull the tracklist, and price it in seconds.' },
  { icon: '\u26A1', cls: 'fi-2', title: 'Auto Enrichment', tier: 'all', desc: 'Every album gets filled in automatically: tracklist, genre, year, cover art, market pricing, AI description, and streaming links.' },
  { icon: '\uD83D\uDCB0', cls: 'fi-3', title: 'Collection Valuation', tier: 'all', desc: 'See low, median, and high market prices pulled from Discogs. Know what your crate is worth at a glance with portfolio stats.' },
  { icon: '\uD83C\uDFB5', cls: 'fi-4', title: 'Playlist Studio', tier: 'curator', desc: 'Type a mood. Get a curated playlist from your own collection. Choose albums, sides, or individual songs. Print to PDF.' },
  { icon: '\uD83D\uDD0D', cls: 'fi-5', title: 'Smart Search & Filter', tier: 'all', desc: 'Real-time search across title, artist, and genre. Sort by year, value, or date added. Filter by decade, condition, format, or favorites.' },
  { icon: '\uD83C\uDFB6', cls: 'fi-6', title: 'Lyrics & Liner Notes', tier: 'curator', desc: 'Look up lyrics for any track in your collection. Add personal notes, tags, and condition grades to every album.' },
  { icon: '\uD83D\uDD27', cls: 'fi-stakkd', title: 'Stakkd Gear Catalog', tier: 'curator', desc: 'Document your audio equipment with AI. Get instant identification, specs, history, manuals, and custom setup guides for your entire signal chain.' },
  { icon: '\uD83D\uDCC8', cls: 'fi-analytics', title: 'Collection Analytics', tier: 'enthusiast', desc: 'Track your collection\u2019s value over time, see genre breakdowns, and discover insights about your listening habits.' },
  { icon: '\uD83D\uDCBF', cls: 'fi-format', title: 'Vinyl, Cassette & 8-Track', tier: 'all', desc: 'Your whole collection, not just vinyl. AI detects the physical format automatically and color-codes everything \u2014 orange for vinyl, mint for cassette, plum for 8-track.' },
  { icon: '\uD83C\uDFA7', cls: 'fi-listening', title: 'Listening Room', tier: 'all', desc: 'Build ambient listening sessions from your collection. Queue albums, toggle ambient mode for a distraction-free dark interface, and save sessions as playlists.' },
  { icon: '\uD83D\uDD01', cls: 'fi-spins', title: 'Spins & Play History', tier: 'all', desc: 'Log every record you spin. Track play counts, see your most-played leaderboard, browse recent spins grouped by date, and discover patterns in your listening.' },
  { icon: '\uD83D\uDCCB', cls: 'fi-wantlist', title: 'Wantlist & Price Tracking', tier: 'all', desc: 'Track records you\u2019re hunting with live Discogs pricing. Import your Discogs wantlist, set price alerts, and mark as owned when you find them.' },
];

export const DEFAULT_HOW_IT_WORKS_HEADER: CmsSectionHeader = {
  label: 'How It Works',
  title: 'Three Steps to a Smarter Crate',
  subtitle: 'From physical media to digital library in seconds.',
};

export const DEFAULT_HOW_IT_WORKS: CmsStep[] = [
  { num: '1', title: 'Scan or Add', desc: 'Point your camera at any album \u2014 vinyl, cassette, or 8-track. AI identifies it instantly, or search and add manually.' },
  { num: '2', title: 'Enrich Automatically', desc: 'Tracklist, genre, cover art, market price, and an AI description all populate in seconds.' },
  { num: '3', title: 'Explore & Play', desc: 'Browse your collection, generate mood playlists, track value, and discover your music from a new angle.' },
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
    'Launch any playlist into the Listening Room',
  ],
};

export const DEFAULT_PLAYLIST_MOODS: string[] = [
  'Late Night Jazz',
  'Sunday Morning',
  'Road Trip Energy',
  'Rainy Day Listening',
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
    'Signal chain visualization & drag-to-reorder',
    'Automatic manual finder with PDF links (Curator)',
    'Custom setup & connection guides (Curator)',
    'Room Planner \u2014 room layout, dimensions & gear placement (Enthusiast)',
  ],
};

export const DEFAULT_LISTENING_ROOM: CmsShowcase = {
  label: 'Listening Room',
  title: 'Set the Mood,',
  title_em: 'Not Just a Track',
  subtitle: 'Browse your collection, build a session queue, and let ambient mode set the tone. Save your sessions as playlists and pick up right where you left off.',
  checklist: [
    'Browse and queue albums for your session',
    'Now Spinning display with fullscreen art mode',
    'Ambient dark mode for immersive listening',
    'Drag-and-drop reorder your session queue',
    'Save sessions as playlists with one click',
    'Deep-link from Playlist Studio to start listening',
  ],
};

export const DEFAULT_SPINS: CmsShowcase = {
  label: 'Spins',
  title: 'Every Spin,',
  title_em: 'Remembered',
  subtitle: 'Log what you play and discover patterns in your listening. See your most-played records, browse recent spins, and track how your habits evolve.',
  checklist: [
    'One-tap "Now Spinning" logging from any album',
    'Most-played leaderboard with play counts',
    'Recent spins timeline grouped by date',
    'Spin stats at a glance',
    'Available on all plans \u2014 no upgrade required',
  ],
};

export const DEFAULT_STATS_BAND: CmsStatItem[] = [
  { heading: '6 Sources', description: 'Enrichment from iTunes, MusicBrainz, Discogs, Gemini AI, and more' },
  { heading: '<3s', description: 'Average time from scan to fully enriched album entry' },
  { heading: '100%', description: 'Your data. Your collection. No ads, no tracking, no lock-in.' },
  { heading: '40M+', description: 'Discogs releases in our database' },
];

export const DEFAULT_TESTIMONIAL: CmsTestimonial = {
  quote: 'I scanned my entire crate in an afternoon. The playlist feature alone is worth it \u2014 it actually knows my collection better than I do.',
  author: 'Jordan M.',
  detail: 'Music collector \u2022 340 records',
};

export const DEFAULT_FAQ_HEADER: { label: string; title: string } = {
  label: 'FAQ',
  title: 'Got Questions?',
};

export const DEFAULT_FAQS: CmsFaq[] = [
  { q: 'How does the AI scan work?', a: 'Point your phone camera at any album cover \u2014 vinyl, cassette, or 8-track \u2014 and snap a photo. Our Google Gemini-powered AI analyzes the image, identifies the artist and album, detects the physical format, then pulls in tracklist, genre, cover art, pricing data, and more automatically. It works with most commercially released music and typically takes under 3 seconds.' },
  { q: 'Does Rekkrd connect to my Discogs account?', a: 'Yes. You can import your entire Discogs collection with one click, sync your wantlist with live pricing, and set price alerts for records you\u2019re hunting. Rekkrd uses Discogs as its primary pricing and release database.' },
  { q: 'Where does pricing data come from?', a: "Market valuations (low, median, and high) are sourced from Discogs, the world's largest music database and marketplace. This gives you real-world pricing based on actual recent sales, not guesswork." },
  { q: 'How do AI playlists work?', a: 'Type a mood or vibe like "Late Night Jazz" or "Sunday Morning Chill." The AI analyzes your actual collection and picks albums, sides, or individual songs that match. No hallucinated recommendations \u2014 every pick is something you own.' },
  { q: 'Can I try it before paying?', a: "Absolutely. Every new account gets a free 7-day trial of the Curator plan with full access to AI playlists, lyrics, and unlimited scans. After the trial, you can continue on the free Collector tier or upgrade to keep premium features." },
  { q: 'Is my data private?', a: "Your collection data is stored securely in Supabase (Postgres). We don't sell your data, serve ads, or track your listening habits. Your notes, tags, and collection details belong to you." },
  { q: "What if a scan doesn't recognize my record?", a: 'If the AI can\'t identify a cover, you can always search and add the album manually. Rekkrd pulls from iTunes and MusicBrainz databases with millions of releases.' },
  { q: 'What is Stakkd?', a: 'Stakkd is your personal audio gear catalog built into Rekkrd. Snap a photo of your turntable, amp, speakers, or any audio equipment \u2014 AI identifies it instantly and pulls up specs, history, and background. Think of it as Shazam for your gear.' },
  { q: 'Can Stakkd help me set up my equipment?', a: 'Yes! Once you\u2019ve added your gear, Stakkd generates a custom setup guide with wiring instructions, recommended settings, and tips specific to your exact equipment combination. It also finds PDF manuals for each piece of gear.' },
  { q: 'Is Stakkd included in the free plan?', a: 'Free Collector accounts can add up to 3 gear items with signal chain visualization. AI gear identification, the manual finder, and setup guides unlock on the Curator plan. The Room Planner \u2014 with room layout, dimensions, acoustics, and gear placement \u2014 is available on the Enthusiast plan.' },
  { q: 'What is the Listening Room?', a: 'The Listening Room is an ambient listening experience built into Rekkrd. Browse your collection, build a session queue with drag-and-drop, set what\u2019s "Now Spinning," and toggle ambient mode for a distraction-free dark interface. You can save any session as a playlist. Available on all plans.' },
  { q: 'What is Spins?', a: 'Spins tracks every record you play. Tap "Now Spinning" on any album to log it. You\u2019ll see play counts, a most-played leaderboard, and a timeline of recent spins grouped by date. Spins is included on all plans \u2014 no upgrade needed.' },
];

export const DEFAULT_FINAL_CTA: CmsFinalCta = {
  heading: 'Ready to <em>Rekk<span>r</span>d</em><br/>Your Collection?',
  description: 'Join thousands of collectors who\u2019ve digitized, valued, and rediscovered their collection with AI.',
  cta_primary: 'Start Free \u2014 No Card Required',
  cta_secondary: 'View Pricing',
};

export const DEFAULT_FOOTER: CmsFooter = {
  brand_description: 'The AI-powered music collection manager for vinyl, cassette & 8-track \u2014 built for serious crate diggers and casual collectors alike.',
  copyright: '\u00A9 2026 Sweetwater Technology',
  tagline: 'Made with \u2665 for music collectors',
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
  listening_room: DEFAULT_LISTENING_ROOM,
  spins: DEFAULT_SPINS,
  stats_band: DEFAULT_STATS_BAND,
  testimonial: DEFAULT_TESTIMONIAL,
  faq_header: DEFAULT_FAQ_HEADER,
  faqs: DEFAULT_FAQS,
  final_cta: DEFAULT_FINAL_CTA,
  footer: DEFAULT_FOOTER,
};
