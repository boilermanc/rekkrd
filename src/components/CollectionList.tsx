
import React, { useState, useEffect, useMemo } from 'react';
import { Album } from '../types';
import { proxyImageUrl } from '../services/imageProxy';
import { CONDITION_ORDER } from '../../constants/conditionGrades';
import { FORMAT_COLORS, FORMAT_DEFAULT, type MediaFormat } from '../../constants/formatTypes';
import Pagination from './Pagination';

const PAGE_SIZE = 40;

interface CollectionListProps {
  albums: Album[];
  onSelect: (album: Album) => void;
  onDelete: (id: string) => void;
  onToggleFavorite?: (albumId: string) => void;
  onAddToWantlist?: (albumId: string) => void;
  favoritesOnly?: boolean;
  onToggleFavoritesFilter?: () => void;
  searchQuery: string;
  importedAlbumIds?: Set<string>;
  genreFilter?: string;
  conditionFilter?: string;
  activeTags?: string[];
}

type SortField = 'favorite' | 'title' | 'artist' | 'year' | 'genre' | 'format' | 'value' | 'added' | 'condition' | 'plays';
type SortDir = 'asc' | 'desc';

interface SortArrowProps {
  field: SortField;
  currentSortField: SortField;
  sortDir: SortDir;
}

const SortArrow: React.FC<SortArrowProps> = ({ field, currentSortField, sortDir }) => {
  if (currentSortField !== field) return null;
  return (
    <svg className="w-3 h-3 inline-block ml-1 text-[#f0a882]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {sortDir === 'asc'
        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      }
    </svg>
  );
};

const CollectionList: React.FC<CollectionListProps> = ({ albums, onSelect, onDelete, onToggleFavorite, onAddToWantlist, favoritesOnly, onToggleFavoritesFilter, searchQuery, importedAlbumIds, genreFilter, conditionFilter, activeTags }) => {
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
      if (genreFilter && a.genre !== genreFilter) return false;
      if (conditionFilter && a.condition !== conditionFilter) return false;
      if (activeTags && activeTags.length > 0 && !activeTags.every(t => a.tags?.includes(t))) return false;
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
        case 'format':
          cmp = (a.format || 'Vinyl').localeCompare(b.format || 'Vinyl');
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
  }, [albums, searchQuery, sortField, sortDir, favoritesOnly, genreFilter, conditionFilter, activeTags]);

  // Reset page when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDir, favoritesOnly, genreFilter, conditionFilter, activeTags]);

  const totalPages = Math.ceil(sortedAlbums.length / PAGE_SIZE);
  const paginatedAlbums = sortedAlbums.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const colHeaderClass = (field: SortField) =>
    `cursor-pointer select-none transition-colors whitespace-nowrap ${
      sortField === field ? 'text-[#f0a882]' : 'text-th-text3 hover:text-th-text2'
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
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest transition-all border ${favoritesOnly ? 'bg-[#dd6e42]/20 border-[#dd6e42]/40 text-[#dd6e42]' : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text3 hover:text-th-text2'}`}
            title={favoritesOnly ? 'Show all records' : 'Show favorites only'}
          >
            <svg className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-current' : ''}`} viewBox="0 0 24 24" fill={favoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            Favorites
          </button>
        )}
        <span className="text-th-text3/70 text-xs font-label tracking-widest uppercase">
          {sortedAlbums.length} {sortedAlbums.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Table */}
      <div className="glass-morphism rounded-2xl border border-th-surface/[0.10] overflow-hidden" role="table" aria-label="Album collection">
        {/* Header row */}
        <div className="grid grid-cols-[48px_28px_1fr_1fr] md:grid-cols-[56px_32px_1.5fr_1fr_80px_120px_72px_90px_100px_96px] gap-x-3 px-4 py-3 border-b border-th-surface/[0.10] text-[9px] font-label tracking-widest uppercase" role="row">
          <div role="columnheader"></div>
          <div className={colHeaderClass('favorite')} onClick={() => handleSort('favorite')} onKeyDown={(e) => handleHeaderKeyDown(e, 'favorite')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('favorite')} title="Sort by favorites">
            <svg className={`w-3.5 h-3.5 ${sortField === 'favorite' ? 'text-[#dd6e42]' : ''}`} viewBox="0 0 24 24" fill={sortField === 'favorite' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
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
          <div className={`${colHeaderClass('year')} hidden md:flex`} onClick={() => handleSort('year')} onKeyDown={(e) => handleHeaderKeyDown(e, 'year')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('year')}>
            Year <SortArrow field="year" currentSortField={sortField} sortDir={sortDir} />
          </div>
          <div className={`${colHeaderClass('genre')} hidden md:block`} onClick={() => handleSort('genre')} onKeyDown={(e) => handleHeaderKeyDown(e, 'genre')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('genre')}>
            Genre <SortArrow field="genre" currentSortField={sortField} sortDir={sortDir} />
          </div>
          <div className={`${colHeaderClass('format')} hidden md:block`} onClick={() => handleSort('format')} onKeyDown={(e) => handleHeaderKeyDown(e, 'format')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('format')}>
            Format <SortArrow field="format" currentSortField={sortField} sortDir={sortDir} />
          </div>
          <div className={`${colHeaderClass('condition')} hidden md:block`} onClick={() => handleSort('condition')} onKeyDown={(e) => handleHeaderKeyDown(e, 'condition')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('condition')}>
            Cond. <SortArrow field="condition" currentSortField={sortField} sortDir={sortDir} />
          </div>
          <div className={`${colHeaderClass('value')} hidden md:flex`} onClick={() => handleSort('value')} onKeyDown={(e) => handleHeaderKeyDown(e, 'value')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('value')}>
            Value <SortArrow field="value" currentSortField={sortField} sortDir={sortDir} />
          </div>
          <div className={`${colHeaderClass('plays')} hidden md:block text-right`} onClick={() => handleSort('plays')} onKeyDown={(e) => handleHeaderKeyDown(e, 'plays')} tabIndex={0} role="columnheader" aria-sort={getAriaSort('plays')}>
            Plays <SortArrow field="plays" currentSortField={sortField} sortDir={sortDir} />
          </div>
        </div>

        {/* Album rows */}
        <div className="divide-y divide-th-surface/[0.06]" role="rowgroup">
          {sortedAlbums.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-12 h-12 text-th-text3/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-th-text3/70 text-sm">No albums match your search.</p>
            </div>
          ) : (
            paginatedAlbums.map((album, idx) => (
              <div
                key={album.id}
                onClick={() => onSelect(album)}
                className={`group grid grid-cols-[48px_28px_1fr_1fr] md:grid-cols-[56px_32px_1.5fr_1fr_80px_120px_72px_90px_100px_96px] gap-x-3 px-4 py-2 items-center cursor-pointer list-row-hover transition-colors${importedAlbumIds?.has(album.id) ? ' animate-import-highlight bg-[#6B8F71]/10' : ''}`}
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
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden bg-th-bg/40 flex-shrink-0 relative" role="cell">
                  <img
                    src={proxyImageUrl(album.cover_url) || `https://picsum.photos/seed/${album.id}/96/96`}
                    alt={album.title && album.artist ? `Album cover for ${album.title} by ${album.artist}` : album.title ? `Album cover for ${album.title}` : 'Album cover'}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/vinyl/96/96';
                    }}
                  />
                  {importedAlbumIds?.has(album.id) && (
                    <div className="absolute -top-1 -right-1 bg-[#6B8F71] text-white text-[7px] font-bold uppercase tracking-wider px-1 py-px rounded shadow z-10">
                      New
                    </div>
                  )}
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
                    <svg className={`w-4 h-4 transition-colors ${album.isFavorite ? 'text-rose-500 fill-current' : 'text-th-text3/50 hover:text-emerald-400'}`} viewBox="0 0 24 24" fill={album.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                </div>

                {/* Title */}
                <div className="min-w-0" role="cell">
                  <p className="text-th-text text-sm font-medium truncate">{album.title}</p>
                </div>

                {/* Artist */}
                <p className="text-[#dd6e42] text-sm truncate" role="cell">{album.artist}</p>

                {/* Year (hidden on mobile) */}
                <p className="text-th-text3 text-xs hidden md:block" role="cell">{album.year || '—'}</p>

                {/* Genre (hidden on mobile) */}
                <p className="text-th-text3 text-xs truncate hidden md:block" role="cell">{album.genre || '—'}</p>

                {/* Format (hidden on mobile) */}
                <div className="hidden md:flex items-center" role="cell">
                  <span
                    className="inline-flex items-center text-[8px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5"
                    style={{
                      backgroundColor: `${FORMAT_COLORS[(album.format || FORMAT_DEFAULT) as MediaFormat] || FORMAT_COLORS[FORMAT_DEFAULT]}20`,
                      color: FORMAT_COLORS[(album.format || FORMAT_DEFAULT) as MediaFormat] || FORMAT_COLORS[FORMAT_DEFAULT],
                    }}
                  >
                    {album.format || FORMAT_DEFAULT}
                  </span>
                </div>

                {/* Condition (hidden on mobile) */}
                <p className="text-th-text3 text-xs truncate hidden md:block" role="cell">{album.condition || '—'}</p>

                {/* Value (hidden on mobile) */}
                <p className={`text-xs font-medium hidden md:block ${album.price_median ? 'text-[#f0a882]' : 'text-th-text3/50'}`} role="cell">
                  {album.price_median ? `$${Math.round(album.price_median)}` : '—'}
                </p>

                {/* Plays + wantlist + delete (desktop only) */}
                <div className="hidden md:flex items-center justify-end gap-2" role="cell">
                  <span className="text-th-text3 text-xs">{album.play_count || 0}</span>
                  {onAddToWantlist && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToWantlist(album.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-th-text2 hover:text-[#dd6e42] transition-all p-1 rounded-md"
                      title="Add to wantlist"
                      aria-label={`Add ${album.title} to wantlist`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  )}
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
