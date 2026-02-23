import React, { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Disc3, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { PriceAlert } from '../../types';
import { supabase } from '../../services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import { proxyImageUrl } from '../../services/imageProxy';
import SpinningRecord from '../../components/SpinningRecord';

function formatRelativeDate(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return 'today';
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  const d = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

async function getToken(): Promise<string | null> {
  const session = await supabase?.auth.getSession();
  return session?.data?.session?.access_token ?? null;
}

const PriceAlertsView: React.FC = () => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchAlerts = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch('/api/price-alerts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = (await res.json()) as { alerts: PriceAlert[] };
        setAlerts(body.alerts);
      }
    } catch {
      showToast('Failed to load price alerts', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Auto-cancel delete confirmation after 3s
  useEffect(() => {
    if (!confirmDeleteId) return;
    const timer = setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  const handleToggle = async (alertId: string) => {
    const token = await getToken();
    if (!token) return;

    setTogglingIds((prev) => new Set(prev).add(alertId));
    try {
      const res = await fetch(`/api/price-alerts/${alertId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        showToast('Failed to toggle alert', 'error');
        return;
      }

      const { alert: updated } = (await res.json()) as { alert: PriceAlert };
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch {
      showToast('Failed to toggle alert', 'error');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  const handleDelete = async (alertId: string) => {
    if (confirmDeleteId !== alertId) {
      setConfirmDeleteId(alertId);
      return;
    }

    const token = await getToken();
    if (!token) return;

    // Optimistic removal
    const previous = alerts;
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setConfirmDeleteId(null);

    try {
      const res = await fetch(`/api/price-alerts/${alertId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setAlerts(previous);
        showToast('Failed to delete alert', 'error');
        return;
      }

      showToast('Alert removed', 'success');
    } catch {
      setAlerts(previous);
      showToast('Failed to delete alert', 'error');
    }
  };

  const activeAlerts = alerts.filter((a) => a.is_active && !a.triggered_at);
  const triggeredAlerts = alerts.filter((a) => a.triggered_at !== null);
  const inactiveAlerts = alerts.filter((a) => !a.is_active && !a.triggered_at);
  const activeCount = alerts.filter((a) => a.is_active).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <SpinningRecord size="w-40 h-40" />
        <p className="font-label text-[10px] tracking-widest mt-8 text-th-text3 uppercase">
          Loading price alerts...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-[#dd6e42]" />
          <h2 className="text-2xl font-bold text-th-text tracking-tight font-display">Price Alerts</h2>
          {activeCount > 0 && (
            <span className="bg-[#dd6e42]/20 text-[#dd6e42] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center px-6">
          <BellOff className="w-16 h-16 text-th-text3/30 mb-6" />
          <h3 className="text-xl font-bold text-th-text mb-2">No price alerts set</h3>
          <p className="text-th-text3 text-sm max-w-md">
            Add alerts from your wantlist to get notified when records drop to your target price.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active alerts */}
          {activeAlerts.length > 0 && (
            <section className="space-y-3">
              {activeAlerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  isToggling={togglingIds.has(alert.id)}
                  isConfirmingDelete={confirmDeleteId === alert.id}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </section>
          )}

          {/* Triggered alerts */}
          {triggeredAlerts.length > 0 && (
            <section>
              <h3 className="text-th-text3 text-xs font-label tracking-widest uppercase mb-3 flex items-center gap-2">
                <BellRing className="w-3.5 h-3.5 text-green-500" />
                Triggered
              </h3>
              <div className="space-y-3 opacity-60">
                {triggeredAlerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    isToggling={togglingIds.has(alert.id)}
                    isConfirmingDelete={confirmDeleteId === alert.id}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    showReactivate
                  />
                ))}
              </div>
            </section>
          )}

          {/* Inactive (paused) alerts */}
          {inactiveAlerts.length > 0 && (
            <section>
              <h3 className="text-th-text3 text-xs font-label tracking-widest uppercase mb-3">
                Paused
              </h3>
              <div className="space-y-3 opacity-60">
                {inactiveAlerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    isToggling={togglingIds.has(alert.id)}
                    isConfirmingDelete={confirmDeleteId === alert.id}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

// ── Alert Row ────────────────────────────────────────────────────────

interface AlertRowProps {
  alert: PriceAlert;
  isToggling: boolean;
  isConfirmingDelete: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  showReactivate?: boolean;
}

const AlertRow: React.FC<AlertRowProps> = ({
  alert,
  isToggling,
  isConfirmingDelete,
  onToggle,
  onDelete,
  showReactivate,
}) => {
  return (
    <div className="glass-morphism rounded-xl p-4 border border-th-surface/[0.06] flex items-center gap-4">
      {/* Cover */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-th-bg/40 flex-shrink-0">
        {alert.cover_url ? (
          <img
            src={proxyImageUrl(alert.cover_url)}
            alt={`Cover for ${alert.title}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`${alert.cover_url ? 'hidden' : ''} w-full h-full flex items-center justify-center`}>
          <Disc3 className="w-5 h-5 text-th-text3/30" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-th-text font-medium text-sm truncate">
          {alert.artist} — {alert.title}
        </p>
        <p className="text-th-text3 text-xs mt-0.5">
          Alert when &le; ${alert.target_price} &bull; Condition: {alert.condition_minimum} or better
        </p>
        <div className="flex items-center gap-2 mt-1">
          {alert.triggered_at && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              Triggered {formatRelativeDate(alert.triggered_at)}
            </span>
          )}
          {alert.last_checked_at && (
            <span className="text-th-text3/60 text-[10px]">
              Last checked {formatRelativeDate(alert.last_checked_at)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {showReactivate ? (
          <button
            onClick={() => onToggle(alert.id)}
            disabled={isToggling}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#dd6e42] hover:bg-[#c45a30] text-th-text transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isToggling ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Re-activate
          </button>
        ) : (
          <button
            onClick={() => onToggle(alert.id)}
            disabled={isToggling}
            className="relative w-10 h-5 rounded-full transition-all border border-th-surface/[0.10] focus-visible:ring-2 focus-visible:ring-[#dd6e42] disabled:opacity-50"
            style={{ background: alert.is_active ? '#dd6e42' : 'rgba(255,255,255,0.04)' }}
            role="switch"
            aria-checked={alert.is_active}
            aria-label={alert.is_active ? 'Pause alert' : 'Activate alert'}
          >
            {isToggling ? (
              <Loader2 className="w-3 h-3 animate-spin absolute top-1 left-1/2 -translate-x-1/2 text-th-text" />
            ) : (
              <div
                className={`absolute top-0.5 w-3.5 h-3.5 bg-th-text rounded-full transition-all ${
                  alert.is_active ? 'left-[22px]' : 'left-1'
                }`}
              />
            )}
          </button>
        )}

        <button
          onClick={() => onDelete(alert.id)}
          className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
            isConfirmingDelete
              ? 'bg-red-500/20 text-red-400'
              : 'text-th-text3 hover:text-red-400 hover:bg-th-surface/[0.08]'
          }`}
          aria-label={isConfirmingDelete ? 'Confirm delete' : 'Delete alert'}
          title={isConfirmingDelete ? 'Click again to confirm' : 'Delete alert'}
        >
          {isConfirmingDelete ? (
            <span className="text-[10px] font-bold uppercase tracking-wider">Sure?</span>
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default PriceAlertsView;
