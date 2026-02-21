import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { isAdmin } from '../services/profileService';
import { supabase } from '../services/supabaseService';
import Turnstile from './Turnstile';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuthContext();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), []);
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), []);

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

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!supabase) {
      setLoginError('Database connection is not available.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setLoginError('Email and password are required.');
      return;
    }

    if (!turnstileToken) {
      setLoginError('Please complete the verification challenge.');
      return;
    }

    setLoginLoading(true);
    try {
      // Verify Turnstile token server-side first
      const verifyRes = await fetch('/api/auth/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnstileToken }),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}));
        setTurnstileToken(null);
        throw new Error(data.error || 'Verification failed. Please try again.');
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoginLoading(false);
    }
  };

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

  // Not signed in — show login form
  if (!user) {
    return (
      <div className="admin-root flex items-center justify-center min-h-screen" style={{ background: '#f9fafb' }}>
        <div className="w-full max-w-sm px-6">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(17,24,39)' }}>Admin Sign In</h2>
            <p className="text-sm mt-1" style={{ color: 'rgb(107,114,128)' }}>Sign in to access the admin panel.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <p className="text-red-600 text-sm text-center" role="alert">{loginError}</p>
            )}
            <div>
              <label htmlFor="admin-email" className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(55,65,81)' }}>Email</label>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                style={{ borderColor: 'rgb(209,213,219)', color: 'rgb(17,24,39)' }}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(55,65,81)' }}>Password</label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  style={{ borderColor: 'rgb(209,213,219)', color: 'rgb(17,24,39)' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgb(156,163,175)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgb(107,114,128)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgb(156,163,175)')}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="0.75" opacity="0.5" fill="none" />
                    <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="0.75" opacity="0.4" fill="none" />
                    <circle cx="12" cy="12" r="3.5" fill="currentColor" opacity="0.3" />
                    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                    {showPassword && (
                      <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
            <Turnstile
              onVerify={handleTurnstileVerify}
              onExpire={handleTurnstileExpire}
              theme="light"
            />
            <button
              type="submit"
              disabled={loginLoading || !turnstileToken}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: loginLoading ? 'rgb(129,140,248)' : 'rgb(99,102,241)' }}
            >
              {loginLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-6">
            <a href="/" className="text-sm hover:underline" style={{ color: 'rgb(99,102,241)' }}>Back to Rekkrd</a>
          </div>
        </div>
      </div>
    );
  }

  // Signed in but not admin — access denied
  if (!authorized) {
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
