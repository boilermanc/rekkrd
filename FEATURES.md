# Rekkrd — Feature & Function Overview

> Comprehensive overview of all features, services, and capabilities.
> Last updated: 2026-02-19

---

## Product Summary

Rekkrd is an AI-powered vinyl record collection manager with two core products:

1. **Collection Manager** — Scan, catalog, and explore your vinyl records
2. **Stakkd** — Catalog your audio gear and visualize your signal chain

Monetized via three subscription tiers (Free / Curator $4.99/mo / Enthusiast $9.99/mo) with Stripe billing.

---

## 1. AI Album Identification & Scanning

| Detail | Value |
|--------|-------|
| Entry Point | Camera button in header |
| AI Provider | Google Gemini Vision (1.5 Flash) |
| API Endpoint | `POST /api/identify` |

- Photograph a vinyl cover with your phone camera (or upload an existing photo)
- Gemini Vision identifies artist, title, and metadata from the image
- Metadata enrichment pulls year, genre, tracklist, cover art, and pricing from iTunes + MusicBrainz
- Duplicate detection prevents saving albums already in the collection
- Free tier: 10 AI scans/month — paid tiers: unlimited

---

## 2. Collection Views & Organization

### View Modes
| View | Description |
|------|-------------|
| **Landing** | Quick-action dashboard (Browse Crate, Collection List, Spin Playlist, Scan Record) |
| **Grid** | Visual gallery of album covers (2–5 columns, responsive, 40 per page) |
| **List** | Sortable data table with full details |

### Search, Filter & Sort
- Real-time search across artist, title, genre
- Year range filter (From / To)
- Favorites-only toggle
- Sort: Recent, Year, Artist, Title, Value

---

## 3. Album Detail Management

Accessed via album card click → modal overlay.

- Cover art display with multi-source picker (iTunes, MusicBrainz, Discogs)
- Condition grading: Mint → Poor (shared constant, DB stores short form)
- Tags, personal notes, play count tracker
- Market pricing (low / median / high)
- Favorite toggle
- Lyrics lookup per track (LRCLIB API, paid tiers)
- External links to Discogs & MusicBrainz
- Delete with confirmation toast

---

## 4. Playlist Studio

> Curator / Enthusiast tiers only

| Detail | Value |
|--------|-------|
| API Endpoint | `POST /api/playlist` |
| Rate Limit | 5 req/min |

- Mood-based playlist generation from the user's own collection
- Playlist types: Album, Side (A/B), Song-level
- Gemini analyzes collection metadata to curate a tracklist
- Playback controls: play/pause, skip, progress bar, album art
- Save & reload playlists

---

## 5. Stakkd — Audio Gear Catalog

### Gear Identification
| Detail | Value |
|--------|-------|
| API Endpoint | `POST /api/identify-gear` |
| Rate Limit | 10 req/min |

- Guided 3-step camera flow: front panel → back label → review
- Gemini identifies category, brand, model, year, specs
- Confirmation modal for user edits before saving
- Manual entry alternative (no camera required)
- Supported categories: Turntable, Cartridge, Phono Preamp, Preamp, Amplifier, Receiver, Speakers, Headphones, DAC, Subwoofer, Cables/Other
- Free tier: 3 gear items max — paid tiers: unlimited

### Signal Chain
- Drag-to-reorder on desktop, up/down buttons on mobile
- Visual connectors (arrows) between gear items
- Position persisted to DB
- Sort modes: Signal Chain, Brand A–Z, Newest First, Category
- Category chip filters

### Gear Details
- Full specs display (key/value)
- Purchase price & date tracking
- Photo gallery (front + back)
- Personal notes
- Edit / Delete

### Manual Finder (Paid)
- `POST /api/find-manual` — AI-powered PDF manual search

### Setup Guide Generator (Paid)
- `POST /api/setup-guide` — Generates wiring instructions, cable types, optimal settings, and safety warnings based on all gear in the collection

---

## 6. Authentication & Onboarding

| Provider | Method |
|----------|--------|
| Supabase Auth | Email / Password |

- Sign up → auto-creates profile row
- Session persists across visits (auto-login)
- Onboarding wizard for new users (welcome, feature highlights, first-record CTA)
- Auth panel overlays the landing page (no separate route)

---

## 7. Subscription & Billing

### Tiers

| Feature | Collector (Free) | Curator ($4.99/mo) | Enthusiast ($9.99/mo) |
|---------|:-:|:-:|:-:|
| Albums | 100 | Unlimited | Unlimited |
| AI Scans | 10/month | Unlimited | Unlimited |
| Gear Items | 3 | Unlimited | Unlimited |
| AI Playlists | — | Yes | Yes |
| Lyrics | — | Yes | Yes |
| Cover Picker | — | Yes | Yes |
| Manual Finder | — | Yes | Yes |
| Setup Guide | — | Yes | Yes |
| Bulk Import/Export | — | — | Planned |
| API Access | — | — | Planned |

### Stripe Integration
- `POST /api/checkout` — Creates Stripe Checkout session
- `POST /api/stripe-webhook` — Processes subscription events
- `GET /api/prices` — Fetches live pricing for landing page
- Customer billing portal for self-service management
- 14-day free trial on paid tiers
- Annual pricing option (18% savings)

### Upgrade Prompts
Context-aware modals appear when a free user hits a feature gate (album limit, scan limit, gear limit, or gated feature).

---

## 8. Landing Page & Marketing

Multi-section public landing page with:

1. **Hero** — Brand headline, dual CTA, spinning vinyl animation
2. **Proof Bar** — Dynamic stats (albums scanned, collections managed, value tracked)
3. **Features Grid** — 6 feature cards (AI ID, Cataloging, Playlists, Stakkd, Metadata, Grading)
4. **How It Works** — 3-step flow (Scan → Catalog → Explore)
5. **Collection Showcase** — Mock album cards + feature checklist
6. **Playlist Demo** — Interactive mood chips + track preview
7. **Stakkd Section** — Signal chain visualization
8. **Stats Band** — Market value, insights, genre breakdown
9. **Testimonial** — User quote
10. **Pricing Table** — 3-tier comparison with monthly/annual toggle
11. **FAQ Accordion** — Common questions
12. **Blog Preview** — Latest published post
13. **Final CTA** — Conversion section
14. **Footer** — Nav links (Features, Pricing, FAQ, Blog, Support, Privacy, Terms)

All section content is CMS-editable from the admin panel.

---

## 9. Blog System

### Public Blog
| Route | Component |
|-------|-----------|
| `/blog` | Paginated grid (9 posts/page) with featured images, excerpts, tags |
| `/blog/:slug` | Full post with markdown rendering, SEO meta tags, JSON-LD schema |

### Admin Blog Editor
- Rich text editor (Tiptap: bold, italic, lists, links, blockquotes)
- Title, slug, excerpt, author, featured image, tags
- Draft / Published status, publish date picker
- Blog Ideas tracker with status workflow (Pending → Draft Ready → Published)

---

## 10. Support Center

| Route | Features |
|-------|----------|
| `/support` | FAQ accordion (5 topics) + contact form |

- Contact form: name, email, subject category, message
- Subject categories: Technical Support, Billing, Account, Feature Request, Bug Report, Other
- Sends email via Resend API to `support@rekkrd.com`
- `POST /api/support` — rate limited to 5 req/hour

---

## 11. Admin Panel

Protected by password (`ADMIN_PASSWORD` env var), session in localStorage.

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard — total customers, albums, portfolio value, top genre, recent signups |
| `/admin/customers` | User table — email, plan, album count, signup date, searchable |
| `/admin/collections` | All albums across users — stats, genre/decade breakdown |
| `/admin/emails` | Email template builder (Resend integration) |
| `/admin/content` | Landing page CMS — edit all section content in-place |
| `/admin/blog` | Blog post CRUD + ideas tracker |

---

## 12. SEO & Metadata

- `<SEO />` component (React Helmet Async) on every page
- Dynamic `<title>`, meta description, Open Graph, Twitter Card tags
- Blog posts include `BlogPosting` JSON-LD schema for rich snippets
- Per-page customization (Landing, Blog, Support, etc.)

---

## 13. Design System

| Token | Value |
|-------|-------|
| Primary (Peach) | `#dd6e42` |
| Secondary (Slate) | `#4f6d7a` |
| Accent (Beige) | `#c0d6df` |
| Background (Cream) | `#e8e2d6` / `#f7f4ef` |
| Display Font | Playfair Display (serif) |
| Label Font | Space Mono (monospace) |
| Body Font | System UI stack |

- Light / Dark mode toggle (persisted in localStorage)
- CSS custom properties for theming (`--th-bg`, `--th-text`, `--th-surface`)
- Glass morphism, neon borders, spinning record animations

---

## 14. API Endpoint Reference

### Album APIs (Auth Required)
| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|------------|
| `/api/identify` | POST | AI album identification | 10/min |
| `/api/metadata` | POST | Metadata enrichment | — |
| `/api/covers` | POST | Cover art search | — |
| `/api/lyrics` | POST | Lyrics lookup | — |
| `/api/playlist` | POST | AI playlist generation | 5/min |
| `/api/upload-cover` | POST | Cover upload to storage | — |

### Gear APIs (Auth Required)
| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|------------|
| `/api/identify-gear` | POST | AI gear identification | 10/min |
| `/api/find-manual` | POST | PDF manual search | — |
| `/api/setup-guide` | POST | Wiring guide generation | — |

### Subscription APIs
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/subscription` | GET | Bearer | Current plan status |
| `/api/prices` | GET | None | Stripe pricing |
| `/api/checkout` | POST | Bearer | Create checkout session |
| `/api/stripe-webhook` | POST | Stripe Sig | Webhook events |

### Content APIs
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/blog` | GET | None | Published posts (paginated) |
| `/api/support` | POST | None | Send support email (5/hr) |
| `/api/image-proxy` | GET | None | Proxy external images |
| `/api/admin` | * | Admin | Admin CRUD operations |

---

## 15. Security

**API middleware chain** (applied in order):
1. CORS — origin allowlist, preflight
2. Auth — Bearer token (JWT from Supabase)
3. Method check — restrict to expected verb
4. Rate limiting — per-IP, in-memory (Gemini endpoints)
5. Input validation — string length, base64 size limits
6. Sanitization — prompt injection prevention (Gemini endpoints)

**Database:** Row-Level Security on all tables, explicit field allowlists on updates, service role key never exposed to frontend.

**SSRF protection** on `upload-cover.ts`: HTTPS only, domain allowlist, DNS resolution with private IP blocking, no redirects.

---

## 16. Routing Map

### Public Routes
| Route | Page |
|-------|------|
| `/` | Main app (landing / grid / list / stakkd) |
| `/blog` | Blog archive |
| `/blog/:slug` | Blog post |
| `/support` | FAQ + contact form |
| `/terms` | Terms of Service |
| `/privacy` | Privacy Policy |
| `*` | 404 page |

### Admin Routes (Protected)
| Route | Page |
|-------|------|
| `/admin` | Dashboard |
| `/admin/customers` | User management |
| `/admin/collections` | All albums |
| `/admin/emails` | Email templates |
| `/admin/content` | Landing page CMS |
| `/admin/blog` | Blog editor |

---

## 17. Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript, Vite, TailwindCSS |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Supabase (PostgreSQL + RLS) |
| Storage | Supabase Storage (album photos, gear photos, blog images) |
| AI | Google Gemini 1.5 Flash |
| Payments | Stripe (Checkout, Webhooks, Customer Portal) |
| Email | Resend |
| External Data | iTunes Search API, MusicBrainz, LRCLIB |
| SEO | React Helmet Async, JSON-LD |
| Rich Text | Tiptap |
| Deployment | Vercel (serverless + static) |

---

*Generated from codebase analysis — 2026-02-19*
