import React, { useState, FormEvent } from 'react';
import { supabase } from '../services/supabaseService';

type AuthMode = 'signin' | 'signup';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setMode(m => (m === 'signin' ? 'signup' : 'signin'));
    setError(null);
    setConfirmPassword('');
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

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords don\u2019t match.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;

        // Immediately sign in since no email confirmation is required
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <h1 className="font-label text-th-text text-3xl md:text-4xl font-bold tracking-widest text-center mb-10">
          REKK<span className="text-[#c45a30]">R</span>D
        </h1>

        {/* Form card */}
        <div className="glass-morphism rounded-2xl p-6 md:p-8">
          {/* Mode toggle */}
          <div className="flex mb-6 rounded-lg overflow-hidden border border-th-surface/[0.10]">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setConfirmPassword(''); }}
              className={`flex-1 py-2 text-sm font-medium tracking-wide transition-colors ${
                mode === 'signin'
                  ? 'bg-[#c45a30] text-th-text'
                  : 'bg-th-surface/[0.04] text-th-text3 hover:text-th-text2'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium tracking-wide transition-colors ${
                mode === 'signup'
                  ? 'bg-[#c45a30] text-th-text'
                  : 'bg-th-surface/[0.04] text-th-text3 hover:text-th-text2'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error message */}
          <div aria-live="polite" className="min-h-[1.5rem] mb-4">
            {error && (
              <p className="text-red-400 text-sm text-center" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} role="form" aria-label={mode === 'signin' ? 'Sign in' : 'Create account'}>
            <div className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="block text-xs text-th-text2 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-3 py-2.5 text-th-text placeholder-th-text3 text-sm focus:outline-none focus:border-[#dd6e42] focus:ring-1 focus:ring-[#dd6e42] transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs text-th-text2 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-3 py-2.5 text-th-text placeholder-th-text3 text-sm focus:outline-none focus:border-[#dd6e42] focus:ring-1 focus:ring-[#dd6e42] transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-confirm-password" className="block text-xs text-th-text2 mb-1.5 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-3 py-2.5 text-th-text placeholder-th-text3 text-sm focus:outline-none focus:border-[#dd6e42] focus:ring-1 focus:ring-[#dd6e42] transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-2.5 rounded-lg bg-[#c45a30] hover:bg-[#dd6e42] text-th-text font-medium text-sm tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-th-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading…
                </>
              ) : mode === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Toggle prompt */}
          <p className="mt-6 text-center text-xs text-th-text3">
            {mode === 'signin' ? "Don\u2019t have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-[#f0a882] hover:text-[#dd6e42] transition-colors underline underline-offset-2"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
