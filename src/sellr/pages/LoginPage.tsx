import React, { useState, useCallback, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../services/supabaseService';
import SellrLayout from '../components/SellrLayout';
import { useSellrMeta } from '../hooks/useSellrMeta';
import Turnstile from '../../../components/Turnstile';

const LoginPage: React.FC = () => {
  useSellrMeta({
    title: 'Sign In',
    description: 'Sign in to your Sellr account.',
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), []);
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), []);

  const handleGoogleSignIn = async () => {
    if (!supabase) return;
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/sellr/dashboard' },
    });
    if (error) setError(error.message);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError('Database connection is not available. Please try again later.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    if (!turnstileToken) {
      setError('Please complete the verification challenge.');
      return;
    }

    setLoading(true);

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

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      // Determine best post-login destination
      const token = signInData.session?.access_token;
      if (token) {
        try {
          const res = await fetch('/api/sellr/dashboard', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const dashboard = await res.json();
            const activeSessions = (dashboard.sessions ?? []).filter(
              (s: { status: string }) => s.status === 'active',
            );
            if (activeSessions.length > 0) {
              navigate(`/sellr/scan?session=${activeSessions[0].id}`, { replace: true });
              return;
            }
          }
        } catch {
          // Dashboard fetch failed — fall through to default redirect
        }
      }

      const redirect = searchParams.get('redirect');
      navigate(redirect || '/sellr/dashboard', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SellrLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-sellr-surface rounded-xl p-8 shadow-md">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="font-display text-[28px] text-sellr-blue">Sellr</h1>
              <p className="mt-1 text-sm text-sellr-charcoal/60">Welcome back</p>
            </div>

            {/* Error message */}
            <div aria-live="polite" className="min-h-[1.5rem] mb-4">
              {error && (
                <p className="text-red-600 text-sm text-center" role="alert">
                  {error}
                </p>
              )}
            </div>

            {/* Google sign-in */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full min-h-[48px] bg-white border border-sellr-charcoal/10 rounded-lg font-medium text-sm text-sellr-charcoal flex items-center justify-center gap-3 hover:border-sellr-blue/30 hover:shadow-sm transition-all"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-4 text-sellr-charcoal/40 text-sm">
              <div className="flex-1 h-px bg-sellr-charcoal/10" />
              <span>or</span>
              <div className="flex-1 h-px bg-sellr-charcoal/10" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} role="form" aria-label="Sign in to Sellr">
              <div className="space-y-4">
                <div>
                  <label htmlFor="sellr-login-email" className="block text-sm font-medium text-sellr-charcoal mb-1.5">
                    Email
                  </label>
                  <input
                    id="sellr-login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white border border-sellr-charcoal/10 rounded-lg p-3 text-sm text-sellr-charcoal placeholder:text-sellr-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sellr-blue transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="sellr-login-password" className="block text-sm font-medium text-sellr-charcoal mb-1.5">
                    Password
                  </label>
                  <input
                    id="sellr-login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white border border-sellr-charcoal/10 rounded-lg p-3 text-sm text-sellr-charcoal placeholder:text-sellr-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sellr-blue transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Turnstile
                onVerify={handleTurnstileVerify}
                onExpire={handleTurnstileExpire}
                resetKey="sellr-login"
                theme="light"
              />

              <button
                type="submit"
                disabled={loading || !turnstileToken}
                className="w-full mt-6 min-h-[48px] bg-sellr-amber text-sellr-charcoal font-medium rounded-lg transition-colors hover:bg-sellr-amber-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Footer links */}
            <div className="mt-6 text-center space-y-2 text-sm">
              <p className="text-sellr-charcoal/60">
                Don&apos;t have an account?{' '}
                <Link to="/sellr/signup" className="text-sellr-blue hover:text-sellr-blue-light transition-colors underline underline-offset-2">
                  Sign up
                </Link>
              </p>
              <p>
                <Link to="/sellr" className="text-sellr-charcoal/50 hover:text-sellr-blue transition-colors">
                  Back to Sellr
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </SellrLayout>
  );
};

export default LoginPage;
