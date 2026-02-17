# Rekkrd - AI Coding Guidelines

> Primary reference document for AI agents working on this codebase.

---

## Project Context

Rekkrd is a **vinyl record collection management app** with AI-powered identification, metadata enrichment, and playlist generation.

**Core Flow:**
- User scans a vinyl record cover with their phone camera
- Gemini Vision identifies the album (artist, title, metadata)
- Album is saved to collection with cover art, condition grading, notes, and tags
- User can browse, search, sort, and filter their collection (grid + list views)
- PlaylistStudio generates mood-based playlists from the user's collection
- Lyrics lookup available per track

**Current State:**
- Deployed on Vercel (serverless functions + static frontend)
- Database & Storage: Supabase
- AI: Google Gemini API
- Full code review completed (41 tasks across 8 batches — all resolved)

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React + TypeScript | Vite build, TailwindCSS |
| Backend | Vercel Serverless Functions | `api/` directory, Node.js runtime |
| Database | Supabase (PostgreSQL) | Album storage, auth |
| Storage | Supabase Storage | Album photos, cover art |
| AI | Google Gemini API | Vision identification, metadata, covers, playlists |
| External APIs | iTunes Search, MusicBrainz | Cover art, metadata enrichment |
| Env Vars (Frontend) | `import.meta.env.VITE_*` | Vite auto-exposes; do NOT use `process.env` in frontend |
| Env Vars (Backend) | `process.env.*` | Standard Node.js pattern for `api/` functions |

---

## Key People

| Person | Role | Domain |
|--------|------|--------|
| **Clint** | Developer | Architecture, code, deployment |

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
│   └── PlaylistStudio.tsx   # AI playlist generator
├── constants/
│   └── conditionGrades.ts   # Shared condition grade constants
├── contexts/
│   └── ToastContext.tsx     # Toast notification system
├── hooks/
│   └── useFocusTrap.ts      # Focus trapping for modals
├── services/
│   ├── geminiService.ts     # Client-side Gemini API calls (via serverless)
│   └── supabaseService.ts   # Supabase client (DB + Storage)
├── types.ts                 # NewAlbum, Album, RawPlaylistItem
├── App.tsx                  # Main app component, state management
└── env.d.ts                 # ImportMetaEnv type declarations

api/                     # Vercel serverless functions
├── _auth.ts                 # Shared auth helper (Bearer token)
├── _constants.ts            # Shared constants (USER_AGENT)
├── _cors.ts                 # Shared CORS helper
├── _gemini.ts               # Shared Gemini client instance
├── _itunes.ts               # Shared iTunes search helper
├── _rateLimit.ts            # Shared rate limiting helper
├── _sanitize.ts             # Shared prompt sanitization
├── _types.ts                # Server-side API types
├── _validate.ts             # Shared input validation
├── covers.ts                # Cover art search (iTunes + MusicBrainz)
├── identify.ts              # Gemini Vision album identification
├── image-proxy.ts           # Image proxy (no auth, domain allowlist)
├── lyrics.ts                # Lyrics lookup
├── metadata.ts              # Metadata enrichment
├── playlist.ts              # AI playlist generation
└── upload-cover.ts          # Cover upload to Supabase Storage
```

### Type System

```typescript
// types.ts
NewAlbum    // Pre-save shape — no id, no created_at
Album       // Post-save shape — extends NewAlbum, required id: string + created_at: string
```

- `saveAlbum` accepts `NewAlbum`, returns `Album`
- All component props and state arrays use `Album` (required `id`)
- No optional `id` gymnastics — if it's saved, it has an `id`

---

## API Security Layers

All API routes apply middleware in this order:

```
1. CORS          → Preflight handling (before auth, so OPTIONS works)
2. Auth          → Bearer token from API_SECRET env var
3. Method check  → Restrict to expected HTTP method
4. Rate limiting → In-memory per-IP (Gemini endpoints only)
5. Input validation → Size/length limits
6. Sanitization  → Prompt injection prevention (Gemini endpoints only)
7. Handler logic
```

**Exception:** `image-proxy.ts` skips auth (called from `<img src>`, can't attach headers). Protected by domain allowlist + GET-only + Content-Type validation instead.

### Shared Helpers (api/_*.ts)

| File | Purpose |
|------|---------|
| `_auth.ts` | `requireAuth(req, res)` — checks Bearer token |
| `_cors.ts` | `cors(req, res, method)` — origin allowlist, preflight |
| `_rateLimit.ts` | `rateLimit(req, res, max?, window?)` — per-IP, in-memory |
| `_validate.ts` | `validateStringLength()`, `validateBase64Size()` |
| `_sanitize.ts` | Strips prompt injection patterns, truncates |
| `_gemini.ts` | Pre-configured Gemini client instance |
| `_itunes.ts` | `searchItunes(artist, title, limit?)` |
| `_constants.ts` | `USER_AGENT` constant |

---

## Environment Variables

### Frontend (Vite — use `import.meta.env.VITE_*`)
| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_API_SECRET` | Bearer token for API calls |

### Backend (Node.js — use `process.env.*`)
| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `API_SECRET` | Bearer token for auth |
| `GEMINI_API_KEY` | Google Gemini API key |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

**⚠️ Never use `process.env` in frontend code.** Vite uses `import.meta.env.VITE_*`. The old `define` block pattern was removed.

---

## Common Gotchas

### Image Uploads — MIME Type Extraction
`supabaseService.ts` extracts the actual MIME type from the base64 data URL prefix. Don't hardcode `image/jpeg` — PNGs and WebPs are supported.

### Condition Grades — Use the Shared Constant
`constants/conditionGrades.ts` is the single source of truth. DB stores short format (`'Mint'`, `'Near Mint'`), display uses long format (`'Mint (M)'`). Don't define inline arrays.

### Supabase Client Null
All `supabaseService` methods call `assertClient()` first and throw if Supabase isn't initialized. Callers have try/catch blocks.

### Camera Mirror
`CameraModal.tsx` conditionally mirrors the video feed — only when `facingMode === 'user'` (front camera). Back camera is not mirrored so album text is readable.

### PlaylistStudio — Reset Index
When generating a new playlist, `currentIndex` must be reset to 0 to avoid out-of-bounds crashes.

### SSRF Protection
`upload-cover.ts` validates URLs before fetching: HTTPS only, domain allowlist, DNS resolution with private IP blocking, no redirects.

### updateAlbum — Field Allowlist
`supabaseService.updateAlbum` uses an explicit `UPDATABLE_FIELDS` allowlist. The `...rest` spread pattern was removed. Protected fields (`id`, `created_at`) are silently dropped.

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
1. Claude provides Cursor prompts for all tasks
2. Developer implements in Cursor
3. Developer reports results one at a time
4. Claude reviews and logs as complete
5. Next batch begins

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

*Last updated: 2026-02-16*
