# REKKRD — Discogs Integration Project Plan

**Prepared for Clint Crowe | February 2026 | rekkrd.com**

---

## Executive Summary

This document outlines the complete integration of the Discogs API into Rekkrd, transforming it from a standalone collection manager into a platform that connects directly to the world's largest vinyl database. The integration is structured in four phases across approximately 13 batches (65 tasks), following Rekkrd's established batch-of-5 development workflow.

The integration delivers three major capabilities:

- **Database Search & Metadata Enrichment** — Search Discogs' 40M+ releases directly from Rekkrd. Cross-reference AI scan results with pressing-level accuracy. Pull vinyl-specific data (matrix numbers, pressing variants, label info) that iTunes and MusicBrainz don't provide.
- **User Account Sync** — One-click import of existing Discogs collections and wantlists via OAuth 1.0a. Two-way sync so changes in Rekkrd reflect in Discogs. This is the single biggest onboarding accelerator — collectors with 500+ records cataloged in Discogs won't re-enter them manually.
- **Marketplace & Collection Value** — Real-time pricing data from the Discogs marketplace. Per-record and total collection valuation by condition grade. Price trend tracking over time.

## Why Discogs?

Discogs is the de facto standard for vinyl collectors. It has over 16 million registered users and a database of 40+ million releases contributed by the community. Most serious collectors already have their collections cataloged there. By integrating with Discogs, Rekkrd gains instant credibility with the vinyl community and removes the single biggest barrier to adoption: manual data entry.

## Technical Overview

The Discogs API (v2) is a RESTful JSON API with two access tiers:

- **Unauthenticated:** 25 requests/minute. Requires a User-Agent header. Suitable for database search and public release data.
- **Authenticated (OAuth 1.0a):** 60 requests/minute. Required for user collection access, wantlist management, and marketplace data. Uses a 3-legged OAuth flow (not OAuth 2.0).

Key API base URL: `https://api.discogs.com`

## Discogs API Rate Limits & Compliance

- **Rate Limiting:** All requests count against per-IP (unauthenticated) or per-token (authenticated) buckets. Responses include `X-Discogs-Ratelimit-Remaining` headers.
- **User-Agent Requirement:** Every request must include a User-Agent header: `Rekkrd/1.0 +https://rekkrd.com`
- **Image Hotlinking Prohibited:** Discogs images must be cached/proxied, not hotlinked. We store them in Supabase Storage.
- **Attribution Required:** Any page displaying Discogs data must include a "Powered by Discogs" attribution with a link back to the release page.
- **No Bulk Scraping:** The monthly data dump is available for offline use; the API is for real-time queries only.

---

## Phase 1: Foundation & Database Search

**Batches 15–17 • 15 Tasks • Estimated 2–3 weeks**

This phase establishes the Discogs API client infrastructure and adds database search as a first-class metadata source alongside iTunes and MusicBrainz. No user authentication required.

### Batch 15: Discogs API Client & Core Infrastructure ✅

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 15.1 | Create Discogs API service module (`server/services/discogsService.ts`) with base HTTP client, User-Agent header, rate limit tracking via response headers, exponential backoff retry logic, and error handling | Critical | Medium |
| 15.2 | Add Discogs environment variables and centralized config module (`server/lib/discogs.ts`). Register app at discogs.com/settings/developers | Critical | Small |
| 15.3 | Create Discogs types (`types/discogs.ts`): DiscogsSearchResult, DiscogsRelease, DiscogsArtist, DiscogsMaster, DiscogsImage, DiscogsPagination, DiscogsRateLimit — 13 interfaces total | High | Medium |
| 15.4 | Build rate limiter middleware for Discogs routes — global counter (shared API token), rolling 60s window, 55 req/min threshold (5-request buffer) | High | Medium |
| 15.5 | Create API route: GET `/api/discogs/search` with query params (q, type, artist, title, barcode, year, format, country, per_page, page) | High | Medium |

### Batch 16: Search Integration & Release Detail ✅

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 16.1 | Create API route: GET `/api/discogs/releases/:id` — full release data including tracklist, credits, labels, formats, images, and community ratings | High | Medium |
| 16.2 | Create API route: GET `/api/discogs/masters/:id` — master release data (groups all pressings) | Medium | Small |
| 16.3 | Build `DiscogsSearch.tsx` UI component — search input, format/year/country filters, paginated results grid with cover art, format badges, community have/want counts | High | Large |
| 16.4 | Build `DiscogsReleaseDetail.tsx` modal — full release metadata, tracklist, community rating, "Add to Collection" button, focus trapping, Discogs attribution | High | Large |
| 16.5 | Create `utils/discogsMapper.ts` — converts DiscogsRelease into NewAlbum format via `DiscogsNewAlbum` extended type | High | Medium |

### Batch 17: AI Scan Enhancement & Image Caching (In Progress)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 17.1 | Enhance AI scan pipeline: after Gemini identifies album, cross-reference against Discogs search. Present top 3 matches as `discogsMatches` array with `?skipDiscogs=true` bypass | High | Large |
| 17.2 | Build barcode scanning flow: Gemini detects barcode → auto-search Discogs by barcode for instant match. Barcode matches flagged as `matchType: 'barcode'` (higher confidence) | Medium | Medium |
| 17.3 | Implement Discogs image proxy/cache: download cover images to Supabase Storage (`discogs-images` bucket) to comply with hotlinking prohibition. Serve via signed URLs | High | Medium |
| 17.4 | Add "Powered by Discogs" attribution component — required on any view displaying Discogs-sourced data. Two variants: compact (cards) and full (modals) | Critical | Small |
| 17.5 | Write integration tests for Discogs search, release detail, data mapper, and rate limiter. Mock API responses | Medium | Medium |

### Phase 1 Deliverables
- Discogs database search accessible from Rekkrd UI
- Detailed release views with vinyl-specific metadata
- AI scan results enriched with Discogs pressing data
- Barcode-to-release identification
- Compliant image caching and attribution

---

## Phase 2: OAuth & Collection Sync

**Batches 18–21 • 20 Tasks • Estimated 3–4 weeks**

This phase implements OAuth 1.0a authentication with Discogs and enables two-way collection synchronization. This is the highest-impact feature for user acquisition.

### OAuth 1.0a Flow

Discogs uses OAuth 1.0a (not OAuth 2.0). Three steps:

1. **Request Token:** Rekkrd's server requests a temporary token from Discogs (POST `/oauth/request_token`)
2. **User Authorization:** User is redirected to `discogs.com/oauth/authorize` to grant access. After approval, Discogs redirects back with a verifier code
3. **Access Token:** Rekkrd exchanges the request token + verifier for a permanent access token (POST `/oauth/access_token`)

All requests must include a signed Authorization header using HMAC-SHA1 (via `oauth-1.0a` npm package).

### Batch 18: OAuth 1.0a Implementation

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 18.1 | Install oauth-1.0a and crypto packages. Create `server/services/discogsOAuth.ts` with OAuth 1.0a signature generation, request token flow, and access token exchange | Critical | Large |
| 18.2 | Create API routes: POST `/api/discogs/auth/request-token`, GET `/api/discogs/auth/callback`, POST `/api/discogs/auth/disconnect` | Critical | Large |
| 18.3 | Add `discogs_oauth_token` and `discogs_oauth_secret` columns to profiles table (encrypted at rest). Create migration and update profileService | Critical | Medium |
| 18.4 | Build `DiscogsConnect.tsx` UI component: "Connect Discogs Account" button, connected state showing username with disconnect option | High | Medium |
| 18.5 | Add OAuth token refresh/validation: verify token on each authenticated request. Handle 401 by prompting reconnect | High | Medium |

### Batch 19: Collection Import

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 19.1 | Create `server/services/discogsSync.ts`: fetch user's full collection via paginated GET `/users/{username}/collection/folders/0/releases` (handles 100+ pages) | Critical | Large |
| 19.2 | Build import queue system: large collections (1000+) need background processing via `discogs_import_jobs` table with status tracking | High | Large |
| 19.3 | Create import progress UI: real-time progress bar with cancel ability. Use polling or Supabase realtime | High | Medium |
| 19.4 | Handle duplicate detection: match by Discogs release ID, then by artist+title+year. Show conflict resolution screen | High | Large |
| 19.5 | Import Discogs custom fields: media condition (M/NM/VG+/VG/G+/G/F/P), sleeve condition, notes, folder assignments | Medium | Medium |

### Batch 20: Wantlist & Two-Way Sync

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 20.1 | Create wantlist import: GET `/users/{username}/wants` with same pagination/mapping as collection | High | Medium |
| 20.2 | Build wantlist UI: wanted records with pricing hints, "Remove from Wantlist" / "Move to Collection" actions | High | Medium |
| 20.3 | Implement Rekkrd → Discogs push sync: mirror add/remove actions via POST/DELETE collection endpoints | High | Large |
| 20.4 | Build sync settings page: toggle auto-sync, choose direction, set frequency | Medium | Medium |
| 20.5 | Create sync conflict resolution: show diff when both sides modified, let user choose | Medium | Large |

### Batch 21: Sync Robustness & Edge Cases

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 21.1 | Implement sync audit log in `discogs_sync_log` table | Medium | Medium |
| 21.2 | Handle pagination edge cases: rate limit backoff, resume interrupted imports, graceful downtime handling | High | Medium |
| 21.3 | Build "Sync History" UI with manual re-sync trigger | Medium | Medium |
| 21.4 | Add n8n nightly sync workflow: incremental sync for all connected users via `date_added` parameter | Medium | Large |
| 21.5 | Comprehensive tests for OAuth, import, sync, and conflict resolution | Medium | Large |

### Phase 2 Deliverables
- Full OAuth 1.0a authentication with Discogs
- One-click collection import (handles 10,000+ record libraries)
- Wantlist import and management
- Bidirectional sync with conflict resolution
- Automated nightly incremental sync via n8n

---

## Phase 3: Marketplace & Collection Value

**Batches 22–24 • 15 Tasks • Estimated 2–3 weeks**

### Batch 22: Price Data & Per-Record Valuation

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 22.1 | Create API route: GET `/api/discogs/marketplace/price/:releaseId` — price suggestions by condition grade (M through P) | High | Medium |
| 22.2 | Create API route: GET `/api/discogs/marketplace/stats/:releaseId` — lowest listing, copies for sale, last sold price | High | Medium |
| 22.3 | Build `RecordValue.tsx` — estimated value by condition grade, low/median/high range, condition grade selector | High | Medium |
| 22.4 | Integrate RecordValue into album detail view with "View on Marketplace" link | Medium | Small |
| 22.5 | Implement price caching in Supabase with 24-hour TTL (`discogs_price_cache` table) | High | Medium |

### Batch 23: Collection Valuation Dashboard

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 23.1 | Create GET `/api/collection/value` — total value, breakdown by condition, top 10 most valuable | High | Large |
| 23.2 | Build `CollectionValue.tsx` dashboard — total value, range, distribution chart, most valuable records | High | Large |
| 23.3 | Add value tracking over time in `discogs_value_history` table with line chart (30d/90d/1yr) | Medium | Medium |
| 23.4 | Build value breakdown views: by genre, decade, condition, label using Recharts | Medium | Large |
| 23.5 | Create "Collection Insights" summary card for main dashboard | Medium | Medium |

### Batch 24: Marketplace Listings & Alerts

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 24.1 | Create GET `/api/discogs/marketplace/listings/:releaseId` — current listings with price, condition, seller info | Medium | Medium |
| 24.2 | Build `MarketplaceListings.tsx` — sortable listings for wantlist/collection items | Medium | Medium |
| 24.3 | Implement price alerts via `discogs_price_alerts` table with email notifications via Resend | Medium | Large |
| 24.4 | Build n8n workflow for periodic price alert checking with staggered execution | Medium | Large |
| 24.5 | Add "Find Cheaper Copies" feature for condition upgrading | Low | Medium |

### Phase 3 Deliverables
- Per-record valuation based on condition grade
- Total collection value dashboard with trend tracking
- Value breakdown by genre, decade, condition, and label
- Live marketplace listings integration
- Price alert system for wantlist items

---

## Phase 4: Polish, Performance & Subscription Gating

**Batches 25–27 • 15 Tasks • Estimated 2–3 weeks**

### Batch 25: Subscription Tier Gating

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 25.1 | Define Discogs feature access: Collector (free) = search + 50 import + view pricing; Curator ($4.99) = full import + sync + pricing; Archivist ($9.99) = all + alerts + nightly sync + insights | Critical | Medium |
| 25.2 | Implement server-side tier checking middleware — 403 with upgrade prompt for gated features | Critical | Medium |
| 25.3 | Build contextual upgrade modals when free users hit tier limits | High | Medium |
| 25.4 | Add usage tracking in `discogs_usage` table — API calls, imports, syncs per month | Medium | Medium |
| 25.5 | Create tier comparison component for subscription page | Medium | Small |

### Batch 26: Performance & Caching

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 26.1 | Implement caching layer for API responses: search (1hr TTL), releases (24hr), prices (24hr) | High | Large |
| 26.2 | Optimize large imports: batch upserts (50/txn), streaming progress, memory-efficient pagination | High | Medium |
| 26.3 | Add image lazy loading, progressive rendering, virtual scrolling for 1000+ collections | Medium | Medium |
| 26.4 | Create API health monitoring with Slack alerts on error threshold | Medium | Medium |
| 26.5 | Implement request deduplication — serve from cache for duplicate queries within window | Medium | Medium |

### Batch 27: UX Polish & Launch Prep

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 27.1 | Build Discogs onboarding flow after OAuth connect — import options, sync settings, large import expectations | High | Large |
| 27.2 | Add Discogs data to existing views — release link, pressing variant, community rating, "View on Discogs" | Medium | Medium |
| 27.3 | Build disconnect and data cleanup flow — keep or remove imported data, clear tokens | Medium | Medium |
| 27.4 | Create blog content via AI pipeline: tutorial, feature announcement, SEO landing page | Medium | Large |
| 27.5 | Final integration testing: end-to-end with mock collections of 10, 100, 1000, 5000+ records | High | Large |

### Phase 4 Deliverables
- Feature gating aligned to subscription tiers
- Production-grade caching and performance optimization
- Polished onboarding and disconnect flows
- Blog and SEO content for launch
- Full end-to-end test coverage

---

## Database Schema Changes

### Modified Tables

#### profiles (existing)

| Column | Type | Notes |
|--------|------|-------|
| discogs_oauth_token | TEXT (encrypted) | OAuth 1.0a access token |
| discogs_oauth_secret | TEXT (encrypted) | OAuth 1.0a token secret |
| discogs_username | TEXT | Discogs username from /oauth/identity |
| discogs_user_id | INTEGER | Discogs numeric user ID |
| discogs_connected_at | TIMESTAMPTZ | When OAuth was established |

#### albums (existing)

| Column | Type | Notes |
|--------|------|-------|
| discogs_release_id | INTEGER | Discogs release ID for syncing |
| discogs_master_id | INTEGER | Master release ID (groups pressings) |
| media_condition | TEXT | M/NM/VG+/VG/G+/G/F/P grading |
| sleeve_condition | TEXT | Same grading scale for sleeve |
| discogs_folder_id | INTEGER | User's Discogs folder assignment |
| discogs_instance_id | INTEGER | Unique instance in user's collection |
| discogs_notes | TEXT | User's notes from Discogs |
| discogs_date_added | TIMESTAMPTZ | When added to Discogs collection |
| catalog_number | TEXT | Label catalog number |
| matrix_number | TEXT | Matrix/runout groove inscription |
| pressing_country | TEXT | Country of pressing |

### New Tables

#### discogs_sync_log

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK) | References profiles |
| action | TEXT | import/export/update/delete/conflict |
| discogs_release_id | INTEGER | The release involved |
| album_id | UUID (FK) | References albums (nullable) |
| status | TEXT | success/failed/skipped/conflict |
| details | JSONB | Error messages, conflict data |
| created_at | TIMESTAMPTZ | When the action occurred |

#### discogs_import_jobs

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK) | References profiles |
| status | TEXT | pending/running/completed/failed/cancelled |
| total_records | INTEGER | Total records to import |
| processed_records | INTEGER | Records processed so far |
| skipped_records | INTEGER | Duplicates/errors skipped |
| current_page | INTEGER | Last successfully processed page |
| error | TEXT | Error message if failed |
| started_at | TIMESTAMPTZ | When import began |
| completed_at | TIMESTAMPTZ | When import finished |

#### discogs_price_cache

| Column | Type | Notes |
|--------|------|-------|
| discogs_release_id | INTEGER (PK) | Discogs release ID |
| price_data | JSONB | Full price suggestions by condition |
| marketplace_stats | JSONB | Listing count, last sold, etc. |
| fetched_at | TIMESTAMPTZ | When data was retrieved |
| expires_at | TIMESTAMPTZ | Cache expiry (fetched_at + 24hr) |

#### discogs_value_history

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK) | References profiles |
| total_value_low | DECIMAL | Sum of low estimates |
| total_value_median | DECIMAL | Sum of median estimates |
| total_value_high | DECIMAL | Sum of high estimates |
| record_count | INTEGER | Number of valued records |
| snapshot_date | DATE | Date of snapshot |

#### discogs_price_alerts

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK) | References profiles |
| discogs_release_id | INTEGER | Release to monitor |
| target_price | DECIMAL | Alert when price at or below |
| condition_minimum | TEXT | Minimum acceptable condition |
| is_active | BOOLEAN | Whether alert is enabled |
| last_checked_at | TIMESTAMPTZ | Last price check time |
| triggered_at | TIMESTAMPTZ | When alert was triggered |

---

## Environment Variables

All variables must be set in both `.env` (local) and production config on the VPS:

| Variable | Description | Phase |
|----------|-------------|-------|
| DISCOGS_CONSUMER_KEY | App consumer key from discogs.com/settings/developers | Phase 1 |
| DISCOGS_CONSUMER_SECRET | App consumer secret | Phase 1 |
| DISCOGS_PERSONAL_TOKEN | Personal access token for authenticated requests | Phase 1 |
| DISCOGS_USER_AGENT | Rekkrd/1.0 +https://rekkrd.com | Phase 1 |
| DISCOGS_CALLBACK_URL | https://rekkrd.com/api/discogs/auth/callback | Phase 2 |
| DISCOGS_OAUTH_ENCRYPTION_KEY | AES-256 key for encrypting stored tokens | Phase 2 |

---

## Project Timeline Summary

| Phase | Batches | Tasks | Estimate |
|-------|---------|-------|----------|
| Phase 1: Foundation & Search | 15–17 | 15 | 2–3 weeks |
| Phase 2: OAuth & Sync | 18–21 | 20 | 3–4 weeks |
| Phase 3: Marketplace & Value | 22–24 | 15 | 2–3 weeks |
| Phase 4: Polish & Launch | 25–27 | 15 | 2–3 weeks |
| **Total** | **15–27** | **65** | **9–13 weeks** |

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Discogs API downtime | Sync failures, stale data | Graceful degradation: show cached data with "last updated" timestamp. Queue failed syncs for retry. |
| OAuth 1.0a complexity | Auth failures, token issues | Use battle-tested oauth-1.0a npm package. Comprehensive error handling and token refresh logic. |
| Large collection imports (10K+) | Timeouts, memory issues | Background job queue with pagination. Resume from last page on failure. Batch DB writes. |
| Rate limit exhaustion | Blocked API access | Per-user rate tracking. Queue and throttle requests. Cache aggressively. Use Discogs data dumps for bulk operations. |
| Discogs ToS changes | Feature restrictions | Monitor Discogs developer announcements. Build abstraction layer to swap data sources if needed. |
| Image storage costs | Supabase Storage growth | Implement image deduplication (same release ID = same images). Set retention policy for unused cached images. |
