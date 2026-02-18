import React, { useState, useRef, useEffect } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { supabase } from '../services/supabaseService';
import type { Plan } from '../services/subscriptionService';

interface PlanBadgeProps {
  albumCount: number;
  onUpgrade: () => void;
}

// --- UsageMeter (internal) ---

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number; // -1 = unlimited
}

const UsageMeter: React.FC<UsageMeterProps> = ({ label, used, limit }) => {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isWarning = !isUnlimited && percentage >= 80;
  const isCritical = !isUnlimited && percentage >= 100;

  const barColor = isCritical
    ? 'bg-red-500'
    : isWarning
      ? 'bg-amber-500'
      : 'bg-[#4f6d7a]';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-label text-[9px] tracking-widest uppercase text-th-text3">{label}</span>
        <span className={`text-[10px] font-bold ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-th-text2'}`}>
          {isUnlimited ? 'Unlimited' : `${used} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 rounded-full bg-th-surface/[0.1] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};

// --- ManageSubscriptionButton (internal) ---

const ManageSubscriptionButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }
      if (!headers['Authorization']) {
        const secret = import.meta.env.VITE_API_SECRET;
        if (secret) headers['Authorization'] = `Bearer ${secret}`;
      }

      const response = await fetch('/api/customer-portal', {
        method: 'POST',
        headers,
      });
      if (!response.ok) throw new Error('Failed to create portal session');
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (e) {
      console.error('Customer portal error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleManage}
      disabled={loading}
      className="w-full rounded-xl border border-th-surface/[0.15] px-4 py-2.5 text-[10px] font-label tracking-widest uppercase text-th-text2 font-bold hover:bg-th-surface/[0.08] transition-all disabled:opacity-50"
    >
      {loading ? 'Loading\u2026' : 'Manage Subscription'}
    </button>
  );
};

// --- Plan badge styles ---

const PLAN_STYLES: Record<Plan, { bg: string; text: string; border: string }> = {
  collector: {
    bg: 'bg-th-surface/[0.08]',
    text: 'text-th-text3',
    border: 'border-th-surface/[0.15]',
  },
  curator: {
    bg: 'bg-[#4f6d7a]/15',
    text: 'text-[#6a8c9a]',
    border: 'border-[#4f6d7a]/25',
  },
  enthusiast: {
    bg: 'bg-[#dd6e42]/10',
    text: 'text-[#f0a882]',
    border: 'border-[#dd6e42]/25',
  },
};

// --- PlanBadge (exported) ---

const PlanBadge: React.FC<PlanBadgeProps> = ({ albumCount, onUpgrade }) => {
  const {
    plan, isTrialing, isPastDue,
    scansUsed, scansLimit, albumLimit,
    gearCount, gearLimit,
    periodEnd, hasStripeCustomer,
  } = useSubscription();

  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isOpen]);

  const styles = PLAN_STYLES[plan];
  const label = `${plan}${isTrialing ? ' Trial' : ''}`;

  return (
    <div ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative px-2.5 py-1 rounded-full text-[8px] font-label tracking-widest uppercase border transition-all hover:brightness-110 cursor-pointer ${styles.bg} ${styles.text} ${styles.border}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {label}
        {isPastDue && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 glass-morphism rounded-2xl border border-th-surface/[0.10] p-4 z-50 animate-in fade-in slide-in-from-top duration-200 shadow-2xl">
          {/* Plan header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-label text-[9px] tracking-widest uppercase text-th-text3">Current Plan</p>
              <p className={`text-sm font-bold capitalize ${styles.text}`}>
                {plan}{isTrialing ? ' (Trial)' : ''}
              </p>
            </div>
            {periodEnd && (
              <p className="text-[9px] text-th-text3">
                {isPastDue ? 'Payment past due' : `Renews ${new Date(periodEnd).toLocaleDateString()}`}
              </p>
            )}
          </div>

          {/* Usage meters */}
          <div className="space-y-3 mb-4">
            <UsageMeter label="AI Scans" used={scansUsed} limit={scansLimit} />
            <UsageMeter label="Albums" used={albumCount} limit={albumLimit} />
            <UsageMeter label="Gear" used={gearCount} limit={gearLimit} />
          </div>

          {/* Action button */}
          {hasStripeCustomer ? (
            <ManageSubscriptionButton />
          ) : (
            <button
              onClick={() => { setIsOpen(false); onUpgrade(); }}
              className="w-full rounded-xl bg-[#dd6e42] px-4 py-2.5 text-[10px] font-label tracking-widest uppercase text-white font-bold hover:bg-[#c45a30] transition-all"
            >
              Upgrade Plan
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PlanBadge;
