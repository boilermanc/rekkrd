
import { GoogleGenAI, Type } from "@google/genai";
import { Album, Playlist, PlaylistItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async identifyAlbum(base64DataUrl: string): Promise<{ artist: string; title: string } | null> {
    try {
      const [header, base64Data] = base64DataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

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
      return data.artist && data.title ? data : null;
    } catch (error) {
      console.error('Gemini Identification Error:', error);
      return null;
    }
  },

  async fetchAlbumMetadata(artist: string, title: string): Promise<Partial<Album>> {
    try {
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

      // Fallback if critical data is missing
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
        data = { ...data, ...fallbackData };
      }

      return data;
    } catch (error) {
      console.error('Gemini Metadata Fetch Error:', error);
      return { artist, title, year: 'Unknown', genre: 'Unknown' };
    }
  },

  async generatePlaylist(albums: Album[], mood: string, type: 'album' | 'side' | 'song'): Promise<Playlist> {
    const simplifiedCollection = albums.map(a => ({
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
    const itemsWithArt: PlaylistItem[] = (result.items || []).map((item: any) => {
      const album = albums.find(a => a.id === item.albumId);
      return { ...item, cover_url: album?.cover_url || '', type };
    });

    return { id: crypto.randomUUID(), name: result.playlistName || 'Crate Mix', mood, items: itemsWithArt };
  }
};
