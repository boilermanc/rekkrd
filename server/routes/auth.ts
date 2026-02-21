import { Router } from 'express';
import { createRateLimit } from '../middleware/rateLimit.js';
import { verifyTurnstile } from '../middleware/turnstile.js';

const router = Router();

// ── POST /api/auth/verify-turnstile ──────────────────────────────────
// Verifies a Cloudflare Turnstile token before the client proceeds with
// Supabase auth (sign in / sign up). No auth middleware — this runs
// before the user is authenticated.
router.post(
  '/api/auth/verify-turnstile',
  createRateLimit(10, 60),
  verifyTurnstile,
  (_req, res) => {
    res.json({ success: true });
  },
);

export default router;
