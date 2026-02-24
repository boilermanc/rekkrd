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
