import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { Album } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import { playlistService } from '../../services/playlistService';
import UpgradePrompt from '../../components/UpgradePrompt';
import ListeningRoomBrowse from '../components/listening-room/ListeningRoomBrowse';
import ListeningRoomAlbumDetail from '../components/listening-room/ListeningRoomAlbumDetail';
import ListeningRoomSession from '../components/listening-room/ListeningRoomSession';

const TABS = ['Browse', 'Session'] as const;
type Tab = (typeof TABS)[number];

const ListeningRoom: React.FC = () => {
  const { user, loading } = useAuthContext();
  const { showToast } = useToast();
  const { canUse, loading: subLoading } = useSubscription();
  const hasAccess = canUse('listening_room');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Browse');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [sessionAlbums, setSessionAlbums] = useState<Album[]>([]);
  const [nowSpinningId, setNowSpinningId] = useState<string | null>(null);
  const [ambientMode, setAmbientMode] = useState(false);
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);
  const [initialSessionName, setInitialSessionName] = useState<string | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Load all albums for suggestions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await supabaseService.getAlbums();
        if (!cancelled) setAllAlbums(data);
      } catch {
        // Non-blocking — suggestions just won't appear
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load playlist from query param (e.g. /listening-room?playlist=xxx)
  const playlistParam = searchParams.get('playlist');
  useEffect(() => {
    if (!playlistParam || allAlbums.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const playlist = await playlistService.getById(playlistParam);
        if (cancelled) return;

        if (!playlist) {
          showToast('Playlist not found', 'error');
          setSearchParams({}, { replace: true });
          return;
        }

        const albumMap = new Map(allAlbums.map((a) => [a.id, a]));
        const matched = playlist.items
          .map((item) => albumMap.get(item.albumId))
          .filter((a): a is Album => a != null);

        if (matched.length === 0) {
          showToast('No matching albums found in your collection', 'error');
        } else {
          setSessionAlbums(matched);
          setInitialSessionName(playlist.name);
          setActiveTab('Session');
        }

        setSearchParams({}, { replace: true });
      } catch {
        if (!cancelled) {
          showToast('Failed to load playlist', 'error');
          setSearchParams({}, { replace: true });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [playlistParam, allAlbums, showToast, setSearchParams]);

  // Load albums from query param (e.g. /listening-room?albums=id1,id2&name=My%20Playlist)
  const albumsParam = searchParams.get('albums');
  const nameParam = searchParams.get('name');
  useEffect(() => {
    if (!albumsParam || allAlbums.length === 0) return;

    const albumIds = albumsParam.split(',').filter(Boolean);
    if (albumIds.length === 0) {
      setSearchParams({}, { replace: true });
      return;
    }

    const albumMap = new Map(allAlbums.map((a) => [a.id, a]));
    const matched = albumIds
      .map((id) => albumMap.get(id))
      .filter((a): a is Album => a != null);

    if (matched.length === 0) {
      showToast('No matching albums found in your collection', 'error');
    } else {
      setSessionAlbums(matched);
      if (nameParam) {
        setInitialSessionName(nameParam);
      }
      setActiveTab('Session');
    }

    setSearchParams({}, { replace: true });
  }, [albumsParam, nameParam, allAlbums, showToast, setSearchParams]);

  const handleAddToSession = useCallback((album: Album) => {
    setSessionAlbums((prev) => {
      if (prev.some((a) => a.id === album.id)) return prev;
      return [...prev, album];
    });
    setSelectedAlbum(null);
  }, []);

  const handleRemoveFromSession = useCallback((albumId: string) => {
    setSessionAlbums((prev) => prev.filter((a) => a.id !== albumId));
    setNowSpinningId((prev) => (prev === albumId ? null : prev));
  }, []);

  const handleSetNowSpinning = useCallback((albumId: string) => {
    setNowSpinningId((prev) => (prev === albumId ? null : albumId));
  }, []);

  const sessionAlbumIds = useMemo(
    () => new Set(sessionAlbums.map((a) => a.id)),
    [sessionAlbums]
  );

  const handleQuickAdd = useCallback((album: Album) => {
    setSessionAlbums((prev) => {
      if (prev.some((a) => a.id === album.id)) return prev;
      return [...prev, album];
    });
  }, []);

  const handleReorder = useCallback((albums: Album[]) => {
    setSessionAlbums(albums);
  }, []);

  const handleSaveAsPlaylist = useCallback(
    async (name: string, albumIds: string[]) => {
      const items = albumIds
        .map((id) => sessionAlbums.find((a) => a.id === id))
        .filter((a): a is Album => a != null)
        .map((a) => ({
          albumId: a.id,
          artist: a.artist,
          albumTitle: a.title,
          itemTitle: a.title,
          cover_url: a.cover_url,
          type: 'album' as const,
        }));

      try {
        const saved = await playlistService.save({
          name,
          mood: 'Listening Session',
          focus: 'album',
          items,
        });
        if (saved) {
          showToast('Playlist saved!', 'success');
        } else {
          showToast('Failed to save playlist', 'error');
        }
      } catch {
        showToast('Failed to save playlist', 'error');
      }
    },
    [sessionAlbums, showToast]
  );

  if (loading || subLoading) {
    return (
      <div className="min-h-screen bg-th-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#dd6e42] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-th-bg flex flex-col">
        {/* Minimal header */}
        <header className="sticky top-0 z-40 border-b glass-morphism border-th-surface/[0.10] px-4 md:px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <Link
              to="/"
              aria-label="Back to collection"
              className="w-10 h-10 bg-gradient-to-tr from-[#dd6e42] to-[#4f6d7a] rounded-lg flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition-transform flex-shrink-0"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill="#f0a882" />
                <circle cx="12" cy="12" r="9.5" fill="none" stroke="#d48a6a" strokeWidth="0.4" opacity="0.5" />
                <circle cx="12" cy="12" r="8" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.4" />
                <circle cx="12" cy="12" r="6.5" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.3" />
                <circle cx="12" cy="12" r="5.2" fill="#c45a30" />
                <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#f0a882">R</text>
              </svg>
            </Link>
            <h1 className="font-label text-lg md:text-2xl font-bold tracking-tighter truncate text-th-text">
              Listening Room
            </h1>
          </div>
        </header>

        {/* Upgrade CTA */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#dd6e42]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#dd6e42]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-th-text">Listening Room</h2>
          <p className="text-sm text-th-text2 max-w-md">
            Curate listening sessions from your collection — browse, queue, reorder, and save as playlists. Available on the Enthusiast plan.
          </p>
          <button
            type="button"
            onClick={() => setShowUpgradePrompt(true)}
            className="mt-2 px-6 py-3 rounded-xl bg-[#dd6e42] text-white font-label text-sm font-bold tracking-wide hover:bg-[#c45a30] active:scale-[0.98] transition-all"
          >
            Upgrade to Enthusiast
          </button>
        </div>

        {showUpgradePrompt && (
          <UpgradePrompt
            feature="listening_room"
            onClose={() => setShowUpgradePrompt(false)}
            onUpgrade={() => setShowUpgradePrompt(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${
      ambientMode ? 'bg-[#0d0d0d] text-[#c4b5a0]' : 'bg-th-bg'
    }`}>
      {/* Minimal nav */}
      <header className={`sticky top-0 z-40 border-b px-4 md:px-6 py-4 transition-colors duration-500 ${
        ambientMode ? 'bg-[#0d0d0d]/90 backdrop-blur-md border-[#c4b5a0]/10' : 'glass-morphism border-th-surface/[0.10]'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Link
            to="/"
            aria-label="Back to collection"
            className="w-10 h-10 bg-gradient-to-tr from-[#dd6e42] to-[#4f6d7a] rounded-lg flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition-transform flex-shrink-0"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" fill="#f0a882" />
              <circle cx="12" cy="12" r="9.5" fill="none" stroke="#d48a6a" strokeWidth="0.4" opacity="0.5" />
              <circle cx="12" cy="12" r="8" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.4" />
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.3" />
              <circle cx="12" cy="12" r="5.2" fill="#c45a30" />
              <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#f0a882">R</text>
            </svg>
          </Link>
          <h1 className={`font-label text-lg md:text-2xl font-bold tracking-tighter truncate transition-colors duration-500 ${
            ambientMode ? 'text-[#c4b5a0]' : 'text-th-text'
          }`}>
            Listening Room
          </h1>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setAmbientMode((prev) => !prev)}
            aria-label={ambientMode ? 'Turn off ambient mode' : 'Turn on ambient mode'}
            aria-pressed={ambientMode}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
              ambientMode
                ? 'bg-[#dd6e42]/20 text-[#dd6e42] hover:bg-[#dd6e42]/30'
                : 'bg-th-surface/[0.08] text-th-text2 hover:bg-th-surface/[0.15] hover:text-th-text'
            }`}
          >
            {ambientMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile tab switcher (below md) */}
      <div className={`md:hidden border-b transition-colors duration-500 ${
        ambientMode ? 'border-[#c4b5a0]/10' : 'border-th-surface/[0.10]'
      }`} role="tablist" aria-label="Listening room panels">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            id={`tab-${tab.toLowerCase()}`}
            aria-selected={activeTab === tab}
            aria-controls={`panel-${tab.toLowerCase()}`}
            onClick={() => setActiveTab(tab)}
            className={`w-1/2 py-3 text-sm font-label font-bold tracking-wide transition-colors ${
              activeTab === tab
                ? 'text-[#dd6e42] border-b-2 border-[#dd6e42]'
                : ambientMode
                  ? 'text-[#c4b5a0]/60 hover:text-[#c4b5a0]'
                  : 'text-th-text2 hover:text-th-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Browse panel */}
        <div
          role="region"
          aria-label="Browse panel"
          id="panel-browse"
          aria-labelledby="tab-browse"
          className={`${
            activeTab === 'Browse' ? 'flex' : 'hidden'
          } md:flex flex-col md:w-[60%] md:border-r overflow-y-auto transition-colors duration-500 ${
            ambientMode ? 'border-[#c4b5a0]/10' : 'border-th-surface/[0.10]'
          }`}
        >
          <ListeningRoomBrowse
            onSelectAlbum={setSelectedAlbum}
            onQuickAdd={handleQuickAdd}
            sessionAlbumIds={sessionAlbumIds}
            nowSpinningId={nowSpinningId}
            ambientMode={ambientMode}
          />
        </div>

        {/* Session panel */}
        <div
          role="region"
          aria-label="Session panel"
          id="panel-session"
          aria-labelledby="tab-session"
          className={`${
            activeTab === 'Session' ? 'flex' : 'hidden'
          } md:flex flex-col md:w-[40%] overflow-y-auto`}
        >
          <ListeningRoomSession
            sessionAlbums={sessionAlbums}
            allAlbums={allAlbums}
            sessionAlbumIds={sessionAlbumIds}
            onRemoveAlbum={handleRemoveFromSession}
            onReorder={handleReorder}
            onSaveAsPlaylist={handleSaveAsPlaylist}
            nowSpinningId={nowSpinningId}
            onSetNowSpinning={handleSetNowSpinning}
            onSelectAlbum={setSelectedAlbum}
            onQuickAdd={handleQuickAdd}
            initialSessionName={initialSessionName}
            ambientMode={ambientMode}
          />
        </div>
      </div>

      {/* Album detail overlay */}
      {selectedAlbum && (
        <ListeningRoomAlbumDetail
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          onAddToSession={handleAddToSession}
          sessionAlbumIds={sessionAlbumIds}
          ambientMode={ambientMode}
        />
      )}
    </div>
  );
};

export default ListeningRoom;
