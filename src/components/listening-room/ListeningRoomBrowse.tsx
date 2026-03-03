import React, { useState, useEffect, useMemo } from 'react';
import { Check, Disc3, Plus } from 'lucide-react';
import { Album } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import { proxyImageUrl } from '../../services/imageProxy';
import ListeningRoomFilters, { type BrowseFilters } from './ListeningRoomFilters';

interface ListeningRoomBrowseProps {
  onSelectAlbum?: (album: Album) => void;
  onQuickAdd?: (album: Album) => void;
  sessionAlbumIds?: Set<string>;
  nowSpinningId?: string | null;
  ambientMode?: boolean;
}

function getDecade(year: string | undefined): string | null {
  if (!year) return null;
  const y = parseInt(year, 10);
  if (isNaN(y) || y < 1900) return null;
  const d = Math.floor(y / 10) * 10;
  return `${d}s`;
}

const EMPTY_FILTERS: BrowseFilters = { search: '', genre: '', decade: '', format: '' };

const ListeningRoomBrowse: React.FC<ListeningRoomBrowseProps> = ({ onSelectAlbum, onQuickAdd, sessionAlbumIds, nowSpinningId, ambientMode }) => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BrowseFilters>(EMPTY_FILTERS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await supabaseService.getAlbums();
        if (!cancelled) setAlbums(data);
      } catch (err) {
        console.error('Failed to load albums:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Derive filter options from collection data
  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const a of albums) {
      if (a.genre) set.add(a.genre);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [albums]);

  const decades = useMemo(() => {
    const set = new Set<string>();
    for (const a of albums) {
      const d = getDecade(a.year);
      if (d) set.add(d);
    }
    return Array.from(set).sort();
  }, [albums]);

  const formats = useMemo(() => {
    const set = new Set<string>();
    for (const a of albums) {
      if (a.format) set.add(a.format);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [albums]);

  // Apply filters (AND logic)
  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return albums.filter((a) => {
      if (q && !a.artist.toLowerCase().includes(q) && !a.title.toLowerCase().includes(q)) return false;
      if (filters.genre && a.genre !== filters.genre) return false;
      if (filters.decade && getDecade(a.year) !== filters.decade) return false;
      if (filters.format && a.format !== filters.format) return false;
      return true;
    });
  }, [albums, filters]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#dd6e42] border-t-transparent" />
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
        <svg className="w-16 h-16 text-th-text3/30" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
        <p className="text-th-text2 font-label text-sm text-center">
          Your collection is empty. Add some records to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <ListeningRoomFilters
        filters={filters}
        onChange={setFilters}
        genres={genres}
        decades={decades}
        formats={formats}
        resultCount={filtered.length}
        totalCount={albums.length}
        ambientMode={ambientMode}
      />

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-th-text3 font-label text-sm">No records match your filters.</p>
        </div>
      ) : (
        <div
          className="p-4 pt-0 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
          style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}
        >
          {filtered.map((album) => {
            const inSession = sessionAlbumIds?.has(album.id) ?? false;
            return (
              <button
                key={album.id}
                type="button"
                aria-label={`${album.artist} - ${album.title}`}
                onClick={() => onSelectAlbum?.(album)}
                className="group/cell text-left min-w-[80px] transition-transform duration-200 hover:scale-105 active:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dd6e42] focus-visible:ring-offset-2 focus-visible:ring-offset-th-bg rounded-lg"
              >
                <div className={`relative aspect-square rounded-lg overflow-hidden transition-shadow duration-500 ${
                  ambientMode ? 'bg-[#1a1a1a] shadow-lg shadow-[#dd6e42]/10' : 'bg-th-bg2/60'
                }`}>
                  {album.cover_url ? (
                    <img
                      src={proxyImageUrl(album.cover_url)}
                      alt={`Album cover for ${album.title} by ${album.artist}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`${album.cover_url ? 'hidden' : ''} w-full h-full flex items-center justify-center bg-th-bg2/60`}>
                    <svg className="w-10 h-10 text-th-text3/25" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="12" cy="12" r="1" />
                    </svg>
                  </div>

                  {/* Now spinning badge */}
                  {nowSpinningId === album.id && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <Disc3
                        className="w-3.5 h-3.5 text-[#dd6e42] animate-spin"
                        style={{ animationDuration: '3s' }}
                      />
                    </span>
                  )}

                  {/* Quick-add / in-session badge */}
                  {inSession ? (
                    <span
                      aria-label="Already in session"
                      className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-[#4a7c59] flex items-center justify-center shadow-md"
                    >
                      <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Add ${album.title} to session`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAdd?.(album);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          onQuickAdd?.(album);
                        }
                      }}
                      className="quick-add-btn absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-[#dd6e42] flex items-center justify-center shadow-md hover:bg-[#c45a30] active:scale-90 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </span>
                  )}
                </div>
                <p className={`mt-1.5 text-[11px] font-label leading-tight truncate transition-colors duration-500 ${
                  ambientMode ? 'text-[#c4b5a0]' : 'text-th-text'
                }`}>
                  {album.artist}
                </p>
                <p className={`text-[10px] font-label leading-tight truncate transition-colors duration-500 ${
                  ambientMode ? 'text-[#c4b5a0]/60' : 'text-th-text2'
                }`}>
                  {album.title}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};

export default ListeningRoomBrowse;
