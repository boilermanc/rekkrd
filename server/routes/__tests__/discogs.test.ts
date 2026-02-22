import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Express } from 'express';

// Mock all external dependencies before importing the router
vi.mock('../../services/discogsService.js', () => ({
  searchDiscogs: vi.fn(),
  getRelease: vi.fn(),
  getMasterRelease: vi.fn(),
}));

vi.mock('../../middleware/discogsRateLimit.js', () => ({
  discogsRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../lib/discogs.js', () => ({
  discogsConfig: { personalToken: 'test', userAgent: 'Test/1.0' },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: () => ({
        createSignedUrl: vi.fn(),
        list: vi.fn(),
        upload: vi.fn(),
      }),
    },
  })),
}));

import { searchDiscogs, getRelease, getMasterRelease } from '../../services/discogsService.js';
import discogsRouter from '../discogs.js';

// ── Test app setup ────────────────────────────────────────────────

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(discogsRouter);
  return app;
}

/**
 * Lightweight request helper that avoids needing supertest.
 * Creates a real Express app and makes an HTTP-like call via the internal stack.
 */
async function testRequest(app: Express, method: string, url: string) {
  return new Promise<{ status: number; body: any; headers: Record<string, string> }>((resolve) => {
    const req = {
      method: method.toUpperCase(),
      url,
      headers: {},
      query: Object.fromEntries(new URL(url, 'http://localhost').searchParams),
      params: {},
      body: {},
    };

    const headers: Record<string, string> = {};
    let statusCode = 200;
    let responseBody: any = null;
    let redirectUrl = '';

    const res = {
      statusCode: 200,
      setHeader(key: string, value: string) { headers[key.toLowerCase()] = value; return res; },
      set(key: string, value: string) { headers[key.toLowerCase()] = value; return res; },
      status(code: number) { statusCode = code; res.statusCode = code; return res; },
      json(data: any) { responseBody = data; resolve({ status: statusCode, body: responseBody, headers }); return res; },
      redirect(code: number, url: string) { statusCode = code; redirectUrl = url; resolve({ status: code, body: { redirectUrl }, headers }); return res; },
      send(data: any) { responseBody = data; resolve({ status: statusCode, body: responseBody, headers }); return res; },
      end() { resolve({ status: statusCode, body: responseBody, headers }); },
    };

    // Use Express's internal handle
    (app as any).handle(req, res, () => {
      resolve({ status: 404, body: { error: 'Not found' }, headers });
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────

describe('GET /api/discogs/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when no search params provided', async () => {
    const app = createTestApp();
    const res = await testRequest(app, 'GET', '/api/discogs/search');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least one search param/i);
  });

  it('returns 200 with valid params', async () => {
    const mockData = {
      pagination: { per_page: 20, pages: 1, page: 1, items: 1, urls: {} },
      results: [
        {
          id: 249504,
          type: 'release',
          title: 'Rick Astley - Whenever You Need Somebody',
          thumb: 'https://img.discogs.com/thumb.jpg',
          cover_image: 'https://img.discogs.com/cover.jpg',
          resource_url: 'https://api.discogs.com/releases/249504',
          uri: '/release/249504',
        },
      ],
    };

    vi.mocked(searchDiscogs).mockResolvedValue(mockData as any);

    const app = createTestApp();
    const res = await testRequest(app, 'GET', '/api/discogs/search?q=rick+astley');

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].id).toBe(249504);
    expect(searchDiscogs).toHaveBeenCalledOnce();
  });
});

describe('GET /api/discogs/releases/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for non-numeric ID', async () => {
    const app = createTestApp();
    const res = await testRequest(app, 'GET', '/api/discogs/releases/abc');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/positive integer/i);
  });

  it('returns 400 for negative ID', async () => {
    const app = createTestApp();
    const res = await testRequest(app, 'GET', '/api/discogs/releases/-1');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/positive integer/i);
  });

  it('returns 200 with valid ID', async () => {
    vi.mocked(getRelease).mockResolvedValue({
      id: 249504,
      title: 'Whenever You Need Somebody',
      artists: [],
      year: 1987,
      genres: [],
      styles: [],
      tracklist: [],
      resource_url: '',
    } as any);

    const app = createTestApp();
    const res = await testRequest(app, 'GET', '/api/discogs/releases/249504');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(249504);
    expect(getRelease).toHaveBeenCalledWith(249504);
  });
});

describe('GET /api/discogs/masters/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for non-numeric ID', async () => {
    const app = createTestApp();
    const res = await testRequest(app, 'GET', '/api/discogs/masters/abc');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/positive integer/i);
  });

  it('returns 400 for negative ID', async () => {
    const app = createTestApp();
    const res = await testRequest(app, 'GET', '/api/discogs/masters/-1');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/positive integer/i);
  });

  it('returns 200 with valid ID', async () => {
    vi.mocked(getMasterRelease).mockResolvedValue({
      id: 35792,
      title: 'Whenever You Need Somebody',
      main_release: 249504,
      main_release_url: '',
      year: 1987,
      artists: [],
      genres: [],
      styles: [],
      tracklist: [],
      versions_url: '',
      resource_url: '',
    } as any);

    const app = createTestApp();
    const res = await testRequest(app, 'GET', '/api/discogs/masters/35792');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(35792);
    expect(getMasterRelease).toHaveBeenCalledWith(35792);
  });
});
