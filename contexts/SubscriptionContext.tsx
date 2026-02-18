import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthContext } from './AuthContext';
import { getSubscription, getGearCount, Plan, SubscriptionStatus, Subscription } from '../services/subscriptionService';
import { useSubscriptionApi } from '../hooks/useSubscription';

type GatedFeature = 'playlist' | 'lyrics' | 'covers' | 'scan' | 'manual_finder' | 'setup_guide';

const SCAN_LIMIT_FREE = 10;
const ALBUM_LIMIT_FREE = 100;
const GEAR_LIMIT_FREE = 3;

interface SubscriptionContextValue {
  subscription: Subscription | null;
  loading: boolean;
  plan: Plan;
  status: SubscriptionStatus;
  isTrialing: boolean;
  trialDaysLeft: number;
  canUse: (feature: GatedFeature) => boolean;
  scansRemaining: number | null; // null = unlimited
  albumLimitReached: (albumCount: number) => boolean;
  refresh: () => Promise<void>;
  // New fields for plan badge & usage meters
  periodEnd: string | null;
  scansUsed: number;
  scansLimit: number;     // -1 = unlimited
  albumLimit: number;     // -1 = unlimited
  gearCount: number;
  gearLimit: number;      // -1 = unlimited
  gearLimitReached: boolean;
  hasStripeCustomer: boolean;
  isPastDue: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [gearCount, setGearCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Also fetch enriched data from the API endpoint
  const apiData = useSubscriptionApi();

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setGearCount(0);
      setLoading(false);
      return;
    }
    try {
      const [sub, gc] = await Promise.all([
        getSubscription(user.id),
        getGearCount(),
      ]);
      setSubscription(sub);
      setGearCount(gc);
      // Also refresh the API data
      await apiData.refresh();
    } catch (e) {
      console.error('Failed to fetch subscription:', e);
    } finally {
      setLoading(false);
    }
  }, [user, apiData.refresh]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const plan: Plan = subscription?.plan ?? 'collector';
  const status: SubscriptionStatus = subscription?.status ?? 'active';
  const isTrialing = status === 'trialing';

  const trialDaysLeft = subscription?.trial_end
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / 86400000))
    : 0;

  const isActive = ['active', 'trialing'].includes(status);
  const isPaidTier = plan === 'curator' || plan === 'enthusiast';

  const canUse = useCallback((feature: GatedFeature) => {
    if (!isActive) return false;
    if (feature === 'scan') {
      if (isPaidTier) return true;
      return (subscription?.ai_scans_used ?? 0) < SCAN_LIMIT_FREE;
    }
    // playlist, lyrics, covers, manual_finder, setup_guide require Curator+
    return isPaidTier;
  }, [isActive, isPaidTier, subscription?.ai_scans_used]);

  const scansRemaining = isPaidTier
    ? null
    : Math.max(0, SCAN_LIMIT_FREE - (subscription?.ai_scans_used ?? 0));

  const albumLimitReached = useCallback((albumCount: number) => {
    if (isPaidTier) return false;
    return albumCount >= ALBUM_LIMIT_FREE;
  }, [isPaidTier]);

  // Derived values for plan badge & usage meters
  const periodEnd = apiData.periodEnd ?? subscription?.current_period_end ?? null;
  const scansUsed = subscription?.ai_scans_used ?? 0;
  const scansLimit = isPaidTier ? -1 : SCAN_LIMIT_FREE;
  const albumLimit = isPaidTier ? -1 : ALBUM_LIMIT_FREE;
  const gearLimit = isPaidTier ? -1 : GEAR_LIMIT_FREE;
  const gearLimitReached = !isPaidTier && gearCount >= GEAR_LIMIT_FREE;
  const hasStripeCustomer = !!subscription?.stripe_customer_id;
  const isPastDue = status === 'past_due';

  return (
    <SubscriptionContext.Provider value={{
      subscription, loading, plan, status, isTrialing,
      trialDaysLeft, canUse, scansRemaining, albumLimitReached, refresh,
      periodEnd, scansUsed, scansLimit, albumLimit,
      gearCount, gearLimit, gearLimitReached,
      hasStripeCustomer, isPastDue,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
};
