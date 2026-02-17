import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthContext } from './AuthContext';
import { getSubscription, Plan, SubscriptionStatus, Subscription } from '../services/subscriptionService';

type GatedFeature = 'playlist' | 'lyrics' | 'covers' | 'scan';

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
}

const SCAN_LIMIT_FREE = 10;
const ALBUM_LIMIT_FREE = 100;

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    try {
      const sub = await getSubscription(user.id);
      setSubscription(sub);
    } catch (e) {
      console.error('Failed to fetch subscription:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
    // playlist, lyrics, covers require Curator+
    return isPaidTier;
  }, [isActive, isPaidTier, subscription?.ai_scans_used]);

  const scansRemaining = isPaidTier
    ? null
    : Math.max(0, SCAN_LIMIT_FREE - (subscription?.ai_scans_used ?? 0));

  const albumLimitReached = useCallback((albumCount: number) => {
    if (isPaidTier) return false;
    return albumCount >= ALBUM_LIMIT_FREE;
  }, [isPaidTier]);

  return (
    <SubscriptionContext.Provider value={{
      subscription, loading, plan, status, isTrialing,
      trialDaysLeft, canUse, scansRemaining, albumLimitReached, refresh,
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
