# Rekkrd — Condition Grading & Collection Value
## Full Implementation Spec — Batches 37–41

**Read claude.md before starting. Run `npx tsc --noEmit` after every task. Do not mark any task complete if tsc returns errors. Do not modify files outside the scope of each task. Commit after each passing task.**

---

## Context & Design Decisions

This feature adds vinyl/CD condition grading (Goldmine/Discogs standard), a "My Copy" tab on the album detail page, a grading assistant bottom sheet, and a collection value dashboard tile. All UI is light theme using the existing brand palette.

**Brand palette (already in tailwind config — use these):**
- `burnt-peach`: `#dd6e42` — vinyl accent, primary CTA
- `blue-slate`: `#4f6d7a` — CD accent, secondary
- `pearl-beige`: `#e8dab2` — warm highlight
- `paper`: `#faf6ef` — light background
- `paper-dark`: `#ede4d3` — card/field background
- `ink`: `#2a2016` — primary text

**Typography (already loaded):**
- Display: `Playfair Display` — grades, amounts, headings
- Mono: `DM Mono` — labels, eyebrows, badges
- Body: `Lora` — descriptions, notes

**Design principle:** My Copy and grading are always light theme. The About tab retains its dark immersive style. The contrast between tabs is intentional.

---

## Batch 37 — Foundation (Data & Constants)

### Task 37.1 — Create shared condition grades constant

Create `src/constants/conditionGrades.ts`:

```typescript
export type ConditionGrade = 'M' | 'NM' | 'VG+' | 'VG' | 'G+' | 'G' | 'F' | 'P';

export interface ConditionOption {
  value: ConditionGrade;
  label: string;
  shortLabel: string;
  sortOrder: number;
  discogsKey: string;
  description: string;
  vinylDetail: string;
  cdDetail: string;
}

export const CONDITION_GRADES: ConditionOption[] = [
  {
    value: 'M',
    label: 'Mint (M)',
    shortLabel: 'M',
    sortOrder: 1,
    discogsKey: 'Mint (M)',
    description: 'Perfect. Unplayed. Often still sealed.',
    vinylDetail: 'No marks whatsoever. Grooves pristine. Rarely assigned — if you have played it, it is not Mint.',
    cdDetail: 'Sealed or unplayed. Mirror-like disc. No marks on case, booklet, or tray.',
  },
  {
    value: 'NM',
    label: 'Near Mint (NM)',
    shortLabel: 'NM',
    sortOrder: 2,
    discogsKey: 'Near Mint (NM or M-)',
    description: 'Nearly perfect. May have been played once or twice.',
    vinylDetail: 'No visible marks under normal light. Grooves sharp. Dead quiet between tracks.',
    cdDetail: 'Disc mirror-like or near-so. Fine hairlines only. All inserts present and perfect.',
  },
  {
    value: 'VG+',
    label: 'Very Good Plus (VG+)',
    shortLabel: 'VG+',
    sortOrder: 3,
    discogsKey: 'Very Good Plus (VG+)',
    description: 'Light signs of play. Looks great, plays quietly.',
    vinylDetail: 'Faint marks visible only under direct light. Occasional faint tick. The sweet spot for most collections.',
    cdDetail: 'Light hairlines on disc. Plays flawlessly. Booklet and case in good shape with minor wear.',
  },
  {
    value: 'VG',
    label: 'Very Good (VG)',
    shortLabel: 'VG',
    sortOrder: 4,
    discogsKey: 'Very Good (VG)',
    description: 'Clearly played. Surface noise present but enjoyable.',
    vinylDetail: 'Marks visible in normal light. Audible surface noise but does not overpower music.',
    cdDetail: 'Visible scratches in normal light. May have occasional skip. Wear on packaging.',
  },
  {
    value: 'G+',
    label: 'Good Plus (G+)',
    shortLabel: 'G+',
    sortOrder: 5,
    discogsKey: 'Good Plus (G+)',
    description: 'Heavy wear. Still plays through without skipping.',
    vinylDetail: 'Heavy marks clearly visible. Significant surface noise. A beater copy. Rarely used for CDs.',
    cdDetail: 'Heavy scratches. Plays with difficulty. Missing or damaged inserts.',
  },
  {
    value: 'G',
    label: 'Good (G)',
    shortLabel: 'G',
    sortOrder: 6,
    discogsKey: 'Good (G)',
    description: 'Very heavy wear. Music barely audible over noise.',
    vinylDetail: 'Very heavy marks and scratches. Significant groove damage. Possible skips.',
    cdDetail: 'Deep gouges. Skips frequently or will not load reliably.',
  },
  {
    value: 'F',
    label: 'Fair (F)',
    shortLabel: 'F',
    sortOrder: 7,
    discogsKey: 'Fair (F)',
    description: 'Damaged. Plays with great difficulty.',
    vinylDetail: 'Plays but with extreme noise and skipping. Value only as a placeholder.',
    cdDetail: 'Barely readable. Catastrophic scratch damage.',
  },
  {
    value: 'P',
    label: 'Poor (P)',
    shortLabel: 'P',
    sortOrder: 8,
    discogsKey: 'Poor (P)',
    description: 'Essentially unplayable. Value only from rarity.',
    vinylDetail: 'Unplayable. Worth keeping only if extremely rare pressing.',
    cdDetail: 'Will not play. Disc physically damaged.',
  },
];

export const CONDITION_ORDER: Record<ConditionGrade, number> = Object.fromEntries(
  CONDITION_GRADES.map((g) => [g.value, g.sortOrder])
) as Record<ConditionGrade, number>;

export const CONDITION_BY_VALUE: Record<ConditionGrade, ConditionOption> = Object.fromEntries(
  CONDITION_GRADES.map((g) => [g.value, g])
) as Record<ConditionGrade, ConditionOption>;

// Vinyl-specific checklist questions
export const VINYL_CHECKLIST = [
  {
    id: 'visual',
    question: 'Hold the record under a light — what do you see?',
    options: [
      { label: 'No marks at all. Looks factory new.', score: 0 },
      { label: 'Faint marks only under direct light. Looks great normally.', score: 1 },
      { label: 'Marks visible in normal light. Clearly been played.', score: 2 },
      { label: 'Heavy marks, deep scratches clearly visible.', score: 3 },
    ],
  },
  {
    id: 'playback',
    question: 'How does it sound when played?',
    options: [
      { label: 'Unplayed or silent between tracks.', score: 0 },
      { label: 'Very quiet. Occasional faint tick or pop.', score: 1 },
      { label: 'Noticeable surface noise throughout.', score: 2 },
      { label: 'Heavy noise, skips, or struggles to track.', score: 3 },
    ],
  },
  {
    id: 'grooves',
    question: 'Look at the grooves edge-on under light',
    options: [
      { label: 'Grooves look sharp and deep. No clouding.', score: 0 },
      { label: 'Light cloudy haze in groove walls.', score: 1 },
      { label: 'Visible whitening throughout groove walls.', score: 2 },
    ],
  },
];

export const CD_CHECKLIST = [
  {
    id: 'disc',
    question: 'Look at the disc under a light — what do you see?',
    options: [
      { label: 'Mirror-like. No marks whatsoever.', score: 0 },
      { label: 'Fine hairlines only. Looks great.', score: 1 },
      { label: 'Visible scratches in normal light.', score: 2 },
      { label: 'Deep gouges or surface damage.', score: 3 },
    ],
  },
  {
    id: 'playback',
    question: 'How does it play?',
    options: [
      { label: 'Unplayed. Loads instantly, perfect.', score: 0 },
      { label: 'Plays flawlessly without any issues.', score: 1 },
      { label: 'Occasional skip or stutter.', score: 2 },
      { label: "Won't load or skips constantly.", score: 3 },
    ],
  },
  {
    id: 'packaging',
    question: 'Check booklet, tray card & case',
    options: [
      { label: 'All inserts present and perfect.', score: 0 },
      { label: 'Minor wear. All inserts present.', score: 1 },
      { label: 'Creasing, missing inserts, or cracked case.', score: 2 },
    ],
  },
];

// Score → grade mapping
// Total score 0 = M, 1 = NM, 2-3 = VG+, 4-5 = VG, 6-7 = G+, 8+ = G
export function scoreToGrade(total: number): ConditionGrade {
  if (total === 0) return 'M';
  if (total === 1) return 'NM';
  if (total <= 3) return 'VG+';
  if (total <= 5) return 'VG';
  if (total <= 7) return 'G+';
  return 'G';
}
```

Update `CollectionList.tsx` to import `CONDITION_ORDER` from this file instead of its local definition. Update `AlbumDetailModal.tsx` to import `CONDITION_GRADES` from this file instead of its local array. Run `npx tsc --noEmit`. Commit.

---

### Task 37.2 — Supabase migration: condition grade format + My Copy columns

Run this SQL in the Supabase dashboard SQL editor. Then confirm the columns exist before proceeding.

```sql
-- Step 1: Normalize existing condition grade values to short codes
UPDATE albums SET condition = 'M'   WHERE condition = 'Mint (M)' OR condition = 'Mint';
UPDATE albums SET condition = 'NM'  WHERE condition = 'Near Mint (NM)' OR condition = 'Near Mint (NM or M-)' OR condition = 'Near Mint';
UPDATE albums SET condition = 'VG+' WHERE condition = 'Very Good Plus (VG+)' OR condition = 'Very Good Plus';
UPDATE albums SET condition = 'VG'  WHERE condition = 'Very Good (VG)' OR condition = 'Very Good';
UPDATE albums SET condition = 'G+'  WHERE condition = 'Good Plus (G+)' OR condition = 'Good Plus';
UPDATE albums SET condition = 'G'   WHERE condition = 'Good (G)' OR condition = 'Good';
UPDATE albums SET condition = 'F'   WHERE condition = 'Fair (F)' OR condition = 'Fair';
UPDATE albums SET condition = 'P'   WHERE condition = 'Poor (P)' OR condition = 'Poor';

-- Step 2: Add My Copy columns (all nullable — nothing is required)
ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS purchase_price     DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS acquired_date      DATE,
  ADD COLUMN IF NOT EXISTS acquired_from      TEXT,
  ADD COLUMN IF NOT EXISTS copy_notes         TEXT,
  ADD COLUMN IF NOT EXISTS pressing_country   TEXT,
  ADD COLUMN IF NOT EXISTS pressing_year      INTEGER,
  ADD COLUMN IF NOT EXISTS catalog_number     TEXT,
  ADD COLUMN IF NOT EXISTS is_for_sale        BOOLEAN DEFAULT FALSE;

-- Step 3: Create price cache table
CREATE TABLE IF NOT EXISTS discogs_price_cache (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id      TEXT NOT NULL,
  prices          JSONB NOT NULL,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_release UNIQUE (release_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_price_cache_release_id ON discogs_price_cache (release_id);
CREATE INDEX IF NOT EXISTS idx_price_cache_fetched_at ON discogs_price_cache (fetched_at);
```

Update the `Album` and `NewAlbum` TypeScript types in `src/types.ts` to include all new columns. All new fields should be optional (`field?: Type`). Run `npx tsc --noEmit`. Commit.

---

### Task 37.3 — Discogs price API route

Create `api/discogs-price.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { validateUUID } from './_validate'; // existing helper

const CACHE_TTL_HOURS = 24;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { releaseId } = req.query;

  if (!releaseId || typeof releaseId !== 'string' || !/^\d+$/.test(releaseId)) {
    return res.status(400).json({ error: 'Invalid release ID' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Check cache first
    const { data: cached } = await supabase
      .from('discogs_price_cache')
      .select('prices, fetched_at')
      .eq('release_id', releaseId)
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      const ageHours = age / (1000 * 60 * 60);
      if (ageHours < CACHE_TTL_HOURS) {
        return res.status(200).json({ prices: cached.prices, cached: true });
      }
    }

    // Fetch from Discogs
    const discogsToken = process.env.DISCOGS_API_TOKEN;
    if (!discogsToken) {
      return res.status(503).json({ error: 'Discogs not configured' });
    }

    const response = await fetch(
      `https://api.discogs.com/marketplace/price-suggestions/${releaseId}`,
      {
        headers: {
          Authorization: `Discogs token=${discogsToken}`,
          'User-Agent': 'Rekkrd/1.0 +https://rekkrd.com',
        },
      }
    );

    if (response.status === 404) {
      return res.status(404).json({ error: 'Release not found on Discogs' });
    }

    if (!response.ok) {
      return res.status(502).json({ error: 'Discogs API error' });
    }

    const data = await response.json();

    // Upsert cache
    await supabase.from('discogs_price_cache').upsert({
      release_id: releaseId,
      prices: data,
      fetched_at: new Date().toISOString(),
    });

    return res.status(200).json({ prices: data, cached: false });
  } catch (err: unknown) {
    console.error('Price fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

Run `npx tsc --project tsconfig.server.json --noEmit`. Commit.

---

### Task 37.4 — Update album CRUD to persist My Copy fields

In the existing `api/albums.ts` (or wherever `handleUpdateAlbum` posts to the backend), ensure the following fields are included in the update payload when present:

```
purchase_price, acquired_date, acquired_from, copy_notes,
pressing_country, pressing_year, catalog_number, is_for_sale
```

In the Supabase update call, spread these fields from the album object. All are optional — only include if the value is not undefined. Do not change any other logic in this file. Run `npx tsc --noEmit`. Commit.

---

## Batch 38 — My Copy Tab

### Task 38.1 — Add tab structure to album detail

The album detail page/modal currently shows content in a single view. Add a two-tab structure: **About** and **My Copy**.

Requirements:
- Default tab is always **About**. All existing content stays in About — do not move or remove anything.
- **My Copy** tab renders a new `MyCopyTab` component (created in 38.2).
- Tab bar sits below the album header (artwork + title + artist row), above the content area.
- Tab bar styling — light theme, paper background:
  - Inactive tab: `font-family: DM Mono`, `text-xs tracking-widest uppercase`, `text-ink-soft`, `border-b-2 border-transparent`
  - Active tab: `text-burnt-peach border-b-2 border-burnt-peach`
  - Tab bar background: `bg-paper border-b border-paper-darker`
- Use local `useState` for active tab. No router changes.
- ARIA: tabs use `role="tab"`, `aria-selected`, `aria-controls`. Tab panels use `role="tabpanel"`.
- Run `npx tsc --noEmit`. Commit.

---

### Task 38.2 — Build MyCopyTab component

Create `src/components/MyCopyTab.tsx`.

Props:
```typescript
interface MyCopyTabProps {
  album: Album;
  onUpdate: (updates: Partial<Album>) => Promise<void>;
  userPlan: 'collector' | 'curator' | 'archivist';
  discogsConnected: boolean;
}
```

**Layout — top to bottom:**

**1. Condition section**

Eyebrow label: `CONDITION` with a ruled line extending to the right edge.

If `album.condition` is set — show the Condition Hero card:
- Left accent bar in `burnt-peach`
- Circular badge (52×52, dark ink background, pearl-beige text, Playfair Display bold) showing the grade short label e.g. `VG+`
- Right of badge: grade full name in Playfair Display 15px, italic description from `CONDITION_BY_VALUE[album.condition].description` in Lora 11px ink-soft
- Far right: `Edit` button (outlined, burnt-peach) — opens `GradingSheet` component (built in Batch 39) with the current grade pre-selected

If `album.condition` is not set — show an invitation card:
- Same card shape, dashed border in paper-darker
- Text: "Grade your copy" in Playfair Display ink-soft
- Subtext: "Takes 30 seconds. Unlocks value estimates." in Lora italic ink-soft
- CTA button: "Grade Now" filled burnt-peach — opens GradingSheet

**2. Value section** (below condition)

Three sub-states:

**a) No condition set:** Do not render this section at all.

**b) Condition set, user is Collector or Curator plan:**
- Card with ink background, pearl-beige text
- "Unlock Value Estimates" heading in Playfair Display
- Body: "See what your copy is worth based on live Discogs marketplace data." in Lora italic
- CTA: "Upgrade to Archivist" button in burnt-peach

**c) Condition set, Archivist plan, Discogs not connected:**
- Same card, ink background
- "Connect Discogs to see value" heading
- Body: "Link your Discogs account to unlock marketplace pricing."
- CTA: "Connect Discogs" — links to existing Discogs OAuth flow

**d) Condition set, Archivist plan, Discogs connected:**
- Fetch from `/api/discogs-price?releaseId={album.discogs_release_id}` on mount (only if releaseId exists)
- Loading state: skeleton pulse in card shape
- Error state: "Pricing unavailable — try again later" in ink-soft italic
- Success state:
  - Card with ink background
  - Eyebrow: `EST. VALUE ({album.condition})` in DM Mono 8px tracking-widest
  - Large amount in Playfair Display 28px pearl-beige — use the median price for the user's condition grade from the Discogs response, formatted as `$XX`
  - Sub-row: `$low – $high range · N for sale` in DM Mono 9px muted
  - Right column: `via Discogs` badge (DM Mono, bordered, muted) + `View listings →` link in burnt-peach that opens Discogs marketplace URL in new tab with `noopener,noreferrer`

**3. My Copy fields section**

Eyebrow: `MY COPY`

2-column grid of field items (paper-dark background, cream card, 1px divider border):
- Paid (`purchase_price`) — format as `$XX.XX` if set, else `—`
- Acquired (`acquired_date`) — format as `Mon YYYY` if set, else `—`
- Source (`acquired_from`) — freeform text, else `—`
- Format — read from existing `album.format` field

Full-width field:
- Notes (`copy_notes`) — multiline, else `—`

Each field: `DM Mono 7px tracking-widest uppercase` label, `Lora 13px ink` value.

Tapping any field opens an inline edit state (simple input/textarea in the same card). On blur/enter: call `onUpdate` with the new value. Show a subtle checkmark confirmation. No separate save button.

**4. Pressing section**

Eyebrow: `PRESSING`

Single card with rows (key/value pairs with dividers):
- Label: `album.label`
- Cat. No.: `album.catalog_number` — highlight in blue-slate if set
- Country: `album.pressing_country`
- Year: `album.pressing_year || album.year` — highlight in blue-slate if it differs from release year

Same inline-edit behaviour as fields above.

**5. Footer stamp**

Centered: thin lines either side of `REKKRD` in DM Mono 7px tracking-widest, opacity 20%.

**Annotation:**
Position absolute top-right of the whole panel, rotated -2deg, `acquired_date` formatted as `acquired YYYY` in Lora italic 10px ink-soft opacity 40%. Only shown if `acquired_date` is set.

**Background:** `bg-paper-warm`. Subtle horizontal ruled lines at 32px intervals using CSS `repeating-linear-gradient` at 10% opacity.

Run `npx tsc --noEmit`. Commit.

---

## Batch 39 — Grading Sheet

### Task 39.1 — Build GradingSheet component

Create `src/components/GradingSheet.tsx`.

This is a bottom sheet (modal that slides up from the bottom). It is format-aware — it shows different questions for vinyl vs CD.

Props:
```typescript
interface GradingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onGradeSelected: (grade: ConditionGrade) => void;
  format: string; // album.format — 'LP', '7"', '12"', 'CD', 'EP' etc.
  currentGrade?: ConditionGrade;
}
```

**Determine format type:**
```typescript
const isCD = format?.toLowerCase().includes('cd');
const checklist = isCD ? CD_CHECKLIST : VINYL_CHECKLIST;
const accentColor = isCD ? 'blue-slate' : 'burnt-peach';
```

**Sheet structure:**

- Overlay: `fixed inset-0 bg-ink/40 z-40` — tap to close
- Sheet: `fixed bottom-0 left-0 right-0 z-50 bg-paper-warm rounded-t-3xl` with CSS transition `transform` sliding up from `translateY(100%)` to `translateY(0)`
- Handle bar: centered, 32×3px, rounded, paper-darker
- Header row: "Grade Your Copy" in Playfair Display 18px ink + close button (circular, paper-dark, ×)
- Mode tabs: two-segment control — "Help Me Grade" | "Grade Guide" — paper-dark background, active segment has ink background with pearl-beige text

**Mode 1: Help Me Grade (checklist)**

Import `VINYL_CHECKLIST` or `CD_CHECKLIST` based on format.

State: `answers: Record<string, number>` — keyed by question `id`.

For each question:
- Section label: `DM Mono 8px tracking-widest uppercase ink-soft` with numbered circle badge in accent color
- Options list — each option is a tappable card:
  - Default: `bg-paper-dark rounded-xl border-2 border-transparent`
  - Selected vinyl: `border-burnt-peach bg-burnt-peach/10`
  - Selected CD: `border-blue-slate bg-blue-slate/10`
  - Radio circle: unselected = `border-paper-darker`, selected = filled with accent color + white center dot
  - Option text in Lora 12px ink

For vinyl Q1 (visual), show groove color bars below the option text:
- 5 small bars `h-1 flex-1 rounded`, colors ranging from dark green (pristine) through amber to red (heavy wear)
- Score 0: all `#2d3a2e`, Score 1: mixed green/slate, Score 2: amber/brown, Score 3: red/brown

For CD Q3 (packaging), show three small labeled boxes: Booklet | Tray | Case
- Color them green (present/good), amber (worn), or grey (missing) based on score

**Suggested grade result bar** (always visible at bottom of checklist):
- Compute: `const total = Object.values(answers).reduce((a, b) => a + b, 0)`
- Grade: `scoreToGrade(total)` from conditionGrades.ts
- If no answers yet: show `—` and grey result bar
- If answers present: dark ink bar showing suggested grade in Playfair Display + full name in Lora italic + "Apply Grade" filled button in accent color
- On "Apply Grade": call `onGradeSelected(grade)` then `onClose()`

**Mode 2: Grade Guide (reference)**

Introductory line: *"Grades follow the Goldmine/Discogs standard — used by collectors worldwide."* in Lora italic 12px ink-soft.

For each grade in `CONDITION_GRADES`:
- Row: grade pill (circular badge, colour-coded by grade tier) + grade name in DM Mono + description
- Description: show `vinylDetail` or `cdDetail` based on format
- For NM/VG+/VG, show groove bars (vinyl) or simple disc icon (CD)

Grade pill colors:
- M/NM: dark green background, light green text
- VG+: blue-slate background, pale-sky text
- VG: amber/brown background, pearl text
- G+/G: warm red-brown background, muted text
- F/P: very dark, muted

Scrollable area — `max-h-96 overflow-y-auto`.

Run `npx tsc --noEmit`. Commit.

---

### Task 39.2 — Wire GradingSheet into MyCopyTab

In `MyCopyTab.tsx`:

- Import `GradingSheet`
- Add state: `const [gradingOpen, setGradingOpen] = useState(false)`
- "Grade Now" and "Edit" buttons both set `gradingOpen = true`
- `onGradeSelected` handler: call `onUpdate({ condition: grade })` then close sheet
- If grade was already set, pass `currentGrade={album.condition}` to sheet

Run `npx tsc --noEmit`. Commit.

---

## Batch 40 — Dashboard Collection Value Tile

### Task 40.1 — Build CollectionValueTile component

Create `src/components/CollectionValueTile.tsx`.

Props:
```typescript
interface CollectionValueTileProps {
  albums: Album[];
  userPlan: 'collector' | 'curator' | 'archivist';
  discogsConnected: boolean;
}
```

**Compute derived state:**
```typescript
const totalAlbums = albums.length;
const gradedAlbums = albums.filter(a => a.condition);
const gradedCount = gradedAlbums.length;
const gradedPercent = totalAlbums > 0 ? Math.round((gradedCount / totalAlbums) * 100) : 0;
```

**Three states — render exactly one:**

---

**STATE 1: No grades set (`gradedCount === 0`)**

Card: `bg-cream rounded-2xl border-2 border-dashed border-paper-darker shadow-sm`

Contents (centered column):
- Icon: clock SVG in `text-ink-soft opacity-40`, 44×44, in circular paper-dark container
- Heading: "Value unknown" — Playfair Display 15px ink-soft
- Body: "Grade your records to unlock collection value estimates based on live Discogs marketplace data." — Lora 11px ink-soft italic
- CTA button: "Start Grading →" — `bg-burnt-peach-light border border-burnt-peach-mid text-burnt-peach` DM Mono 8px tracking-widest
  - On click: emit an `onStartGrading` callback prop that the parent can use to navigate/highlight the first ungraded record

---

**STATE 2: Partial grades (`gradedCount > 0 && gradedCount < totalAlbums`)**

Fetch prices for graded albums that have `discogs_release_id` set and user is Archivist with Discogs connected. For others, skip pricing — show count only.

Card: `bg-cream rounded-2xl border border-divider shadow-sm overflow-hidden`

Top section (padding 18px):
- Large amount in Playfair Display 34px ink — sum of median prices for graded albums (if available), else `—`
- Qualifier below in Lora 10px italic ink-soft: "estimated across graded records" or "grade more records to see value" if no prices available
- Right: badge showing graded count (Playfair Display 16px ink-mid) with label "Graded" (DM Mono 7px ink-soft)

Progress bar:
- Track: `bg-paper-dark h-1 rounded`
- Fill: `bg-gradient-to-r from-burnt-peach to-burnt-peach-mid` at `{gradedPercent}%` width
- Labels below: "{gradedCount} of {totalAlbums} graded" + "{gradedPercent}%"

Nudge strip (paper-dark background, top border):
- Text: "{totalAlbums - gradedCount} records not yet graded — value may be higher"
- Right: "Grade now →" link in burnt-peach

---

**STATE 3: All graded (`gradedCount === totalAlbums && totalAlbums > 0`)**

Fetch prices for all albums with `discogs_release_id`. Cache-aware — use the `discogs_price_cache` table via the `/api/discogs-price` endpoint.

Card: `bg-cream rounded-2xl border border-divider shadow-sm overflow-hidden` with a 2px top accent line in `burnt-peach`.

Header (padding 18px):
- Total value in Playfair Display 38px ink
- Qualifier: "across all {totalAlbums} records" in Lora 10px italic ink-soft
- If Archivist + Discogs connected and value available: trend badge (green background) showing `↑ $X this month` — compare stored value snapshot from last 30 days if available, otherwise omit

Condition breakdown (14px padding):
For each grade that appears in the collection (sorted by CONDITION_ORDER):
- Row: grade pill (circular, 30×30, colour-coded) + bar track (flex-1, paper-dark) + fill (width proportional to value contribution) + count + formatted value
- Only show grades that have at least 1 record

Upgrade candidates strip (paper-warm background, top border):

Only show if Archivist + Discogs connected:

```typescript
// For each graded album with a release_id and price data:
// Calculate value gain if upgraded to next grade
// Show top 3 with highest gain
```

Each upgrade item:
- Album title in Lora 12px ink + "Current Grade → Next Grade · upgrade value" in DM Mono 7px ink-soft
- Right: `+$XX` in Playfair Display 14px green-text + "if upgraded" in DM Mono 7px muted green

Updated row (top border, 9px padding):
- "Updated nightly · last sync X ago" in DM Mono 7px paper-darker
- "Refresh →" in DM Mono 7px ink-soft — triggers a re-fetch bypassing cache

**Gating:** If user is Collector or Curator — show State 1 empty state with an upgrade prompt instead of value data, regardless of how many records are graded.

Run `npx tsc --noEmit`. Commit.

---

### Task 40.2 — Add CollectionValueTile to the dashboard

In the main dashboard / collection page component, add `CollectionValueTile` below the existing stats row (total records, genres, artists) and above the collection grid/list.

Pass:
- `albums={albums}` — the full collection array already in state
- `userPlan={userPlan}` — from existing auth/subscription context
- `discogsConnected={!!discogsOAuthToken}` — from existing Discogs context

Do not change any other dashboard layout. Run `npx tsc --noEmit`. Commit.

---

## Batch 41 — Polish, Empty States & Gating

### Task 41.1 — My Copy first-time empty state

When a user opens My Copy for the first time (no condition, no purchase price, no notes set at all), the tab should feel like an invitation, not a form.

Show a single centered card instead of all the empty field grids:

```
[Vinyl icon or simple record illustration in ink-soft]

"Make it yours"
(Playfair Display 20px ink)

"Track condition, what you paid, where you got it.
 Your copy — your story."
(Lora 14px italic ink-soft, centered)

[ Grade Your Copy → ]   [ Add Details → ]
(two buttons side by side — burnt-peach outlined)
```

"Grade Your Copy" opens GradingSheet. "Add Details" transitions the tab into the normal My Copy layout with all fields in edit mode.

Once any field is saved, this empty state never shows again for that album.

Run `npx tsc --noEmit`. Commit.

---

### Task 41.2 — Condition sort fix in CollectionList

Now that condition grades are stored as short codes (`VG+`, `NM`, etc.), verify the sort in `CollectionList.tsx` works correctly.

Import `CONDITION_ORDER` from `src/constants/conditionGrades.ts`. Ensure the sort comparator uses:
```typescript
const aOrder = CONDITION_ORDER[a.condition as ConditionGrade] ?? 99;
const bOrder = CONDITION_ORDER[b.condition as ConditionGrade] ?? 99;
```

Also add a condition badge to each album card/row in the collection list — if `album.condition` is set, show the `shortLabel` as a small pill badge (DM Mono 8px, paper-dark background, rounded-full). If not set, show nothing — not a dash, not a blank.

Run `npx tsc --noEmit`. Commit.

---

### Task 41.3 — Subscription gating audit

Audit all new components for consistent gating:

| Feature | Collector | Curator | Archivist |
|---|---|---|---|
| My Copy tab (condition + fields) | ✅ Free | ✅ Free | ✅ Free |
| Grade checklist + guide | ✅ Free | ✅ Free | ✅ Free |
| Value estimate (Discogs pricing) | ❌ Upgrade prompt | ❌ Upgrade prompt | ✅ |
| Upgrade candidates | ❌ | ❌ | ✅ |
| Collection value tile full | ❌ | ❌ | ✅ |

Use the existing `UpgradePrompt` component and `requirePlan` pattern for all gates. The upgrade prompt for value features should say: *"See what your collection is worth — upgrade to Archivist to unlock live Discogs pricing."*

Run `npx tsc --noEmit`. Commit.

---

### Task 41.4 — ARIA and accessibility pass

For all new components, verify:

- `GradingSheet`: trap focus when open, `Escape` closes, overlay click closes, `role="dialog"` `aria-modal="true"` `aria-label="Grade your copy"`
- Tab bar: `role="tablist"`, each tab `role="tab"` `aria-selected` `aria-controls`, each panel `role="tabpanel"` `aria-labelledby`
- Checklist radio options: `role="radio"` `aria-checked` — keyboard navigable with arrow keys
- Condition badge edit button: `aria-label="Edit condition grade"`
- CollectionValueTile progress bar: `role="progressbar"` `aria-valuenow` `aria-valuemin="0"` `aria-valuemax="100"`
- All interactive elements have visible focus rings — `focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2`

Run `npx tsc --noEmit`. Commit.

---

### Task 41.5 — Final build verification

Run in sequence:

```powershell
npx tsc --noEmit
npx tsc --project tsconfig.server.json --noEmit
npm run build
```

All three must pass with zero errors. If any error exists, fix it before considering this batch complete.

Then do a manual smoke test checklist:
- [ ] Album detail opens on About tab by default
- [ ] Switching to My Copy tab works
- [ ] First-time empty state shows for ungraded album
- [ ] "Grade Your Copy" opens grading sheet
- [ ] Checklist answers produce a suggested grade
- [ ] "Apply Grade" saves condition and closes sheet
- [ ] Condition badge shows in My Copy after grading
- [ ] "Edit ?" opens grading sheet pre-populated
- [ ] Grade Guide tab shows all 8 grades with descriptions
- [ ] CD format shows CD checklist (packaging question)
- [ ] Vinyl format shows vinyl checklist (grooves question)
- [ ] Value row shows upgrade prompt for Collector plan
- [ ] Value row shows Discogs price for Archivist + connected
- [ ] Collection value tile shows all three states correctly
- [ ] Condition sort in collection list works correctly
- [ ] Condition badge shows on collection list cards
- [ ] `npx tsc --noEmit` returns 0 errors after all fixes

Commit with message: `feat: condition grading, My Copy tab, collection value tile (Batches 37-41)`

---

## Running This Overnight with Claude Code

From the project root in terminal:

```bash
claude --dangerously-skip-permissions "Implement the spec in BATCH-GRADING-SPEC.md exactly as written. Work through each task in order. Run npx tsc --noEmit after each task and fix any errors before proceeding. Do not modify files outside the scope of each task. Commit after each passing task with the task number in the commit message."
```

**Important:** Run this from inside your project directory, pointed at a feature branch — not main.

```bash
git checkout -b feat/condition-grading
claude --dangerously-skip-permissions "..."
```

In the morning, review the commits and run the smoke test checklist above before merging.
