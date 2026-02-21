import { Router } from 'express';
import { requireAuthWithUser, type AuthResult } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { validateStringLength } from '../middleware/validate.js';
import { sanitizePromptInput } from '../middleware/sanitize.js';
import { ai } from '../lib/gemini.js';
import { USER_AGENT } from '../lib/constants.js';
import { searchItunes } from '../lib/itunes.js';

const router = Router();

async function findCoverUrl(artist: string, title: string, geminiUrl?: string): Promise<string> {
  // Try the URL Gemini returned
  if (geminiUrl) {
    try {
      const check = await fetch(geminiUrl, { method: 'HEAD', headers: { 'User-Agent': USER_AGENT } });
      if (check.ok) return geminiUrl;
    } catch { /* fall through */ }
  }

  // Fallback: iTunes Search API (free, no auth, reliable artwork)
  const results = await searchItunes(artist, title, 1);
  if (results.length > 0) return results[0].url;

  return '';
}

router.post(
  '/api/metadata',
  requireAuthWithUser,
  createRateLimit(10, 60),
  async (req, res) => {
    try {
      const { artist: rawArtist, title: rawTitle } = req.body;
      if (!rawArtist || !rawTitle || typeof rawArtist !== 'string' || typeof rawTitle !== 'string') {
        res.status(400).json({ error: 'Missing artist or title' });
        return;
      }

      const artistErr = validateStringLength(rawArtist, 500, 'artist');
      if (artistErr) { res.status(400).json({ error: artistErr }); return; }
      const titleErr = validateStringLength(rawTitle, 500, 'title');
      if (titleErr) { res.status(400).json({ error: titleErr }); return; }

      // Sanitize before prompt interpolation to prevent prompt injection
      const artist = sanitizePromptInput(rawArtist, 500);
      const title = sanitizePromptInput(rawTitle, 500);

      const prompt = `Search for the official high-quality album details for "${title}" by "${artist}".

I need the following information:
1. Release year and primary genre.
2. A short poetic description and 3-5 tags.
3. Link to high-quality cover art (cover_url).
4. Discogs marketplace pricing in USD based on recent sales — you MUST include all three: "price_low", "price_median", and "price_high" as numbers.
5. Official links: "discogs_url" and "musicbrainz_url".
6. A "sample_url" (YouTube or Preview link).
7. The tracklist as an array of strings.

Respond with ONLY valid JSON matching this exact structure (no markdown, no code fences):
{"artist":"...","title":"...","year":"...","genre":"...","description":"...","cover_url":"...","price_low":0,"price_median":0,"price_high":0,"discogs_url":"...","musicbrainz_url":"...","sample_url":"...","tracklist":["..."],"tags":["..."]}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      let rawText = (response.text || '{}').replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      let data = JSON.parse(rawText);
      // Ensure required string fields
      if (typeof data.artist !== 'string') data.artist = artist;
      if (typeof data.title !== 'string') data.title = title;
      // Coerce numeric fields
      if (data.price_low != null) data.price_low = Number(data.price_low) || 0;
      if (data.price_median != null) data.price_median = Number(data.price_median) || 0;
      if (data.price_high != null) data.price_high = Number(data.price_high) || 0;
      // Ensure tracklist and tags are arrays
      if (!Array.isArray(data.tracklist)) data.tracklist = [];
      if (!Array.isArray(data.tags)) data.tags = [];

      // Validate cover_url — Gemini often returns stale/invalid Discogs URLs
      data.cover_url = await findCoverUrl(artist, title, data.cover_url);

      const missingPricing = !data.price_low || !data.price_median || !data.price_high;
      if (!data.year || !data.genre || missingPricing) {
        const fallbackPrompt = `Find missing info for "${title}" by "${artist}": year, genre, and Discogs marketplace pricing in USD (price_low, price_median, price_high). Respond with valid JSON only — no markdown, no code fences.`;
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fallbackPrompt,
          config: {
            tools: [{ googleSearch: {} }],
          }
        });
        const fallbackRaw = (fallbackResponse.text || '{}').replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        const fallbackData = JSON.parse(fallbackRaw);
        // Only fill in missing fields, don't overwrite existing data
        if (!data.year && fallbackData.year) data.year = fallbackData.year;
        if (!data.genre && fallbackData.genre) data.genre = fallbackData.genre;
        if (!data.price_low && fallbackData.price_low) data.price_low = Number(fallbackData.price_low) || 0;
        if (!data.price_median && fallbackData.price_median) data.price_median = Number(fallbackData.price_median) || 0;
        if (!data.price_high && fallbackData.price_high) data.price_high = Number(fallbackData.price_high) || 0;
      }

      res.status(200).json(data);
    } catch (error) {
      console.error('Gemini Metadata Error:', error);
      res.status(500).json({ error: 'Failed to fetch metadata' });
    }
  }
);

export default router;
