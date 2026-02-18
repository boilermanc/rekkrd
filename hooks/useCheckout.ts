import { useState, useCallback } from 'react';
import { supabase } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';

export function useCheckout() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const checkout = useCallback(async (priceId: string) => {
    setIsLoading(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) {
        showToast('Please sign in to subscribe.', 'error');
        return;
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Checkout failed');
      }

      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  return { checkout, isLoading };
}
