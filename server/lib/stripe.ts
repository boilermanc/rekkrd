import Stripe from 'stripe';
import { getSupabaseAdmin } from './supabaseAdmin.js';

export type PlanTier = 'collector' | 'curator' | 'enthusiast';

// ── Types ────────────────────────────────────────────────────────────

interface StripeConfig {
  mode: 'test' | 'live';
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  liveWebhookSecret: string;
  testWebhookSecret: string;
  sellrWebhookSecret: string;
  prices: {
    curator: { monthly: string; annual: string };
    enthusiast: { monthly: string; annual: string };
  };
}

// ── Cache ────────────────────────────────────────────────────────────

let _cache: StripeConfig | null = null;
let _cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const _stripeInstances = new Map<string, Stripe>();

// ── Env var fallbacks ────────────────────────────────────────────────

function envFallbackConfig(): StripeConfig {
  return {
    mode: 'live',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    liveWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    testWebhookSecret: process.env.STRIPE_TEST_WEBHOOK_SECRET || '',
    sellrWebhookSecret: process.env.STRIPE_SELLR_WEBHOOK_SECRET || '',
    prices: {
      curator: {
        monthly: process.env.STRIPE_PRICE_CURATOR_MONTHLY || '',
        annual: process.env.STRIPE_PRICE_CURATOR_ANNUAL || '',
      },
      enthusiast: {
        monthly: process.env.STRIPE_PRICE_ENTHUSIAST_MONTHLY || '',
        annual: process.env.STRIPE_PRICE_ENTHUSIAST_ANNUAL || '',
      },
    },
  };
}

// ── DB config loader ─────────────────────────────────────────────────

function parseValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Strip double-encoding: '"sk_test_abc"' → 'sk_test_abc'
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    try { return JSON.parse(s) as string; } catch { return s; }
  }
  return s;
}

async function loadConfigFromDB(): Promise<StripeConfig | null> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('config_settings')
      .select('key, value')
      .eq('category', 'stripe');

    if (error || !data || data.length === 0) return null;

    const kv: Record<string, string> = {};
    for (const row of data as Array<{ key: string; value: unknown }>) {
      kv[row.key] = parseValue(row.value);
    }

    const mode = (kv.stripe_mode === 'test' ? 'test' : 'live') as 'test' | 'live';
    const prefix = `stripe_${mode}_`;
    const env = envFallbackConfig();

    return {
      mode,
      secretKey: kv[`${prefix}secret_key`] || env.secretKey,
      publishableKey: kv[`${prefix}publishable_key`] || env.publishableKey,
      webhookSecret: kv[`${prefix}webhook_secret`] || env.webhookSecret,
      liveWebhookSecret: kv['stripe_live_webhook_secret'] || env.liveWebhookSecret,
      testWebhookSecret: kv['stripe_test_webhook_secret'] || env.testWebhookSecret,
      sellrWebhookSecret: kv[`${prefix}sellr_webhook_secret`] || env.sellrWebhookSecret,
      prices: {
        curator: {
          monthly: kv[`${prefix}price_curator_monthly`] || env.prices.curator.monthly,
          annual: kv[`${prefix}price_curator_annual`] || env.prices.curator.annual,
        },
        enthusiast: {
          monthly: kv[`${prefix}price_enthusiast_monthly`] || env.prices.enthusiast.monthly,
          annual: kv[`${prefix}price_enthusiast_annual`] || env.prices.enthusiast.annual,
        },
      },
    };
  } catch (err) {
    console.error('[stripe] Failed to load config from DB:', (err as Error).message);
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────

export async function getConfig(): Promise<StripeConfig> {
  const now = Date.now();
  if (_cache && now - _cacheLoadedAt < CACHE_TTL_MS) return _cache;

  const dbConfig = await loadConfigFromDB();
  _cache = dbConfig || envFallbackConfig();
  _cacheLoadedAt = Date.now();
  return _cache;
}

export function invalidateStripeCache(): void {
  _cache = null;
  _cacheLoadedAt = 0;
}

export async function getStripe(): Promise<Stripe> {
  const config = await getConfig();
  const existing = _stripeInstances.get(config.secretKey);
  if (existing) return existing;

  const instance = new Stripe(config.secretKey);
  _stripeInstances.set(config.secretKey, instance);
  return instance;
}

export async function getStripeMode(): Promise<'test' | 'live'> {
  const config = await getConfig();
  return config.mode;
}

export async function getPublishableKey(): Promise<string> {
  const config = await getConfig();
  return config.publishableKey;
}

export async function getWebhookSecret(): Promise<string> {
  const config = await getConfig();
  return config.webhookSecret;
}

export async function getSellrWebhookSecret(): Promise<string> {
  const config = await getConfig();
  return config.sellrWebhookSecret;
}

export async function getStripePrices(): Promise<StripeConfig['prices']> {
  const config = await getConfig();
  return config.prices;
}
