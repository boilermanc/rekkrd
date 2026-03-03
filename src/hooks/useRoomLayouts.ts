import { useState, useCallback } from 'react';
import { supabase } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';
import type {
  StakkdRoomLayout,
  LayoutSummary,
  PlacementResponse,
} from '../types/room';

async function getToken(): Promise<string | null> {
  const session = await supabase?.auth.getSession();
  return session?.data?.session?.access_token ?? null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export function useRoomLayouts(roomId: string) {
  const [layouts, setLayouts] = useState<LayoutSummary[]>([]);
  const [activeLayout, setActiveLayout] = useState<StakkdRoomLayout | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  /** Fetch the list of layout summaries for this room */
  const fetchLayouts = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/stakkd-rooms/${roomId}/layouts`, { headers });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data: LayoutSummary[] = await res.json();
      setLayouts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load layouts';
      showToast(message, 'error');
    }
  }, [roomId, showToast]);

  /** Fetch the active layout (full data) for this room */
  const fetchActiveLayout = useCallback(async (): Promise<StakkdRoomLayout | null> => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/stakkd-rooms/${roomId}/layouts/active`, { headers });

      if (res.status === 404) {
        setActiveLayout(null);
        return null;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data: StakkdRoomLayout = await res.json();
      setActiveLayout(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load active layout';
      showToast(message, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [roomId, showToast]);

  /** Save a new layout (auto-becomes active) */
  const saveLayout = useCallback(async (
    result: PlacementResponse,
    name?: string,
  ): Promise<StakkdRoomLayout | null> => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/stakkd-rooms/${roomId}/layouts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: name || `Layout ${new Date().toLocaleDateString()}`,
          placements: result.placements,
          listening_position: result.listening_position,
          stereo_triangle: result.stereo_triangle,
          tips: result.tips,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const saved: StakkdRoomLayout = await res.json();
      setActiveLayout(saved);

      // Refresh the list
      await fetchLayouts();

      return saved;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save layout';
      showToast(message, 'error');
      return null;
    }
  }, [roomId, showToast, fetchLayouts]);

  /** Rename a layout */
  const renameLayout = useCallback(async (layoutId: string, name: string): Promise<boolean> => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/stakkd-rooms/${roomId}/layouts/${layoutId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const updated: StakkdRoomLayout = await res.json();

      // Update local state
      setLayouts(prev => prev.map(l => l.id === layoutId ? { ...l, name: updated.name } : l));
      if (activeLayout?.id === layoutId) {
        setActiveLayout(prev => prev ? { ...prev, name: updated.name } : prev);
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename layout';
      showToast(message, 'error');
      return false;
    }
  }, [roomId, showToast, activeLayout?.id]);

  /** Set a layout as active */
  const activateLayout = useCallback(async (layoutId: string): Promise<boolean> => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/stakkd-rooms/${roomId}/layouts/${layoutId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_active: true }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const updated: StakkdRoomLayout = await res.json();
      setActiveLayout(updated);

      // Refresh the list to update is_active flags
      await fetchLayouts();

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate layout';
      showToast(message, 'error');
      return false;
    }
  }, [roomId, showToast, fetchLayouts]);

  /** Delete a layout */
  const deleteLayout = useCallback(async (layoutId: string): Promise<boolean> => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/stakkd-rooms/${roomId}/layouts/${layoutId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      setLayouts(prev => prev.filter(l => l.id !== layoutId));
      if (activeLayout?.id === layoutId) {
        setActiveLayout(null);
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete layout';
      showToast(message, 'error');
      return false;
    }
  }, [roomId, showToast, activeLayout?.id]);

  return {
    layouts,
    activeLayout,
    loading,
    fetchLayouts,
    fetchActiveLayout,
    saveLayout,
    renameLayout,
    activateLayout,
    deleteLayout,
  };
}
