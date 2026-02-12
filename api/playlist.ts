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
    const { albums, mood } = req.body;
    if (!Array.isArray(albums) || !mood || typeof mood !== 'string') {
      return res.status(400).json({ error: 'Missing albums array or mood' });
    }

    const MAX_ALBUMS = 200;
    const simplifiedCollection = albums.slice(0, MAX_ALBUMS).map((a: any) => ({
      id: a.id,
      artist: a.artist,
      title: a.title,
      genre: a.genre
    }));

    const prompt = `Create a "${mood}" playlist from this collection: ${JSON.stringify(simplifiedCollection)}.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            playlistName: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  albumId: { type: Type.STRING },
                  artist: { type: Type.STRING },
                  albumTitle: { type: Type.STRING },
                  itemTitle: { type: Type.STRING }
                },
                required: ['albumId', 'artist', 'albumTitle', 'itemTitle']
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return res.status(200).json({
      playlistName: typeof result.playlistName === 'string' ? result.playlistName : 'Crate Mix',
      items: Array.isArray(result.items) ? result.items : []
    });
  } catch (error) {
    console.error('Gemini Playlist Error:', error);
    return res.status(500).json({ error: 'Failed to generate playlist' });
  }
}
