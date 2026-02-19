import React, { useEffect, useState } from 'react';
import { adminService, UtmStats } from '../../../services/adminService';

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return '1 day ago';
  if (diffDay < 30) return `${diffDay} days ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function topEntry(map: Record<string, number>): { name: string; count: number } | null {
  const entries = Object.entries(map);
  if (entries.length === 0) return null;
  entries.sort(([, a], [, b]) => b - a);
  return { name: entries[0][0], count: entries[0][1] };
}

interface BreakdownTableProps {
  title: string;
  data: Record<string, number>;
  total: number;
  ariaLabel: string;
}

const BreakdownTable: React.FC<BreakdownTableProps> = ({ title, data, total, ariaLabel }) => {
  const sorted = (Object.entries(data) as [string, number][]).sort(([, a], [, b]) => b - a);

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2" style={{ color: 'rgb(17,24,39)' }}>{title}</h4>
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgb(229,231,235)' }}>
        <table className="w-full text-sm" role="table" aria-label={ariaLabel}>
          <thead>
            <tr style={{ backgroundColor: 'rgb(249,250,251)' }}>
              <th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider" style={{ color: 'rgb(107,114,128)' }}>Name</th>
              <th className="text-right px-4 py-2 font-medium text-xs uppercase tracking-wider" style={{ color: 'rgb(107,114,128)' }}>Count</th>
              <th className="text-right px-4 py-2 font-medium text-xs uppercase tracking-wider" style={{ color: 'rgb(107,114,128)' }}>%</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgb(243,244,246)' }}>
            {sorted.map(([name, count]) => (
              <tr key={name}>
                <td className="px-4 py-2" style={{ color: 'rgb(17,24,39)' }}>{name}</td>
                <td className="px-4 py-2 text-right tabular-nums" style={{ color: 'rgb(107,114,128)' }}>{count}</td>
                <td className="px-4 py-2 text-right tabular-nums" style={{ color: 'rgb(107,114,128)' }}>
                  {total > 0 ? `${Math.round((count / total) * 100)}%` : '0%'}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center" style={{ color: 'rgb(156,163,175)' }}>No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CardAnalytics: React.FC = () => {
  const [stats, setStats] = useState<UtmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminService.getUtmStats()
      .then(setStats)
      .catch(err => {
        console.error('Failed to load UTM stats:', err);
        setError('Failed to load analytics data');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-[rgb(99,102,241)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
          <p className="text-sm" style={{ color: 'rgb(239,68,68)' }}>{error || 'Failed to load data'}</p>
          <button
            onClick={() => { setLoading(true); setError(null); adminService.getUtmStats().then(setStats).catch(() => setError('Failed to load analytics data')).finally(() => setLoading(false)); }}
            className="mt-3 text-sm font-medium px-4 py-2 rounded-lg border transition-colors hover:bg-[rgb(249,250,251)]"
            style={{ color: 'rgb(99,102,241)', borderColor: 'rgb(229,231,235)' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const topSource = topEntry(stats.by_source);
  const topCampaign = topEntry(stats.by_campaign);
  const maxDailyCount = Math.max(...stats.by_date.map(d => d.count), 1);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5">
          <svg className="w-5 h-5" style={{ color: 'rgb(99,102,241)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h1 className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>Card & UTM Analytics</h1>
        </div>
        <p className="text-sm mt-1" style={{ color: 'rgb(107,114,128)' }}>Conversion stats from UTM-tracked signups</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(238,242,255)' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'rgb(99,102,241)' }} />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgb(107,114,128)' }}>Card Signups</p>
          </div>
          <p className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>{stats.total_signups}</p>
        </div>

        <div className="rounded-xl border p-5" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(255,243,235)' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'rgb(221,110,66)' }} />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgb(107,114,128)' }}>Top Source</p>
          </div>
          {topSource ? (
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>{topSource.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(156,163,175)' }}>{topSource.count} signups</p>
            </div>
          ) : (
            <p className="text-lg" style={{ color: 'rgb(209,213,219)' }}>No data</p>
          )}
        </div>

        <div className="rounded-xl border p-5" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(240,253,244)' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'rgb(34,197,94)' }} />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgb(107,114,128)' }}>Top Campaign</p>
          </div>
          {topCampaign ? (
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>{topCampaign.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(156,163,175)' }}>{topCampaign.count} signups</p>
            </div>
          ) : (
            <p className="text-lg" style={{ color: 'rgb(209,213,219)' }}>No data</p>
          )}
        </div>
      </div>

      {/* Signup Trend */}
      <div className="rounded-xl border p-5 mb-8" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'rgb(17,24,39)' }}>Signup Trend (Last 30 Days)</h3>
        <div className="flex items-end gap-[3px] h-32" role="img" aria-label="Bar chart showing daily signup counts for the last 30 days">
          {stats.by_date.map((d, i) => {
            const heightPct = maxDailyCount > 0 ? (d.count / maxDailyCount) * 100 : 0;
            const showLabel = i % 5 === 0;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center min-w-0">
                <div
                  className="w-full rounded-t transition-colors hover:opacity-80"
                  style={{
                    height: `${Math.max(heightPct, 2)}%`,
                    backgroundColor: d.count > 0 ? 'rgb(99,102,241)' : 'rgb(229,231,235)',
                  }}
                  title={`${d.date}: ${d.count} signup${d.count !== 1 ? 's' : ''}`}
                />
                {showLabel && (
                  <span className="text-[9px] mt-1 whitespace-nowrap" style={{ color: 'rgb(156,163,175)' }}>
                    {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown Tables */}
        <div className="space-y-6">
          <BreakdownTable
            title="By Source"
            data={stats.by_source}
            total={stats.total_signups}
            ariaLabel="Signup counts by UTM source"
          />
          <BreakdownTable
            title="By Campaign"
            data={stats.by_campaign}
            total={stats.total_signups}
            ariaLabel="Signup counts by UTM campaign"
          />
          <BreakdownTable
            title="By Tier"
            data={stats.by_tier}
            total={stats.total_signups}
            ariaLabel="Signup counts by subscription tier"
          />
        </div>

        {/* Recent Signups */}
        <div>
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'rgb(17,24,39)' }}>Recent Signups</h4>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgb(229,231,235)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table" aria-label="Recent UTM-tracked signups">
                <thead>
                  <tr style={{ backgroundColor: 'rgb(249,250,251)' }}>
                    <th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider whitespace-nowrap" style={{ color: 'rgb(107,114,128)' }}>Date</th>
                    <th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider whitespace-nowrap" style={{ color: 'rgb(107,114,128)' }}>Source</th>
                    <th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider whitespace-nowrap hidden sm:table-cell" style={{ color: 'rgb(107,114,128)' }}>Medium</th>
                    <th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider whitespace-nowrap hidden md:table-cell" style={{ color: 'rgb(107,114,128)' }}>Campaign</th>
                    <th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider whitespace-nowrap" style={{ color: 'rgb(107,114,128)' }}>Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'rgb(243,244,246)' }}>
                  {stats.recent_signups.map((s, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 whitespace-nowrap" style={{ color: 'rgb(107,114,128)' }}>{relativeTime(s.created_at)}</td>
                      <td className="px-4 py-2" style={{ color: 'rgb(17,24,39)' }}>{s.utm_source || '—'}</td>
                      <td className="px-4 py-2 hidden sm:table-cell" style={{ color: 'rgb(107,114,128)' }}>{s.utm_medium || '—'}</td>
                      <td className="px-4 py-2 hidden md:table-cell" style={{ color: 'rgb(107,114,128)' }}>{s.utm_campaign || '—'}</td>
                      <td className="px-4 py-2">
                        {s.subscription_tier ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgb(238,242,255)', color: 'rgb(99,102,241)' }}>
                            {s.subscription_tier}
                          </span>
                        ) : (
                          <span style={{ color: 'rgb(209,213,219)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {stats.recent_signups.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'rgb(156,163,175)' }}>No tracked signups yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardAnalytics;
