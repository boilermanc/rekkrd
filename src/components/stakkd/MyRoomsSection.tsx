import React, { useState, useRef, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import { useRooms } from '../../hooks/useRooms';
import { useToast } from '../../contexts/ToastContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import RoomForm from './RoomForm';
import RoomFeaturesEditor from './RoomFeaturesEditor';
import RoomPlacementView from './RoomPlacementView';
import RoomOnboarding from './RoomOnboarding';
import RoomGuideModal from './RoomGuideModal';
import UpgradePrompt from '../UpgradePrompt';
import type { StakkdRoom, CreateRoomPayload } from '../../types/room';
import { supabase } from '../../services/supabaseService';

// ── Delete Confirmation Dialog ───────────────────────────────────────

interface DeleteDialogProps {
  room: StakkdRoom;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ room, onConfirm, onCancel }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const stableOnCancel = useCallback(onCancel, [onCancel]);
  useFocusTrap(dialogRef, stableOnCancel);

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Delete ${room.name}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm outline-none"
    >
      <div className="w-full max-w-sm rounded-2xl border border-th-surface/[0.10] bg-th-bg p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-th-text mb-2">Delete {room.name}?</h3>
        <p className="text-th-text3 text-sm mb-6">
          This will remove the room and all its features. This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel delete"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-th-surface/10 text-th-text3 hover:bg-th-surface/20 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            aria-label={`Confirm delete ${room.name}`}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Room Card ────────────────────────────────────────────────────────

const SHAPE_LABELS: Record<StakkdRoom['shape'], string> = {
  rectangular: 'Rectangular',
  l_shaped: 'L-Shaped',
  open_concept: 'Open Concept',
};

const FLOOR_LABELS: Record<StakkdRoom['floor_type'], string> = {
  hardwood: 'Hardwood',
  carpet: 'Carpet',
  tile: 'Tile',
  concrete: 'Concrete',
  mixed: 'Mixed',
};

// ── Lock Icon ────────────────────────────────────────────────────────

const LockIcon: React.FC<{ className?: string }> = ({ className = 'w-2.5 h-2.5' }) => (
  <svg className={className} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

interface RoomCardProps {
  room: StakkdRoom;
  hasAccess: boolean;
  onEdit: (room: StakkdRoom) => void;
  onDelete: (room: StakkdRoom) => void;
  onFeatures: (room: StakkdRoom) => void;
  onLayout: (room: StakkdRoom) => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, hasAccess, onEdit, onDelete, onFeatures, onLayout }) => {
  const featureCount = room.feature_count ?? 0;
  const gatedClass = hasAccess
    ? 'text-th-text3/60 hover:text-[#dd6e42] hover:bg-th-surface/[0.1]'
    : 'text-th-text3/40 opacity-60';

  return (
    <div
      className="rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-4 hover:border-[#dd6e42]/30 hover:bg-th-surface/[0.06] transition-all group"
      tabIndex={0}
      role="article"
      aria-label={`${room.name}, ${room.width_ft} by ${room.length_ft} feet`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-th-text text-sm font-semibold truncate">{room.name}</h4>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => onLayout(room)}
            aria-label={hasAccess ? `AI layout for ${room.name}` : `AI layout for ${room.name} — upgrade to Archivist required`}
            className={`relative p-1.5 rounded-lg transition-colors ${gatedClass}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            {!hasAccess && <LockIcon className="w-2 h-2 absolute -top-0.5 -right-0.5 text-th-text3/50" />}
          </button>
          <button
            onClick={() => onFeatures(room)}
            aria-label={hasAccess ? `Features for ${room.name}` : `Features for ${room.name} — upgrade to Archivist required`}
            className={`relative p-1.5 rounded-lg transition-colors ${gatedClass}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            {!hasAccess && <LockIcon className="w-2 h-2 absolute -top-0.5 -right-0.5 text-th-text3/50" />}
          </button>
          <button
            onClick={() => onEdit(room)}
            aria-label={hasAccess ? `Edit ${room.name}` : `Edit ${room.name} — upgrade to Archivist required`}
            className={`relative p-1.5 rounded-lg transition-colors ${gatedClass}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
            {!hasAccess && <LockIcon className="w-2 h-2 absolute -top-0.5 -right-0.5 text-th-text3/50" />}
          </button>
          <button
            onClick={() => onDelete(room)}
            aria-label={`Delete ${room.name}`}
            className="p-1.5 rounded-lg text-th-text3/60 hover:text-red-400 hover:bg-th-surface/[0.1] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dimensions badge */}
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#dd6e42]/10 text-[#dd6e42] text-[10px] font-bold tracking-wide">
          {room.width_ft} &times; {room.length_ft} ft
        </span>
        {featureCount > 0 && (
          <span className="text-th-text3/60 text-[10px] tracking-wide">
            {featureCount} {featureCount === 1 ? 'feature' : 'features'}
          </span>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <span className="px-2 py-0.5 rounded-full border border-th-surface/[0.15] text-th-text3 text-[9px] font-medium uppercase tracking-widest">
          {SHAPE_LABELS[room.shape]}
        </span>
        <span className="px-2 py-0.5 rounded-full border border-th-surface/[0.15] text-th-text3 text-[9px] font-medium uppercase tracking-widest">
          {FLOOR_LABELS[room.floor_type]}
        </span>
      </div>
    </div>
  );
};

// ── Loading Skeleton ─────────────────────────────────────────────────

const RoomSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {[1, 2].map(i => (
      <div key={i} className="rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] p-4 animate-pulse">
        <div className="h-4 w-24 bg-th-surface/[0.12] rounded mb-3" />
        <div className="h-3 w-20 bg-th-surface/[0.08] rounded mb-2" />
        <div className="flex gap-1.5">
          <div className="h-3 w-16 bg-th-surface/[0.08] rounded-full" />
          <div className="h-3 w-14 bg-th-surface/[0.08] rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

// ── Main Section ─────────────────────────────────────────────────────

interface MyRoomsSectionProps {
  onGoHome?: () => void;
}

const MyRoomsSection: React.FC<MyRoomsSectionProps> = ({ onGoHome }) => {
  const { rooms, loading, createRoom, updateRoom, deleteRoom, addFeature, removeFeature } = useRooms();
  const { showToast } = useToast();
  const { canUse } = useSubscription();
  const hasAccess = canUse('room_planner');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingRoom, setEditingRoom] = useState<StakkdRoom | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<StakkdRoom | null>(null);
  const [featuresRoom, setFeaturesRoom] = useState<StakkdRoom | null>(null);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [layoutRoom, setLayoutRoom] = useState<StakkdRoom | null>(null);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('rekkrd_room_onboarding_seen');
  });
  const [showGuide, setShowGuide] = useState(false);

  const handleAddRoom = () => {
    if (!hasAccess) { setShowUpgradePrompt(true); return; }
    setFormMode('create');
    setEditingRoom(null);
    setFormOpen(true);
  };

  const handleEditRoom = (room: StakkdRoom) => {
    if (!hasAccess) { setShowUpgradePrompt(true); return; }
    setFormMode('edit');
    setEditingRoom(room);
    setFormOpen(true);
  };

  const handleSave = async (payload: CreateRoomPayload) => {
    if (formMode === 'edit' && editingRoom) {
      await updateRoom(editingRoom.id, payload);
      showToast('Room updated', 'success');
    } else {
      await createRoom(payload);
      showToast('Room created', 'success');
    }
    setFormOpen(false);
    setEditingRoom(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRoom) return;
    try {
      await deleteRoom(deletingRoom.id);
      showToast(`${deletingRoom.name} deleted`, 'success');
    } catch {
      // useRooms already shows toast on error
    }
    setDeletingRoom(null);
  };

  const fetchFullRoom = async (roomId: string): Promise<StakkdRoom> => {
    const session = await supabase?.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`/api/stakkd-rooms/${roomId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    return res.json();
  };

  const handleOpenFeatures = async (room: StakkdRoom) => {
    if (!hasAccess) { setShowUpgradePrompt(true); return; }
    setFeaturesLoading(true);
    try {
      const fullRoom = await fetchFullRoom(room.id);
      setFeaturesRoom(fullRoom);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load room features';
      showToast(message, 'error');
    } finally {
      setFeaturesLoading(false);
    }
  };

  const handleOpenLayout = async (room: StakkdRoom) => {
    if (!hasAccess) { setShowUpgradePrompt(true); return; }
    setLayoutLoading(true);
    try {
      const fullRoom = await fetchFullRoom(room.id);
      setLayoutRoom(fullRoom);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load room';
      showToast(message, 'error');
    } finally {
      setLayoutLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('rekkrd_room_onboarding_seen', '1');
    setShowOnboarding(false);
  };

  return (
    <section aria-labelledby="my-rooms-heading" className="mt-10 pt-8 border-t border-th-surface/[0.10]">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div>
            <h3 id="my-rooms-heading" className="font-label text-sm md:text-base font-bold tracking-tight text-th-text">
              My Rooms
            </h3>
            <p className="text-th-text3 text-[10px] uppercase tracking-widest mt-0.5">
              {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
            </p>
          </div>
          <button
            onClick={() => setShowGuide(true)}
            className="p-1.5 rounded-lg text-th-text3/50 hover:text-th-text hover:bg-th-surface/[0.06] transition-colors"
            aria-label="Open room planner guide"
            title="Room Planner Guide"
          >
            <HelpCircle size={18} />
          </button>
        </div>
        <button
          onClick={handleAddRoom}
          aria-label={hasAccess ? 'Add new room' : 'Add new room — upgrade to Archivist required'}
          className={`font-bold py-2 px-4 rounded-xl transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2 ${
            hasAccess
              ? 'bg-[#dd6e42] text-th-text hover:bg-[#c45e38]'
              : 'bg-[#dd6e42]/60 text-th-text'
          }`}
        >
          {!hasAccess && <LockIcon className="w-3 h-3" />}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Room
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <RoomSkeleton />
      ) : rooms.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.03] py-12 px-6 text-center">
          {/* Room layout icon */}
          <svg className="w-12 h-12 text-th-text3/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          {hasAccess ? (
            <>
              <p className="text-th-text3 text-sm mb-6 max-w-xs mx-auto">
                Set up your first room to get placement recommendations for your gear
              </p>
              <button
                onClick={handleAddRoom}
                aria-label="Add your first room"
                className="bg-[#dd6e42] text-th-text font-bold py-2.5 px-6 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px] inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Room
              </button>
            </>
          ) : (
            <>
              <p className="text-th-text3 text-sm mb-6 max-w-xs mx-auto">
                Room Planner is an Archivist feature. Set up your listening rooms and get AI-powered gear placement recommendations.
              </p>
              <button
                onClick={() => setShowUpgradePrompt(true)}
                aria-label="Upgrade to Archivist for Room Planner"
                className="bg-[#dd6e42]/60 text-th-text font-bold py-2.5 px-6 rounded-xl transition-all uppercase tracking-[0.2em] text-[10px] inline-flex items-center gap-2"
              >
                <LockIcon className="w-3.5 h-3.5" />
                Upgrade
              </button>
            </>
          )}
        </div>
      ) : (
        /* Room cards grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rooms.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              hasAccess={hasAccess}
              onEdit={handleEditRoom}
              onDelete={setDeletingRoom}
              onFeatures={handleOpenFeatures}
              onLayout={handleOpenLayout}
            />
          ))}
        </div>
      )}

      {/* Room Form Modal */}
      {formOpen && (
        <RoomForm
          mode={formMode}
          initialData={editingRoom ?? undefined}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditingRoom(null); }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingRoom && (
        <DeleteDialog
          room={deletingRoom}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingRoom(null)}
        />
      )}

      {/* Features Editor */}
      {featuresRoom && (
        <RoomFeaturesEditor
          room={featuresRoom}
          onAddFeature={addFeature}
          onRemoveFeature={(id) => removeFeature(id, featuresRoom.id)}
          onClose={() => setFeaturesRoom(null)}
        />
      )}

      {/* Placement View */}
      {layoutRoom && (
        <RoomPlacementView
          room={layoutRoom}
          features={layoutRoom.features ?? []}
          onClose={() => setLayoutRoom(null)}
        />
      )}

      {/* Loading overlay (features or layout) */}
      {(featuresLoading || layoutLoading) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-th-bg/80 backdrop-blur-sm">
          <div className="w-6 h-6 border-2 border-[#dd6e42] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Upgrade Prompt */}
      {showUpgradePrompt && (
        <UpgradePrompt
          feature="room_planner"
          onClose={() => setShowUpgradePrompt(false)}
          onUpgrade={() => setShowUpgradePrompt(false)}
        />
      )}

      {/* Onboarding overlay (first visit only, Archivist users) */}
      {showOnboarding && hasAccess && (
        <RoomOnboarding onComplete={handleOnboardingComplete} onGoHome={onGoHome} />
      )}

      {/* User guide modal (always accessible) */}
      <RoomGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </section>
  );
};

export default MyRoomsSection;
