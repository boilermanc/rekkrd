const PROXIED_HOSTS = ['img.discogs.com', 'i.discogs.com', 'coverartarchive.org'];

/**
 * Wraps external image URLs through /api/image-proxy to avoid hotlinking blocks.
 * Returns the original URL for hosts that don't need proxying.
 */
export function proxyImageUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (PROXIED_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host))) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // Not a valid URL, return as-is
  }
  return url;
}
