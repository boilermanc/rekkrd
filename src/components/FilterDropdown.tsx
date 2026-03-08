import { useState, useRef, useEffect, useCallback } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { CONDITION_GRADES } from '../constants/conditionGrades';
import type { CollectionFilters } from '../hooks/useCollectionFilters';

export interface FilterDropdownProps {
  filters: CollectionFilters;
  setFilter: <K extends keyof CollectionFilters>(key: K, value: CollectionFilters[K]) => void;
  clearAll: () => void;
  activeFilterCount: number;
  available: {
    genres: string[];
    formats: string[];
    decades: string[];
    conditions: string[];
    labels: string[];
    tags: string[];
  };
}

/** Toggle a value in a string array — add if missing, remove if present. */
function toggleArrayValue(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
}

// Condition values in Goldmine order (M → P)
const GOLDMINE_ORDER = CONDITION_GRADES.map(g => g.value);

const TRUNCATE_THRESHOLD = 12;

function PillGroup({
  label,
  items,
  selected,
  onChange,
  sectionId,
  truncate,
}: {
  label: string;
  items: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  sectionId: string;
  truncate?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  const shouldTruncate = truncate && items.length > TRUNCATE_THRESHOLD && !expanded;
  const visibleItems = shouldTruncate ? items.slice(0, TRUNCATE_THRESHOLD) : items;

  return (
    <div className="border-b border-th-surface/[0.06] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`filter-section-${sectionId}`}
        className="flex w-full items-center justify-between px-4 py-2.5 text-[10px] font-label uppercase tracking-[0.2em] text-th-text3 hover:text-th-text2 transition-colors"
      >
        {label}
        {selected.length > 0 && (
          <span className="ml-1.5 text-amber-400 normal-case tracking-normal text-[10px]">
            ({selected.length})
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div
          id={`filter-section-${sectionId}`}
          role="group"
          aria-label={`${label} filters`}
          className="flex flex-wrap gap-1.5 px-4 pb-3"
        >
          {visibleItems.map(item => {
            const active = selected.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => onChange(toggleArrayValue(selected, item))}
                aria-pressed={active}
                aria-label={`${label}: ${item}`}
                className={`px-2.5 py-1 rounded-full text-[11px] border transition-all ${
                  active
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text3 hover:text-th-text2 hover:border-th-surface/[0.20]'
                }`}
              >
                {item}
              </button>
            );
          })}
          {shouldTruncate && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="px-2.5 py-1 rounded-full text-[11px] border border-th-surface/[0.10] text-amber-400 hover:border-amber-500/50 transition-colors"
            >
              +{items.length - TRUNCATE_THRESHOLD} more
            </button>
          )}
          {truncate && expanded && items.length > TRUNCATE_THRESHOLD && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="px-2.5 py-1 rounded-full text-[11px] border border-th-surface/[0.10] text-th-text3 hover:text-th-text2 transition-colors"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PriceRangeSection({
  priceMin,
  priceMax,
  onChangeMin,
  onChangeMax,
}: {
  priceMin: number | null;
  priceMax: number | null;
  onChangeMin: (v: number | null) => void;
  onChangeMax: (v: number | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasValue = priceMin !== null || priceMax !== null;

  return (
    <div className="border-b border-th-surface/[0.06] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="filter-section-price"
        className="flex w-full items-center justify-between px-4 py-2.5 text-[10px] font-label uppercase tracking-[0.2em] text-th-text3 hover:text-th-text2 transition-colors"
      >
        Price Range
        {hasValue && (
          <span className="ml-1.5 text-amber-400 normal-case tracking-normal text-[10px]">
            (active)
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div
          id="filter-section-price"
          className="flex items-center gap-2 px-4 pb-3"
        >
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-th-text3 text-xs">$</span>
            <input
              type="number"
              min={0}
              step={1}
              placeholder="Min"
              aria-label="Minimum price"
              value={priceMin ?? ''}
              onChange={e => onChangeMin(e.target.value === '' ? null : Number(e.target.value))}
              className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg pl-6 pr-2 py-1.5 text-sm text-th-text placeholder:text-th-text3/60 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
          <span className="text-th-text3 text-xs">–</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-th-text3 text-xs">$</span>
            <input
              type="number"
              min={0}
              step={1}
              placeholder="Max"
              aria-label="Maximum price"
              value={priceMax ?? ''}
              onChange={e => onChangeMax(e.target.value === '' ? null : Number(e.target.value))}
              className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg pl-6 pr-2 py-1.5 text-sm text-th-text placeholder:text-th-text3/60 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FavoritesToggleSection({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-[10px] font-label uppercase tracking-[0.2em] text-th-text3">
        Favorites Only
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Show favorites only"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-amber-500' : 'bg-th-surface/[0.15]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
    </div>
  );
}

function FilterPanelContent({
  filters,
  setFilter,
  clearAll,
  activeFilterCount,
  sortedConditions,
  available,
  onClose,
}: FilterDropdownProps & { sortedConditions: string[]; onClose: () => void }) {
  return (
    <>
      <div className="max-h-[480px] sm:max-h-[480px] max-sm:max-h-[60vh] overflow-y-auto overscroll-contain">
        <PillGroup
          label="Genre"
          sectionId="genre"
          items={available.genres}
          selected={filters.genres}
          onChange={v => setFilter('genres', v)}
          truncate
        />
        <PillGroup
          label="Format"
          sectionId="format"
          items={available.formats}
          selected={filters.formats}
          onChange={v => setFilter('formats', v)}
        />
        <PillGroup
          label="Decade"
          sectionId="decade"
          items={available.decades}
          selected={filters.decades}
          onChange={v => setFilter('decades', v)}
        />
        <PillGroup
          label="Condition"
          sectionId="condition"
          items={sortedConditions}
          selected={filters.conditions}
          onChange={v => setFilter('conditions', v)}
        />
        <PillGroup
          label="Label"
          sectionId="label"
          items={available.labels}
          selected={filters.labels}
          onChange={v => setFilter('labels', v)}
          truncate
        />
        <PillGroup
          label="Tags"
          sectionId="tags"
          items={available.tags}
          selected={filters.tags}
          onChange={v => setFilter('tags', v)}
          truncate
        />
        <PriceRangeSection
          priceMin={filters.priceMin}
          priceMax={filters.priceMax}
          onChangeMin={v => setFilter('priceMin', v)}
          onChangeMax={v => setFilter('priceMax', v)}
        />
        <FavoritesToggleSection
          checked={filters.favoritesOnly}
          onChange={v => setFilter('favoritesOnly', v)}
        />
      </div>

      {activeFilterCount > 0 && (
        <div className="border-t border-th-surface/[0.06] px-4 py-2.5">
          <button
            type="button"
            onClick={() => { clearAll(); onClose(); }}
            aria-label="Clear all filters"
            className="text-[10px] font-label uppercase tracking-[0.2em] text-amber-400 hover:text-amber-300 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </>
  );
}

/** Standalone filter panel for use outside the dropdown (e.g. mobile search overlay). */
export function FilterPanel({ onClose, ...props }: FilterDropdownProps & { onClose: () => void }) {
  const sortedConditions = props.available.conditions.slice().sort((a, b) => {
    const ai = GOLDMINE_ORDER.indexOf(a as typeof GOLDMINE_ORDER[number]);
    const bi = GOLDMINE_ORDER.indexOf(b as typeof GOLDMINE_ORDER[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return <FilterPanelContent {...props} sortedConditions={sortedConditions} onClose={onClose} />;
}

export default function FilterDropdown(props: FilterDropdownProps) {
  const { filters, setFilter, clearAll, activeFilterCount, available } = props;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const close = useCallback(() => {
    // On mobile, animate out before unmounting
    setSheetVisible(false);
    const isMobile = window.matchMedia('(max-width: 639px)').matches;
    if (isMobile) {
      setTimeout(() => setIsOpen(false), 200);
    } else {
      setIsOpen(false);
    }
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    // Trigger slide-up on next frame for mobile
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSheetVisible(true));
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, close]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  // Focus trap — cycle Tab within panel
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    panel.addEventListener('keydown', handleTab);
    return () => panel.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Sort conditions in Goldmine order, keeping only those available
  const sortedConditions = available.conditions.slice().sort((a, b) => {
    const ai = GOLDMINE_ORDER.indexOf(a as typeof GOLDMINE_ORDER[number]);
    const bi = GOLDMINE_ORDER.indexOf(b as typeof GOLDMINE_ORDER[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => (isOpen ? close() : open())}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full border transition-all text-sm ${
          isOpen
            ? 'bg-[#dd6e42] border-[#dd6e42] text-th-text'
            : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text2 hover:text-th-text'
        }`}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="text-xs font-label uppercase tracking-widest">Filters</span>
        {activeFilterCount > 0 && (
          <span className="ml-0.5 h-4 min-w-[16px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Desktop dropdown */}
          <div
            ref={panelRef}
            className="hidden sm:block absolute top-full left-0 mt-2 w-[360px] bg-th-bg2 border border-th-surface/[0.10] rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <FilterPanelContent
              {...props}
              sortedConditions={sortedConditions}
              onClose={close}
            />
          </div>

          {/* Mobile bottom sheet */}
          <div className="sm:hidden fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${sheetVisible ? 'opacity-100' : 'opacity-0'}`}
              onClick={close}
              aria-hidden="true"
            />
            {/* Sheet */}
            <div
              ref={panelRef}
              className={`absolute bottom-0 left-0 right-0 bg-th-bg2 rounded-t-2xl shadow-xl transition-transform duration-200 ease-out ${sheetVisible ? 'translate-y-0' : 'translate-y-full'}`}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-th-surface/[0.20]" />
              </div>
              <FilterPanelContent
                {...props}
                sortedConditions={sortedConditions}
                onClose={close}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
