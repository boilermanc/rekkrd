import React, { useState, useCallback, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabaseService';
import SellrLayout from '../components/SellrLayout';
import { useSellrMeta } from '../hooks/useSellrMeta';
import Turnstile from '../../../components/Turnstile';

const SignupPage: React.FC = () => {
  useSellrMeta({
    title: 'Create Account',
    description: 'Create a Sellr account to manage your appraisals.',
  });

  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (password !== confirmPassword) {
      setError('Passwords don\u2019t match.');
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

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) throw signUpError;

      // Immediately sign in since no email confirmation is required
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      // New users with no slots go to onboarding to pick a plan
      const token = signInData.session?.access_token;
      if (token) {
        try {
          const res = await fetch('/api/sellr/dashboard', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const dashboard = await res.json();
            if (dashboard.slots?.slots_purchased === 0) {
              navigate('/sellr/start', { replace: true });
              return;
            }
          }
        } catch {
          // Dashboard fetch failed — fall through to default
        }
      }

      navigate('/sellr/dashboard', { replace: true });
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
              <p className="mt-1 text-sm text-sellr-charcoal/60">Create your account</p>
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
            <form onSubmit={handleSubmit} role="form" aria-label="Create a Sellr account">
              <div className="space-y-4">
                <div>
                  <label htmlFor="sellr-signup-email" className="block text-sm font-medium text-sellr-charcoal mb-1.5">
                    Email
                  </label>
                  <input
                    id="sellr-signup-email"
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
                  <label htmlFor="sellr-signup-password" className="block text-sm font-medium text-sellr-charcoal mb-1.5">
                    Password
                  </label>
                  <input
                    id="sellr-signup-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white border border-sellr-charcoal/10 rounded-lg p-3 text-sm text-sellr-charcoal placeholder:text-sellr-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sellr-blue transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label htmlFor="sellr-signup-confirm-password" className="block text-sm font-medium text-sellr-charcoal mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    id="sellr-signup-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-white border border-sellr-charcoal/10 rounded-lg p-3 text-sm text-sellr-charcoal placeholder:text-sellr-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sellr-blue transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Turnstile
                onVerify={handleTurnstileVerify}
                onExpire={handleTurnstileExpire}
                resetKey="sellr-signup"
                theme="light"
              />

              <button
                type="submit"
                disabled={loading || !turnstileToken}
                className="w-full mt-6 min-h-[48px] bg-sellr-amber text-sellr-charcoal font-medium rounded-lg transition-colors hover:bg-sellr-amber-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            {/* Footer links */}
            <div className="mt-6 text-center space-y-2 text-sm">
              <p className="text-sellr-charcoal/60">
                Already have an account?{' '}
                <Link to="/sellr/login" className="text-sellr-blue hover:text-sellr-blue-light transition-colors underline underline-offset-2">
                  Sign in
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

export default SignupPage;
