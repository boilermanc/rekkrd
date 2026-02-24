# Stakkd — Audio Gear Catalog

> AI-powered audio gear documentation, signal chain ordering, and setup guides inside Rekkrd.

---

## What It Does

Stakkd lets users document their audio gear (turntable, preamp, amp, speakers, etc.), arrange it in signal chain order, and get AI-generated setup guides for wiring everything together.

**Core Flow:**
1. User scans gear with phone camera (or uploads a photo, or adds manually)
2. Gemini Vision identifies the brand, model, category, specs
3. Gear is saved to the user's collection
4. User arranges gear in signal chain order via drag-and-drop
5. "How to Connect" generates an AI setup guide with cable types, recommended settings, and tips

---

## Navigation

- **Desktop:** "Stakkd" tab in the main header
- **Mobile:** Bottom nav icon (amplifier/receiver graphic)
- Renders when `currentView === 'stakkd'` in `App.tsx`

---

## UI States

### 1. Loading
Spinning record animation + "Loading Stakkd" text.

### 2. Error
Warning icon + "Could not load your gear" + Retry button.

### 3. Empty (no gear yet)
- Signal chain illustration: turntable → amp → speaker (SVG)
- Three action buttons: **Scan Gear**, **Upload Image**, **Add Manually**
- Three feature highlight cards:
  - AI Identification — snap a photo, auto-identify
  - Manual Finder — lost your manual? We'll find the PDF
  - Setup Guide — custom wiring instructions for your gear

### 4. Gear List (main view)
- **Header:** "Stakkd" title + gear count
  - Free-tier users see dot indicators (`3 of 5 gear`)
  - Paid users see plain count (`7 pieces`)
- **Category filter chips:** All, Turntable, Cartridge, etc. (only shows categories the user has)
- **Sort dropdown:** Signal Chain | Brand A–Z | Newest First | Category
- **Drag-to-reorder** with signal chain connector arrows (only in Signal Chain sort, no filter)
- **Mobile move buttons:** up/down arrows on each card (visible on small screens)
- **First-time hint:** "Drag to reorder your gear into signal chain order" (dismissible, shows for 1–2 items)
- **Free-tier upgrade banner** at bottom

---

## Gear Categories

| Key | Label |
|-----|-------|
| `turntable` | Turntable |
| `cartridge` | Cartridge |
| `phono_preamp` | Phono Preamp |
| `preamp` | Preamp |
| `amplifier` | Amplifier |
| `receiver` | Receiver |
| `speakers` | Speakers |
| `headphones` | Headphones |
| `dac` | DAC |
| `subwoofer` | Subwoofer |
| `cables_other` | Cables / Other |

---

## Components

| File | Purpose |
|------|---------|
| `components/StakkdPage.tsx` | Main gear catalog view — list, filters, sort, drag-reorder |
| `components/GearCard.tsx` | Individual gear item card with category icon |
| `components/GearDetailModal.tsx` | Full detail/edit modal — specs, notes, manual links, delete |
| `components/AddGearFlow.tsx` | Orchestrates scan → identify → confirm → save |
| `components/GearCaptureGuide.tsx` | Camera capture with visual guide overlay |
| `components/GearUploadGuide.tsx` | File upload with drag-and-drop + crop |
| `components/GearConfirmModal.tsx` | Post-identification confirmation + edit before save |
| `components/AddGearManualModal.tsx` | Manual form entry (no AI scan) |
| `components/SetupGuideModal.tsx` | AI-generated wiring guide display |

---

## Types

Defined in `types.ts`:

```typescript
NewGear       // Pre-save shape — no id, no created_at
Gear          // Post-save — extends NewGear with id + created_at
IdentifiedGear // Gemini API response shape
SetupGuide    // AI setup guide with connections, settings, tips, warnings
ManualSearchResult // Find-manual endpoint response
GearCategory  // Union of 11 category string literals
```

**Key fields on `NewGear`:**
`category`, `brand`, `model`, `year`, `description`, `specs` (Record<string, string | number>), `manual_url`, `manual_pdf_url`, `image_url`, `original_photo_url`, `purchase_price`, `purchase_date`, `notes`, `position`

---

## Service Layer

**`services/gearService.ts`** — Client-side Supabase operations:

| Method | Description |
|--------|-------------|
| `getGear()` | Fetch all gear (ordered by position, then created_at) |
| `saveGear(newGear)` | Insert new gear item |
| `updateGear(id, updates)` | Partial update (field allowlist) |
| `deleteGear(id)` | Delete gear item |
| `reorderGear(ids)` | Persist new signal chain order |
| `uploadGearPhoto(base64)` | Upload photo to `gear-photos` bucket |
| `uploadGearManual(file)` | Upload PDF to `gear-manuals` bucket (25 MB limit) |

---

## API Routes

All routes in `server/routes/`:

| Route | Method | File | Description |
|-------|--------|------|-------------|
| `/api/gear` | GET | `gear.ts` | Fetch all user gear |
| `/api/gear` | POST | `gear.ts` | Save new gear (rate limited 30/min, plan limit check) |
| `/api/gear/:id` | PUT | `gear.ts` | Update gear (field allowlist) |
| `/api/gear/:id` | DELETE | `gear.ts` | Delete gear |
| `/api/gear/:id/reorder` | POST | `gear.ts` | Update signal chain position |
| `/api/gear/check-limit` | POST | `gear.ts` | Check if user hit gear limit |
| `/api/identify-gear` | POST | `identifyGear.ts` | Gemini Vision identification (5/min rate limit) |
| `/api/setup-guide` | POST | `setupGuide.ts` | AI setup guide (Curator+ only, 2–20 items) |

---

## Subscription Tiers

| Feature | Free | Curator | Enthusiast |
|---------|------|---------|------------|
| Gear slots | 5 | More | Unlimited (-1) |
| AI scan | Limited | Yes | Yes |
| Setup guide | No | Yes | Yes |
| Manual finder | No | Yes | Yes |

Subscription checks via `useSubscription()` context:
- `gearLimitReached` — boolean, is the user at their plan's cap
- `gearLimit` — number (-1 = unlimited)
- `canUse('setup_guide')` — feature gate for AI guide generation

---

## Interaction Patterns

### Adding Gear
Three entry points, all gated by `gearLimitReached`:
1. **Scan Gear** → `AddGearFlow` (mode: scan) → camera → Gemini Vision → `GearConfirmModal` → save
2. **Upload Image** → `AddGearFlow` (mode: upload) → file picker → Gemini Vision → `GearConfirmModal` → save
3. **Add Manually** → `AddGearManualModal` → form → save

### Reordering (Signal Chain)
- Only available when sort = "Signal Chain" and no category filter active
- Desktop: drag-and-drop with drop indicator line
- Mobile: up/down arrow buttons on each card
- Optimistic update with rollback on API failure
- Visual feedback: orange ring on just-moved item (1s duration)

### Setup Guide
- Requires 2+ gear items
- Requires Curator+ subscription
- Returns: signal chain order, cable types per connection, recommended settings, tips, warnings

---

## Future Plans

See `docs/stakkd-phase5-addendum.md` for the full roadmap:
- Community gear database (~25K entries) seeded from Gearogs (CC0), Vinyl Engine, HiFi Engine
- HiFi Shark pricing integration
- Admin scrape manager + gear review/curation panel
- Search-as-you-type autocomplete from seed database
- Community contribution pipeline with moderation
