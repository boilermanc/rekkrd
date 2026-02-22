import React, { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getProfile, type Profile } from '../services/profileService';

const LOG_PREFIX = '[DiscogsConnect]';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

async function getAuthHeaders(accessToken: string): Promise<Record<string, string>> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };
}

interface DiscogsConnectProps {
  onConnectionChange?: (connected: boolean) => void;
}

const DiscogsConnect: React.FC<DiscogsConnectProps> = ({ onConnectionChange }) => {
  const { user, session } = useAuthContext();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // ── Fetch profile ───────────────────────────────────────────────

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const p = await getProfile(user.id);
      setProfile(p);
    } catch (err) {
      console.error(LOG_PREFIX, 'Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Notify parent when connection status changes
  useEffect(() => {
    if (!loading) {
      onConnectionChange?.(!!profile?.discogs_username);
    }
  }, [loading, profile?.discogs_username, onConnectionChange]);

  // ── Handle ?discogs=connected callback param ────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('discogs') === 'connected') {
      showToast('Discogs account connected successfully!', 'success');
      params.delete('discogs');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      refreshProfile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connect handler ─────────────────────────────────────────────

  const handleConnect = async () => {
    if (!session?.access_token) {
      showToast('You must be signed in to connect Discogs', 'error');
      return;
    }

    setConnecting(true);
    try {
      const headers = await getAuthHeaders(session.access_token);
      const res = await fetch('/api/discogs/auth/request-token', {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { details?: string }).details || `Request failed (${res.status})`);
      }

      const { authorizeUrl } = await res.json() as { authorizeUrl: string };
      window.location.href = authorizeUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(LOG_PREFIX, 'Connect error:', err);
      showToast(`Failed to connect Discogs: ${message}`, 'error');
      setConnecting(false);
    }
  };

  // ── Disconnect handler ──────────────────────────────────────────

  const handleDisconnect = async () => {
    if (!session?.access_token) return;

    const confirmed = window.confirm(
      'Are you sure? This will remove the link to your Discogs account.',
    );
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      const headers = await getAuthHeaders(session.access_token);
      const res = await fetch('/api/discogs/auth/disconnect', {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { details?: string }).details || `Request failed (${res.status})`);
      }

      showToast('Discogs account disconnected', 'success');
      await refreshProfile();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(LOG_PREFIX, 'Disconnect error:', err);
      showToast(`Failed to disconnect Discogs: ${message}`, 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="glass-morphism rounded-xl p-6 flex items-center justify-center">
        <div
          className="w-6 h-6 border-2 border-th-accent border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Loading Discogs connection status"
        />
      </div>
    );
  }

  const isConnected = !!profile?.discogs_username;

  if (isConnected) {
    return (
      <div className="glass-morphism rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-th-text font-display text-lg">Discogs</h3>
          <span className="flex items-center gap-1.5 text-sm text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400" aria-hidden="true" />
            Connected
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-th-text font-medium">{profile.discogs_username}</p>
          {profile.discogs_connected_at && (
            <p className="text-th-text/50 text-sm">
              Connected {formatDate(profile.discogs_connected_at)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleDisconnect}
          disabled={disconnecting}
          aria-label="Disconnect Discogs account"
          className="text-sm text-th-text/60 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    );
  }

  return (
    <div className="glass-morphism rounded-xl p-6 space-y-4">
      <div>
        <h3 className="text-th-text font-display text-lg">Discogs</h3>
        <p className="text-th-text/60 text-sm mt-1">
          Link your Discogs account to import your collection and access marketplace data
        </p>
      </div>

      <button
        type="button"
        onClick={handleConnect}
        disabled={connecting}
        aria-label="Connect Discogs account"
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-th-accent/20 text-th-accent hover:bg-th-accent/30 border border-th-accent/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {connecting ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Connecting...
          </>
        ) : (
          'Connect Discogs Account'
        )}
      </button>
    </div>
  );
};

export default DiscogsConnect;
