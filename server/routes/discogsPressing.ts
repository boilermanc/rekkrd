import { Router } from 'express';
import { requireAuthWithUser } from '../middleware/auth.js';
import { discogsRateLimiter } from '../middleware/discogsRateLimit.js';
import { searchDiscogs, getRelease } from '../services/discogsService.js';
import { matrixScore, extractMatrixStrings } from '../../src/utils/matrixMatch.js';

const router = Router();

interface PressingResult {
  id: number;
  title: string;
  year: number | null;
  country: string | null;
  label: string | null;
  catno: string | null;
  format: string | null;
  thumb: string | null;
  discogsUrl: string;
  score: number;
  matchedText: string | null;
}

router.post(
  '/api/discogs-pressing',
  requireAuthWithUser,
  discogsRateLimiter,
  async (req, res) => {
    try {
      const { artist, title, matrix } = req.body as {
        artist: unknown;
        title: unknown;
        matrix: unknown;
      };

      if (
        typeof artist !== 'string' || !artist.trim() ||
        typeof title !== 'string' || !title.trim() ||
        typeof matrix !== 'string' || !matrix.trim()
      ) {
        res.status(400).json({ error: 'artist, title, and matrix are required strings' });
        return;
      }

      const searchResult = await searchDiscogs({
        artist: artist.trim(),
        title: title.trim(),
        format: 'LP',
        type: 'release',
        per_page: '10',
      });

      const results = searchResult.results ?? [];
      if (results.length === 0) {
        res.status(200).json([]);
        return;
      }

      const releases = await Promise.all(
        results.map(r => getRelease(r.id).catch(() => null)),
      );

      const scored: PressingResult[] = [];

      for (const release of releases) {
        if (!release) continue;

        const candidates = extractMatrixStrings(release as unknown as Record<string, unknown>);
        let bestScore = 0;
        let bestText: string | null = null;

        for (const c of candidates) {
          const s = matrixScore(matrix.trim(), c);
          if (s > bestScore) {
            bestScore = s;
            bestText = c;
          }
        }

        const label0 = release.labels?.[0];
        const fmt0 = release.formats?.[0];
        const formatStr = fmt0
          ? [fmt0.name, ...(fmt0.descriptions ?? [])].join(', ')
          : null;

        scored.push({
          id: release.id,
          title: release.title,
          year: release.year ?? null,
          country: release.country ?? null,
          label: label0?.name ?? null,
          catno: label0?.catno ?? null,
          format: formatStr,
          thumb: release.images?.[0]?.uri150 ?? null,
          discogsUrl: `https://www.discogs.com/release/${release.id}`,
          score: bestScore,
          matchedText: bestText,
        });
      }

      scored.sort((a, b) => b.score - a.score);
      res.status(200).json(scored.slice(0, 3));
    } catch (error) {
      console.error('[discogs-pressing] Lookup failed:', error);
      res.status(500).json({ error: 'Lookup failed' });
    }
  },
);

export default router;
