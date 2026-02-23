import React, { useState, useEffect, useCallback } from 'react';
import { RotateCw, Clock, Play, Loader2 } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────

interface JobRunResult {
  success: boolean;
  processed: number;
  error?: string;
}

interface JobHistory {
  lastRun: string | null;
  lastResult: JobRunResult | null;
  runCount: number;
  errorCount: number;
}

interface CronStatus {
  status: string;
  uptime: number;
  jobs: Record<string, JobHistory>;
  server: {
    node_version: string;
    memory_mb: number;
    env: string;
  };
}

interface AdminHealthProps {
  authToken: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function fmtRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

const JOB_LABELS: Record<string, string> = {
  abandoned_sessions: 'Abandoned Session Emails',
  expire_sessions: 'Expire Old Sessions',
  rekkrd_conversion: 'Rekkrd Conversion Emails',
};

// ── Component ────────────────────────────────────────────────────────

const AdminHealth: React.FC<AdminHealthProps> = ({ authToken }) => {
  const [data, setData] = useState<CronStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggerBusy, setTriggerBusy] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<Record<string, { success: boolean; message: string }>>({});

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sellr/admin/cron-status', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: CronStatus = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleTrigger = async (jobName: string) => {
    setTriggerBusy(jobName);
    setTriggerResult(prev => {
      const next = { ...prev };
      delete next[jobName];
      return next;
    });
    try {
      const res = await fetch(`/api/sellr/admin/cron/run/${jobName}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      setTriggerResult(prev => ({
        ...prev,
        [jobName]: { success: json.success, message: json.message ?? (json.success ? 'Done' : 'Failed') },
      }));
      // Refresh status after trigger
      fetchStatus();
    } catch (err) {
      setTriggerResult(prev => ({
        ...prev,
        [jobName]: { success: false, message: err instanceof Error ? err.message : 'Request failed' },
      }));
    } finally {
      setTriggerBusy(null);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-400 text-sm">Loading health status...</div>;
  }
  if (error) {
    return <div className="py-8 text-center text-red-500 text-sm">{error}</div>;
  }
  if (!data) return null;

  const jobEntries = Object.entries(data.jobs) as [string, JobHistory][];

  return (
    <div className="space-y-8">
      {/* ── Server health bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-medium text-green-700">{data.status === 'running' ? 'Running' : 'Error'}</span>
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-600">
          Uptime <span className="font-medium">{fmtUptime(data.uptime)}</span>
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-600">
          Memory <span className="font-medium">{data.server.memory_mb} MB</span>
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-600">
          Node <span className="font-medium">{data.server.node_version}</span>
        </span>
        <button
          onClick={fetchStatus}
          className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RotateCw size={16} />
        </button>
      </div>

      {/* ── Cron jobs section ──────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Scheduled Jobs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {jobEntries.map(([name, job]) => {
            const label = JOB_LABELS[name] ?? name;
            const hasRun = job.lastRun !== null;
            const lastSuccess = hasRun && job.lastResult?.success;
            const lastError = hasRun && job.lastResult && !job.lastResult.success;

            return (
              <div key={name} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-gray-400" />
                  <h4 className="text-sm font-semibold text-gray-800">{label}</h4>
                </div>

                {/* Status dot */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      lastSuccess ? 'bg-green-500' : lastError ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  />
                  <span className="text-xs text-gray-500">
                    {lastSuccess ? 'Last run succeeded' : lastError ? 'Last run failed' : 'Never run'}
                  </span>
                </div>

                {/* Stats */}
                <p className="text-xs text-gray-500 mb-1">
                  Run {job.runCount} time{job.runCount !== 1 ? 's' : ''} &middot; {job.errorCount} error{job.errorCount !== 1 ? 's' : ''}
                </p>

                {/* Last run */}
                <p className="text-xs text-gray-500 mb-1">
                  Last run: {job.lastRun ? fmtRelativeTime(job.lastRun) : 'Never'}
                </p>

                {/* Last result */}
                {job.lastResult && (
                  <div className="mt-1">
                    {job.lastResult.processed > 0 && (
                      <p className="text-xs text-gray-600">
                        Processed {job.lastResult.processed} {name === 'expire_sessions' ? 'session' : 'email'}{job.lastResult.processed !== 1 ? 's' : ''}.
                      </p>
                    )}
                    {job.lastResult.error && (
                      <p className="text-xs text-red-500 font-mono truncate mt-0.5" title={job.lastResult.error}>
                        {job.lastResult.error.slice(0, 100)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Manual triggers section ────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Manual Triggers</h3>
        <div className="flex flex-wrap gap-3">
          {jobEntries.map(([name]) => {
            const isBusy = triggerBusy === name;
            const result = triggerResult[name];
            const btnLabels: Record<string, string> = {
              abandoned_sessions: 'Run Abandoned Check Now',
              expire_sessions: 'Run Expire Now',
              rekkrd_conversion: 'Run Conversion Check Now',
            };

            return (
              <div key={name}>
                <button
                  onClick={() => handleTrigger(name)}
                  disabled={triggerBusy !== null}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  {btnLabels[name] ?? name}
                </button>
                {result && (
                  <p className={`mt-1 text-xs ${result.success ? 'text-green-600' : 'text-red-500'}`}>
                    {result.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default AdminHealth;
