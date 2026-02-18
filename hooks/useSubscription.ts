import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseService';
import { useAuthContext } from '../contexts/AuthContext';

export interface SubscriptionData {
  plan: 'collector' | 'curator' | 'enthusiast';
  status: string;
  periodEnd: string | null;
  scansUsed: number;
  scansLimit: number; // -1 = unlimited
}

const DEFAULTS: SubscriptionData = {
  plan: 'collector',
  status: 'inactive',
  periodEnd: null,
  scansUsed: 0,
  scansLimit: 10,
};

async function fetchFromApi(): Promise<SubscriptionData> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  if (!headers['Authorization']) {
    const secret = import.meta.env.VITE_API_SECRET;
    if (secret) {
      headers['Authorization'] = `Bearer ${secret}`;
    }
  }

  const response = await fetch('/api/subscription', { headers });
  if (!response.ok) throw new Error('Failed to fetch subscription');
  return await response.json();
}

export function useSubscriptionApi() {
  const { user } = useAuthContext();
  const [data, setData] = useState<SubscriptionData>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setData(DEFAULTS);
      setIsLoading(false);
      return;
    }
    try {
      const result = await fetchFromApi();
      setData(result);
    } catch (e) {
      console.error('useSubscription fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setIsLoading(true);
    refresh();
  }, [refresh]);

  return { ...data, isLoading, refresh };
}
