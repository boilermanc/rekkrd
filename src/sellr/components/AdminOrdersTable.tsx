import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCw, Eye, ExternalLink, X } from 'lucide-react';
import type { AdminOrder, SellrRecord } from '../types';
import EmailLogTable from './EmailLogTable';

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function fmtCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

// ── Badge configs ────────────────────────────────────────────────────

const STATUS_BADGE: Record<AdminOrder['status'], { bg: string; text: string }> = {
  complete: { bg: 'bg-green-100', text: 'text-green-700' },
  pending:  { bg: 'bg-amber-100', text: 'text-amber-700' },
  failed:   { bg: 'bg-red-100',   text: 'text-red-600' },
};

const TIER_BADGE: Record<string, { bg: string; text: string }> = {
  starter:  { bg: 'bg-gray-100',    text: 'text-gray-600' },
  standard: { bg: 'bg-indigo-100',  text: 'text-indigo-600' },
  full:     { bg: 'bg-amber-100',   text: 'text-amber-700' },
};

// ── Session Inspector data ───────────────────────────────────────────

interface SessionDetail {
  session: {
    id: string;
    email: string | null;
    tier: string | null;
    status: string;
    record_count: number;
    created_at: string;
    expires_at: string;
  };
  records: SellrRecord[];
  order: {
    id: string;
    email: string;
    tier: string;
    amount_cents: number;
    status: string;
    stripe_payment_intent: string | null;
    report_token: string;
    created_at: string;
  } | null;
}

// ── Props ────────────────────────────────────────────────────────────

interface AdminOrdersTableProps {
  authToken: string;
}

const DEFAULT_LIMIT = 50;

const AdminOrdersTable: React.FC<AdminOrdersTableProps> = ({ authToken }) => {
  // ── Orders state ───────────────────────────────────────────────────
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Filters ────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Inspector state ────────────────────────────────────────────────
  const [inspectOrderId, setInspectOrderId] = useState<string | null>(null);
  const [inspectSessionId, setInspectSessionId] = useState<string | null>(null);
  const [inspectEmail, setInspectEmail] = useState<string>('');
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // ── Debounce search ────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // ── Fetch orders ───────────────────────────────────────────────────
  const fetchOrders = useCallback(async (currentOffset: number, append: boolean) => {
    try {
      const params = new URLSearchParams({
        limit: String(DEFAULT_LIMIT),
        offset: String(currentOffset),
      });
      if (statusFilter) params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/sellr/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data: { orders: AdminOrder[]; total: number } = await res.json();
      if (append) {
        setOrders(prev => [...prev, ...data.orders]);
      } else {
        setOrders(data.orders);
      }
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [authToken, statusFilter, debouncedSearch]);

  // Reload when filters change
  useEffect(() => {
    setLoading(true);
    setOffset(0);
    fetchOrders(0, false);
  }, [fetchOrders]);

  const handleRefresh = () => {
    setLoading(true);
    setOffset(0);
    fetchOrders(0, false);
  };

  const handleShowMore = () => {
    const next = offset + DEFAULT_LIMIT;
    setOffset(next);
    setLoadingMore(true);
    fetchOrders(next, true);
  };

  // ── Open session inspector ─────────────────────────────────────────
  const openInspector = async (order: AdminOrder) => {
    setInspectOrderId(order.id);
    setInspectSessionId(order.session_id);
    setInspectEmail(order.email);
    setInspectLoading(true);
    setSessionDetail(null);

    try {
      const res = await fetch(`/api/sellr/admin/session/${order.session_id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SessionDetail = await res.json();
      setSessionDetail(data);
    } catch {
      setSessionDetail(null);
    } finally {
      setInspectLoading(false);
    }
  };

  const closeInspector = () => {
    setInspectOrderId(null);
    setInspectSessionId(null);
    setSessionDetail(null);
  };

  const hasMore = orders.length < total;
  const baseUrl = (typeof window !== 'undefined' && window.location.origin) || '';

  // ── Loading ────────────────────────────────────────────────────────
  if (loading && orders.length === 0) {
    return <div className="py-8 text-center text-gray-400 text-sm">Loading orders...</div>;
  }

  if (error && orders.length === 0) {
    return <div className="py-8 text-center text-red-500 text-sm">{error}</div>;
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 w-56"
        />

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">All Statuses</option>
          <option value="complete">Complete</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>

        <span className="text-xs text-gray-400 ml-auto">
          {total} order{total !== 1 ? 's' : ''}
        </span>

        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RotateCw size={16} />
        </button>
      </div>

      {/* Table */}
      {orders.length === 0 ? (
        <p className="py-8 text-center text-gray-400 text-sm">No orders found.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-400 uppercase tracking-wide">
                  <th className="pb-3 pr-3">Date</th>
                  <th className="pb-3 pr-3">Email</th>
                  <th className="pb-3 pr-3">Tier</th>
                  <th className="pb-3 pr-3">Records</th>
                  <th className="pb-3 pr-3">Amount</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const sBadge = STATUS_BADGE[order.status];
                  const tBadge = TIER_BADGE[order.tier] ?? TIER_BADGE.starter;
                  return (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5 pr-3 text-gray-600 whitespace-nowrap">
                        {fmtDateTime(order.created_at)}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600 max-w-[180px] truncate" title={order.email}>
                        {order.email}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded capitalize ${tBadge.bg} ${tBadge.text}`}>
                          {order.tier}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600 tabular-nums">
                        {order.record_count}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600 tabular-nums">
                        {fmtCurrency(order.amount_cents)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded capitalize ${sBadge.bg} ${sBadge.text}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openInspector(order)}
                            className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Inspect session"
                          >
                            <Eye size={15} />
                          </button>
                          <a
                            href={`${baseUrl}/sellr/report?token=${order.report_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Open report"
                          >
                            <ExternalLink size={15} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={handleShowMore}
                disabled={loadingMore}
                className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : `Load more (${total - orders.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Session Inspector slide-over ──────────────────────────────── */}
      {inspectOrderId && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={closeInspector}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-96 bg-gray-50 shadow-xl z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate" title={inspectOrderId}>
                  Order {inspectOrderId.slice(0, 8)}...
                </p>
                <p className="text-xs text-gray-500 truncate">{inspectEmail}</p>
              </div>
              <button
                onClick={closeInspector}
                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {inspectLoading && (
                <p className="text-sm text-gray-400 text-center py-8">Loading session...</p>
              )}

              {!inspectLoading && sessionDetail && (
                <>
                  {/* Order details */}
                  <section>
                    <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Order Details</h4>
                    <div className="bg-white rounded-lg p-3 space-y-2 text-sm border border-gray-200">
                      <Row label="Tier" value={sessionDetail.order?.tier ?? '—'} />
                      <Row label="Amount" value={sessionDetail.order ? fmtCurrency(sessionDetail.order.amount_cents) : '—'} />
                      <Row label="Status" value={sessionDetail.order?.status ?? '—'} />
                      <Row label="Created" value={sessionDetail.order ? fmtDateTime(sessionDetail.order.created_at) : '—'} />
                      {sessionDetail.order?.stripe_payment_intent && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Stripe PI</span>
                          <span className="font-mono text-xs text-gray-600 max-w-[180px] truncate" title={sessionDetail.order.stripe_payment_intent}>
                            {sessionDetail.order.stripe_payment_intent}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Records */}
                  <section>
                    <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                      Records ({sessionDetail.records.length})
                    </h4>
                    {sessionDetail.records.length === 0 ? (
                      <p className="text-sm text-gray-400">No records.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {sessionDetail.records.map(rec => (
                          <div key={rec.id} className="flex items-center gap-3 bg-white rounded-lg p-2 border border-gray-200">
                            {rec.cover_image ? (
                              <img
                                src={rec.cover_image}
                                alt={`${rec.title} cover`}
                                className="w-10 h-10 rounded object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-gray-200 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 truncate">{rec.title}</p>
                              <p className="text-xs text-gray-500 truncate">{rec.artist}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-gray-400">{rec.condition}</p>
                              {rec.price_median != null && (
                                <p className="text-xs font-medium text-gray-600">${rec.price_median}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Email history */}
                  <section>
                    <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Email History</h4>
                    <EmailLogTable sessionId={inspectSessionId!} authToken={authToken} limit={20} />
                  </section>

                  {/* Report link */}
                  {sessionDetail.order?.report_token && (
                    <section>
                      <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Report</h4>
                      <a
                        href={`${baseUrl}/sellr/report?token=${sessionDetail.order.report_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:text-indigo-500 break-all"
                      >
                        {baseUrl}/sellr/report?token={sessionDetail.order.report_token}
                      </a>
                    </section>
                  )}
                </>
              )}

              {!inspectLoading && !sessionDetail && (
                <p className="text-sm text-red-500 text-center py-8">Failed to load session details.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ── Tiny helper for key/value rows ───────────────────────────────────

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-400">{label}</span>
    <span className="text-gray-700 capitalize">{value}</span>
  </div>
);

export default AdminOrdersTable;
