import { useContext } from 'react';
import { SellrAuthContext, SellrAuthContextValue } from '../contexts/SellrAuthContext';

export function useSellrAuth(): SellrAuthContextValue {
  const ctx = useContext(SellrAuthContext);
  if (!ctx) throw new Error('useSellrAuth must be used within SellrAuthProvider');
  return ctx;
}
