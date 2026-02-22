import { describe, it, expect, vi, beforeEach } from 'vitest';

// The rate limiter uses module-level state (timestamps array), so we need
// a fresh import for each test to avoid cross-test contamination.
// We'll use vi.importActual to re-import the module after resetting mocks.

function makeMockRes() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    body: null as unknown,
    setHeader(key: string, value: string) { headers[key] = value; return res; },
    status(code: number) { res.statusCode = code; return res; },
    json(data: unknown) { res.body = data; return res; },
    _headers: headers,
  };
  return res;
}

// We need to isolate the module state between tests. Use dynamic import
// with cache busting via vi.resetModules().
async function getFreshRateLimiter() {
  vi.resetModules();
  const mod = await import('../discogsRateLimit.js');
  return mod.discogsRateLimiter;
}

describe('discogsRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('allows requests under the 55/min threshold', async () => {
    const limiter = await getFreshRateLimiter();
    const req = {} as any;
    const res = makeMockRes() as any;
    const next = vi.fn();

    // Make 55 requests — all should pass
    for (let i = 0; i < 55; i++) {
      next.mockClear();
      limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    }

    // Status should never have been set to 429
    expect(res.statusCode).toBe(200);
  });

  it('returns 429 with JSON body and Retry-After header when threshold exceeded', async () => {
    const limiter = await getFreshRateLimiter();
    const req = {} as any;
    const next = vi.fn();

    // Exhaust the 55-request limit
    for (let i = 0; i < 55; i++) {
      const res = makeMockRes() as any;
      limiter(req, res, next);
    }

    // 56th request should be rejected
    const res = makeMockRes() as any;
    next.mockClear();
    limiter(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual(expect.objectContaining({
      error: expect.stringContaining('rate limit'),
      retryAfter: expect.any(Number),
    }));
    expect(res._headers['Retry-After']).toBeDefined();
    expect(Number(res._headers['Retry-After'])).toBeGreaterThan(0);
  });

  it('window resets after 60 seconds', async () => {
    const limiter = await getFreshRateLimiter();
    const req = {} as any;
    const next = vi.fn();

    // Exhaust the limit
    for (let i = 0; i < 55; i++) {
      limiter(req, makeMockRes() as any, next);
    }

    // Advance past the 60-second window
    vi.advanceTimersByTime(61_000);

    // Should be allowed again
    const res = makeMockRes() as any;
    next.mockClear();
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });
});
