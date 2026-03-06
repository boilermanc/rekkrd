import express, { Request, Response } from 'express';
import { XMLParser } from 'fast-xml-parser';

const router = express.Router();

// In-memory cache for Discogs pricing and eBay results
interface CacheEntry {
  data: any;
  expires: number;
}
const cache = new Map<string, CacheEntry>();

// Rate limiting state
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request, res: Response, limit: number): boolean {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const key = `${ip}-${req.path}`;

  const current = rateLimits.get(key);
  if (!current || now > current.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (current.count >= limit) {
    res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
    return false;
  }

  current.count++;
  return true;
}

// GET /search?q={query}
router.get('/search', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 30)) return;

  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter required' });
  }

  const DISCOGS_KEY = process.env.DISCOGS_KEY;
  const DISCOGS_SECRET = process.env.DISCOGS_SECRET;

  if (!DISCOGS_KEY || !DISCOGS_SECRET) {
    return res.status(500).json({ error: 'Discogs credentials not configured' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const url = `https://api.discogs.com/database/search?q=${encodeURIComponent(q)}&type=release&format=vinyl`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Discogs key=${DISCOGS_KEY}, secret=${DISCOGS_SECRET}`,
        'User-Agent': 'Rekkrd/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Discogs API returned ${response.status}`);
    }

    const data = await response.json();

    // Map results to simplified format, limit to 6
    const results = (data.results || []).slice(0, 6).map((item: any) => {
      // Parse artist from title (format: "Artist - Title")
      const titleParts = (item.title || '').split(' - ');
      const artist = titleParts[0] || '';
      const title = titleParts.slice(1).join(' - ') || item.title || '';

      return {
        id: item.id,
        title,
        artist,
        year: item.year || '',
        label: (item.label || [])[0] || '',
        country: item.country || '',
        format: (item.format || []).join(', '),
        thumb: item.thumb || item.cover_image || ''
      };
    });

    res.json(results);

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return res.status(502).json({
        error: "We're having trouble reaching the database. Try again in a moment."
      });
    }

    console.error('Discogs search error:', error);
    res.status(502).json({
      error: "We're having trouble reaching the database. Try again in a moment."
    });
  }
});

// GET /label-validate?release_id={id}&catalog={val}&country={val}
router.get('/label-validate', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 60)) return;

  const { release_id, catalog, country } = req.query;
  if (!release_id) {
    return res.status(400).json({ error: 'release_id required' });
  }

  const DISCOGS_KEY = process.env.DISCOGS_KEY;
  const DISCOGS_SECRET = process.env.DISCOGS_SECRET;

  if (!DISCOGS_KEY || !DISCOGS_SECRET) {
    return res.status(500).json({ error: 'Discogs credentials not configured' });
  }

  try {
    const url = `https://api.discogs.com/releases/${release_id}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Discogs key=${DISCOGS_KEY}, secret=${DISCOGS_SECRET}`,
        'User-Agent': 'Rekkrd/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Discogs API returned ${response.status}`);
    }

    const data = await response.json();

    // Normalize function: uppercase, strip spaces and punctuation
    const normalize = (str: string) =>
      str.toUpperCase().replace(/[\s\-_\.]/g, '');

    const notes: string[] = [];
    let confirmed = false;

    // Check catalog number
    if (catalog && typeof catalog === 'string') {
      const normalizedInput = normalize(catalog);
      const labelCatno = data.labels?.[0]?.catno || '';
      const normalizedCatno = normalize(labelCatno);

      // Check against label catno
      if (normalizedInput === normalizedCatno) {
        confirmed = true;
        notes.push('Catalog number confirmed');
      }

      // Also check identifiers
      if (!confirmed && data.identifiers) {
        for (const identifier of data.identifiers) {
          if (normalize(identifier.value) === normalizedInput) {
            confirmed = true;
            notes.push('Catalog number found in identifiers');
            break;
          }
        }
      }
    }

    res.json({ confirmed, notes });

  } catch (error) {
    console.error('Label validation error:', error);
    res.json({ confirmed: false, notes: ['Unable to validate'] });
  }
});

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// GET /matrix?release_id={id}&matrix_a={val}&matrix_b={val}
router.get('/matrix', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 60)) return;

  const { release_id, matrix_a, matrix_b } = req.query;
  if (!release_id) {
    return res.status(400).json({ error: 'release_id required' });
  }

  const DISCOGS_KEY = process.env.DISCOGS_KEY;
  const DISCOGS_SECRET = process.env.DISCOGS_SECRET;

  if (!DISCOGS_KEY || !DISCOGS_SECRET) {
    return res.status(500).json({ error: 'Discogs credentials not configured' });
  }

  try {
    const url = `https://api.discogs.com/releases/${release_id}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Discogs key=${DISCOGS_KEY}, secret=${DISCOGS_SECRET}`,
        'User-Agent': 'Rekkrd/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Discogs API returned ${response.status}`);
    }

    const data = await response.json();

    // Extract matrix identifiers
    const matrixIdentifiers = (data.identifiers || [])
      .filter((id: any) => id.type === 'Matrix / Runout')
      .map((id: any) => id.value);

    const all_known_matrices = matrixIdentifiers;
    const no_matrix_data = matrixIdentifiers.length === 0;

    // Check if double album
    const formatDescriptions = data.formats?.[0]?.descriptions || [];
    const is_double_album = formatDescriptions.some((d: string) =>
      d.includes('2xLP') || d.includes('2×LP')
    );

    // Normalize function
    const normalize = (str: string) =>
      str.toUpperCase().replace(/[\s\-_]/g, '');

    // Try to match matrices
    let matched = false;
    let partial_match = false;
    let pressing_label: string | null = null;

    if (matrix_a && typeof matrix_a === 'string' && matrixIdentifiers.length > 0) {
      const normalizedA = normalize(matrix_a);
      const normalizedB = matrix_b && typeof matrix_b === 'string' ? normalize(matrix_b) : '';

      for (const knownMatrix of matrixIdentifiers) {
        const normalizedKnown = normalize(knownMatrix);

        // Exact match
        if (normalizedKnown === normalizedA || (normalizedB && normalizedKnown === normalizedB)) {
          matched = true;
          pressing_label = knownMatrix;
          break;
        }

        // Contains match
        if (normalizedKnown.includes(normalizedA) || normalizedA.includes(normalizedKnown)) {
          matched = true;
          pressing_label = knownMatrix;
          break;
        }

        // Levenshtein for short strings
        if (normalizedA.length < 12) {
          if (levenshtein(normalizedKnown, normalizedA) <= 2) {
            matched = true;
            pressing_label = knownMatrix;
            break;
          }
        }
      }

      // Check for partial match (only one side matches)
      if (!matched && normalizedB) {
        for (const knownMatrix of matrixIdentifiers) {
          const normalizedKnown = normalize(knownMatrix);
          if (normalizedKnown === normalizedA || normalizedKnown === normalizedB) {
            partial_match = true;
            pressing_label = knownMatrix;
            break;
          }
        }
      }
    }

    // Engineer mark detection
    const engineer_notes: Array<{ mark: string; description: string }> = [];
    const inputMatrices = [matrix_a, matrix_b].filter(Boolean).map(String);

    for (const input of inputMatrices) {
      const upper = input.toUpperCase();

      if (upper.includes('PORKY') || upper.includes('PORKY PRIME CUT')) {
        engineer_notes.push({
          mark: 'PORKY',
          description: 'Mastered by George Peckham at Metropolis Studios. Highly regarded — audiophiles actively seek these out.'
        });
      }

      if (upper.includes('STERLING')) {
        engineer_notes.push({
          mark: 'STERLING',
          description: 'Cut at Sterling Sound, New York — a respected mastering house.'
        });
      }

      // RL standalone (not part of longer string)
      if (/\bRL\b/.test(upper)) {
        engineer_notes.push({
          mark: 'RL',
          description: 'Cut by Robert Ludwig — very sought after, often commands a significant price premium.'
        });
      }

      if (upper.includes('HAECO')) {
        engineer_notes.push({
          mark: 'HAECO',
          description: 'High Frequency Absence Effect — a US process considered inferior by many collectors.'
        });
      }

      if (/\bDR\b/.test(upper)) {
        engineer_notes.push({
          mark: 'DR',
          description: 'Cut by Dennis Ruzicka at Capitol Studios.'
        });
      }
    }

    res.json({
      matched,
      partial_match,
      pressing_label,
      engineer_notes,
      is_double_album,
      all_known_matrices,
      no_matrix_data
    });

  } catch (error) {
    console.error('Matrix lookup error:', error);
    res.json({
      matched: false,
      partial_match: false,
      pressing_label: null,
      engineer_notes: [],
      is_double_album: false,
      all_known_matrices: [],
      no_matrix_data: true
    });
  }
});

// GET /price?release_id={id}&condition={grade}
router.get('/price', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 60)) return;

  const { release_id, condition } = req.query;
  if (!release_id) {
    return res.status(400).json({ error: 'release_id required' });
  }

  const cacheKey = `price-${release_id}`;
  const now = Date.now();

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && now < cached.expires) {
    return res.json({ ...cached.data, cached: true });
  }

  const DISCOGS_KEY = process.env.DISCOGS_KEY;
  const DISCOGS_SECRET = process.env.DISCOGS_SECRET;

  if (!DISCOGS_KEY || !DISCOGS_SECRET) {
    return res.status(500).json({ error: 'Discogs credentials not configured' });
  }

  try {
    const url = `https://api.discogs.com/marketplace/stats/${release_id}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Discogs key=${DISCOGS_KEY}, secret=${DISCOGS_SECRET}`,
        'User-Agent': 'Rekkrd/1.0'
      }
    });

    if (!response.ok) {
      return res.json({ available: false });
    }

    const data = await response.json();

    if (!data || !data.lowest_price) {
      return res.json({ available: false });
    }

    const result = {
      low: data.lowest_price?.value || null,
      median: data.median?.value || null,
      high: data.highest_price?.value || null,
      num_for_sale: data.num_for_sale || 0,
      available: true,
      cached: false
    };

    // Cache for 24 hours
    cache.set(cacheKey, {
      data: result,
      expires: now + (24 * 60 * 60 * 1000)
    });

    res.json(result);

  } catch (error) {
    console.error('Price lookup error:', error);
    res.json({ available: false });
  }
});

// GET /ebay?q={query}
router.get('/ebay', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 30)) return;

  let { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter required' });
  }

  // Append 'vinyl' if not already in query
  if (!q.toLowerCase().includes('vinyl')) {
    q = `${q} vinyl`;
  }

  const cacheKey = `ebay-${q}`;
  const now = Date.now();

  // Check cache (6hr TTL)
  const cached = cache.get(cacheKey);
  if (cached && now < cached.expires) {
    return res.json({ ...cached.data, cached: true });
  }

  const EBAY_APP_ID = process.env.EBAY_APP_ID;
  if (!EBAY_APP_ID) {
    return res.json({ available: false });
  }

  try {
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': EBAY_APP_ID,
      'RESPONSE-DATA-FORMAT': 'XML',
      'REST-PAYLOAD': 'true',
      'keywords': q,
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true',
      'paginationInput.entriesPerPage': '50',
      'sortOrder': 'EndTimeSoonest'
    });

    const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.json({ available: false });
    }

    const xmlText = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xmlText);

    // Navigate to items array
    const items = parsed?.findCompletedItemsResponse?.searchResult?.item;
    if (!items || !Array.isArray(items)) {
      return res.json({ available: false });
    }

    // Extract prices and filter
    const prices: number[] = [];
    const excludeTerms = ['cd', 'cassette', '8-track', '8track', 'dvd', 'vhs', '45 rpm', '45rpm', '"7', "7'"];

    for (const item of items) {
      const title = (item.title || '').toLowerCase();

      // Skip if title contains excluded terms
      if (excludeTerms.some(term => title.includes(term))) {
        continue;
      }

      // Extract price
      const priceValue =
        item.sellingStatus?.convertedCurrentPrice?.['__value__'] ||
        item.sellingStatus?.currentPrice?.['__value__'] ||
        '0';

      const price = parseFloat(priceValue);
      if (price > 0) {
        prices.push(price);
      }
    }

    if (prices.length === 0) {
      return res.json({ available: false });
    }

    // Sort and strip outliers
    prices.sort((a, b) => a - b);
    const removeCount = Math.floor(prices.length * 0.10);
    const trimmed = removeCount > 0
      ? prices.slice(removeCount, prices.length - removeCount)
      : prices;

    if (trimmed.length === 0) {
      return res.json({ available: false });
    }

    const result = {
      low: trimmed[0],
      high: trimmed[trimmed.length - 1],
      median: trimmed[Math.floor(trimmed.length / 2)],
      count: trimmed.length,
      available: true,
      cached: false
    };

    // Cache for 6 hours
    cache.set(cacheKey, {
      data: result,
      expires: now + (6 * 60 * 60 * 1000)
    });

    res.json(result);

  } catch (error) {
    console.error('eBay lookup error:', error);
    res.json({ available: false });
  }
});

export default router;
