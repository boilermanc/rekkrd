# Audiophile Gear Data Scraping Guide

## Overview

This guide outlines how to build a comprehensive audiophile gear database by scraping public archives and sites like Gearogs (archived), Vinyl Engine, HiFi Engine, and Discogs. Focus is on turntables, tonearms, cartridges, amps—specs, images, pricing history. Perfect for n8n workflows or Python scripts given your dev stack.

**Goal**: ~20k+ gear entries in Supabase/CSV for seeding the Stakkd gear catalog inside Rekkrd.

---

## Data Sources Comparison

| Site | Coverage | Public Access | API | Notes |
|------|----------|---------------|-----|-------|
| **Discogs** | Gear + vinyl (marketplace) | Full public | Free API (60/min) | Active, best for pricing |
| **Gearogs** | 21k gear entries (2017-20) | Wayback archives | None (dump on archive.org) | Defunct, richest vintage specs |
| **Vinyl Engine** | 4k+ turntables, 1.5k tonearms | Partial (no login) | None | Forums/manuals login-walled |
| **HiFi Engine** | Amps, speakers, turntables | Partial (no login) | None | Sister to Vinyl Engine |

---

## n8n Workflow Template

### Gearogs via Wayback Machine

```
Manual Trigger
↓
HTTP Request: CDX API (Wayback snapshots)
  URL: http://web.archive.org/cdx/search/cdx?url=gearogs.com/gear&output=json&from=20170401&to=20200831
↓
Split In Batches (batch: 10)
↓
Function: Build URL → http://web.archive.org/web/{{$json[0]}}/id_/{{$json[1]}}
↓
Wait: 2s (rate limit)
↓
HTTP Request: Fetch HTML
↓
HTML Extract:
  - Name: h1.gear-title
  - Specs: table.specs tr td (key/value pairs)
  - Image: img[src*=gearogs]
↓
Merge → Supabase Insert (dedupe by model slug)
```

### Adapt for Vinyl Engine

```
HTTP: https://vinylengine.com/turntable_database.php?make=Technics&page={{$runIndex+1}}
HTML: table tr td.model, td.specs
```

---

## Python Fallback (VS Code)

```python
import requests
from bs4 import BeautifulSoup
import pandas as pd
import time

def get_gearogs_snapshots():
    """Fetch archived Gearogs page snapshots from Wayback CDX API."""
    base = "http://web.archive.org/cdx/search/cdx"
    params = {
        'url': 'gearogs.com/gear/*',
        'output': 'json',
        'limit': 500,
        'filter': 'statuscode:200',
        'collapse': 'urlkey'
    }
    resp = requests.get(base, params=params).json()
    headers = resp[0]
    rows = resp[1:]
    ts_idx = headers.index('timestamp')
    url_idx = headers.index('original')
    return [(r[ts_idx], f"http://web.archive.org/web/{r[ts_idx]}id_/{r[url_idx]}") for r in rows]


def scrape_gearogs_page(url):
    """Scrape a single Gearogs gear page from the Wayback Machine."""
    try:
        resp = requests.get(url, timeout=15)
        soup = BeautifulSoup(resp.text, 'lxml')

        name_el = soup.select_one('h1')
        name = name_el.text.strip() if name_el else None

        specs = {}
        for row in soup.select('table tr'):
            cells = row.select('td')
            if len(cells) >= 2:
                key = cells[0].text.strip()
                val = cells[1].text.strip()
                if key:
                    specs[key] = val

        img_el = soup.select_one('img[src*="gearogs"], img[src*="discogs"]')
        image_url = img_el['src'] if img_el else None

        return {
            'name': name,
            'specs': specs,
            'image_url': image_url,
            'source_url': url,
            'source': 'gearogs'
        }
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return None


def scrape_vinyl_engine_turntables():
    """Scrape turntable listings from Vinyl Engine public database."""
    turntables = []
    for page in range(1, 50):  # ~20 per page, ~4476 total
        url = f"https://www.vinylengine.com/turntable_database.php?page={page}"
        try:
            resp = requests.get(url, timeout=15)
            soup = BeautifulSoup(resp.text, 'lxml')

            rows = soup.select('table tr')[1:]  # skip header
            for row in rows:
                cells = row.select('td')
                if len(cells) >= 4:
                    turntables.append({
                        'manufacturer': cells[0].text.strip(),
                        'model': cells[1].text.strip(),
                        'type': cells[2].text.strip() if len(cells) > 2 else '',
                        'source': 'vinyl_engine',
                        'source_url': url
                    })

            time.sleep(1.5)  # be respectful
        except Exception as e:
            print(f"Error on page {page}: {e}")
            break

    return turntables


if __name__ == '__main__':
    # --- Gearogs (Wayback) ---
    print("Fetching Gearogs snapshots...")
    snapshots = get_gearogs_snapshots()
    print(f"Found {len(snapshots)} snapshots")

    gearogs_data = []
    for i, (ts, url) in enumerate(snapshots[:100]):  # start with first 100
        print(f"  Scraping {i+1}/{min(len(snapshots), 100)}: {url[:80]}...")
        result = scrape_gearogs_page(url)
        if result and result['name']:
            gearogs_data.append(result)
        time.sleep(1)

    if gearogs_data:
        df = pd.DataFrame(gearogs_data)
        df.to_csv('gearogs_gear.csv', index=False)
        print(f"Saved {len(df)} Gearogs entries")

    # --- Vinyl Engine ---
    print("\nScraping Vinyl Engine turntables...")
    ve_data = scrape_vinyl_engine_turntables()
    if ve_data:
        df = pd.DataFrame(ve_data)
        df.to_csv('vinyl_engine_turntables.csv', index=False)
        print(f"Saved {len(df)} Vinyl Engine entries")
```

---

## Supabase Schema for Scraped Gear

```sql
-- Gear items table (mirrors Stakkd structure)
CREATE TABLE gear_seed_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    manufacturer TEXT,
    model TEXT,
    category TEXT,               -- turntable, amplifier, cartridge, tonearm, speaker, etc.
    specs JSONB DEFAULT '{}',    -- flexible key/value specs
    image_url TEXT,
    source TEXT,                 -- gearogs, vinyl_engine, hifi_engine
    source_url TEXT,
    source_id TEXT,              -- original ID from source
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(source, source_id)
);

-- Index for fast lookups
CREATE INDEX idx_gear_seed_category ON gear_seed_data(category);
CREATE INDEX idx_gear_seed_manufacturer ON gear_seed_data(manufacturer);
CREATE INDEX idx_gear_seed_source ON gear_seed_data(source);
```

---

## Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| **Login walls** | Skip—public tables have ~80% of the data (model, wow/flutter, weight, dimensions) |
| **Rate limits** | n8n Wait node (2s between requests); Python `time.sleep(1)` |
| **CSS selectors** | Test live first: `web.archive.org/web/202007*/gearogs.com/gear/1` |
| **Deduplication** | Hash `manufacturer-model` slug before insert; UNIQUE constraint in Supabase |
| **Wayback inconsistency** | Some pages may be missing or partially cached; filter for `statuscode:200` |
| **Scale** | ~500 entries/hour safely; run overnight for full dataset |
| **Legal** | Gearogs data was CC0 (public domain); Vinyl/HiFi Engine are publicly accessible pages |

---

## Gear Categories to Target

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

**Total estimated**: ~25,000+ entries across all sources

---

## Next Steps

1. **Prototype Gearogs n8n flow** — 15 mins from template above, validate selectors against Wayback
2. **Add Vinyl Engine / HiFi Engine** public pages as secondary sources
3. **Merge with Discogs API** for marketplace pricing on gear that overlaps
4. **Slack webhook** — `"Scraped {{count}} new gear entries"` notification on completion
5. **Seed Stakkd** — Import CSV into `gear_seed_data` table, then migrate to production gear catalog
6. **AI enrichment** — Run Gemini over sparse entries to fill in missing specs from manufacturer documentation

---

## Integration with Rekkrd/Stakkd

Once the seed data is in Supabase, it serves as the backbone for Stakkd's gear catalog:

- **Autocomplete**: When users add gear, fuzzy-match against seed data for instant metadata population
- **AI Gear Scanning**: Gemini identifies gear from photos → cross-reference against seed data for specs
- **Community Contributions**: Users can edit/add specs not in the seed data, building on top of the foundation
- **Gear Valuation**: Cross-reference with HiFi Shark listings for estimated market values

This positions Stakkd as the spiritual successor to Gearogs — a community-driven audio gear database integrated with a vinyl collection manager.
