import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import dns from 'dns/promises';
import { requireAuthWithUser } from './_auth';
import { cors } from './_cors';
import { USER_AGENT } from './_constants';
import { validateStringLength } from './_validate';

export const config = {
  maxDuration: 30,
};

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res, 'POST')) return;
  const auth = await requireAuthWithUser(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const { imageUrl, albumId } = req.body;
    if (!imageUrl || !albumId || typeof imageUrl !== 'string' || typeof albumId !== 'string') {
      return res.status(400).json({ error: 'Missing imageUrl or albumId' });
    }

    const urlErr = validateStringLength(imageUrl, 2048, 'imageUrl');
    if (urlErr) return res.status(400).json({ error: urlErr });
    const idErr = validateStringLength(albumId, 500, 'albumId');
    if (idErr) return res.status(400).json({ error: idErr });

    // Validate the image URL to prevent SSRF
    let parsed: URL;
    try {
      parsed = new URL(imageUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    if (parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only HTTPS URLs are allowed' });
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
      return res.status(400).json({ error: `Host '${parsed.hostname}' is not in the allowed list` });
    }

    // Resolve hostname and block private/internal IPs
    let addresses: { address: string; family: number }[];
    try {
      addresses = await dns.lookup(parsed.hostname, { all: true });
    } catch {
      return res.status(400).json({ error: 'Could not resolve hostname' });
    }

    for (const { address } of addresses) {
      if (isPrivateIP(address)) {
        return res.status(400).json({ error: 'URL resolves to a private/internal IP address' });
      }
    }

    // Download the image from the validated external URL
    const imageResp = await fetch(imageUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'image/*',
      },
      redirect: 'manual',
    });

    if (imageResp.status >= 300 && imageResp.status < 400) {
      return res.status(400).json({ error: 'Redirects are not allowed' });
    }

    if (!imageResp.ok) {
      return res.status(502).json({ error: 'Failed to fetch image from source' });
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
      return res.status(500).json({ error: 'Failed to upload to storage' });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('album-photos')
      .getPublicUrl(fileName);

    // Update the album's cover_url in the database
    const { error: dbError } = await supabase
      .from('albums')
      .update({ cover_url: publicUrl })
      .eq('id', albumId);

    if (dbError) {
      console.error('DB update error:', dbError);
      return res.status(500).json({ error: 'Failed to update album' });
    }

    return res.status(200).json({ publicUrl });
  } catch (error) {
    console.error('Upload cover error:', error);
    return res.status(500).json({ error: 'Failed to upload cover' });
  }
}
