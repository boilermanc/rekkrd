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
    // Use manual redirects to validate each hop against the allowlist (SSRF protection).
    // Only one redirect is followed — if it redirects again, we reject.
    let upstream = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'image/*',
      },
      redirect: 'manual',
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('location');
      if (!location) {
        res.status(502).json({ error: 'Redirect with no location header' });
        return;
      }
      const resolvedLocation = new URL(location, url).href;
      if (!isAllowedUrl(resolvedLocation)) {
        res.status(403).json({ error: 'Redirect target not allowed' });
        return;
      }
      upstream = await fetch(resolvedLocation, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'image/*',
        },
        redirect: 'manual',
      });
      // If the redirect target itself redirects, reject
      if (upstream.status >= 300 && upstream.status < 400) {
        res.status(403).json({ error: 'Too many redirects' });
        return;
      }
    }

    if (!upstream!.ok) {
      res.status(upstream!.status).json({ error: 'Upstream fetch failed' });
      return;
    }

    const contentType = upstream!.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      res.status(502).json({ error: 'Upstream returned non-image content type' });
      return;
    }

    const buffer = Buffer.from(await upstream!.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(502).json({ error: 'Failed to fetch image' });
  }
});

export default router;
