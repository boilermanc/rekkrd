import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import SellrLayout from '../components/SellrLayout';
import { useSellrMeta } from '../hooks/useSellrMeta';
import { useSellrAuth } from '../hooks/useSellrAuth';
import { supabase } from '../../../services/supabaseService';

// ── Types ─────────────────────────────────────────────────────────────

interface OrderRow {
  id: string;
  tier: string;
  amount_cents: number;
  status: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtAmount(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function tierLabel(tier: string): string {
  const map: Record<string, string> = {
    starter: 'Starter',
    standard: 'Standard',
    full: 'Full Collection',
  };
  return map[tier] ?? tier;
}

function statusBadge(status: string) {
  const base = 'inline-block px-2 py-0.5 text-xs font-medium rounded-full';
  switch (status) {
    case 'complete':
    case 'paid':
      return <span className={`${base} bg-sellr-sage/20 text-sellr-sage`}>Paid</span>;
    case 'pending':
      return <span className={`${base} bg-sellr-amber/20 text-sellr-amber`}>Pending</span>;
    case 'failed':
      return <span className={`${base} bg-red-100 text-red-600`}>Failed</span>;
    default:
      return <span className={`${base} bg-sellr-charcoal/10 text-sellr-charcoal/60`}>{status}</span>;
  }
}

// ── AccountPage ───────────────────────────────────────────────────────

const AccountPage: React.FC = () => {
  useSellrMeta({
    title: 'Account',
    description: 'Manage your Sellr account settings.',
  });

  const { user, signOut } = useSellrAuth();
  const navigate = useNavigate();

  // ── Password form state ──
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // ── Orders state ──
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // ── Delete state ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Fetch orders ──
  useEffect(() => {
    let cancelled = false;

    async function fetchOrders() {
      try {
        const session = await supabase?.auth.getSession();
        const token = session?.data?.session?.access_token;
        if (!token) return;

        const res = await fetch('/api/sellr/account/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setOrders(data.orders ?? []);
      } catch {
        // Non-critical — empty state handles it
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    }

    fetchOrders();
    return () => { cancelled = true; };
  }, []);

  // ── Password submit ──
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (!newPassword || newPassword.length < 6) {
      setPwError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }

    setPwLoading(true);
    try {
      const { error } = await supabase!.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPwLoading(false);
    }
  };

  // ── Delete account ──
  const handleDelete = async () => {
    setDeleteError(null);
    setDeleteLoading(true);

    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/sellr/account/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      await signOut();
      navigate('/sellr');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleteLoading(false);
    }
  };

  return (
    <SellrLayout>
      <div className="max-w-2xl mx-auto py-8 space-y-8">

        {/* ── Section 1: Account Details ──────────────────────── */}
        <div className="bg-sellr-surface rounded-xl p-6">
          <h1 className="font-display text-2xl text-sellr-charcoal mb-6">Account</h1>

          {/* Email */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-sellr-charcoal/50 uppercase tracking-wide mb-1">
              Email
            </label>
            <p className="text-sm text-sellr-charcoal">{user?.email ?? '—'}</p>
            <p className="text-xs text-sellr-charcoal/40 mt-1">
              Contact support to change your email
            </p>
          </div>

          {/* Change password */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <h2 className="text-sm font-medium text-sellr-charcoal/70">Change Password</h2>

            <div>
              <label htmlFor="new-password" className="block text-xs text-sellr-charcoal/50 mb-1">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-white border border-sellr-charcoal/10 rounded-lg p-3 text-sm text-sellr-charcoal placeholder:text-sellr-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sellr-blue transition-colors"
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-xs text-sellr-charcoal/50 mb-1">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-white border border-sellr-charcoal/10 rounded-lg p-3 text-sm text-sellr-charcoal placeholder:text-sellr-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sellr-blue transition-colors"
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>

            {pwError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {pwError}
              </p>
            )}

            {pwSuccess && (
              <p className="text-sm text-sellr-sage flex items-center gap-1.5">
                <Check className="w-4 h-4 flex-shrink-0" />
                Password updated successfully
              </p>
            )}

            <button
              type="submit"
              disabled={pwLoading || !newPassword}
              className="px-5 py-2.5 bg-sellr-amber text-white text-sm font-medium rounded hover:bg-sellr-amber-light transition-colors disabled:opacity-50"
            >
              {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </button>
          </form>
        </div>

        {/* ── Section 2: Purchase History ─────────────────────── */}
        <div className="bg-sellr-surface rounded-xl p-6">
          <h2 className="font-display text-xl text-sellr-charcoal mb-4">Purchase History</h2>

          {ordersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-sellr-blue animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-sellr-charcoal/40 py-4">No purchases yet</p>
          ) : (
            <div className="space-y-2">
              {orders.map(order => (
                <div
                  key={order.id}
                  className="flex items-center justify-between bg-white/60 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-sellr-charcoal/50 whitespace-nowrap">
                      {fmtDate(order.created_at)}
                    </span>
                    <span className="text-sm font-medium text-sellr-charcoal truncate">
                      {tierLabel(order.tier)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm text-sellr-charcoal/70">
                      {fmtAmount(order.amount_cents)}
                    </span>
                    {statusBadge(order.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 3: Danger Zone ──────────────────────────── */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="font-display text-xl text-red-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-sellr-charcoal/60 mb-4">
            Permanently delete your account and all appraisal data.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 border border-red-300 text-red-600 text-sm font-medium rounded hover:bg-red-100 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* ── Delete confirmation modal ───────────────────────── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Delete account confirmation"
        >
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="font-display text-xl text-red-600 mb-3">Delete your account?</h3>
            <p className="text-sm text-sellr-charcoal/70 mb-4">
              This will permanently delete your account and all appraisal data. This cannot be undone.
            </p>
            <label htmlFor="delete-confirm" className="block text-xs text-sellr-charcoal/50 mb-1">
              Type <strong>DELETE</strong> to confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              className="w-full bg-white border border-sellr-charcoal/10 rounded-lg p-3 text-sm text-sellr-charcoal focus:outline-none focus:ring-2 focus:ring-red-300 mb-4"
              autoComplete="off"
            />

            {deleteError && (
              <p className="text-sm text-red-600 mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {deleteError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); setDeleteError(null); }}
                className="flex-1 px-4 py-2.5 border border-sellr-charcoal/20 text-sm text-sellr-charcoal rounded hover:bg-sellr-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== 'DELETE' || deleteLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SellrLayout>
  );
};

export default AccountPage;
