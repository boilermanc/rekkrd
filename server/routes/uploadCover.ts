import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import dns from 'dns/promises';
import { requireAuthWithUser } from '../middleware/auth.js';
import { validateStringLength } from '../middleware/validate.js';
import { USER_AGENT } from '../lib/constants.js';

function isPrivateIP(ip: string): boolean {
  // IPv6 loopback
  if (ip === '::1' || ip === '::') return true;

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p))) {
    // Non-IPv4 and not the IPv6 cases above — block to be safe
    return true;
  }

  const [a, b] = parts;
  return (
    a === 127 ||                          // 127.0.0.0/8   loopback
    a === 10 ||                           // 10.0.0.0/8    private
    (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12 private
    (a === 192 && b === 168) ||           // 192.168.0.0/16 private
    (a === 169 && b === 254) ||           // 169.254.0.0/16 link-local
    a === 0                               // 0.0.0.0/8
  );
}

const router = Router();

router.post(
  '/api/upload-cover',
  requireAuthWithUser,
  async (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({ error: 'Supabase not configured' });
      return;
    }

    try {
      const { imageUrl, albumId } = req.body;
      if (!imageUrl || !albumId || typeof imageUrl !== 'string' || typeof albumId !== 'string') {
        res.status(400).json({ error: 'Missing imageUrl or albumId' });
        return;
      }

      const urlErr = validateStringLength(imageUrl, 2048, 'imageUrl');
      if (urlErr) { res.status(400).json({ error: urlErr }); return; }
      const idErr = validateStringLength(albumId, 500, 'albumId');
      if (idErr) { res.status(400).json({ error: idErr }); return; }

      // Validate the image URL to prevent SSRF
      let parsed: URL;
      try {
        parsed = new URL(imageUrl);
      } catch {
        res.status(400).json({ error: 'Invalid image URL' });
        return;
      }

      if (parsed.protocol !== 'https:') {
        res.status(400).json({ error: 'Only HTTPS URLs are allowed' });
        return;
      }

      const ALLOWED_HOSTS = [
        'img.discogs.com',
        'i.discogs.com',
        'coverartarchive.org',
        'images.unsplash.com',
        'is1-ssl.mzstatic.com',
        'is2-ssl.mzstatic.com',
        'is3-ssl.mzstatic.com',
        'is4-ssl.mzstatic.com',
        'is5-ssl.mzstatic.com',
      ];

      if (!ALLOWED_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host))) {
        res.status(400).json({ error: `Host '${parsed.hostname}' is not in the allowed list` });
        return;
      }

      // Resolve hostname and block private/internal IPs
      let addresses: { address: string; family: number }[];
      try {
        addresses = await dns.lookup(parsed.hostname, { all: true });
      } catch {
        res.status(400).json({ error: 'Could not resolve hostname' });
        return;
      }

      for (const { address } of addresses) {
        if (isPrivateIP(address)) {
          res.status(400).json({ error: 'URL resolves to a private/internal IP address' });
          return;
        }
      }

      // Download the image from the validated external URL.
      // Allow redirects — Cover Art Archive always 302s to the actual CDN.
      // The initial URL has already been validated against the host allowlist
      // and DNS-checked for private IPs, so following redirects is safe here.
      const imageResp = await fetch(imageUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'image/*',
        },
        redirect: 'follow',
      });

      if (!imageResp.ok) {
        res.status(502).json({ error: 'Failed to fetch image from source' });
        return;
      }

      const contentType = imageResp.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await imageResp.arrayBuffer());
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      const fileName = `covers/${albumId}-${Date.now()}.${ext}`;

      // Upload to Supabase Storage
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error: uploadError } = await supabase.storage
        .from('album-photos')
        .upload(fileName, buffer, { contentType, upsert: false });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        res.status(500).json({ error: 'Failed to upload to storage' });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('album-photos')
        .getPublicUrl(fileName);

      res.status(200).json({ publicUrl });
    } catch (error) {
      console.error('Upload cover error:', error);
      res.status(500).json({ error: 'Failed to upload cover' });
    }
  }
);

export default router;
