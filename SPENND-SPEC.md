# Spennd — Free Public Vinyl & CD Grading Tool
## Full Spec & Cursor Prompts — v3

**What it is:** A free, no-login public tool at `rekkrd.com/spennd` that guides complete novices through identifying their pressing and grading their record — then shows real market pricing from two independent sources: Discogs and eBay completed sales.

**Why it exists:** Vinyl forums are brutal to newcomers. Someone asks "what's my record worth?" and gets told to "just check Discogs" with zero guidance. This tool holds their hand through the whole process and gives them a real answer backed by two data sources.

**Design principle:** Two independent real-transaction sources showing similar numbers gives the person genuine confidence. One source is a number. Two sources that agree is a fact.

**Tech:** React page inside the existing Rekkrd repo. Shares `src/constants/conditionGrades.ts` directly with the core app — same grades, same checklists, same score logic. Discogs app-credential API calls (no user OAuth). eBay Finding API (free App ID). Express proxy keeps all credentials off the client. `fast-xml-parser` for eBay XML responses. No auth, no Supabase, no account required.

---

## Tool Name & Branding

**Name:** Spennd
**Tagline:** *"Know what your record is worth — in 3 minutes."*
**URL:** `rekkrd.com/spennd`
**Brand:** Powered by Rekkrd. Same palette, same fonts. Light theme throughout.

---

## Header / Navigation

Spennd uses its own lightweight public header — not the authenticated app header — since visitors are not logged in.

```
┌────────────────────────────────────────────────────────────┐
│  [Rekkrd Logo]                    Sellr   Sign Up Free →   │
└────────────────────────────────────────────────────────────┘
```

**Component:** `src/components/spennd/SpenndHeader.tsx`

**Left:** Rekkrd logo — same SVG/image used in the main app. Links to `/` (rekkrd.com homepage).

**Right (flex gap-4 items-center):**
- "Sellr" — DM Mono 12px ink, links to `/sellr` (or sellr.rekkrd.com if separate domain)
- "Sign Up Free →" — bg-burnt-peach text-white rounded-full py-2 px-4 DM Mono 12px

**Mobile:** Logo left, "Sign Up Free →" button right only (hide Sellr link on xs, show on sm+).

**Styling:** bg-paper border-b border-paper-dark, px-6 py-4, sticky top-0 z-50.

This header is only used on `/spennd`. All other app routes use the existing authenticated header.

---

## Page Structure

1. **`/spennd`** — `SpenndHeader` + landing page + tool flow + footer
2. Tool flow replaces the landing content on "Start" (smooth scroll)
3. Results inline with soft sell and session nudge

---

## Landing Page

### Hero

```
[Subtle vinyl groove texture or paper background]

SPENND                        [Powered by Rekkrd — DM Mono 9px muted]
──────────────────────────────────

Know what your record is worth.
In about 3 minutes. For free.

No account. No Discogs login. No jargon.
We'll walk you through everything.

[ Check My Record → ]
```

### How It Works — 3 steps

```
1. Find your record
   Type the artist and title. We search Discogs'
   8 million+ release database.

2. Identify your pressing
   We show you exactly where to look and what to
   read. The pressing determines real value.

3. Grade the condition
   A few quick questions. Hold it under a light —
   we guide you step by step.
```

### Trust Strip

```
Prices come from two independent sources:
[ Discogs Marketplace ]  [ eBay Completed Sales ]
Real transactions — not asking prices, not estimates.
```

---

## Shared Constants — Critical Note

**Spennd imports directly from the core app constants. Do not duplicate.**

```typescript
// In all Spennd components — import from the shared source of truth
import {
  VINYL_CHECKLIST,
  CD_CHECKLIST,
  CONDITION_GRADES,
  CONDITION_BY_VALUE,
  ConditionGrade,
  scoreToGrade,  // see Task below — export this from conditionGrades.ts
} from '@/constants/conditionGrades'
```

This means if grade descriptions, checklist questions, or scoring logic ever changes in the core app, Spennd inherits it automatically. Never copy-paste the constants into Spennd files.

### Required addition to `src/constants/conditionGrades.ts`

Add this exported function at the bottom of the file (core app task — do this before building Spennd):

```typescript
// Score → grade mapping — single source of truth used by both
// the core app GradingSheet and the public Spennd tool.
export function scoreToGrade(totalScore: number): ConditionGrade {
  if (totalScore === 0) return 'M';
  if (totalScore === 1) return 'NM';
  if (totalScore <= 3) return 'VG+';
  if (totalScore <= 5) return 'VG';
  if (totalScore <= 7) return 'G+';
  if (totalScore <= 9) return 'G';
  if (totalScore <= 11) return 'F';
  return 'P';
}
```

Run `npx tsc --noEmit` after adding this. Commit before starting Spennd prompts.

---

## Tool Flow

---

### Step 1 — Find Your Record

**Header:** "What record do you have?"

**Input:** Single search field — placeholder: "Artist and title — e.g. Elvis Costello Armed Forces"

**On search:** `GET /api/spennd/search?q={query}`

**Results:** Up to 6 selectable cards:
```
┌──────────────────────────────────────────────┐
│  [cover thumb]  Elvis Costello               │
│                 Armed Forces                 │
│                 1979 · Columbia · US         │
│                 Vinyl, LP, Album             │
└──────────────────────────────────────────────┘
```

**Help text:**
> *"Seeing multiple versions? That's normal. The same album was often pressed in different countries and years — each pressing has a different value. We'll help you figure out which one you have next."*

**Edge cases:**
- **No results:** "Nothing found. Try simpler — just the artist name, or just the album title. Leave out words like 'the' or 'and'."
- **Discogs API timeout:** "We're having trouble reaching the database right now. Try again in a moment." Retry button.
- **Only non-vinyl formats returned:** "We didn't find vinyl releases for that search. Try adding 'vinyl' or 'LP' to your search."

---

### Step 2a — Read Your Label

**Header:** "Let's read your label first"

**Preamble:**
> *"Before we look at the matrix, the label on your record already tells us a lot. Pick up the record, look at the center paper label, and answer these questions."*

**Tip strip:**
> *"Make sure you're reading the label on the actual vinyl record — not the cardboard sleeve or cover."*

**Four fields:**

1. **Label name** — "e.g. Columbia, Parlophone, Warner Bros."
   Help: "The company name printed on the center label — usually at the top."

2. **Catalog number** — "e.g. JC 35709 or BSK 3010"
   Help: "Usually on the left or right side of the label. Includes letters and numbers."

3. **Year** — "e.g. 1979" + "Can't find a year" checkbox

4. **Country** — "e.g. Made in USA" + "Doesn't say" checkbox

**Special detection:**
- "PROMO" / "NOT FOR SALE" / "PROMOTIONAL" → callout: *"Promo copies were pressed for radio stations before commercial release. They can be more collectible and may have different matrix strings."*
- "WHITE LABEL" / blank white label → callout: *"White labels are usually test pressings or very early promos — sometimes rare and valuable."*
- Catalog number format doesn't match label → flag: *"That catalog number format is unusual for this label. It's possible this is an unofficial pressing."*

**On submit:** `GET /api/spennd/label-validate?release_id={id}&catalog={val}&country={val}`
- Confirmed → green "✓ Label confirmed"
- Different release found → amber suggestion card with "Switch to this pressing?" option
- No match → neutral, advance to matrix

**Edge cases:**
- Reading the sleeve: tip shown early prevents most of this
- Worn/unreadable: "Can't read this" option on each field
- Bootleg indicator: catalog mismatch flag

---

### Step 2b — Matrix Identification

**Header:** "Now let's look at the matrix"

**Education panel:**
> *"What's a pressing? The same album gets manufactured in batches called pressings. An original 1977 US pressing of Rumours can be worth $40. A 1990s reissue might be worth $6. Same record — totally different value. The matrix is etched into the vinyl itself and tells us exactly which pressing you have."*

**Visual instruction panel:**
```
How to find your matrix

1. Pick up your record
2. Hold it at eye level, tilted toward a lamp or window
3. Look at the shiny area between the last song's groove
   and the paper label
4. You'll see hand-etched or stamped characters

[SVG diagram: top-down record view — groove area, gap highlighted
 with "matrix lives here" callout in burnt-peach]

e.g.  JC 35709-1A  or  PORKY PRIME CUT  or  AL 35709
```

**Reference strings panel — from Discogs `identifiers` for selected release:**

If data exists:
```
What to look for — collectors have documented:
Side A:  JC 35709-1A  ·  JC 35709-1AA  ·  JC 35709-1B
Side B:  JC 35709-2A  ·  JC 35709-2AA  ·  JC 35709-2B
Any of these is correct. Type exactly what you see.
```

If no data:
```
We don't have matrix data on file for this pressing yet.
Type exactly what you see and we'll search for it.
```

**Limitations disclosure:**
> *"Matrix data in Discogs is community-contributed. Common and collectible pressings are usually well-documented. Obscure releases sometimes aren't. If we can't match yours, we'll say so and explain what it means for the price range."*

**Inputs:**
- Side A / B matrix — monospace font
- "I can't make this out" checkbox per side
- Double album (detected from Discogs format): show 4 inputs (Sides A, B, C, D)

**Skip option:** "Skip this step →" — muted link, adds uncertainty warning to results.

---

**Matrix edge cases — all handled:**

**Multiple variants:** Show ALL known strings per side, not just first one.

**Fuzzy matching:**
1. Exact match after normalization (uppercase, strip spaces/dashes/underscores)
2. Contains match
3. Levenshtein distance ≤ 2 for strings under 12 chars
Common confusion: I vs 1, O vs 0, trailing spaces — all handled by normalization.

**Engineer marks — detect and explain:**

| Mark | Plain-English Explanation |
|---|---|
| PORKY / PORKY PRIME CUT | Mastered by George Peckham at Metropolis Studios. Highly regarded — audiophiles actively seek these out. |
| STERLING | Cut at Sterling Sound, New York — a respected mastering house. |
| RL (standalone) | Cut by Robert Ludwig — very sought after, often commands a significant price premium. |
| HAECO | High Frequency Absence Effect — a US process considered inferior by many collectors. |
| DR | Cut by Dennis Ruzicka at Capitol Studios. |
| CUT BY... / MASTERED AT... | "This appears to be a mastering note — not the matrix itself. The matrix is usually the alphanumeric code nearby." |

**Collector initials:** 2–3 letters, no numbers, matches nothing → "That looks like a previous owner's initials. Look for a longer alphanumeric code nearby."

**No matrix on both sides:**
> *"Some pressings — especially budget reissues — have no matrix. That itself tells us something: these are typically not original pressings and usually have lower collector value."*

**Double albums:** 4 inputs, labeled A / B / C / D.

**Test pressings:** Unusual/short strings → *"Test pressings have non-standard matrix strings. They can be extremely valuable. Consider reaching out to a specialist dealer."*

**Bootleg escalation:** Catalog flagged unusual in 2a AND matrix no-match → *"Between the catalog number and the matrix, this may be an unofficial pressing. Bootlegs have little resale value on legitimate marketplaces."*

**Partial match:** One side matches, one doesn't → *"We matched Side A but not Side B — fairly common. Treating this as a match."*

**No match:**
> *"We couldn't match that matrix — that's okay. We'll show a price range with a note about the uncertainty. Want to dig deeper? Paste your matrix into discogs.com/search and set Format to Vinyl."*

---

### Step 3 — Format & Grade

**Format selector — shown first, before checklist questions:**

```
Is this a vinyl record or a CD?

  [ 💿 Vinyl ]    [ 📀 CD ]
```

Simple two-button toggle. Selected format determines which checklist renders:
- Vinyl → `VINYL_CHECKLIST` (3 questions: visual, playback, grooves)
- CD → `CD_CHECKLIST` (3 questions: disc, playback, packaging)

Both imported directly from `src/constants/conditionGrades.ts`.

---

**Header:** "Now let's grade the condition"

**Preamble:**
> *"Condition is the other half of the value equation. A Near Mint copy can be worth 3–5× a Very Good copy of the same pressing. Answer these questions and we'll give you the standard industry grade."*

Questions shown one at a time. Auto-advance on selection after 400ms.

---

**Vinyl questions (from `VINYL_CHECKLIST`):**

**Q1 — Visual:**
```
Hold the record under a lamp or bright light, tilted at an angle
so the light catches the surface. What do you see?

○  No marks at all. Looks factory new.
○  Faint marks only under direct light. Looks great normally.
○  Marks visible in normal light. Clearly been played.
○  Heavy marks, deep scratches clearly visible.
```

**Q2 — Playback:**
```
How does it sound when played?

○  Unplayed or silent between tracks.
○  Very quiet. Occasional faint tick or pop.
○  Noticeable surface noise throughout.
○  Heavy noise, skips, or struggles to track.
```

**Q3 — Grooves:**
```
Look at the grooves edge-on under light — the tiny parallel
lines that spiral inward.

[SVG: groove cross-section — sharp vs cloudy]

What do the groove walls look like?

○  Grooves look sharp and deep. No clouding.
○  Light cloudy haze in groove walls.
○  Visible whitening throughout groove walls.
```

Tip for Q3:
> *"This is the one most people miss. Groove clouding is caused by a worn or dirty stylus and means permanent damage — the record will sound noisy regardless of how clean the surface looks."*

---

**CD questions (from `CD_CHECKLIST`):**

**Q1 — Disc:**
```
Look at the disc under a light — what do you see?

○  Mirror-like. No marks whatsoever.
○  Fine hairlines only. Looks great.
○  Visible scratches in normal light.
○  Deep gouges or surface damage.
```

**Q2 — Playback:**
```
How does it play?

○  Unplayed. Loads instantly, perfect.
○  Plays flawlessly without any issues.
○  Occasional skip or stutter.
○  Won't load or skips constantly.
```

**Q3 — Packaging:**
```
Check the booklet, tray card, and case.

○  All inserts present and perfect.
○  Minor wear. All inserts present.
○  Creasing, missing inserts, or cracked case.
```

---

**Scoring — uses `scoreToGrade()` imported from `conditionGrades.ts`:**

```typescript
const totalScore = Object.values(answers).reduce((sum, s) => sum + s, 0)
const computedGrade = scoreToGrade(totalScore)
```

Single source of truth. No duplicate mapping.

---

**Grade Guide panel — accessible from Step 3:**

A "?" or "View grade guide" link opens an inline reference panel showing all 8 grades:

```
GRADE GUIDE

M    Mint          Perfect. Unplayed. Often still sealed.
NM   Near Mint     Nearly perfect. May have been played once or twice.
VG+  Very Good+    Light signs of play. Looks great, plays quietly.
VG   Very Good     Clearly played. Surface noise present but enjoyable.
G+   Good Plus     Heavy wear. Still plays through without skipping.
G    Good          Very heavy wear. Music barely audible over noise.
F    Fair          Damaged. Plays with great difficulty.
P    Poor          Essentially unplayable. Value only from rarity.
```

Each row expandable to show full `vinylDetail` or `cdDetail` from `CONDITION_BY_VALUE`.
This is the same grade reference used in the core app's GradingSheet Grade Guide tab.

---

**Grading edge cases:**

**Visual/playback conflict:**
If visual score ≤ 1 AND playback score = 3 → override grade down one level. Show note:
> *"Your record looks better than it sounds. We adjusted the grade — condition is based on the worst factor, not the average. This usually means groove damage from a worn stylus."*

**Sealed record:**
"Still sealed" option on Q1. Auto-set grade to M. Note:
> *"Sealed records grade as Mint by default — but some sealed records were resealed after being opened. Collectors are cautious about this."*

**Haven't played it:**
If Q2 = "Unplayed" → note:
> *"If you haven't played it, grade based on what you can see. Unplayed doesn't automatically mean Mint — check the surface carefully."*

**Manual override:**
After suggested grade shown, always offer "Grade it differently" — shows all 8 grades with full descriptions from `CONDITION_BY_VALUE`.

---

### Step 4 — Results & Pricing

**Header:** "Here's what your record is worth"

Two API calls fire simultaneously on step load:
1. `GET /api/spennd/price?release_id={id}&condition={grade}` — Discogs
2. `GET /api/spennd/ebay?q={artist}+{title}+vinyl` — eBay

Each loads independently. Page renders immediately — per-source loaders, no full-page block.

---

**Matrix result banner:**

| State | Display |
|---|---|
| Matched | ✓ Green — "Pressing identified — {pressing_label}" |
| Partial | Amber — "Partial match — one side confirmed" |
| Not matched | Pearl-beige — "Matrix not matched — prices may span multiple pressings" |
| Skipped | Pearl-beige — "Pressing not confirmed — prices reflect the release generally" |

---

**Grade card:**

```
VG+
Very Good Plus

Light signs of play. Looks great, plays quietly.

Faint marks visible only under direct light. Occasional
faint tick. The sweet spot for most collections.

[ This looks right ]   [ Grade it differently ]
```

---

**Dual pricing panel:**

```
┌─────────────────────────────────────────────────────┐
│  What it's worth                                    │
│                                                     │
│  DISCOGS MARKETPLACE      EBAY COMPLETED SALES      │
│  Real sales · collectors  Real sales · 90 days      │
│                                                     │
│  Low    Median   High     Low    Median   High      │
│  $15     $27     $45      $12     $24     $41       │
│                                                     │
│  12 listings              8 completed sales         │
└─────────────────────────────────────────────────────┘
```

**Agreement indicator:**
- Within 20% → ✓ Green: *"Both sources agree — $24–27 is a reliable anchor."*
- Within 40% → Neutral: *"Moderate difference. Discogs median is generally more reliable for vinyl."*
- Over 40% → Amber: *"Sources show different ranges. Use Discogs as your primary reference."*

---

**Condition comparison table:**

```
HOW CONDITION AFFECTS PRICE  (approximate)

  M / NM    ~$65   ██████████████████
▶ VG+        ~$27   ████████            ← Your copy
  VG         ~$14   ████
  G+         ~$5    █
  G          ~$3    ▌
```

Scale: M: ×3.5 | NM: ×2.0 | VG+: ×1.0 | VG: ×0.5 | G+: ×0.2 | G: ×0.1
Label as approximate.

---

**Pricing disclosure:**

> *"Discogs prices come from their marketplace — real completed transactions by vinyl collectors worldwide. eBay prices are completed and sold listings from the last 90 days — outlier sales removed. The median is your best anchor. [If matrix unconfirmed: An original pressing can be worth significantly more than a reissue.]"*

---

**Pricing edge cases:**

- **No Discogs data:** Show eBay only with note.
- **No eBay data:** Show Discogs only with note.
- **Neither available:** Show outbound links to Discogs search and eBay sold listings.
- **Price range > 5× wide:** Amber warning — "Range is very wide. The median is your best single number. [If matrix skipped: Confirming your pressing would narrow this significantly.]"
- **Promo flagged in Step 2a:** Note about promo pricing variability.
- **Double album:** Note that pricing assumes complete set.
- **eBay outliers:** Top and bottom 10% stripped before calculation.

---

### Session Nudge — After 3 Records

Client-side only. Track with `useState` or `sessionStorage` — no backend, no IP tracking.

After the user completes results for their **3rd record** in the same session, show this panel above the soft sell:

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  You've checked 3 records.                         │
│                                                    │
│  Rekkrd tracks your whole collection               │
│  automatically — no re-entering anything.          │
│  Condition, pricing, pressing history, all of it.  │
│                                                    │
│  [ Start free — it takes 30 seconds → ]            │
│                                        [ Keep going ] │
└────────────────────────────────────────────────────┘
```

"Keep going" dismisses the panel and the tool continues working normally.
"Start free" links to `/signup`.
Panel only shows once per session — dismissed state persists in component state.

This is not a wall. It's a well-timed prompt at the moment they've gotten the most value.

---

### Soft Sell — End of Every Result

Below results, separated by a divider. Not a popup. Just there.

```
────────────────────────────────────────────────────

FROM THE MAKERS OF SPENND

Do you have more than one?

Most collectors do. Rekkrd is a free app that lets you track
your whole collection — with condition grading, live Discogs
pricing, and a gear catalog for your full audio setup.

You just did this for one record. Rekkrd does it for all of them.

[ Start your collection free → ]

No credit card. Free up to 100 albums.

────────────────────────────────────────────────────
```

---

## Backend API Routes

All in `server/routes/spennd.ts`, mounted at `/api/spennd`.
All routes outside any auth middleware — fully public.

---

### `GET /search`
```typescript
// ?q=artist+title
// → Discogs /database/search?q={q}&type=release&format=vinyl
// Auth: Authorization header — Discogs key={key}, secret={secret}
// Timeout: 8s. On timeout/error: 502 with user-friendly message
// Returns: up to 6 results { id, title, artist, year, label, country, format, thumb }
```

### `GET /label-validate`
```typescript
// ?release_id={id}&catalog={val}&country={val}
// → Discogs /releases/{release_id}
// Normalize both: uppercase, strip spaces/punctuation
// Returns: { confirmed: boolean, notes: string[] }
```

### `GET /matrix`
```typescript
// ?release_id={id}&matrix_a={val}&matrix_b={val}
// → Discogs /releases/{release_id}
// Extract identifiers where type === 'Matrix / Runout'
// Fuzzy match: normalize → exact → contains → Levenshtein ≤ 2 (under 12 chars)
// Detect double album from format field
// Detect engineer marks: PORKY, STERLING, RL, HAECO, DR
// Returns: { matched, partial_match, pressing_label, engineer_notes,
//            is_double_album, all_known_matrices, no_matrix_data }
```

### `GET /price`
```typescript
// ?release_id={id}&condition={grade}
// → Discogs /marketplace/stats/{release_id}
// In-memory cache: 24hr TTL, key: `price-${release_id}`
// On blocked/no data: { available: false }
// Returns: { low, median, high, num_for_sale, available, cached }
```

### `GET /ebay`
```typescript
// ?q=Elvis+Costello+Armed+Forces+vinyl
// → eBay Finding API findCompletedItems (XML)
// Parse with fast-xml-parser
// Filter: remove CD/cassette/DVD/8-track titles
// Strip outliers: bottom 10% and top 10% by price
// In-memory cache: 6hr TTL
// On ANY error: { available: false } — never block results page
// Returns: { low, median, high, count, available, cached }
```

---

## npm Dependency

```bash
npm install fast-xml-parser
```

---

## Environment Variables

```bash
DISCOGS_KEY=          # discogs.com/settings/developers → Create App → App ID
DISCOGS_SECRET=       # same page → Secret
EBAY_APP_ID=          # developer.ebay.com → App Keys → Production → App ID (Client ID)
```

**eBay approval note:** Developer registration is instant but Production API access requires eBay approval — typically **24–48 hours**. Apply for your eBay developer account before you start building so approval arrives before you need it. The tool works fine on Discogs-only in the meantime — the eBay route already fails silently with `available: false`.

---

## Rate Limiting

```
/search   — 30 req/min per IP
/ebay     — 30 req/min per IP
/matrix   — 60 req/min per IP
/price    — 60 req/min per IP
All return 429: "Too many requests — please wait a moment and try again."
```

---

## Cursor Prompts

---

### Prompt 0 — Core App: Export scoreToGrade (do this first)

```
In src/constants/conditionGrades.ts, add this exported function at the bottom of the file.
Do not modify any existing exports. Do not change any existing values.

export function scoreToGrade(totalScore: number): ConditionGrade {
  if (totalScore === 0) return 'M';
  if (totalScore === 1) return 'NM';
  if (totalScore <= 3) return 'VG+';
  if (totalScore <= 5) return 'VG';
  if (totalScore <= 7) return 'G+';
  if (totalScore <= 9) return 'G';
  if (totalScore <= 11) return 'F';
  return 'P';
}

Run npx tsc --noEmit. Fix any errors. Commit with message: "feat: export scoreToGrade from conditionGrades"
```

---

### Prompt 1 — Backend: Discogs Routes

```
Create server/routes/spennd.ts as an Express router mounted at /api/spennd.
All routes must be public — no auth middleware.

Use DISCOGS_KEY and DISCOGS_SECRET from environment variables.
All Discogs calls must pass:
  Authorization: `Discogs key=${process.env.DISCOGS_KEY}, secret=${process.env.DISCOGS_SECRET}`
Never put credentials in query params.

─────────
GET /search?q={query}

Call https://api.discogs.com/database/search?q={q}&type=release&format=vinyl
Timeout: 8s.
On timeout or error: return 502 { error: "We're having trouble reaching the database. Try again in a moment." }
Return up to 6 results mapped to:
{ id: number, title: string, artist: string, year: string, label: string, country: string, format: string, thumb: string }
Parse artist from result.title string (format "Artist - Title").

─────────
GET /label-validate?release_id={id}&catalog={val}&country={val}

Fetch https://api.discogs.com/releases/{release_id}
Normalize: uppercase both strings, strip spaces and punctuation.
Check catalog against release.labels[0].catno and any identifier value.
Return: { confirmed: boolean, notes: string[] }

─────────
GET /matrix?release_id={id}&matrix_a={val}&matrix_b={val}

Fetch https://api.discogs.com/releases/{release_id}
Extract identifiers where type === 'Matrix / Runout'.
Normalize: uppercase, strip spaces/dashes/underscores.

Match in order:
1. Exact match after normalization
2. Contains match (either direction)
3. Levenshtein distance ≤ 2 for strings under 12 chars

Double album: format.descriptions includes '2xLP' → is_double_album: true

Engineer mark detection — return in engineer_notes[]:
  'PORKY' or 'PORKY PRIME CUT' → "Mastered by George Peckham at Metropolis Studios. Highly regarded — audiophiles actively seek these out."
  'STERLING' → "Cut at Sterling Sound, New York — a respected mastering house."
  'RL' (standalone, not part of longer string) → "Cut by Robert Ludwig — very sought after, often commands a significant price premium."
  'HAECO' → "High Frequency Absence Effect — a US process considered inferior by many collectors."
  'DR' → "Cut by Dennis Ruzicka at Capitol Studios."

Return:
{
  matched: boolean,
  partial_match: boolean,
  pressing_label: string | null,
  engineer_notes: Array<{mark: string, description: string}>,
  is_double_album: boolean,
  all_known_matrices: string[],
  no_matrix_data: boolean
}

─────────
GET /price?release_id={id}&condition={grade}

Fetch https://api.discogs.com/marketplace/stats/{release_id} with auth header.
In-memory cache: Map<string, {data: object, expires: number}>, 24hr TTL, key: `price-${release_id}`.
On blocked or missing data: return { available: false }.
Return: { low: number|null, median: number|null, high: number|null, num_for_sale: number, available: boolean, cached: boolean }

─────────
Apply rate limiting: 30 req/min on /search, 60 req/min on /label-validate /matrix /price.
Mount router in server/index.ts at /api/spennd — outside any auth middleware.
Add DISCOGS_KEY, DISCOGS_SECRET, EBAY_APP_ID to .env.example if not already present.
Run npx tsc --project tsconfig.server.json --noEmit. Fix all errors. Commit.
```

---

### Prompt 2 — Backend: eBay Route

```
Add GET /ebay route to server/routes/spennd.ts.

Run: npm install fast-xml-parser
Add import at top: import { XMLParser } from 'fast-xml-parser'

GET /ebay?q={query}

Call eBay Finding API:
URL: https://svcs.ebay.com/services/search/FindingService/v1

Query string params:
  OPERATION-NAME=findCompletedItems
  SERVICE-VERSION=1.0.0
  SECURITY-APPNAME=${process.env.EBAY_APP_ID}
  RESPONSE-DATA-FORMAT=XML
  REST-PAYLOAD
  keywords=${q} (append ' vinyl' if not already in q)
  itemFilter(0).name=SoldItemsOnly
  itemFilter(0).value=true
  paginationInput.entriesPerPage=50
  sortOrder=EndTimeSoonest

Parse XML: new XMLParser({ ignoreAttributes: false })
Navigate to: findCompletedItemsResponse.searchResult.item[]

Per item extract price:
  parseFloat(item.sellingStatus?.convertedCurrentPrice?.['__value__'] ?? item.sellingStatus?.currentPrice?.['__value__'] ?? '0')

Filter out items where title.toLowerCase() includes any of:
  'cd', 'cassette', '8-track', '8track', 'dvd', 'vhs', '45 rpm', '45rpm', '"7', "7'"

Remove nulls, undefined, zeros. Sort ascending.

Strip outliers:
  const removeCount = Math.floor(prices.length * 0.10)
  const trimmed = prices.slice(removeCount, prices.length - removeCount)

If trimmed.length === 0: return { available: false }

Return:
  low: trimmed[0]
  high: trimmed[trimmed.length - 1]
  median: trimmed[Math.floor(trimmed.length / 2)]
  count: trimmed.length
  available: true
  cached: boolean

In-memory cache: 6hr TTL, key: `ebay-${q}`
Apply rate limiting: 30 req/min.

On ANY error (network, parse, API error, empty): return { available: false }
Never throw. Never block the results page.

Run npx tsc --project tsconfig.server.json --noEmit. Fix all errors. Commit.
```

---

### Prompt 3 — Public Header Component

```
Create src/components/spennd/SpenndHeader.tsx.

This is a lightweight public navigation header used only on /spennd.
It is NOT the main authenticated app header — do not modify the existing header.

Styling: bg-paper border-b border-paper-dark sticky top-0 z-50
Layout: px-6 py-4 flex items-center justify-between

Left side (flex items-center gap-4):

  Item 1 — Rekkrd logo:
    Import and render the existing Rekkrd logo component or img used in the main app.
    Wrap in <Link to="/" />. Use the light/dark-on-light variant.

  Thin vertical divider: h-5 w-px bg-paper-dark

  Item 2 — Spennd icon + wordmark (flex items-center gap-2):
    Icon: <img src="/spennd-icon.svg" width={28} height={28} alt="Spennd" />
      (spennd-icon.svg lives in public/ — Vite serves it at the root)
    Wordmark: "Spennd" Playfair Display 18px ink font-semibold
    Wrap both in <Link to="/spennd" />

Right side (flex items-center gap-4):
  Link 1: <Link to="/sellr"> — "Sellr" in DM Mono 12px ink hover:text-burnt-peach transition-colors
  Link 2: <Link to="/signup"> — "Sign Up Free →"
    bg-burnt-peach text-white rounded-full py-2 px-4 DM Mono 12px font-medium
    hover:opacity-90 transition-opacity

Mobile (below sm breakpoint):
  Hide "Sellr" link (hidden sm:block)
  Keep "Sign Up Free →" button always visible

Export default SpenndHeader.
Run npx tsc --noEmit. Fix all errors. Commit.
```

---

### Prompt 4 — Landing Page

```
Create src/pages/SpenndLandingPage.tsx.

Import SpenndHeader from src/components/spennd/SpenndHeader.tsx.
Import SpenndTool from src/components/spennd/SpenndTool.tsx (create as placeholder for now).

This page uses its own layout — SpenndHeader at top, content in middle, no sidebar.
Do NOT use the main app layout wrapper.

Brand palette: burnt-peach (#dd6e42), paper (#faf6ef), paper-dark (#ede4d3), 
ink (#2a2016), pearl-beige (#e8dab2).
Fonts: Playfair Display (headings), Lora (body), DM Mono (labels).

─────────
Structure: <div className="min-h-screen bg-paper flex flex-col">
  <SpenndHeader />
  <main className="flex-1">
    [Hero section]
    [How it works section]
    [Trust strip]
    [Tool section id="tool"]
  </main>
  [Footer]
</div>

─────────
HERO (min-h-[70vh] flex items-center px-6 py-16):

Top label: "SPENND" DM Mono 11px ink uppercase tracking-widest
Right: "Powered by Rekkrd" DM Mono 9px ink-soft

Heading: "Know what your record is worth."
Playfair Display 52px desktop / 36px mobile, ink, max-w-xl leading-tight

Subheading: "In about 3 minutes. For free."
Lora italic 20px ink-soft mt-2

Body: "No account. No Discogs login. No jargon. We'll walk you through everything."
Lora 16px ink-soft mt-4 max-w-lg

CTA: "Check My Record →" bg-burnt-peach text-white Lora 16px rounded-full py-4 px-8 mt-8
onClick: smooth scroll to id="tool"

─────────
HOW IT WORKS (bg-paper-dark py-16 px-6):

Heading: "Three steps. Plain English." Playfair Display 28px ink text-center mb-10

Grid: grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto

Card 1: number "1" Playfair Display 48px burnt-peach,
  title "Find your record" Lora 16px bold ink mt-2,
  body "Type the artist and title. We search Discogs' 8 million+ release database and show you matching pressings." Lora 14px ink-soft mt-2

Card 2: "2" — "Identify your pressing" —
  "We show you exactly where to look on the record and what to read. The pressing determines real value more than anything else."

Card 3: "3" — "Grade the condition" —
  "A few quick questions with clear instructions. Hold it under a light — we guide you step by step."

Each card: bg-white rounded-2xl p-6 shadow-sm

─────────
TRUST STRIP (bg-paper py-10 text-center px-6):

"Prices come from two independent sources:" Lora 15px ink mb-3

Two pills (flex justify-center flex-wrap gap-3):
  "Discogs Marketplace" border border-burnt-peach text-burnt-peach DM Mono 11px rounded-full px-3 py-1
  "eBay Completed Sales" same styling

"Real transactions — not asking prices, not estimates." Lora italic 14px ink-soft mt-3

─────────
TOOL SECTION (id="tool" bg-paper py-16 px-6):

Heading: "Let's check your record" Playfair Display 28px ink mb-8
<SpenndTool />

─────────
FOOTER (bg-paper-dark border-t border-paper-dark py-8 px-6 text-center):
  "Spennd is a free tool by Rekkrd" DM Mono 10px ink-soft
  Links: <Link to="/">Rekkrd</Link> · <Link to="/sellr">Sellr</Link> · <a href="mailto:hello@rekkrd.com">Contact</a>
  All DM Mono 10px ink-soft with hover:text-ink

─────────
Add route in App.tsx (or router): path="/spennd" → <SpenndLandingPage />
Route must be completely outside any auth wrapper or protected route wrapper.
Run npx tsc --noEmit. Fix all errors. Commit.
```

---

### Prompt 5 — Tool Types + Steps 1 & 2a

```
Create src/types/spennd.ts:

export interface DiscogsRelease {
  id: number; title: string; artist: string; year: string;
  label: string; country: string; format: string; thumb: string;
}
export interface LabelValidation { confirmed: boolean; notes: string[]; }
export interface MatrixResult {
  matched: boolean; partial_match: boolean; pressing_label: string | null;
  engineer_notes: Array<{mark: string; description: string}>;
  is_double_album: boolean; all_known_matrices: string[]; no_matrix_data: boolean;
}
export interface PriceData {
  low: number | null; median: number | null; high: number | null;
  num_for_sale: number; available: boolean; cached: boolean;
}
export interface EbayData {
  low: number | null; median: number | null; high: number | null;
  count: number; available: boolean; cached: boolean;
}

─────────
Create src/components/spennd/SpenndTool.tsx.

Import { useState, useEffect } from 'react'
Import { Loader2 } from 'lucide-react'
Import types from src/types/spennd.ts
Import { ConditionGrade } from '@/constants/conditionGrades'

State:
  step: 'search' | 'label' | 'matrix' | 'grading' | 'results' — default 'search'
  recordsChecked: number — 0  (session counter for nudge)
  nudgeDismissed: boolean — false
  searchQuery: string — ''
  searchResults: DiscogsRelease[] — []
  searchLoading: boolean — false
  searchError: string | null — null
  selectedRelease: DiscogsRelease | null — null
  labelInputs: { labelName: string; catalog: string; year: string; yearUnknown: boolean; country: string; countryUnknown: boolean } — all empty/false
  labelValidation: LabelValidation | null — null
  matrixResult: MatrixResult | null — null
  selectedFormat: 'vinyl' | 'cd' | null — null
  grade: ConditionGrade | null — null
  conflictNote: string | null — null
  priceData: PriceData | null — null
  ebayData: EbayData | null — null

─────────
STEP 1 — SEARCH (step === 'search'):

Container: max-w-xl mx-auto bg-paper rounded-2xl p-8 shadow-sm

Heading: "What record do you have?" Playfair Display 24px ink
Subtext: "Type the artist and album title" Lora 14px ink-soft mb-4

Input: controlled on searchQuery, full-width bg-paper-dark rounded-xl py-3 px-4 Lora font
placeholder="e.g. Elvis Costello Armed Forces"
Triggers search on Enter.

"Search →" button: bg-burnt-peach text-white rounded-full py-2 px-5 mt-3
onClick: fetch GET /api/spennd/search?q={searchQuery}
  setSearchLoading(true), clear results/error
  On success: setSearchResults(data), setSearchLoading(false)
  On error: setSearchError("..."), setSearchLoading(false)

Loading: Loader2 spinner, animate-spin, text-burnt-peach, centered

Error: amber bg rounded-xl p-3 with error text + Retry button

Results (max 6, mt-4, flex flex-col gap-2):
  Each: flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-paper-dark transition-colors
  Left: 40×40 img thumbnail (rounded-lg object-cover) or gray vinyl placeholder
  Right: "{artist} — {title}" Lora 14px ink font-medium | "{year} · {label} · {country}" DM Mono 11px ink-soft
  onClick: setSelectedRelease(r), setStep('label')

No results: "Nothing found. Try a simpler search — just the artist name, or just the album title. Leave out words like 'the' or 'and'." Lora 13px italic ink-soft mt-3

Help text (when results exist, Lora 13px italic ink-soft mt-3):
"Seeing multiple versions? That's normal. The same album was often pressed in different countries and years — each pressing has a different value. We'll help you figure out which one you have next."

─────────
STEP 2a — LABEL (step === 'label'):

Breadcrumb: "← Change record" text-sm ink-soft underline cursor-pointer
onClick: setSelectedRelease(null), setStep('search')

Heading: "Let's read your label first" Playfair Display 22px ink mt-4

Preamble: Lora 14px italic ink-soft mb-4
"Before we look at the matrix, the label on your record already tells us a lot. Pick up the record, look at the center paper label, and answer these questions."

Tip (bg-pearl-beige rounded-xl p-3 mb-5):
"📌 Make sure you're reading the label on the actual vinyl record — not the cardboard sleeve or cover."

Four fields (flex flex-col gap-4):
  Each: DM Mono 10px uppercase tracking-wide ink-soft label + bg-paper-dark rounded-xl input + Lora 12px ink-soft help text

  Field 1: labelName — "Label Name" — "e.g. Columbia, Parlophone, Warner Bros."
  Field 2: catalog — "Catalog Number" — "e.g. JC 35709"
  Field 3: year — "Year" + "Can't find a year" checkbox (disables input)
  Field 4: country — "Country" + "Doesn't say" checkbox (disables input)

Watch all label inputs — if any contains (case-insensitive):
  'promo'/'not for sale'/'promotional': show pearl-beige callout about promos
  'white label'/'white': show pearl-beige callout about white labels

"Next: Find the Matrix →" button: bg-burnt-peach text-white rounded-full py-3 px-6
onClick: fetch /api/spennd/label-validate
  Show result inline for 1500ms then advance to step 'matrix'
  confirmed → green banner
  else → neutral "We'll continue — the matrix may tell us more."

Run npx tsc --noEmit. Fix all errors. Commit.
```

---

### Prompt 6 — Tool: Step 2b (Matrix)

```
Add step 'matrix' to SpenndTool.tsx.

useEffect when step becomes 'matrix':
  Fetch GET /api/spennd/matrix?release_id={selectedRelease.id}&matrix_a=&matrix_b=
  Store to get: all_known_matrices, is_double_album, no_matrix_data
  (This pre-loads reference data before user types)

State additions:
  matrixInputs: Record<string, string> — {}
  matrixSkipped: Record<string, boolean> — {}
  matrixLoading: boolean — false

─────────
Breadcrumb: "← Back to label" left, release name DM Mono 11px ink-soft right

EDUCATION PANEL (bg-paper-dark rounded-xl p-5 mb-5):
  "💿 What's a pressing?" Lora 15px bold ink mb-2
  Body Lora 14px ink-soft:
  "The same album gets manufactured in batches called pressings. An original pressing can be worth many times more than a later reissue of the same album. The matrix is etched into the vinyl itself and tells us exactly which pressing you have."

INSTRUCTION PANEL (bg-white border border-paper-dark rounded-xl p-5 mb-5):
  "HOW TO FIND YOUR MATRIX" DM Mono 10px uppercase ink-soft mb-3
  Steps Lora 14px ink:
    1. Pick up your record
    2. Hold it at eye level, tilted toward a lamp or window
    3. Look at the shiny area between the last song's groove and the paper label
    4. You'll see hand-etched or stamped characters — letters, numbers, sometimes dashes

  SVG diagram (~160px, centered, mt-4):
    Outer circle fill black (grooves)
    Inner circle fill pearl-beige (label)
    Ring between them: fill rgba(221,110,66,0.2) stroke rgba(221,110,66,0.6)
    SVG text "matrix lives here" with small arrow — DM Mono 9px fill #dd6e42

  Example: bg-paper-dark rounded px-3 py-1.5 font-mono text-sm ink mt-3 inline-block
    'e.g.  JC 35709-1A  or  PORKY PRIME CUT'

KNOWN MATRICES PANEL:
  If !no_matrix_data && all_known_matrices.length > 0:
    bg-white border border-paper-dark rounded-xl p-4 mb-5
    "WHAT TO LOOK FOR" DM Mono 10px uppercase ink-soft mb-1
    "For this pressing, collectors have documented:" Lora 13px ink-soft mb-2
    Flex wrap gap-2: each matrix as bg-paper-dark rounded px-2 py-0.5 font-mono text-xs ink pill
    Note: "Any of these is a match. Type exactly what you see." Lora 12px italic ink-soft mt-2

  If no_matrix_data:
    bg-pearl-beige rounded-xl p-4 mb-5 Lora 13px ink-soft
    "We don't have matrix data on file for this pressing yet. Type exactly what you see and we'll search for it."

LIMITATIONS (border-l-4 border-burnt-peach bg-paper-dark rounded-xl p-4 mb-5):
  "A NOTE ON MATRIX MATCHING" DM Mono 10px uppercase ink-soft mb-1
  "Matrix data in Discogs is community-contributed. Coverage is excellent for common and collectible pressings. If we can't match yours, we'll say so and explain what it means for the price range." Lora 13px ink-soft

INPUTS (sides = is_double_album ? ['A','B','C','D'] : ['A','B']):
  Per side:
    "SIDE {X} MATRIX" DM Mono 10px uppercase ink-soft
    "Look near the {X} label" DM Mono 9px italic ink-soft
    Input: full-width bg-paper-dark rounded-xl font-mono py-2 px-3
    disabled if matrixSkipped[side]
    "I can't make this out" checkbox → sets matrixSkipped[side]=true

BUTTONS:
  "Identify My Pressing →" bg-burnt-peach text-white rounded-full py-3 px-6
  onClick: fetch /api/spennd/matrix with matrix_a=matrixInputs['A'] matrix_b=matrixInputs['B']
    Show result 2 seconds then advance to 'grading'

    matched → green banner "✓ Matrix matched — {pressing_label}"
    partial_match → amber banner "Partial match — one side confirmed."
    no match → amber "Matrix not matched. We'll show pricing with a note about the uncertainty."
    
    If engineer_notes.length > 0: pearl-beige cards below banner for each note

  "Skip this step →" text-ink-soft underline cursor-pointer ml-4
  onClick: setMatrixResult(null), setStep('grading')

Run npx tsc --noEmit. Fix all errors. Commit.
```

---

### Prompt 7 — Tool: Step 3 (Format + Grading)

```
Add step 'grading' to SpenndTool.tsx.

Import VINYL_CHECKLIST, CD_CHECKLIST, CONDITION_BY_VALUE, CONDITION_GRADES, 
scoreToGrade, ConditionGrade from '@/constants/conditionGrades'

State additions:
  currentQuestionIndex: number — 0
  answers: Record<string, number> — {}
  gradeGuideOpen: boolean — false

─────────
SUBSTEP A — FORMAT SELECTOR (shown when selectedFormat === null):

Heading: "Is this a vinyl record or a CD?" Playfair Display 22px ink mb-6

Two large buttons side by side (grid-cols-2 gap-4 max-w-xs):
  "💿 Vinyl" — bg-white border-2 border-paper-dark rounded-2xl p-6 text-center cursor-pointer
    hover:border-burnt-peach
  "📀 CD" — same styling

onClick: setSelectedFormat('vinyl' or 'cd'), renders checklist questions

─────────
SUBSTEP B — CHECKLIST (shown when selectedFormat is set):

Breadcrumb: release name + pressing if available
Format pill: small badge showing "VINYL" or "CD" DM Mono 9px ink-soft bg-paper-dark rounded-full px-2 py-0.5

GRADE GUIDE LINK (top right, text-xs ink-soft underline cursor-pointer):
  "? View grade guide"
  onClick: setGradeGuideOpen(true)

GRADE GUIDE PANEL (modal or slide-over, shown when gradeGuideOpen):
  role="dialog" aria-modal="true" aria-label="Grade guide"
  Escape key closes it, overlay click closes it.
  
  Heading: "Grade Guide" Playfair Display 22px ink
  
  Show all 8 grades from CONDITION_GRADES:
    Per grade: expandable row
      Collapsed: grade pill + shortLabel + description (Lora 13px ink-soft)
      Expanded (onClick toggle): also shows vinylDetail or cdDetail depending on selectedFormat
    
    Grade pill colors: M/NM green-600 | VG+ burnt-peach | VG amber-500 | G+/G stone-500 | F/P red-900
  
  "Close" button: text-sm ink-soft, mt-4

─────────
PROGRESS: "QUESTION {currentQuestionIndex + 1} OF {checklist.length}"
DM Mono 10px burnt-peach uppercase tracking-wide mb-3

PREAMBLE: Lora 14px italic ink-soft mb-6
"Condition is the other half of the value equation. A Near Mint copy can be worth 3–5× a Very Good copy of the same pressing. Answer these questions and we'll give you the standard industry grade."

current checklist = selectedFormat === 'vinyl' ? VINYL_CHECKLIST : CD_CHECKLIST
currentQ = checklist[currentQuestionIndex]

QUESTION TEXT: Lora 16px ink font-medium mb-4

Special for vinyl id === 'grooves': show instruction and pearl-beige tip before options:
  "Tilt the record under your light and look at the grooves from the side."
  Tip: "This is the one most people miss. Groove clouding means permanent damage — the record will sound noisy regardless of how clean the surface looks."

OPTIONS (flex flex-col gap-1):
  Per option: div role="radio" aria-checked={selected} tabIndex=0
  flex items-start gap-3 py-3 px-3 rounded-xl cursor-pointer
  Selected: bg-paper-dark
  Custom radio: w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5
    Unselected: border-paper-dark bg-white
    Selected: bg-burnt-peach border-burnt-peach
  Label: Lora 14px ink
  
  onClick:
    setAnswers(prev => ({ ...prev, [currentQ.id]: option.score }))
    if not last question: setTimeout(() => setCurrentQuestionIndex(i => i + 1), 400)
    else: setTimeout(() => computeAndAdvance(), 400)

  Keyboard: arrow keys navigate within question, space/enter selects

Back link (if currentQuestionIndex > 0): "← Previous question" text-sm ink-soft cursor-pointer mt-4
onClick: setCurrentQuestionIndex(i => i - 1)

─────────
computeAndAdvance():

const totalScore = Object.values(answers).reduce((sum, s) => sum + s, 0)
let computedGrade = scoreToGrade(totalScore)  // imported from conditionGrades

Conflict (vinyl only):
if (answers.visual <= 1 && answers.playback === 3):
  const grades: ConditionGrade[] = ['M','NM','VG+','VG','G+','G','F','P']
  const idx = grades.indexOf(computedGrade)
  if (idx < grades.length - 1) computedGrade = grades[idx + 1]
  setConflictNote("Your record looks better than it sounds. We adjusted the grade down — condition is based on the worst factor, not the average.")

setGrade(computedGrade)
setRecordsChecked(prev => prev + 1)  // increment session counter

Fire price fetches (non-blocking, independent):
  fetch(`/api/spennd/price?release_id=${selectedRelease.id}&condition=${computedGrade}`)
    .then(r => r.json()).then(setPriceData).catch(() => setPriceData({ available: false } as PriceData))
  fetch(`/api/spennd/ebay?q=${encodeURIComponent(`${selectedRelease.artist} ${selectedRelease.title} vinyl`)}`)
    .then(r => r.json()).then(setEbayData).catch(() => setEbayData({ available: false } as EbayData))

setStep('results')

Run npx tsc --noEmit. Fix all errors. Commit.
```

---

### Prompt 8 — Tool: Step 4 (Results + Nudge + Soft Sell)

```
Add step 'results' to SpenndTool.tsx.

Import CONDITION_BY_VALUE, CONDITION_GRADES from '@/constants/conditionGrades'
const fmt = (n: number) => `$${Math.round(n)}`

─────────
BREADCRUMB:
Left: release artist + title Lora 14px ink + pressing_label if available DM Mono 10px ink-soft
Right: "Start over" text-sm ink-soft underline cursor-pointer
  onClick: reset ALL state to initial, setStep('search')

─────────
SESSION NUDGE (show when recordsChecked >= 3 && !nudgeDismissed):

bg-pearl-beige border border-burnt-peach/30 rounded-2xl p-5 mb-5

Heading: "You've checked {recordsChecked} records." Lora 15px bold ink

Body Lora 13px ink-soft mt-1:
"Rekkrd tracks your whole collection automatically — no re-entering anything. Condition, pricing, pressing history, all of it."

Flex gap-3 mt-4:
  <Link to="/signup">
    <button className="bg-burnt-peach text-white rounded-full py-2 px-5 Lora 13px">
      Start free — takes 30 seconds →
    </button>
  </Link>
  <button onClick={() => setNudgeDismissed(true)} className="text-sm ink-soft underline">
    Keep going
  </button>

─────────
CONFLICT NOTE (if conflictNote):
border-l-4 border-amber-400 bg-amber-50 rounded-xl p-3 mb-4
Lora 13px ink-soft

─────────
MATRIX BANNER (mb-4):
  matched → bg-green-50 border border-green-200 rounded-xl p-3 text-green-800 Lora 13px
    "✓ Pressing identified — {pressing_label}"
  partial_match → amber variant
    "Partial match — one side confirmed."
  !matched → bg-pearl-beige border border-paper-dark rounded-xl p-3 Lora 13px ink-soft
    "ℹ Matrix not matched — prices may span multiple pressings. Range may be wider than usual."
  null (skipped) → same pearl-beige
    "ℹ Pressing not confirmed — prices reflect the release generally."

─────────
GRADE CARD (bg-white rounded-2xl shadow-md p-6 mb-4):
  Playfair Display 64px ink: grade abbreviation
  Lora 20px ink-soft mt-1: full name
  Lora 14px italic ink-soft mt-1: CONDITION_BY_VALUE[grade].description
  <hr className="my-4 border-paper-dark" />
  Lora 13px ink: CONDITION_BY_VALUE[grade].vinylDetail (or cdDetail if selectedFormat === 'cd')

  "Change grade" text-xs ink-soft underline cursor-pointer mt-3
  Toggle: inline grade picker grid-cols-2 gap-2 mt-3
    Each: selectable card showing shortLabel + description
    onClick: setGrade(g), re-fetch prices, close picker

─────────
DUAL PRICING PANEL (bg-white rounded-2xl shadow-sm p-6 mb-4):

Header: "What it's worth" Playfair Display 20px ink mb-4

Grid grid-cols-1 md:grid-cols-2 gap-6:

  Discogs column:
    "DISCOGS MARKETPLACE" DM Mono 9px uppercase ink-soft
    "Real sales · vinyl community" Lora 11px italic ink-soft mt-0.5
    If priceData null: Loader2 spinner animate-spin text-burnt-peach mt-4
    If available: flex gap-4 mt-3 — LOW / MEDIAN / HIGH stats
      Values Playfair Display 28px ink, labels DM Mono 9px ink-soft below
      MEDIAN: border-b-2 border-burnt-peach pb-1
      "Based on {num_for_sale} listings" DM Mono 9px ink-soft mt-2
    If unavailable: "No recent data" DM Mono 11px italic ink-soft mt-4

  eBay column: same structure
    "EBAY COMPLETED SALES" / "Real sales · last 90 days"
    "Based on {count} completed sales"
    If unavailable: "No recent data"

AGREEMENT INDICATOR (col-span-2 mt-4 pt-4 border-t border-paper-dark):
  Only if both available:
    const avg = (priceData.median + ebayData.median) / 2
    const ratio = Math.abs(priceData.median - ebayData.median) / avg
    
    ratio < 0.20 → bg-green-50 rounded-xl p-3: "✓ Both sources agree — {fmt(avg)} is a reliable anchor."
    ratio < 0.40 → bg-paper-dark rounded-xl p-3: "Sources show a moderate difference. Discogs median is generally more reliable for vinyl."
    ratio >= 0.40 → bg-amber-50 rounded-xl p-3: "Sources show different ranges. Use Discogs as your primary reference."

─────────
WIDE RANGE WARNING (if priceData?.available && priceData.high/priceData.low > 5):
border-l-4 border-amber-400 bg-amber-50 rounded-xl p-3 mb-4 Lora 13px ink-soft
"This price range is very wide — from {fmt(priceData.low)} to {fmt(priceData.high)}.
The median ({fmt(priceData.median)}) is your best single number.
{if matrix was skipped or not matched: 'Confirming your pressing via the matrix would narrow this significantly.'}"

─────────
CONDITION TABLE (bg-white rounded-2xl p-5 mb-4):
"HOW CONDITION AFFECTS PRICE" DM Mono 10px uppercase ink-soft mb-1
"Approximate — based on median as baseline" DM Mono 9px italic ink-soft mb-4

baseline = priceData?.median ?? ebayData?.median ?? null
multipliers = { M: 3.5, NM: 2.0, 'VG+': 1.0, VG: 0.5, 'G+': 0.2, G: 0.1 }

For grades [M, NM, VG+, VG, G+, G] — row per grade:
  flex items-center gap-3 py-2 px-2 rounded-xl
  User's grade: bg-paper-dark border-l-2 border-burnt-peach -mx-2 px-2
  Grade pill 28px circle: M/NM bg-green-600 | VG+ bg-burnt-peach | VG bg-amber-500 | G+/G bg-stone-500
  Label Lora 13px ink w-20
  Bar track flex-1 bg-paper-dark h-1.5 rounded: fill proportional to multiplier
  Price Playfair Display 14px ink ml-2 w-12 text-right

"Prices are approximate estimates only." DM Mono 9px ink-soft mt-3

─────────
PRICING DISCLOSURE (bg-paper-dark rounded-xl p-4 mb-4):
"ABOUT THESE PRICES" DM Mono 10px uppercase ink-soft mb-2
Lora 13px ink-soft:
"Discogs prices come from their marketplace — real completed transactions by vinyl collectors worldwide.
eBay prices are completed and sold listings from the last 90 days — outlier sales removed.
The median is your best anchor."
If matrix not confirmed: append "An original pressing can be worth significantly more than a reissue."

─────────
NO DATA STATE (if !priceData?.available && !ebayData?.available):
bg-paper-dark rounded-xl p-6 text-center
"We couldn't find recent sales data from either source." Lora 14px ink-soft mb-4
Two outbound links:
  "Search Discogs →" https://www.discogs.com/search/?q={artist+title}&type=release&format=vinyl
  "Search eBay sold →" https://www.ebay.com/sch/i.html?_nkw={artist+title}+vinyl&LH_Complete=1&LH_Sold=1
Both: border border-ink-soft text-ink rounded-full px-4 py-2 text-sm

─────────
"CHECK ANOTHER RECORD" (full-width bg-paper-dark text-ink rounded-full py-3 mt-4 cursor-pointer):
onClick: reset selectedRelease/matrixResult/grade/priceData/ebayData/answers/currentQuestionIndex/selectedFormat/conflictNote
setStep('search')
(Keep recordsChecked — intentional, it accumulates across all records in the session)

─────────
SOFT SELL (mt-8 pt-8 border-t border-paper-dark):

"FROM THE MAKERS OF SPENND" DM Mono 9px ink-soft uppercase tracking-widest

"Do you have more than one?" Playfair Display 24px ink mt-2

Lora 14px ink-soft mt-3 max-w-sm:
"Most collectors do. Rekkrd is a free app that lets you track your whole collection — with condition grading, live Discogs pricing, and a gear catalog for your full audio setup.

You just did this for one record. Rekkrd does it for all of them."

<Link to="/signup">
  <button className="mt-4 bg-burnt-peach text-white rounded-full py-3 px-6 Lora 14px">
    Start your collection free →
  </button>
</Link>
"No credit card. Free up to 100 albums." DM Mono 10px ink-soft mt-2

─────────
Run npx tsc --noEmit. Fix all errors. Commit.
```

---

### Prompt 9 — Homepage Banner

```
In the main Rekkrd landing page component (LandingPage.tsx or equivalent),
add a Spennd banner. Place it between the hero section and the features section.
Do not modify any other part of the landing page.

Banner: w-full bg-paper-dark py-4 px-6
flex items-center justify-between gap-4
flex-col sm:flex-row

Left:
  "Not sure what a record is worth?" Lora 14px ink
  "Try Spennd — our free grading and pricing tool. No account needed." Lora 13px ink-soft mt-0.5

Right:
  <Link to="/spennd" className="text-burnt-peach font-medium DM Mono text-xs hover:underline underline-offset-2 whitespace-nowrap">
    Check a record →
  </Link>

Mobile: right becomes full-width border border-burnt-peach text-burnt-peach rounded-full py-2 px-4 text-sm text-center w-full mt-2

Run npx tsc --noEmit. Fix all errors. Commit.
```

---

## Environment Variables

```bash
DISCOGS_KEY=        # discogs.com/settings/developers → Create App → App ID
DISCOGS_SECRET=     # same page → Secret
EBAY_APP_ID=        # developer.ebay.com → App Keys → Production → App ID (Client ID)
```

**eBay approval:** Apply for your eBay developer account before you start building.
Production API access takes **24–48 hours** to approve after registration.
The tool ships and works on Discogs-only in the meantime — eBay fails silently.

---

## Deployment Checklist

- [ ] `DISCOGS_KEY` and `DISCOGS_SECRET` set in Vercel and VPS `.env`
- [ ] `EBAY_APP_ID` set — **Production** key, not Sandbox (`PRD` in the key name)
- [ ] eBay Production access approved (apply 1–2 days before you need it)
- [ ] `/spennd` route outside any auth middleware — fully public
- [ ] `/api/spennd/*` excluded from auth middleware
- [ ] `npm install fast-xml-parser` committed to package.json
- [ ] `scoreToGrade` exported from `src/constants/conditionGrades.ts` (Prompt 0)
- [ ] Rate limiting active on all endpoints
- [ ] Happy path vinyl: search → label → matrix match → grade → dual pricing
- [ ] Happy path CD: same flow with CD checklist showing
- [ ] Format selector shows before grading questions
- [ ] Skip matrix flow works
- [ ] No pricing data state — outbound links work
- [ ] Double album (try "The Wall" or "London Calling")
- [ ] Promo detection (type "NOT FOR SALE" in label field)
- [ ] Engineer mark (find a Porky pressing — UK Led Zeppelin pressings are good)
- [ ] Wide price range warning
- [ ] Session nudge shows after 3rd record, "Keep going" dismisses it
- [ ] "Check another record" resets correctly, keeps counter
- [ ] Soft sell CTA links to `/signup`
- [ ] Homepage banner visible, links to `/spennd`
- [ ] Header shows logo + Sellr + Sign Up Free
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npx tsc --project tsconfig.server.json --noEmit` — 0 errors
- [ ] `npm run build` — clean
