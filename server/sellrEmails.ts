import { Resend } from 'resend';
import { logEmailSent } from './sellrEmailLog.js';

type EmailType = 'session_created' | 'payment_confirmed' | 'abandoned_session' | 'rekkrd_conversion' | 'admin_alert';

// ── Resend client (lazy-init, shared with emailService) ─────────────
let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (resendClient) return resendClient;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[sellr-email] RESEND_API_KEY not configured — email sending disabled');
    return null;
  }

  resendClient = new Resend(key);
  return resendClient;
}

const FROM = 'Sellr <appraisals@rekkrd.com>';

function getBaseUrl(): string {
  return process.env.BASE_URL || 'https://rekkrd.com';
}

// ── Shared HTML wrapper ─────────────────────────────────────────────

function sellrEmailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sellr</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F0E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F0E8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Logo -->
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <span style="font-size:28px;font-weight:700;color:#2C4A6E;letter-spacing:1px;">Sellr</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:24px 32px 32px;">
              ${content}
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:24px 32px;text-align:center;font-size:13px;color:#999;">
              Sellr &middot; A product of <a href="https://rekkrd.com" style="color:#2C4A6E;text-decoration:none;">Rekkrd</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Shared styles ───────────────────────────────────────────────────

const btnPrimary = 'display:inline-block;padding:14px 32px;background-color:#2C4A6E;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;';
const btnSecondary = 'display:inline-block;padding:10px 24px;background-color:transparent;color:#2C4A6E;text-decoration:none;border:2px solid #2C4A6E;border-radius:8px;font-size:14px;font-weight:600;';
const textMuted = 'font-size:13px;color:#888;margin-top:24px;';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ── Helper: send via Resend (never throws) ──────────────────────────

interface SendMeta {
  email_type: EmailType;
  session_id?: string;
  order_id?: string;
}

async function send(to: string, subject: string, html: string, meta: SendMeta): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    });

    if (result.error) {
      console.error(`[sellr-email] Resend error: ${result.error.message}`);
      logEmailSent({ ...meta, recipient_email: to, success: false, error_message: result.error.message }).catch(() => {});
      return;
    }

    console.log(`[sellr-email] Sent "${subject}" to ${to} (id: ${result.data?.id})`);
    logEmailSent({ ...meta, recipient_email: to, success: true }).catch(() => {});
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[sellr-email] Failed to send "${subject}":`, message);
    logEmailSent({ ...meta, recipient_email: to, success: false, error_message: message }).catch(() => {});
  }
}

// ── 1. Session Created ──────────────────────────────────────────────

interface SessionCreatedParams {
  email: string;
  session_id: string;
  record_count: number;
  expires_at: string;
}

export async function sendSessionCreatedEmail(params: SessionCreatedParams): Promise<void> {
  const { email, session_id, record_count, expires_at } = params;
  const base = getBaseUrl();

  const content = `
    <h1 style="font-size:22px;color:#1a1a1a;margin:0 0 16px;">Your appraisal is saved</h1>
    <p style="font-size:16px;color:#444;line-height:1.6;margin:0 0 8px;">
      You've started appraising your collection. So far you've scanned
      <strong>${record_count} record${record_count !== 1 ? 's' : ''}</strong>.
    </p>
    <p style="font-size:16px;color:#444;line-height:1.6;margin:0 0 24px;">
      Pick up right where you left off:
    </p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${base}/sellr/scan?session=${session_id}" style="${btnPrimary}">Continue Your Appraisal</a>
    </div>
    <p style="${textMuted}">This session expires ${formatDate(expires_at)}.</p>
  `;

  await send(email, 'Your Sellr appraisal is saved', sellrEmailWrapper(content), {
    email_type: 'session_created',
    session_id,
  });
}

// ── 2. Payment Confirmed ────────────────────────────────────────────

interface PaymentConfirmedParams {
  email: string;
  session_id: string;
  report_token: string;
  record_count: number;
  total_median: number;
  top_records: Array<{ artist: string; title: string; price_median: number }>;
}

export async function sendPaymentConfirmedEmail(params: PaymentConfirmedParams): Promise<void> {
  const { email, report_token, record_count, total_median, top_records } = params;
  const base = getBaseUrl();

  const topRows = top_records
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;">${r.artist} — ${r.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;text-align:right;white-space:nowrap;">$${r.price_median.toFixed(2)}</td>
        </tr>`,
    )
    .join('');

  const content = `
    <h1 style="font-size:22px;color:#1a1a1a;margin:0 0 16px;">Your collection appraisal is ready</h1>
    <p style="font-size:16px;color:#444;line-height:1.6;margin:0 0 20px;">
      Your report is ready. Here's a quick summary:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr>
        <td style="padding:12px 16px;background-color:#F5F0E8;border-radius:8px;">
          <span style="font-size:14px;color:#666;">Records appraised</span><br/>
          <strong style="font-size:20px;color:#1a1a1a;">${record_count}</strong>
        </td>
        <td style="width:12px;"></td>
        <td style="padding:12px 16px;background-color:#F5F0E8;border-radius:8px;">
          <span style="font-size:14px;color:#666;">Estimated total value</span><br/>
          <strong style="font-size:20px;color:#1a1a1a;">$${total_median.toFixed(2)}</strong>
        </td>
      </tr>
    </table>
    ${
      top_records.length > 0
        ? `
    <p style="font-size:14px;color:#666;margin:20px 0 8px;font-weight:600;">Top records by value</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      ${topRows}
    </table>`
        : ''
    }
    <div style="text-align:center;margin:0 0 12px;">
      <a href="${base}/sellr/report?token=${report_token}" style="${btnPrimary}">View My Report</a>
    </div>
    <div style="text-align:center;margin:0 0 8px;">
      <a href="${base}/sellr/report?token=${report_token}#pdf" style="${btnSecondary}">Download PDF</a>
    </div>
  `;

  await send(email, 'Your collection appraisal is ready 🎵', sellrEmailWrapper(content), {
    email_type: 'payment_confirmed',
    session_id: params.session_id,
  });
}

// ── 3. Abandoned Session ────────────────────────────────────────────

interface AbandonedSessionParams {
  email: string;
  session_id: string;
  record_count: number;
  total_median: number;
}

export async function sendAbandonedSessionEmail(params: AbandonedSessionParams): Promise<void> {
  const { email, session_id, record_count, total_median } = params;
  const base = getBaseUrl();

  const content = `
    <h1 style="font-size:22px;color:#1a1a1a;margin:0 0 16px;">You left ${record_count} record${record_count !== 1 ? 's' : ''} unappraised</h1>
    <p style="font-size:16px;color:#444;line-height:1.6;margin:0 0 8px;">
      You started appraising your collection but didn't finish.
    </p>
    <p style="font-size:18px;color:#1a1a1a;line-height:1.6;margin:0 0 24px;font-weight:600;">
      Your collection could be worth up to $${total_median.toFixed(2)}
    </p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${base}/sellr/scan?session=${session_id}" style="${btnPrimary}">Complete Your Appraisal</a>
    </div>
    <p style="${textMuted}font-weight:600;color:#c0392b;">Your session expires in 24 hours.</p>
  `;

  await send(email, `You left ${record_count} records unappraised`, sellrEmailWrapper(content), {
    email_type: 'abandoned_session',
    session_id,
  });
}

// ── 4. Rekkrd Conversion ────────────────────────────────────────────

interface RekkrdConversionParams {
  email: string;
  session_id: string;
  record_count: number;
  report_token: string;
}

export async function sendRekkrdConversionEmail(params: RekkrdConversionParams): Promise<void> {
  const { email, session_id, record_count } = params;
  const base = getBaseUrl();

  const features = [
    { label: 'Value Tracking', desc: 'Watch your collection value change over time' },
    { label: 'Discogs Sync', desc: 'Pull in full release data automatically' },
    { label: 'Wantlist Management', desc: 'Track the records you\'re hunting for' },
  ];

  const featureRows = features
    .map(
      (f) =>
        `<tr>
          <td style="padding:6px 0;font-size:15px;color:#333;">
            <strong>${f.label}</strong> — ${f.desc}
          </td>
        </tr>`,
    )
    .join('');

  const content = `
    <h1 style="font-size:22px;color:#1a1a1a;margin:0 0 16px;">Keep your collection in Rekkrd — free</h1>
    <p style="font-size:16px;color:#444;line-height:1.6;margin:0 0 20px;">
      Your Sellr appraisal captured <strong>${record_count} record${record_count !== 1 ? 's' : ''}</strong>.
      Import them into Rekkrd to track value over time, get price alerts,
      and manage your collection properly.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      ${featureRows}
    </table>
    <div style="text-align:center;margin:0 0 12px;">
      <a href="${base}/signup?import=${session_id}" style="${btnPrimary}">Import to Rekkrd Free</a>
    </div>
    <div style="text-align:center;margin:0 0 8px;">
      <a href="${base}/login?import=${session_id}" style="${btnSecondary}">Already have an account?</a>
    </div>
  `;

  await send(email, 'Keep your collection in Rekkrd — free', sellrEmailWrapper(content), {
    email_type: 'rekkrd_conversion',
    session_id,
  });
}

// ── 5. Admin Order Alert ────────────────────────────────────────────

interface AdminOrderAlertParams {
  order_id: string;
  email: string;
  tier: string;
  record_count: number;
  amount_cents: number;
  total_median: number;
}

export async function sendAdminOrderAlert(params: AdminOrderAlertParams): Promise<void> {
  const { order_id, email, tier, record_count, amount_cents, total_median } = params;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('[sellr-email] ADMIN_EMAIL not configured — skipping admin alert');
    return;
  }

  const content = `
    <h1 style="font-size:20px;color:#1a1a1a;margin:0 0 16px;">New Sellr Order</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#666;width:140px;">Order ID</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;">${order_id}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#666;">Customer</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;">${email}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#666;">Tier</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;">${tier}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#666;">Records</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;">${record_count}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#666;">Amount paid</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;">${formatCurrency(amount_cents)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-size:14px;color:#666;">Collection value</td>
        <td style="padding:8px 12px;font-size:14px;color:#333;">$${total_median.toFixed(2)}</td>
      </tr>
    </table>
  `;

  await send(
    adminEmail,
    `New Sellr order — ${tier} · ${formatCurrency(amount_cents)}`,
    sellrEmailWrapper(content),
    { email_type: 'admin_alert', order_id },
  );
}
