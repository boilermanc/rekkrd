import React, { useEffect, useRef, useCallback } from 'react';

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  /** Change this value to force the widget to re-render (e.g. when toggling signin/signup) */
  resetKey?: string | number;
  theme?: 'light' | 'dark' | 'auto';
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

const Turnstile: React.FC<TurnstileProps> = ({ onVerify, onExpire, resetKey, theme = 'dark' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (widgetIdRef.current !== null && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // widget may already be removed
      }
      widgetIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;

    const render = () => {
      if (!containerRef.current || !window.turnstile) return;

      cleanup();

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: onVerify,
        'expired-callback': onExpire,
        theme: theme as 'light' | 'dark' | 'auto',
      });
    };

    // The script loads async — turnstile may not be ready yet
    if (window.turnstile) {
      render();
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          render();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    return cleanup;
  }, [resetKey, theme, onVerify, onExpire, cleanup]);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} className="flex justify-center my-3" />;
};

export default Turnstile;
