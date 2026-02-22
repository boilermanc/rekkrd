import { discogsConfig } from '../lib/discogs.js';
import type {
  DiscogsSearchParams,
  DiscogsSearchResponse,
  DiscogsRelease,
  DiscogsMasterRelease,
} from '../../types/discogs.js';

// Re-export all types so consumers can import from the service
export type {
  DiscogsSearchParams,
  DiscogsSearchResponse,
  DiscogsSearchResult,
  DiscogsPagination,
  DiscogsRelease,
  DiscogsMasterRelease,
  DiscogsArtist,
  DiscogsTrack,
  DiscogsImage,
  DiscogsLabel,
  DiscogsFormat,
  DiscogsCommunity,
  DiscogsRateLimit,
} from '../../types/discogs.js';

const BASE_URL = 'https://api.discogs.com';
const LOG_PREFIX = '[discogs]';
const RATE_LIMIT_WARN_THRESHOLD = 5;
const DEFAULT_RETRY_AFTER = 60;

// ── Headers ────────────────────────────────────────────────────────

function getHeaders(): Record<string, string> {
  const { personalToken, userAgent } = discogsConfig;

  if (!personalToken) {
    throw new Error(`${LOG_PREFIX} DISCOGS_PERSONAL_TOKEN is not configured`);
  }
  if (!userAgent) {
    throw new Error(`${LOG_PREFIX} DISCOGS_USER_AGENT is not configured`);
  }

  return {
    'User-Agent': userAgent,
    'Authorization': `Discogs token=${personalToken}`,
    'Accept': 'application/json',
  };
}

// ── Generic request ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function discogsRequest<T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(endpoint, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    }
  }

  const headers = getHeaders();

  let response = await fetch(url.toString(), { headers });

  // Handle rate limiting — retry once after waiting
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '', 10);
    const waitSeconds = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter
      : DEFAULT_RETRY_AFTER;

    console.warn(`${LOG_PREFIX} Rate limited (429). Retrying after ${waitSeconds}s...`);
    await sleep(waitSeconds * 1000);

    response = await fetch(url.toString(), { headers });
  }

  // Check remaining rate limit
  const remaining = response.headers.get('X-Discogs-Ratelimit-Remaining');
  if (remaining !== null) {
    const remainingNum = parseInt(remaining, 10);
    if (Number.isFinite(remainingNum) && remainingNum < RATE_LIMIT_WARN_THRESHOLD) {
      console.warn(`${LOG_PREFIX} Rate limit running low: ${remainingNum} requests remaining`);
    }
  }

  if (!response.ok) {
    let errorMessage: string;
    try {
      const body = await response.json();
      errorMessage = body.message || JSON.stringify(body);
    } catch {
      errorMessage = response.statusText;
    }
    throw new Error(`${LOG_PREFIX} ${response.status} ${errorMessage} (${endpoint})`);
  }

  return response.json() as Promise<T>;
}

// ── Public API ─────────────────────────────────────────────────────

export async function searchDiscogs(
  params: DiscogsSearchParams,
): Promise<DiscogsSearchResponse> {
  return discogsRequest<DiscogsSearchResponse>(
    '/database/search',
    params as Record<string, string>,
  );
}

export async function getRelease(id: number): Promise<DiscogsRelease> {
  return discogsRequest<DiscogsRelease>(`/releases/${id}`);
}

export async function getMasterRelease(id: number): Promise<DiscogsMasterRelease> {
  return discogsRequest<DiscogsMasterRelease>(`/masters/${id}`);
}
