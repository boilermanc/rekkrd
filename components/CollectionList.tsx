
import React, { useState, useMemo } from 'react';
import { Album } from '../types';
import { proxyImageUrl } from '../services/imageProxy';

interface CollectionListProps {
  albums: Album[];
  onSelect: (album: Album) => void;
  onDelete: (id: string) => void;
}

type SortField = 'title' | 'artist' | 'year' | 'genre' | 'value' | 'added' | 'condition' | 'plays';
type SortDir = 'asc' | 'desc';

const CONDITION_ORDER: Record<string, number> = {
  'Mint': 0,
  'Near Mint': 1,
  'Very Good Plus': 2,
  'Very Good': 3,
  'Good Plus': 4,
  'Good': 5,
  'Fair': 6,
  'Poor': 7,
};

const CollectionList: React.FC<CollectionListProps> = ({ albums, onSelect, onDelete }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'value' || field === 'added' || field === 'plays' ? 'desc' : 'asc');
    }
  };

  const sortedAlbums = useMemo(() => {
    let result = albums.filter(a => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.artist.toLowerCase().includes(q) ||
        (a.genre && a.genre.toLowerCase().includes(q))
      );
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'artist':
          cmp = a.artist.localeCompare(b.artist);
          break;
        case 'year':
          cmp = (parseInt(a.year || '0')) - (parseInt(b.year || '0'));
          break;
        case 'genre':
          cmp = (a.genre || 'zzz').localeCompare(b.genre || 'zzz');
          break;
        case 'value':
          cmp = (a.price_median || 0) - (b.price_median || 0);
          break;
        case 'added':
          cmp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
        case 'condition':
          cmp = (CONDITION_ORDER[a.condition || ''] ?? 99) - (CONDITION_ORDER[b.condition || ''] ?? 99);
          break;
        case 'plays':
          cmp = (a.play_count || 0) - (b.play_count || 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [albums, searchQuery, sortField, sortDir]);

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <svg className="w-3 h-3 inline-block ml-1 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {sortDir === 'asc'
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        }
      </svg>
    );
  };

  const colHeaderClass = (field: SortField) =>
    `cursor-pointer select-none transition-colors whitespace-nowrap ${
      sortField === field ? 'text-emerald-400' : 'text-white/40 hover:text-white/70'
    }`;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 mt-6">
      {/* Search & count bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative max-w-md">
          <input
            type="text"
            placeholder="Search collection..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-white/20"
          />
          <svg className="absolute left-3.5 top-3 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="text-white/30 text-xs font-syncopate tracking-widest uppercase">
          {sortedAlbums.length} {sortedAlbums.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Table */}
      <div className="glass-morphism rounded-2xl border border-white/10 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[48px_1fr_1fr_72px_100px_80px] md:grid-cols-[56px_1.5fr_1fr_80px_120px_90px_100px_72px] gap-x-3 px-4 py-3 border-b border-white/10 text-[9px] font-syncopate tracking-widest uppercase">
          <div></div>
          <div className={colHeaderClass('title')} onClick={() => handleSort('title')}>
            Title <SortArrow field="title" />
          </div>
          <div className={colHeaderClass('artist')} onClick={() => handleSort('artist')}>
            Artist <SortArrow field="artist" />
          </div>
          <div className={colHeaderClass('year')} onClick={() => handleSort('year')}>
            Year <SortArrow field="year" />
          </div>
          <div className={`${colHeaderClass('genre')} hidden md:block`} onClick={() => handleSort('genre')}>
            Genre <SortArrow field="genre" />
          </div>
          <div className={`${colHeaderClass('condition')} hidden md:block`} onClick={() => handleSort('condition')}>
            Cond. <SortArrow field="condition" />
          </div>
          <div className={colHeaderClass('value')} onClick={() => handleSort('value')}>
            Value <SortArrow field="value" />
          </div>
          <div className={`${colHeaderClass('plays')} hidden md:block text-right`} onClick={() => handleSort('plays')}>
            Plays <SortArrow field="plays" />
          </div>
        </div>

        {/* Album rows */}
        <div className="divide-y divide-white/5">
          {sortedAlbums.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-12 h-12 text-white/10 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-white/30 text-sm">No albums match your search.</p>
            </div>
          ) : (
            sortedAlbums.map((album, idx) => (
              <div
                key={album.id}
                onClick={() => onSelect(album)}
                className="group grid grid-cols-[48px_1fr_1fr_72px_100px_80px] md:grid-cols-[56px_1.5fr_1fr_80px_120px_90px_100px_72px] gap-x-3 px-4 py-2 items-center cursor-pointer list-row-hover transition-colors"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(album);
                  }
                }}
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                  <img
                    src={proxyImageUrl(album.cover_url) || `https://picsum.photos/seed/${album.id}/96/96`}
                    alt={album.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/vinyl/96/96';
                    }}
                  />
                </div>

                {/* Title */}
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{album.title}</p>
                  {album.isFavorite && (
                    <svg className="w-3 h-3 text-emerald-500 fill-current inline-block mt-0.5" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  )}
                </div>

                {/* Artist */}
                <p className="text-emerald-500 text-sm truncate">{album.artist}</p>

                {/* Year */}
                <p className="text-white/40 text-xs">{album.year || '—'}</p>

                {/* Genre (hidden on mobile) */}
                <p className="text-white/40 text-xs truncate hidden md:block">{album.genre || '—'}</p>

                {/* Condition (hidden on mobile) */}
                <p className="text-white/40 text-xs truncate hidden md:block">{album.condition || '—'}</p>

                {/* Value */}
                <p className={`text-xs font-medium ${album.price_median ? 'text-emerald-400' : 'text-white/20'}`}>
                  {album.price_median ? `$${Math.round(album.price_median)}` : '—'}
                </p>

                {/* Plays (hidden on mobile) */}
                <div className="hidden md:flex items-center justify-end gap-2">
                  <span className="text-white/40 text-xs">{album.play_count || 0}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (album.id && confirm('Delete this masterpiece?')) {
                        onDelete(album.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-all p-1 rounded-md"
                    title="Delete album"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionList;
