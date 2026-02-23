import { createClient } from '@supabase/supabase-js';

// ── Supabase admin client (lazy-init) ───────────────────────────────

let _admin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (_admin) return _admin;
  _admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  return _admin;
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Parse a JSONB value from config_settings into a plain JS value.
 * Handles double-encoded strings: '"sk_test_abc"' → 'sk_test_abc'
 */
function parseValue(value: unknown, dataType: string): unknown {
  if (value === null || value === undefined) return value;

  if (dataType === 'boolean') {
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === true;
  }
  if (dataType === 'number') {
    return typeof value === 'number' ? value : parseFloat(String(value));
  }

  // String: strip double-encoding
  if (typeof value === 'string' && value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

/**
 * Read Slack config from config_settings.
 * Returns { enabled, webhookUrl } or null if DB is unreachable.
 */
async function getSlackConfig(): Promise<{ enabled: boolean; webhookUrl: string } | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('config_settings')
      .select('key, value, data_type')
      .eq('category', 'integrations')
      .in('key', ['slack_enabled', 'slack_webhook_url']);

    if (error || !data) {
      console.error('[slack] Failed to read config:', error?.message);
      return null;
    }

    let enabled = false;
    let webhookUrl = '';

    for (const row of data as Array<{ key: string; value: unknown; data_type: string }>) {
      const parsed = parseValue(row.value, row.data_type);
      if (row.key === 'slack_enabled') enabled = parsed as boolean;
      if (row.key === 'slack_webhook_url') webhookUrl = (parsed as string) || '';
    }

    return { enabled, webhookUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[slack] Config read error:', message);
    return null;
  }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Test a Slack Incoming Webhook URL by sending a test message.
 * Accepts the URL directly (for testing a URL before saving it).
 */
export async function testSlackWebhook(
  webhookUrl: string,
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl) {
    return { success: false, message: 'No webhook URL provided' };
  }

  // Basic validation
  if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
    return { success: false, message: 'Invalid Slack webhook URL — must start with https://hooks.slack.com/' };
  }

  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: ':white_check_mark: *Rekkrd* — Slack integration test successful!',
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return { success: false, message: `Slack returned ${resp.status}: ${body}` };
    }

    return { success: true, message: 'Test message sent to Slack' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, message: `Connection failed: ${message}` };
  }
}

/**
 * Send a message to Slack using the webhook URL stored in config_settings.
 *
 * Returns true on success, false on failure (never throws).
 * If Slack is disabled or not configured, returns false silently.
 */
export async function sendSlackMessage(
  text: string,
  options?: { blocks?: unknown[] },
): Promise<boolean> {
  const config = await getSlackConfig();
  if (!config || !config.enabled || !config.webhookUrl) return false;

  try {
    const payload: Record<string, unknown> = { text };
    if (options?.blocks) payload.blocks = options.blocks;

    const resp = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      console.error(`[slack] Webhook returned ${resp.status}`);
      return false;
    }

    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[slack] Send failed:', message);
    return false;
  }
}
