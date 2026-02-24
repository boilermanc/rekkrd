import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseService';
import { useSellrAuth } from './useSellrAuth';

interface SellrAccountState {
  slotsUsed: number;
  slotsPurchased: number;
  slotsRemaining: number;
  loading: boolean;
  error: string | null;
}

export function useSellrAccount(): SellrAccountState {
  const { user } = useSellrAuth();
  const [state, setState] = useState<SellrAccountState>({
    slotsUsed: 0,
    slotsPurchased: 0,
    slotsRemaining: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user) {
      setState({ slotsUsed: 0, slotsPurchased: 0, slotsRemaining: 0, loading: false, error: null });
      return;
    }

    let cancelled = false;

    async function fetchSlots() {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const session = await supabase?.auth.getSession();
        const token = session?.data?.session?.access_token;
        if (!token) throw new Error('No auth token');

        const res = await fetch('/api/sellr/account/slots', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!cancelled) {
          setState({
            slotsUsed: data.slots_used,
            slotsPurchased: data.slots_purchased,
            slotsRemaining: data.slots_remaining,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load slots',
          }));
        }
      }
    }

    fetchSlots();
    return () => { cancelled = true; };
  }, [user?.id]);

  return state;
}
