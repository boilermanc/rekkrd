import * as OAuth from 'oauth-1.0a';
import * as crypto from 'crypto';
import { discogsConfig } from '../lib/discogs.js';

const LOG_PREFIX = '[discogs-oauth]';

// ── OAuth client ──────────────────────────────────────────────────

const oauth = new OAuth({
  consumer: {
    key: discogsConfig.consumerKey,
    secret: discogsConfig.consumerSecret,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(baseString, key) {
    return crypto.createHmac('sha1', key).update(baseString).digest('base64');
  },
});

// ── Helpers ───────────────────────────────────────────────────────

function parseUrlEncoded(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of body.split('&')) {
    const [key, value] = pair.split('=');
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
  }
  return params;
}

function requireUserAgent(): string {
  const { userAgent } = discogsConfig;
  if (!userAgent) {
    throw new Error(`${LOG_PREFIX} DISCOGS_USER_AGENT is not configured`);
  }
  return userAgent;
}

// ── Request token ─────────────────────────────────────────────────

export async function getRequestToken(): Promise<{
  token: string;
  tokenSecret: string;
}> {
  const { callbackUrl } = discogsConfig;
  if (!callbackUrl) {
    throw new Error(`${LOG_PREFIX} DISCOGS_CALLBACK_URL is not configured`);
  }

  const requestData: OAuth.RequestOptions = {
    url: 'https://api.discogs.com/oauth/request_token',
    method: 'POST',
    data: { oauth_callback: callbackUrl },
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData));

  const response = await fetch(requestData.url, {
    method: requestData.method,
    headers: {
      ...authHeader,
      'User-Agent': requireUserAgent(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `${LOG_PREFIX} Failed to get request token: ${response.status} ${body}`,
    );
  }

  const parsed = parseUrlEncoded(await response.text());
  const token = parsed['oauth_token'];
  const tokenSecret = parsed['oauth_token_secret'];

  if (!token || !tokenSecret) {
    throw new Error(`${LOG_PREFIX} Invalid request token response — missing oauth_token or oauth_token_secret`);
  }

  console.log(`${LOG_PREFIX} Obtained request token`);
  return { token, tokenSecret };
}

// ── Authorize URL ─────────────────────────────────────────────────

export function getAuthorizeUrl(requestToken: string): string {
  return `https://www.discogs.com/oauth/authorize?oauth_token=${encodeURIComponent(requestToken)}`;
}

// ── Access token ──────────────────────────────────────────────────

export async function getAccessToken(
  requestToken: string,
  requestTokenSecret: string,
  oauthVerifier: string,
): Promise<{ accessToken: string; accessTokenSecret: string }> {
  const requestData: OAuth.RequestOptions = {
    url: 'https://api.discogs.com/oauth/access_token',
    method: 'POST',
    data: { oauth_verifier: oauthVerifier },
  };

  const token: OAuth.Token = {
    key: requestToken,
    secret: requestTokenSecret,
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(requestData.url, {
    method: requestData.method,
    headers: {
      ...authHeader,
      'User-Agent': requireUserAgent(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `${LOG_PREFIX} Failed to get access token: ${response.status} ${body}`,
    );
  }

  const parsed = parseUrlEncoded(await response.text());
  const accessToken = parsed['oauth_token'];
  const accessTokenSecret = parsed['oauth_token_secret'];

  if (!accessToken || !accessTokenSecret) {
    throw new Error(`${LOG_PREFIX} Invalid access token response — missing oauth_token or oauth_token_secret`);
  }

  console.log(`${LOG_PREFIX} Obtained access token`);
  return { accessToken, accessTokenSecret };
}

// ── Identity ──────────────────────────────────────────────────────

interface DiscogsIdentity {
  id: number;
  username: string;
  consumer_name: string;
}

export async function getAuthenticatedIdentity(
  accessToken: string,
  accessTokenSecret: string,
): Promise<DiscogsIdentity> {
  return makeAuthenticatedRequest<DiscogsIdentity>(
    'https://api.discogs.com/oauth/identity',
    accessToken,
    accessTokenSecret,
  );
}

// ── Generic authenticated request ─────────────────────────────────

export async function makeAuthenticatedRequest<T>(
  url: string,
  accessToken: string,
  accessTokenSecret: string,
  method: string = 'GET',
): Promise<T> {
  const requestData: OAuth.RequestOptions = { url, method };

  const token: OAuth.Token = {
    key: accessToken,
    secret: accessTokenSecret,
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(url, {
    method,
    headers: {
      ...authHeader,
      'User-Agent': requireUserAgent(),
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage: string;
    try {
      const body = await response.json();
      errorMessage = (body as { message?: string }).message || JSON.stringify(body);
    } catch {
      errorMessage = response.statusText;
    }
    throw new Error(`${LOG_PREFIX} ${response.status} ${errorMessage} (${method} ${url})`);
  }

  return response.json() as Promise<T>;
}
