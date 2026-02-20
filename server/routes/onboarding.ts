import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { sendTemplatedEmail } from '../services/emailService.js';

const router = Router();

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── POST /api/onboarding/complete ────────────────────────────────────
// Called after the onboarding wizard saves the profile. Sends the
// welcome email if the user just completed onboarding for the first time.
router.post(
  '/api/onboarding/complete',
  requireAuthWithUser,
  async (req, res) => {
    const { userId } = (req as typeof req & { auth: AuthResult }).auth;

    try {
      const supabase = getSupabaseAdmin();

      // Guard against duplicate sends: only trigger when the profile
      // already has onboarding_completed = true (just set by the wizard)
      // but was false/null before this session. We check the current DB
      // value — if it's not true, the wizard hasn't saved yet or something
      // went wrong, so bail out.
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .single();

      if (profileErr || !profile) {
        console.error('[email] Could not fetch profile for welcome email:', profileErr?.message);
        res.status(200).json({ sent: false, reason: 'profile_not_found' });
        return;
      }

      if (!profile.onboarding_completed) {
        // Profile wasn't saved yet or onboarding isn't marked complete
        res.status(200).json({ sent: false, reason: 'onboarding_not_completed' });
        return;
      }

      // Look up user email from Supabase Auth
      const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(userId);

      if (userErr || !user?.email) {
        console.error('[email] Could not resolve user email:', userErr?.message);
        res.status(200).json({ sent: false, reason: 'no_email' });
        return;
      }

      // Fire-and-forget: welcome email on onboarding completion
      sendTemplatedEmail({ to: user.email, presetId: 'welcome' })
        .then(result => result && console.log('[email] Welcome email sent to', user.email))
        .catch(err => console.error('[email] Welcome email failed:', err));

      res.status(200).json({ sent: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[email] Onboarding complete handler error:', message);
      // Don't fail the response — the profile is already saved
      res.status(200).json({ sent: false, reason: 'internal_error' });
    }
  },
);

export default router;
