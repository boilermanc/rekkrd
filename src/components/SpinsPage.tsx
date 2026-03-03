
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Album } from '../types';
import { spinsService, RecentSpin, MostPlayedAlbum, SpinStats, SpinHistoryPage } from '../services/spinsService';
import { proxyImageUrl } from '../services/imageProxy';
import SpinningRecord from './SpinningRecord';
import { useTheme } from '../contexts/ThemeContext';

// ── Helpers ─────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function groupByDate(spins: RecentSpin[]): { label: string; spins: RecentSpin[] }[] {
  const groups: Map<string, RecentSpin[]> = new Map();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayStr = today.toDateString();
  const yesterdayStr = yesterday.toDateString();

  for (const spin of spins) {
    const d = new Date(spin.spun_at);
    const dStr = d.toDateString();
    let label: string;
    if (dStr === todayStr) label = 'Today';
    else if (dStr === yesterdayStr) label = 'Yesterday';
    else label = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(spin);
  }
  return Array.from(groups, ([label, spins]) => ({ label, spins }));
}

// ── Count-up hook ───────────────────────────────────────────────

function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const prefersReduced = useRef(false);

  useEffect(() => {
    prefersReduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (prefersReduced.current || target === 0) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

// ── Stat card ───────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: number; theme: 'light' | 'dark' }> = ({ label, value, theme }) => {
  const display = useCountUp(value);
  const amberText = theme === 'light' ? '#B8892E' : '#D4A054';
  return (
    <div className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-5 min-w-[140px] flex-1 flex flex-col items-center gap-1">
      <span className="font-display text-3xl font-bold tabular-nums" style={{ color: amberText }}>{display}</span>
      <span className="text-th-text3 font-label text-[9px] tracking-[0.2em] uppercase">{label}</span>
    </div>
  );
};

// ── Skeleton loaders ────────────────────────────────────────────

const CoverSkeleton: React.FC<{ size: string }> = ({ size }) => (
  <div className={`${size} rounded-lg bg-th-surface/[0.08] animate-pulse flex-shrink-0`} />
);

const StatSkeleton: React.FC = () => (
  <div className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-5 min-w-[140px] flex-1 flex flex-col items-center gap-2">
    <div className="h-8 w-12 rounded bg-th-surface/[0.08] animate-pulse" />
    <div className="h-3 w-16 rounded bg-th-surface/[0.06] animate-pulse" />
  </div>
);

// ── Ear icon ────────────────────────────────────────────────────

const EarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28" className={className}>
    <path d="M6 8.5a6 6 0 0 1 12 0c0 3-2 4.5-2 7a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-1" />
    <path d="M10.5 8.5a1.5 1.5 0 0 1 3 0c0 1.5-1.5 2-1.5 3.5" />
  </svg>
);

// ── Main component ──────────────────────────────────────────────

interface SpinsPageProps {
  allAlbums: Album[];
  onSelectAlbum: (album: Album) => void;
}

const SpinsPage: React.FC<SpinsPageProps> = ({ allAlbums, onSelectAlbum }) => {
  const { theme } = useTheme();
  const prefersReduced = useRef(false);

  useEffect(() => {
    prefersReduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // ── State ───────────────────────────────────────────────────
  const [stats, setStats] = useState<SpinStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recent, setRecent] = useState<RecentSpin[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [mostPlayed, setMostPlayed] = useState<MostPlayedAlbum[]>([]);
  const [mostPlayedLoading, setMostPlayedLoading] = useState(true);
  const [history, setHistory] = useState<RecentSpin[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Data fetching (independent per section) ─────────────────
  useEffect(() => {
    spinsService.getSpinStats()
      .then(setStats)
      .catch(e => console.error('Failed to load spin stats:', e))
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    spinsService.getRecentSpins(20)
      .then(setRecent)
      .catch(e => console.error('Failed to load recent spins:', e))
      .finally(() => setRecentLoading(false));
  }, []);

  useEffect(() => {
    spinsService.getMostPlayed(10)
      .then(setMostPlayed)
      .catch(e => console.error('Failed to load most played:', e))
      .finally(() => setMostPlayedLoading(false));
  }, []);

  useEffect(() => {
    spinsService.getSpinHistory(0)
      .then(result => {
        setHistory(result.spins);
        setHistoryHasMore(result.hasMore);
      })
      .catch(e => console.error('Failed to load history:', e))
      .finally(() => setHistoryLoading(false));
  }, []);

  const handleLoadMore = useCallback(async () => {
    const nextPage = historyPage + 1;
    setLoadingMore(true);
    try {
      const result = await spinsService.getSpinHistory(nextPage);
      setHistory(prev => [...prev, ...result.spins]);
      setHistoryHasMore(result.hasMore);
      setHistoryPage(nextPage);
    } catch (e) {
      console.error('Failed to load more history:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [historyPage]);

  // ── Album lookup for onSelectAlbum ──────────────────────────
  const albumMap = useMemo(() => {
    const map = new Map<string, Album>();
    for (const a of allAlbums) map.set(a.id, a);
    return map;
  }, [allAlbums]);

  const handleAlbumClick = useCallback((albumId: string) => {
    const album = albumMap.get(albumId);
    if (album) onSelectAlbum(album);
  }, [albumMap, onSelectAlbum]);

  // ── Theme-aware colors ──────────────────────────────────────
  const amber = theme === 'light' ? '#B8892E' : '#D4A054';
  const gradientOpacity = theme === 'light' ? 0.025 : 0.04;
  const hoverGlow = theme === 'light'
    ? '0 0 20px rgba(184,137,46,0.10)'
    : '0 0 20px rgba(212,160,84,0.15)';

  // ── Date-grouped history ────────────────────────────────────
  const historyGroups = useMemo(() => groupByDate(history), [history]);

  const noData = !statsLoading && !recentLoading && !mostPlayedLoading &&
    (stats?.totalSpins ?? 0) === 0 && recent.length === 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 md:py-12 relative">
      {/* Warm ambient glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px]"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 0%, rgba(79,109,122,${gradientOpacity}), transparent)`,
        }}
      />

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="relative mb-10">
        <div className="flex items-center gap-3 mb-1">
          <EarIcon className="text-th-text2 animate-[pulse_3s_ease-in-out_infinite] motion-reduce:animate-none" />
          <h1 className="font-display text-4xl md:text-5xl font-bold text-th-text">Spins</h1>
        </div>
        <p className="text-th-text3 font-label text-[10px] tracking-[0.25em] uppercase ml-[42px]">Your listening journal</p>
      </header>

      {/* ── Stats bar ───────────────────────────────────────── */}
      <section aria-labelledby="stats-heading" className="relative mb-14">
        <h2 id="stats-heading" className="sr-only">Listening Statistics</h2>
        {statsLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {[1, 2, 3, 4].map(i => <StatSkeleton key={i} />)}
          </div>
        ) : stats ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <StatCard label="Total Spins" value={stats.totalSpins} theme={theme} />
            <StatCard label="This Month" value={stats.thisMonth} theme={theme} />
            <StatCard label="This Week" value={stats.thisWeek} theme={theme} />
            <StatCard label="Unique Albums" value={stats.uniqueAlbums} theme={theme} />
          </div>
        ) : null}
      </section>

      {/* ── Global empty state ──────────────────────────────── */}
      {noData && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <EarIcon className="text-th-text3/50 w-16 h-16" />
          <p className="text-th-text3 text-sm max-w-xs">
            No spins yet. Open an album and tap <strong className="text-th-text">Now Spinning</strong> to start tracking.
          </p>
        </div>
      )}

      {!noData && (
        <>
          {/* ── Recently Played ────────────────────────────── */}
          <section aria-labelledby="recent-heading" className="relative mb-14">
            <h2 id="recent-heading" className="font-display text-xl md:text-2xl font-bold text-th-text mb-5">Recently Played</h2>
            {recentLoading ? (
              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="flex-shrink-0 w-[72px] space-y-2">
                    <CoverSkeleton size="w-[64px] h-[64px]" />
                    <div className="h-3 w-14 rounded bg-th-surface/[0.06] animate-pulse" />
                    <div className="h-2 w-10 rounded bg-th-surface/[0.04] animate-pulse" />
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="text-th-text3 text-sm">No recent spins yet.</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
                {recent.map((spin, idx) => (
                  <button
                    key={spin.id}
                    onClick={() => handleAlbumClick(spin.album_id)}
                    className="flex-shrink-0 w-[72px] text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#D4A054] rounded-lg transition-all"
                    style={{
                      opacity: prefersReduced.current ? 1 : undefined,
                      animation: prefersReduced.current ? 'none' : `spinsFadeUp 0.4s ease-out ${idx * 50}ms both`,
                    }}
                    aria-label={`${spin.title} by ${spin.artist}, ${relativeTime(spin.spun_at)}`}
                  >
                    <img
                      src={proxyImageUrl(spin.cover_url) || ''}
                      alt={`Album cover for ${spin.title} by ${spin.artist}`}
                      loading="lazy"
                      className="w-[64px] h-[64px] rounded-lg object-cover transition-all duration-200 group-hover:scale-[1.03]"
                      style={{ boxShadow: undefined }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = hoverGlow; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                    />
                    <p className="text-th-text text-[10px] font-medium mt-1.5 truncate">{spin.title}</p>
                    <p className="text-th-text3 text-[9px] truncate">{spin.artist}</p>
                    <p className="text-th-text3/50 text-[8px] font-label">{relativeTime(spin.spun_at)}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ── Most Played ────────────────────────────────── */}
          <section aria-labelledby="most-played-heading" className="relative mb-14">
            <h2 id="most-played-heading" className="font-display text-xl md:text-2xl font-bold text-th-text mb-5">Most Played</h2>
            {mostPlayedLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex items-center gap-4 glass-morphism rounded-xl border border-th-surface/[0.06] p-3">
                    <div className="w-6 h-6 rounded bg-th-surface/[0.08] animate-pulse" />
                    <CoverSkeleton size="w-[48px] h-[48px]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 rounded bg-th-surface/[0.08] animate-pulse" />
                      <div className="h-2 w-20 rounded bg-th-surface/[0.06] animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : mostPlayed.length === 0 ? (
              <p className="text-th-text3 text-sm">No plays recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {mostPlayed.map((album, idx) => {
                  const isTop3 = idx < 3;
                  const coverSize = isTop3 ? 'w-[56px] h-[56px]' : 'w-[48px] h-[48px]';
                  return (
                    <button
                      key={album.id}
                      onClick={() => handleAlbumClick(album.id)}
                      className="w-full flex items-center gap-4 glass-morphism rounded-xl border border-th-surface/[0.06] p-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A054] hover:border-th-surface/[0.15] transition-all"
                      style={{
                        animation: prefersReduced.current ? 'none' : `spinsSlideIn 0.4s ease-out ${idx * 60}ms both`,
                      }}
                      aria-label={`#${idx + 1}: ${album.title} by ${album.artist}, ${album.spin_count} spins`}
                    >
                      <span
                        className="w-7 text-center font-display text-lg font-bold flex-shrink-0"
                        style={{ color: isTop3 ? amber : undefined }}
                      >
                        {idx + 1}
                      </span>
                      <img
                        src={proxyImageUrl(album.cover_url) || ''}
                        alt={`Album cover for ${album.title} by ${album.artist}`}
                        loading="lazy"
                        className={`${coverSize} rounded-lg object-cover flex-shrink-0 transition-all duration-200 group-hover:scale-[1.03]`}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = hoverGlow; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-th-text text-sm font-medium truncate">{album.title}</p>
                        <p className="text-th-text3 text-xs truncate">{album.artist}</p>
                      </div>
                      <span
                        className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-label font-bold tracking-wider"
                        style={{
                          color: amber,
                          backgroundColor: theme === 'light' ? 'rgba(184,137,46,0.10)' : 'rgba(212,160,84,0.10)',
                        }}
                      >
                        {album.spin_count} {album.spin_count === 1 ? 'spin' : 'spins'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── History ─────────────────────────────────────── */}
          <section aria-labelledby="history-heading" className="relative">
            <h2 id="history-heading" className="font-display text-xl md:text-2xl font-bold text-th-text mb-5">History</h2>
            {historyLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CoverSkeleton size="w-[40px] h-[40px]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-36 rounded bg-th-surface/[0.08] animate-pulse" />
                      <div className="h-2 w-24 rounded bg-th-surface/[0.06] animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="text-th-text3 text-sm">No listening history yet.</p>
            ) : (
              <div className="space-y-6">
                {historyGroups.map(group => (
                  <div key={group.label}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-th-text3/60 font-label text-[9px] tracking-[0.2em] uppercase whitespace-nowrap">{group.label}</span>
                      <div className="flex-1 h-px bg-th-surface/[0.08]" />
                    </div>
                    <div className="space-y-1">
                      {group.spins.map(spin => (
                        <button
                          key={spin.id}
                          onClick={() => handleAlbumClick(spin.album_id)}
                          className="w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg text-left group hover:bg-th-surface/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A054] transition-colors"
                          aria-label={`${spin.title} by ${spin.artist} at ${formatTime(spin.spun_at)}`}
                        >
                          <img
                            src={proxyImageUrl(spin.cover_url) || ''}
                            alt={`Album cover for ${spin.title} by ${spin.artist}`}
                            loading="lazy"
                            className="w-[40px] h-[40px] rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-th-text text-sm truncate">{spin.title}</p>
                            <p className="text-th-text3 text-xs truncate">{spin.artist}</p>
                          </div>
                          <span className="text-th-text3/50 text-xs font-label flex-shrink-0">{formatTime(spin.spun_at)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {historyHasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl glass-morphism border border-th-surface/[0.10] text-th-text3 hover:text-th-text font-label text-[10px] tracking-widest uppercase font-bold transition-all hover:border-th-surface/[0.20] disabled:opacity-50"
                      aria-label="Load more listening history"
                    >
                      {loadingMore ? (
                        <>
                          <SpinningRecord size="w-4 h-4" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {/* ── Keyframe animations ──────────────────────────────── */}
      <style>{`
        @keyframes spinsFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinsSlideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[pulse_3s_ease-in-out_infinite\\] { animation: none !important; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default SpinsPage;
