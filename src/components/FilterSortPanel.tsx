import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { MEDIA_FORMATS, FORMAT_COLORS, type MediaFormat } from '../../constants/formatTypes';
import { CONDITION_GRADES } from '../../constants/conditionGrades';

interface FilterSortPanelProps {
  isOpen: boolean;
  onClose: () => void;
  // Sort
  sortBy: string;
  onSortChange: (val: string) => void;
  // Format
  formatFilter: string | null;
  onFormatChange: (val: string | null) => void;
  // Year range
  yearRange: { min: string; max: string };
  onYearRangeChange: (val: { min: string; max: string }) => void;
  // Favorites
  favoritesOnly: boolean;
  onFavoritesChange: (val: boolean) => void;
  // Genre
  genreFilter: string;
  onGenreChange: (val: string) => void;
  availableGenres: string[];
  // Condition
  conditionFilter: string;
  onConditionChange: (val: string) => void;
  // Tags
  activeTags: string[];
  onTagsChange: (val: string[]) => void;
  availableTags: string[];
  // Reset
  onReset: () => void;
  activeFilterCount: number;
}

const SORT_OPTIONS = ['recent', 'year', 'artist', 'title', 'value', 'format'] as const;

const SWIPE_DISMISS_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 0.5;

const FilterSortPanel: React.FC<FilterSortPanelProps> = ({
  isOpen,
  onClose,
  sortBy,
  onSortChange,
  formatFilter,
  onFormatChange,
  yearRange,
  onYearRangeChange,
  favoritesOnly,
  onFavoritesChange,
  genreFilter,
  onGenreChange,
  availableGenres,
  conditionFilter,
  onConditionChange,
  activeTags,
  onTagsChange,
  availableTags,
  onReset,
  activeFilterCount,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setSwipeOffset(0);
    setTimeout(onClose, 200);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  // ── Swipe-to-dismiss handlers (mobile only) ─────────────────

  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
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

    if (deltaY < 0) {
      swipeRef.current.swiping = false;
      setSwipeOffset(0);
      return;
    }

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
      setSwipeTransition(true);
      setSwipeOffset(window.innerHeight);
      setTimeout(onClose, 200);
    } else {
      setSwipeTransition(true);
      setSwipeOffset(0);
    }
  }, [onClose]);

  const toggleTag = (tag: string) => {
    if (activeTags.includes(tag)) {
      onTagsChange(activeTags.filter(t => t !== tag));
    } else {
      onTagsChange([...activeTags, tag]);
    }
  };

  if (!isOpen) return null;

  const panelStyle: React.CSSProperties = swipeOffset > 0
    ? { transform: `translateY(${swipeOffset}px)`, transition: swipeTransition ? 'transform 200ms ease-out' : 'none' }
    : {};

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-stretch md:justify-end"
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
        aria-label="Filter and sort collection"
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
          bg-th-bg border-th-surface/[0.10]
          ${swipeOffset === 0 ? 'transition-all duration-200 ease-out' : ''}
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

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="font-display text-lg text-th-text">Filter &amp; Sort</h2>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="text-[10px] uppercase tracking-widest text-[#dd6e42] hover:text-[#c45a30] transition-colors font-label"
            >
              Reset all
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close filter panel"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-th-surface/[0.08] text-th-text2 hover:text-th-text hover:bg-th-surface/[0.15] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-5">

          {/* ── SORT ── */}
          <section>
            <h4 className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-3">Sort by</h4>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => onSortChange(opt)}
                  aria-label={`Sort by ${opt}`}
                  aria-pressed={sortBy === opt}
                  className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest transition-all ${
                    sortBy === opt
                      ? 'bg-[#dd6e42] text-th-text'
                      : 'bg-th-surface/[0.04] text-th-text3'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </section>

          <div className="border-t border-th-surface/[0.08]" />

          {/* ── FORMAT ── */}
          <section>
            <h4 className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-3">Format</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFormatChange(null)}
                className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest transition-all ${
                  formatFilter === null
                    ? 'bg-[#dd6e42] text-th-text'
                    : 'bg-th-surface/[0.04] text-th-text3'
                }`}
              >
                All
              </button>
              {MEDIA_FORMATS.map(f => (
                <button
                  key={f}
                  onClick={() => onFormatChange(f)}
                  className="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest transition-all"
                  style={
                    formatFilter === f
                      ? { backgroundColor: FORMAT_COLORS[f as MediaFormat], color: '#fff' }
                      : undefined
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          </section>

          <div className="border-t border-th-surface/[0.08]" />

          {/* ── YEAR RANGE ── */}
          <section>
            <h4 className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-3">Release Era</h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="From"
                value={yearRange.min}
                onChange={(e) => onYearRangeChange({ ...yearRange, min: e.target.value })}
                className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#dd6e42]"
              />
              <span className="text-th-text3/50">—</span>
              <input
                type="number"
                placeholder="To"
                value={yearRange.max}
                onChange={(e) => onYearRangeChange({ ...yearRange, max: e.target.value })}
                className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#dd6e42]"
              />
            </div>
          </section>

          <div className="border-t border-th-surface/[0.08]" />

          {/* ── GENRE ── */}
          {availableGenres.length > 0 && (
            <>
              <section>
                <h4 className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-3">Genre</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onGenreChange('')}
                    aria-pressed={genreFilter === ''}
                    className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest transition-all ${
                      genreFilter === ''
                        ? 'bg-[#dd6e42] text-th-text'
                        : 'bg-th-surface/[0.04] text-th-text3'
                    }`}
                  >
                    All
                  </button>
                  {availableGenres.map(genre => (
                    <button
                      key={genre}
                      onClick={() => onGenreChange(genre)}
                      aria-pressed={genreFilter === genre}
                      className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest transition-all ${
                        genreFilter === genre
                          ? 'bg-[#dd6e42] text-th-text'
                          : 'bg-th-surface/[0.04] text-th-text3'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </section>
              <div className="border-t border-th-surface/[0.08]" />
            </>
          )}

          {/* ── CONDITION ── */}
          <section>
            <h4 className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-3">Condition</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onConditionChange('')}
                aria-pressed={conditionFilter === ''}
                className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest transition-all ${
                  conditionFilter === ''
                    ? 'bg-[#dd6e42] text-th-text'
                    : 'bg-th-surface/[0.04] text-th-text3'
                }`}
              >
                All
              </button>
              {CONDITION_GRADES.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => onConditionChange(value)}
                  aria-pressed={conditionFilter === value}
                  className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest transition-all ${
                    conditionFilter === value
                      ? 'bg-[#dd6e42] text-th-text'
                      : 'bg-th-surface/[0.04] text-th-text3'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <div className="border-t border-th-surface/[0.08]" />

          {/* ── TAGS ── */}
          {availableTags.length > 0 && (
            <>
              <section>
                <h4 className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      aria-pressed={activeTags.includes(tag)}
                      className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest transition-all ${
                        activeTags.includes(tag)
                          ? 'bg-[#dd6e42] text-th-text'
                          : 'bg-th-surface/[0.04] text-th-text3'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </section>
              <div className="border-t border-th-surface/[0.08]" />
            </>
          )}

          {/* ── FAVORITES ── */}
          <section>
            <h4 className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-3">Favorites</h4>
            <button
              role="switch"
              aria-checked={favoritesOnly}
              aria-label="Show favorites only"
              onClick={() => onFavoritesChange(!favoritesOnly)}
              className="flex items-center gap-3 cursor-pointer group bg-transparent border-none p-0 outline-none focus-visible:ring-2 focus-visible:ring-[#dd6e42] rounded-full"
            >
              <div className={`w-10 h-5 rounded-full transition-all relative border border-th-surface/[0.10] ${
                favoritesOnly ? 'bg-[#c45a30]' : 'bg-th-surface/[0.04]'
              }`}>
                <div className={`absolute top-0.5 w-3.5 h-3.5 bg-th-text rounded-full transition-all ${
                  favoritesOnly ? 'left-5.5' : 'left-1'
                }`} />
              </div>
              <span className="text-xs text-th-text2 group-hover:text-th-text font-label">Favorites only</span>
            </button>
          </section>

        </div>
      </div>
    </div>
  );
};

export default FilterSortPanel;
