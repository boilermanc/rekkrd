import React, { useState, useEffect, useCallback } from 'react';
import EmailLogTable from '../components/EmailLogTable';
import AdminOrdersTable from '../components/AdminOrdersTable';
import AdminAnalytics from '../components/AdminAnalytics';
import AdminTools from '../components/AdminTools';
import AdminHealth from '../components/AdminHealth';

// ── Types ────────────────────────────────────────────────────────────

interface SellrStats {
  total_orders: number;
  total_revenue_cents: number;
  active_sessions: number;
  total_records_scanned: number;
  conversion_rate: number;
}

interface AdminPanelProps {
  authToken: string;
}

// ── Tabs ─────────────────────────────────────────────────────────────

const TABS = ['Orders', 'Analytics', 'Email Log', 'Tools', 'Health'] as const;
type Tab = (typeof TABS)[number];

// ── Helpers ──────────────────────────────────────────────────────────

function fmtCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function fmtPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// ── Component ────────────────────────────────────────────────────────

const AdminPanel: React.FC<AdminPanelProps> = ({ authToken }) => {
  const [tab, setTab] = useState<Tab>('Orders');
  const [stats, setStats] = useState<SellrStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/sellr/admin/stats', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SellrStats = await res.json();
      setStats(data);
      setStatsError(null);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Failed to fetch stats');
    }
  }, [authToken]);

  // Fetch on mount + refresh every 60s
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // ── Stats pills ──────────────────────────────────────────────────

  const statPills = stats
    ? [
        { label: 'Orders', value: String(stats.total_orders) },
        { label: 'Revenue', value: fmtCurrency(stats.total_revenue_cents) },
        { label: 'Active Sessions', value: String(stats.active_sessions) },
        { label: 'Records Scanned', value: String(stats.total_records_scanned) },
        { label: 'Conversion', value: fmtPercent(stats.conversion_rate) },
      ]
    : null;

  return (
    <div className="p-6">
      {/* Header */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Sellr</h2>

      {/* Stats pills */}
      {statsError && (
        <p className="text-sm text-red-500 mb-4">Stats: {statsError}</p>
      )}
      {statPills && (
        <div className="flex flex-wrap gap-3 mb-6">
          {statPills.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-sm"
            >
              <span className="text-gray-500">{s.label}</span>
              <span className="font-semibold text-indigo-600">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Orders' && (
        <AdminOrdersTable authToken={authToken} />
      )}
      {tab === 'Analytics' && (
        <AdminAnalytics authToken={authToken} />
      )}
      {tab === 'Email Log' && (
        <EmailLogTable authToken={authToken} />
      )}
      {tab === 'Tools' && (
        <AdminTools authToken={authToken} />
      )}
      {tab === 'Health' && (
        <AdminHealth authToken={authToken} />
      )}
    </div>
  );
};

export default AdminPanel;
