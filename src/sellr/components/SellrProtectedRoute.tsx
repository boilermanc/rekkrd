import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSellrAuth } from '../hooks/useSellrAuth';

export function SellrProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSellrAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sellr-blue border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={`/sellr/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
