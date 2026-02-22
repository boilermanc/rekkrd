import type { Request, Response, NextFunction } from 'express';

/**
 * Server-side safeguard to prevent exceeding the Discogs API rate limit.
 *
 * Discogs allows 60 authenticated requests/min. We cap at 55 to leave buffer.
 * This is a global counter (not per-IP) because the limit applies to our single
 * API token, shared across all users.
 *
 * The discogsService also handles 429s from Discogs itself, but this middleware
 * prevents us from sending requests we know will fail.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 55;

const timestamps: number[] = [];

export const discogsRateLimiter = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Drop timestamps outside the rolling window
  while (timestamps.length > 0 && timestamps[0] <= windowStart) {
    timestamps.shift();
  }

  if (timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);

    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      error: 'Discogs rate limit reached. Please try again shortly.',
      retryAfter,
    });
    return;
  }

  timestamps.push(now);
  next();
};
