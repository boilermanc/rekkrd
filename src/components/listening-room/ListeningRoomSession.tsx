import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Disc3, GripVertical, Save } from 'lucide-react';
import { Album } from '../../../types';
import { proxyImageUrl } from '../../../services/imageProxy';
import ListeningRoomSignalChain from './ListeningRoomSignalChain';
import ListeningRoomSuggestions from './ListeningRoomSuggestions';

interface ListeningRoomSessionProps {
  sessionAlbums: Album[];
  allAlbums: Album[];
  sessionAlbumIds: Set<string>;
  onRemoveAlbum: (albumId: string) => void;
  onReorder: (albums: Album[]) => void;
  onSaveAsPlaylist: (name: string, albumIds: string[]) => void;
  nowSpinningId: string | null;
  onSetNowSpinning: (albumId: string) => void;
  onSelectAlbum: (album: Album) => void;
  onQuickAdd: (album: Album) => void;
  initialSessionName?: string;
  ambientMode?: boolean;
}

const ESTIMATED_LP_MINUTES = 40;

const ListeningRoomSession: React.FC<ListeningRoomSessionProps> = ({
  sessionAlbums,
  allAlbums,
  sessionAlbumIds,
  onRemoveAlbum,
  onReorder,
  onSaveAsPlaylist,
  nowSpinningId,
  onSetNowSpinning,
  onSelectAlbum,
  onQuickAdd,
  initialSessionName,
  ambientMode,
}) => {
  const [sessionName, setSessionName] = useState('Listening Session');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(sessionName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Live region announcements
  const [announcement, setAnnouncement] = useState('');
  const [spinAnnouncement, setSpinAnnouncement] = useState('');

  useEffect(() => {
    if (initialSessionName) setSessionName(initialSessionName);
  }, [initialSessionName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Announce now-spinning changes
  useEffect(() => {
    if (nowSpinningId) {
      const album = sessionAlbums.find((a) => a.id === nowSpinningId);
      if (album) {
        setSpinAnnouncement(`Now spinning: ${album.artist} – ${album.title}`);
      }
    } else {
      setSpinAnnouncement('Stopped spinning');
    }
  }, [nowSpinningId, sessionAlbums]);

  const handleStartEdit = () => {
    setEditValue(sessionName);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed) setSessionName(trimmed);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(sessionName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') handleCancel();
  };

  // ── Drag handlers ──────────────────────────────────────────

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLSpanElement>, index: number) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setOverIndex(index);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
      e.preventDefault();
      const fromIndex = dragIndex;
      setDragIndex(null);
      setOverIndex(null);

      if (fromIndex === null || fromIndex === dropIndex) return;

      const next = [...sessionAlbums];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(dropIndex, 0, moved);
      onReorder(next);

      setAnnouncement(
        `Moved ${moved.title} to position ${dropIndex + 1}`
      );
    },
    [dragIndex, sessionAlbums, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  // ── Touch drag handlers ────────────────────────────────────

  const touchState = useRef<{
    index: number;
    startY: number;
    currentY: number;
    itemHeight: number;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLSpanElement>, index: number) => {
      const touch = e.touches[0];
      const item = (e.currentTarget as HTMLElement).closest('[role="listitem"]') as HTMLElement | null;
      const itemHeight = item?.getBoundingClientRect().height ?? 56;
      touchState.current = { index, startY: touch.clientY, currentY: touch.clientY, itemHeight };
      setDragIndex(index);
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLSpanElement>) => {
      if (!touchState.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      touchState.current.currentY = touch.clientY;
      const delta = touch.clientY - touchState.current.startY;
      const offset = Math.round(delta / touchState.current.itemHeight);
      const newOver = Math.max(0, Math.min(sessionAlbums.length - 1, touchState.current.index + offset));
      setOverIndex(newOver);
    },
    [sessionAlbums.length]
  );

  const handleTouchEnd = useCallback(() => {
    if (!touchState.current) return;
    const fromIndex = touchState.current.index;
    const toIndex = overIndex;
    touchState.current = null;
    setDragIndex(null);
    setOverIndex(null);

    if (toIndex === null || fromIndex === toIndex) return;

    const next = [...sessionAlbums];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorder(next);

    setAnnouncement(
      `Moved ${moved.title} to position ${toIndex + 1}`
    );
  }, [overIndex, sessionAlbums, onReorder]);

  // ── Save handler ───────────────────────────────────────────

  const handleSaveAsPlaylist = () => {
    onSaveAsPlaylist(sessionName, sessionAlbums.map((a) => a.id));
  };

  const estimatedMinutes = sessionAlbums.length * ESTIMATED_LP_MINUTES;

  return (
    <div className={`flex-1 flex flex-col transition-colors duration-500 ${
      ambientMode ? 'bg-[#141414]' : 'bg-th-bg2/30'
    }`}>
      {/* Aria live regions */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {spinAnnouncement}
      </div>

      {/* Session header */}
      <div className="px-4 pt-5 pb-3">
        {isEditing ? (
          <label className="block">
            <span className="sr-only">Session name</span>
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              aria-label="Session name"
              className={`w-full bg-transparent border-b border-[#dd6e42]/40 font-display text-xl outline-none pb-1 transition-colors duration-500 ${
                ambientMode ? 'text-[#c4b5a0] placeholder:text-[#c4b5a0]/30' : 'text-th-text placeholder:text-th-text3'
              }`}
              placeholder="Session name"
            />
          </label>
        ) : (
          <button
            type="button"
            onClick={handleStartEdit}
            aria-label={`Edit session name: ${sessionName}`}
            className="text-left w-full group"
          >
            <h2 className={`font-display text-xl leading-tight flex items-center gap-2 transition-colors duration-500 ${
              ambientMode ? 'text-[#c4b5a0]' : 'text-th-text'
            }`}>
              {sessionName}
              <svg
                className="w-3.5 h-3.5 text-th-text3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </h2>
          </button>
        )}

        {/* Stats bar */}
        {sessionAlbums.length > 0 && (
          <div className={`flex items-center gap-3 mt-2 text-[10px] font-label uppercase tracking-widest transition-colors duration-500 ${
            ambientMode ? 'text-[#c4b5a0]/50' : 'text-th-text3'
          }`}>
            <span>
              {sessionAlbums.length} album{sessionAlbums.length !== 1 ? 's' : ''}
            </span>
            <span className="text-th-surface/30">|</span>
            <span>~{estimatedMinutes} min</span>
          </div>
        )}
      </div>

      {/* Queue or empty state */}
      {sessionAlbums.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
          <div className="w-14 h-14 rounded-full bg-th-surface/[0.06] flex items-center justify-center">
            <svg
              className="w-7 h-7 text-th-text3/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <p className="text-th-text3 font-label text-xs text-center leading-relaxed">
            Tap an album to start your session
          </p>
        </div>
      ) : (
        <>
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 pb-4" role="list" aria-label="Session queue">
            <div className="space-y-0.5">
              {sessionAlbums.map((album, index) => {
                const isSpinning = nowSpinningId === album.id;
                return (
                  <div key={album.id}>
                    {/* Drop indicator above item */}
                    <div
                      className={`h-0.5 -mx-1 rounded-full transition-colors ${
                        overIndex === index && dragIndex !== null && dragIndex !== index
                          ? 'bg-[#dd6e42]'
                          : 'bg-transparent'
                      }`}
                    />
                    <div
                      role="listitem"
                      aria-roledescription="sortable"
                      aria-label={isSpinning ? `Stop spinning ${album.title}` : `Set ${album.title} as now spinning`}
                      draggable={false}
                      onClick={() => {
                        onSetNowSpinning(album.id);
                        onSelectAlbum(album);
                      }}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all group cursor-pointer ${
                        dragIndex === index ? 'opacity-50' : ''
                      } ${
                        isSpinning
                          ? ambientMode
                            ? 'bg-[#dd6e42]/10 border-l-[3px] border-l-[#dd6e42] shadow-md shadow-[#dd6e42]/5'
                            : 'bg-th-surface/[0.12] border-l-[3px] border-l-[#dd6e42]'
                          : ambientMode
                            ? 'hover:bg-white/[0.03] border-l-[3px] border-l-transparent'
                            : 'hover:bg-th-surface/[0.06] border-l-[3px] border-l-transparent'
                      }`}
                    >
                      {/* Drag handle */}
                      <span
                        draggable
                        onClick={(e) => e.stopPropagation()}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={(e) => handleTouchStart(e, index)}
                        onTouchMove={(e) => handleTouchMove(e)}
                        onTouchEnd={handleTouchEnd}
                        aria-label={`Reorder ${album.title}`}
                        className="flex-shrink-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-th-text3/40 hover:text-th-text3 transition-colors"
                        style={{ touchAction: 'none' }}
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>

                      {/* Number */}
                      <span className={`w-5 text-right text-[10px] font-label flex-shrink-0 tabular-nums transition-colors duration-500 ${
                        ambientMode ? 'text-[#c4b5a0]/40' : 'text-th-text3'
                      }`}>
                        {index + 1}
                      </span>

                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded overflow-hidden bg-th-bg2/60 flex-shrink-0">
                        {album.cover_url ? (
                          <img
                            src={proxyImageUrl(album.cover_url)}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-th-text3/25" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                              <circle cx="12" cy="12" r="1" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-label leading-tight truncate flex items-center gap-1.5 transition-colors duration-500 ${
                          ambientMode ? 'text-[#c4b5a0]' : 'text-th-text'
                        }`}>
                          {album.artist}
                          {isSpinning && (
                            <Disc3
                              aria-hidden="true"
                              className="w-3 h-3 text-[#dd6e42] animate-spin flex-shrink-0"
                              style={{ animationDuration: '3s' }}
                            />
                          )}
                        </p>
                        <p className={`text-[10px] font-label leading-tight truncate transition-colors duration-500 ${
                          ambientMode ? 'text-[#c4b5a0]/60' : 'text-th-text2'
                        }`}>
                          {album.title}
                        </p>
                        {album.format && (
                          <p className={`text-[9px] font-label leading-tight mt-0.5 transition-colors duration-500 ${
                            ambientMode ? 'text-[#c4b5a0]/40' : 'text-th-text3'
                          }`}>
                            {album.format}
                          </p>
                        )}
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveAlbum(album.id);
                        }}
                        aria-label={`Remove ${album.title} by ${album.artist} from session`}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-th-text3 opacity-0 group-hover:opacity-100 hover:bg-th-surface/[0.10] hover:text-th-text2 transition-all flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Trailing drop indicator for dropping at the end */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setOverIndex(sessionAlbums.length);
                }}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, sessionAlbums.length)}
                className="h-4"
              >
                <div
                  className={`h-0.5 -mx-1 rounded-full transition-colors ${
                    overIndex === sessionAlbums.length && dragIndex !== null
                      ? 'bg-[#dd6e42]'
                      : 'bg-transparent'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <ListeningRoomSuggestions
            sessionAlbums={sessionAlbums}
            allAlbums={allAlbums}
            sessionAlbumIds={sessionAlbumIds}
            onSelectAlbum={onSelectAlbum}
            onQuickAdd={onQuickAdd}
            ambientMode={ambientMode}
          />

          {/* Signal Chain mini-widget */}
          <ListeningRoomSignalChain ambientMode={ambientMode} />

          {/* Save as Playlist */}
          <div className={`px-4 pb-4 pt-2 border-t transition-colors duration-500 ${
            ambientMode ? 'border-[#c4b5a0]/10' : 'border-th-surface/[0.10]'
          }`}>
            <button
              type="button"
              onClick={handleSaveAsPlaylist}
              aria-label="Save session as playlist"
              className="w-full py-3 rounded-xl bg-[#dd6e42] text-white font-label text-sm font-bold tracking-wide hover:bg-[#c45a30] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save as Playlist
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ListeningRoomSession;
