
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Album } from '../types';
import { proxyImageUrl } from '../services/imageProxy';
import { geminiService } from '../services/geminiService';
import { supabase } from '../services/supabaseService';
import SpinningRecord from './SpinningRecord';
import CoverPicker from './CoverPicker';
import { useToast } from '../contexts/ToastContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface AlbumDetailModalProps {
  album: Album;
  allAlbums: Album[];
  onClose: () => void;
  onUpdateTags?: (albumId: string, tags: string[]) => void;
  onToggleFavorite?: (albumId: string) => void;
  onSelectAlbum?: (album: Album) => void;
  onUpdateAlbum?: (albumId: string, updates: Partial<Album>) => void;
  canUseLyrics?: boolean;
  canUseCovers?: boolean;
  onUpgradeRequired?: (feature: string) => void;
}

const AlbumDetailModal: React.FC<AlbumDetailModalProps> = ({
  album,
  allAlbums,
  onClose,
  onUpdateTags,
  onToggleFavorite,
  onSelectAlbum,
  onUpdateAlbum,
  canUseLyrics = true,
  canUseCovers = true,
  onUpgradeRequired,
}) => {
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);
  const [notes, setNotes] = useState(album.personal_notes || '');
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null);
  const [lyricsCache, setLyricsCache] = useState<Record<number, { lyrics: string | null; syncedLyrics: string | null }>>({});
  const [loadingTrack, setLoadingTrack] = useState<number | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [displayCoverUrl, setDisplayCoverUrl] = useState(album.cover_url);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleTrackClick = useCallback(async (index: number, trackName: string) => {
    if (expandedTrack === index) {
      setExpandedTrack(null);
      return;
    }

    // Gate lyrics behind Curator+
    if (!canUseLyrics) {
      onUpgradeRequired?.('lyrics');
      return;
    }

    setExpandedTrack(index);

    if (lyricsCache[index] !== undefined) return;

    setLoadingTrack(index);
    try {
      const result = await geminiService.fetchLyrics(album.artist, trackName, album.title);
      setLyricsCache(prev => ({ ...prev, [index]: result }));
    } catch (err) {
      console.error('Failed to fetch lyrics:', err);
      showToast('Failed to fetch lyrics', 'error');
      setLyricsCache(prev => ({ ...prev, [index]: { lyrics: null, syncedLyrics: null } }));
    } finally {
      setLoadingTrack(null);
    }
  }, [expandedTrack, lyricsCache, album.artist, album.title]);



  const collectionStats = useMemo(() => {
    const genreCount = allAlbums.filter(a => a.genre === album.genre).length;
    const sortedAlbums = [...allAlbums].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    const indexInArchive = sortedAlbums.findIndex(a => a.id === album.id) + 1;

    return {
      genreCount,
      indexInArchive,
      totalInCrate: allAlbums.length
    };
  }, [allAlbums, album]);

  const relatedAlbums = useMemo(() => {
    return allAlbums
      .filter(a => a.id !== album.id && (a.genre === album.genre || a.artist === album.artist))
      .slice(0, 10);
  }, [allAlbums, album]);

  const handlePlaySample = () => {
    const currentPlays = album.play_count || 0;
    onUpdateAlbum?.(album.id, { play_count: currentPlays + 1 });
    if (album.sample_url) {
      try {
        const parsed = new URL(album.sample_url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          showToast('Invalid sample URL.', 'error');
          return;
        }
        window.open(album.sample_url, '_blank', 'noopener,noreferrer');
      } catch {
        showToast('Invalid sample URL.', 'error');
      }
    } else {
      showToast('Sample playback not available.', 'info');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not Recorded';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleCoverSelect = async (url: string) => {
    setUploadingCover(true);
    const previousCoverUrl = displayCoverUrl;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }
      if (!headers['Authorization']) {
        const secret = import.meta.env.VITE_API_SECRET;
        if (secret) headers['Authorization'] = `Bearer ${secret}`;
      }
      const resp = await fetch('/api/upload-cover', {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageUrl: url, albumId: album.id }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => null);
        const detail = errBody?.error || resp.statusText;
        console.error('upload-cover failed:', resp.status, detail);
        showToast(`Failed to save cover: ${detail}`, 'error');
        return;
      }
      const { publicUrl } = await resp.json();
      setDisplayCoverUrl(publicUrl);
      if (onUpdateAlbum) {
        await onUpdateAlbum(album.id, { cover_url: publicUrl });
      }
      showToast('Cover art saved', 'success');
    } catch {
      setDisplayCoverUrl(previousCoverUrl);
      showToast('Failed to save cover', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${album.title} by ${album.artist}`} className="fixed inset-0 z-50 flex items-center justify-center bg-th-bg/95 p-2 md:p-8 backdrop-blur-xl animate-in fade-in duration-300 outline-none">
      <div className="relative w-full max-w-6xl max-h-[98vh] md:max-h-[95vh] glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] flex flex-col md:flex-row animate-in zoom-in-95 duration-500">

        <button onClick={onClose} className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-th-bg/50 text-th-text flex items-center justify-center hover:bg-th-text hover:text-th-bg transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="w-full md:w-5/12 overflow-hidden bg-th-bg flex items-center justify-center p-6 md:p-12 relative flex-shrink-0">
             <button onClick={() => {
               if (!canUseCovers) {
                 onUpgradeRequired?.('covers');
                 return;
               }
               if (!uploadingCover) setShowCoverPicker(true);
             }} className="relative group cursor-pointer z-10">
               <img src={proxyImageUrl(displayCoverUrl)} alt={album.title && album.artist ? `Album cover for ${album.title} by ${album.artist}` : album.title ? `Album cover for ${album.title}` : 'Album cover'} loading="lazy" className={`w-full h-auto max-h-[40vh] md:max-h-full object-contain rounded-md shadow-[0_0_100px_rgba(0,0,0,0.8)] transition-opacity ${uploadingCover ? 'opacity-50' : ''}`} />
               {uploadingCover ? (
                 <div className="absolute inset-0 bg-th-bg/60 rounded-md flex items-center justify-center">
                   <div className="flex flex-col items-center gap-3">
                     <SpinningRecord size="w-10 h-10" />
                     <span className="text-th-text/80 text-[9px] font-label tracking-widest uppercase">Saving cover...</span>
                   </div>
                 </div>
               ) : (
               <div className="absolute inset-0 bg-th-bg/0 group-hover:bg-th-bg/60 transition-all duration-300 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100">
                 <div className="flex flex-col items-center gap-2">
                   <svg className="w-8 h-8 text-th-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                     <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                   </svg>
                   <span className="text-th-text/80 text-[9px] font-label tracking-widest uppercase">Tap to change cover</span>
                 </div>
               </div>
               )}
             </button>
             <div className="absolute -bottom-10 -left-10 text-[80px] md:text-[120px] font-label font-black text-th-text/5 select-none pointer-events-none uppercase whitespace-nowrap">
               {album.genre?.split(' ')[0]}
             </div>
        </div>

        <div className="w-full md:w-7/12 p-6 md:p-12 overflow-y-auto bg-th-surface/[0.02] custom-scrollbar">
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#dd6e42] font-label text-[9px] tracking-[0.2em] font-bold uppercase">{album.genre || 'Vinyl'}</span>
              <span className="text-th-text3/50">•</span>
              <span className="text-th-text3 font-label text-[9px] tracking-[0.2em] uppercase">{album.year}</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-th-text mb-2 leading-tight">{album.title}</h2>
            <h3 className="text-xl text-th-text2 font-medium">{album.artist}</h3>
          </header>

          <div className="space-y-12">
            {/* Market Valuation: NEW SECTION */}
            <section className="p-6 rounded-2xl bg-[#dd6e42]/5 border border-[#dd6e42]/10 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-[#f0a882] text-[10px] font-label tracking-[0.3em] uppercase flex items-center gap-3">
                  Market Valuation
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-th-text3 text-[9px] uppercase tracking-widest">Powered by Discogs</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-th-text3/50 text-[9px] uppercase tracking-widest mb-1">Low</p>
                  <p className="text-xl font-bold text-th-text2">${Math.round(album.price_low || 0)}</p>
                </div>
                <div className="bg-[#dd6e42]/10 p-3 rounded-xl border border-[#dd6e42]/20">
                  <p className="text-[#f0a882] text-[9px] uppercase tracking-widest mb-1 font-bold">Median</p>
                  <p className="text-3xl font-black text-th-text">${Math.round(album.price_median || 0)}</p>
                </div>
                <div>
                  <p className="text-th-text3/50 text-[9px] uppercase tracking-widest mb-1">High</p>
                  <p className="text-xl font-bold text-[#f0a882]">${Math.round(album.price_high || 0)}</p>
                </div>
              </div>

              {/* Price visualization bar */}
              <div className="relative pt-6">
                <div className="h-1.5 w-full bg-th-surface/[0.04] rounded-full flex overflow-hidden">
                   <div className="h-full bg-[#dd6e42]/20 w-1/3"></div>
                   <div className="h-full bg-[#dd6e42] w-1/3"></div>
                   <div className="h-full bg-[#dd6e42]/40 w-1/3"></div>
                </div>
                <div className="flex justify-between text-[9px] text-th-text3/50 uppercase tracking-widest mt-2">
                  <span>Common Sale</span>
                  <span>Market Avg</span>
                  <span>Premium Press</span>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => onToggleFavorite?.(album.id)} className={`flex-1 font-bold py-4 rounded-xl transition-all uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 ${album.isFavorite ? 'bg-[#dd6e42] text-th-text' : 'bg-th-text text-th-bg hover:bg-rose-500 hover:text-th-text'}`}>
                <svg className={`w-4 h-4 ${album.isFavorite ? 'fill-current' : ''}`} viewBox="0 0 24 24" fill={album.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {album.isFavorite ? 'Favorited' : 'Add to Favorites'}
              </button>
              <button onClick={handlePlaySample} className="flex-1 border border-th-surface/[0.10] text-th-text font-bold py-4 rounded-xl hover:bg-th-surface/[0.08] transition-all uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2">
                Listen Sample
              </button>
            </section>

            {/* Collector's Context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-morphism p-6 rounded-2xl border border-th-surface/[0.06] space-y-6">
                <h5 className="text-th-text3 text-[9px] uppercase tracking-widest border-b border-th-surface/[0.06] pb-2">Archive Analytics</h5>
                <div className="grid grid-cols-2 gap-y-6">
                  <div>
                    <p className="text-th-text3/50 text-[9px] uppercase mb-1">Spins</p>
                    <p className="text-2xl font-bold text-th-text">{album.play_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-th-text3/50 text-[9px] uppercase mb-1">Added</p>
                    <p className="text-sm font-bold text-th-text">{formatDate(album.created_at)}</p>
                  </div>
                </div>
              </div>
              <div className="glass-morphism p-6 rounded-2xl border border-th-surface/[0.06] space-y-6">
                <h5 className="text-th-text3 text-[9px] uppercase tracking-widest border-b border-th-surface/[0.06] pb-2">Density</h5>
                <div className="space-y-4">
                  <div className="flex justify-between text-[9px] uppercase tracking-widest text-th-text3">
                    <span>{album.genre} Presence</span>
                    <span>{collectionStats.genreCount} items</span>
                  </div>
                  <div className="h-1 w-full bg-th-surface/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-[#dd6e42]" style={{width: `${(collectionStats.genreCount/collectionStats.totalInCrate)*100}%`}}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative & Tracklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <section>
                <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-4">The Narrative</h4>
                <p className="text-th-text/70 leading-relaxed italic text-sm">"{album.description || 'A sonic journey waiting to be explored.'}"</p>
              </section>
              {album.tracklist && (
                <section>
                  <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-4">Manifest</h4>
                  <div className="space-y-0">
                    {album.tracklist.map((t, i) => (
                      <div key={i}>
                        <button
                          onClick={() => handleTrackClick(i, t)}
                          className="w-full text-left flex items-center gap-2 text-[10px] py-1.5 text-th-text2 hover:text-th-text border-b border-th-surface/[0.06] transition-colors group"
                        >
                          <svg className="w-3 h-3 flex-shrink-0 text-th-text3/50 group-hover:text-[#f0a882] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                          <span className="truncate flex-1">{t}</span>
                          <svg className={`w-3 h-3 flex-shrink-0 text-th-text3/50 transition-transform duration-200 ${expandedTrack === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <div
                          className="overflow-hidden transition-all duration-300 ease-in-out"
                          style={{ maxHeight: expandedTrack === i ? '400px' : '0px', opacity: expandedTrack === i ? 1 : 0 }}
                        >
                          <div className="py-3 pl-5">
                            {loadingTrack === i ? (
                              <div className="flex items-center gap-3 text-th-text3/70 text-xs">
                                <SpinningRecord size="w-5 h-5" />
                                Fetching lyrics…
                              </div>
                            ) : lyricsCache[i]?.lyrics ? (
                              <p className="text-th-text3 text-xs whitespace-pre-line leading-relaxed">{lyricsCache[i].lyrics}</p>
                            ) : lyricsCache[i] !== undefined ? (
                              <p className="text-th-text3/70 text-xs italic">Lyrics not found</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Tags */}
            {album.tags && album.tags.length > 0 && (
              <section>
                <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-4">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {album.tags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-full px-3 py-1 text-[10px] text-th-text2">
                      {tag}
                      {onUpdateTags && (
                        <button
                          onClick={() => onUpdateTags(album.id, album.tags!.filter((_, j) => j !== i))}
                          className="ml-1 text-th-text3/70 hover:text-red-400 transition-colors"
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Personal Notes */}
            {onUpdateAlbum && (
              <section>
                <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-4">Personal Notes</h4>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your notes about this record..."
                  className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3 text-sm text-th-text/80 placeholder:text-th-text3/50 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50 resize-none"
                  rows={3}
                />
                {notes !== (album.personal_notes || '') && (
                  <button
                    onClick={() => onUpdateAlbum(album.id, { personal_notes: notes })}
                    className="mt-2 bg-[#dd6e42]/20 border border-[#dd6e42]/30 text-[#f0a882] text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-[#dd6e42]/30 transition-all"
                  >
                    Save Notes
                  </button>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      {showCoverPicker && (
        <CoverPicker
          artist={album.artist}
          title={album.title}
          currentCoverUrl={displayCoverUrl}
          onSelectCover={handleCoverSelect}
          onClose={() => setShowCoverPicker(false)}
        />
      )}
    </div>
  );
};

export default AlbumDetailModal;
