export function getSpotifySearchUrl(artist: string, album: string): string {
  const query = encodeURIComponent(`artist:${artist} album:${album}`);
  return `https://open.spotify.com/search/${query}`;
}
