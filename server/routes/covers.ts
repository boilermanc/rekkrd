import { Router } from 'express';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { validateStringLength } from '../middleware/validate.js';
import { USER_AGENT } from '../lib/constants.js';
import { searchItunes } from '../lib/itunes.js';
import { requirePlan } from '../lib/subscription.js';

interface CoverResult {
  url: string;
  source: string;
  label?: string;
}

interface MusicBrainzRelease {
  id?: string;
  title?: string;
  media?: Array<{ format?: string }>;
}

async function searchMusicBrainz(artist: string, title: string): Promise<CoverResult[]> {
  try {
    const query = encodeURIComponent(`artist:${artist} release:${title}`);
    const resp = await fetch(
      `https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json&limit=5`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!resp.ok) return [];
    const json = await resp.json();
    const releases = json.releases || [];
    const EXCLUDED_FORMATS = ['8-track cartridge'];
    const candidates = releases
      .filter((r: MusicBrainzRelease) => {
        if (!r.id) return false;
        if (r.media?.some((m: { format?: string }) =>
          m.format && EXCLUDED_FORMATS.includes(m.format.toLowerCase())
        )) return false;
        return true;
      })
      .map((r: MusicBrainzRelease) => ({
        url: `https://coverartarchive.org/release/${r.id}/front-500`,
        source: 'MusicBrainz' as const,
        label: r.title || undefined,
      }));

    // Validate URLs exist (Cover Art Archive returns 404 for releases without art)
    const checks = await Promise.allSettled(
      candidates.map((c: CoverResult) => fetch(c.url, { method: 'HEAD', redirect: 'follow' }))
    );
    return candidates.filter((_: CoverResult, i: number) => {
      const result = checks[i];
      return result.status === 'fulfilled' && result.value.ok;
    });
  } catch {
    return [];
  }
}

const router = Router();

router.post(
  '/api/covers',
  requireAuthWithUser,
  async (req, res) => {
    const { userId } = (req as typeof req & { auth: AuthResult }).auth;

    // Curator+ only
    const sub = await requirePlan(userId, 'curator', res);
    if (!sub) return;

    try {
      const { artist, title } = req.body;
      if (!artist || !title || typeof artist !== 'string' || typeof title !== 'string') {
        res.status(400).json({ error: 'Missing artist or title' });
        return;
      }

      const artistErr = validateStringLength(artist, 500, 'artist');
      if (artistErr) { res.status(400).json({ error: artistErr }); return; }
      const titleErr = validateStringLength(title, 500, 'title');
      if (titleErr) { res.status(400).json({ error: titleErr }); return; }

      const [itunesResults, mbResults] = await Promise.all([
        searchItunes(artist, title),
        searchMusicBrainz(artist, title),
      ]);

      // Interleave and deduplicate by URL
      const seen = new Set<string>();
      const covers: CoverResult[] = [];
      const all = [...itunesResults, ...mbResults];
      for (const cover of all) {
        if (!seen.has(cover.url)) {
          seen.add(cover.url);
          covers.push(cover);
        }
        if (covers.length >= 10) break;
      }

      res.status(200).json({ covers });
    } catch (error) {
      console.error('Cover Search Error:', error);
      res.status(500).json({ error: 'Failed to search covers' });
    }
  }
);

export default router;
