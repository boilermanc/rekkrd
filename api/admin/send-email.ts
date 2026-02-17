import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { cors } from '../_cors';
import { requireAdmin } from '../_adminAuth';

export const config = { maxDuration: 15 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res, 'POST')) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'to, subject, and html are required' });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const resend = new Resend(resendKey);

    const result = await resend.emails.send({
      from: 'Rekkrd <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (result.error) {
      return res.status(400).json({
        error: result.error.message,
        details: result.error,
      });
    }

    return res.status(200).json({
      id: result.data?.id,
      from: 'Rekkrd <onboarding@resend.dev>',
      to: [to],
      subject,
      created_at: new Date().toISOString(),
      status: 'sent',
    });
  } catch (err) {
    console.error('Send email error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
