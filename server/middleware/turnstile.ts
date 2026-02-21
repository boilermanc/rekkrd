import type { Request, Response, NextFunction } from 'express';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Express middleware that verifies a Cloudflare Turnstile token from req.body.turnstileToken.
 * Returns 400 if the token is missing or verification fails.
 */
export async function verifyTurnstile(req: Request, res: Response, next: NextFunction): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('[turnstile] TURNSTILE_SECRET_KEY not configured');
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  const token = req.body?.turnstileToken;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Turnstile token is required' });
    return;
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: getClientIp(req),
      }),
    });

    const result = await response.json() as { success: boolean; 'error-codes'?: string[] };

    if (!result.success) {
      console.warn('[turnstile] Verification failed:', result['error-codes']);
      res.status(400).json({ error: 'Turnstile verification failed' });
      return;
    }

    next();
  } catch (err) {
    console.error('[turnstile] Verification request error:', err);
    res.status(500).json({ error: 'Turnstile verification error' });
  }
}
