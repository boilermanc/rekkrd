import React, { useState, useRef, useCallback } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useToast } from '../../contexts/ToastContext';
import type {
  StakkdRoom,
  StakkdRoomFeature,
  CreateRoomFeaturePayload,
} from '../../types/room';

// ── Props ────────────────────────────────────────────────────────────

interface RoomFeaturesEditorProps {
  room: StakkdRoom;
  onAddFeature: (payload: CreateRoomFeaturePayload) => Promise<StakkdRoomFeature>;
  onRemoveFeature: (id: string) => Promise<void>;
  onClose: () => void;
}

// ── Constants ────────────────────────────────────────────────────────

type Wall = 'north' | 'south' | 'east' | 'west';
type FeatureType = StakkdRoomFeature['feature_type'];

const WALLS: { value: Wall; label: string }[] = [
  { value: 'north', label: 'North' },
  { value: 'south', label: 'South' },
  { value: 'east', label: 'East' },
  { value: 'west', label: 'West' },
];

const FEATURE_TYPES: { value: FeatureType; label: string }[] = [
  { value: 'door', label: 'Door' },
  { value: 'window', label: 'Window' },
  { value: 'closet', label: 'Closet' },
  { value: 'fireplace', label: 'Fireplace' },
  { value: 'stairs', label: 'Stairs' },
  { value: 'opening', label: 'Opening' },
];

const FEATURE_ICONS: Record<FeatureType, React.ReactNode> = {
  door: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  ),
  window: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  ),
  closet: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <circle cx="10" cy="12" r="0.5" fill="currentColor" />
      <circle cx="14" cy="12" r="0.5" fill="currentColor" />
    </svg>
  ),
  fireplace: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
    </svg>
  ),
  stairs: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h4v-4h4v-4h4V9h4V5h2" />
    </svg>
  ),
  opening: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  ),
};

const FEATURE_COLORS: Record<FeatureType, string> = {
  door: '#8B3252',
  window: '#4a90d9',
  closet: '#8b7355',
  fireplace: '#e85d3a',
  stairs: '#7c6f9f',
  opening: '#5fa87f',
};

const WALL_LABEL_MAP: Record<Wall, string> = {
  north: 'N',
  south: 'S',
  east: 'E',
  west: 'W',
};

// ── Inline Add Form ─────────────────────────────────────────────────

interface AddFeatureFormProps {
  wall: Wall;
  wallLength: number;
  roomId: string;
  onSave: (payload: CreateRoomFeaturePayload) => Promise<void>;
  onCancel: () => void;
}

const AddFeatureForm: React.FC<AddFeatureFormProps> = ({
  wall,
  wallLength,
  roomId,
  onSave,
  onCancel,
}) => {
  const [featureType, setFeatureType] = useState<FeatureType>('door');
  const [positionPct, setPositionPct] = useState(50);
  const [widthFt, setWidthFt] = useState('3.0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const maxWidth = Math.max(1, wallLength / 2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(widthFt);
    if (isNaN(w) || w < 1 || w > maxWidth) return;

    setSaving(true);
    try {
      await onSave({
        room_id: roomId,
        feature_type: featureType,
        wall,
        position_pct: positionPct,
        width_ft: w,
        notes: notes.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-th-surface/20 bg-th-bg text-th-text placeholder:text-th-text3/60 focus:outline-none focus:ring-2 focus:ring-sk-accent/30 focus:border-sk-accent/60 transition-colors';
  const labelClass = 'block text-xs font-medium mb-1 text-th-text3';

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-xl border border-sk-accent/20 bg-th-surface/[0.04] p-4 space-y-3"
    >
      <p className="text-xs font-semibold text-sk-accent uppercase tracking-widest">
        Add to {wall} wall
      </p>

      {/* Feature type */}
      <div>
        <label htmlFor={`ft-type-${wall}`} className={labelClass}>Type</label>
        <select
          id={`ft-type-${wall}`}
          value={featureType}
          onChange={e => setFeatureType(e.target.value as FeatureType)}
          aria-label="Feature type"
          className={inputClass}
        >
          {FEATURE_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Position slider */}
      <div>
        <label htmlFor={`ft-pos-${wall}`} className={labelClass}>
          Position along wall — {positionPct}%
        </label>
        <input
          id={`ft-pos-${wall}`}
          type="range"
          min={0}
          max={100}
          value={positionPct}
          onChange={e => setPositionPct(Number(e.target.value))}
          aria-label={`Position along ${wall} wall`}
          className="w-full accent-sk-accent"
        />
      </div>

      {/* Width */}
      <div>
        <label htmlFor={`ft-width-${wall}`} className={labelClass}>
          Width (ft) — max {maxWidth.toFixed(1)}
        </label>
        <input
          id={`ft-width-${wall}`}
          type="number"
          value={widthFt}
          onChange={e => setWidthFt(e.target.value)}
          min={1}
          max={maxWidth}
          step={0.5}
          aria-label="Feature width in feet"
          className={inputClass}
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor={`ft-notes-${wall}`} className={labelClass}>Notes (optional)</label>
        <input
          id={`ft-notes-${wall}`}
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. French doors"
          aria-label="Feature notes"
          className={inputClass}
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel adding feature"
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-th-surface/10 text-th-text3 hover:bg-th-surface/20 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          aria-label="Save feature"
          className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 bg-sk-accent hover:bg-sk-accent-hover"
        >
          {saving && (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {saving ? 'Saving...' : 'Add'}
        </button>
      </div>
    </form>
  );
};

// ── Delete Confirmation Inline ──────────────────────────────────────

interface DeleteConfirmProps {
  feature: StakkdRoomFeature;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ feature, onConfirm, onCancel }) => (
  <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-red-500/10 text-xs">
    <span className="text-th-text3">Delete {feature.feature_type}?</span>
    <button
      onClick={onConfirm}
      aria-label={`Confirm delete ${feature.feature_type}`}
      className="text-red-400 font-semibold hover:text-red-300 transition-colors"
    >
      Yes
    </button>
    <button
      onClick={onCancel}
      aria-label="Cancel delete"
      className="text-th-text3 hover:text-th-text transition-colors"
    >
      No
    </button>
  </div>
);

// ── SVG Room Preview ────────────────────────────────────────────────

interface RoomPreviewProps {
  room: StakkdRoom;
  features: StakkdRoomFeature[];
  addingWall: Wall | null;
  addingPositionPct: number;
}

const PADDING = 40;
const LABEL_OFFSET = 18;

const RoomPreview: React.FC<RoomPreviewProps> = ({ room, features, addingWall, addingPositionPct }) => {
  const w = room.width_ft;
  const l = room.length_ft;
  const svgW = w + PADDING * 2;
  const svgH = l + PADDING * 2;

  const wallSegments: Record<Wall, { x1: number; y1: number; x2: number; y2: number; length: number }> = {
    north: { x1: PADDING, y1: PADDING, x2: PADDING + w, y2: PADDING, length: w },
    south: { x1: PADDING, y1: PADDING + l, x2: PADDING + w, y2: PADDING + l, length: w },
    west:  { x1: PADDING, y1: PADDING, x2: PADDING, y2: PADDING + l, length: l },
    east:  { x1: PADDING + w, y1: PADDING, x2: PADDING + w, y2: PADDING + l, length: l },
  };

  function featurePos(f: StakkdRoomFeature) {
    const seg = wallSegments[f.wall];
    const t = f.position_pct / 100;
    const halfW = (f.width_ft / seg.length) * Math.abs(seg.x2 - seg.x1 || seg.y2 - seg.y1) / 2;
    const isHorizontal = f.wall === 'north' || f.wall === 'south';

    if (isHorizontal) {
      const cx = seg.x1 + t * (seg.x2 - seg.x1);
      return { x: cx - halfW, y: seg.y1 - 3, w: halfW * 2, h: 6, cx, cy: seg.y1 };
    } else {
      const cy = seg.y1 + t * (seg.y2 - seg.y1);
      return { x: seg.x1 - 3, y: cy - halfW, w: 6, h: halfW * 2, cx: seg.x1, cy };
    }
  }

  function ghostPos() {
    if (!addingWall) return null;
    const seg = wallSegments[addingWall];
    const t = addingPositionPct / 100;
    const isHorizontal = addingWall === 'north' || addingWall === 'south';
    // Use a default 3ft width for the ghost
    const ghostWidthPx = (3 / seg.length) * Math.abs(seg.x2 - seg.x1 || seg.y2 - seg.y1) / 2;

    if (isHorizontal) {
      const cx = seg.x1 + t * (seg.x2 - seg.x1);
      return { x: cx - ghostWidthPx, y: seg.y1 - 3, w: ghostWidthPx * 2, h: 6 };
    } else {
      const cy = seg.y1 + t * (seg.y2 - seg.y1);
      return { x: seg.x1 - 3, y: cy - ghostWidthPx, w: 6, h: ghostWidthPx * 2 };
    }
  }

  const ghost = ghostPos();

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-h-[280px]"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Top-down room preview, ${w} by ${l} feet`}
    >
      {/* Grid background */}
      <defs>
        <pattern id="grid" width={2} height={2} patternUnits="userSpaceOnUse" x={PADDING} y={PADDING}>
          <rect width={2} height={2} fill="none" />
          <rect width={0.5} height={0.5} fill="currentColor" className="text-th-surface/[0.06]" />
        </pattern>
      </defs>

      {/* Room fill */}
      <rect
        x={PADDING}
        y={PADDING}
        width={w}
        height={l}
        fill="url(#grid)"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-th-surface/30"
        rx={1}
      />

      {/* Wall labels */}
      <text x={PADDING + w / 2} y={PADDING - LABEL_OFFSET} textAnchor="middle" className="text-th-text3 fill-current" style={{ fontSize: 5, fontWeight: 600, letterSpacing: '0.1em' }}>
        NORTH
      </text>
      <text x={PADDING + w / 2} y={PADDING + l + LABEL_OFFSET + 4} textAnchor="middle" className="text-th-text3 fill-current" style={{ fontSize: 5, fontWeight: 600, letterSpacing: '0.1em' }}>
        SOUTH
      </text>
      <text x={PADDING - LABEL_OFFSET} y={PADDING + l / 2} textAnchor="middle" dominantBaseline="middle" className="text-th-text3 fill-current" style={{ fontSize: 5, fontWeight: 600, letterSpacing: '0.1em' }} transform={`rotate(-90 ${PADDING - LABEL_OFFSET} ${PADDING + l / 2})`}>
        WEST
      </text>
      <text x={PADDING + w + LABEL_OFFSET} y={PADDING + l / 2} textAnchor="middle" dominantBaseline="middle" className="text-th-text3 fill-current" style={{ fontSize: 5, fontWeight: 600, letterSpacing: '0.1em' }} transform={`rotate(90 ${PADDING + w + LABEL_OFFSET} ${PADDING + l / 2})`}>
        EAST
      </text>

      {/* Dimension labels */}
      <text x={PADDING + w / 2} y={PADDING - LABEL_OFFSET - 6} textAnchor="middle" className="text-th-text3/40 fill-current" style={{ fontSize: 3.5 }}>
        {w} ft
      </text>
      <text x={PADDING - LABEL_OFFSET - 6} y={PADDING + l / 2} textAnchor="middle" dominantBaseline="middle" className="text-th-text3/40 fill-current" style={{ fontSize: 3.5 }} transform={`rotate(-90 ${PADDING - LABEL_OFFSET - 6} ${PADDING + l / 2})`}>
        {l} ft
      </text>

      {/* Ghost preview of feature being added */}
      {ghost && (
        <rect
          x={ghost.x}
          y={ghost.y}
          width={ghost.w}
          height={ghost.h}
          className="fill-sk-accent"
          opacity={0.35}
          rx={0.5}
        />
      )}

      {/* Existing features */}
      {features.map(f => {
        const pos = featurePos(f);
        const color = FEATURE_COLORS[f.feature_type];
        return (
          <g key={f.id}>
            <rect
              x={pos.x}
              y={pos.y}
              width={pos.w}
              height={pos.h}
              fill={color}
              opacity={0.8}
              rx={0.5}
            />
            <title>
              {f.feature_type} — {f.wall} wall at {f.position_pct}% ({f.width_ft} ft){f.notes ? ` — ${f.notes}` : ''}
            </title>
          </g>
        );
      })}
    </svg>
  );
};

// ── Main Component ──────────────────────────────────────────────────

const RoomFeaturesEditor: React.FC<RoomFeaturesEditorProps> = ({
  room,
  onAddFeature,
  onRemoveFeature,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);
  const { showToast } = useToast();

  const [features, setFeatures] = useState<StakkdRoomFeature[]>(room.features ?? []);
  const [addingWall, setAddingWall] = useState<Wall | null>(null);
  const [addingPositionPct, setAddingPositionPct] = useState(50);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const wallLength = (wall: Wall): number =>
    wall === 'north' || wall === 'south' ? room.width_ft : room.length_ft;

  const handleAddFeature = async (payload: CreateRoomFeaturePayload) => {
    const feature = await onAddFeature(payload);
    setFeatures(prev => [...prev, feature]);
    setAddingWall(null);
    setAddingPositionPct(50);
    showToast(`${payload.feature_type} added to ${payload.wall} wall`, 'success');
  };

  const handleRemoveFeature = async (id: string) => {
    setDeleting(true);
    try {
      await onRemoveFeature(id);
      const removed = features.find(f => f.id === id);
      setFeatures(prev => prev.filter(f => f.id !== id));
      setDeletingId(null);
      if (removed) {
        showToast(`${removed.feature_type} removed`, 'success');
      }
    } catch {
      // useRooms already shows toast on error
    } finally {
      setDeleting(false);
    }
  };

  const featuresOnWall = (wall: Wall) => features.filter(f => f.wall === wall);

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-th-surface/20 bg-th-bg text-th-text placeholder:text-th-text3/60 focus:outline-none focus:ring-2 focus:ring-sk-accent/30 focus:border-sk-accent/60 transition-colors';

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Room features for ${room.name}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-th-bg/95 p-4 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="relative w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-2xl border border-th-surface/[0.10] bg-th-bg shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-th-surface/10 bg-th-bg">
          <div>
            <h2 className="text-base font-semibold text-th-text">{room.name} — Features</h2>
            <p className="text-th-text3 text-[10px] uppercase tracking-widest mt-0.5">
              {room.width_ft} &times; {room.length_ft} ft &middot; {features.length} {features.length === 1 ? 'feature' : 'features'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close features editor"
            className="p-1.5 rounded-lg hover:bg-th-surface/10 transition-colors"
          >
            <svg className="w-5 h-5 text-th-text3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* SVG Room Preview */}
          <div className="rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-4">
            <RoomPreview
              room={room}
              features={features}
              addingWall={addingWall}
              addingPositionPct={addingWall ? addingPositionPct : 50}
            />
          </div>

          {/* Wall sections with add buttons */}
          <div className="space-y-4">
            {WALLS.map(({ value: wall, label }) => {
              const wallFeatures = featuresOnWall(wall);
              const isAdding = addingWall === wall;
              const wl = wallLength(wall);

              return (
                <div key={wall} className="rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-th-text uppercase tracking-widest">
                      {label} Wall
                      <span className="text-th-text3/70 ml-2 font-normal normal-case tracking-normal">
                        {wl} ft
                      </span>
                    </h3>
                    {!isAdding && (
                      <button
                        type="button"
                        onClick={() => { setAddingWall(wall); setAddingPositionPct(50); }}
                        aria-label={`Add feature to ${label} wall`}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-sk-accent hover:text-sk-accent-hover transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add
                      </button>
                    )}
                  </div>

                  {/* Existing features on this wall */}
                  {wallFeatures.length > 0 ? (
                    <div className="space-y-1.5 mb-2">
                      {wallFeatures.map(f => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-th-surface/[0.05] group/feat"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span style={{ color: FEATURE_COLORS[f.feature_type] }}>
                              {FEATURE_ICONS[f.feature_type]}
                            </span>
                            <span className="text-xs text-th-text font-medium capitalize truncate">
                              {f.feature_type}
                            </span>
                            <span className="text-[10px] text-th-text3/70">
                              {f.position_pct}% &middot; {f.width_ft} ft
                            </span>
                            {f.notes && (
                              <span className="text-[10px] text-th-text3/60 truncate hidden sm:inline">
                                — {f.notes}
                              </span>
                            )}
                          </div>

                          {deletingId === f.id ? (
                            <DeleteConfirm
                              feature={f}
                              onConfirm={() => handleRemoveFeature(f.id)}
                              onCancel={() => setDeletingId(null)}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingId(f.id)}
                              disabled={deleting}
                              aria-label={`Delete ${f.feature_type}`}
                              className="p-1 rounded text-th-text3/40 hover:text-red-400 opacity-0 group-hover/feat:opacity-100 focus:opacity-100 transition-all"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    !isAdding && (
                      <p className="text-th-text3/50 text-xs mb-2">No features on this wall</p>
                    )
                  )}

                  {/* Inline add form */}
                  {isAdding && (
                    <AddFeatureForm
                      wall={wall}
                      wallLength={wl}
                      roomId={room.id}
                      onSave={handleAddFeature}
                      onCancel={() => { setAddingWall(null); setAddingPositionPct(50); }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Feature list summary */}
          {features.length > 0 && (
            <div className="rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-4">
              <h3 className="text-xs font-semibold text-th-text uppercase tracking-widest mb-3">
                All Features
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" role="table" aria-label="Room features list">
                  <thead>
                    <tr className="text-th-text3/50 border-b border-th-surface/10">
                      <th className="text-left py-1.5 pr-3 font-medium" role="columnheader">Type</th>
                      <th className="text-left py-1.5 pr-3 font-medium" role="columnheader">Wall</th>
                      <th className="text-left py-1.5 pr-3 font-medium" role="columnheader">Position</th>
                      <th className="text-left py-1.5 pr-3 font-medium" role="columnheader">Width</th>
                      <th className="text-right py-1.5 font-medium" role="columnheader"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map(f => (
                      <tr key={f.id} className="border-b border-th-surface/[0.05] last:border-0">
                        <td className="py-1.5 pr-3 text-th-text capitalize">{f.feature_type}</td>
                        <td className="py-1.5 pr-3 text-th-text3">{WALL_LABEL_MAP[f.wall]}</td>
                        <td className="py-1.5 pr-3 text-th-text3">{f.position_pct}%</td>
                        <td className="py-1.5 pr-3 text-th-text3">{f.width_ft} ft</td>
                        <td className="py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              deletingId === f.id
                                ? handleRemoveFeature(f.id)
                                : setDeletingId(f.id)
                            }
                            aria-label={`Delete ${f.feature_type} from ${f.wall} wall`}
                            className="text-th-text3/40 hover:text-red-400 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomFeaturesEditor;
