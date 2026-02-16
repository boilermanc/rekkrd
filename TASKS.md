# Rekkrd — Code Review Tasks

Deployment target: **Vercel**
Review date: **2025-02-15**

---

## Critical

- [ ] **Add authentication to all API endpoints**
  - All 7 routes in `api/` are fully public — no auth, tokens, or API keys
  - `upload-cover.ts` lets anyone modify album records and upload to Supabase storage
  - `identify.ts`, `metadata.ts`, `playlist.ts` expose Gemini API usage to the public
  - At minimum, add a shared secret or Supabase JWT verification

- [ ] **Fix SSRF in `upload-cover.ts`**
  - `upload-cover.ts:26-32` — `imageUrl` from user is fetched with zero URL validation
  - Could be used to hit cloud metadata (`169.254.169.254`), internal services, or `file://` URIs
  - `redirect: 'follow'` makes it worse — allowed-looking URLs could redirect to internal resources
  - Add URL allowlist similar to `image-proxy.ts`

- [ ] **Fix PlaylistStudio crash on regenerate**
  - `PlaylistStudio.tsx:22-37` — `currentIndex` is never reset to 0 when generating a new playlist
  - If old playlist had 10 items and user was on item 8, new 5-item playlist causes out-of-bounds crash

- [x] **Remove camera mirror for back camera**
  - `CameraModal.tsx:77` — `scale-x-[-1]` mirrors the video feed
  - Camera uses `facingMode: 'environment'` (back camera), so album text appears backwards
  - Breaks both user alignment and Gemini's ability to read cover text

- [ ] **Delete duplicate Tailwind config**
  - Both `tailwind.config.js` and `tailwind.config.ts` exist with different `content` globs
  - Tailwind auto-discovers `.ts` first, making the `.js` version dead code
  - Keep the `.js` version (broader globs with exclusions) or consolidate into `.ts`

---

## High

- [x] **Add CORS configuration**
  - No CORS headers on any endpoint; no `vercel.json` config
  - Any website can make requests to the API from their users' browsers

- [ ] **Add rate limiting to Gemini-powered endpoints**
  - `identify.ts`, `metadata.ts`, `playlist.ts` can be called unlimited times
  - Combined with no auth, attackers can exhaust API quota trivially

- [ ] **Fix `metadata.ts` returning 200 on error**
  - `metadata.ts:129` — catch block returns `res.status(200)` with fallback data
  - Every other endpoint correctly returns 5xx; client can't distinguish success from failure
  - Also: `req.body.artist` in catch block could throw if `req.body` is undefined

- [ ] **Add try/catch to lyrics fetch in AlbumDetailModal**
  - `AlbumDetailModal.tsx:49-62` — if `fetchLyrics` throws, `setLoadingTrack(null)` never runs
  - Track gets stuck in permanent loading state
  - Wrap in try/catch with `finally { setLoadingTrack(null) }`

- [ ] **Add error handling to `handleUpdateAlbum`**
  - `App.tsx:146-152` — if `supabaseService.updateAlbum` throws, error is unhandled
  - Notes save, cover update, play count increment, and tag removal all silently fail
  - Wrap in try/catch and show a toast on failure

- [ ] **Validate `window.open` URL in AlbumDetailModal**
  - `AlbumDetailModal.tsx:88` — `sample_url` from DB could contain `javascript:` scheme
  - Missing `noopener,noreferrer` on the window.open call
  - Validate URL scheme is `https://` before opening

- [ ] **Fix condition grade format mismatch**
  - `AlbumDetailModal.tsx:20-28` uses `'Mint (M)'` format
  - `CollectionList.tsx:18-27` `CONDITION_ORDER` expects `'Mint'`
  - Sorting by condition in list view is silently broken (always falls back to `99`)
  - Unify into a shared constant

- [ ] **Wrap `generatePlaylist` in try/catch in geminiService**
  - `geminiService.ts:100-138` — only service method that throws raw errors
  - Every other method returns a safe fallback; this one is inconsistent

- [ ] **Fix hardcoded JPEG in supabaseService uploads**
  - `supabaseService.ts:42,50` — all uploads get `.jpg` extension and `image/jpeg` MIME
  - PNG and WebP uploads are silently mislabeled
  - Extract MIME type from the base64 data URL prefix before stripping it

- [ ] **Make delete button accessible on mobile in list view**
  - `CollectionList.tsx:251-265` — delete button inside `hidden md:flex` container
  - Completely invisible on mobile; no swipe-to-delete or long-press alternative

---

## Medium

### Accessibility

- [ ] **Convert home/logo `div` to a `button`**
  - `App.tsx:283-291` — clickable `div` with no `role`, `tabIndex`, or keyboard handler
  - Screen readers won't announce it as interactive

- [ ] **Add focus trapping and Escape key to all modals**
  - AlbumDetailModal, CameraModal, PlaylistStudio, CoverPicker
  - None implement focus trapping, Escape-to-close, `aria-modal`, or `role="dialog"`
  - Focus doesn't return to trigger element on close

- [ ] **Remove `user-scalable=no` from viewport meta**
  - `index.html:5` — `maximum-scale=1.0, user-scalable=no` prevents pinch-to-zoom
  - WCAG 2.1 Level AA violation (SC 1.4.4)

- [ ] **Add ARIA attributes to favorites toggle**
  - `App.tsx:393-398` — custom toggle built from `div`s
  - Missing `role="switch"`, `aria-checked`, `tabIndex`, `onKeyDown`

- [ ] **Add ARIA table roles to CollectionList**
  - `CollectionList.tsx:146-175` — table built from `div`s with no semantic markup
  - Add `role="table"`, `role="columnheader"`, `aria-sort`, etc.

### Security

- [ ] **Add input size/length limits to all API endpoints**
  - `base64Data` in `identify.ts` has no size limit (could be gigabytes)
  - `mood` in `playlist.ts`, `artist`/`title` in others have no length limits

- [ ] **Sanitize user input before Gemini prompt interpolation**
  - `metadata.ts:47-55`, `playlist.ts:42-56` — user input injected directly into prompts
  - Add length limits and basic character filtering

- [ ] **Validate Content-Type in `image-proxy.ts`**
  - `image-proxy.ts:44-47` — upstream Content-Type forwarded without validation
  - If allowed host returns `text/html`, proxy serves it (potential XSS)
  - Verify content type is `image/*` before forwarding

- [ ] **Add HTTP method restriction to `image-proxy.ts`**
  - Only endpoint without a method check — accepts GET, POST, PUT, DELETE, etc.
  - Should restrict to GET only

### Data & State

- [ ] **Unify search state between App and CollectionList**
  - `App.tsx:27` and `CollectionList.tsx:30` each have independent `searchQuery`
  - Header search bar does nothing in list view — confusing UX

- [ ] **Stop storing base64 images in database rows**
  - `App.tsx:126` — entire base64 JPEG stored as `original_photo_url`
  - Bloats every `getAlbums()` response; could hit Supabase row size limits
  - Upload to Supabase Storage and store only the URL

- [ ] **Add allowlist to `supabaseService.updateAlbum`**
  - `supabaseService.ts:117` — `...rest` spread could write client-only fields (`id`, `created_at`)
  - Use explicit allowlist of updatable fields

- [ ] **Validate `mimeType` in `identify.ts`**
  - `identify.ts:25` — `mimeType` from request body is passed to Gemini without validation
  - Could be `undefined`, empty, or any arbitrary string

### Config & Build

- [ ] **Move `@google/genai` to devDependencies**
  - `package.json:13` — only used in Vercel serverless functions, not client code

- [ ] **Consider migrating to `import.meta.env.VITE_*` pattern**
  - `supabaseService.ts:5-6` uses `process.env` with fragile `define` replacement in `vite.config.ts`
  - Non-standard; new env vars silently fail if not added to the `define` block

- [ ] **Fix inconsistent null-Supabase behavior in supabaseService**
  - `getAlbums` returns `[]`, `saveAlbum` throws, `updateAlbum`/`deleteAlbum` silently return
  - Standardize: either all throw or all return gracefully

---

## Low

- [ ] **Extract shared utilities**
  - iTunes search logic duplicated between `covers.ts` and `metadata.ts`
  - Gemini client instantiation repeated in 3 API files
  - 4 different User-Agent strings — unify to a constant

- [ ] **Replace `any` types with proper interfaces**
  - `covers.ts:23-24`, `playlist.ts:25,40`, `geminiService.ts:119` — pervasive `any` usage
  - Define interfaces for external API responses (iTunes, MusicBrainz, Gemini)

- [ ] **Remove unused code**
  - `AlbumDetailModal.tsx:41` — `scrollContainerRef` declared but never attached
  - `AlbumDetailModal.tsx:20-28` — `CONDITION_GRADES` defined but never used

- [ ] **Fix missing `useEffect` dependencies**
  - `App.tsx:41-47` — `loadAlbums` not in dependency array
  - `CameraModal.tsx:16-43` — `showToast` not in dependency array

- [ ] **Extract `SortArrow` from render function**
  - `CollectionList.tsx:93-103` — component recreated every render
  - Extract as standalone component with props for `sortField`, `sortDir`, `field`

- [ ] **Memoize `AlbumCard` and stabilize callbacks**
  - `AlbumCard` not wrapped in `React.memo`; `handleDelete` not in `useCallback`
  - Full grid re-renders on any App state change; matters for large collections

- [ ] **Add item-level validation to `fetchCovers` in geminiService**
  - `geminiService.ts:93` — checks `Array.isArray` but doesn't validate individual items
  - Malformed cover objects could flow into the UI

- [ ] **Improve alt text on album images**
  - `AlbumCard.tsx:30` — alt text is just `album.title`
  - Better: `Album cover for ${album.title} by ${album.artist}`

- [ ] **Split `Album` type into `NewAlbum` / `Album`**
  - `types.ts:2` — `id?: string` forces non-null gymnastics throughout codebase
  - New albums (before save) don't have `id`; saved albums always do

- [ ] **Clean up `.gitignore`**
  - Line 32 contains `nul` (Windows NUL device name) — likely accidental

---

## Previously Completed

<details>
<summary>Tasks from prior review (all done)</summary>

- [x] Proxy Gemini API calls through Vercel serverless functions
- [x] Install Tailwind properly instead of CDN
- [x] Fix `useEffect` dependency expression bug
- [x] Add React error boundary
- [x] Validate Gemini JSON responses before use
- [x] Fix fallback merge overwriting valid data
- [x] Add `loading="lazy"` to album grid images
- [x] Fix base64 fallback stored in DB on upload failure
- [x] Fix camera cleanup race condition
- [x] Remove unused types and fields
- [x] Fix `is_favorite` / `isFavorite` mapping fragility
- [x] Remove `as Album` type assertion
- [x] Add keyboard activation to AlbumCard
- [x] Add empty-results state for filtered view
- [x] Add error handling to delete
- [x] Clean up duplicate env var naming
- [x] Wire up unused modal props
- [x] Guard non-null assertions on `album.id`
- [x] Cap collection size sent to Gemini for playlists

</details>
