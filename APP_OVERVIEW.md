# Rekkrd — App Overview

---

## Scan & Identify

- **Camera scan** — Point your phone at a vinyl record cover and snap a photo. AI identifies the artist and album automatically.
- **Photo upload** — Upload a cover image from your device instead of using the camera.
- **Duplicate detection** — If an album is already in your collection, it tells you and opens the existing entry instead.

## Automatic Enrichment

Once an album is identified, the app automatically pulls in:

- Release year and genre
- Full tracklist
- High-quality cover art (from iTunes and MusicBrainz)
- Market pricing (low / median / high from Discogs)
- A poetic AI-written description of the album
- Categorization tags
- Links to Discogs, MusicBrainz, and a listening sample

---

## Browse Your Collection

### Grid View (Browse Crate)

- Visual card layout with cover art, price badge, and favorite indicator
- Hover to preview or delete
- 40 albums per page with pagination

### List View (Collection List)

- Sortable table with columns: title, artist, year, genre, condition, value, plays, favorite
- Click any column header to sort ascending/descending
- Toggle favorites directly from the list

### Search & Filter

- Real-time text search across title, artist, and genre
- Sort by: recently added, year, artist, title, or value
- Filter by year range
- Favorites-only toggle

### Stats Dashboard

- **Crate Count** — total albums
- **Portfolio Value** — sum of all median prices
- **Top Vibe** — most common genre
- **Era Spotlight** — most common decade

---

## Album Detail View

Opening any album shows a full detail modal with:

- **Cover art** — click to search for and swap to a different cover
- **Market valuation** — visual price range bar (low / median / high)
- **Quick actions** — favorite toggle, listen to sample (increments play count)
- **Archive analytics** — total spins and date added
- **Genre density** — what percentage of your collection shares this genre
- **The Narrative** — AI-generated poetic album description
- **Tracklist** — expandable, with per-track lyrics lookup
- **Tags** — view and remove categorization tags
- **Personal notes** — editable text area saved to your collection

---

## Playlist Studio

AI-powered playlist generation from your own collection:

1. **Set a mood** — type a vibe like "Late Night Jazz" or "Sunday Morning Chill"
2. **Choose a focus**:
   - **Albums** — full records front-to-back (up to 8)
   - **Sides** — curate by Side A or Side B (up to 12)
   - **Songs** — individual track picks (up to 15)
3. **Player view** — flip through your playlist with large cover art, prev/next controls, and track counter
4. **Manifest view** — see the full playlist as a scrollable list with cover thumbnails
5. **Print to PDF** — clean, print-optimized layout for a physical playlist card

The AI only picks albums that actually match the mood from your collection — no hallucinated recommendations.

---

## Album Management

- **Favorite/unfavorite** from the grid, list, or detail view
- **Change cover art** — search iTunes and MusicBrainz for alternatives, or the app fetches one automatically
- **Edit personal notes** per album
- **Remove tags**
- **Delete album** — confirmation toast with a 5-second window before it's gone

---

## Landing Page

- Navigation hub with tiles: Browse Crate, Collection List, Spin a Playlist, Scan a Record
- Shows album count and favorites count
- Cinematic animated background using a random cover from your collection
- Empty-state prompt to scan your first record if collection is empty

---

## Notifications

Toast messages for all key actions — success confirmations, errors, warnings, and delete confirmations with action buttons. Auto-dismiss with manual close option.

---

## Mobile & Accessibility

- Fully responsive (2-column grid on mobile, 5 on desktop)
- Touch-optimized controls (44px tap targets)
- Keyboard navigable with focus trapping in modals
- Screen reader support with ARIA labels throughout
- Pinch-to-zoom enabled

---

## CSS & Styling

### Stack

- **Tailwind CSS** — utility-first framework, used for nearly all styling via class names in JSX
- **PostCSS** + **Autoprefixer** — build pipeline for Tailwind processing
- **One custom stylesheet** (`index.css`) for global styles and things Tailwind can't do inline

### Fonts (Google Fonts)

| Font | Weights | Usage |
|------|---------|-------|
| **Space Grotesk** | 300–700 | Body font — all general UI text |
| **Syncopate** | 400, 700 | Display/heading font (`font-syncopate` in Tailwind) — branding and titles |

### Color Palette

Dark-themed with emerald and indigo accents:

| Role | Value | Where |
|------|-------|-------|
| Background | `#050505` (near-black) | Body, scrollbar track |
| Text | `#e5e7eb` (gray-200) | Body default |
| Primary accent | `#10b981` (emerald-500) | Neon glow, scrollbar hover, list row hover, pagination active |
| Secondary accent | `#6366f1` (indigo-500) | Neon glow outer ring |
| Glass surfaces | `rgba(255,255,255,0.03)` | Cards, panels, modals |
| Glass borders | `rgba(255,255,255,0.05)` | Subtle edge on glass elements |

### Custom Utility Classes

#### `.neon-border`

Dual-tone glow — emerald inner + indigo outer:

```css
box-shadow: 0 0 10px rgba(16,185,129,0.4), 0 0 20px rgba(99,102,241,0.2);
```

#### `.glass-morphism`

Frosted glass panel effect:

```css
background: rgba(255,255,255,0.03);
backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.05);
```

#### `.list-row-hover`

Subtle emerald tint on table row hover:

```css
background: rgba(16,185,129,0.06);
```

### Custom Animations

| Class | Duration | Effect |
|-------|----------|--------|
| `.animate-spin-slow` | 3s | Loading spinner rotation |
| `.animate-spin-vinyl` | 30s | Slow vinyl record spin (loading states) |
| `ken-burns` keyframes | ~60s | Cinematic pan/zoom on background cover art |
| `.animate-in` | 0.3s ease-out | Modal/panel entrance (composable with modifiers below) |
| `.fade-in` | — | Opacity entrance modifier |
| `.slide-in-from-top` | — | Slide down 1rem (toast notifications) |
| `.slide-in-from-bottom-4` | — | Slide up 1rem (panels) |
| `.zoom-in-95` | — | Scale from 95% (modal pop-in) |

### Scrollbar

Custom thin scrollbar (WebKit only): 6px wide, dark track (`#050505`), gray thumb (`#333`), emerald on hover.

### Print Styles

For Playlist Studio PDF export: white background, black text, hides all UI chrome, shows only `.print-visible` content.

### Touch Device Handling

Disables hover scale transforms on touch (`pointer: coarse`) to prevent sticky hover states on mobile.

### Tailwind Config

Minimal — only extends the default theme with `font-syncopate`. No custom colors, spacing, or breakpoints (uses Tailwind defaults). No plugins.
