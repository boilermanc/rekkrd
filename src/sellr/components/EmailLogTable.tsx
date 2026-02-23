import React, { useState, useEffect, useCallback } from 'react';
import type { SellrEmailLog } from '../types';

// ── Badge colors per email type ─────────────────────────────────────

const TYPE_BADGE: Record<SellrEmailLog['email_type'], { bg: string; text: string; label: string }> = {
  session_created:    { bg: 'bg-sellr-blue/10',   text: 'text-sellr-blue',     label: 'Session Created' },
  payment_confirmed:  { bg: 'bg-sellr-sage/20',   text: 'text-sellr-sage',     label: 'Payment Confirmed' },
  abandoned_session:  { bg: 'bg-amber-100',        text: 'text-amber-700',      label: 'Abandoned' },
  rekkrd_conversion:  { bg: 'bg-purple-100',       text: 'text-purple-600',     label: 'Conversion' },
  admin_alert:        { bg: 'bg-gray-100',         text: 'text-gray-500',       label: 'Admin Alert' },
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ── Props ───────────────────────────────────────────────────────────

interface EmailLogTableProps {
  sessionId?: string;
  limit?: number;
  authToken?: string;
}

const DEFAULT_LIMIT = 50;

const EmailLogTable: React.FC<EmailLogTableProps> = ({
  sessionId,
  limit = DEFAULT_LIMIT,
  authToken,
}) => {
  const [logs, setLogs] = useState<SellrEmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const token = authToken || import.meta.env.VITE_SELLR_ADMIN_TOKEN || '';

  const fetchLogs = useCallback(async (currentOffset: number, append: boolean) => {
    if (!token) {
      setError('No admin token configured');
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(currentOffset),
      });
      if (sessionId) params.set('session_id', sessionId);

      const res = await fetch(`/api/sellr/admin/email-log?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data: { logs: SellrEmailLog[]; total: number } = await res.json();

      if (append) {
        setLogs(prev => [...prev, ...data.logs]);
      } else {
        setLogs(data.logs);
      }
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token, limit, sessionId]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    setOffset(0);
    fetchLogs(0, false);
  }, [fetchLogs]);

  const handleShowMore = () => {
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    setLoadingMore(true);
    fetchLogs(nextOffset, true);
  };

  const hasMore = logs.length < total;

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-8 text-center text-sellr-charcoal/40 text-sm">
        Loading email history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-500 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-lg text-sellr-charcoal">Email History</h3>
        <span className="text-xs text-sellr-charcoal/40">
          {total} email{total !== 1 ? 's' : ''}
        </span>
      </div>

      {logs.length === 0 ? (
        <p className="py-8 text-center text-sellr-charcoal/40 text-sm">
          No emails sent yet.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sellr-charcoal/10 text-left text-xs text-sellr-charcoal/50 uppercase tracking-wide">
                  <th className="pb-3 pr-3">Sent At</th>
                  <th className="pb-3 pr-3">Type</th>
                  <th className="pb-3 pr-3">Recipient</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const badge = TYPE_BADGE[log.email_type];
                  return (
                    <tr
                      key={log.id}
                      className={`border-b border-sellr-charcoal/5 ${
                        !log.success ? 'bg-red-50' : ''
                      }`}
                    >
                      {/* Sent At */}
                      <td className="py-2.5 pr-3 text-sellr-charcoal/70 whitespace-nowrap">
                        {fmtDateTime(log.sent_at)}
                      </td>

                      {/* Type badge */}
                      <td className="py-2.5 pr-3">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Recipient */}
                      <td className="py-2.5 pr-3 text-sellr-charcoal/70 max-w-[180px] truncate" title={log.recipient_email ?? ''}>
                        {log.recipient_email ?? '—'}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 pr-3">
                        {log.success ? (
                          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-sellr-sage/20 text-sellr-sage">
                            Sent
                          </span>
                        ) : (
                          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-600">
                            Failed
                          </span>
                        )}
                      </td>

                      {/* Error */}
                      <td className="py-2.5 text-xs text-red-500 max-w-[200px] truncate" title={log.error_message ?? ''}>
                        {log.error_message ?? ''}
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
                className="px-4 py-2 text-sm font-medium text-sellr-blue hover:text-sellr-blue-light transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : `Show more (${total - logs.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmailLogTable;
