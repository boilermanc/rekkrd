import { useState, useEffect, useCallback } from 'react';
import type { SellrSession, SellrRecord } from '../types';

const STORAGE_KEY = 'sellr_session_id';
const COOKIE_NAME = 'sellr_session_id';

interface SellrSessionState {
  session: SellrSession | null;
  records: SellrRecord[];
  loading: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
}

/** Read a cookie value by name from document.cookie. */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Get the session id from cookie first, then localStorage fallback. */
function getStoredSessionId(): string | null {
  return getCookie(COOKIE_NAME) || localStorage.getItem(STORAGE_KEY);
}

/** Persist session id to localStorage as a fallback for the httpOnly cookie. */
function storeSessionId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function useSellrSession(): SellrSessionState {
  const [session, setSession] = useState<SellrSession | null>(null);
  const [records, setRecords] = useState<SellrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    const sessionId = getStoredSessionId();
    if (!sessionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/sellr/sessions/${sessionId}`);

      if (!res.ok) {
        // Session expired or not found — clear stored id
        if (res.status === 404) {
          localStorage.removeItem(STORAGE_KEY);
          setSession(null);
          setRecords([]);
          setLoading(false);
          return;
        }
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setSession(data.session);
      setRecords(data.records ?? []);

      // Ensure localStorage fallback stays in sync
      storeSessionId(data.session.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load session';
      setError(message);
      setSession(null);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return { session, records, loading, error, refreshSession: fetchSession };
}
