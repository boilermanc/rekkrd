
import React, { useState } from 'react';
import { Album, Playlist, PlaylistItem } from '../types';
import { geminiService } from '../services/geminiService';
import SpinningRecord from './SpinningRecord';
import { proxyImageUrl } from '../services/imageProxy';

interface PlaylistStudioProps {
  albums: Album[];
  onClose: () => void;
}

const PlaylistStudio: React.FC<PlaylistStudioProps> = ({ albums, onClose }) => {
  const [step, setStep] = useState<'config' | 'loading' | 'player' | 'manifest'>('config');
  const [mood, setMood] = useState('');
  const [focus, setFocus] = useState<'album' | 'side' | 'song'>('song');
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleGenerate = async () => {
    if (!mood.trim()) return;
    setStep('loading');
    try {
      const result = await geminiService.generatePlaylist(albums, mood, focus);
      if (result.items.length === 0) {
        alert("No tracks matched that vibe. Try a different mood!");
        setStep('config');
        return;
      }
      setPlaylist(result);
      setStep('player');
    } catch (error) {
      alert("The Vibe Engine hit a snag. Try again!");
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
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8">
        <SpinningRecord size="w-48 h-48 md:w-64 md:h-64" labelColor="bg-indigo-600" />
        <div className="mt-12 text-center">
          <h2 className="font-syncopate text-white text-lg md:text-xl tracking-widest animate-pulse mb-2 uppercase">CRATING THE VIBE</h2>
          <p className="text-white/40 text-xs md:text-sm">Browsing your crate for "{mood}"...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl overflow-y-auto overflow-x-hidden">
      {/* High-Performance Printable Manifest */}
      <div className="hidden print:block bg-white text-black p-8 md:p-12 min-h-screen">
        <div className="flex justify-between items-end border-b-4 border-black pb-8 mb-12">
          <div>
            <h1 className="text-4xl md:text-6xl font-black uppercase mb-2 leading-none">{playlist?.name}</h1>
            <p className="text-lg md:text-2xl text-black/60 font-medium">Listening Guide: {playlist?.mood}</p>
          </div>
          <p className="text-xs font-black opacity-30 uppercase tracking-[0.3em] whitespace-nowrap">CROWE COLLECTION ARCHIVE</p>
        </div>
        <div className="space-y-12">
          {playlist?.items.map((item, idx) => (
            <div key={idx} className="flex gap-8 md:gap-12 items-center break-inside-avoid">
              <img src={proxyImageUrl(item.cover_url)} className="w-24 h-24 md:w-40 md:h-40 object-cover border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,0.1)]" />
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
        <header className="flex justify-between items-center py-4 md:py-6 border-b border-white/10">
          <h2 className="font-syncopate font-bold text-pink-500 tracking-widest text-[10px] md:text-xs uppercase">PLAYLIST STUDIO</h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        {step === 'config' && (
          <div className="flex-1 flex flex-col justify-center py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-12">
              <section>
                <label className="text-white/40 font-syncopate text-[9px] tracking-widest uppercase mb-4 block">WHAT'S THE OCCASION?</label>
                <input 
                  type="text" 
                  autoFocus
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder="e.g. Late Night Jazz, 80s Disco..."
                  className="w-full bg-white/5 border-b-2 border-white/10 text-2xl md:text-5xl font-bold text-white focus:border-pink-500 transition-all outline-none py-4 placeholder:text-white/30"
                />
              </section>

              <section>
                <label className="text-white/40 font-syncopate text-[9px] tracking-widest uppercase mb-4 block">SELECT FOCUS</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                  {([
                    { key: 'album' as const, desc: 'Full records, front to back', hint: '(up to 8 albums)' },
                    { key: 'side' as const, desc: 'Curate by Side A or Side B', hint: '(up to 12 sides)' },
                    { key: 'song' as const, desc: 'Individual track picks', hint: '(up to 15 songs)' },
                  ]).map(({ key, desc, hint }) => (
                    <button
                      key={key}
                      onClick={() => setFocus(key)}
                      className={`p-5 md:p-6 rounded-2xl border text-left transition-all ${focus === key ? 'bg-pink-600 border-pink-500 text-white shadow-xl scale-[1.02]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                    >
                      <h4 className="font-syncopate text-[10px] md:text-xs tracking-widest uppercase font-bold mb-1">{key}s</h4>
                      <p className="text-[9px] md:text-[10px] opacity-60">{desc}</p>
                      <p className="text-[8px] md:text-[9px] opacity-40 mt-1">{hint}</p>
                    </button>
                  ))}
                </div>
              </section>

              <button 
                onClick={handleGenerate}
                disabled={!mood.trim()}
                className="w-full py-5 md:py-6 rounded-full bg-gradient-to-r from-pink-600 to-indigo-600 text-white font-syncopate tracking-[0.3em] font-bold text-[10px] md:text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-2xl disabled:opacity-30 border border-white/20"
              >
                CURATE SELECTION
              </button>
            </div>
          </div>
        )}

        {step === 'player' && playlist && (
          <div className="flex-1 flex flex-col items-center justify-center py-6 md:py-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="w-full max-w-lg">
              <div className="aspect-square relative mb-8 md:mb-12">
                 <div className="absolute inset-0 bg-pink-500/10 blur-[100px] rounded-full animate-pulse"></div>
                 <img 
                  key={currentItem?.cover_url}
                  src={proxyImageUrl(currentItem?.cover_url)} 
                  className="w-full h-full object-cover rounded-md shadow-[0_0_80px_rgba(0,0,0,0.8)] relative z-10 transition-all duration-1000 transform hover:scale-105" 
                />
                <div className="absolute -bottom-4 -right-4 z-20 bg-indigo-600 text-white px-4 py-1.5 md:px-6 md:py-2 rounded-full font-syncopate text-[9px] md:text-[10px] tracking-widest font-bold shadow-xl">
                  {currentIndex + 1} / {playlist.items.length}
                </div>
              </div>

              <div className="text-center space-y-3 md:space-y-4 mb-8 md:mb-12 px-4">
                <span className="text-pink-500 font-syncopate text-[9px] md:text-[10px] tracking-widest uppercase font-bold">{focus} curation</span>
                <h3 className="text-2xl md:text-4xl font-bold text-white leading-tight break-words">
                  {focus === 'album' ? currentItem?.albumTitle : currentItem?.itemTitle}
                </h3>
                <p className="text-lg md:text-xl text-white/60 font-medium truncate">
                  {currentItem && typeSubtitle(currentItem)}
                </p>
              </div>

              <div className="flex items-center justify-center gap-6 md:gap-8">
                <button 
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white disabled:opacity-10 transition-all active:scale-90"
                >
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button 
                  onClick={() => setCurrentIndex(prev => Math.min(playlist.items.length - 1, prev + 1))}
                  disabled={currentIndex === playlist.items.length - 1}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white text-black flex items-center justify-center hover:bg-pink-500 hover:text-white transition-all shadow-xl active:scale-90"
                >
                  <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            <div className="mt-auto pt-8 md:pt-12 flex gap-4">
              <button 
                onClick={() => setStep('manifest')}
                className="text-white/40 font-syncopate text-[9px] tracking-widest uppercase hover:text-white transition-colors"
              >
                Manifest
              </button>
              <span className="text-white/10">|</span>
              <button 
                onClick={() => setStep('config')}
                className="text-white/40 font-syncopate text-[9px] tracking-widest uppercase hover:text-white transition-colors"
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
                <h3 className="text-3xl md:text-5xl font-black text-white uppercase mb-2 leading-none">{playlist.name}</h3>
                <p className="text-white/40 text-sm md:text-lg">The {playlist.mood} curation</p>
              </div>
              <button 
                onClick={handlePrint}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-syncopate text-[10px] tracking-widest font-bold px-8 py-4 rounded-full flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-transform"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                SAVE PDF
              </button>
            </header>

            <div className="space-y-3">
              {playlist.items.map((item, idx) => (
                <div key={idx} className="group flex items-center gap-4 md:gap-6 p-3 md:p-4 rounded-2xl hover:bg-white/5 transition-all">
                  <span className="font-syncopate text-white/10 text-lg md:text-xl font-black w-8 md:w-12">{idx + 1}</span>
                  <img src={proxyImageUrl(item.cover_url)} className="w-16 h-16 md:w-20 md:h-20 rounded-md object-cover shadow-lg flex-shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-sm md:text-xl font-bold text-white group-hover:text-pink-500 transition-colors truncate">
                      {focus === 'album' ? item.albumTitle : item.itemTitle}
                    </h4>
                    <p className="text-xs md:text-sm text-white/40 font-medium truncate">{typeSubtitle(item)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 md:mt-12">
               <button 
                onClick={() => setStep('player')}
                className="text-indigo-400 font-syncopate text-[9px] tracking-widest uppercase hover:text-white transition-colors flex items-center gap-2 py-4"
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
