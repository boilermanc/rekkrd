import React, { useMemo, useState, useEffect } from 'react';
import type { Album } from '../../types';
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
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CollectionAnalyticsProps {
  albums: Album[];
  onScanPress?: () => void;
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

// ── Bar Row (horizontal bar chart item) ─────────────────────────────

interface BarRowProps {
  label: string;
  count: number;
  percentage: number;
  maxPercentage: number;
  color: string;
}

const BarRow: React.FC<BarRowProps> = ({ label, count, percentage, maxPercentage, color }) => {
  const width = maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-th-text2 w-28 truncate flex-shrink-0" title={label}>{label}</span>
      <div className="flex-1 h-5 rounded-full bg-th-surface/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-th-text3 w-16 text-right flex-shrink-0 tabular-nums">
        {count} ({percentage}%)
      </span>
    </div>
  );
};

// ── Section Header ──────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="font-label text-sm tracking-widest uppercase text-th-text2 mb-4">{title}</h3>
  );
}

// ── Growth Chart (simple SVG line) ──────────────────────────────────

function GrowthChart({ data }: { data: GrowthData[] }) {
  if (data.length < 2) {
    return <p className="text-sm text-th-text3">Not enough data to show growth trend yet.</p>;
  }

  const maxAlbums = Math.max(...data.map(d => d.totalAlbums));
  const padding = 40;
  const width = 600;
  const height = 200;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartW;
    const y = padding + chartH - (d.totalAlbums / maxAlbums) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${padding + chartH} L${points[0].x},${padding + chartH} Z`;

  // Y-axis ticks
  const yTicks = [0, Math.round(maxAlbums / 2), maxAlbums];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Collection growth chart showing ${data[0].totalAlbums} to ${data[data.length - 1].totalAlbums} albums`}
    >
      {/* Grid lines */}
      {yTicks.map(tick => {
        const y = padding + chartH - (tick / maxAlbums) * chartH;
        return (
          <g key={tick}>
            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgb(var(--color-surface) / 0.08)" strokeWidth={1} />
            <text x={padding - 8} y={y + 4} textAnchor="end" className="fill-th-text3 text-[10px]">{tick}</text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill="url(#growthGradient)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#dd6e42" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#dd6e42" stroke="rgb(var(--color-bg))" strokeWidth={2} />
      ))}

      {/* X-axis labels (first, middle, last) */}
      {[0, Math.floor(data.length / 2), data.length - 1].map(i => {
        const p = points[i];
        return (
          <text key={i} x={p.x} y={height - 8} textAnchor="middle" className="fill-th-text3 text-[10px]">
            {data[i].date}
          </text>
        );
      })}

      <defs>
        <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dd6e42" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#dd6e42" stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Donut Chart ─────────────────────────────────────────────────────

const DONUT_PALETTE = ['#dd6e42', '#4f6d7a', '#e8dab2', '#c0d6df', '#8b5e3c', '#a7c4bc', '#d4927a', '#6b8f71', '#c9b1d0', '#e0c097'];

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

const CollectionAnalytics: React.FC<CollectionAnalyticsProps> = ({ albums, onScanPress }) => {
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

  const maxDecadeCount = decades.length > 0 ? Math.max(...decades.map(d => d.count)) : 0;

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
            <div className="space-y-2.5">
              {decades.map(d => (
                <BarRow
                  key={d.decade}
                  label={d.decade}
                  count={d.count}
                  percentage={maxDecadeCount > 0 ? Math.round((d.count / maxDecadeCount) * 100) : 0}
                  maxPercentage={100}
                  color="#4f6d7a"
                />
              ))}
            </div>
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
          <GrowthChart data={growth} />
        </section>
      </div>
    </main>
  );
};

export default CollectionAnalytics;
