# Rekkrd - AI Coding Guidelines

> Primary reference document for AI agents working on this codebase.

---

## Project Context

Rekkrd is a **vinyl record collection management app** with AI-powered identification, metadata enrichment, playlist generation, gear cataloging, and a built-in blog.

**Core Flow:**
- User scans a vinyl record cover with their phone camera
- Gemini Vision identifies the album (artist, title, metadata)
- Album is saved to collection with cover art, condition grading, notes, and tags
- User can browse, search, sort, and filter their collection (grid + list views)
- PlaylistStudio generates mood-based playlists from the user's collection
- Stakkd lets users catalog their audio gear (turntables, amps, speakers, etc.) with AI identification
- Blog with AI-generated content and hero images via n8n automation
- Wantlist for tracking desired records with Discogs pricing
- Sellr offers vinyl collection appraisal services (one-time payments)

**Current State:**
- Deployed on IONOS VPS with Plesk management, PM2 process management, nginx reverse proxy
- Database & Storage: Supabase
- AI: Google Gemini API (Vision identification, content generation, image generation)
- Full code review completed (41 tasks across 8 batches — all resolved)
- 30+ feature batches completed

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React + TypeScript | Vite build, TailwindCSS |
| Backend | Express / Node.js | Standalone server, `server/` directory |
| Database | Supabase (PostgreSQL) | Album storage, auth, blog, gear, wantlist |
| Storage | Supabase Storage | Album photos, cover art, blog hero images, gear photos |
| AI | Google Gemini API | Vision identification, metadata, covers, playlists, blog content, image generation |
| External APIs | iTunes Search, MusicBrainz, Discogs | Cover art, metadata enrichment, pricing |
| Email | Resend | Onboarding, Sellr order emails, transactional triggers |
| Payments | Stripe | Subscriptions (Rekkrd plans) + one-time payments (Sellr) |
| Automation | n8n (self-hosted) | Blog content generation, image generation, Slack integration |
| CDN/Security | Cloudflare | DNS, CDN, SSL (Full Strict mode) |
| CI/CD | GitHub Actions | Auto-deploy on push to main via SSH |
| Env Vars (Frontend) | `import.meta.env.VITE_*` | Vite auto-exposes; do NOT use `process.env` in frontend |
| Env Vars (Backend) | `process.env.*` | Standard Node.js pattern for `server/` |

---

## Key People

| Person | Role | Domain |
|--------|------|--------|
| **Clint** | Founder / Developer | Architecture, code, deployment |

---

## Cursor Prompt Delivery

When providing Cursor IDE prompts, deliver each prompt as a standalone `.md` file artifact
that renders in the Claude chat canvas. Do NOT put Cursor prompts in inline code blocks.
This lets the user copy the full prompt cleanly from the canvas view.

---

## Operating Principles

### 1. Correctness Over Cleverness
Write code that is obviously correct, not code that is cleverly correct. Prefer boring, proven patterns over novel approaches.

### 2. Smallest Change That Works
Minimize blast radius. Don't refactor adjacent code unless explicitly requested. A bug fix is just a bug fix.

### 3. Leverage Existing Patterns
Before creating something new, search for existing implementations in the codebase. Mirror established conventions.

### 4. Prove It Works
Every change must be verifiable. Show what changed, how to verify, and what could break.

### 5. Be Explicit About Uncertainty
If you're not sure, say so. "I believe this will work because X" is better than silent assumptions.

---

## Project Architecture

### Directory Structure

```
src/
├── components/          # React components
│   ├── AlbumCard.tsx        # Grid view card
│   ├── AlbumDetailModal.tsx # Album detail/edit modal
│   ├── CameraModal.tsx      # Camera capture for identification
│   ├── CollectionList.tsx   # List/table view
│   ├── CoverPicker.tsx      # Cover art selection modal
│   ├── PlaylistStudio.tsx   # AI playlist generator
│   └── blog/
│       └── BlogFilterBar.tsx # Category/tag/search filter bar
├── constants/
│   └── conditionGrades.ts   # Shared condition grade constants
├── contexts/
│   └── ToastContext.tsx     # Toast notification system
├── hooks/
│   └── useFocusTrap.ts      # Focus trapping for modals
├── pages/
│   ├── BlogList.tsx         # Public blog list with filters
│   ├── BlogPost.tsx         # Public blog detail (markdown)
│   └── NotFound.tsx         # 404 page
├── services/
│   ├── geminiService.ts     # Client-side Gemini API calls (via server)
│   └── supabaseService.ts   # Supabase client (DB + Storage)
├── admin/
│   └── pages/
│       ├── BlogPage.tsx     # Admin blog management
│       └── BlogEditor.tsx   # Blog post editor with markdown preview
├── types.ts                 # NewAlbum, Album, NewGear, Gear, GearCategory, RawPlaylistItem
├── App.tsx                  # Main app component, state management
└── env.d.ts                 # ImportMetaEnv type declarations

server/                  # Express backend
├── index.ts                 # Express app, route registration, SPA fallback
├── routes/
│   ├── blog.ts              # Blog CRUD + categories + tags + generate-image
│   ├── identify.ts          # Gemini Vision album identification
│   ├── metadata.ts          # Metadata enrichment
│   ├── playlist.ts          # AI playlist generation
│   ├── covers.ts            # Cover art search
│   ├── lyrics.ts            # Lyrics lookup
│   ├── uploadCover.ts       # Cover upload to Supabase Storage
│   ├── imageProxy.ts        # Image proxy (no auth, domain allowlist)
│   ├── subscription.ts      # Subscription status
│   ├── checkout.ts          # Stripe checkout
│   ├── prices.ts            # Stripe prices (public)
│   ├── stripeWebhook.ts     # Stripe webhook handler
│   └── admin.ts             # Admin endpoints
├── services/
│   └── blogService.ts       # Blog post CRUD, categories, tags, full-text search
├── lib/
│   └── subscription.ts      # Plan limits, scan counting, tier checking
├── middleware/
│   └── adminAuth.ts         # Supabase JWT + admin role check
└── migrations/              # SQL migration files
```

### Type System

```typescript
// types.ts — Albums
NewAlbum    // Pre-save shape — no id, no created_at
Album       // Post-save shape — extends NewAlbum, required id: string + created_at: string

// types.ts — Gear (Stakkd)
GEAR_CATEGORIES  // Const array of allowed category values
GearCategory     // Union type derived from GEAR_CATEGORIES
NewGear          // Pre-save shape
Gear             // Post-save shape with id + created_at
```

- `saveAlbum` accepts `NewAlbum`, returns `Album`
- All component props and state arrays use `Album` (required `id`)
- No optional `id` gymnastics — if it's saved, it has an `id`
- Same pattern for `Gear` / `NewGear`

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `albums` | Vinyl record collection |
| `gear` | Stakkd audio equipment catalog |
| `blog_posts` | Blog articles (title, body, slug, category, tags, featured_image, search_vector) |
| `blog_ideas` | Blog idea pipeline (Slack workflow) |
| `profiles` | User profiles with subscription tier |
| `wantlist` | Desired records with Discogs pricing |

### Blog-Specific Schema Notes

- `category` column: CHECK constraint limits to `gear`, `collecting`, `culture`, `how-to`, `news`, `reviews`, `general`
- `search_vector` column: Generated tsvector from title (weight A), excerpt (weight B), body (weight C) — auto-computed
- `tags` column: TEXT[] array, queried with `.contains()`
- `image_prompt` column: Stores the Gemini prompt used to generate the hero image
- RPC functions: `get_blog_categories()` and `get_popular_blog_tags(tag_limit)` for aggregated counts

---

## API Security Layers

All API routes apply middleware in this order:

```
1. CORS          → Preflight handling (before auth, so OPTIONS works)
2. Auth          → Bearer token or Supabase JWT depending on route
3. Method check  → Restrict to expected HTTP method
4. Rate limiting → In-memory per-IP (Gemini endpoints only)
5. Input validation → Size/length limits
6. Sanitization  → Prompt injection prevention (Gemini endpoints only)
7. Handler logic
```

**Exception:** `imageProxy.ts` skips auth (called from `<img src>`, can't attach headers). Protected by domain allowlist + GET-only + Content-Type validation instead.

**Stripe webhook:** Mounted before `express.json()` with `express.raw()` so raw body is available for signature verification.

---

## Environment Variables

### Frontend (Vite — use `import.meta.env.VITE_*`)
| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_API_SECRET` | Bearer token for Rekkrd API calls |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (shared Rekkrd + Sellr) |
| `VITE_API_URL` | API base URL override (default: `''`) |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `VITE_SELLR_ADMIN_TOKEN` | Token for Sellr admin panel API calls |

### Backend (Node.js — use `process.env.*`)

**Core / Shared:**

| Variable | Purpose |
|----------|---------|
| `PORT` | Server listen port (default: `3001`, VPS uses `3002`) |
| `NODE_ENV` | `production` or `development` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin access, bypasses RLS) |
| `API_SECRET` | Bearer token for Rekkrd auth middleware |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `GEMINI_API_KEY` | Google Gemini API key |
| `RESEND_API_KEY` | Resend email API key |
| `BASE_URL` | Public site URL (`https://rekkrd.com`) |
| `APP_URL` | Public app URL (Stripe return URLs) |
| `SITE_URL` | Site URL for sitemap generation |
| `ADMIN_EMAIL` | Admin notification recipient |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile server-side secret |
| `BLOG_API_KEY` | Secret for blog admin write endpoints |
| `INTERNAL_ALERTS_SECRET` | Secret for internal alerts-check cron endpoint |

**Stripe:**

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret API key (shared subscriptions + Sellr) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (subscriptions) |
| `STRIPE_SELLR_WEBHOOK_SECRET` | Stripe webhook signing secret (Sellr payments) |
| `STRIPE_PRICE_CURATOR_MONTHLY` | Stripe Price ID for Curator monthly |
| `STRIPE_PRICE_CURATOR_ANNUAL` | Stripe Price ID for Curator annual |
| `STRIPE_PRICE_ENTHUSIAST_MONTHLY` | Stripe Price ID for Enthusiast monthly |
| `STRIPE_PRICE_ENTHUSIAST_ANNUAL` | Stripe Price ID for Enthusiast annual |

**Discogs:**

| Variable | Purpose |
|----------|---------|
| `DISCOGS_CONSUMER_KEY` | Discogs OAuth consumer key |
| `DISCOGS_CONSUMER_SECRET` | Discogs OAuth consumer secret |
| `DISCOGS_PERSONAL_TOKEN` | Discogs personal access token |
| `DISCOGS_USER_AGENT` | User-Agent string for Discogs API |
| `DISCOGS_CALLBACK_URL` | OAuth callback URL |

**Sellr-specific:**

| Variable | Purpose |
|----------|---------|
| `SELLR_ADMIN_TOKEN` | Bearer token for Sellr admin endpoints |

**⚠️ Never use `process.env` in frontend code.** Vite uses `import.meta.env.VITE_*`.

---

## Deployment

### Infrastructure
- **Hosting:** IONOS VPS with Plesk panel
- **Domain:** rekkrd.com
- **DNS:** Cloudflare (nameservers pointed from IONOS)
- **SSL:** Let's Encrypt via Plesk (auto-renews)
- **Cloudflare SSL mode:** Full (Strict)

### Server Details
- **VPS IP:** 82.165.209.226
- **SSH Port:** 2222 (port 22 is firewalled)
- **Node.js:** v18.18.1
- **PM2:** v6.0.13
- **Express API port:** 3002 (port 3001 reserved by Plesk)
- **App directory:** `/var/www/vhosts/rekkrd.com/app/`
- **Web root:** `/var/www/vhosts/rekkrd.com/httpdocs/`
- **PM2 start script:** `~/app/start.sh`
- **GitHub repo:** `github.com/boilermanc/crowe_collection`

### start.sh
```bash
#!/bin/bash
cd /var/www/vhosts/rekkrd.com/app
PORT=3002 exec ./node_modules/.bin/tsx server/index.ts
```

### CI/CD
GitHub Actions auto-deploys on push to `main` via `appleboy/ssh-action@v1`. The workflow SSHs in, pulls, installs, builds, copies dist to httpdocs, and restarts PM2.

### Nginx (Plesk → Additional nginx directives)
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
}
```
Each SPA route needs its own `location` block for direct URL navigation:
```nginx
location /blog { try_files $uri /index.html; }
location /admin { try_files $uri /index.html; }
location /collection { try_files $uri /index.html; }
location /stakkd { try_files $uri /index.html; }
location /sellr { try_files $uri /index.html; }
location /login { try_files $uri /index.html; }
location /signup { try_files $uri /index.html; }
location /onboarding { try_files $uri /index.html; }
```

### Deployment Gotchas
- **PM2 + nodenv shims don't mix** — use `start.sh` wrapper
- **Plesk owns `location /`** — can't use `try_files` there, need explicit SPA route blocks
- **Cloudflare proxy (orange cloud) must be OFF** when issuing/renewing Let's Encrypt certs
- **Express routes include `/api/` prefix** — nginx `proxy_pass` should NOT have trailing slash
- **Plesk bash terminal** — select `/bin/bash` when opening

---

## n8n Automation

Self-hosted n8n at `https://n8n.sproutify.app`

### Active Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| Rekkrd Blog - Slash Command | `/blog-idea` Slack command | Generates 5 blog title/angle options via Gemini, posts as Slack buttons |
| Rekkrd Blog - Interactions | Slack button clicks | Handles option selection → writes full draft → preview with approve/reject |
| Rekkrd Blog - Post Submit | `/blog-post` Slack command | Receives full written post, parses with Gemini, generates hero image, posts for approval |
| Rekkrd Blog - Image Generation | Webhook from approval flow | Generates hero image via Gemini image generation (Nano Banana), uploads to Supabase Storage |

### n8n Conventions
- Use `$http.request()` in Code nodes, NOT `fetch` (n8n compatibility)
- Use native Supabase nodes for DB operations when possible
- Code nodes only for parsing/formatting logic
- Slack interactivity URL points to the Interactions workflow webhook
- All workflows use the same Gemini credential and Supabase credential

---

## TypeScript Standards

### Baseline check
`npx tsc --noEmit` must return 0 errors before any task is marked complete.
No manual flags needed — noImplicitAny and strictNullChecks are locked in tsconfig.json.

### Server-side compilation
Server directory uses a separate `tsconfig.server.json` (strict: true, moduleResolution: node).
Check server errors independently with: `npx tsc --project tsconfig.server.json`

### Type safety rules
- Never use `any` explicitly — find the right type or use `unknown` with a guard
- Null guards go at the top of functions, not inline at every call site
- Supabase admin null pattern: `if (!supabase) throw new Error('Supabase admin not configured')`
- useRef always requires an initial value: `useRef<Type>(undefined)` not `useRef<Type>()`
- Catch block errors: cast with `(error as Error).message`

### Required devDependencies (do not remove)
- @types/react
- @types/react-dom
- @types/node
These are not optional — removing them will silently break type checking across the entire codebase.

---

## Common Gotchas

### Image Uploads — MIME Type Extraction
`supabaseService.ts` extracts the actual MIME type from the base64 data URL prefix. Don't hardcode `image/jpeg` — PNGs and WebPs are supported.

### Condition Grades — Use the Shared Constant
`constants/conditionGrades.ts` is the single source of truth. DB stores short format (`'Mint'`, `'Near Mint'`), display uses long format (`'Mint (M)'`). Don't define inline arrays.

### Supabase Client Null
All `supabaseService` methods call `assertClient()` first and throw if Supabase isn't initialized. Callers have try/catch blocks.

### Supabase Schema Cache
After adding columns via ALTER TABLE, PostgREST schema cache may be stale. Run `NOTIFY pgrst, 'reload schema';` to refresh.

### Camera Mirror
`CameraModal.tsx` conditionally mirrors the video feed — only when `facingMode === 'user'` (front camera). Back camera is not mirrored so album text is readable.

### PlaylistStudio — Reset Index
When generating a new playlist, `currentIndex` must be reset to 0 to avoid out-of-bounds crashes.

### SSRF Protection
`upload-cover.ts` validates URLs before fetching: HTTPS only, domain allowlist, DNS resolution with private IP blocking, no redirects.

### updateAlbum — Field Allowlist
`supabaseService.updateAlbum` uses an explicit `UPDATABLE_FIELDS` allowlist. Protected fields (`id`, `created_at`) are silently dropped.

### Blog Route Ordering
Admin routes (`/admin/*`), `/categories`, `/tags`, and `/generate-image` must be registered BEFORE the `/:slug` catch-all parameter, otherwise they get interpreted as slugs.

---

## Accessibility

All modals use:
- `useFocusTrap` hook (focus trapping, Escape-to-close, focus restoration)
- `role="dialog"`, `aria-modal="true"`, `aria-label`
- `tabIndex={-1}` on container

Other accessibility:
- Home/logo is a `<button>` with `aria-label`
- Favorites toggle uses `role="switch"` + `aria-checked`
- CollectionList has full ARIA table roles (`role="table"`, `columnheader`, `aria-sort`)
- Viewport allows pinch-to-zoom (no `user-scalable=no`)
- Delete button accessible on mobile (44px touch target)
- Album images have descriptive alt text: `"Album cover for {title} by {artist}"`
- Blog filter bar: `role="radiogroup"` + `aria-pressed` on category/tag chips
- All interactive elements require ARIA labels

---

## Communication Guidelines

### Concise High-Signal
- Lead with the answer
- Bullet points over paragraphs
- Code over explanation when possible

### Ask Only When Blocked
Don't ask for clarification if you can make a reasonable assumption. State the assumption instead.

### Show Verification Story
Don't just say "done." Show:
- What changed
- How to verify
- What could break

---

## Workflow

### Batch Task Workflow
Tasks are worked in batches of 5. For each batch:
1. Claude provides Cursor prompts for all tasks (delivered as .md artifacts in chat canvas)
2. Developer implements in Cursor
3. Developer reports results one at a time
4. Claude reviews and logs as complete
5. Next batch begins

### Cursor Prompt Format
- Deliver each prompt as a standalone `.md` file rendered in the Claude chat canvas
- Do NOT put Cursor prompts in inline code blocks
- User copies the full prompt from the canvas view

### Control Scope Creep
If you notice adjacent improvements, log them as future tasks. Don't fix them now unless explicitly asked.

---

## Definition of Done

A task is complete when:

- [ ] Code compiles with no new TypeScript errors
- [ ] Functionality works as specified
- [ ] Edge cases handled
- [ ] No console errors in browser
- [ ] Mobile responsive (if UI change)
- [ ] Existing behavior preserved (unless explicitly changing it)
- [ ] Verification steps documented

---

## Sellr — Stripe Setup

Step-by-step checklist for creating Stripe products before Sellr launch:

1. **Create 3 Products in Stripe Dashboard**
   Sellr uses `PaymentIntent` (one-time payments), not `Price` objects:
   - "Sellr Starter Appraisal" — $4.99
   - "Sellr Standard Appraisal" — $14.99
   - "Sellr Full Collection Appraisal" — $29.99

2. **Create a Webhook endpoint** pointing to:
   ```
   https://rekkrd.com/api/sellr/checkout/webhook
   ```
   Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

3. **Copy webhook signing secret** to `STRIPE_SELLR_WEBHOOK_SECRET`

4. **Important:** Sellr uses a **separate** webhook secret from subscriptions. Do not mix.

---

## Sellr — Resend Setup

1. Verify `rekkrd.com` domain in Resend
2. Confirm `appraisals@rekkrd.com` sending address
3. Test all 5 email templates via admin Tools panel

---

*Last updated: 2026-03-02*