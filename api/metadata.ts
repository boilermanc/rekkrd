import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { artist, title } = req.body;
    if (!artist || !title || typeof artist !== 'string' || typeof title !== 'string') {
      return res.status(400).json({ error: 'Missing artist or title' });
    }

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
    return res.status(200).json({ artist: req.body.artist, title: req.body.title, year: 'Unknown', genre: 'Unknown' });
  }
}
