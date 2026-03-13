import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, Announcements } from '@dnd-kit/core';
import { useToast } from '../contexts/ToastContext';
import { proxyImageUrl } from '../services/imageProxy';
import {
  sortCollectionForShelf,
  calculateShelfAssignments,
  batchSaveAssignments,
  analyzeShelfBalance,
  generateRebalancePlan,
  assignAlbumToUnit,
  unpinAlbum,
  batchClearPins,
  generateShelfCatalogCSV,
} from '../helpers/shelfHelpers';
import type { RebalancePlan } from '../helpers/shelfHelpers';
import type { Album } from '../types';
import type { ShelfConfig, SortScheme } from '../types/shelf';

// ── Types ────────────────────────────────────────────────────────────

interface ShelfViewProps {
  albums: Album[];
  shelfConfig: ShelfConfig;
  sortScheme: SortScheme;
  onAssignmentsSaved: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function capacityColor(count: number, capacity: number): string {
  const pct = capacity > 0 ? count / capacity : 0;
  if (pct > 0.95) return 'text-red-400';
  if (pct >= 0.80) return 'text-yellow-400';
  return 'text-emerald-400';
}

function capacityBarColor(count: number, capacity: number): string {
  const pct = capacity > 0 ? count / capacity : 0;
  if (pct > 0.95) return 'bg-red-400';
  if (pct >= 0.80) return 'bg-yellow-400';
  return 'bg-emerald-400';
}

// ── Pin Icon SVG ─────────────────────────────────────────────────────

const PinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" width="14" height="14">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
  </svg>
);

// ── Drag Handle (grip dots) ──────────────────────────────────────────

const GripHandle = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => (
  <button
    ref={ref}
    type="button"
    className="touch-none p-1 -ml-1 flex-shrink-0 text-th-text3/20 hover:text-th-text3/40 transition-colors cursor-grab active:cursor-grabbing"
    aria-label="Drag to move album"
    {...props}
  >
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  </button>
));
GripHandle.displayName = 'GripHandle';

// ── Draggable Album Row ──────────────────────────────────────────────

interface DraggableAlbumRowProps {
  album: Album;
  isDragActive: boolean;
  isPinned: boolean;
  disabled: boolean;
  onUnpin: (albumId: string) => void;
}

const DraggableAlbumRow: React.FC<DraggableAlbumRowProps> = ({
  album,
  isDragActive,
  isPinned,
  disabled,
  onUnpin,
}) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: album.id,
    data: { album },
    disabled,
  });
  const [showUnpin, setShowUnpin] = useState(false);
  const unpinRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!isPinned) return;
    e.preventDefault();
    setShowUnpin(prev => !prev);
  }, [isPinned]);

  const handlePinClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowUnpin(prev => !prev);
  }, []);

  const handleUnpin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowUnpin(false);
    onUnpin(album.id);
  }, [album.id, onUnpin]);

  // Close unpin popover when clicking outside
  React.useEffect(() => {
    if (!showUnpin) return;
    const handleClick = (e: MouseEvent) => {
      if (unpinRef.current && !unpinRef.current.contains(e.target as Node)) {
        setShowUnpin(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUnpin]);

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      role="listitem"
      aria-roledescription="draggable album"
      onContextMenu={handleContextMenu}
      className={`flex items-center gap-3 px-4 py-2 hover:bg-th-surface/[0.03] transition-colors ${
        isDragging ? 'opacity-30' : ''
      } ${isDragActive && !isDragging ? 'select-none' : ''}`}
    >
      {/* Drag handle — only this element initiates drag */}
      <GripHandle ref={setActivatorNodeRef} {...listeners} />

      {/* Cover thumbnail */}
      <div className="w-9 h-9 flex-shrink-0 rounded overflow-hidden bg-th-surface/[0.08]">
        {album.cover_url ? (
          <img
            src={proxyImageUrl(album.cover_url) || album.cover_url}
            alt={`Cover for ${album.title} by ${album.artist}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-th-text3/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-th-text truncate">{album.artist}</p>
        <p className="text-xs text-th-text3/70 truncate">{album.title}</p>
      </div>

      {/* Pin indicator + unpin popover */}
      {isPinned && (
        <div className="relative flex-shrink-0" ref={unpinRef}>
          <button
            onClick={handlePinClick}
            className="p-1 text-sk-accent/70 hover:text-sk-accent transition-colors"
            aria-label={`${album.title} is manually placed. Click to unpin.`}
            title="Manually placed — won't move during rebalance"
          >
            <PinIcon />
          </button>
          {showUnpin && (
            <div className="absolute right-0 top-full mt-1 z-20">
              <button
                onClick={handleUnpin}
                className="whitespace-nowrap px-3 py-1.5 rounded-lg glass-morphism border border-th-surface/[0.12] text-xs text-th-text2 font-label tracking-wide hover:bg-th-surface/[0.12] transition-colors shadow-lg shadow-black/20"
                aria-label={`Remove pin from ${album.title}`}
              >
                Remove pin
              </button>
            </div>
          )}
        </div>
      )}

      {/* Year */}
      <span className="text-xs text-th-text3/60 font-label tracking-wide flex-shrink-0">
        {album.year || '—'}
      </span>
    </li>
  );
};

// ── Droppable Section ────────────────────────────────────────────────

interface DroppableSectionProps {
  unitNumber: number;
  unitAlbums: Album[];
  capacity: number;
  isOverflow: boolean;
  isDragActive: boolean;
  dragDisabled: boolean;
  isPinnedFn: (album: Album) => boolean;
  onUnpin: (albumId: string) => void;
}

const DroppableSection: React.FC<DroppableSectionProps> = ({
  unitNumber,
  unitAlbums,
  capacity,
  isOverflow,
  isDragActive,
  dragDisabled,
  isPinnedFn,
  onUnpin,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `section-${unitNumber}`,
    data: { unitNumber },
  });

  return (
    <section
      ref={setNodeRef}
      className={`glass-morphism rounded-xl overflow-hidden transition-all duration-200 ${
        isOver ? 'ring-2 ring-sk-accent/60 ring-offset-1 ring-offset-transparent' : ''
      }`}
    >
      {/* Unit header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-th-surface/[0.08]">
        <h4 className="font-label text-sm tracking-widest uppercase font-bold text-th-text">
          Section {unitNumber}
        </h4>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-label tracking-wide ${capacityColor(unitAlbums.length, capacity)}`}>
            {unitAlbums.length} / {capacity}
          </span>
          <div className="w-16 h-1.5 bg-th-surface/[0.08] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${capacityBarColor(unitAlbums.length, capacity)}`}
              style={{ width: `${Math.min(100, (unitAlbums.length / capacity) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {isOverflow && (
        <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
          <p className="text-xs text-yellow-400 font-label tracking-wide">
            This section has overflow — {unitAlbums.length - capacity} record{unitAlbums.length - capacity !== 1 ? 's' : ''} over capacity
          </p>
        </div>
      )}

      {/* Album list */}
      {unitAlbums.length === 0 ? (
        <div className={`px-4 py-6 text-center ${isOver ? 'bg-sk-accent/5' : ''}`}>
          <p className="text-th-text3/30 text-xs">
            {isOver ? 'Drop here' : 'Empty section'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-th-surface/[0.06]" role="list" aria-label={`Records in section ${unitNumber}`}>
          {unitAlbums.map((album) => (
            <DraggableAlbumRow
              key={album.id}
              album={album}
              isDragActive={isDragActive}
              isPinned={isPinnedFn(album)}
              disabled={dragDisabled}
              onUnpin={onUnpin}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

// ── Drag Overlay Card ────────────────────────────────────────────────

const DragOverlayCard: React.FC<{ album: Album }> = ({ album }) => (
  <div className="flex items-center gap-3 px-4 py-2 rounded-lg glass-morphism shadow-lg shadow-black/30 border border-th-surface/[0.12] w-72 pointer-events-none">
    <div className="w-9 h-9 flex-shrink-0 rounded overflow-hidden bg-th-surface/[0.08]">
      {album.cover_url ? (
        <img
          src={proxyImageUrl(album.cover_url) || album.cover_url}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-th-text3/20">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-th-text truncate">{album.artist}</p>
      <p className="text-xs text-th-text3/70 truncate">{album.title}</p>
    </div>
  </div>
);

// ── Accessibility announcements ──────────────────────────────────────

const announcements = {
  onDragStart({ active }: DragStartEvent) {
    const album = active.data.current?.album as Album | undefined;
    return album
      ? `Picked up ${album.title} by ${album.artist}`
      : 'Picked up album';
  },
  onDragOver({ active, over }: { active: DragStartEvent['active']; over: { id: string | number } | null }) {
    const album = active.data.current?.album as Album | undefined;
    if (!over) return '';
    const sectionId = String(over.id);
    const sectionNum = sectionId.startsWith('section-') ? sectionId.replace('section-', '') : null;
    return album && sectionNum
      ? `${album.title} is over Section ${sectionNum}`
      : '';
  },
  onDragEnd({ active, over }: DragEndEvent) {
    const album = active.data.current?.album as Album | undefined;
    if (!over) return album ? `${album.title} was dropped — no change` : 'Dropped — no change';
    const sectionId = String(over.id);
    const sectionNum = sectionId.startsWith('section-') ? sectionId.replace('section-', '') : null;
    return album && sectionNum
      ? `Moved ${album.title} to Section ${sectionNum}`
      : 'Album moved';
  },
  onDragCancel({ active }: DragStartEvent) {
    const album = active.data.current?.album as Album | undefined;
    return album ? `Drag cancelled for ${album.title}` : 'Drag cancelled';
  },
};

// ── Main Component ───────────────────────────────────────────────────

const ShelfView: React.FC<ShelfViewProps> = ({
  albums,
  shelfConfig,
  sortScheme,
  onAssignmentsSaved,
}) => {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [rebalancePlan, setRebalancePlan] = useState<RebalancePlan | null>(null);
  const [showRebalancePanel, setShowRebalancePanel] = useState(false);
  const [applyingRebalance, setApplyingRebalance] = useState(false);
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [dragSaving, setDragSaving] = useState(false);
  const [clearingPins, setClearingPins] = useState(false);
  const [showClearPinsConfirm, setShowClearPinsConfirm] = useState(false);
  // Optimistic overrides: albumId → unitNumber (from drag-and-drop)
  const [manualMoves, setManualMoves] = useState<Map<string, number>>(new Map());
  // Optimistic pin status overrides: albumId → pinned (true = just pinned, false = just unpinned)
  const [localPins, setLocalPins] = useState<Map<string, boolean>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const sorted = useMemo(
    () => sortCollectionForShelf(albums, sortScheme),
    [albums, sortScheme],
  );

  const { assignments, units: baseUnits, overflow } = useMemo(
    () => calculateShelfAssignments(sorted, shelfConfig),
    [sorted, shelfConfig],
  );

  // Apply manual moves on top of the computed units
  const units = useMemo(() => {
    if (manualMoves.size === 0) return baseUnits;

    const rebuilt: { unitNumber: number; albums: Album[] }[] = baseUnits.map(u => ({
      unitNumber: u.unitNumber,
      albums: [],
    }));

    for (const u of baseUnits) {
      for (const album of u.albums) {
        const overrideUnit = manualMoves.get(album.id);
        const targetUnit = overrideUnit ?? u.unitNumber;
        const bucket = rebuilt.find(r => r.unitNumber === targetUnit);
        if (bucket) {
          bucket.albums.push(album);
        } else {
          rebuilt.find(r => r.unitNumber === u.unitNumber)!.albums.push(album);
        }
      }
    }

    return rebuilt;
  }, [baseUnits, manualMoves]);

  const balance = useMemo(
    () => analyzeShelfBalance(units, shelfConfig),
    [units, shelfConfig],
  );

  /** Check if an album is pinned (optimistic local state + DB flag). */
  const isAlbumPinned = useCallback((album: Album): boolean => {
    if (localPins.has(album.id)) return localPins.get(album.id)!;
    return album.shelf_manual_override === true;
  }, [localPins]);

  /** Count of all effectively pinned albums. */
  const pinnedCount = useMemo(() => {
    let count = 0;
    for (const u of units) {
      for (const a of u.albums) {
        if (isAlbumPinned(a)) count++;
      }
    }
    return count;
  }, [units, isAlbumPinned]);

  const allPinned = pinnedCount > 0 && pinnedCount === albums.length;
  const hasPins = pinnedCount > 0;
  const multipleUnits = shelfConfig.unit_count > 1;

  // Drag-and-drop is disabled during rebalance apply or when there's only 1 section
  const dragDisabled = applyingRebalance || !multipleUnits;

  const handleSave = async () => {
    setSaving(true);
    try {
      const merged = new Map<string, number>(assignments);
      for (const [albumId, unit] of manualMoves) {
        merged.set(albumId, unit);
      }
      await batchSaveAssignments(merged, shelfConfig.id);
      showToast(`Assigned ${merged.size} records to ${shelfConfig.name}`, 'success');
      setManualMoves(new Map());
      setLocalPins(new Map());
      onAssignmentsSaved();
    } catch {
      showToast('Failed to save assignments', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRebalancePreview = () => {
    const unitsWithPins = units.map(u => ({
      ...u,
      albums: u.albums.map(a => ({
        ...a,
        shelf_manual_override: isAlbumPinned(a),
      })),
    }));
    const plan = generateRebalancePlan(unitsWithPins, shelfConfig, sortScheme);
    setRebalancePlan(plan);
    setShowRebalancePanel(true);
  };

  const handleApplyRebalance = async () => {
    if (!rebalancePlan || rebalancePlan.moves.length === 0) return;
    setApplyingRebalance(true);
    try {
      const moveMap = new Map<string, number>();
      for (const move of rebalancePlan.moves) {
        moveMap.set(move.albumId, move.toUnit);
      }
      await batchSaveAssignments(moveMap, shelfConfig.id);
      showToast(`Rebalanced! Moved ${rebalancePlan.moves.length} album${rebalancePlan.moves.length !== 1 ? 's' : ''}`, 'success');
      setShowRebalancePanel(false);
      setRebalancePlan(null);
      setManualMoves(new Map());
      setLocalPins(new Map());
      onAssignmentsSaved();
    } catch {
      showToast('Failed to apply rebalance', 'error');
    } finally {
      setApplyingRebalance(false);
    }
  };

  const handleClearAllPins = async () => {
    setShowClearPinsConfirm(false);
    setClearingPins(true);
    try {
      // Collect all effectively pinned album IDs
      const pinnedIds: string[] = [];
      for (const u of units) {
        for (const a of u.albums) {
          if (isAlbumPinned(a)) pinnedIds.push(a.id);
        }
      }
      if (pinnedIds.length === 0) return;

      // Optimistic: clear all local pins
      setLocalPins(() => {
        const next = new Map<string, boolean>();
        for (const id of pinnedIds) next.set(id, false);
        return next;
      });

      await batchClearPins(pinnedIds);
      showToast(`Cleared ${pinnedIds.length} pin${pinnedIds.length !== 1 ? 's' : ''}`, 'success');
      onAssignmentsSaved();
    } catch {
      showToast('Failed to clear pins', 'error');
      setLocalPins(new Map()); // revert
    } finally {
      setClearingPins(false);
    }
  };

  // ── Drag handlers ──────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const album = event.active.data.current?.album as Album | undefined;
    setActiveAlbum(album ?? null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveAlbum(null);
    const { active, over } = event;
    if (!over) return;

    const album = active.data.current?.album as Album | undefined;
    if (!album) return;

    const droppedId = String(over.id);
    if (!droppedId.startsWith('section-')) return;
    const targetUnit = parseInt(droppedId.replace('section-', ''), 10);
    if (isNaN(targetUnit)) return;

    // Find current unit for this album
    const currentUnitObj = units.find(u => u.albums.some(a => a.id === album.id));
    if (!currentUnitObj) return;

    // Same section drop — no-op, don't mark as override
    if (currentUnitObj.unitNumber === targetUnit) return;

    // Optimistic local update
    setManualMoves(prev => {
      const next = new Map(prev);
      next.set(album.id, targetUnit);
      return next;
    });
    setLocalPins(prev => {
      const next = new Map(prev);
      next.set(album.id, true);
      return next;
    });

    // Check if target section will be over capacity after the drop
    const targetUnitObj = units.find(u => u.unitNumber === targetUnit);
    const newCount = (targetUnitObj?.albums.length ?? 0) + 1;
    if (newCount > shelfConfig.capacity_per_unit) {
      showToast(`Section ${targetUnit} is now over capacity`, 'warning');
    } else {
      showToast(`Moved to Section ${targetUnit}`, 'success');
    }

    // Persist to DB
    setDragSaving(true);
    assignAlbumToUnit(album.id, targetUnit, true, shelfConfig.id)
      .catch(() => {
        showToast('Failed to save move', 'error');
      })
      .finally(() => {
        setDragSaving(false);
      });
  }, [units, showToast, shelfConfig.capacity_per_unit, shelfConfig.id]);

  const handleDragCancel = useCallback(() => {
    setActiveAlbum(null);
  }, []);

  // ── Unpin handler ──────────────────────────────────────────────────

  const handleUnpin = useCallback((albumId: string) => {
    setLocalPins(prev => {
      const next = new Map(prev);
      next.set(albumId, false);
      return next;
    });

    unpinAlbum(albumId).catch(() => {
      showToast('Failed to remove pin', 'error');
      setLocalPins(prev => {
        const next = new Map(prev);
        next.delete(albumId);
        return next;
      });
    });

    showToast('Pin removed', 'success');
  }, [showToast]);

  // ── Render ─────────────────────────────────────────────────────────

  if (albums.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-12 h-12 mx-auto text-th-text3/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="5" />
        </svg>
        <p className="text-th-text3/60 text-sm">No records in your collection yet.</p>
      </div>
    );
  }

  const isDragActive = activeAlbum !== null;

  // Should we show the rebalance button?
  // Hidden for single-section shelves. Disabled if all albums are pinned.
  const showRebalanceBtn = !balance.isBalanced && multipleUnits;
  const rebalanceDisabled = allPinned;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{ announcements: announcements as unknown as Announcements }}
    >
      <div className="space-y-4">
        {/* Balance status banner */}
        {balance.overflowUnits.length > 0 && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20" role="alert">
            <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div className="text-xs text-red-300">
              {balance.overflowUnits.map(u => {
                const unit = units.find(un => un.unitNumber === u);
                return (
                  <p key={u}>
                    <span className="font-label tracking-wide">Section {u}</span> is over capacity ({unit?.albums.length}/{shelfConfig.capacity_per_unit})
                  </p>
                );
              })}
            </div>
          </div>
        )}
        {balance.overflowUnits.length === 0 && balance.hotUnits.length > 0 && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20" role="status">
            <svg className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="text-xs text-yellow-300">
              {balance.hotUnits.map(u => {
                const unit = units.find(un => un.unitNumber === u);
                return (
                  <p key={u}>
                    <span className="font-label tracking-wide">Section {u}</span> is getting full ({unit?.albums.length}/{shelfConfig.capacity_per_unit})
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-th-text3/70">
            <span className="font-label tracking-wide text-th-text2">{albums.length}</span> record{albums.length !== 1 ? 's' : ''} across{' '}
            <span className="font-label tracking-wide text-th-text2">{shelfConfig.unit_count}</span> section{shelfConfig.unit_count !== 1 ? 's' : ''}
            {overflow && (
              <span className="ml-2 text-yellow-400 font-label tracking-wide">
                — overflow: {albums.length - shelfConfig.unit_count * shelfConfig.capacity_per_unit} extra record{albums.length - shelfConfig.unit_count * shelfConfig.capacity_per_unit !== 1 ? 's' : ''} in last section
              </span>
            )}
            {manualMoves.size > 0 && (
              <span className="ml-2 text-sk-accent font-label tracking-wide">
                — {manualMoves.size} manual move{manualMoves.size !== 1 ? 's' : ''}
              </span>
            )}
            {/* Subtle saving indicator for drag-drop persists */}
            {dragSaving && (
              <span className="ml-2 inline-flex items-center gap-1 text-th-text3/40 font-label tracking-wide">
                <span className="w-2.5 h-2.5 border border-th-text3/30 border-t-th-text2 rounded-full animate-spin" />
                saving
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {manualMoves.size > 0 && (
              <button
                onClick={() => { setManualMoves(new Map()); setLocalPins(new Map()); }}
                className="px-3 py-2 rounded-lg text-th-text3/60 font-label text-sm tracking-wide hover:text-th-text2 hover:bg-th-surface/[0.08] transition-colors"
                aria-label="Undo all manual moves"
              >
                Undo moves
              </button>
            )}
            {/* Clear All Pins */}
            {hasPins && (
              <div className="relative">
                <button
                  onClick={() => setShowClearPinsConfirm(true)}
                  disabled={clearingPins}
                  className="px-3 py-2 rounded-lg text-th-text3/60 font-label text-sm tracking-wide hover:text-th-text2 hover:bg-th-surface/[0.08] transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  aria-label="Clear all manual placements"
                >
                  {clearingPins && (
                    <span className="w-3 h-3 border border-th-text3/30 border-t-th-text2 rounded-full animate-spin" />
                  )}
                  Clear Pins
                </button>
                {showClearPinsConfirm && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-64 p-3 rounded-xl glass-morphism border border-th-surface/[0.12] shadow-lg shadow-black/20">
                    <p className="text-xs text-th-text3/70 mb-2">
                      Remove all manual placements? Albums will follow your sort order on next rebalance.
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowClearPinsConfirm(false)}
                        className="px-2.5 py-1 rounded text-xs text-th-text3/60 hover:text-th-text2 transition-colors"
                        aria-label="Cancel clear pins"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleClearAllPins}
                        className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 text-xs font-label tracking-wide hover:bg-red-500/30 transition-colors"
                        aria-label="Confirm clear all pins"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {showRebalanceBtn && (
              <button
                onClick={handleRebalancePreview}
                disabled={rebalanceDisabled}
                className="px-4 py-2 rounded-lg bg-th-surface/[0.12] text-th-text2 font-label text-sm tracking-wide hover:bg-th-surface/[0.2] transition-colors border border-th-surface/[0.08] flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={rebalanceDisabled ? 'All albums are manually placed' : 'Preview shelf rebalance plan'}
                title={rebalanceDisabled ? 'All albums are manually placed' : undefined}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
                Rebalance
              </button>
            )}
            <button
              onClick={() => {
                const result = generateShelfCatalogCSV(albums, [shelfConfig], sortScheme);
                showToast(`Downloaded ${result.albumCount} records`, 'success');
              }}
              disabled={albums.length === 0}
              className="px-3 py-2 rounded-lg text-th-text3/60 font-label text-sm tracking-wide hover:text-th-text2 hover:bg-th-surface/[0.08] transition-colors flex items-center gap-1.5 disabled:opacity-40"
              aria-label="Download this shelf's catalog as CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-sk-accent text-white font-label text-sm tracking-wide hover:bg-sk-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              aria-label="Save shelf assignments"
            >
              {saving && (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {saving ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </div>

        {/* Rebalance preview panel */}
        {showRebalancePanel && (
          <section className="glass-morphism rounded-xl overflow-hidden" aria-label="Rebalance preview">
            <div className="px-4 py-3 border-b border-th-surface/[0.08]">
              <h4 className="font-label text-sm tracking-widest uppercase font-bold text-th-text">
                Rebalance Preview
              </h4>
              <p className="text-xs text-th-text3/70 mt-1">
                {rebalancePlan && rebalancePlan.moves.length > 0
                  ? `Move ${rebalancePlan.moves.length} album${rebalancePlan.moves.length !== 1 ? 's' : ''} to even out your shelves`
                  : 'Your shelves are already balanced!'}
              </p>
            </div>

            {rebalancePlan && rebalancePlan.moves.length > 0 ? (
              <>
                {/* Before / After distribution */}
                <div className="px-4 py-3 border-b border-th-surface/[0.06]">
                  <p className="text-[10px] font-label tracking-widest uppercase text-th-text3/60 mb-2">Distribution</p>
                  <div className="space-y-1.5">
                    {units.map(({ unitNumber, albums: unitAlbums }, idx) => {
                      const cap = shelfConfig.capacity_per_unit;
                      const before = unitAlbums.length;
                      const after = rebalancePlan.newDistribution[idx] ?? 0;
                      const changed = before !== after;
                      return (
                        <div key={unitNumber} className="flex items-center gap-3 text-xs">
                          <span className="w-16 text-th-text3/70 font-label tracking-wide flex-shrink-0">Sec {unitNumber}</span>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-2 bg-th-surface/[0.08] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${capacityBarColor(before, cap)}`}
                                style={{ width: `${Math.min(100, (before / cap) * 100)}%` }}
                              />
                            </div>
                            <span className={`w-7 text-right font-label tracking-wide ${capacityColor(before, cap)}`}>{before}</span>
                          </div>
                          <svg className={`w-3.5 h-3.5 flex-shrink-0 ${changed ? 'text-th-text2' : 'text-th-text3/20'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-2 bg-th-surface/[0.08] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${changed ? 'bg-emerald-400' : capacityBarColor(after, cap)}`}
                                style={{ width: `${Math.min(100, (after / cap) * 100)}%` }}
                              />
                            </div>
                            <span className={`w-7 text-right font-label tracking-wide ${changed ? 'text-emerald-400' : 'text-th-text3/60'}`}>{after}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Move list */}
                <div className="max-h-64 overflow-y-auto">
                  <ul className="divide-y divide-th-surface/[0.06]" role="list" aria-label="Albums to move">
                    {rebalancePlan.moves.map((move) => {
                      const album = albums.find(a => a.id === move.albumId);
                      return (
                        <li key={move.albumId} className="flex items-center gap-3 px-4 py-2">
                          <div className="w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-th-surface/[0.08]">
                            {album?.cover_url ? (
                              <img
                                src={proxyImageUrl(album.cover_url) || album.cover_url}
                                alt={`Cover for ${move.albumTitle} by ${move.albumArtist}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-th-text3/20">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <circle cx="12" cy="12" r="10" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-th-text truncate">{move.albumArtist} — <span className="text-th-text3/60">{move.albumTitle}</span></p>
                            <p className="text-[10px] text-th-text3/60 font-label tracking-wide">
                              Section {move.fromUnit} → Section {move.toUnit}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-th-surface/[0.08]">
                  <button
                    onClick={() => { setShowRebalancePanel(false); setRebalancePlan(null); }}
                    className="px-4 py-2 rounded-lg text-th-text3/60 font-label text-sm tracking-wide hover:text-th-text2 hover:bg-th-surface/[0.08] transition-colors"
                    aria-label="Cancel rebalance"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyRebalance}
                    disabled={applyingRebalance}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-label text-sm tracking-wide hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    aria-label="Apply rebalance plan"
                  >
                    {applyingRebalance && (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    )}
                    {applyingRebalance ? 'Applying...' : 'Apply Rebalance'}
                  </button>
                </div>
              </>
            ) : (
              /* Zero moves — already balanced after accounting for pins */
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-emerald-400 font-label tracking-wide">No moves needed</p>
                <button
                  onClick={() => { setShowRebalancePanel(false); setRebalancePlan(null); }}
                  className="mt-3 px-4 py-2 rounded-lg text-th-text3/60 font-label text-sm tracking-wide hover:text-th-text2 hover:bg-th-surface/[0.08] transition-colors"
                  aria-label="Close rebalance panel"
                >
                  Close
                </button>
              </div>
            )}
          </section>
        )}

        {/* Units */}
        {units.map(({ unitNumber, albums: unitAlbums }) => (
          <DroppableSection
            key={unitNumber}
            unitNumber={unitNumber}
            unitAlbums={unitAlbums}
            capacity={shelfConfig.capacity_per_unit}
            isOverflow={unitNumber === shelfConfig.unit_count && overflow}
            isDragActive={isDragActive}
            dragDisabled={dragDisabled}
            isPinnedFn={isAlbumPinned}
            onUnpin={handleUnpin}
          />
        ))}
      </div>

      {/* Drag overlay — follows cursor */}
      <DragOverlay dropAnimation={null}>
        {activeAlbum ? <DragOverlayCard album={activeAlbum} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default ShelfView;
