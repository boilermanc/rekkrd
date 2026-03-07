import { Router } from 'express';
import { USER_AGENT } from '../lib/constants.js';

const ALLOWED_HOSTS = [
  'img.discogs.com',
  'i.discogs.com',
  'coverartarchive.org',
  'archive.org',
  'images.unsplash.com',
];

function isAllowedUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return ALLOWED_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host));
}

// 1x1 transparent PNG returned when upstream fails, so <img> tags render cleanly.
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

function sendFallback(res: import('express').Response): void {
  res.status(200).set('Content-Type', 'image/png').send(TRANSPARENT_PNG);
}

const router = Router();

// Auth intentionally skipped: this endpoint is called via <img> src attributes in the
// browser, which cannot attach Authorization headers. Security is enforced by the
// ALLOWED_HOSTS allowlist above, which restricts proxying to known image CDNs only.
router.get('/api/image-proxy', async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  if (!isAllowedUrl(url)) {
    res.status(403).json({ error: 'Host not allowed' });
    return;
  }

  try {
    // Follow redirects manually, validating each hop against the allowlist (SSRF protection).
    // Max 3 hops covers coverartarchive.org → archive.org → ia800X.us.archive.org.
    let currentUrl = url;
    let upstream: Response | null = null;

    for (let hop = 0; hop < 3; hop++) {
      upstream = await fetch(currentUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'image/*',
        },
        redirect: 'manual',
      });

      if (upstream.status < 300 || upstream.status >= 400) {
        break; // Not a redirect — we have our final response
      }

      const location = upstream.headers.get('location');
      if (!location) {
        sendFallback(res);
        return;
      }

      const resolvedLocation = new URL(location, currentUrl).href;
      if (!isAllowedUrl(resolvedLocation)) {
        sendFallback(res);
        return;
      }

      if (hop === 2) {
        sendFallback(res);
        return;
      }

      currentUrl = resolvedLocation;
    }

    if (!upstream) {
      sendFallback(res);
      return;
    }

    if (!upstream.ok) {
      sendFallback(res);
      return;
    }

    const contentType = upstream.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      sendFallback(res);
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Image proxy error:', error);
    sendFallback(res);
  }
});

export default router;
