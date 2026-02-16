
import React, { useState, useEffect, useMemo } from 'react';
import { Album } from '../types';
import { proxyImageUrl } from '../services/imageProxy';
import { CONDITION_ORDER } from '../constants/conditionGrades';
import Pagination from './Pagination';

const PAGE_SIZE = 40;

interface CollectionListProps {
  albums: Album[];
  onSelect: (album: Album) => void;
  onDelete: (id: string) => void;
  onToggleFavorite?: (albumId: string) => void;
  favoritesOnly?: boolean;
  onToggleFavoritesFilter?: () => void;
  searchQuery: string;
}

type SortField = 'favorite' | 'title' | 'artist' | 'year' | 'genre' | 'value' | 'added' | 'condition' | 'plays';
type SortDir = 'asc' | 'desc';

interface SortArrowProps {
  field: SortField;
  currentSortField: SortField;
  sortDir: SortDir;
}

const SortArrow: React.FC<SortArrowProps> = ({ field, currentSortField, sortDir }) => {
  if (currentSortField !== field) return null;
  return (
    <svg className="w-3 h-3 inline-block ml-1 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {sortDir === 'asc'
        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      }
    </svg>
  );
};

const CollectionList: React.FC<CollectionListProps> = ({ albums, onSelect, onDelete, onToggleFavorite, favoritesOnly, onToggleFavoritesFilter, searchQuery }) => {
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'value' || field === 'added' || field === 'plays' || field === 'favorite' ? 'desc' : 'asc');
    }
  };

  const sortedAlbums = useMemo(() => {
    let result = albums.filter(a => {
      const matchesFavorite = !favoritesOnly || a.isFavorite;
      if (!matchesFavorite) return false;
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
        case 'favorite':
          cmp = (a.isFavorite ? 1 : 0) - (b.isFavorite ? 1 : 0);
          break;
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
  }, [albums, searchQuery, sortField, sortDir, favoritesOnly]);

  // Reset page when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDir, favoritesOnly]);

  const totalPages = Math.ceil(sortedAlbums.length / PAGE_SIZE);
  const paginatedAlbums = sortedAlbums.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const colHeaderClass = (field: SortField) =>
    `cursor-pointer select-none transition-colors whitespace-nowrap ${
      sortField === field ? 'text-emerald-400' : 'text-white/40 hover:text-white/70'
    }`;

  const getAriaSort = (field: SortField): 'ascending' | 'descending' | 'none' =>
    sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

  const handleHeaderKeyDown = (e: React.KeyboardEvent, field: SortField) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(field);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 mt-6">
      {/* Filters & count bar */}
      <div className="flex items-center gap-4 mb-6">
        {onToggleFavoritesFilter && (
          <button
            onClick={onToggleFavoritesFilter}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest transition-all border ${favoritesOnly ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'}`}
            title={favoritesOnly ? 'Show all records' : 'Show favorites only'}
          >
            <svg className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-current' : ''}`} viewBox="0 0 24 24" fill={favoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            Favorites
          </button>
        )}
        <span className="text-white/30 text-xs font-syncopate tracking-widest uppercase">
          {sortedAlbums.length} {sortedAlbums.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Table */}
      <div className="glass-morphism rounded-2xl border border-white/10 overflow-hidden" role="table" aria-label="Album collection">
        {/* Header row */}
        <div className="grid grid-cols-[48px_28px_1fr_1fr_72px_100px_80px] md:grid-cols-[56px_32px_1.5fr_1fr_80px_120px_90px_100px_72px] gap-x-3 px-4 py-3 border-b border-white/10 text-[9px] font-syncopate tracking-widest uppercase" role="row">
          <div role="columnheader"></div>
          <div className={colHeaderClass('favorite')} onClick={() => handleSort('favorite')} onKeyDown={(e) => handleHeaderKeyDown(e, 'favorite')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('favorite')} title="Sort by favorites">
            <svg className={`w-3.5 h-3.5 ${sortField === 'favorite' ? 'text-rose-400' : ''}`} viewBox="0 0 24 24" fill={sortField === 'favorite' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <SortArrow field="favorite" currentSortField={sortField} sortDir={sortDir} />
          </div>
          <div className={colHeaderClass('title')} onClick={() => handleSort('title')} onKeyDown={(e) => handleHeaderKeyDown(e, 'title')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('title')}>
            Title <SortArrow field="title" currentSortField={sortField} sortDir={sortDir} />
          </div>
          <div className={colHeaderClass('artist')} onClick={() => handleSort('artist')} onKeyDown={(e) => handleHeaderKeyDown(e, 'artist')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('artist')}>
            Artist <SortArrow field="artist" currentSortField={sortField} sortDir={sortDir} />
          </div>
          <div className={colHeaderClass('year')} onClick={() => handleSort('year')} onKeyDown={(e) => handleHeaderKeyDown(e, 'year')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('year')}>
            Year <SortArrow field="year" currentSortField={sortField} sortDir={sortDir} />
          </div>
          <div className={`${colHeaderClass('genre')} hidden md:block`} onClick={() => handleSort('genre')} onKeyDown={(e) => handleHeaderKeyDown(e, 'genre')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('genre')}>
            Genre <SortArrow field="genre" currentSortField={sortField} sortDir={sortDir} />
          </div>
          <div className={`${colHeaderClass('condition')} hidden md:block`} onClick={() => handleSort('condition')} onKeyDown={(e) => handleHeaderKeyDown(e, 'condition')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('condition')}>
            Cond. <SortArrow field="condition" currentSortField={sortField} sortDir={sortDir} />
          </div>
          <div className={colHeaderClass('value')} onClick={() => handleSort('value')} onKeyDown={(e) => handleHeaderKeyDown(e, 'value')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('value')}>
            Value <SortArrow field="value" currentSortField={sortField} sortDir={sortDir} />
          </div>
          <div className={`${colHeaderClass('plays')} hidden md:block text-right`} onClick={() => handleSort('plays')} onKeyDown={(e) => handleHeaderKeyDown(e, 'plays')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('plays')}>
            Plays <SortArrow field="plays" currentSortField={sortField} sortDir={sortDir} />
          </div>
        </div>

        {/* Album rows */}
        <div className="divide-y divide-white/5" role="rowgroup">
          {sortedAlbums.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-12 h-12 text-white/10 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-white/30 text-sm">No albums match your search.</p>
            </div>
          ) : (
            paginatedAlbums.map((album, idx) => (
              <div
                key={album.id}
                onClick={() => onSelect(album)}
                className="group grid grid-cols-[48px_28px_1fr_1fr_72px_100px_80px] md:grid-cols-[56px_32px_1.5fr_1fr_80px_120px_90px_100px_72px] gap-x-3 px-4 py-2 items-center cursor-pointer list-row-hover transition-colors"
                role="row"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(album);
                  }
                }}
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden bg-black/40 flex-shrink-0" role="cell">
                  <img
                    src={proxyImageUrl(album.cover_url) || `https://picsum.photos/seed/${album.id}/96/96`}
                    alt={album.title && album.artist ? `Album cover for ${album.title} by ${album.artist}` : album.title ? `Album cover for ${album.title}` : 'Album cover'}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/vinyl/96/96';
                    }}
                  />
                </div>

                {/* Favorite heart */}
                <div role="cell">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleFavorite) onToggleFavorite(album.id);
                    }}
                    className={`flex items-center justify-center transition-all ${onToggleFavorite ? 'hover:scale-125' : ''}`}
                    title={album.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg className={`w-4 h-4 transition-colors ${album.isFavorite ? 'text-rose-500 fill-current' : 'text-white/15 hover:text-rose-400'}`} viewBox="0 0 24 24" fill={album.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                </div>

                {/* Title */}
                <div className="min-w-0" role="cell">
                  <p className="text-white text-sm font-medium truncate">{album.title}</p>
                </div>

                {/* Artist */}
                <p className="text-emerald-500 text-sm truncate" role="cell">{album.artist}</p>

                {/* Year */}
                <p className="text-white/40 text-xs" role="cell">{album.year || '—'}</p>

                {/* Genre (hidden on mobile) */}
                <p className="text-white/40 text-xs truncate hidden md:block" role="cell">{album.genre || '—'}</p>

                {/* Condition (hidden on mobile) */}
                <p className="text-white/40 text-xs truncate hidden md:block" role="cell">{album.condition || '—'}</p>

                {/* Value */}
                <p className={`text-xs font-medium ${album.price_median ? 'text-emerald-400' : 'text-white/20'}`} role="cell">
                  {album.price_median ? `$${Math.round(album.price_median)}` : '—'}
                </p>

                {/* Plays + delete (desktop only) */}
                <div className="hidden md:flex items-center justify-end gap-2" role="cell">
                  <span className="text-white/40 text-xs">{album.play_count || 0}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(album.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-all p-1 rounded-md"
                    title="Delete album"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Delete button (mobile only) */}
                <div className="flex md:hidden items-center justify-end" role="cell">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(album.id);
                    }}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white/20 active:text-red-400 transition-colors rounded-md"
                    title="Delete album"
                    aria-label={`Delete ${album.title}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedAlbums.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default CollectionList;
