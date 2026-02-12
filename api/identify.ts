import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Data, mimeType } = req.body;
    if (!base64Data || typeof base64Data !== 'string') {
      return res.status(400).json({ error: 'Missing base64Data' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: 'Identify this vinyl record album. Return only the Artist and Album Title as JSON with keys "artist" and "title". If you cannot identify it, return null.' }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            artist: { type: Type.STRING },
            title: { type: Type.STRING }
          },
          required: ['artist', 'title']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    if (typeof data.artist !== 'string' || typeof data.title !== 'string') {
      return res.status(200).json(null);
    }
    return res.status(200).json({ artist: data.artist, title: data.title });
  } catch (error) {
    console.error('Gemini Identification Error:', error);
    return res.status(500).json({ error: 'Failed to identify album' });
  }
}
