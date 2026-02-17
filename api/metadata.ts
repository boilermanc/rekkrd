import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Type } from '@google/genai';
import { requireAuthWithUser } from './_auth';
import { cors } from './_cors';
import { USER_AGENT } from './_constants';
import { ai } from './_gemini';
import { searchItunes } from './_itunes';
import { rateLimit } from './_rateLimit';
import { validateStringLength } from './_validate';
import { sanitizePromptInput } from './_sanitize';

export const config = {
  maxDuration: 60,
};

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res, 'POST')) return;
  const auth = await requireAuthWithUser(req, res);
  if (!auth) return;
  if (rateLimit(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { artist: rawArtist, title: rawTitle } = req.body;
    if (!rawArtist || !rawTitle || typeof rawArtist !== 'string' || typeof rawTitle !== 'string') {
      return res.status(400).json({ error: 'Missing artist or title' });
    }

    const artistErr = validateStringLength(rawArtist, 500, 'artist');
    if (artistErr) return res.status(400).json({ error: artistErr });
    const titleErr = validateStringLength(rawTitle, 500, 'title');
    if (titleErr) return res.status(400).json({ error: titleErr });

    // Sanitize before prompt interpolation to prevent prompt injection
    const artist = sanitizePromptInput(rawArtist, 500);
    const title = sanitizePromptInput(rawTitle, 500);

    const prompt = `Search for the official high-quality album details for "${title}" by "${artist}".
      I need:
      1. Release year and primary genre.
      2. A short poetic description and 3-5 tags.
      3. Link to high-quality cover art.
      4. Discogs marketplace pricing: I need "price_low", "price_median", and "price_high" in USD based on recent sales.
      5. Official links to Discogs and MusicBrainz.
      6. A "sample_url" (YouTube or Preview).
      7. The tracklist.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            artist: { type: Type.STRING },
            title: { type: Type.STRING },
            year: { type: Type.STRING },
            genre: { type: Type.STRING },
            description: { type: Type.STRING },
            cover_url: { type: Type.STRING },
            price_low: { type: Type.NUMBER, description: 'Low sale price in USD' },
            price_median: { type: Type.NUMBER, description: 'Median sale price in USD' },
            price_high: { type: Type.NUMBER, description: 'High sale price in USD' },
            tracklist: { type: Type.ARRAY, items: { type: Type.STRING } },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            discogs_url: { type: Type.STRING },
            musicbrainz_url: { type: Type.STRING },
            sample_url: { type: Type.STRING }
          },
          required: ['artist', 'title']
        }
      }
    });

    let data = JSON.parse(response.text || '{}');
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

    if (!data.year || !data.genre || !data.price_median) {
      const fallbackPrompt = `Find missing info for "${title}" by "${artist}": year, genre, and median Discogs price (USD).`;
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: fallbackPrompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              year: { type: Type.STRING },
              genre: { type: Type.STRING },
              price_median: { type: Type.NUMBER }
            }
          }
        }
      });
      const fallbackData = JSON.parse(fallbackResponse.text || '{}');
      // Only fill in missing fields, don't overwrite existing data
      if (!data.year && fallbackData.year) data.year = fallbackData.year;
      if (!data.genre && fallbackData.genre) data.genre = fallbackData.genre;
      if (!data.price_median && fallbackData.price_median) data.price_median = fallbackData.price_median;
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Gemini Metadata Error:', error);
    return res.status(500).json({ error: 'Failed to fetch metadata' });
  }
}
