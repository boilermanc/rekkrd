/**
 * Validates required environment variables at server startup.
 * Throws immediately if any are missing so misconfigured deploys fail fast.
 */

const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'GEMINI_API_KEY',
  'RESEND_API_KEY',
] as const;

const OPTIONAL_VARS = [
  'DISCOGS_CONSUMER_KEY',
  'DISCOGS_CONSUMER_SECRET',
  'N8N_WEBHOOK_URL',
] as const;

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `[startup] Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}`
    );
  }

  const missingOptional = OPTIONAL_VARS.filter(key => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn(
      `[startup] Optional environment variables not set (some features may be disabled):\n${missingOptional.map(k => `  - ${k}`).join('\n')}`
    );
  }

  console.log('[startup] Environment validation passed.');
}
