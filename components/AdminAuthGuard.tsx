import React, { useEffect, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { isAdmin } from '../services/profileService';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuthContext();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setChecking(false);
      setAuthorized(false);
      return;
    }

    isAdmin(user.id).then((result) => {
      setAuthorized(result);
      setChecking(false);
    });
  }, [user, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="admin-root flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[rgb(99,102,241)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={{ color: 'rgb(107,114,128)' }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user || !authorized) {
    return (
      <div className="admin-root flex items-center justify-center min-h-screen">
        <div className="text-center max-w-sm px-6">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'rgb(17,24,39)' }}>Access Denied</h2>
          <p className="text-sm mb-6" style={{ color: 'rgb(107,114,128)' }}>You don't have permission to access the admin panel.</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[rgb(99,102,241)] text-white text-sm font-medium rounded-lg hover:bg-[rgb(79,70,229)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Rekkrd
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminAuthGuard;
