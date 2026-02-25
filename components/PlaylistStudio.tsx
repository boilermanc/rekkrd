
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Album, Playlist, PlaylistItem } from '../types';
import { geminiService } from '../services/geminiService';
import SpinningRecord from './SpinningRecord';
import { proxyImageUrl } from '../services/imageProxy';
import { useToast } from '../contexts/ToastContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { playlistService, SavedPlaylist } from '../services/playlistService';

const DURATION_OPTIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: 'All Night', minutes: 0 },
];

const MOOD_CHIPS = [
  'Late Night', 'Sunday Morning', 'Dinner Party', 'Deep Focus',
  'Road Trip', 'Rainy Day', 'House Party', 'Slow Burn',
  'Get Ready', 'Wind Down', 'Poolside', 'After Hours',
  'Coffee & Vinyl', 'Workout', 'Nostalgia Trip', 'Date Night',
  'Surprise Me'
];

const SOURCE_OPTIONS = [
  { key: 'all', label: 'My Collection' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'least-played', label: 'Least Played' },
  { key: 'recent', label: 'Recently Added' },
];

interface PlaylistStudioProps {
  albums: Album[];
  onClose: () => void;
  seedAlbum?: Album | null;
}

const PlaylistStudio: React.FC<PlaylistStudioProps> = ({ albums, onClose, seedAlbum }) => {
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);
  const [step, setStep] = useState<'config' | 'loading' | 'player' | 'manifest'>('config');
  const [mood, setMood] = useState('');
  const [focus, setFocus] = useState<'album' | 'side' | 'song'>('song');
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCustomMood, setShowCustomMood] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [targetMinutes, setTargetMinutes] = useState(0);
  const [mode, setMode] = useState<'quick' | 'custom'>('quick');
  const [selectedSources, setSelectedSources] = useState<string[]>(['all']);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const playlists = await playlistService.getAll();
      setSavedPlaylists(playlists);
    };
    load();
  }, []);

  useEffect(() => {
    if (seedAlbum) {
      const seedMood = `Build a listening session around "${seedAlbum.title}" by ${seedAlbum.artist}. Find complementary albums that pair well — similar genre, era, or energy. Start with this album and curate what comes before and after it.`;
      setMood(seedMood);
      setMode('custom');
      setShowCustomMood(true);
    }
  }, [seedAlbum]);

  const handleSave = async () => {
    if (!playlist || isSaving || isSaved) return;
    setIsSaving(true);
    const saved = await playlistService.save({
      name: playlist.name,
      mood: playlist.mood,
      focus: focus,
      items: playlist.items,
    });
    setIsSaving(false);
    if (saved) {
      setIsSaved(true);
      setSavedPlaylists(prev => [saved, ...prev]);
      showToast('Playlist saved!', 'success');
    } else {
      showToast('Failed to save playlist', 'error');
    }
  };

  const handleDeleteSaved = async (id: string) => {
    const success = await playlistService.remove(id);
    if (success) {
      setSavedPlaylists(prev => prev.filter(p => p.id !== id));
      showToast('Playlist removed', 'info');
    }
  };

  const handleLoadSaved = (saved: SavedPlaylist) => {
    setPlaylist({ id: saved.id, name: saved.name, mood: saved.mood, items: saved.items });
    setFocus(saved.focus);
    setCurrentIndex(0);
    setIsSaved(true);
    setShowLibrary(false);
    setStep('player');
  };

  const toggleSource = (key: string) => {
    if (key === 'all') {
      setSelectedSources(['all']);
    } else {
      setSelectedSources(prev => {
        const without = prev.filter(s => s !== 'all' && s !== key);
        const next = prev.includes(key) ? without : [...without, key];
        return next.length === 0 ? ['all'] : next;
      });
    }
  };

  const handleModeSwitch = (newMode: 'quick' | 'custom') => {
    setMode(newMode);
    setSelectedGenres([]);
    setTargetMinutes(0);
    setSelectedSources(['all']);
    if (newMode === 'quick') setFocus('song');
  };

  const filteredAlbums = useMemo(() => {
    if (mode === 'quick' || selectedSources.includes('all')) return albums;

    let result: Album[] = [];

    if (selectedSources.includes('favorites')) {
      result = [...result, ...albums.filter(a => a.favorite)];
    }

    if (selectedSources.includes('least-played')) {
      const sorted = [...albums].sort((a, b) => (a.play_count || 0) - (b.play_count || 0));
      const cutoff = Math.max(1, Math.ceil(albums.length * 0.25));
      const leastPlayed = sorted.slice(0, cutoff);
      result = [...result, ...leastPlayed];
    }

    if (selectedSources.includes('recent')) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recent = albums.filter(a => {
        const added = a.created_at ? new Date(a.created_at) : null;
        return added && added >= thirtyDaysAgo;
      });
      result = [...result, ...recent];
    }

    const seen = new Set<string>();
    return result.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [albums, selectedSources, mode]);

  const availableGenres = useMemo(() => {
    const genreCounts = new Map<string, number>();
    albums.forEach(a => {
      if (a.genre && a.genre !== 'Unknown') {
        genreCounts.set(a.genre, (genreCounts.get(a.genre) || 0) + 1);
      }
    });
    return Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => ({ genre, count }));
  }, [albums]);

  const handleGenerate = async () => {
    if (!mood.trim()) return;
    setStep('loading');
    try {
      const effectiveFocus = mode === 'quick' ? 'song' : focus;
      let moodForApi = mood;
      if (mood === 'Surprise Me') {
        const genreList = availableGenres.map(g => g.genre).join(', ');
        moodForApi = `SURPRISE MODE: Pick the most unexpected, eclectic, and varied mix possible from this collection. Cross genres wildly — go from ${genreList || 'any genre'} to anything else. Prioritize albums the user hasn't played much (low play_count). The goal is to rediscover forgotten records and create unexpected transitions that still work sonically. Do NOT stick to one genre or mood.`;
      }
      const effectiveMood = selectedGenres.length > 0
        ? `${moodForApi} (focus on genres: ${selectedGenres.join(', ')})`
        : moodForApi;
      const albumsForGeneration = mood === 'Surprise Me' ? albums : filteredAlbums;
      const result = await geminiService.generatePlaylist(albumsForGeneration, effectiveMood, effectiveFocus, targetMinutes);
      if (result.items.length === 0) {
        showToast("No records in your crate match that vibe. Try a different mood!", "info");
        setStep('config');
        return;
      }
      setPlaylist(result);
      setCurrentIndex(0);
      setStep('player');
      setIsSaved(false);
    } catch (error) {
      showToast("The Vibe Engine hit a snag. Try again!", "error");
      setStep('config');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const typeSubtitle = (item: PlaylistItem) => {
    switch (item.type) {
      case 'album': return '\u25B6 Play Full Album';
      case 'side': return `${item.itemTitle} \u00B7 ${item.artist} \u2014 ${item.albumTitle}`;
      case 'song': return `Track \u00B7 ${item.artist} \u2014 ${item.albumTitle}`;
    }
  };

  const currentItem = playlist?.items[currentIndex];

  if (step === 'loading') {
    return (
      <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Playlist Studio - generating" className="fixed inset-0 z-[100] bg-th-bg flex flex-col items-center justify-center p-8 outline-none">
        <SpinningRecord size="w-48 h-48 md:w-64 md:h-64" labelColor="bg-[#4f6d7a]" />
        <div className="mt-12 text-center">
          <h2 className="font-label text-th-text text-lg md:text-xl tracking-widest animate-pulse mb-2 uppercase">CRATING THE VIBE</h2>
          <p className="text-th-text3 text-xs md:text-sm">Browsing your crate for "{mood}"...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Playlist Studio" className="fixed inset-0 z-[100] bg-th-bg/95 backdrop-blur-2xl overflow-y-auto overflow-x-hidden outline-none">
      {/* High-Performance Printable Manifest */}
      <div className="hidden print:block bg-[#e8e2d6] text-[#2d3a3e] p-8 md:p-12 min-h-screen">
        <div className="flex justify-between items-end border-b-4 border-[#2d3a3e] pb-8 mb-12">
          <div>
            <h1 className="text-4xl md:text-6xl font-black uppercase mb-2 leading-none">{playlist?.name}</h1>
            <p className="text-lg md:text-2xl text-[#2d3a3e]/60 font-medium">Listening Guide: {playlist?.mood}</p>
          </div>
          <p className="text-xs font-black opacity-30 uppercase tracking-[0.3em] whitespace-nowrap">REKK<span className="text-[#c45a30]">R</span>D ARCHIVE</p>
        </div>
        <div className="space-y-12">
          {playlist?.items.map((item, idx) => (
            <div key={idx} className="flex gap-8 md:gap-12 items-center break-inside-avoid">
              <img src={proxyImageUrl(item.cover_url)} loading="lazy" className="w-24 h-24 md:w-40 md:h-40 object-cover border-4 border-[#2d3a3e] shadow-[8px_8px_0_rgba(0,0,0,0.1)]" />
              <div>
                <span className="text-sm md:text-lg font-black opacity-20 block mb-1">TRACK {idx + 1}</span>
                <h3 className="text-2xl md:text-4xl font-bold leading-tight">
                  {focus === 'album' ? item.albumTitle : item.itemTitle}
                </h3>
                <p className="text-lg md:text-2xl opacity-60 font-medium">{typeSubtitle(item)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto min-h-screen flex flex-col p-4 md:p-6 print:hidden">
        <header className="flex justify-between items-center py-4 md:py-6 border-b border-th-surface/[0.10]">
          <h2 className="font-label font-bold text-[#dd6e42] tracking-widest text-[10px] md:text-xs uppercase">PLAYLIST STUDIO</h2>
          <button onClick={onClose} className="p-2 text-th-text3 hover:text-th-text transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        {step === 'config' && (
          <>
          {savedPlaylists.length > 0 && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setShowLibrary(!showLibrary)}
                className="text-th-text3 font-label text-[9px] tracking-widest uppercase hover:text-th-text transition-colors"
              >
                MY PLAYLISTS ({savedPlaylists.length})
              </button>
            </div>
          )}
          {showLibrary ? (
            <div className="flex-1 py-8 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-th-text">Saved Playlists</h3>
                <button
                  onClick={() => setShowLibrary(false)}
                  className="text-th-text3 font-label text-[9px] tracking-widest uppercase hover:text-th-text transition-colors"
                >
                  ← BACK
                </button>
              </div>
              <div className="space-y-3">
                {savedPlaylists.map(sp => (
                  <div key={sp.id} className="flex items-center justify-between p-4 rounded-2xl bg-th-surface/[0.04] hover:bg-th-surface/[0.08] transition-all">
                    <button onClick={() => handleLoadSaved(sp)} className="flex-1 text-left min-w-0">
                      <h4 className="text-lg font-bold text-th-text truncate">{sp.name}</h4>
                      <p className="text-xs text-th-text3">{sp.mood} · {sp.items.length} {sp.focus}s · {new Date(sp.created_at).toLocaleDateString()}</p>
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(sp.id)}
                      className="ml-4 p-2 text-th-text3 hover:text-red-400 transition-colors flex-shrink-0"
                      aria-label={`Delete ${sp.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
          <div className="flex-1 flex flex-col justify-center py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-12">
              <section className="flex flex-col items-center">
                <div className="rounded-full bg-th-surface/[0.04] p-1 flex">
                  <button
                    onClick={() => handleModeSwitch('quick')}
                    className={`rounded-full px-6 py-2 font-label text-[10px] tracking-widest uppercase transition-all ${mode === 'quick' ? 'bg-[#c45a30] text-th-text shadow-md' : 'text-th-text3 hover:text-th-text'}`}
                  >
                    Quick Spin
                  </button>
                  <button
                    onClick={() => handleModeSwitch('custom')}
                    className={`rounded-full px-6 py-2 font-label text-[10px] tracking-widest uppercase transition-all ${mode === 'custom' ? 'bg-[#c45a30] text-th-text shadow-md' : 'text-th-text3 hover:text-th-text'}`}
                  >
                    Custom Session
                  </button>
                </div>
                <p className="text-th-text3 text-xs mt-2">
                  {mode === 'quick' ? 'Pick a vibe, we handle the rest' : 'Dial in your perfect session'}
                </p>
              </section>

              {mode === 'custom' && (
                <section>
                  <label className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-4 block">PULL FROM</label>
                  <div className="flex flex-wrap gap-2 md:gap-3">
                    {SOURCE_OPTIONS.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => toggleSource(key)}
                        aria-pressed={selectedSources.includes(key)}
                        className={`rounded-full px-4 py-2 text-sm font-medium border transition-all ${selectedSources.includes(key) ? 'bg-[#8b5cf6] border-[#a78bfa] text-th-text shadow-lg' : 'bg-th-surface/[0.06] border-th-surface/[0.10] text-th-text3 hover:border-th-surface/[0.20]'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {!selectedSources.includes('all') && (
                    <p className="text-xs text-th-text3 mt-2">
                      {filteredAlbums.length} album{filteredAlbums.length !== 1 ? 's' : ''} match your filters
                    </p>
                  )}
                </section>
              )}

              <section>
                <label className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-4 block">WHAT'S THE VIBE?</label>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {MOOD_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => { setMood(chip); setShowCustomMood(false); }}
                      aria-pressed={mood === chip}
                      className={`rounded-full px-4 py-2 text-sm font-medium border transition-all ${
                        chip === 'Surprise Me'
                          ? mood === chip
                            ? 'bg-gradient-to-r from-[#c45a30] to-[#4f6d7a] border-transparent text-th-text shadow-lg'
                            : 'border-dashed border-th-text3/30 text-th-text3 hover:border-th-text3/50'
                          : mood === chip
                            ? 'bg-[#c45a30] border-[#dd6e42] text-th-text shadow-lg'
                            : 'bg-th-surface/[0.06] border-th-surface/[0.10] text-th-text3 hover:border-th-surface/[0.20]'
                      }`}
                    >
                      {chip === 'Surprise Me' ? '🎲 Surprise Me' : chip}
                    </button>
                  ))}
                </div>
                {!showCustomMood ? (
                  <button
                    onClick={() => { setShowCustomMood(true); setMood(''); }}
                    className="mt-3 text-th-text3/60 text-xs hover:text-th-text3 transition-colors"
                  >
                    or type your own...
                  </button>
                ) : (
                  <input
                    type="text"
                    autoFocus
                    value={MOOD_CHIPS.includes(mood) ? '' : mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="e.g. Late Night Jazz, 80s Disco..."
                    className="mt-4 w-full bg-th-surface/[0.04] border-b-2 border-th-surface/[0.10] text-xl md:text-3xl font-bold text-th-text focus:border-[#dd6e42] transition-all outline-none py-3 placeholder:text-th-text3/70"
                  />
                )}
              </section>

              {mode === 'custom' && availableGenres.length > 0 && (
                <section>
                  <label className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-1 block">NARROW BY GENRE</label>
                  <p className="text-th-text3/50 text-[9px] mb-4">(optional — tap to filter)</p>
                  <div className="flex flex-wrap gap-2 md:gap-3">
                    {availableGenres.map(({ genre, count }) => (
                      <button
                        key={genre}
                        onClick={() => setSelectedGenres(prev =>
                          prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
                        )}
                        aria-pressed={selectedGenres.includes(genre)}
                        className={`rounded-full px-4 py-2 text-sm font-medium border transition-all ${selectedGenres.includes(genre) ? 'bg-[#4f6d7a] border-[#6a8c9a] text-th-text shadow-lg' : 'bg-th-surface/[0.06] border-th-surface/[0.10] text-th-text3 hover:border-th-surface/[0.20]'}`}
                      >
                        {genre} ({count})
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {mode === 'custom' && (
                <section>
                  <label className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-4 block">HOW LONG?</label>
                  <div className="flex flex-wrap gap-2 md:gap-3">
                    {DURATION_OPTIONS.map(({ label, minutes }) => (
                      <button
                        key={label}
                        onClick={() => setTargetMinutes(minutes)}
                        aria-pressed={targetMinutes === minutes}
                        className={`rounded-full px-4 py-2 text-sm font-medium border transition-all ${targetMinutes === minutes ? 'bg-[#dd6e42] border-[#dd6e42] text-th-text shadow-lg' : 'bg-th-surface/[0.06] border-th-surface/[0.10] text-th-text3 hover:border-th-surface/[0.20]'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {mode === 'custom' && (
                <section>
                  <label className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-4 block">SELECT FOCUS</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    {([
                      { key: 'album' as const, desc: 'Full records, front to back', hint: '(up to 8 albums)' },
                      { key: 'side' as const, desc: 'Curate by Side A or Side B', hint: '(up to 12 sides)' },
                      { key: 'song' as const, desc: 'Individual track picks', hint: '(up to 15 songs)' },
                    ]).map(({ key, desc, hint }) => (
                      <button
                        key={key}
                        onClick={() => setFocus(key)}
                        className={`p-5 md:p-6 rounded-2xl border text-left transition-all ${focus === key ? 'bg-[#c45a30] border-[#dd6e42] text-th-text shadow-xl scale-[1.02]' : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text3 hover:border-th-surface/[0.15]'}`}
                      >
                        <h4 className="font-label text-[10px] md:text-xs tracking-widest uppercase font-bold mb-1">{key}s</h4>
                        <p className="text-[9px] md:text-[10px] opacity-60">{desc}</p>
                        <p className="text-[8px] md:text-[9px] opacity-40 mt-1">{hint}</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <button
                onClick={handleGenerate}
                disabled={!mood.trim() || filteredAlbums.length === 0}
                className="w-full py-5 md:py-6 rounded-full bg-gradient-to-r from-[#c45a30] to-[#4f6d7a] text-th-text font-label tracking-[0.3em] font-bold text-[10px] md:text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-2xl disabled:opacity-30 border border-th-surface/[0.15]"
              >
                CURATE SELECTION
              </button>
            </div>
          </div>
          )}
          </>
        )}

        {step === 'player' && playlist && (
          <div className="flex-1 flex flex-col items-center justify-center py-6 md:py-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="w-full max-w-lg">
              <div className="aspect-square relative mb-8 md:mb-12">
                 <div className="absolute inset-0 bg-[#dd6e42]/10 blur-[100px] rounded-full animate-pulse"></div>
                 <img
                  key={currentItem?.cover_url}
                  src={proxyImageUrl(currentItem?.cover_url)}
                  loading="lazy"
                  className="w-full h-full object-cover rounded-md shadow-[0_0_80px_rgba(0,0,0,0.8)] relative z-10 transition-all duration-1000 transform hover:scale-105"
                />
                <div className="absolute -bottom-4 -right-4 z-20 bg-[#4f6d7a] text-th-text px-4 py-1.5 md:px-6 md:py-2 rounded-full font-label text-[9px] md:text-[10px] tracking-widest font-bold shadow-xl">
                  {currentIndex + 1} / {playlist.items.length}
                </div>
              </div>

              <div className="text-center space-y-3 md:space-y-4 mb-8 md:mb-12 px-4">
                <span className="text-[#dd6e42] font-label text-[9px] md:text-[10px] tracking-widest uppercase font-bold">{focus} curation</span>
                <h3 className="text-2xl md:text-4xl font-bold text-th-text leading-tight break-words">
                  {focus === 'album' ? currentItem?.albumTitle : currentItem?.itemTitle}
                </h3>
                <p className="text-lg md:text-xl text-th-text2 font-medium truncate">
                  {currentItem && typeSubtitle(currentItem)}
                </p>
              </div>

              <div className="flex items-center justify-center gap-6 md:gap-8">
                <button
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-th-surface/[0.10] flex items-center justify-center text-th-text3 hover:text-th-text hover:border-th-text disabled:opacity-10 transition-all active:scale-90"
                >
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  onClick={() => setCurrentIndex(prev => Math.min(playlist.items.length - 1, prev + 1))}
                  disabled={currentIndex === playlist.items.length - 1}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-th-text text-th-bg flex items-center justify-center hover:bg-[#dd6e42] hover:text-th-text transition-all shadow-xl active:scale-90"
                >
                  <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            <div className="mt-auto pt-8 md:pt-12 flex gap-4">
              <button
                onClick={() => setStep('manifest')}
                className="text-th-text3 font-label text-[9px] tracking-widest uppercase hover:text-th-text transition-colors"
              >
                Manifest
              </button>
              <span className="text-th-text3/30">|</span>
              <button
                onClick={handleSave}
                disabled={isSaving || isSaved}
                className={`font-label text-[9px] tracking-widest uppercase transition-colors ${
                  isSaved ? 'text-[#c45a30]' : 'text-th-text3 hover:text-th-text'
                }`}
              >
                {isSaved ? '✓ SAVED' : isSaving ? 'SAVING...' : 'SAVE'}
              </button>
              <span className="text-th-text3/30">|</span>
              <button
                onClick={() => setStep('config')}
                className="text-th-text3 font-label text-[9px] tracking-widest uppercase hover:text-th-text transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {step === 'manifest' && playlist && (
          <div className="flex-1 py-8 md:py-12 animate-in fade-in slide-in-from-right-4 duration-500">
            <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <h3 className="text-3xl md:text-5xl font-black text-th-text uppercase mb-2 leading-none">{playlist.name}</h3>
                <p className="text-th-text3 text-sm md:text-lg">The {playlist.mood} curation</p>
              </div>
              <button
                onClick={handlePrint}
                className="w-full md:w-auto bg-[#4f6d7a] hover:bg-[#6a8c9a] text-th-text font-label text-[10px] tracking-widest font-bold px-8 py-4 rounded-full flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-transform"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                SAVE PDF
              </button>
            </header>

            <div className="space-y-3">
              {playlist.items.map((item, idx) => (
                <div key={idx} className="group flex items-center gap-4 md:gap-6 p-3 md:p-4 rounded-2xl hover:bg-th-surface/[0.04] transition-all">
                  <span className="font-label text-th-text3/30 text-lg md:text-xl font-black w-8 md:w-12">{idx + 1}</span>
                  <img src={proxyImageUrl(item.cover_url)} loading="lazy" className="w-16 h-16 md:w-20 md:h-20 rounded-md object-cover shadow-lg flex-shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-sm md:text-xl font-bold text-th-text group-hover:text-[#dd6e42] transition-colors truncate">
                      {focus === 'album' ? item.albumTitle : item.itemTitle}
                    </h4>
                    <p className="text-xs md:text-sm text-th-text3 font-medium truncate">{typeSubtitle(item)}</p>
                    {item.reason && (
                      <p className="text-xs text-[#dd6e42]/70 italic mt-1 truncate">
                        "{item.reason}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 md:mt-12">
               <button
                onClick={() => setStep('player')}
                className="text-[#6a8c9a] font-label text-[9px] tracking-widest uppercase hover:text-th-text transition-colors flex items-center gap-2 py-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to Player
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistStudio;
