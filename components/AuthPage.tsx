import React, { useState, useCallback, FormEvent } from 'react';
import { supabase } from '../services/supabaseService';
import Turnstile from './Turnstile';

type AuthMode = 'signin' | 'signup';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), []);
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), []);

  const toggleMode = () => {
    setMode(m => (m === 'signin' ? 'signup' : 'signin'));
    setError(null);
    setConfirmPassword('');
    setTurnstileToken(null);
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

  const PasswordToggle = ({ visible, onClick }: { visible: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
      aria-label={visible ? 'Hide password' : 'Show password'}
      tabIndex={-1}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        {/* Outer rim */}
        <circle cx="12" cy="12" r="10" stroke="#dd6e42" strokeWidth="1.5" fill="none" />
        {/* Grooves */}
        <circle cx="12" cy="12" r="7.5" stroke="#dd6e42" strokeWidth="0.75" opacity="0.5" fill="none" />
        <circle cx="12" cy="12" r="5.5" stroke="#dd6e42" strokeWidth="0.75" opacity="0.4" fill="none" />
        {/* Label area */}
        <circle cx="12" cy="12" r="3.5" fill="#c45a30" opacity="0.4" />
        {/* Spindle hole */}
        <circle cx="12" cy="12" r="1.2" fill="#f0a882" />
        {/* Slash when password is visible (showing "off" state) */}
        {visible && (
          <line x1="4" y1="4" x2="20" y2="20" stroke="#c45a30" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10 gap-3">
          <svg className="w-16 h-16" viewBox="0 0 512 512" fill="none">
            <circle cx="256" cy="256" r="250" fill="#f0a882"/>
            <circle cx="256" cy="256" r="250" fill="none" stroke="#dd6e42" strokeWidth="4" opacity="0.3"/>
            <circle cx="256" cy="256" r="225" fill="none" stroke="#d48a6a" strokeWidth="2" opacity="0.35"/>
            <circle cx="256" cy="256" r="200" fill="none" stroke="#d48a6a" strokeWidth="1.5" opacity="0.3"/>
            <circle cx="256" cy="256" r="175" fill="none" stroke="#d48a6a" strokeWidth="1.5" opacity="0.3"/>
            <circle cx="256" cy="256" r="150" fill="none" stroke="#d48a6a" strokeWidth="1.5" opacity="0.25"/>
            <circle cx="256" cy="256" r="120" fill="#c45a30"/>
            <circle cx="256" cy="256" r="105" fill="none" stroke="#a8481f" strokeWidth="1" opacity="0.3"/>
            <text x="256" y="264" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,'Times New Roman',serif" fontWeight="bold" fontSize="140" fill="#f0a882">R</text>
            <circle cx="256" cy="256" r="12" fill="#f0a882" opacity="0.4"/>
          </svg>
          <h1 className="font-label text-th-text text-3xl md:text-4xl font-bold tracking-widest">
            REKK<span className="text-[#c45a30]">R</span>D
          </h1>
        </div>

        {/* Form card */}
        <div className="glass-morphism rounded-2xl p-6 md:p-8">
          {/* Mode toggle */}
          <div className="flex mb-6 rounded-lg overflow-hidden border border-th-surface/[0.10]">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setConfirmPassword(''); setTurnstileToken(null); }}
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
              onClick={() => { setMode('signup'); setError(null); setTurnstileToken(null); }}
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
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-3 py-2.5 pr-10 text-th-text placeholder-th-text3 text-sm focus:outline-none focus:border-[#dd6e42] focus:ring-1 focus:ring-[#dd6e42] transition-colors"
                    placeholder="••••••••"
                  />
                  <PasswordToggle visible={showPassword} onClick={() => setShowPassword(v => !v)} />
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-confirm-password" className="block text-xs text-th-text2 mb-1.5 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-3 py-2.5 pr-10 text-th-text placeholder-th-text3 text-sm focus:outline-none focus:border-[#dd6e42] focus:ring-1 focus:ring-[#dd6e42] transition-colors"
                      placeholder="••••••••"
                    />
                    <PasswordToggle visible={showConfirmPassword} onClick={() => setShowConfirmPassword(v => !v)} />
                  </div>
                </div>
              )}
            </div>

            <Turnstile
              onVerify={handleTurnstileVerify}
              onExpire={handleTurnstileExpire}
              resetKey={mode}
            />

            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="w-full mt-3 py-2.5 rounded-lg bg-[#c45a30] hover:bg-[#dd6e42] text-th-text font-medium text-sm tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
