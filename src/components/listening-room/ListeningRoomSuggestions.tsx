import React, { useMemo, useState, useCallback } from 'react';
import { Plus, RefreshCw, Sparkles } from 'lucide-react';
import { Album } from '../../types';
import { proxyImageUrl } from '../../services/imageProxy';

interface ListeningRoomSuggestionsProps {
  sessionAlbums: Album[];
  allAlbums: Album[];
  sessionAlbumIds: Set<string>;
  onSelectAlbum: (album: Album) => void;
  onQuickAdd: (album: Album) => void;
  ambientMode?: boolean;
}

function getDecade(year: string | undefined): string | null {
  if (!year) return null;
  const y = parseInt(year, 10);
  if (isNaN(y) || y < 1900) return null;
  const d = Math.floor(y / 10) * 10;
  return `${d}s`;
}

const ListeningRoomSuggestions: React.FC<ListeningRoomSuggestionsProps> = ({
  sessionAlbums,
  allAlbums,
  sessionAlbumIds,
  onSelectAlbum,
  onQuickAdd,
  ambientMode,
}) => {
  const [seed, setSeed] = useState(0);

  // Derive session attributes for scoring
  const sessionAttrs = useMemo(() => {
    const genres = new Set<string>();
    const decades = new Set<string>();
    const artists = new Set<string>();
    const formats = new Set<string>();

    for (const a of sessionAlbums) {
      if (a.genre) genres.add(a.genre);
      const d = getDecade(a.year);
      if (d) decades.add(d);
      if (a.artist) artists.add(a.artist);
      if (a.format) formats.add(a.format);
    }

    return { genres, decades, artists, formats };
  }, [sessionAlbums]);

  // Score and rank candidates
  const suggestions = useMemo(() => {
    const candidates = allAlbums.filter((a) => !sessionAlbumIds.has(a.id));

    const scored: { album: Album; score: number }[] = [];
    for (const album of candidates) {
      let score = 0;
      if (album.genre && sessionAttrs.genres.has(album.genre)) score += 3;
      const d = getDecade(album.year);
      if (d && sessionAttrs.decades.has(d)) score += 2;
      if (album.artist && sessionAttrs.artists.has(album.artist)) score += 5;
      if (album.format && sessionAttrs.formats.has(album.format)) score += 1;

      if (score > 0) scored.push({ album, score });
    }

    // Sort by score descending, randomize ties using seed
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Deterministic-ish shuffle among ties based on seed + id
      const hashA = (a.album.id.charCodeAt(0) + seed) % 1000;
      const hashB = (b.album.id.charCodeAt(0) + seed) % 1000;
      return hashA - hashB;
    });

    // Cap at 1 per artist for variety
    const seen = new Set<string>();
    const result: Album[] = [];
    for (const { album } of scored) {
      if (result.length >= 4) break;
      if (album.artist && seen.has(album.artist)) continue;
      if (album.artist) seen.add(album.artist);
      result.push(album);
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAlbums, sessionAlbumIds, sessionAttrs, seed]);

  const handleRefresh = useCallback(() => {
    setSeed((prev) => prev + 1);
  }, []);

  if (sessionAlbums.length === 0 || suggestions.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Suggested albums"
      className={`px-4 py-3 border-t transition-colors duration-500 ${
        ambientMode ? 'border-[#c4b5a0]/10' : 'border-th-surface/[0.10]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 transition-colors duration-500 ${
          ambientMode ? 'text-[#dd6e42]' : 'text-[#dd6e42]'
        }`} />
        <h3 className={`font-display text-sm leading-tight flex-1 transition-colors duration-500 ${
          ambientMode ? 'text-[#c4b5a0]' : 'text-th-text'
        }`}>
          You might also spin...
        </h3>
        <button
          type="button"
          onClick={handleRefresh}
          aria-label="Refresh suggestions"
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
            ambientMode
              ? 'text-[#c4b5a0]/40 hover:text-[#c4b5a0]/70 hover:bg-white/[0.06]'
              : 'text-th-text3 hover:text-th-text2 hover:bg-th-surface/[0.08]'
          }`}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Horizontal scroll row */}
      <div
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {suggestions.map((album) => (
          <div
            key={album.id}
            className="flex-shrink-0 w-16 flex flex-col items-center"
          >
            {/* Thumbnail + quick-add */}
            <div className="relative">
              <button
                type="button"
                onClick={() => onSelectAlbum(album)}
                aria-label={`${album.artist} - ${album.title}`}
                className="w-16 h-16 rounded-lg overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dd6e42] focus-visible:ring-offset-1"
              >
                {album.cover_url ? (
                  <img
                    src={proxyImageUrl(album.cover_url)}
                    alt={`Album cover for ${album.title} by ${album.artist}`}
                    className={`w-full h-full object-cover transition-shadow duration-500 ${
                      ambientMode ? 'shadow-md shadow-[#dd6e42]/10' : ''
                    }`}
                    loading="lazy"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${
                    ambientMode ? 'bg-[#1a1a1a]' : 'bg-th-bg2/60'
                  }`}>
                    <svg className="w-6 h-6 text-th-text3/25" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="12" cy="12" r="1" />
                    </svg>
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => onQuickAdd(album)}
                aria-label={`Add ${album.title} to session`}
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#dd6e42] flex items-center justify-center shadow-md hover:bg-[#c45a30] active:scale-90 transition-all"
              >
                <Plus className="w-3 h-3 text-white" strokeWidth={2.5} />
              </button>
            </div>

            {/* Artist name */}
            <p className={`mt-1 text-[9px] font-label leading-tight truncate w-full text-center transition-colors duration-500 ${
              ambientMode ? 'text-[#c4b5a0]/60' : 'text-th-text2'
            }`}>
              {album.artist}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListeningRoomSuggestions;
