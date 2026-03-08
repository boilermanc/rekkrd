
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Album } from '../types';
import { proxyImageUrl } from '../services/imageProxy';
import { geminiService } from '../services/geminiService';
import { supabase, getCurrentUserId } from '../services/supabaseService';
import { compressImage } from '../utils/imageCompressor';
import SpinningRecord from './SpinningRecord';
import CoverPicker from './CoverPicker';
import FormatBadge from './FormatBadge';
import MyCopyTab from './MyCopyTab';
import { useToast } from '../contexts/ToastContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { engagementService } from '../services/engagementService';
import { getAlbumPlacementInfo, type PlacementResult } from '../helpers/shelfHelpers';
import { MEDIA_FORMATS, FORMAT_COLORS, type MediaFormat } from '../../constants/formatTypes';
import EbayPricingPanel from './EbayPricingPanel';

interface PressingResult {
  id: number;
  title: string;
  year: number | null;
  country: string | null;
  label: string | null;
  catno: string | null;
  format: string | null;
  thumb: string | null;
  discogsUrl: string;
  score: number;
  matchedText: string | null;
}

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
  onMoreLikeThis?: (album: Album) => void;
  onAddToWantlist?: (album: Album) => void;
  discogsConnected?: boolean;
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
  onMoreLikeThis,
  onAddToWantlist,
  discogsConnected = false,
}) => {
  const { showToast } = useToast();
  const { plan } = useSubscription();
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);
  const [notes, setNotes] = useState(album.personal_notes || '');
  const [matrix, setMatrix] = useState(album.matrix || '');
  const [showMatrixTip, setShowMatrixTip] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [pressingResults, setPressingResults] = useState<PressingResult[] | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null);
  const [lyricsCache, setLyricsCache] = useState<Record<number, { lyrics: string | null; syncedLyrics: string | null }>>({});
  const [loadingTrack, setLoadingTrack] = useState<number | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [displayCoverUrl, setDisplayCoverUrl] = useState(album.cover_url);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const hasLoggedTracklistExpand = useRef(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinRecorded, setSpinRecorded] = useState(false);
  const [shelfPlacement, setShelfPlacement] = useState<PlacementResult | null>(null);
  const [hasShelfConfig, setHasShelfConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'my-copy'>('about');

  useEffect(() => {
    if (album?.id) {
      void engagementService.logEvent(album.id, 'album_open');
    }
  }, [album?.id]);

  // Fetch shelf placement info
  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId || !album?.id) return;
    let cancelled = false;
    getAlbumPlacementInfo(album, allAlbums, userId).then(result => {
      if (cancelled) return;
      if (result) {
        setShelfPlacement(result);
        setHasShelfConfig(true);
      } else if (album.shelf_unit) {
        // No config but album has saved assignment
        setShelfPlacement(null);
        setHasShelfConfig(false);
      }
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [album?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    hasLoggedTracklistExpand.current = false;
  }, [album?.id]);

  useEffect(() => {
    let cancelled = false;
    const checkSpinning = async () => {
      const spinningId = await engagementService.getNowSpinning();
      if (!cancelled) setIsSpinning(spinningId === album?.id);
    };
    if (album?.id) checkSpinning();
    return () => { cancelled = true; };
  }, [album?.id]);

  const handleNowSpinning = async () => {
    if (!album?.id) return;
    if (isSpinning) {
      await engagementService.clearNowSpinning();
      setIsSpinning(false);
      showToast('Stopped spinning', 'info');
    } else {
      try {
        await engagementService.setNowSpinning(album.id);
        await engagementService.recordSpin(album.id);
        setIsSpinning(true);
        // Update local play_count immediately
        const newPlayCount = (album.play_count || 0) + 1;
        onUpdateAlbum?.(album.id, { play_count: newPlayCount });
        // Brief visual feedback
        setSpinRecorded(true);
        setTimeout(() => setSpinRecorded(false), 1200);
        showToast('Spin recorded! 🎶', 'success');
      } catch (error) {
        console.error('Failed to record spin:', error);
        showToast('Failed to record spin', 'error');
      }
    }
  };

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

    if (!hasLoggedTracklistExpand.current) {
      void engagementService.logEvent(album.id, 'tracklist_expand');
      hasLoggedTracklistExpand.current = true;
    }

    if (lyricsCache[index] !== undefined) return;

    void engagementService.logEvent(album.id, 'lyrics_lookup');
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

  const handlePressingLookup = async () => {
    if (!matrix) return;
    setLookupLoading(true);
    setPressingResults(null);
    setLookupError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }
      const res = await fetch('/api/discogs-pressing', {
        method: 'POST',
        headers,
        body: JSON.stringify({ artist: album.artist, title: album.title, matrix }),
      });
      if (!res.ok) throw new Error('Lookup failed');
      const data = await res.json();
      setPressingResults(data);
    } catch {
      setLookupError('Could not fetch pressing info. Try again.');
      showToast('Pressing lookup failed', 'error');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleApplyPressing = (r: PressingResult) => {
    if (!onUpdateAlbum) return;
    const updates: Partial<Album> = {};
    if (!album.year && r.year) updates.year = String(r.year);
    if (!album.discogs_release_id && r.id) {
      updates.discogs_release_id = r.id;
      updates.discogs_url = r.discogsUrl;
    }

    if (Object.keys(updates).length === 0) {
      showToast('All fields already filled — nothing to apply.', 'info');
      return;
    }

    onUpdateAlbum(album.id, updates);
    setPressingResults(null);
    showToast('Pressing details applied.', 'success');
  };

  const relatedAlbums = useMemo(() => {
    return allAlbums
      .filter(a => a.id !== album.id && (a.genre === album.genre || a.artist === album.artist))
      .slice(0, 10);
  }, [allAlbums, album]);


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

  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    // Reset input so re-selecting the same file still triggers onChange
    e.target.value = '';

    setUploadingCover(true);
    const previousCoverUrl = displayCoverUrl;
    try {
      // Read file as base64
      const rawBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const commaIdx = result.indexOf(',');
          resolve(commaIdx !== -1 ? result.slice(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      // Compress: 800px max, 0.85 quality for cover art
      const compressed = await compressImage(rawBase64, file.type || 'image/jpeg', { maxSize: 800, quality: 0.85 });

      // Convert back to Blob for Supabase upload
      const byteChars = atob(compressed.base64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: compressed.mimeType });

      const fileName = `covers/${album.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('album-photos')
        .upload(fileName, blob, { contentType: compressed.mimeType, upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('album-photos')
        .getPublicUrl(fileName);

      setDisplayCoverUrl(publicUrl);
      if (onUpdateAlbum) {
        await onUpdateAlbum(album.id, { cover_url: publicUrl });
      }
      showToast('Cover art updated', 'success');
    } catch (err) {
      console.error('Cover file upload failed:', err);
      setDisplayCoverUrl(previousCoverUrl);
      showToast('Failed to upload cover art', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${album.title} by ${album.artist}`} className="fixed inset-0 z-[60] flex items-center justify-center bg-th-bg/95 p-2 md:p-8 backdrop-blur-xl animate-in fade-in duration-300 outline-none">
      <div className="relative w-full max-w-6xl max-h-[98vh] md:max-h-[95vh] glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] flex flex-col md:flex-row animate-in zoom-in-95 duration-500">

        <button onClick={onClose} className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-th-bg/50 text-th-text flex items-center justify-center hover:bg-th-text hover:text-th-bg transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Mobile: styled album name header instead of cover image */}
        <div className="md:hidden w-full bg-th-bg relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2a2016] via-[#3d2e1e] to-[#1a1510]" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(221,110,66,0.3), transparent 60%), radial-gradient(circle at 70% 60%, rgba(232,218,178,0.15), transparent 50%)' }} />
          {/* Record watermark */}
          <svg className="absolute -right-10 -bottom-10 w-52 h-52 text-[#e8dab2] opacity-[0.04]" viewBox="0 0 200 200" fill="currentColor">
            <circle cx="100" cy="100" r="98" />
            <circle cx="100" cy="100" r="80" fill="#2a2016" />
            <circle cx="100" cy="100" r="78" fill="currentColor" />
            <circle cx="100" cy="100" r="60" fill="#2a2016" />
            <circle cx="100" cy="100" r="58" fill="currentColor" />
            <circle cx="100" cy="100" r="40" fill="#2a2016" />
            <circle cx="100" cy="100" r="38" fill="currentColor" />
            <circle cx="100" cy="100" r="22" fill="#2a2016" />
            <circle cx="100" cy="100" r="20" fill="currentColor" />
            <circle cx="100" cy="100" r="6" fill="#2a2016" />
          </svg>
          <div className="relative px-6 pt-14 pb-8 flex flex-col items-center text-center">
            <span className="text-[#e8dab2]/50 font-mono text-[9px] tracking-[4px] uppercase mb-3">{album.genre || 'Vinyl'}</span>
            <h2 className="text-2xl font-bold text-[#e8dab2] leading-tight mb-2">{album.title}</h2>
            <h3 className="text-base text-[#e8dab2]/80 font-medium">{album.artist}</h3>
            <div className="flex items-center gap-2 mt-3">
              {album.year && <span className="text-[#e8dab2]/50 font-mono text-[10px] tracking-wider">{album.year}</span>}
              {album.year && album.label && <span className="text-[#e8dab2]/40">·</span>}
              {album.label && <span className="text-[#e8dab2]/50 font-mono text-[10px] tracking-wider">{album.label}</span>}
            </div>
          </div>
        </div>

        {/* Desktop: cover image panel */}
        <div className="hidden md:flex w-5/12 overflow-hidden bg-th-bg items-center justify-center p-12 relative flex-shrink-0">
             <button onClick={() => {
               if (!canUseCovers) {
                 onUpgradeRequired?.('covers');
                 return;
               }
               if (!uploadingCover) {
                 setShowCoverPicker(true);
                 void engagementService.logEvent(album.id, 'cover_view');
               }
             }} className="relative group cursor-pointer z-10">
               <img src={proxyImageUrl(displayCoverUrl)} alt={album.title && album.artist ? `Album cover for ${album.title} by ${album.artist}` : album.title ? `Album cover for ${album.title}` : 'Album cover'} loading="lazy" decoding="async" className={`w-full h-auto object-contain rounded-md shadow-[0_0_100px_rgba(0,0,0,0.8)] transition-opacity ${uploadingCover ? 'opacity-50' : ''}`} />
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
             {/* Upload cover from device */}
             <input
               ref={coverFileRef}
               type="file"
               accept="image/jpeg,image/png,image/webp"
               onChange={handleCoverFileUpload}
               className="hidden"
             />
             <button
               type="button"
               onClick={(e) => { e.stopPropagation(); coverFileRef.current?.click(); }}
               disabled={uploadingCover}
               aria-label="Change cover art"
               className="absolute bottom-8 right-8 z-20 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all active:scale-95 shadow-lg"
             >
               {uploadingCover ? (
                 <SpinningRecord size="w-5 h-5" />
               ) : (
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                 </svg>
               )}
             </button>
             <div className="absolute -bottom-10 -left-10 text-[80px] md:text-[120px] font-label font-black text-th-text/5 select-none pointer-events-none uppercase whitespace-nowrap">
               {album.genre?.split(' ')[0]}
             </div>
        </div>

        <div className="w-full md:w-7/12 p-6 md:p-12 overflow-y-auto bg-th-surface/[0.02] custom-scrollbar">
          <header className="hidden md:block mb-8">
            <div className="flex items-center gap-2 mb-3">
              <FormatBadge format={album.format} size="sm" />
              {album.genre && (
                <>
                  <span className="text-th-text3/70">•</span>
                  <span className="text-[#dd6e42] font-label text-[9px] tracking-[0.2em] font-bold uppercase">{album.genre}</span>
                </>
              )}
              <span className="text-th-text3/70">•</span>
              <span className="text-th-text3 font-label text-[9px] tracking-[0.2em] uppercase">{album.year}</span>
              {album.shelf_unit ? (
                <>
                  <span className="text-th-text3/70">•</span>
                  <span
                    className="text-[#4f6d7a] font-label text-[9px] tracking-[0.2em] font-bold uppercase"
                    aria-label={`Shelved in section ${album.shelf_unit}`}
                  >
                    Section {album.shelf_unit}
                  </span>
                </>
              ) : hasShelfConfig && shelfPlacement ? (
                <>
                  <span className="text-th-text3/70">•</span>
                  <span
                    className="text-th-text3/60 font-label text-[9px] tracking-[0.2em] uppercase"
                    aria-label="Not yet assigned to a shelf section"
                  >
                    Not shelved
                  </span>
                </>
              ) : null}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-th-text mb-2 leading-tight">{album.title}</h2>
            <h3 className="text-xl text-th-text2 font-medium">{album.artist}</h3>
          </header>

          {/* Tab Bar */}
          <div className="bg-[#f5efe3] border-b border-[#ddd4be] -mx-6 md:-mx-12 px-6 md:px-8" role="tablist">
            <div className="flex">
              <button
                id="about-tab"
                role="tab"
                aria-selected={activeTab === 'about'}
                aria-controls="about-panel"
                onClick={() => setActiveTab('about')}
                className={`py-4 px-5 font-mono text-[11px] tracking-[2.5px] uppercase border-b-2 -mb-px cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2 ${
                  activeTab === 'about'
                    ? 'text-burnt-peach border-burnt-peach'
                    : 'text-[#9a8f80] border-transparent hover:text-[#7a6f60]'
                }`}
              >
                About
              </button>
              <button
                id="my-copy-tab"
                role="tab"
                aria-selected={activeTab === 'my-copy'}
                aria-controls="my-copy-panel"
                onClick={() => setActiveTab('my-copy')}
                className={`py-4 px-5 font-mono text-[11px] tracking-[2.5px] uppercase border-b-2 -mb-px cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2 ${
                  activeTab === 'my-copy'
                    ? 'text-burnt-peach border-burnt-peach'
                    : 'text-[#9a8f80] border-transparent hover:text-[#7a6f60]'
                }`}
              >
                My Copy
              </button>
            </div>
          </div>

          {/* About Tab Panel */}
          <div id="about-panel" role="tabpanel" aria-labelledby="about-tab" className={activeTab === 'about' ? 'space-y-12' : 'hidden'}>
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
                  <p className="text-th-text3/70 text-[9px] uppercase tracking-widest mb-1">Low</p>
                  <p className="text-xl font-bold text-th-text2">${Math.round(album.price_low || 0)}</p>
                </div>
                <div className="bg-[#dd6e42]/10 p-3 rounded-xl border border-[#dd6e42]/20">
                  <p className="text-[#f0a882] text-[9px] uppercase tracking-widest mb-1 font-bold">Median</p>
                  <p className="text-3xl font-black text-th-text">${Math.round(album.price_median || 0)}</p>
                </div>
                <div>
                  <p className="text-th-text3/70 text-[9px] uppercase tracking-widest mb-1">High</p>
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
                <div className="flex justify-between text-[9px] text-th-text3/70 uppercase tracking-widest mt-2">
                  <span>Common Sale</span>
                  <span>Market Avg</span>
                  <span>Premium Press</span>
                </div>
              </div>
            </section>

            {/* eBay Listings */}
            <EbayPricingPanel query={`${album.artist} ${album.title} vinyl record`} />

            {/* Quick Actions */}
            <section className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => onToggleFavorite?.(album.id)} className={`flex-1 font-bold py-4 rounded-xl transition-all uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-4 ${album.isFavorite ? 'bg-[#dd6e42] text-th-text' : 'bg-th-text text-th-bg hover:bg-emerald-500 hover:text-th-text'}`}>
                <svg className={`w-4 h-4 ${album.isFavorite ? 'fill-current' : ''}`} viewBox="0 0 24 24" fill={album.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {album.isFavorite ? 'Favorited' : 'Add to Favorites'}
              </button>
              <button
                onClick={handleNowSpinning}
                aria-pressed={isSpinning}
                className={`flex items-center justify-center gap-3 flex-1 py-4 rounded-xl font-label text-[10px] tracking-widest uppercase font-bold transition-all active:scale-95 ${
                  spinRecorded
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                    : isSpinning
                    ? 'bg-[#c45a30] text-th-text shadow-lg shadow-[#c45a30]/30 animate-pulse'
                    : 'bg-th-surface/[0.08] border border-th-surface/[0.15] text-th-text3 hover:text-th-text hover:border-th-text'
                }`}
              >
                <svg className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} style={isSpinning ? { animationDuration: '2s' } : undefined} viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" fill="currentColor"/>
                </svg>
                {spinRecorded ? 'Spin Logged!' : isSpinning ? 'Spinning' : 'Now Spinning'}
              </button>

              <button
                onClick={() => onMoreLikeThis?.(album)}
                className="flex items-center justify-center gap-3 flex-1 py-4 rounded-xl bg-th-surface/[0.08] border border-th-surface/[0.15] text-th-text3 hover:text-th-text hover:border-th-text font-label text-[10px] tracking-widest uppercase font-bold transition-all active:scale-95"
                aria-label={`Build a session around ${album.title}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                SESSION
              </button>
              {onAddToWantlist && !album.created_at && (
                <button
                  onClick={() => onAddToWantlist(album)}
                  className="flex items-center justify-center gap-3 flex-1 py-4 rounded-xl bg-th-surface/[0.08] border border-th-surface/[0.15] text-th-text3 hover:text-th-text hover:border-th-text font-label text-[10px] tracking-widest uppercase font-bold transition-all active:scale-95"
                  aria-label={`Add ${album.title} to wantlist`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Wantlist
                </button>
              )}
            </section>

            {/* Collector's Context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-morphism p-6 rounded-2xl border border-th-surface/[0.06] space-y-6">
                <h5 className="text-th-text3 text-[9px] uppercase tracking-widest border-b border-th-surface/[0.06] pb-2">Archive Analytics</h5>
                <div className="grid grid-cols-2 gap-y-6">
                  <div>
                    <p className="text-th-text3/70 text-[9px] uppercase mb-1">Spins</p>
                    <p className="text-2xl font-bold text-th-text">{album.play_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-th-text3/70 text-[9px] uppercase mb-1">Added</p>
                    <p className="text-sm font-bold text-th-text">{formatDate(album.created_at)}</p>
                  </div>
                  {album.barcode && (
                    <div>
                      <p className="text-th-text3/70 text-[9px] uppercase mb-1">Barcode</p>
                      <p className="text-sm font-bold text-th-text font-mono">{album.barcode}</p>
                    </div>
                  )}
                  {album.matrix && (
                    <div>
                      <p className="text-th-text3/70 text-[9px] uppercase mb-1">Deadwax</p>
                      <p className="text-sm font-bold text-th-text font-mono">{album.matrix}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Narrative & Tracklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <section>
                <h4 className="text-th-text3 text-[9px] font-label tracking-[0.3em] uppercase mb-4">The Narrative</h4>
                <p className="text-th-text/85 leading-relaxed italic text-sm">"{album.description || 'A sonic journey waiting to be explored.'}"</p>
              </section>
              {album.tracklist && (
                <section>
                  <h4 className="text-th-text3 text-[9px] font-label tracking-[0.3em] uppercase mb-4">Manifest</h4>
                  <div className="space-y-0">
                    {album.tracklist.map((t, i) => (
                      <div key={i}>
                        <button
                          onClick={() => handleTrackClick(i, t)}
                          className="w-full text-left flex items-center gap-2 text-[10px] py-1.5 text-th-text2 hover:text-th-text border-b border-th-surface/[0.06] transition-colors group"
                        >
                          <svg className="w-3 h-3 flex-shrink-0 text-th-text3/70 group-hover:text-[#f0a882] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                          <span className="truncate flex-1">{t}</span>
                          <svg className={`w-3 h-3 flex-shrink-0 text-th-text3/70 transition-transform duration-200 ${expandedTrack === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                <h4 className="text-th-text3 text-[9px] font-label tracking-[0.3em] uppercase mb-4">Tags</h4>
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

            {/* Format */}
            {onUpdateAlbum && (
              <section>
                <h4 className="text-th-text3 text-[9px] font-label tracking-[0.3em] uppercase mb-4">Format</h4>
                <div className="flex gap-2">
                  {MEDIA_FORMATS.map(f => (
                    <button
                      key={f}
                      onClick={() => onUpdateAlbum(album.id, { format: f })}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        (album.format || 'Vinyl') === f
                          ? 'border-current'
                          : 'border-th-surface/[0.10] opacity-50 hover:opacity-80'
                      }`}
                      style={{
                        color: (album.format || 'Vinyl') === f
                          ? FORMAT_COLORS[f]
                          : undefined,
                        backgroundColor: (album.format || 'Vinyl') === f
                          ? `${FORMAT_COLORS[f]}15`
                          : undefined,
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Personal Notes */}
            {onUpdateAlbum && (
              <section>
                <h4 className="text-th-text3 text-[9px] font-label tracking-[0.3em] uppercase mb-4">Personal Notes</h4>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your notes about this record..."
                  className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3 text-sm text-th-text/90 placeholder:text-th-text3/60 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50 resize-none"
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

            {/* Deadwax / Matrix */}
            {onUpdateAlbum && (
              <section>
                <div className="flex items-center gap-1.5 mb-4">
                  <h4 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase">Deadwax / Matrix</h4>
                  <div className="relative">
                    <button
                      type="button"
                      className="text-th-muted cursor-help text-xs"
                      aria-label="What is deadwax?"
                      onClick={() => setShowMatrixTip(v => !v)}
                    >
                      ⓘ
                    </button>
                    {showMatrixTip && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-th-surface border border-th-surface/20 p-2.5 text-xs text-th-muted shadow-lg z-10">
                        The etching scratched into the runout groove of a vinyl record.
                        Identifies the specific pressing — e.g. BSK-3010 1A TML-M.
                      </div>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={matrix}
                  onChange={(e) => setMatrix(e.target.value)}
                  placeholder="e.g. BSK-3010 1A TML-M"
                  className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-3 text-sm text-th-text/90 font-mono placeholder:text-th-text3/60 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50"
                  aria-label="Deadwax or matrix runout text"
                />
                <p className="mt-1 text-[9px] text-th-text3/70">The etching in the runout groove — identifies the specific pressing.</p>
                <div className="flex gap-2 mt-2">
                  {matrix !== (album.matrix || '') && (
                    <button
                      onClick={() => onUpdateAlbum(album.id, { matrix })}
                      className="bg-[#dd6e42]/20 border border-[#dd6e42]/30 text-[#f0a882] text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-[#dd6e42]/30 transition-all"
                    >
                      Save Matrix
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePressingLookup}
                    disabled={!matrix || lookupLoading}
                    className="inline-flex items-center gap-1.5 bg-th-surface/[0.06] border border-th-surface/[0.10] text-th-text2 text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-th-surface/[0.12] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Look up pressing details on Discogs"
                  >
                    {lookupLoading
                      ? <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" aria-hidden="true" />
                      : <span aria-hidden="true">&#x1F50D;</span>
                    }
                    {lookupLoading ? 'Searching\u2026' : 'Look up pressing'}
                  </button>
                </div>
                {lookupError && (
                  <p className="mt-2 text-[10px] text-red-400">{lookupError}</p>
                )}
                {pressingResults && pressingResults.length === 0 && (
                  <p className="mt-2 text-[10px] text-th-text3/70">No matching pressings found.</p>
                )}
                {pressingResults && pressingResults.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {pressingResults.map(r => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-th-surface/[0.04] border border-th-surface/[0.06]"
                      >
                        {r.thumb && (
                          <img src={r.thumb} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-th-text truncate">{r.title}</p>
                          <p className="text-[9px] text-th-text3/70">
                            {[r.label, r.catno, r.year, r.country].filter(Boolean).join(' · ')}
                          </p>
                          {r.matchedText && (
                            <p className="text-[9px] text-th-text3/70 font-mono truncate">{r.matchedText}</p>
                          )}
                        </div>
                        <span className="text-[9px] text-th-text3/70 shrink-0">{Math.round(r.score * 100)}%</span>
                        <div className="flex gap-1.5 shrink-0">
                          <a
                            href={r.discogsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-th-surface/[0.06] border border-th-surface/[0.10] text-th-text3 text-[9px] uppercase tracking-widest px-2.5 py-1.5 rounded-lg hover:bg-th-surface/[0.12] transition-all"
                            aria-label={`View ${r.title} on Discogs`}
                          >
                            View
                          </a>
                          <button
                            type="button"
                            onClick={() => handleApplyPressing(r)}
                            className="bg-[#dd6e42]/20 border border-[#dd6e42]/30 text-[#f0a882] text-[9px] uppercase tracking-widest px-2.5 py-1.5 rounded-lg hover:bg-[#dd6e42]/30 transition-all"
                            aria-label={`Apply pressing details from ${r.title}`}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* My Copy Tab Panel — negative margins cancel parent p-6/p-12 so MyCopyTab controls its own padding */}
          <div id="my-copy-panel" role="tabpanel" aria-labelledby="my-copy-tab" className={activeTab === 'my-copy' ? 'block -mx-6 md:-mx-12 -mb-6 md:-mb-12' : 'hidden'}>
            <MyCopyTab
              album={album}
              onUpdate={async (updates) => {
                if (onUpdateAlbum) {
                  onUpdateAlbum(album.id, updates);
                }
              }}
              userPlan={plan}
              discogsConnected={discogsConnected}
              onUpgradeRequired={onUpgradeRequired}
            />
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
