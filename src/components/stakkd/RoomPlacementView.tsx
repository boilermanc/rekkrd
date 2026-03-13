import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useToast } from '../../contexts/ToastContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { supabase } from '../../services/supabaseService';
import { useRoomLayouts } from '../../hooks/useRoomLayouts';
import RoomDiagram from './RoomDiagram';
import type {
  StakkdRoom,
  StakkdRoomFeature,
  PlacementResponse,
} from '../../types/room';

// ── Props ────────────────────────────────────────────────────────────

interface RoomPlacementViewProps {
  room: StakkdRoom;
  features: StakkdRoomFeature[];
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const session = await supabase?.auth.getSession();
  const token = session?.data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return token;
}

function positionDescription(xPct: number, yPct: number, widthFt: number, lengthFt: number): string {
  const xLabel = xPct < 33 ? 'Left' : xPct > 67 ? 'Right' : 'Center';
  const yLabel = yPct < 33 ? 'Front' : yPct > 67 ? 'Back' : 'Mid';
  const fromNorth = ((yPct / 100) * lengthFt).toFixed(1);
  const fromWest = ((xPct / 100) * widthFt).toFixed(1);
  return `${yLabel}-${xLabel.toLowerCase()}, ${fromNorth}ft from north, ${fromWest}ft from west`;
}

const FACING_LABELS: Record<string, string> = {
  north: 'Facing north',
  south: 'Facing south',
  east: 'Facing east',
  west: 'Facing west',
};

// ── Main Component ──────────────────────────────────────────────────

const RoomPlacementView: React.FC<RoomPlacementViewProps> = ({ room, features, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);
  const { showToast } = useToast();
  const { canUse } = useSubscription();
  const hasAccess = canUse('room_planner');

  const [result, setResult] = useState<PlacementResponse | null>(null);
  const [gearCategories, setGearCategories] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  // Layout persistence
  const {
    layouts,
    activeLayout,
    loading: layoutLoading,
    fetchLayouts,
    fetchActiveLayout,
    saveLayout,
    renameLayout,
    activateLayout,
    deleteLayout,
  } = useRoomLayouts(room.id);

  const [showLayoutSwitcher, setShowLayoutSwitcher] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Auto-load active layout on mount
  useEffect(() => {
    let cancelled = false;

    async function loadOnMount() {
      const layout = await fetchActiveLayout();
      if (cancelled) return;

      if (layout) {
        setResult({
          placements: layout.placements,
          listening_position: layout.listening_position,
          stereo_triangle: layout.stereo_triangle,
          tips: layout.tips,
        });

        // Also fetch gear categories for icons
        try {
          const token = await getToken();
          const gearRes = await fetch('/api/gear', {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (gearRes.ok) {
            const gearItems: { id: string; category: string }[] = await gearRes.json();
            const catMap: Record<string, string> = {};
            for (const g of gearItems) catMap[g.id] = g.category;
            if (!cancelled) setGearCategories(catMap);
          }
        } catch { /* non-critical */ }
      }

      // Also fetch the list for the switcher
      await fetchLayouts();
    }

    loadOnMount();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close switcher on outside click
  useEffect(() => {
    if (!showLayoutSwitcher) return;
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowLayoutSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showLayoutSwitcher]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const token = await getToken();

      const res = await fetch(`/api/stakkd-rooms/${room.id}/placement`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data: PlacementResponse = await res.json();
      setResult(data);

      // Fetch gear categories to map icons
      const gearRes = await fetch('/api/gear', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (gearRes.ok) {
        const gearItems: { id: string; category: string }[] = await gearRes.json();
        const catMap: Record<string, string> = {};
        for (const g of gearItems) catMap[g.id] = g.category;
        setGearCategories(catMap);
      }

      // Auto-save the layout
      const saved = await saveLayout(data);
      if (saved) {
        showToast('Layout generated & saved', 'success');
      } else {
        showToast('Layout generated', 'success');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate layout';
      showToast(message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSwitchLayout = async (layoutId: string) => {
    setShowLayoutSwitcher(false);
    const ok = await activateLayout(layoutId);
    if (ok) {
      const layout = await fetchActiveLayout();
      if (layout) {
        setResult({
          placements: layout.placements,
          listening_position: layout.listening_position,
          stereo_triangle: layout.stereo_triangle,
          tips: layout.tips,
        });
        showToast(`Switched to "${layout.name}"`, 'success');
      }
    }
  };

  const handleRename = async (layoutId: string) => {
    if (!renameValue.trim()) return;
    const ok = await renameLayout(layoutId, renameValue.trim());
    if (ok) {
      showToast('Layout renamed', 'success');
      setRenamingId(null);
      setRenameValue('');
    }
  };

  const handleDelete = async (layoutId: string) => {
    const ok = await deleteLayout(layoutId);
    if (ok) {
      showToast('Layout deleted', 'success');
      setDeletingId(null);
      // If we deleted the active layout, clear the result
      if (activeLayout?.id === layoutId) {
        setResult(null);
      }
    }
  };

  const isLoading = layoutLoading && !result && !generating;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`AI room layout for ${room.name}`}
      className="fixed inset-0 z-[60] flex flex-col bg-th-bg/95 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-th-surface/10 bg-th-bg shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-th-text truncate">{room.name}</h2>
            <p className="text-th-text3 text-[10px] uppercase tracking-widest mt-0.5">
              AI Room Layout &middot; {room.width_ft} &times; {room.length_ft} ft
            </p>
          </div>

          {/* Layout switcher */}
          {layouts.length > 0 && (
            <div className="relative" ref={switcherRef}>
              <button
                type="button"
                onClick={() => setShowLayoutSwitcher(!showLayoutSwitcher)}
                aria-label="Switch layout"
                aria-expanded={showLayoutSwitcher}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-th-surface/[0.08] hover:bg-th-surface/[0.15] transition-colors text-xs text-th-text3"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
                <span className="max-w-[120px] truncate">{activeLayout?.name || 'Layouts'}</span>
                <svg className={`w-3 h-3 transition-transform ${showLayoutSwitcher ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {showLayoutSwitcher && (
                <div className="absolute top-full left-0 mt-1 w-72 rounded-xl border border-th-surface/10 bg-th-bg shadow-xl z-50 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {layouts.map(l => (
                      <div key={l.id} className="border-b border-th-surface/5 last:border-b-0">
                        {renamingId === l.id ? (
                          <div className="flex items-center gap-2 p-3">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRename(l.id);
                                if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                              }}
                              autoFocus
                              className="flex-1 bg-th-surface/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-th-text outline-none focus:ring-1 focus:ring-sk-accent/50"
                            />
                            <button
                              type="button"
                              onClick={() => handleRename(l.id)}
                              className="text-sk-accent text-xs font-bold"
                            >
                              Save
                            </button>
                          </div>
                        ) : deletingId === l.id ? (
                          <div className="flex items-center justify-between p-3">
                            <span className="text-xs text-th-text3">Delete this layout?</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="text-xs text-th-text3 hover:text-th-text"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(l.id)}
                                className="text-xs text-red-400 font-bold hover:text-red-300"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 group">
                            <button
                              type="button"
                              onClick={() => handleSwitchLayout(l.id)}
                              className="flex-1 text-left min-w-0"
                            >
                              <div className="flex items-center gap-2">
                                {l.is_active && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-sk-accent shrink-0" />
                                )}
                                <span className={`text-xs truncate ${l.is_active ? 'text-th-text font-semibold' : 'text-th-text3'}`}>
                                  {l.name}
                                </span>
                              </div>
                              <p className="text-[10px] text-th-text3/70 mt-0.5">
                                {new Date(l.created_at).toLocaleDateString()}
                              </p>
                            </button>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => { setRenamingId(l.id); setRenameValue(l.name); }}
                                aria-label={`Rename ${l.name}`}
                                className="p-1 rounded hover:bg-th-surface/10 text-th-text3"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(l.id)}
                                aria-label={`Delete ${l.name}`}
                                className="p-1 rounded hover:bg-red-500/10 text-th-text3 hover:text-red-400"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!hasAccess && (
            <span className="text-th-text3/60 text-[10px] tracking-wide mr-1">
              Upgrade to Enthusiast to generate AI layouts
            </span>
          )}
          {!generating && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!hasAccess}
              aria-label={
                !hasAccess
                  ? 'Generate room layout — upgrade to Enthusiast required'
                  : result ? 'Regenerate room layout' : 'Generate room layout'
              }
              aria-busy={generating}
              className={`font-bold py-2 px-4 rounded-xl transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2 ${
                hasAccess
                  ? 'bg-sk-accent text-white hover:bg-sk-accent-hover'
                  : 'bg-sk-accent/40 text-white/60 cursor-not-allowed'
              }`}
            >
              {result ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  Regenerate
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                  Generate Layout
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close layout view"
            className="p-1.5 rounded-lg hover:bg-th-surface/10 transition-colors"
          >
            <svg className="w-5 h-5 text-th-text3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Loading saved layout */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="w-8 h-8 border-2 border-sk-accent border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-th-text3 text-sm">Loading saved layout...</p>
          </div>
        )}

        {/* Pre-generate state */}
        {!result && !generating && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-6 max-w-md text-center">
              <RoomDiagram room={room} features={features} interactive={false} />
              <p className="text-th-text3 text-sm mt-4 mb-5">
                Our AI will analyze your room dimensions, features, and gear to recommend optimal placement for each piece of equipment.
              </p>
              {!hasAccess && (
                <p className="text-th-text3/60 text-xs mb-3">
                  Upgrade to Enthusiast to generate AI layouts
                </p>
              )}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!hasAccess}
                aria-label={hasAccess ? 'Generate room layout' : 'Generate room layout — upgrade to Enthusiast required'}
                className={`font-bold py-2.5 px-6 rounded-xl transition-all uppercase tracking-[0.2em] text-[10px] inline-flex items-center gap-2 ${
                  hasAccess
                    ? 'bg-sk-accent text-white hover:bg-sk-accent-hover'
                    : 'bg-sk-accent/40 text-white/60 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                Generate Layout
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {generating && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="relative rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-6 max-w-md">
              <div className="opacity-30">
                <RoomDiagram room={room} features={features} interactive={false} />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-th-bg/60 backdrop-blur-sm rounded-xl">
                <div className="w-8 h-8 border-2 border-sk-accent border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-th-text text-sm font-medium">Analyzing your room and gear...</p>
                <p className="text-th-text3 text-xs mt-1">This may take a few seconds</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !generating && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Diagram — takes 3 of 5 cols */}
            <div className="lg:col-span-3">
              <div className="rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-4">
                <RoomDiagram
                  room={room}
                  features={features}
                  placements={result.placements}
                  listeningPosition={result.listening_position}
                  stereoTriangle={result.stereo_triangle}
                  gearCategories={gearCategories}
                  interactive={true}
                />
              </div>
            </div>

            {/* Sidebar — takes 2 of 5 cols */}
            <div className="lg:col-span-2 space-y-4">
              {/* Gear placements list */}
              <div className="rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-4">
                <h3 className="text-xs font-semibold text-th-text uppercase tracking-widest mb-3">
                  Gear Placements
                </h3>
                <div className="space-y-3">
                  {result.placements.map(p => (
                    <div
                      key={p.gear_id}
                      className="rounded-lg bg-th-surface/[0.05] p-3"
                      tabIndex={0}
                      role="listitem"
                      aria-label={`${p.gear_name} placement`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-th-text">{p.gear_name}</span>
                        <span className="text-[10px] text-sk-accent font-bold uppercase tracking-widest shrink-0">
                          {FACING_LABELS[p.facing] || p.facing}
                        </span>
                      </div>
                      <p className="text-[10px] text-th-text3 mb-1">
                        {positionDescription(p.x_pct, p.y_pct, room.width_ft, room.length_ft)}
                      </p>
                      <p className="text-xs text-th-text3/70">{p.notes}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Listening position card */}
              <div className="rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-4">
                <h3 className="text-xs font-semibold text-th-text uppercase tracking-widest mb-2">
                  Listening Position
                </h3>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#5b8db8' }} />
                  <span className="text-xs text-th-text3">
                    {positionDescription(result.listening_position.x_pct, result.listening_position.y_pct, room.width_ft, room.length_ft)}
                  </span>
                </div>
                <p className="text-xs text-th-text3/70">{result.listening_position.notes}</p>
              </div>

              {/* Stereo triangle card */}
              {result.stereo_triangle && (
                <div className="rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-4">
                  <h3 className="text-xs font-semibold text-th-text uppercase tracking-widest mb-2">
                    Stereo Triangle
                  </h3>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-bold text-sk-accent">
                      {result.stereo_triangle.angle_degrees}&deg;
                    </span>
                    <span className="text-xs text-th-text3">triangle angle</span>
                  </div>
                  <p className="text-xs text-th-text3/70 mb-1">
                    Left: {result.placements.find(p => p.gear_id === result.stereo_triangle?.left_speaker_id)?.gear_name || 'Speaker'}
                  </p>
                  <p className="text-xs text-th-text3/70 mb-1.5">
                    Right: {result.placements.find(p => p.gear_id === result.stereo_triangle?.right_speaker_id)?.gear_name || 'Speaker'}
                  </p>
                  <p className="text-xs text-th-text3/70">{result.stereo_triangle.notes}</p>
                </div>
              )}

              {/* Tips */}
              {result.tips.length > 0 && (
                <div className="rounded-xl border border-sk-accent/15 bg-sk-accent/[0.04] p-4">
                  <h3 className="text-xs font-semibold text-sk-accent uppercase tracking-widest mb-2">
                    Room Tips
                  </h3>
                  <ul className="space-y-2">
                    {result.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-th-text3">
                        <span className="text-sk-accent mt-0.5 shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                          </svg>
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPlacementView;
