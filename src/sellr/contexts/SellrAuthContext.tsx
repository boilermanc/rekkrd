import React, { createContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../../services/supabaseService';

export interface SellrAuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const SellrAuthContext = createContext<SellrAuthContextValue | null>(null);

export const SellrAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Load initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <SellrAuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </SellrAuthContext.Provider>
  );
};
