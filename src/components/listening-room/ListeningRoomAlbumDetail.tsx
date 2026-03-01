import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Check, Maximize2 } from 'lucide-react';
import { Album } from '../../../types';
import { proxyImageUrl } from '../../../services/imageProxy';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import ListeningRoomFullscreenArt from './ListeningRoomFullscreenArt';

interface ListeningRoomAlbumDetailProps {
  album: Album;
  onClose: () => void;
  onAddToSession?: (album: Album) => void;
  sessionAlbumIds?: Set<string>;
  ambientMode?: boolean;
}

const SWIPE_DISMISS_THRESHOLD = 100; // px
const SWIPE_VELOCITY_THRESHOLD = 0.5; // px/ms

const ListeningRoomAlbumDetail: React.FC<ListeningRoomAlbumDetailProps> = ({
  album,
  onClose,
  onAddToSession,
  sessionAlbumIds,
  ambientMode,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Swipe-to-dismiss state (mobile bottom sheet only)
  const swipeRef = useRef<{
    startY: number;
    startTime: number;
    currentY: number;
    swiping: boolean;
  } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeTransition, setSwipeTransition] = useState(false);

  useFocusTrap(panelRef, onClose);

  // Trigger entrance animation on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setSwipeOffset(0);
    setTimeout(onClose, 200);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleAddToSession = () => {
    console.log('Add to session:', album.artist, '–', album.title);
    onAddToSession?.(album);
  };

  // ── Swipe-to-dismiss handlers (mobile only) ─────────────────

  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    // Only on mobile (bottom sheet mode) — check via media query
    if (window.matchMedia('(min-width: 768px)').matches) return;

    const touch = e.touches[0];
    swipeRef.current = {
      startY: touch.clientY,
      startTime: Date.now(),
      currentY: touch.clientY,
      swiping: false,
    };
    setSwipeTransition(false);
  }, []);

  const handleSwipeMove = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - swipeRef.current.startY;

    // Only track downward swipes
    if (deltaY < 0) {
      swipeRef.current.swiping = false;
      setSwipeOffset(0);
      return;
    }

    // Start swiping after a small threshold to avoid conflicting with scroll
    if (deltaY > 10) {
      swipeRef.current.swiping = true;
    }

    if (swipeRef.current.swiping) {
      e.preventDefault();
      swipeRef.current.currentY = touch.clientY;
      setSwipeOffset(deltaY);
    }
  }, []);

  const handleSwipeEnd = useCallback(() => {
    if (!swipeRef.current || !swipeRef.current.swiping) {
      swipeRef.current = null;
      return;
    }

    const deltaY = swipeRef.current.currentY - swipeRef.current.startY;
    const elapsed = Date.now() - swipeRef.current.startTime;
    const velocity = deltaY / Math.max(elapsed, 1);

    swipeRef.current = null;

    if (deltaY > SWIPE_DISMISS_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD) {
      // Dismiss — animate down and close
      setSwipeTransition(true);
      setSwipeOffset(window.innerHeight);
      setTimeout(onClose, 200);
    } else {
      // Snap back
      setSwipeTransition(true);
      setSwipeOffset(0);
    }
  }, [onClose]);

  const meta: { label: string; value: string }[] = [];
  if (album.year) meta.push({ label: 'Year', value: album.year });
  if (album.format) meta.push({ label: 'Format', value: album.format });
  if (album.genre) meta.push({ label: 'Genre', value: album.genre });
  if (album.condition) meta.push({ label: 'Condition', value: album.condition });

  // Build inline style for swipe offset (mobile only)
  const panelStyle: React.CSSProperties = swipeOffset > 0
    ? { transform: `translateY(${swipeOffset}px)`, transition: swipeTransition ? 'transform 200ms ease-out' : 'none' }
    : {};

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Album details"
        aria-modal="true"
        tabIndex={-1}
        onTouchStart={handleSwipeStart}
        onTouchMove={handleSwipeMove}
        onTouchEnd={handleSwipeEnd}
        style={panelStyle}
        className={`
          relative z-10 border-t md:border-t-0 md:border-l
          w-full md:w-[40%] max-h-[85vh] md:max-h-full
          flex flex-col overflow-y-auto
          rounded-t-2xl md:rounded-none
          ${swipeOffset === 0 ? 'transition-all duration-200 ease-out' : ''}
          ${ambientMode
            ? 'bg-[#141414] border-[#c4b5a0]/10'
            : 'bg-th-bg border-th-surface/[0.10]'
          }
          ${visible
            ? 'translate-y-0 md:translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-y-0 md:translate-x-full'
          }
        `}
      >
        {/* Drag indicator (mobile bottom sheet) */}
        <div className="md:hidden flex justify-center pt-2 pb-1" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close album details"
          className={`absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
            ambientMode
              ? 'bg-white/[0.06] text-[#c4b5a0]/60 hover:text-[#c4b5a0] hover:bg-white/[0.10]'
              : 'bg-th-surface/[0.08] text-th-text2 hover:text-th-text hover:bg-th-surface/[0.15]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          {/* Cover art */}
          <div className="flex justify-center">
            <div className={`relative w-full max-w-[300px] aspect-square rounded-lg overflow-hidden shadow-lg transition-shadow duration-500 group/cover ${
              ambientMode ? 'bg-[#1a1a1a] shadow-[#dd6e42]/10' : 'bg-th-bg2/60'
            }`}>
              {album.cover_url ? (
                <>
                  <img
                    src={proxyImageUrl(album.cover_url)}
                    alt={`Album cover for ${album.title} by ${album.artist}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFullscreen(true)}
                    aria-label={`View ${album.title} artwork fullscreen`}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 opacity-0 group-hover/cover:opacity-100 transition-all"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-th-text3/25" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="12" cy="12" r="1" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Title & artist */}
          <div className="text-center">
            <h2 className={`font-display text-xl leading-tight transition-colors duration-500 ${
              ambientMode ? 'text-[#c4b5a0]' : 'text-th-text'
            }`}>{album.title}</h2>
            <p className={`font-label text-sm mt-1 transition-colors duration-500 ${
              ambientMode ? 'text-[#c4b5a0]/60' : 'text-th-text2'
            }`}>{album.artist}</p>
          </div>

          {/* Metadata pills */}
          {meta.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {meta.map(({ label, value }) => (
                <span
                  key={label}
                  className={`px-2.5 py-1 rounded-full border text-[10px] font-label transition-colors duration-500 ${
                    ambientMode
                      ? 'bg-white/[0.04] border-[#c4b5a0]/15 text-[#c4b5a0]/70'
                      : 'bg-th-surface/[0.06] border-th-surface/[0.10] text-th-text2'
                  }`}
                >
                  <span className={`uppercase tracking-wider transition-colors duration-500 ${
                    ambientMode ? 'text-[#c4b5a0]/40' : 'text-th-text3'
                  }`}>{label}</span>{' '}
                  {value}
                </span>
              ))}
            </div>
          )}

          {/* Tracklist */}
          {album.tracklist && album.tracklist.length > 0 && (
            <div>
              <h3 className={`font-label text-[10px] uppercase tracking-widest mb-2 transition-colors duration-500 ${
                ambientMode ? 'text-[#c4b5a0]/40' : 'text-th-text3'
              }`}>Tracklist</h3>
              <ol className="space-y-1">
                {album.tracklist.map((track, i) => (
                  <li key={i} className={`flex gap-2 font-label text-xs transition-colors duration-500 ${
                    ambientMode ? 'text-[#c4b5a0]/60' : 'text-th-text2'
                  }`}>
                    <span className={`w-5 text-right flex-shrink-0 transition-colors duration-500 ${
                      ambientMode ? 'text-[#c4b5a0]/40' : 'text-th-text3'
                    }`}>{i + 1}</span>
                    <span className="truncate">{track}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Personal notes */}
          {album.personal_notes && (
            <div>
              <h3 className={`font-label text-[10px] uppercase tracking-widest mb-1 transition-colors duration-500 ${
                ambientMode ? 'text-[#c4b5a0]/40' : 'text-th-text3'
              }`}>Notes</h3>
              <p className={`font-label text-xs whitespace-pre-wrap transition-colors duration-500 ${
                ambientMode ? 'text-[#c4b5a0]/60' : 'text-th-text2'
              }`}>{album.personal_notes}</p>
            </div>
          )}
        </div>

        {/* Add to Session button */}
        <div className={`p-4 border-t transition-colors duration-500 ${
          ambientMode ? 'border-[#c4b5a0]/10' : 'border-th-surface/[0.10]'
        }`}>
          {sessionAlbumIds?.has(album.id) ? (
            <button
              type="button"
              disabled
              className="w-full py-3 rounded-xl bg-th-surface/[0.08] text-th-text3 font-label text-sm font-bold tracking-wide cursor-default flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              In Session
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddToSession}
              className="w-full py-3 rounded-xl bg-[#dd6e42] text-white font-label text-sm font-bold tracking-wide hover:bg-[#c45a30] active:scale-[0.98] transition-all"
            >
              Add to Session
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen art overlay */}
      {showFullscreen && album.cover_url && (
        <ListeningRoomFullscreenArt
          coverUrl={album.cover_url}
          title={album.title}
          artist={album.artist}
          ambientMode={ambientMode}
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </div>
  );
};

export default ListeningRoomAlbumDetail;
