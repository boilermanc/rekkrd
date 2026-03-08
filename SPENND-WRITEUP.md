# Spennd — Free Vinyl Grading & Pricing Tool

## What It Is

Spennd is a **free, public-facing tool** that helps vinyl record owners figure out what their records are worth. It lives at `/spennd` on Rekkrd and requires **no login, no account, and no payment**. It's designed for people who don't know much about vinyl grading or pressing identification — it walks them through the entire process step by step.

The core value proposition: **two independent real-transaction pricing sources** (Discogs marketplace stats + eBay completed sales) shown side by side. When both sources show similar numbers, the user gets genuine confidence in the value.

---

## How It Works — Two Paths

After searching for and selecting a pressing, users choose between two paths:

### Quick Check (3 steps)
`Search → Grade → Results`

Skips pressing identification entirely. User answers 3 condition questions and gets dual-source pricing in under a minute. Results include a banner noting that pressing verification was skipped, with a one-click option to switch to Deep Dive for the same record.

### Deep Dive (5 steps)
`Search → Label ID → Matrix ID → Grade → Results`

Full pressing identification flow. User reads their record's center label (label name, catalog number, year, country), then inspects the dead wax for matrix identifiers. Spennd validates both against Discogs data, detects engineer marks (PORKY, STERLING, RL, HAECO, DR), and flags promo/white label copies — all before grading.

---

## Step-by-Step Flow

### Step 1: Search

User enters **artist** and **album title** (two separate fields). Spennd searches Discogs and returns up to 6 vinyl releases. The top result is auto-selected, but the user can switch between pressings (different labels, countries, years).

- **Endpoint:** `GET /api/spennd/search?q={query}`
- Uses Discogs app credentials (no user OAuth needed)
- Rate limited: 30 req/IP/min
- 8-second abort timeout

### Path Selector

After selecting a pressing, users choose **Quick Check** or **Deep Dive**. Quick Check jumps straight to grading. Deep Dive continues to label identification.

- Quick Check sets `mode = 'quick'`, clears `matrixResult`, advances to grading
- Deep Dive sets `mode = 'deep'`, advances to label step
- Users can switch from Quick to Deep at any point (during grading or from results)

### Step 2a: Label Identification (Deep Dive only)

Guides the user to flip the record over and read the **center label**. They enter:
- Label name (e.g., "Columbia")
- Catalog number (e.g., "PC 33453")
- Year (optional)
- Country (optional)

Spennd validates these against the Discogs release data, normalizing input (uppercase, stripping spaces/dashes). It detects **promo pressings** and **white labels** via keyword matching and shows contextual callouts.

- **Endpoint:** `GET /api/spennd/label-validate?release_id={id}&catalog={val}&country={val}`
- Returns `{ confirmed: boolean, notes: string[] }`

### Step 2b: Matrix / Pressing Identification (Deep Dive only)

The educational heart of Spennd. It explains **what a matrix number is**, shows an SVG diagram of where to find it on the record's dead wax, and displays all known matrix identifiers from Discogs for that release.

The user enters what they see on each side of the record. Spennd handles:
- **Double albums:** 4 input fields (sides A, B, C, D) vs 2 for singles
- **Fuzzy matching:** exact match, contains match, and Levenshtein distance ≤ 2
- **Engineer mark detection:** recognizes PORKY, STERLING, RL, HAECO, DR and explains what they mean
- **"I can't make this out" checkboxes** per side to allow skipping
- **Skip option** with an uncertainty note carried forward to results

- **Endpoint:** `GET /api/spennd/matrix?release_id={id}&matrix_a={val}&matrix_b={val}`
- Returns match status, engineer notes, double-album flag, all known matrices

### Step 3: Grading (Both paths)

User picks their format (**Vinyl** or **CD**), then answers **3 condition questions** shown one at a time with auto-advance (400ms delay after selection):

**Vinyl questions:**
1. Visual inspection (hold under light)
2. Playback quality (sound)
3. Groove inspection (sideways view)

**CD questions:**
1. Disc appearance
2. Playback quality
3. Packaging condition

Scoring uses `scoreToGrade()` imported directly from the core Rekkrd `conditionGrades.ts` constants — no duplication. There's **conflict detection**: if a record looks pristine (visual ≤ 1) but sounds poor (playback = 3), the grade drops one level with an explanation.

During Quick Check grading, a subtle link offers: *"Want pressing verification? Switch to Deep Dive"* — clicking it preserves the selected release and starts the Deep Dive flow.

After grading, two API calls fire simultaneously:
- `GET /api/spennd/price?release_id={id}&condition={grade}` → Discogs pricing
- `GET /api/spennd/ebay?q={artist}+{title}+vinyl` → eBay Browse API pricing

### Step 4: Results (Both paths)

Displays:
- **Large grade badge** (M, NM, VG+, VG, G+, G, F, P) with a description
- **Dual pricing panel:**
  - **Discogs:** Median price from marketplace stats (24-hour cache)
  - **eBay:** Median from last 10 completed sales (6-hour cache, top/bottom 10% outliers stripped)
- **Matrix skipped banner** (Quick Check only): stone-100 background with Info icon, text "Matrix not checked. Run a Deep Dive for pressing verification." and a "Start Deep Dive →" link that resets grading but keeps the same album selected
- **Session nudge:** After 3+ records checked, shows: *"You've checked X records. Rekkrd tracks your whole collection automatically."*
- **"Check Another Record" button** resets the entire flow including mode
- **Soft sell:** "Do you have more than one?" with Rekkrd signup link

---

## Architecture

### Frontend

| File | Purpose |
|------|---------|
| `src/pages/SpenndLandingPage.tsx` | Landing page — hero, how-it-works, trust strip, embedded tool |
| `src/components/spennd/SpenndTool.tsx` | Main multi-step tool component (~1230 lines) |
| `src/components/spennd/SpenndHeader.tsx` | Lightweight public header (no auth) |
| `src/types/spennd.ts` | TypeScript interfaces |

### Backend

| File | Purpose |
|------|---------|
| `server/routes/spennd.ts` | All 5 API endpoints (~587 lines) |
| `server/lib/ebay-auth.ts` | eBay OAuth token management with caching |

### Routing

- **Frontend:** `/spennd` route in `src/index.tsx`
- **API:** `/api/spennd/*` mounted in `server/index.ts`

---

## State Management

### Key State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `step` | `'search' \| 'path' \| 'label' \| 'matrix' \| 'grading' \| 'results'` | Current step in the flow |
| `mode` | `'quick' \| 'deep' \| null` | Selected path (null before choosing) |
| `matrixSkipped` | `boolean` (derived) | `mode === 'quick'` — flags that pressing ID was skipped |
| `selectedRelease` | `DiscogsRelease \| null` | Currently selected Discogs release |
| `matrixResult` | `MatrixResult \| null` | Matrix identification result (null in quick mode) |
| `grade` | `ConditionGrade \| null` | Computed condition grade |
| `priceData` / `ebayData` | `PriceData \| EbayData \| null` | Pricing from Discogs and eBay |
| `recordsChecked` | `number` | Session counter for signup nudge |

### Step Guards

- Label step: `mode === 'deep' && step === 'label'`
- Matrix step: `mode === 'deep' && step === 'matrix'`
- These guards ensure Quick Check can never render label/matrix UI

---

## External APIs

| API | Purpose | Auth |
|-----|---------|------|
| **Discogs** | Search, release data, label/matrix validation, marketplace pricing | App credentials (`DISCOGS_CONSUMER_KEY/SECRET`) |
| **eBay Browse API** | Completed sale prices for vinyl | OAuth 2.0 client credentials, config stored in `config_settings` table |

### eBay Configuration

eBay credentials are stored in the **`config_settings`** Supabase table (`category='ebay'`), managed via the Admin Integrations page:
- `enabled` — toggle on/off
- `mode` — `sandbox` or `production`
- `sandbox_app_id`, `sandbox_cert_id` — Sandbox credentials
- `prod_app_id`, `prod_cert_id` — Production credentials

The OAuth token is cached in memory with a 1-minute safety margin before refresh.

---

## Types

```typescript
interface DiscogsRelease {
  id: number; title: string; artist: string;
  year: string; label: string; country: string;
  format: string; thumb: string;
}

interface LabelValidation {
  confirmed: boolean; notes: string[];
}

interface MatrixResult {
  matched: boolean; partial_match: boolean;
  pressing_label: string | null;
  engineer_notes: Array<{ mark: string; description: string }>;
  is_double_album: boolean; all_known_matrices: string[];
  no_matrix_data: boolean; notes: string | null;
}

interface PriceData {
  low: number | null; median: number | null; high: number | null;
  num_for_sale: number; available: boolean; cached: boolean;
}

interface EbayData {
  low: number | null; median: number | null; high: number | null;
  count: number; available: boolean; cached: boolean;
}
```

---

## Shared Constants (No Duplication)

Spennd imports directly from core Rekkrd:
- `VINYL_CHECKLIST` / `CD_CHECKLIST` — condition questions
- `CONDITION_BY_VALUE` — grade descriptions
- `CONDITION_GRADES` — all grade objects
- `scoreToGrade()` — scoring function

Changes to core grading logic automatically apply to Spennd.

---

## Caching & Rate Limits

| Resource | Cache TTL | Rate Limit |
|----------|-----------|------------|
| Discogs search | None | 30 req/IP/min |
| Label validation | None | 60 req/IP/min |
| Matrix lookup | None | 60 req/IP/min |
| Discogs prices | 24 hours | 60 req/IP/min |
| eBay prices | 6 hours | 30 req/IP/min |
| eBay OAuth token | Until expiry (−1 min) | N/A |

---

## Edge Cases & Error Handling

**Search:**
- Timeout → "We're having trouble reaching the database. Try again in a moment." with Retry button
- No results → "Nothing found. Try simpler — just artist or album title alone."

**Label Validation:**
- Catalog mismatch → flag shown, allows user to continue
- Promo/white-label detected → contextual callout

**Matrix:**
- No matrix data in Discogs → "We don't have data on file yet. Type what you see."
- Fuzzy match (Levenshtein ≤ 2) → treated as match
- One side matches, one doesn't → "Partial match — fairly common"
- Neither side matches → amber banner, prices shown with uncertainty note
- Test pressing detected → "Consider a specialist dealer."

**Grading:**
- Visual/playback conflict (looks great, sounds poor) → grade down one level with explanation

**Pricing:**
- No pricing available → shows "--"
- Outlier stripping: eBay removes top/bottom 10% before calculating median

---

## Integration with Rekkrd

- **Homepage banner:** "Not sure what a record is worth? Try Spennd"
- **SpenndHeader** links to Sellr and Sign Up
- **Session nudge** after 3+ records → soft sell for Rekkrd account
- **No auth required** — purely read-only, no user data stored, no database writes
- **eBay config managed** via Admin Integrations page

---

## Design

- **Colors:** Primary accent `#5a8a6e` (warm sage), Rekkrd palette (paper, ink)
- **Typography:** Playfair Display (headings), Lora (body), DM Mono (labels/UI)
- **Theme:** Light only — `bg-paper`, `text-ink`
- **Path selector cards:** `bg-white border border-stone-200 rounded-xl p-6`
- **Quick Check button:** filled `#5a8a6e` (primary)
- **Deep Dive button:** outlined `border-[#5a8a6e]`

---

## Why It Exists

Spennd serves as a **top-of-funnel acquisition tool** for Rekkrd. It solves a real problem (vinyl valuation) with zero friction, builds trust through dual-source pricing, and gently nudges users toward signing up for the full collection management app after they've used it a few times. The Quick Check / Deep Dive split lets casual users get a fast answer while serious collectors can do full pressing verification — both paths end with a soft sell for Rekkrd.
