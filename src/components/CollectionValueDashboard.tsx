import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart2, Info, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from 'recharts';
import { supabase } from '../../services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import SpinningRecord from '../../components/SpinningRecord';

interface AlbumValue {
  artist: string;
  title: string;
  price_low: number | null;
  price_median: number | null;
  price_high: number | null;
  genre: string | null;
  year: string | null;
  condition: string | null;
}

interface GenreBucket {
  genre: string;
  value: number;
  count: number;
}

interface DecadeBucket {
  decade: string;
  value: number;
  count: number;
}

interface CollectionValueData {
  totalLow: number;
  totalMedian: number;
  totalHigh: number;
  valuedCount: number;
  totalCount: number;
  topRecords: AlbumValue[];
  byGenre: GenreBucket[];
  byDecade: DecadeBucket[];
  allDiscogsIds: number[];
}

interface HistoryPoint {
  date: string;
  median: number;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

const PEACH = '#dd6e42';
const PEACH_DARK = '#c4714a';
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (target <= 0 || hasRun.current) return;
    hasRun.current = true;

    let rafId: number;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return value;
}

const CollectionValueDashboard: React.FC = () => {
  const [data, setData] = useState<CollectionValueData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Close info panel on outside click
  useEffect(() => {
    if (!infoOpen) return;
    function handleClick(e: MouseEvent) {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setInfoOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [infoOpen]);

  const fetchAll = useCallback(async () => {
    const session = await supabase?.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const headers = { Authorization: `Bearer ${token}` };

    const [valueRes, historyRes] = await Promise.all([
      fetch('/api/collection/value', { headers }),
      fetch('/api/collection/value/history', { headers }),
    ]);

    if (!valueRes.ok) {
      const body = await valueRes.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || `Request failed (${valueRes.status})`);
    }

    const valueData = (await valueRes.json()) as CollectionValueData;
    const historyData = historyRes.ok
      ? ((await historyRes.json()) as { history: HistoryPoint[] }).history
      : [];

    return { valueData, historyData };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { valueData, historyData } = await fetchAll();
        if (!cancelled) {
          setData(valueData);
          setHistory(historyData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load collection value');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fetchAll]);

  async function handleRefreshPrices() {
    if (!data) return;

    const ids = data.allDiscogsIds;
    if (ids.length === 0) {
      showToast('No Discogs-linked records to refresh', 'error');
      return;
    }

    setRefreshing(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) {
        showToast('Not authenticated', 'error');
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      let totalUpdated = 0;

      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);

        const res = await fetch('/api/discogs-pricing', {
          method: 'POST',
          headers,
          body: JSON.stringify({ release_ids: batch }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error || `Failed to refresh prices (${res.status})`);
        }

        const result = (await res.json()) as { updated: number; errors: string[] };
        totalUpdated += result.updated;

        // Delay between batches to avoid rate limiting (skip after last batch)
        if (i + BATCH_SIZE < ids.length) {
          await sleep(BATCH_DELAY_MS);
        }
      }

      // Re-fetch dashboard data with updated prices
      const { valueData, historyData } = await fetchAll();
      setData(valueData);
      setHistory(historyData);

      showToast(`Prices updated for ${totalUpdated} record${totalUpdated !== 1 ? 's' : ''}`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh prices';
      showToast(message, 'error');
    } finally {
      setRefreshing(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <SpinningRecord size="w-40 h-40" />
        <p className="font-label text-[10px] tracking-widest mt-8 text-th-text3 uppercase">
          Calculating collection value
        </p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <BarChart2 className="w-12 h-12 text-th-text3 mb-4" />
        <p className="text-th-text font-semibold text-lg">Something went wrong</p>
        <p className="text-th-text3 text-sm mt-1">{error}</p>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────
  if (!data || data.valuedCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <BarChart2 className="w-14 h-14 text-th-text3 mb-4" />
        <p className="text-th-text font-semibold text-lg">No pricing data yet</p>
        <p className="text-th-text3 text-sm mt-2 max-w-sm">
          Add records via Discogs search or refresh prices on your wantlist to see your collection value.
        </p>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 mt-6 pb-12 space-y-6">

      {/* Header */}
      <div ref={infoRef}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-th-text tracking-tight">Collection Value</h2>
            <button
              type="button"
              onClick={() => setInfoOpen(prev => !prev)}
              aria-label="How we calculate collection value"
              className="text-th-text3 hover:text-th-text transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleRefreshPrices}
            disabled={refreshing || (data.valuedCount === 0 && data.totalCount === 0)}
            aria-label="Refresh collection prices"
            className="text-xs font-medium px-4 py-2 rounded-lg border border-th-surface/[0.15] text-th-text3 hover:text-th-text hover:bg-th-surface/[0.06] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Prices</span>
          </button>
        </div>

        {/* Info panel */}
        <div
          className={`overflow-hidden transition-all duration-300 ${infoOpen ? 'max-h-[600px] mt-4' : 'max-h-0'}`}
        >
          <div className="glass-morphism rounded-xl p-4 border border-white/10 text-sm text-th-text3 space-y-3">
            <p className="text-th-text font-semibold text-sm">How we calculate your collection value</p>
            <p>
              Prices come from the Discogs marketplace &mdash; the world&rsquo;s largest vinyl
              database with millions of real sales records.
            </p>
            <p>
              <span className="text-th-text font-medium">Conservative ({formatCurrency(data.totalLow)})</span> &mdash; the
              lowest recent asking price for your condition grade. A realistic floor if you sold everything today.
            </p>
            <p>
              <span className="text-[#dd6e42] font-medium">Estimated ({formatCurrency(data.totalMedian)})</span> &mdash; the
              median price across all current listings. This is the most realistic valuation for your collection.
            </p>
            <p>
              <span className="text-th-text font-medium">Optimistic ({formatCurrency(data.totalHigh)})</span> &mdash; the
              highest recent asking price. Reflects what top-condition copies can fetch from the right buyer.
            </p>
            <p>
              Only records matched to a Discogs release ID are included in the
              calculation. {data.valuedCount} of your {data.totalCount} records have pricing data.
            </p>
            <p className="text-th-text3/70 text-xs">
              Prices are point-in-time snapshots from the Discogs marketplace and
              fluctuate with supply and demand. We are not affiliated with Discogs.
            </p>
          </div>
        </div>
      </div>

      {/* Hero value row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ValueCard label="Conservative" value={data.totalLow} />
        <ValueCard label="Estimated" value={data.totalMedian} highlighted />
        <ValueCard label="Optimistic" value={data.totalHigh} />
      </div>
      <p className="text-center text-th-text3 text-xs">
        Based on {data.valuedCount} of {data.totalCount} records with pricing data
      </p>

      {/* Value Over Time */}
      {history.length >= 2 && (
        <section className="glass-morphism rounded-3xl p-5 md:p-6 border border-th-surface/[0.10]">
          <h2 className="font-label text-[10px] tracking-widest text-th-text3 uppercase mb-4 border-l-2 border-[#dd6e42] pl-2">
            Collection Value Over Time
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tick={{ fill: 'var(--color-th-text3, #999)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatCurrency(v)}
                tick={{ fill: 'var(--color-th-text3, #999)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip content={<HistoryTooltip />} cursor={false} />
              <Line
                type="monotone"
                dataKey="median"
                stroke={PEACH}
                strokeWidth={2}
                dot={<LastDotOnly total={history.length} />}
                activeDot={{ r: 4, fill: PEACH, stroke: PEACH }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Top 10 Most Valuable */}
      {data.topRecords.length > 0 && (
        <section className="glass-morphism rounded-3xl p-5 md:p-6 border border-th-surface/[0.10]">
          <h2 className="font-label text-[10px] tracking-widest text-th-text3 uppercase mb-4 border-l-2 border-[#dd6e42] pl-2">
            Top {data.topRecords.length} Most Valuable
          </h2>
          <ol className="space-y-2">
            {data.topRecords.map((rec, i) => {
              const price = rec.price_median ?? rec.price_high ?? 0;
              const rankColor = i === 0 ? 'text-[#dd6e42]' : i <= 2 ? 'text-[#f0a882]' : 'text-th-text3';
              return (
                <li key={`${rec.artist}-${rec.title}-${i}`} className="flex items-baseline gap-3 border-l-2 border-transparent hover:border-[#dd6e42] pl-2 -ml-2 transition-colors">
                  <span className={`${rankColor} text-sm font-mono w-6 text-right shrink-0 font-semibold`}>
                    {i + 1}
                  </span>
                  <span className="text-th-text text-sm truncate">
                    {rec.artist} &mdash; {rec.title}
                  </span>
                  <span className="ml-auto text-[#dd6e42] font-semibold text-sm whitespace-nowrap">
                    {formatCurrency(price)}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Charts: Genre + Decade side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Genre — horizontal bar */}
        {data.byGenre.length > 0 && (
          <section className="glass-morphism rounded-3xl p-5 md:p-6 border border-th-surface/[0.10]">
            <h2 className="font-label text-[10px] tracking-widest text-th-text3 uppercase mb-4 border-l-2 border-[#dd6e42] pl-2">
              Value by Genre
            </h2>
            <ResponsiveContainer width="100%" height={data.byGenre.length * 40 + 20}>
              <BarChart
                data={data.byGenre}
                layout="vertical"
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => formatCurrency(v)}
                  tick={{ fill: 'var(--color-th-text3, #999)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="genre"
                  width={90}
                  tick={{ fill: 'var(--color-th-text, #eee)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<GenreTooltip />} cursor={false} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {data.byGenre.map((_, idx) => (
                    <Cell key={idx} fill={PEACH} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* By Decade — vertical bar */}
        {data.byDecade.length > 0 && (
          <section className="glass-morphism rounded-3xl p-5 md:p-6 border border-th-surface/[0.10]">
            <h2 className="font-label text-[10px] tracking-widest text-th-text3 uppercase mb-4 border-l-2 border-[#dd6e42] pl-2">
              Value by Decade
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data.byDecade}
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="decade"
                  tick={{ fill: 'var(--color-th-text, #eee)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => formatCurrency(v)}
                  tick={{ fill: 'var(--color-th-text3, #999)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<DecadeTooltip />} cursor={false} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.byDecade.map((_, idx) => (
                    <Cell key={idx} fill={idx % 2 === 0 ? PEACH : PEACH_DARK} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}
      </div>
    </div>
  );
};

// ── Sub-components ───────────────────────────────────────────────────────

interface ValueCardProps {
  label: string;
  value: number;
  highlighted?: boolean;
}

function ValueCard({ label, value, highlighted }: ValueCardProps) {
  const animatedValue = useCountUp(value);

  return (
    <div
      className={`glass-morphism rounded-3xl p-5 md:p-6 border text-center ${
        highlighted
          ? 'border-[#dd6e42]/40 ring-1 ring-[#dd6e42]/20'
          : 'border-th-surface/[0.10]'
      }`}
      style={highlighted ? { boxShadow: '0 0 20px rgba(221,110,66,0.15)' } : undefined}
    >
      <p className="font-label text-[9px] tracking-widest text-th-text3 uppercase mb-1">
        {label}
      </p>
      <p
        className={`text-3xl md:text-4xl font-bold ${
          highlighted ? 'text-[#dd6e42]' : 'text-th-text'
        }`}
      >
        {formatCurrency(animatedValue)}
      </p>
    </div>
  );
}

interface TooltipPayloadItem {
  payload: GenreBucket | DecadeBucket;
}

function GenreTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as GenreBucket;
  return (
    <div className="glass-morphism rounded-xl px-3 py-2 border border-th-surface/[0.10] text-xs">
      <p className="text-th-text font-semibold">{d.genre}</p>
      <p className="text-[#dd6e42]">{formatCurrency(d.value)}</p>
      <p className="text-th-text3">{d.count} record{d.count !== 1 ? 's' : ''}</p>
    </div>
  );
}

function DecadeTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as DecadeBucket;
  return (
    <div className="glass-morphism rounded-xl px-3 py-2 border border-th-surface/[0.10] text-xs">
      <p className="text-th-text font-semibold">{d.decade}</p>
      <p className="text-[#dd6e42]">{formatCurrency(d.value)}</p>
      <p className="text-th-text3">{d.count} record{d.count !== 1 ? 's' : ''}</p>
    </div>
  );
}

interface HistoryTooltipPayloadItem {
  payload: HistoryPoint;
}

function HistoryTooltip({ active, payload }: { active?: boolean; payload?: HistoryTooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-morphism rounded-xl px-3 py-2 border border-th-surface/[0.10] text-xs">
      <p className="text-th-text font-semibold">{formatShortDate(d.date)}</p>
      <p className="text-[#dd6e42]">{formatCurrency(d.median)}</p>
    </div>
  );
}

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
}

function LastDotOnly({ total, cx, cy, index }: DotProps & { total: number }) {
  if (index !== total - 1 || cx === undefined || cy === undefined) return null;
  return <circle cx={cx} cy={cy} r={4} fill={PEACH} stroke={PEACH} />;
}

export default CollectionValueDashboard;
