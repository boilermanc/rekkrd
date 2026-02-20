import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { sendTemplatedEmail } from '../services/emailService.js';

const router = Router();

const MILESTONES = [50, 100, 250, 500, 1000];

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── POST /api/collection/milestone-check ─────────────────────────────
// Called after an album is added. Checks the user's total album count
// and sends a milestone email if they've hit a threshold.
router.post(
  '/api/collection/milestone-check',
  requireAuthWithUser,
  async (req, res) => {
    const { userId } = (req as typeof req & { auth: AuthResult }).auth;

    try {
      const supabase = getSupabaseAdmin();

      const { count, error } = await supabase
        .from('albums')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error || count === null) {
        res.status(200).json({ milestone: false });
        return;
      }

      if (!MILESTONES.includes(count)) {
        res.status(200).json({ milestone: false, count });
        return;
      }

      // Look up user email from Supabase Auth
      const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(userId);

      if (userErr || !user?.email) {
        console.error('[email] Could not resolve user email for milestone:', userErr?.message);
        res.status(200).json({ milestone: true, count, sent: false });
        return;
      }

      // Fire-and-forget: collection milestone email
      sendTemplatedEmail({
        to: user.email,
        presetId: 'collection-milestone',
        variableOverrides: {
          headline: `${count} Records Strong`,
          subject: `Your collection just hit ${count} albums \uD83C\uDF89`,
          hero_body: `You just added your ${count}th record to Rekkrd. That's a serious collection — keep spinning.`,
        },
      })
        .then(result => result && console.log(`[email] Milestone ${count} sent to`, user.email))
        .catch(err => console.error(`[email] Milestone ${count} failed:`, err));

      res.status(200).json({ milestone: true, count, sent: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[email] Milestone check error:', message);
      res.status(200).json({ milestone: false });
    }
  },
);

export default router;
