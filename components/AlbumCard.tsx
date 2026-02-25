
import React from 'react';
import { Bookmark } from 'lucide-react';
import { Album } from '../types';
import { proxyImageUrl } from '../services/imageProxy';
import { getSpotifySearchUrl } from '../utils/spotify';
import SpotifyIcon from './SpotifyIcon';
import DiscogsIcon from './DiscogsIcon';
import FormatBadge from './FormatBadge';

interface AlbumCardProps {
  album: Album;
  onDelete: (id: string) => void;
  onSelect: (album: Album) => void;
  onAddToWantlist?: (album: Album) => void;
  isImported?: boolean;
  spinningAlbumId?: string | null;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ album, onDelete, onSelect, onAddToWantlist, isImported, spinningAlbumId }) => {
  const isSpinning = album.id === spinningAlbumId;
  return (
    <div
      onClick={() => onSelect(album)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(album);
        }
      }}
      className={`group relative glass-morphism rounded-xl overflow-hidden hover:neon-border transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-th-surface/[0.06]${isImported ? ' ring-2 ring-[#6B8F71]/40 animate-import-highlight' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${album.title} by ${album.artist}`}
    >
      <div className="aspect-square overflow-hidden bg-th-bg/40 relative">
        <img
          src={proxyImageUrl(album.cover_url) || `https://picsum.photos/seed/${album.id}/400/400`}
          alt={album.title && album.artist ? `Album cover for ${album.title} by ${album.artist}` : album.title ? `Album cover for ${album.title}` : 'Album cover'}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/vinyl/400/400';
          }}
        />

        {/* Price Tag Badge */}
        {album.price_median && (
          <div className="absolute bottom-2 left-2 bg-[#dd6e42]/90 backdrop-blur-sm text-th-text px-2 py-0.5 rounded text-[10px] font-bold shadow-lg z-10 border border-[#f0a882]/50">
            ${Math.round(album.price_median)}
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-[#c45a30]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
           <div className="bg-th-surface/[0.08] backdrop-blur-md border border-th-surface/[0.15] p-2 rounded-full transform scale-50 group-hover:scale-100 transition-transform duration-500">
              <svg className="w-6 h-6 text-th-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
           </div>
        </div>

        {album.isFavorite && (
          <div className="absolute top-2 right-2 p-1.5 bg-[#dd6e42] rounded-full shadow-lg border border-th-surface/[0.15] z-10">
            <svg className="w-3 h-3 text-th-text fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        )}

        {isSpinning && !isImported && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-[#c45a30] text-th-text px-2 py-1 rounded-full shadow-lg">
            <span className="w-2 h-2 rounded-full bg-th-text animate-pulse" />
            <span className="font-label text-[8px] tracking-widest uppercase font-bold">Spinning</span>
          </div>
        )}

        {isImported && (
          <div className="absolute top-2 left-2 bg-[#6B8F71] text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow-lg z-10">
            New
          </div>
        )}

        {album.format && album.format !== 'Vinyl' && (
          <div className={`absolute ${isImported ? 'top-9' : 'top-2'} left-2 z-10 shadow-lg`}>
            <FormatBadge format={album.format} />
          </div>
        )}
      </div>

      <div className="p-4 relative">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-th-text truncate w-full" title={album.title}>{album.title}</h3>
          <div className="flex items-center ml-2 gap-1 shrink-0">
            <a
              href={getSpotifySearchUrl(album.artist, album.title)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center text-[#1DB954] hover:text-[#1ed760] transition-all p-1 rounded-md"
              aria-label="Search on Spotify"
              title="Search on Spotify"
            >
              <SpotifyIcon size={16} />
            </a>
            {album.discogs_url ? (
              <a
                href={album.discogs_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center text-th-text2 hover:text-[#ff8a00] transition-all p-1 rounded-md"
                aria-label="View on Discogs"
                title="View on Discogs"
              >
                <DiscogsIcon size={16} />
              </a>
            ) : (
              <a
                href={`https://www.discogs.com/search/?q=${encodeURIComponent(`${album.artist} ${album.title}`)}&type=release`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center text-th-text2 hover:text-[#ff8a00] transition-all p-1 rounded-md"
                aria-label="Search on Discogs"
                title="Search on Discogs"
              >
                <DiscogsIcon size={16} />
              </a>
            )}
            {onAddToWantlist && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToWantlist(album);
                }}
                className="opacity-0 group-hover:opacity-100 text-th-text2 hover:text-[#dd6e42] transition-all p-1 rounded-md"
                title="Add to wantlist"
                aria-label={`Add ${album.title} to wantlist`}
              >
                <Bookmark className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(album.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-all p-1 rounded-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-[#dd6e42] text-sm font-medium truncate">{album.artist}</p>
        <div className="mt-2 flex items-center justify-between text-[10px] text-th-text3 uppercase tracking-widest">
          <span>{album.year || 'No Date'}</span>
          <span>{album.genre || '—'}</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AlbumCard);
