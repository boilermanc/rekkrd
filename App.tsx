
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Album } from './types';
import { supabaseService, supabase } from './services/supabaseService';
import { geminiService } from './services/geminiService';
import AlbumCard from './components/AlbumCard';
import CameraModal from './components/CameraModal';
import SpinningRecord from './components/SpinningRecord';
import AlbumDetailModal from './components/AlbumDetailModal';
import PlaylistStudio from './components/PlaylistStudio';

type SortOption = 'recent' | 'year' | 'artist' | 'title' | 'value';

const DEFAULT_BG = 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?q=80&w=2000&auto=format&fit=crop';

const App: React.FC = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [heroBg, setHeroBg] = useState(DEFAULT_BG);
  
  const [yearRange, setYearRange] = useState({ min: '', max: '' });
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSupabaseReady = !!supabase;

  useEffect(() => {
    if (isSupabaseReady) {
      loadAlbums();
    } else {
      setLoading(false);
    }
  }, [isSupabaseReady]);

  const isAlbumDeselected = selectedAlbum === null;
  useEffect(() => {
    if (albums.length > 0) {
      const randomIndex = Math.floor(Math.random() * albums.length);
      const selected = albums[randomIndex];
      if (selected.cover_url) {
        setHeroBg(selected.cover_url);
      }
    }
  }, [albums.length, isStudioOpen, isAlbumDeselected]);

  const loadAlbums = async () => {
    setLoading(true);
    const data = await supabaseService.getAlbums();
    setAlbums(data);
    setLoading(false);
  };

  const resetView = () => {
    setSearchQuery('');
    setYearRange({ min: '', max: '' });
    setFavoritesOnly(false);
    setSortBy('recent');
    setIsFilterPanelOpen(false);
    setShowStats(false);
    setSelectedAlbum(null);
    
    // Pick a fresh random background
    if (albums.length > 0) {
      const randomIndex = Math.floor(Math.random() * albums.length);
      const selected = albums[randomIndex];
      if (selected.cover_url) setHeroBg(selected.cover_url);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const processImage = async (base64: string) => {
    if (!isSupabaseReady) {
      alert("Database not configured. Please check your Supabase environment variables.");
      return;
    }
    
    setProcessingStatus("Identifying Record...");
    try {
      const identity = await geminiService.identifyAlbum(base64);
      if (!identity) {
        alert("Couldn't identify that album. Try a clearer shot!");
        setProcessingStatus(null);
        return;
      }

      const normalizedNewArtist = identity.artist.toLowerCase().trim();
      const normalizedNewTitle = identity.title.toLowerCase().trim();
      
      const existingAlbum = albums.find(a => 
        a.artist.toLowerCase().trim() === normalizedNewArtist && 
        a.title.toLowerCase().trim() === normalizedNewTitle
      );

      if (existingAlbum) {
        setProcessingStatus("✨ Already Cataloged!");
        setTimeout(() => {
          setProcessingStatus(null);
          setSelectedAlbum(existingAlbum);
          if (existingAlbum.cover_url) setHeroBg(existingAlbum.cover_url);
        }, 1500);
        return;
      }

      setProcessingStatus(`Appraising ${identity.title}...`);
      const metadata = await geminiService.fetchAlbumMetadata(identity.artist, identity.title);
      const { artist: mArtist, title: mTitle, cover_url: mCover, ...rest } = metadata;
      const saved = await supabaseService.saveAlbum({
        ...rest,
        original_photo_url: base64,
        artist: mArtist || identity.artist,
        title: mTitle || identity.title,
        cover_url: mCover || '',
        tags: metadata.tags || [],
        isFavorite: false,
        condition: 'Near Mint',
        play_count: 0
      });
      
      setAlbums(prev => [saved, ...prev]);
      setSelectedAlbum(saved);
      if (saved.cover_url) setHeroBg(saved.cover_url);
    } catch (err) {
      console.error(err);
      alert("Something went wrong during processing.");
    } finally {
      setProcessingStatus(prev => (prev === "✨ Already Cataloged!" ? prev : null));
    }
  };

  const handleUpdateAlbum = async (albumId: string, updates: Partial<Album>) => {
    await supabaseService.updateAlbum(albumId, updates);
    setAlbums(prev => prev.map(a => a.id === albumId ? { ...a, ...updates } : a));
    if (selectedAlbum?.id === albumId) {
      setSelectedAlbum(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleToggleFavorite = async (albumId: string) => {
    const album = albums.find(a => a.id === albumId);
    if (album) {
      const updates = { isFavorite: !album.isFavorite };
      await handleUpdateAlbum(albumId, updates);
    }
  };

  const handleCapture = (base64: string) => {
    setIsCameraOpen(false);
    processImage(base64);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 1080;
        let w = img.width, h = img.height;
        if (w > max || h > max) {
          const scale = max / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        processImage(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this masterpiece?")) {
      try {
        await supabaseService.deleteAlbum(id);
        setAlbums(prev => prev.filter(a => a.id !== id));
        if (selectedAlbum?.id === id) setSelectedAlbum(null);
      } catch (err) {
        console.error(err);
        alert("Failed to delete album. Please try again.");
      }
    }
  };

  const stats = useMemo(() => {
    const genres: Record<string, number> = {};
    const decades: Record<string, number> = {};
    let totalVal = 0;
    
    albums.forEach(album => {
      const g = album.genre || 'Unknown';
      genres[g] = (genres[g] || 0) + 1;
      
      const year = parseInt(album.year || '0');
      if (year > 0) {
        const decade = Math.floor(year / 10) * 10 + 's';
        decades[decade] = (decades[decade] || 0) + 1;
      }

      totalVal += (album.price_median || 0);
    });

    const topGenre = Object.entries(genres).sort((a, b) => b[1] - a[1])[0];
    const topDecade = Object.entries(decades).sort((a, b) => b[1] - a[1])[0];

    return { genres, decades, topGenre, topDecade, total: albums.length, portfolioValue: totalVal };
  }, [albums]);

  const filteredAlbums = useMemo(() => {
    let result = albums.filter(a => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        a.title.toLowerCase().includes(query) ||
        a.artist.toLowerCase().includes(query) ||
        (a.genre && a.genre.toLowerCase().includes(query));
      
      const albumYear = parseInt(a.year || '0');
      const minYear = parseInt(yearRange.min || '0');
      const maxYear = parseInt(yearRange.max || '9999');
      const matchesYear = (minYear === 0 || albumYear >= minYear) && (maxYear === 9999 || albumYear <= maxYear);
      const matchesFavoriteOnly = !favoritesOnly || a.isFavorite;

      return matchesSearch && matchesYear && matchesFavoriteOnly;
    });

    result.sort((a, b) => {
      if (sortBy === 'year') return (parseInt(b.year || '0') - parseInt(a.year || '0'));
      if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'value') return (b.price_median || 0) - (a.price_median || 0);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return result;
  }, [albums, searchQuery, yearRange, favoritesOnly, sortBy]);

  return (
    <div className="min-h-screen pb-24 selection:bg-pink-500/30 relative overflow-x-hidden">
      {!isSupabaseReady && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-[10px] py-1 text-center font-bold tracking-widest uppercase">
          Missing Supabase Configuration - Data will not persist
        </div>
      )}

      {/* Cinematic Background Layer */}
      <div className="fixed inset-0 z-[-1] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-[3000ms] ease-in-out opacity-20 scale-110 blur-[80px] animate-[ken-burns_60s_linear_infinite]"
          style={{ backgroundImage: `url(${heroBg})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]"></div>
      </div>

      <header className="sticky top-0 z-40 glass-morphism border-b border-white/10 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between md:justify-start gap-3">
            <div 
              onClick={resetView}
              title="Home / Reset Filters"
              className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg neon-border cursor-pointer active:scale-90 transition-transform flex-shrink-0"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="font-syncopate text-lg md:text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 truncate">
              THE CROWE COLLECTION
            </h1>
          </div>

          <div className="flex-1 max-w-xl flex items-center gap-2">
            <button 
              onClick={() => setShowStats(!showStats)}
              className={`p-3 rounded-full border transition-all flex-shrink-0 ${showStats ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Search crate..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-white/20"
              />
              <svg className="absolute left-3.5 top-3 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button 
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`p-3 rounded-full border transition-all flex-shrink-0 ${isFilterPanelOpen ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {showStats && !loading && albums.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 mt-6 animate-in slide-in-from-top duration-500">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="glass-morphism p-4 md:p-6 rounded-3xl border border-white/10">
              <p className="text-[9px] font-syncopate text-white/40 tracking-widest uppercase mb-1">Crate Count</p>
              <h3 className="text-3xl md:text-4xl font-bold text-white">{stats.total}</h3>
            </div>
            <div className="glass-morphism p-4 md:p-6 rounded-3xl border border-white/10">
              <p className="text-[9px] font-syncopate text-emerald-400/60 tracking-widest uppercase mb-1">Portfolio Value</p>
              <h3 className="text-3xl md:text-4xl font-bold text-emerald-400">${stats.portfolioValue.toLocaleString()}</h3>
            </div>
            <div className="glass-morphism p-4 md:p-6 rounded-3xl border border-white/10">
              <p className="text-[9px] font-syncopate text-white/40 tracking-widest uppercase mb-1">Top Vibe</p>
              <h3 className="text-lg md:text-xl font-bold text-white truncate">{stats.topGenre?.[0] || 'Mixed'}</h3>
            </div>
            <div className="hidden lg:block glass-morphism p-6 rounded-3xl border border-white/10">
              <p className="text-[9px] font-syncopate text-white/40 tracking-widest uppercase mb-1">Era Spotlight</p>
              <h3 className="text-xl font-bold text-white">{stats.topDecade?.[0] || 'N/A'}</h3>
            </div>
          </div>
        </div>
      )}

      {isFilterPanelOpen && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 mt-4">
          <div className="glass-morphism rounded-3xl p-6 border border-white/10 animate-in slide-in-from-top duration-300">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h4 className="text-white/40 font-syncopate text-[9px] tracking-widest uppercase mb-3">Sort Collection</h4>
                <div className="flex flex-wrap gap-2">
                  {(['recent', 'year', 'artist', 'value'] as const).map(opt => (
                    <button key={opt} onClick={() => setSortBy(opt)} className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest transition-all ${sortBy === opt ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/40'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-white/40 font-syncopate text-[9px] tracking-widest uppercase mb-3">Release Era</h4>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="From" value={yearRange.min} onChange={(e) => setYearRange(prev => ({ ...prev, min: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-emerald-500" />
                  <span className="text-white/20">—</span>
                  <input type="number" placeholder="To" value={yearRange.max} onChange={(e) => setYearRange(prev => ({ ...prev, max: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div onClick={() => setFavoritesOnly(!favoritesOnly)} className={`w-10 h-5 rounded-full transition-all relative border border-white/10 ${favoritesOnly ? 'bg-emerald-600' : 'bg-white/5'}`}>
                    <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${favoritesOnly ? 'left-5.5' : 'left-1'}`}></div>
                  </div>
                  <span className="text-xs text-white/60 group-hover:text-white">Favorites Only</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {processingStatus && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <SpinningRecord size="w-64 h-64 md:w-96 md:h-96" />
          <div className="mt-8 md:mt-12 text-center px-6">
            <p className={`font-syncopate ${processingStatus === '✨ Already Cataloged!' ? 'text-indigo-400' : 'text-emerald-500'} text-xl md:text-2xl font-bold animate-pulse tracking-[0.3em] uppercase transition-colors duration-500`}>
              {processingStatus}
            </p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <SpinningRecord size="w-40 h-40" />
            <p className="font-syncopate text-[10px] tracking-widest mt-8 text-white/40 uppercase">SYNCING COLLECTION</p>
          </div>
        ) : albums.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center px-6">
            <div className="w-20 h-20 mb-6 opacity-20 text-white">
              <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>
            </div>
            <h2 className="text-white/60 font-syncopate tracking-widest text-lg uppercase mb-2">CRATE IS EMPTY</h2>
            <p className="text-white/30 text-sm max-w-xs">Scan your first record cover to begin your digital archive.</p>
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center px-6">
            <svg className="w-16 h-16 text-white/10 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h2 className="text-white/60 font-syncopate tracking-widest text-lg uppercase mb-2">No Matches</h2>
            <p className="text-white/30 text-sm max-w-xs">No albums match your current filters. Try adjusting your search or clearing filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
            {filteredAlbums.map(album => (
              <AlbumCard key={album.id} album={album} onDelete={handleDelete} onSelect={setSelectedAlbum} />
            ))}
          </div>
        )}
      </main>

      <div className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-4 z-50 w-full px-4 justify-center">
        <button 
          onClick={() => setIsStudioOpen(true)}
          className="bg-white/10 backdrop-blur-md hover:bg-pink-500/20 text-white font-bold p-4 md:p-5 rounded-full shadow-2xl transition-all border border-white/20 group flex-shrink-0"
          title="Magic Mix Studio"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </button>

        <button
          onClick={() => setIsCameraOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold py-3.5 px-6 md:py-4 md:px-10 rounded-full shadow-2xl transition-all transform hover:scale-105 flex items-center gap-2 md:gap-3 group border border-white/20"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-syncopate tracking-[0.2em] text-[9px] md:text-xs whitespace-nowrap">SCAN COVER</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-white/10 backdrop-blur-md hover:bg-indigo-500/20 text-white font-bold p-4 md:p-5 rounded-full shadow-2xl transition-all border border-white/20 group flex-shrink-0"
          title="Upload Album Cover"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {isCameraOpen && <CameraModal onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
      {isStudioOpen && <PlaylistStudio albums={albums} onClose={() => setIsStudioOpen(false)} />}
      {selectedAlbum && (
        <AlbumDetailModal 
          album={selectedAlbum} 
          allAlbums={albums}
          onClose={() => setSelectedAlbum(null)} 
          onUpdateTags={(id, tags) => handleUpdateAlbum(id, { tags })}
          onToggleFavorite={handleToggleFavorite}
          onSelectAlbum={setSelectedAlbum}
          onUpdateAlbum={handleUpdateAlbum}
        />
      )}
    </div>
  );
};

export default App;
