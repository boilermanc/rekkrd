import React, { useState, useEffect, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────

interface AnalyticsData {
  revenue: {
    total_cents: number;
    by_tier: { starter: number; standard: number; full: number };
    by_day: Array<{ date: string; amount_cents: number; order_count: number }>;
  };
  sessions: {
    total: number;
    with_email: number;
    paid: number;
    abandoned: number;
    conversion_rate: number;
  };
  records: {
    total_scanned: number;
    avg_per_session: number;
    avg_collection_value: number;
  };
  top_artists: Array<{ artist: string; count: number }>;
}

interface AdminAnalyticsProps {
  authToken: string;
}

type Period = '7d' | '30d' | '90d';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

// ── Helpers ──────────────────────────────────────────────────────────

function fmtCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function fmtShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Component ────────────────────────────────────────────────────────

const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ authToken }) => {
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sellr/admin/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: AnalyticsData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [authToken, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return <div className="py-8 text-center text-gray-400 text-sm">Loading analytics...</div>;
  }
  if (error) {
    return <div className="py-8 text-center text-red-500 text-sm">{error}</div>;
  }
  if (!data) return null;

  const { revenue, sessions, records, top_artists } = data;
  const maxDayRevenue = Math.max(...revenue.by_day.map(d => d.amount_cents), 1);
  const maxArtistCount = top_artists.length > 0 ? top_artists[0].count : 1;

  return (
    <div className="space-y-8">
      {/* Period selector */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              period === p.value
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Revenue ───────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Revenue</h3>

        <p className="text-3xl font-bold text-indigo-600" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {fmtCurrency(revenue.total_cents)}
        </p>

        <div className="flex gap-4 mt-2 text-sm">
          <span className="text-gray-500">Starter <span className="font-medium text-gray-700">{fmtCurrency(revenue.by_tier.starter)}</span></span>
          <span className="text-gray-400">&middot;</span>
          <span className="text-gray-500">Standard <span className="font-medium text-gray-700">{fmtCurrency(revenue.by_tier.standard)}</span></span>
          <span className="text-gray-400">&middot;</span>
          <span className="text-gray-500">Full <span className="font-medium text-gray-700">{fmtCurrency(revenue.by_tier.full)}</span></span>
        </div>

        {/* Revenue bar chart */}
        {revenue.by_day.length > 0 && revenue.total_cents > 0 ? (
          <div className="mt-4 flex items-end gap-px h-32" role="img" aria-label="Revenue by day chart">
            {revenue.by_day.map((day, i) => {
              const heightPct = Math.max((day.amount_cents / maxDayRevenue) * 100, day.amount_cents > 0 ? 4 : 0);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                  {/* Bar */}
                  <div
                    className="w-full rounded-t bg-indigo-400 group-hover:bg-indigo-500 transition-colors cursor-default min-w-[3px]"
                    style={{ height: `${heightPct}%` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                    {fmtShortDate(day.date)} &mdash; {fmtCurrency(day.amount_cents)} ({day.order_count} order{day.order_count !== 1 ? 's' : ''})
                  </div>
                  {/* X axis label every 7th bar */}
                  {i % 7 === 0 && (
                    <span className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">
                      {fmtShortDate(day.date)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-400 text-center py-6">No revenue in this period</p>
        )}
      </section>

      {/* ── Conversion Funnel ─────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Conversion Funnel</h3>

        <div className="space-y-2">
          <FunnelRow label="Sessions started" count={sessions.total} total={sessions.total} color="bg-indigo-100" />
          <FunnelRow label="With email" count={sessions.with_email} total={sessions.total} color="bg-indigo-200" />
          <FunnelRow label="Paid" count={sessions.paid} total={sessions.total} color="bg-indigo-400" />
        </div>

        <p className="mt-3 text-2xl font-bold text-indigo-600">
          {(sessions.conversion_rate * 100).toFixed(1)}%
          <span className="text-sm font-normal text-gray-400 ml-2">conversion rate</span>
        </p>
      </section>

      {/* ── Records stats ─────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Records</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-2xl font-bold text-gray-800">{records.avg_per_session}</p>
            <p className="text-xs text-gray-500 mt-1">Avg records per session</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-2xl font-bold text-gray-800">${records.avg_collection_value}</p>
            <p className="text-xs text-gray-500 mt-1">Avg collection value</p>
          </div>
        </div>
      </section>

      {/* ── Top Artists ────────────────────────────────────────────── */}
      {top_artists.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Most Scanned Artists</h3>
          <div className="space-y-1.5">
            {top_artists.map(a => {
              const widthPct = Math.max((a.count / maxArtistCount) * 100, 4);
              return (
                <div key={a.artist} className="flex items-center gap-3">
                  <span className="w-40 text-sm text-gray-600 truncate shrink-0" title={a.artist}>
                    {a.artist}
                  </span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right tabular-nums shrink-0">{a.count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

// ── Funnel row ───────────────────────────────────────────────────────

const FunnelRow: React.FC<{
  label: string;
  count: number;
  total: number;
  color: string;
}> = ({ label, count, total, color }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const widthPct = total > 0 ? Math.max((count / total) * 100, 2) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-sm text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
        <div className={`h-full ${color} rounded transition-all`} style={{ width: `${widthPct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-20 text-right shrink-0 tabular-nums">
        {count.toLocaleString()} ({pct}%)
      </span>
    </div>
  );
};

export default AdminAnalytics;
