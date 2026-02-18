import React, { useState, useCallback } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { supabase } from '../services/supabaseService';

const SESSION_KEY = 'rekkrd-banner-dismissed';

interface SubscriptionBannerProps {
  onUpgrade: () => void;
}

/** Returns days until a date, or -1 if date is in the past / null. */
function daysUntil(dateStr: string | null): number {
  if (!dateStr) return -1;
  const ms = new Date(dateStr).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}

const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ onUpgrade }) => {
  const { status, plan, isTrialing, trialDaysLeft, periodEnd, hasStripeCustomer } = useSubscription();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = useCallback(async () => {
    setPortalLoading(true);
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
      const response = await fetch('/api/customer-portal', { method: 'POST', headers });
      if (!response.ok) throw new Error('Portal failed');
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (e) {
      console.error('Customer portal error:', e);
    } finally {
      setPortalLoading(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem(SESSION_KEY, '1');
  }, []);

  const days = daysUntil(periodEnd);

  // --- Priority 1: Payment failed (non-dismissable) ---
  if (status === 'past_due') {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-center gap-2 bg-amber-500/15 border-b border-amber-500/25 px-4 py-2.5 text-sm animate-in slide-in-from-top duration-300"
      >
        <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span className="text-amber-200 text-xs font-medium">
          Your payment failed. Please update your payment method to avoid losing access to premium features.
        </span>
        <button
          onClick={openPortal}
          disabled={portalLoading}
          className="rounded-lg bg-amber-500 px-3 py-1 text-[10px] font-label tracking-widest uppercase font-bold text-white hover:bg-amber-600 transition-all disabled:opacity-50"
        >
          {portalLoading ? 'Loading\u2026' : 'Update Payment'}
        </button>
      </div>
    );
  }

  // --- Priority 2: Subscription canceled but still active ---
  if (status === 'canceled' && days > 0) {
    const endDate = periodEnd ? new Date(periodEnd).toLocaleDateString() : '';
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-center gap-2 bg-th-surface/[0.06] border-b border-th-surface/[0.10] px-4 py-2.5 text-sm animate-in slide-in-from-top duration-300"
      >
        <span className="text-th-text2 text-xs">
          Your subscription is canceled. You'll have access to <strong className="capitalize">{plan}</strong> features until <strong>{endDate}</strong>.
        </span>
        <button
          onClick={onUpgrade}
          className="rounded-lg bg-[#dd6e42] px-3 py-1 text-[10px] font-label tracking-widest uppercase font-bold text-white hover:bg-[#c45a30] transition-all"
        >
          Resubscribe
        </button>
        <button
          onClick={dismiss}
          className="ml-1 text-th-text3/50 hover:text-th-text3 transition-colors"
          aria-label="Dismiss banner"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  // --- Priority 3: Trial ending soon (within 3 days) ---
  if (isTrialing && trialDaysLeft >= 0 && trialDaysLeft <= 3 && !dismissed) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-center gap-2 bg-[#dd6e42]/10 border-b border-[#dd6e42]/20 px-4 py-2.5 text-sm animate-in slide-in-from-top duration-300"
      >
        <span className="text-th-text2 text-xs">
          Your free trial ends in <strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</strong>.{' '}
          {hasStripeCustomer
            ? <>Add a payment method to keep your <strong className="capitalize">{plan}</strong> features.</>
            : <>Upgrade to keep your <strong className="capitalize">{plan}</strong> features.</>
          }
        </span>
        {hasStripeCustomer ? (
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="rounded-lg bg-[#dd6e42] px-3 py-1 text-[10px] font-label tracking-widest uppercase font-bold text-white hover:bg-[#c45a30] transition-all disabled:opacity-50"
          >
            {portalLoading ? 'Loading\u2026' : 'Add Payment Method'}
          </button>
        ) : (
          <button
            onClick={onUpgrade}
            className="rounded-lg bg-[#dd6e42] px-3 py-1 text-[10px] font-label tracking-widest uppercase font-bold text-white hover:bg-[#c45a30] transition-all"
          >
            Upgrade Now
          </button>
        )}
        <button
          onClick={dismiss}
          className="ml-1 text-th-text3/50 hover:text-th-text3 transition-colors"
          aria-label="Dismiss banner"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return null;
};

export default SubscriptionBanner;
