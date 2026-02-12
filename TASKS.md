# The Crowe Collection - Code Review Tasks

Deployment target: **Vercel**

---

## High Priority

- [x] **Proxy Gemini API calls through Vercel serverless function**
  - Already completed: `/api/identify.ts`, `/api/metadata.ts`, `/api/playlist.ts` handle all Gemini calls server-side
  - `GEMINI_API_KEY` only referenced in server-side API routes; `vite.config.ts` only exposes Supabase vars

- [x] **Install Tailwind properly instead of CDN**
  - `index.html` loads `cdn.tailwindcss.com` which runs the compiler in-browser at runtime
  - Install as PostCSS plugin for build-time compilation and tree-shaking
  - Remove CDN script tag, add `tailwind.config.ts` and `postcss.config.js`

- [x] **Fix `useEffect` dependency expression bug**
  - `App.tsx:51` — `selectedAlbum === null` is a boolean expression that creates a new value every render
  - Extract to a variable before the hook: `const isAlbumDeselected = selectedAlbum === null`

---

## Medium Priority

- [x] **Add React error boundary**
  - No error boundary exists — any component error crashes the entire app to white screen
  - Add a root-level error boundary with a recovery UI

- [x] **Validate Gemini JSON responses before use**
  - `geminiService.ts:34,83,151` — `JSON.parse` output is trusted without shape validation
  - Add basic checks (required fields exist, correct types) before passing data through

- [x] **Fix fallback merge overwriting valid data**
  - Resolved during API proxy refactor; fallback merge no longer exists

- [x] **Add `loading="lazy"` to album grid images**
  - `AlbumCard.tsx` `<img>` tag now has `loading="lazy"`

- [x] **Fix base64 fallback stored in DB on upload failure**
  - `supabaseService.ts:74-77` — upload failure now skips storing raw base64

- [x] **Fix camera cleanup race condition**
  - `CameraModal.tsx:31-36` — cleanup accesses `videoRef.current` which may be null by cleanup time
  - Capture stream reference in a local variable inside the effect

---

## Low Priority

- [x] **Remove unused types and fields**
  - Removed `RecognitionResult`, `AppState` interfaces and `year_range`, `price_estimate` fields from `types.ts`

- [x] **Fix `is_favorite` / `isFavorite` mapping fragility**
  - Destructured `isFavorite` from updates and typed `dbUpdates` as `Record<string, unknown>` instead of `any`

- [x] **Remove `as Album` type assertion**
  - Destructured `metadata` to separate required fields, then built a properly typed object without `as Album`

- [x] **Add keyboard activation to AlbumCard**
  - Added `onKeyDown` handler for Enter/Space keys

- [x] **Add empty-results state for filtered view**
  - Added "No Matches" message with search icon when filters return zero results

- [x] **Add error handling to delete**
  - Wrapped `handleDelete` in try/catch; UI only updates on success, shows alert on failure

- [x] **Clean up duplicate env var naming**
  - Resolved during API proxy refactor; Gemini key moved server-side, only Supabase vars remain

- [x] **Wire up unused modal props**
  - Added tags display with remove buttons wired to `onUpdateTags`, and personal notes editor wired to `notes` state and `onUpdateAlbum`

- [x] **Guard non-null assertions on `album.id`**
  - Replaced `album.id!` with conditional guards in `AlbumDetailModal.tsx`; `AlbumCard.tsx` already had a guard

- [x] **Cap collection size sent to Gemini for playlists**
  - Added `MAX_ALBUMS = 200` cap in `api/playlist.ts` before serializing into the prompt
