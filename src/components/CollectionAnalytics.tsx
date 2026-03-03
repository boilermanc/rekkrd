import React, { useMemo, useState, useEffect } from 'react';
import type { Album } from '../types';
import {
  computeCollectionStats,
  computeGenreBreakdown,
  computeDecadeDistribution,
  computeFormatBreakdown,
  computeCollectionGrowth,
} from '../helpers/analyticsHelpers';
import type {
  CollectionStats,
  GenreData,
  DecadeData,
  FormatData,
  GrowthData,
} from '../types/analytics';
import { Disc3, Music, Tag, Calendar, Clock, BarChart3 } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';

interface CollectionAnalyticsProps {
  albums: Album[];
  onScanPress?: () => void;
  onUpgradeRequired?: (feature: string) => void;
}

// ── Skeleton Card ───────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-5 animate-pulse" aria-hidden="true">
      <div className="w-8 h-8 rounded-full bg-th-surface/[0.08] mb-3" />
      <div className="h-3 w-16 bg-th-surface/[0.08] rounded mb-2" />
      <div className="h-6 w-24 bg-th-surface/[0.08] rounded" />
    </div>
  );
}

// ── Stat Card ───────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  ariaLabel: string;
}

function StatCard({ icon, label, value, subtitle, ariaLabel }: StatCardProps) {
  return (
    <div
      className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-5 min-w-[160px] flex-shrink-0 snap-start"
      role="group"
      aria-label={ariaLabel}
    >
      <div className="text-[#dd6e42] mb-3">{icon}</div>
      <p className="font-label text-[10px] tracking-widest uppercase text-th-text3 mb-1">{label}</p>
      <p className="text-xl font-bold text-th-text leading-tight">{value}</p>
      {subtitle && <p className="text-xs text-th-text3 mt-0.5 truncate">{subtitle}</p>}
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="font-label text-sm tracking-widest uppercase text-th-text2 mb-4">{title}</h3>
  );
}

// ── Shared Tooltip Shell ────────────────────────────────────────────

function GlassTooltipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-morphism rounded-lg border border-th-surface/[0.15] px-3 py-2 text-sm shadow-lg">
      {children}
    </div>
  );
}

// ── Shared axis tick style ──────────────────────────────────────────

const AXIS_TICK_STYLE = { fontSize: 11, fill: 'rgb(var(--color-text3))' };
const GRID_STROKE = 'rgb(var(--color-surface) / 0.08)';

// ── Decade Bar Chart ────────────────────────────────────────────────

function DecadeTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const count = payload[0].value;
  return (
    <GlassTooltipShell>
      <p className="font-bold text-th-text">{label}</p>
      <p className="text-th-text3">{count} album{count !== 1 ? 's' : ''}</p>
    </GlassTooltipShell>
  );
}

function DecadeBarChart({ data }: { data: DecadeData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="decade" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
        <Tooltip content={<DecadeTooltip />} cursor={{ fill: 'rgb(var(--color-surface) / 0.06)' }} />
        <Bar dataKey="count" fill="#4f6d7a" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Growth Area Chart ───────────────────────────────────────────────

function GrowthTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload[0].value;
  return (
    <GlassTooltipShell>
      <p className="font-bold text-th-text">{label}</p>
      <p className="text-th-text3">{total} album{total !== 1 ? 's' : ''}</p>
    </GlassTooltipShell>
  );
}

function GrowthAreaChart({ data }: { data: GrowthData[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-th-text3">Not enough data to show growth trend yet.</p>;
  }

  if (data.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-3xl font-bold text-[#4f6d7a]">{data[0].totalAlbums}</p>
        <p className="text-xs text-th-text3 mt-1">album{data[0].totalAlbums !== 1 ? 's' : ''} as of {data[0].date}</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
        <defs>
          <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f6d7a" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#4f6d7a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="date" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
        <Tooltip content={<GrowthTooltip />} />
        <Area
          type="monotone"
          dataKey="totalAlbums"
          stroke="#4f6d7a"
          strokeWidth={2}
          fill="url(#growthGradient)"
          dot={{ r: 3, fill: '#4f6d7a', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#4f6d7a', stroke: 'rgb(var(--color-bg))', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Donut Chart ─────────────────────────────────────────────────────

const DONUT_PALETTE = ['#4f6d7a', '#dd6e42', '#e8dab2', '#c0d6df', '#8b5e3c', '#a7c4bc', '#d4927a', '#6b8f71', '#c9b1d0', '#e0c097'];

interface DonutEntry {
  name: string;
  value: number;
  percentage: number;
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DonutEntry }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-morphism rounded-lg border border-th-surface/[0.15] px-3 py-2 text-sm shadow-lg">
      <p className="font-bold text-th-text">{d.name}</p>
      <p className="text-th-text3">{d.value} album{d.value !== 1 ? 's' : ''} ({d.percentage}%)</p>
    </div>
  );
}

function DonutLegendContent({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map(entry => (
        <span key={entry.value} className="flex items-center gap-1.5 text-xs text-th-text3">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  );
}

interface DonutChartProps {
  data: DonutEntry[];
  height?: number;
}

function DonutChart({ data, height = 250 }: DonutChartProps) {
  const singleEntry = data.length === 1;

  return (
    <div style={{ minHeight: height }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={singleEntry ? 0 : 2}
            dataKey="value"
            nameKey="name"
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={DONUT_PALETTE[i % DONUT_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
          <Legend content={<DonutLegendContent />} />
          {singleEntry && (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-th-text text-sm font-bold">
              {data[0].name}
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

const CollectionAnalytics: React.FC<CollectionAnalyticsProps> = ({ albums, onScanPress, onUpgradeRequired }) => {
  const { canUse } = useSubscription();
  const [ready, setReady] = useState(false);

  // Brief delay so skeleton flashes for loading UX
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  const stats = useMemo<CollectionStats>(() => computeCollectionStats(albums), [albums]);
  const genres = useMemo<GenreData[]>(() => computeGenreBreakdown(albums), [albums]);
  const decades = useMemo<DecadeData[]>(() => computeDecadeDistribution(albums), [albums]);
  const formats = useMemo<FormatData[]>(() => computeFormatBreakdown(albums), [albums]);
  const growth = useMemo<GrowthData[]>(() => computeCollectionGrowth(albums), [albums]);

  // ── Gate: Enthusiast-only feature ─────────────────────────────────

  if (!canUse('analytics')) {
    return (
      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8 pb-8">
        <div className="flex flex-col items-center justify-center py-32">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-th-accent/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-th-accent">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-th-text">Collection Analytics</h2>
          <p className="mb-6 text-sm text-th-muted text-center max-w-md">
            Genre breakdowns, decade distribution, collection growth, and more. See your vinyl collection like never before.
          </p>
          <button
            onClick={() => onUpgradeRequired?.('analytics')}
            className="rounded-xl bg-th-accent px-6 py-3 font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Upgrade to Enthusiast
          </button>
        </div>
      </main>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────

  if (albums.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8">
        <div className="flex flex-col items-center justify-center py-32 text-center px-6">
          <BarChart3 className="w-20 h-20 text-th-text3/20 mb-6" />
          <h2 className="text-th-text2 font-label tracking-widest text-lg uppercase mb-2">No Analytics Yet</h2>
          <p className="text-th-text3/70 text-sm max-w-xs mb-6">Start adding records to see your collection analytics.</p>
          {onScanPress && (
            <button
              onClick={onScanPress}
              className="px-6 py-3 rounded-full bg-[#dd6e42] text-white font-label text-sm tracking-wide hover:bg-[#c45a30] transition-colors"
            >
              Scan Your First Record
            </button>
          )}
        </div>
      </main>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────

  if (!ready) {
    return (
      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8">
        <div className="mb-8">
          <div className="h-7 w-56 bg-th-surface/[0.08] rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-th-surface/[0.06] rounded animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 lg:grid-cols-6 md:overflow-visible">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </main>
    );
  }

  // ── Derived chart data ────────────────────────────────────────────

  const genreDonut: DonutEntry[] = genres.map(g => ({ name: g.genre, value: g.count, percentage: g.percentage }));
  const formatDonut: DonutEntry[] = formats.map(f => ({ name: f.format, value: f.count, percentage: f.percentage }));

  const allGenresUnknown = genres.length === 1 && genres[0].genre === 'Unknown';
  const allFormatsUnknown = formats.length === 1 && formats[0].format === 'Unknown';

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8 pb-28">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl text-th-text mb-1">Collection Analytics</h1>
        <p className="text-sm text-th-text3">Insights into your vinyl collection</p>
      </div>

      {/* Stats cards */}
      <div
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 lg:grid-cols-6 md:overflow-visible"
        role="region"
        aria-label="Collection statistics"
      >
        <StatCard
          icon={<Disc3 className="w-7 h-7" />}
          label="Total Albums"
          value={stats.totalAlbums.toLocaleString()}
          ariaLabel={`Total albums: ${stats.totalAlbums}`}
        />
        <StatCard
          icon={<Music className="w-7 h-7" />}
          label="Total Artists"
          value={stats.totalArtists.toLocaleString()}
          subtitle={`${stats.avgAlbumsPerArtist} albums per artist`}
          ariaLabel={`Total artists: ${stats.totalArtists}, averaging ${stats.avgAlbumsPerArtist} albums per artist`}
        />
        <StatCard
          icon={<Tag className="w-7 h-7" />}
          label="Top Genre"
          value={stats.mostCommonGenre}
          ariaLabel={`Most common genre: ${stats.mostCommonGenre}`}
        />
        <StatCard
          icon={<Calendar className="w-7 h-7" />}
          label="Peak Decade"
          value={stats.mostCommonDecade}
          ariaLabel={`Most common decade: ${stats.mostCommonDecade}`}
        />
        <StatCard
          icon={<Disc3 className="w-7 h-7" />}
          label="Oldest Record"
          value={stats.oldestAlbum?.title ?? 'N/A'}
          subtitle={stats.oldestAlbum ? `${stats.oldestAlbum.artist} (${stats.oldestAlbum.year})` : undefined}
          ariaLabel={stats.oldestAlbum ? `Oldest record: ${stats.oldestAlbum.title} by ${stats.oldestAlbum.artist}, ${stats.oldestAlbum.year}` : 'No oldest record'}
        />
        <StatCard
          icon={<Clock className="w-7 h-7" />}
          label="Collecting Since"
          value={stats.collectionStartDate}
          ariaLabel={`Collecting since ${stats.collectionStartDate}`}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Genre Breakdown */}
        <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-5 md:p-6" aria-label="Genre breakdown">
          <SectionHeader title="Genre Breakdown" />
          {allGenresUnknown ? (
            <p className="text-sm text-th-text3">Add genre info to your albums to see this chart.</p>
          ) : genreDonut.length > 0 ? (
            <DonutChart data={genreDonut} />
          ) : (
            <p className="text-sm text-th-text3">No genre data available.</p>
          )}
        </section>

        {/* Decade Distribution */}
        <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-5 md:p-6" aria-label="Decade distribution">
          <SectionHeader title="Decade Distribution" />
          {decades.length > 0 ? (
            <DecadeBarChart data={decades} />
          ) : (
            <p className="text-sm text-th-text3">No year data available.</p>
          )}
        </section>

        {/* Format Breakdown */}
        <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-5 md:p-6" aria-label="Format breakdown">
          <SectionHeader title="Format Breakdown" />
          {allFormatsUnknown ? (
            <p className="text-sm text-th-text3">Add format info to your albums to see this chart.</p>
          ) : formatDonut.length > 0 ? (
            <DonutChart data={formatDonut} height={220} />
          ) : (
            <p className="text-sm text-th-text3">No format data available.</p>
          )}
        </section>

        {/* Collection Growth */}
        <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-5 md:p-6" aria-label="Collection growth over time">
          <SectionHeader title="Collection Growth" />
          <GrowthAreaChart data={growth} />
        </section>
      </div>
    </main>
  );
};

export default CollectionAnalytics;
