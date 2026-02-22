# REKKRD — Stakkd Gear Database: Phase 5 Addendum

**Discogs Integration Project Plan | February 2026 | rekkrd.com**

---

## Context

This document is a Phase 5 addendum to the Rekkrd Discogs Integration Project Plan. It covers building a self-hosted, community-driven audio gear database to power the Stakkd feature, seeded by scraping publicly available data from archived and active audiophile sites.

Discogs launched Gearogs in 2016 as a sister database for audio equipment. It grew to roughly 21,000 entries before being shut down on August 31, 2020. The data was released under CC0 (public domain) and archived. No replacement has emerged. This gap is Stakkd's opportunity: become the spiritual successor to Gearogs, integrated with a vinyl collection manager.

---

## Data Sources

| Source | Coverage | Access | Status |
|--------|----------|--------|--------|
| Gearogs (Wayback) | ~21K gear entries: turntables, synths, mixers, headphones, tape machines, effects | Wayback CDX API → parse archived HTML | Defunct (CC0 data) |
| Vinyl Engine | 4,476 turntables, 5,023 cartridges, ~1,500 tonearms with full specs | Public listing pages (no login required for tables) | Active |
| HiFi Engine | 37,750 components: amps, receivers, speakers, CD players, cassette decks, tuners | Public listing pages (manuals login-walled) | Active |
| HiFi Shark | 400+ sources of used gear listings worldwide with pricing history | Public search results (no API) | Active |
| Discogs Marketplace | Gear listings mixed with vinyl marketplace | Authenticated API (60 req/min) | Active |

## Target Gear Categories

| Category | Primary Source | Estimated Count |
|----------|---------------|-----------------|
| Turntables | Vinyl Engine, Gearogs | ~5,000 |
| Cartridges | Vinyl Engine | ~5,000 |
| Tonearms | Vinyl Engine | ~1,500 |
| Integrated Amplifiers | HiFi Engine | ~3,000 |
| Receivers | HiFi Engine | ~2,500 |
| Speakers | HiFi Engine | ~4,000 |
| Headphones | Gearogs | ~1,000 |
| Cassette Decks | HiFi Engine | ~2,000 |
| CD Players | HiFi Engine | ~1,500 |
| Effects / Processors | Gearogs | ~500 |
| **Total** | **All sources combined** | **~25,500+** |

---

## Phase 5: Stakkd Gear Database & Admin

**Batches 28–32 • 25 Tasks • Estimated 4–6 weeks**

This phase builds the scraping infrastructure, admin management panel, and AI-powered gear identification to seed and grow Stakkd's gear catalog.

### Batch 28: Scraping Infrastructure & Seed Database

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 28.1 | Create `gear_seed_data` table in Supabase with UNIQUE constraint on (source, source_id) for deduplication | Critical | Medium |
| 28.2 | Build Gearogs Wayback scraper as n8n workflow: CDX API → batch fetch archived HTML → parse gear name, manufacturer, specs, images → upsert with source='gearogs'. 2s rate limit | Critical | Large |
| 28.3 | Build Vinyl Engine scraper as n8n workflow: paginate turntable, cartridge, and tonearm databases → extract specs → upsert with source='vinyl_engine' | High | Large |
| 28.4 | Build HiFi Engine scraper as n8n workflow: paginate amp, receiver, speaker, CD player databases → extract specs → upsert with source='hifi_engine' | High | Large |
| 28.5 | Create Python fallback scripts for each source (Wayback CDX parser, Vinyl Engine paginator, HiFi Engine paginator). Output to CSV for manual review | Medium | Medium |

### Batch 29: HiFi Shark Pricing & Data Enrichment

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 29.1 | Build HiFi Shark scraper: search by manufacturer + model → extract listings (price, condition, seller, URL) → store in `gear_price_data` with TTL cache | High | Large |
| 29.2 | Create `gear_price_data` table with index on gear_seed_id | High | Medium |
| 29.3 | Build AI enrichment pipeline: Gemini fills missing specs from manufacturer documentation. Store with confidence flag | Medium | Large |
| 29.4 | Image processing: download → resize/optimize → Supabase Storage (gear-images bucket). Deduplicate by image hash | Medium | Medium |
| 29.5 | Slack notification workflow: post scrape completion summary with counts by source, new/skipped/errors | Low | Small |

### Batch 30: Admin Scrape Manager

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 30.1 | Create admin API routes: GET/POST `/api/admin/scrape-jobs`, PATCH `/:id` (cancel/pause), GET `/:id/logs` | Critical | Large |
| 30.2 | Create `scrape_jobs` table with status tracking | Critical | Medium |
| 30.3 | Build `ScrapeManager.tsx` admin page: source cards with status/last run/total entries, "Run Now" button, real-time progress, error log panel | High | Large |
| 30.4 | Build `ScrapeSourceConfig.tsx`: per-source settings (base URL, rate limit, batch size, CSS selectors, cron schedule, enabled toggle) | High | Medium |
| 30.5 | Add scheduled scrape triggers via n8n: configurable cron per source. Admin can override from UI | Medium | Medium |

### Batch 31: Gear Review & Curation Admin

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 31.1 | Build `GearReview.tsx`: paginated table with review_status filter, bulk approve/reject with checkboxes | Critical | Large |
| 31.2 | Build `GearDetail.tsx` modal: editable specs, side-by-side duplicate comparison, "Merge" action | High | Large |
| 31.3 | Implement duplicate detection: fuzzy match by manufacturer + model (Levenshtein distance), flag with confidence % | High | Medium |
| 31.4 | Create gear category taxonomy management: admin UI for categories/subcategories with drag-and-drop | Medium | Medium |
| 31.5 | Build data quality dashboard: completeness metrics per source, missing fields table, CSV export | Medium | Medium |

### Batch 32: AI Gear Scanning & Production Migration

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 32.1 | Build AI gear identification: Gemini Vision extracts manufacturer/model/year from photo → fuzzy match against seed data for instant specs | Critical | Large |
| 32.2 | Create gear autocomplete: search-as-you-type against seed data, auto-populate specs on selection | High | Medium |
| 32.3 | Migrate approved entries to production Stakkd gear table with nightly sync of newly approved items | High | Medium |
| 32.4 | Build community contribution flow: user submissions → pending review → admin approval → credit contributors | Medium | Large |
| 32.5 | End-to-end testing: scrape → review → approve → production. Test AI scanning with 40 common gear items | High | Large |

### Phase 5 Deliverables
- ~25,000+ gear entries scraped and stored from 5 sources
- Admin scrape manager with per-source controls, scheduling, and monitoring
- Gear review and curation panel with duplicate detection and merge tooling
- AI gear scanning via Gemini Vision (photo → specs)
- Search-as-you-type autocomplete for manual gear entry
- Community contribution pipeline with moderation
- HiFi Shark pricing data for gear valuations

---

## Database Schema

### gear_seed_data

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| name | TEXT NOT NULL | Display name (e.g., "Technics SL-1200MK2") |
| manufacturer | TEXT | Brand/maker name |
| model | TEXT | Model number/name |
| category | TEXT | Top-level: turntable, amplifier, cartridge, etc. |
| subcategory | TEXT | Sub-type: belt drive, direct drive, moving coil, etc. |
| specs | JSONB | Flexible key/value specs (wow_flutter, weight, power, etc.) |
| image_url | TEXT | URL to image in Supabase Storage |
| source | TEXT NOT NULL | gearogs, vinyl_engine, hifi_engine, community |
| source_url | TEXT | Original page URL for attribution |
| source_id | TEXT | ID from source system for deduplication |
| review_status | TEXT DEFAULT 'pending' | pending / approved / rejected |
| reviewed_by | UUID (FK) | Admin who reviewed |
| reviewed_at | TIMESTAMPTZ | When review occurred |
| ai_confidence | DECIMAL | If specs were AI-enriched, confidence score 0–1 |
| created_at | TIMESTAMPTZ | Auto-generated |

### gear_price_data

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| gear_seed_id | UUID (FK) | References gear_seed_data |
| price | DECIMAL | Listed price |
| currency | TEXT | USD, EUR, GBP, JPY, etc. |
| condition | TEXT | Excellent, Good, Fair, Poor, For Parts |
| seller_location | TEXT | Country/region of seller |
| listing_url | TEXT | Direct link to listing |
| source | TEXT | hifi_shark, discogs, ebay |
| fetched_at | TIMESTAMPTZ | When data was scraped |
| expires_at | TIMESTAMPTZ | Cache expiry (fetched_at + 7 days) |

### scrape_jobs

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| source | TEXT NOT NULL | gearogs, vinyl_engine, hifi_engine, hifi_shark |
| status | TEXT | pending / running / completed / failed / cancelled |
| total_pages | INTEGER | Total pages to process |
| processed_pages | INTEGER | Pages completed so far |
| new_entries | INTEGER | New gear items added |
| updated_entries | INTEGER | Existing items updated |
| skipped_entries | INTEGER | Duplicates skipped |
| errors | INTEGER | Errors encountered |
| error_log | JSONB | Array of error details |
| config | JSONB | Snapshot of scrape config |
| triggered_by | TEXT | admin_manual, scheduled, api |
| started_at | TIMESTAMPTZ | When scrape began |
| completed_at | TIMESTAMPTZ | When scrape finished |

### scrape_source_config

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| source | TEXT UNIQUE NOT NULL | Source identifier |
| display_name | TEXT | Human-readable name for admin UI |
| base_url | TEXT | Starting URL for scrape |
| selectors | JSONB | CSS selectors for parsing |
| rate_limit_ms | INTEGER DEFAULT 2000 | Milliseconds between requests |
| batch_size | INTEGER DEFAULT 10 | Pages per batch |
| cron_schedule | TEXT | n8n cron expression |
| is_enabled | BOOLEAN DEFAULT true | Whether source is active |
| last_run_at | TIMESTAMPTZ | Last successful scrape |
| updated_at | TIMESTAMPTZ | Last config change |

### gear_contributions

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK) | User who submitted |
| gear_seed_id | UUID (FK) | NULL if new entry, set if edit suggestion |
| action | TEXT | new_entry / edit_suggestion |
| data | JSONB | Submitted gear data or proposed changes |
| status | TEXT | pending / approved / rejected |
| admin_notes | TEXT | Feedback from reviewer |
| reviewed_by | UUID (FK) | Admin who reviewed |
| created_at | TIMESTAMPTZ | Submission date |
| reviewed_at | TIMESTAMPTZ | Review date |

---

## Admin Panel Layout

The Stakkd admin section adds three new pages:

### 1. Scrape Manager (/admin/scrape)
- **Source cards:** One per source with status badge, last run, total entries, "Run Now" button
- **Active job panel:** Real-time progress bar, entries added/skipped/errored, "Cancel" button
- **Job history table:** Past runs with expandable error logs
- **Source config:** Editable settings per source (URL, selectors, rate limit, schedule)

### 2. Gear Review (/admin/gear-review)
- **Filter bar:** review_status, source, category, search
- **Entry table:** Paginated with bulk approve/reject checkboxes
- **Detail modal:** Full specs, editable fields, Approve/Reject/Save
- **Duplicate panel:** Side-by-side comparison with Merge button
- **Community submissions tab:** Review user contributions

### 3. Data Quality (/admin/gear-quality)
- **Completeness meters:** Per-source % bars (has image, has specs, has pricing)
- **Missing data table:** Entries missing critical fields with inline edit
- **Category distribution chart:** Donut chart by gear category
- **Export tools:** CSV export for offline review and enrichment

---

## Environment Variables

Additional variables for Phase 5:

| Variable | Description |
|----------|-------------|
| WAYBACK_CDX_BASE_URL | `http://web.archive.org/cdx/search/cdx` |
| SCRAPE_USER_AGENT | `Rekkrd/1.0 +https://rekkrd.com` |
| GEAR_IMAGES_BUCKET | `gear-images` (Supabase Storage bucket) |
| HIFI_SHARK_BASE_URL | `https://www.hifishark.com` |
| SCRAPE_SLACK_WEBHOOK | Slack incoming webhook URL |

---

## Updated Project Timeline

| Phase | Batches | Tasks | Estimate |
|-------|---------|-------|----------|
| Phase 1: Foundation & Search | 15–17 | 15 | 2–3 weeks |
| Phase 2: OAuth & Sync | 18–21 | 20 | 3–4 weeks |
| Phase 3: Marketplace & Value | 22–24 | 15 | 2–3 weeks |
| Phase 4: Polish & Launch | 25–27 | 15 | 2–3 weeks |
| Phase 5: Stakkd Gear Database | 28–32 | 25 | 4–6 weeks |
| **Total** | **15–32** | **90** | **13–19 weeks** |

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wayback snapshots incomplete | Missing Gearogs entries | Use CDX collapse filter for unique pages. Community contributions fill gaps over time |
| CSS selectors break | Scraper returns empty data | Store selectors in scrape_source_config (editable in admin). Slack alert on zero-result scrapes. Python fallback scripts |
| Source sites block scraping | 403/429 responses | Conservative rate limits (2s+). Proper User-Agent. Respect robots.txt. Cache aggressively |
| Low data quality | Junk entries in catalog | Mandatory admin review before live. AI enrichment pass. Community corrections post-launch |
| Image copyright concerns | Legal risk | Only cache CC0 sources (Gearogs). Link to source for Vinyl/HiFi Engine. User-uploaded photos for community entries |
| Storage growth | Supabase costs | Image deduplication by hash. Compress on ingest. Retention policy for expired cache data |
