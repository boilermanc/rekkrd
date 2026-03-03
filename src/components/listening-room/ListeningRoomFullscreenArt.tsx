import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { proxyImageUrl } from '../../services/imageProxy';

interface ListeningRoomFullscreenArtProps {
  coverUrl: string;
  title: string;
  artist: string;
  ambientMode?: boolean;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const DOUBLE_TAP_SCALE = 2;
const SNAP_THRESHOLD = 1.2;
const DOUBLE_TAP_DELAY = 300; // ms

function getDistance(t1: React.Touch | Touch, t2: React.Touch | Touch) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function clampTranslate(
  tx: number,
  ty: number,
  scale: number,
  imgWidth: number,
  imgHeight: number,
  vpWidth: number,
  vpHeight: number,
): [number, number] {
  if (scale <= 1) return [0, 0];
  const maxX = Math.max(0, (imgWidth * scale - vpWidth) / 2);
  const maxY = Math.max(0, (imgHeight * scale - vpHeight) / 2);
  return [
    Math.max(-maxX, Math.min(maxX, tx)),
    Math.max(-maxY, Math.min(maxY, ty)),
  ];
}

const ListeningRoomFullscreenArt: React.FC<ListeningRoomFullscreenArtProps> = ({
  coverUrl,
  title,
  artist,
  ambientMode,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);

  // Zoom state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState<[number, number]>([0, 0]);
  const [animateTransform, setAnimateTransform] = useState(false);

  // Touch tracking refs
  const pinchRef = useRef<{ startDistance: number; startScale: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useFocusTrap(containerRef, handleClose);

  // Trigger entrance animation on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && scale <= 1) handleClose();
  };

  // ── Helper to get image dimensions ──────────────────────────

  const getImgDims = useCallback(() => {
    const img = imgRef.current;
    if (!img) return { w: 300, h: 300 };
    return { w: img.clientWidth, h: img.clientHeight };
  }, []);

  // ── Double-tap to toggle zoom ───────────────────────────────

  const handleDoubleTap = useCallback(() => {
    setAnimateTransform(true);
    if (scale > 1) {
      setScale(1);
      setTranslate([0, 0]);
    } else {
      setScale(DOUBLE_TAP_SCALE);
      setTranslate([0, 0]);
    }
  }, [scale]);

  // ── Touch handlers ──────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setAnimateTransform(false);

    if (e.touches.length === 2) {
      // Pinch start
      const dist = getDistance(e.touches[0], e.touches[1]);
      pinchRef.current = { startDistance: dist, startScale: scale };
      panRef.current = null;
    } else if (e.touches.length === 1) {
      // Check double-tap
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        handleDoubleTap();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      // Single-finger pan (only when zoomed)
      if (scale > 1) {
        const touch = e.touches[0];
        panRef.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          startTx: translate[0],
          startTy: translate[1],
        };
      }
    }
  }, [scale, translate, handleDoubleTap]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dist = getDistance(e.touches[0], e.touches[1]);
      const ratio = dist / pinchRef.current.startDistance;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchRef.current.startScale * ratio));
      setScale(newScale);

      // Re-clamp translate at new scale
      const { w, h } = getImgDims();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setTranslate((prev) => clampTranslate(prev[0], prev[1], newScale, w, h, vw, vh));
    } else if (e.touches.length === 1 && panRef.current && scale > 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - panRef.current.startX;
      const dy = touch.clientY - panRef.current.startY;
      const newTx = panRef.current.startTx + dx;
      const newTy = panRef.current.startTy + dy;

      const { w, h } = getImgDims();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setTranslate(clampTranslate(newTx, newTy, scale, w, h, vw, vh));
    }
  }, [scale, getImgDims]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      // Pinch ended — snap back if below threshold
      if (pinchRef.current) {
        pinchRef.current = null;
        if (scale < SNAP_THRESHOLD) {
          setAnimateTransform(true);
          setScale(1);
          setTranslate([0, 0]);
        }
      }
      panRef.current = null;
    } else if (e.touches.length === 1 && pinchRef.current) {
      // Went from 2 fingers to 1 — end pinch, start pan
      pinchRef.current = null;
      if (scale > 1) {
        const touch = e.touches[0];
        panRef.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          startTx: translate[0],
          startTy: translate[1],
        };
      }
    }
  }, [scale, translate]);

  // Build transform style
  const transformStyle: React.CSSProperties = {
    transform: `scale(${scale}) translate(${translate[0] / scale}px, ${translate[1] / scale}px)`,
    transition: animateTransform ? 'transform 200ms ease-out' : 'none',
    transformOrigin: 'center center',
    touchAction: scale > 1 ? 'none' : 'auto',
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label={`Album artwork: ${title} by ${artist}`}
      aria-modal="true"
      tabIndex={-1}
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95" aria-hidden="true" />

      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close fullscreen view"
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.15] transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Art + caption */}
      <div
        className={`relative z-10 flex flex-col items-center gap-5 px-4 transition-all duration-300 ease-out ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          ref={imgRef}
          src={proxyImageUrl(coverUrl)}
          alt={`Album cover for ${title} by ${artist}`}
          draggable={false}
          style={transformStyle}
          className={`max-w-[90vw] max-h-[80vh] object-contain rounded-lg select-none ${
            ambientMode ? 'shadow-2xl shadow-[#dd6e42]/20' : ''
          }`}
        />
        {scale <= 1 && (
          <div className="text-center">
            <p className="font-display text-lg text-white/70 leading-tight">{title}</p>
            <p className="font-label text-sm text-white/40 mt-1">{artist}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListeningRoomFullscreenArt;
