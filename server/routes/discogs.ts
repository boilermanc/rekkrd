import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { discogsRateLimiter } from '../middleware/discogsRateLimit.js';
import { searchDiscogs, getRelease, getMasterRelease } from '../services/discogsService.js';
import { discogsConfig } from '../lib/discogs.js';
import type { DiscogsSearchParams } from '../../types/discogs.js';

const DISCOGS_IMAGES_BUCKET = 'discogs-images';
const SIGNED_URL_EXPIRY = 3600; // 1 hour
const CACHE_CONTROL = 'public, max-age=86400'; // 24 hours

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const router = Router();

// Apply Discogs rate limiter to all routes in this router
router.use(discogsRateLimiter);

router.get('/api/discogs/search', async (req, res) => {
  try {
    const { q, type, artist, title, barcode, year, format, country, per_page, page } = req.query;

    // At least one search param required
    if (!q && !artist && !title && !barcode) {
      res.status(400).json({ error: 'At least one search param (q, artist, title, or barcode) is required' });
      return;
    }

    // Clamp per_page to 1–100, default 20
    let perPage = 20;
    if (per_page && typeof per_page === 'string') {
      const parsed = parseInt(per_page, 10);
      if (Number.isFinite(parsed)) {
        perPage = Math.max(1, Math.min(100, parsed));
      }
    }

    // Default page to 1
    let pageNum = 1;
    if (page && typeof page === 'string') {
      const parsed = parseInt(page, 10);
      if (Number.isFinite(parsed) && parsed >= 1) {
        pageNum = parsed;
      }
    }

    const params: DiscogsSearchParams = {
      per_page: String(perPage),
      page: String(pageNum),
    };

    if (q && typeof q === 'string') params.q = q;
    if (type && typeof type === 'string') params.type = type as DiscogsSearchParams['type'];
    if (artist && typeof artist === 'string') params.artist = artist;
    if (title && typeof title === 'string') params.title = title;
    if (barcode && typeof barcode === 'string') params.barcode = barcode;
    if (year && typeof year === 'string') params.year = year;
    if (format && typeof format === 'string') params.format = format;
    if (country && typeof country === 'string') params.country = country;

    const result = await searchDiscogs(params);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Discogs search error:', error);
    res.status(500).json({ error: 'Failed to search Discogs', details: message });
  }
});

router.get('/api/discogs/releases/:id', async (req, res) => {
  const parsed = Number(req.params.id);
  if (!Number.isInteger(parsed) || parsed < 1) {
    res.status(400).json({ error: 'Release ID must be a positive integer' });
    return;
  }

  try {
    const release = await getRelease(parsed);
    res.status(200).json(release);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Discogs release fetch error:', error);
    const status = message.includes(' 404 ') ? 404 : 500;
    res.status(status).json({ error: 'Failed to fetch Discogs release', details: message });
  }
});

router.get('/api/discogs/masters/:id', async (req, res) => {
  const parsed = Number(req.params.id);
  if (!Number.isInteger(parsed) || parsed < 1) {
    res.status(400).json({ error: 'Master release ID must be a positive integer' });
    return;
  }

  try {
    const master = await getMasterRelease(parsed);
    res.status(200).json(master);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Discogs master release fetch error:', error);
    const status = message.includes(' 404 ') ? 404 : 500;
    res.status(status).json({ error: 'Failed to fetch Discogs master release', details: message });
  }
});

// ── Discogs Image Proxy (cache in Supabase Storage) ───────────────

router.get('/api/discogs/images/:releaseId', async (req, res) => {
  const releaseId = Number(req.params.releaseId);
  if (!Number.isInteger(releaseId) || releaseId < 1) {
    res.status(400).json({ error: 'Release ID must be a positive integer' });
    return;
  }

  const size = req.query.size === 'thumb' ? 'thumb' : 'full';
  const storagePath = `${releaseId}/${size === 'thumb' ? 'thumb.jpg' : 'cover.jpg'}`;

  // Fallback URL — used if anything goes wrong so we never return a broken image
  let fallbackUrl = '';

  try {
    const admin = getSupabaseAdmin();

    // 1. Check if already cached in Supabase Storage
    const { data: existing } = await admin.storage
      .from(DISCOGS_IMAGES_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (existing?.signedUrl) {
      // Verify the file actually exists (createSignedUrl succeeds even for missing files)
      const { data: fileList } = await admin.storage
        .from(DISCOGS_IMAGES_BUCKET)
        .list(String(releaseId), { limit: 10 });

      const fileName = size === 'thumb' ? 'thumb.jpg' : 'cover.jpg';
      if (fileList?.some(f => f.name === fileName)) {
        res.set('Cache-Control', CACHE_CONTROL);
        res.redirect(302, existing.signedUrl);
        return;
      }
    }

    // 2. Fetch release from Discogs to get image URLs
    const release = await getRelease(releaseId);
    if (!release.images?.length) {
      res.status(404).json({ error: 'No images found for this release' });
      return;
    }

    // Prefer primary image, fallback to first available
    const primaryImage = release.images.find(img => img.type === 'primary') || release.images[0];
    const imageUrl = size === 'thumb' ? primaryImage.uri150 : primaryImage.uri;
    fallbackUrl = imageUrl;

    if (!imageUrl) {
      res.status(404).json({ error: 'No image URL available for this release' });
      return;
    }

    // 3. Download the image from Discogs
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': discogsConfig.userAgent || 'Rekkrd/1.0',
      },
    });

    if (!imageResponse.ok) {
      throw new Error(`Discogs image fetch failed: ${imageResponse.status}`);
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // 4. Upload to Supabase Storage
    const { error: uploadError } = await admin.storage
      .from(DISCOGS_IMAGES_BUCKET)
      .upload(storagePath, imageBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 5. Generate signed URL and redirect
    const { data: signed, error: signError } = await admin.storage
      .from(DISCOGS_IMAGES_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (signError || !signed?.signedUrl) {
      throw new Error(`Signed URL failed: ${signError?.message || 'no URL returned'}`);
    }

    res.set('Cache-Control', CACHE_CONTROL);
    res.redirect(302, signed.signedUrl);
  } catch (error) {
    console.error('[discogs-images] Error:', error instanceof Error ? error.message : error);
    // Fallback: redirect to original Discogs image URL so we never return a broken image
    if (fallbackUrl) {
      res.set('Cache-Control', 'no-cache');
      res.redirect(302, fallbackUrl);
    } else {
      res.status(500).json({ error: 'Failed to proxy Discogs image' });
    }
  }
});

export default router;
