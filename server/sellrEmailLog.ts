import { createClient } from '@supabase/supabase-js';

interface LogEmailParams {
  session_id?: string;
  order_id?: string;
  email_type: 'session_created' | 'payment_confirmed' | 'abandoned_session' | 'rekkrd_conversion' | 'admin_alert';
  recipient_email: string;
  success: boolean;
  error_message?: string;
}

/**
 * Log an email send attempt to sellr_email_log.
 * Never throws — failures are logged to console only.
 */
export async function logEmailSent(params: LogEmailParams): Promise<void> {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.warn('[sellr-email-log] Supabase not configured — skipping log');
      return;
    }

    const supabase = createClient(url, key);

    const { error } = await supabase.from('sellr_email_log').insert({
      session_id: params.session_id || null,
      order_id: params.order_id || null,
      email_type: params.email_type,
      recipient_email: params.recipient_email,
      success: params.success,
      error_message: params.error_message || null,
    });

    if (error) {
      console.error('[sellr-email-log] Insert failed:', error.message);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sellr-email-log] Unexpected error:', message);
  }
}
