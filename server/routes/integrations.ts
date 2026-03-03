import { Router, type Request, type Response } from 'express';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { requireAdmin } from '../middleware/adminAuth.js';
import { invalidateStripeCache } from '../lib/stripe.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

const router = Router();

// ── GET /api/admin/integrations ─────────────────────────────────────
// Fetch settings by category. Defaults to 'integrations', supports ?category=stripe.
router.get('/api/admin/integrations', requireAdmin, async (req: Request, res: Response) => {
  try {
    const category = (req.query.category as string) || 'integrations';
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');
    const { data, error } = await supabase
      .from('config_settings')
      .select('key, value, data_type')
      .eq('category', category)
      .order('key');

    if (error) {
      console.error('[integrations] Fetch error:', error.message);
      res.status(500).json({ error: 'Failed to fetch settings' });
      return;
    }

    const settings: Record<string, unknown> = {};
    for (const row of (data || []) as Array<{ key: string; value: unknown; data_type: string }>) {
      settings[row.key] = parseValue(row.value, row.data_type);
    }

    res.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[integrations] GET error:', message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/admin/integrations ─────────────────────────────────────
// Bulk upsert settings. Body: { category?, settings: { key: { value, dataType } } }
router.put('/api/admin/integrations', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { category: bodyCategory, settings } = req.body as {
      category?: string;
      settings: Record<string, { value: unknown; dataType: string }>;
    };

    const category = bodyCategory || 'integrations';

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Missing settings object' });
      return;
    }

    const records = Object.entries(settings).map(([key, config]) => ({
      category,
      key,
      value: stringifyValue(config.value, config.dataType),
      data_type: config.dataType,
      updated_at: new Date().toISOString(),
    }));

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');
    const { error } = await supabase
      .from('config_settings')
      .upsert(records, { onConflict: 'category,key' });

    if (error) {
      console.error('[integrations] Upsert error:', error.message);
      res.status(500).json({ error: 'Failed to save settings' });
      return;
    }

    // Invalidate Stripe cache when saving stripe settings
    if (category === 'stripe') {
      invalidateStripeCache();
    }

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[integrations] PUT error:', message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/admin/integrations/test ───────────────────────────────
// Test an integration connection. Body: { integration, config }
router.post('/api/admin/integrations/test', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { integration, config } = req.body as {
      integration: string;
      config: Record<string, string>;
    };

    if (!integration) {
      res.status(400).json({ error: 'Missing integration name' });
      return;
    }

    let result: { success: boolean; message: string; details?: Record<string, unknown> };

    switch (integration) {
      case 'stripe': {
        const secretKey = config?.secret_key;
        if (!secretKey) {
          result = { success: false, message: 'No secret key provided' };
          break;
        }
        try {
          const testStripe = new Stripe(secretKey);

          // Fetch balance + account info in parallel
          const [balance, account] = await Promise.all([
            testStripe.balance.retrieve(),
            testStripe.accounts.retrieve().catch(() => null),
          ]);

          // Format available balances
          const available = balance.available.map((b) => ({
            amount: (b.amount / 100).toFixed(2),
            currency: b.currency.toUpperCase(),
          }));
          const pending = balance.pending.map((b) => ({
            amount: (b.amount / 100).toFixed(2),
            currency: b.currency.toUpperCase(),
          }));

          // Determine mode from key prefix
          const keyMode = secretKey.startsWith('sk_test_') ? 'Test' : secretKey.startsWith('sk_live_') ? 'Live' : 'Unknown';

          result = {
            success: true,
            message: 'Stripe connection successful',
            details: {
              mode: keyMode,
              livemode: balance.livemode,
              account_name: account?.settings?.dashboard?.display_name || account?.business_profile?.name || 'N/A',
              account_id: account?.id || 'N/A',
              country: account?.country || 'N/A',
              default_currency: (account?.default_currency || balance.available[0]?.currency || 'N/A').toUpperCase(),
              payouts_enabled: account?.payouts_enabled ?? 'N/A',
              charges_enabled: account?.charges_enabled ?? 'N/A',
              available_balance: available,
              pending_balance: pending,
            },
          };
        } catch (err) {
          const stripeErr = err as { type?: string; code?: string; statusCode?: number; message?: string; raw?: { message?: string } };
          result = {
            success: false,
            message: `Stripe test failed: ${stripeErr.message || 'Unknown error'}`,
            details: {
              type: stripeErr.type || 'unknown',
              code: stripeErr.code || 'N/A',
              status: stripeErr.statusCode || 'N/A',
              raw_message: stripeErr.raw?.message || stripeErr.message || 'No details',
            },
          };
        }
        break;
      }
      case 'resend': {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          result = {
            success: false,
            message: 'RESEND_API_KEY not configured',
            details: {
              api_key: 'Missing',
              action: 'Set RESEND_API_KEY environment variable and restart the server',
            },
          };
          break;
        }
        try {
          const resend = new Resend(apiKey);

          // Fetch domains, API keys, and email config in parallel
          const supabaseForEmail = getSupabaseAdmin();
          if (!supabaseForEmail) throw new Error('Supabase admin not configured');
          const [domainRes, keyRes, emailConfigRes] = await Promise.all([
            resend.domains.list(),
            resend.apiKeys.list(),
            supabaseForEmail
              .from('config_settings')
              .select('key, value')
              .eq('category', 'email'),
          ]);

          // Check for API-level errors
          if (domainRes.error) {
            const errName = (domainRes.error as { name?: string }).name || 'unknown';
            result = {
              success: false,
              message: `Resend API error: ${domainRes.error.message}`,
              details: {
                error_code: errName,
                error_message: domainRes.error.message,
                api_key_prefix: `${apiKey.slice(0, 8)}...`,
                action: errName === 'invalid_api_key' || errName === 'missing_api_key'
                  ? 'Check RESEND_API_KEY — it may be invalid or expired'
                  : errName === 'restricted_api_key'
                    ? 'This API key lacks permission to list domains — use a full-access key'
                    : 'Check the Resend dashboard for details',
              },
            };
            break;
          }

          // Parse domains
          type DomainEntry = { name: string; status: string; region: string; created_at: string; capabilities?: { sending?: string; receiving?: string } };
          const domains = (domainRes.data?.data || []) as DomainEntry[];
          const verified = domains.filter((d) => d.status === 'verified');
          const pending = domains.filter((d) => d.status === 'pending' || d.status === 'not_started');
          const failed = domains.filter((d) => d.status === 'failed' || d.status === 'temporary_failure');

          // Parse API keys
          type KeyEntry = { id: string; name: string; created_at: string };
          const apiKeys = (keyRes.data?.data || []) as KeyEntry[];

          // Parse email config from DB
          const emailKv: Record<string, string> = {};
          for (const row of (emailConfigRes.data || []) as Array<{ key: string; value: unknown }>) {
            emailKv[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
          }

          // Build domain details
          const domainLines = domains.map((d) => {
            const sending = d.capabilities?.sending || 'unknown';
            return `${d.name} (${d.status}, sending: ${sending}, ${d.region})`;
          });

          // Determine if sending is possible
          const canSend = verified.some((d) => d.capabilities?.sending === 'enabled');
          const allVerifiedNames = verified.map((d) => d.name);

          result = {
            success: true,
            message: canSend
              ? 'Resend connection successful — sending enabled'
              : verified.length > 0
                ? 'Connected but sending may be restricted — check domain capabilities'
                : 'Connected but no verified domains — emails cannot be sent',
            details: {
              api_key: `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`,
              api_keys_count: apiKeys.length,
              sending_enabled: canSend ? 'Yes' : 'No',
              total_domains: domains.length,
              verified_domains: `${verified.length} (${allVerifiedNames.join(', ') || 'none'})`,
              ...(pending.length > 0 && { pending_domains: pending.map((d) => d.name).join(', ') }),
              ...(failed.length > 0 && { failed_domains: failed.map((d) => d.name).join(', ') }),
              region: verified[0]?.region || domains[0]?.region || 'N/A',
              all_domains: domainLines.join(' | ') || 'None configured',
              rekkrd_from: emailKv.from_name
                ? `${emailKv.from_name} <${emailKv.from_address || 'noreply@rekkrd.com'}>`
                : emailKv.from_address || 'Not configured (using defaults)',
              sellr_from: emailKv.sellr_from_name
                ? `${emailKv.sellr_from_name} <${emailKv.sellr_from_address || 'appraisals@rekkrd.com'}>`
                : emailKv.sellr_from_address || 'Not configured (using defaults)',
              ...(emailKv.reply_to && { reply_to: emailKv.reply_to }),
            },
          };
        } catch (err) {
          const resendErr = err as { message?: string; statusCode?: number; name?: string };
          const errName = resendErr.name || 'unknown';
          result = {
            success: false,
            message: `Resend test failed: ${resendErr.message || 'Unknown error'}`,
            details: {
              error_code: errName,
              http_status: resendErr.statusCode || 'N/A',
              error_message: resendErr.message || 'No details',
              api_key_prefix: `${apiKey.slice(0, 8)}...`,
              action: errName === 'invalid_api_key' || errName === 'missing_api_key'
                ? 'The API key is invalid or expired — generate a new one at resend.com/api-keys'
                : resendErr.statusCode === 429
                  ? 'Rate limit exceeded — wait a moment and try again'
                  : 'Check the Resend dashboard or server logs for more details',
            },
          };
        }
        break;
      }
      default:
        result = { success: false, message: `Unknown integration: ${integration}` };
    }

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[integrations] Test error:', message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── GET /api/admin/integrations/status ───────────────────────────────
// Returns connection status for all integrations (no secrets exposed).
router.get('/api/admin/integrations/status', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const integrations: Array<{
      name: string;
      key: string;
      status: 'connected' | 'disabled' | 'error';
      details: Record<string, string>;
    }> = [];

    // ── Stripe ──
    integrations.push(await getStripeStatus());

    // ── Gemini ──
    const geminiKey = process.env.GEMINI_API_KEY;
    integrations.push({
      name: 'Gemini AI',
      key: 'gemini',
      status: geminiKey ? 'connected' : 'disabled',
      details: {
        model: 'gemini-2.5-flash',
        configured: geminiKey ? 'yes' : 'no',
      },
    });

    // ── Discogs ──
    const discogsToken = process.env.DISCOGS_PERSONAL_TOKEN;
    const discogsUA = process.env.DISCOGS_USER_AGENT;
    integrations.push({
      name: 'Discogs',
      key: 'discogs',
      status: discogsToken && discogsUA ? 'connected' : 'disabled',
      details: {
        user_agent: discogsUA || 'Not configured',
        personal_token: discogsToken ? 'Set' : 'Not set',
        oauth: process.env.DISCOGS_CONSUMER_KEY ? 'Configured' : 'Not configured',
      },
    });

    // ── Resend ──
    const resendKey = process.env.RESEND_API_KEY;
    // Read email config from DB for accurate status display
    const supabaseForResend = getSupabaseAdmin();
    if (!supabaseForResend) throw new Error('Supabase admin not configured');
    const { data: emailCfg } = await supabaseForResend
      .from('config_settings')
      .select('key, value')
      .eq('category', 'email');

    const emailKvMap: Record<string, string> = {};
    for (const row of (emailCfg || []) as Array<{ key: string; value: unknown }>) {
      emailKvMap[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
    }

    integrations.push({
      name: 'Resend',
      key: 'resend',
      status: resendKey ? 'connected' : 'disabled',
      details: {
        configured: resendKey ? 'yes' : 'no',
        from_name: emailKvMap.from_name || 'Rekkrd',
        from_address: emailKvMap.from_address || 'noreply@rekkrd.com',
        reply_to: emailKvMap.reply_to || '',
        sellr_from_name: emailKvMap.sellr_from_name || 'Sellr',
        sellr_from_address: emailKvMap.sellr_from_address || 'appraisals@rekkrd.com',
      },
    });

    res.json(integrations);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[integrations] Status error:', message);
    res.status(500).json({ error: 'Failed to fetch integration status' });
  }
});

// ── Helpers ─────────────────────────────────────────────────────────

async function getStripeStatus(): Promise<{
  name: string;
  key: string;
  status: 'connected' | 'disabled' | 'error';
  details: Record<string, string>;
}> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase admin not configured');
    const { data } = await supabase
      .from('config_settings')
      .select('key, value')
      .eq('category', 'stripe');

    const kv: Record<string, string> = {};
    for (const row of (data || []) as Array<{ key: string; value: unknown }>) {
      kv[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
    }

    const mode = (kv.stripe_mode === 'test' ? 'test' : 'live') as 'test' | 'live';
    const prefix = `stripe_${mode}_`;
    const secretKey = kv[`${prefix}secret_key`] || process.env.STRIPE_SECRET_KEY || '';
    const webhookSecret = kv[`${prefix}webhook_secret`] || process.env.STRIPE_WEBHOOK_SECRET || '';

    return {
      name: 'Stripe',
      key: 'stripe',
      status: secretKey ? 'connected' : 'disabled',
      details: {
        mode: mode.charAt(0).toUpperCase() + mode.slice(1),
        secret_key: secretKey ? 'Set' : 'Not set',
        webhook: webhookSecret ? 'Configured' : 'Not configured',
      },
    };
  } catch {
    return {
      name: 'Stripe',
      key: 'stripe',
      status: 'error',
      details: { error: 'Failed to check config' },
    };
  }
}

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

function stringifyValue(value: unknown, dataType: string): unknown {
  switch (dataType) {
    case 'boolean': return value ? true : false;
    case 'number':  return typeof value === 'number' ? value : parseFloat(String(value));
    case 'json':    return typeof value === 'object' ? value : JSON.parse(String(value));
    default:        return String(value ?? '');
  }
}

export default router;
