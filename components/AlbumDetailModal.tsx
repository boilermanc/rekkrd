
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Album } from '../types';

interface AlbumDetailModalProps {
  album: Album;
  allAlbums: Album[];
  onClose: () => void;
  onUpdateTags?: (albumId: string, tags: string[]) => void;
  onToggleFavorite?: (albumId: string) => void;
  onSelectAlbum?: (album: Album) => void;
  onUpdateAlbum?: (albumId: string, updates: Partial<Album>) => void;
}

const CONDITION_GRADES = [
  'Mint (M)', 
  'Near Mint (NM)', 
  'Very Good Plus (VG+)', 
  'Very Good (VG)', 
  'Good (G)', 
  'Fair (F)', 
  'Poor (P)'
];

const AlbumDetailModal: React.FC<AlbumDetailModalProps> = ({ 
  album, 
  allAlbums, 
  onClose, 
  onUpdateTags, 
  onToggleFavorite,
  onSelectAlbum,
  onUpdateAlbum
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState(album.personal_notes || '');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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
    onUpdateAlbum?.(album.id!, { play_count: currentPlays + 1 });
    if (album.sample_url) window.open(album.sample_url, '_blank');
    else setToastMessage('Sample playback not available.');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not Recorded';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-2 md:p-8 backdrop-blur-xl animate-in fade-in duration-300">
      {toastMessage && (
        <div className="absolute top-6 md:top-10 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top duration-300">
          <div className="glass-morphism px-6 py-3 rounded-full border border-emerald-500/30 shadow-lg flex items-center gap-3">
            <p className="text-white text-[10px] font-syncopate tracking-wider">{toastMessage}</p>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-6xl max-h-[98vh] md:max-h-[95vh] glass-morphism rounded-3xl overflow-hidden border border-white/10 flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
        
        <button onClick={onClose} className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="w-full md:w-5/12 overflow-hidden bg-black flex items-center justify-center p-6 md:p-12 relative flex-shrink-0">
             <img src={album.cover_url} alt={album.title} className="w-full h-auto max-h-[40vh] md:max-h-full object-contain rounded-md shadow-[0_0_100px_rgba(0,0,0,0.8)] z-10" />
             <div className="absolute -bottom-10 -left-10 text-[80px] md:text-[120px] font-syncopate font-black text-white/5 select-none pointer-events-none uppercase whitespace-nowrap">
               {album.genre?.split(' ')[0]}
             </div>
        </div>

        <div className="w-full md:w-7/12 p-6 md:p-12 overflow-y-auto bg-white/[0.01] custom-scrollbar">
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-emerald-500 font-syncopate text-[9px] tracking-[0.2em] font-bold uppercase">{album.genre || 'Vinyl'}</span>
              <span className="text-white/20">•</span>
              <span className="text-white/40 font-syncopate text-[9px] tracking-[0.2em] uppercase">{album.year}</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-2 leading-tight">{album.title}</h2>
            <h3 className="text-xl text-white/60 font-medium">{album.artist}</h3>
          </header>

          <div className="space-y-12">
            {/* Market Valuation: NEW SECTION */}
            <section className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-emerald-400 text-[10px] font-syncopate tracking-[0.3em] uppercase flex items-center gap-3">
                  Market Valuation
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-[9px] uppercase tracking-widest">Powered by Discogs</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-white/20 text-[9px] uppercase tracking-widest mb-1">Low</p>
                  <p className="text-xl font-bold text-white/60">${Math.round(album.price_low || 0)}</p>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                  <p className="text-emerald-400 text-[9px] uppercase tracking-widest mb-1 font-bold">Median</p>
                  <p className="text-3xl font-black text-white">${Math.round(album.price_median || 0)}</p>
                </div>
                <div>
                  <p className="text-white/20 text-[9px] uppercase tracking-widest mb-1">High</p>
                  <p className="text-xl font-bold text-emerald-400">${Math.round(album.price_high || 0)}</p>
                </div>
              </div>

              {/* Price visualization bar */}
              <div className="relative pt-6">
                <div className="h-1.5 w-full bg-white/5 rounded-full flex overflow-hidden">
                   <div className="h-full bg-emerald-500/20 w-1/3"></div>
                   <div className="h-full bg-emerald-500 w-1/3"></div>
                   <div className="h-full bg-emerald-500/40 w-1/3"></div>
                </div>
                <div className="flex justify-between text-[9px] text-white/20 uppercase tracking-widest mt-2">
                  <span>Common Sale</span>
                  <span>Market Avg</span>
                  <span>Premium Press</span>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => onToggleFavorite?.(album.id!)} className={`flex-1 font-bold py-4 rounded-xl transition-all uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 ${album.isFavorite ? 'bg-emerald-600 text-white' : 'bg-white text-black hover:bg-emerald-500 hover:text-white'}`}>
                {album.isFavorite ? 'Saved to Crate' : 'Add to Crate'}
              </button>
              <button onClick={handlePlaySample} className="flex-1 border border-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/10 transition-all uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2">
                Listen Sample
              </button>
            </section>

            {/* Collector's Context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-morphism p-6 rounded-2xl border border-white/5 space-y-6">
                <h5 className="text-white/40 text-[9px] uppercase tracking-widest border-b border-white/5 pb-2">Archive Analytics</h5>
                <div className="grid grid-cols-2 gap-y-6">
                  <div>
                    <p className="text-white/20 text-[9px] uppercase mb-1">Spins</p>
                    <p className="text-2xl font-bold text-white">{album.play_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-white/20 text-[9px] uppercase mb-1">Added</p>
                    <p className="text-sm font-bold text-white">{formatDate(album.created_at)}</p>
                  </div>
                </div>
              </div>
              <div className="glass-morphism p-6 rounded-2xl border border-white/5 space-y-6">
                <h5 className="text-white/40 text-[9px] uppercase tracking-widest border-b border-white/5 pb-2">Density</h5>
                <div className="space-y-4">
                  <div className="flex justify-between text-[9px] uppercase tracking-widest text-white/40">
                    <span>{album.genre} Presence</span>
                    <span>{collectionStats.genreCount} items</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{width: `${(collectionStats.genreCount/collectionStats.totalInCrate)*100}%`}}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative & Tracklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <section>
                <h4 className="text-white/30 text-[9px] font-syncopate tracking-[0.3em] uppercase mb-4">The Narrative</h4>
                <p className="text-white/70 leading-relaxed italic text-sm">"{album.description || 'A sonic journey waiting to be explored.'}"</p>
              </section>
              {album.tracklist && (
                <section>
                  <h4 className="text-white/30 text-[9px] font-syncopate tracking-[0.3em] uppercase mb-4">Manifest</h4>
                  <div className="space-y-1">
                    {album.tracklist.map((t, i) => (
                      <div key={i} className="text-[10px] py-1 text-white/60 hover:text-white truncate border-b border-white/5">{t}</div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumDetailModal;
