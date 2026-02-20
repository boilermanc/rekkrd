import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendTemplatedEmail } from '../services/emailService.js';

const router = Router();

// ── Supabase client (service role — bypasses RLS) ──────────────────

let _admin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (_admin) return _admin;
  _admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return _admin;
}

// ── POST /api/support — submit a support request ───────────────────

router.post('/api/support', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (
    !name || typeof name !== 'string' ||
    !email || typeof email !== 'string' ||
    !subject || typeof subject !== 'string' ||
    !message || typeof message !== 'string'
  ) {
    res.status(400).json({ error: 'name, email, subject, and message are required strings' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('support_requests')
      .insert({ name, email, subject, message })
      .select('id')
      .single();

    if (error) {
      console.error('Support request insert error:', error);
      res.status(500).json({ error: 'Failed to submit support request' });
      return;
    }

    // Fire-and-forget: support confirmation email
    sendTemplatedEmail({
      to: email,
      presetId: 'support-confirmation',
      variableOverrides: {
        hero_body: `We received your message about "${subject}" and will get back to you within 24 hours.`,
      },
    })
      .then(result => result && console.log('[email] Support confirmation sent to', email))
      .catch(err => console.error('[email] Support confirmation failed:', err));

    // Fire-and-forget webhook to n8n
    fetch('https://n8n.sproutify.app/webhook/support-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, message }),
    }).catch((err) => {
      console.error('Support webhook failed (non-blocking):', err);
    });

    res.status(201).json({ success: true, id: data.id });
  } catch (error) {
    console.error('Support request error:', error);
    res.status(500).json({ error: 'Failed to submit support request' });
  }
});

export default router;
