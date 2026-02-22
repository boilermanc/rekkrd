/**
 * Centralized Discogs configuration.
 *
 * All Discogs env vars are read here so the rest of the codebase
 * imports from this module instead of touching process.env directly.
 */

export const discogsConfig = {
  consumerKey: process.env.DISCOGS_CONSUMER_KEY ?? '',
  consumerSecret: process.env.DISCOGS_CONSUMER_SECRET ?? '',
  personalToken: process.env.DISCOGS_PERSONAL_TOKEN ?? '',
  userAgent: process.env.DISCOGS_USER_AGENT ?? '',
  callbackUrl: process.env.DISCOGS_CALLBACK_URL ?? '',
} as const;

/**
 * Returns true when the minimum required Discogs vars are present.
 * Called at server boot to log a warning if Discogs features are unavailable.
 */
export function validateDiscogsConfig(): boolean {
  const missing: string[] = [];

  if (!discogsConfig.personalToken) missing.push('DISCOGS_PERSONAL_TOKEN');
  if (!discogsConfig.userAgent) missing.push('DISCOGS_USER_AGENT');

  if (missing.length > 0) {
    console.warn(
      `[discogs] Missing env vars: ${missing.join(', ')} — Discogs features will be unavailable`,
    );
    return false;
  }

  return true;
}
