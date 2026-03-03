import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';
import type {
  StakkdRoom,
  StakkdRoomFeature,
  CreateRoomPayload,
  CreateRoomFeaturePayload,
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

export function useRooms() {
  const [rooms, setRooms] = useState<StakkdRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = await authHeaders();
      const res = await fetch('/api/stakkd-rooms', { headers });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data: StakkdRoom[] = await res.json();
      setRooms(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load rooms';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const createRoom = useCallback(async (payload: CreateRoomPayload): Promise<StakkdRoom> => {
    const headers = await authHeaders();
    const res = await fetch('/api/stakkd-rooms', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }));
      const message = body.error || `HTTP ${res.status}`;
      showToast(message, 'error');
      throw new Error(message);
    }

    const room: StakkdRoom = await res.json();
    setRooms(prev => [room, ...prev]);
    return room;
  }, [showToast]);

  const updateRoom = useCallback(async (id: string, payload: Partial<CreateRoomPayload>): Promise<StakkdRoom> => {
    const headers = await authHeaders();
    const res = await fetch(`/api/stakkd-rooms/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }));
      const message = body.error || `HTTP ${res.status}`;
      showToast(message, 'error');
      throw new Error(message);
    }

    const updated: StakkdRoom = await res.json();
    setRooms(prev => prev.map(r => (r.id === id ? { ...r, ...updated } : r)));
    return updated;
  }, [showToast]);

  const deleteRoom = useCallback(async (id: string): Promise<void> => {
    const headers = await authHeaders();
    const res = await fetch(`/api/stakkd-rooms/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }));
      const message = body.error || `HTTP ${res.status}`;
      showToast(message, 'error');
      throw new Error(message);
    }

    setRooms(prev => prev.filter(r => r.id !== id));
  }, [showToast]);

  const addFeature = useCallback(async (payload: CreateRoomFeaturePayload): Promise<StakkdRoomFeature> => {
    const headers = await authHeaders();
    const res = await fetch('/api/stakkd-room-features', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }));
      const message = body.error || `HTTP ${res.status}`;
      showToast(message, 'error');
      throw new Error(message);
    }

    const feature: StakkdRoomFeature = await res.json();
    // Increment the feature_count on the parent room
    setRooms(prev =>
      prev.map(r =>
        r.id === payload.room_id
          ? { ...r, feature_count: (r.feature_count ?? 0) + 1 }
          : r
      )
    );
    return feature;
  }, [showToast]);

  const removeFeature = useCallback(async (featureId: string, roomId?: string): Promise<void> => {
    const headers = await authHeaders();
    const res = await fetch(`/api/stakkd-room-features/${featureId}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }));
      const message = body.error || `HTTP ${res.status}`;
      showToast(message, 'error');
      throw new Error(message);
    }

    // Decrement the feature_count if roomId is provided
    if (roomId) {
      setRooms(prev =>
        prev.map(r =>
          r.id === roomId
            ? { ...r, feature_count: Math.max((r.feature_count ?? 0) - 1, 0) }
            : r
        )
      );
    }
  }, [showToast]);

  return {
    rooms,
    loading,
    error,
    fetchRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    addFeature,
    removeFeature,
  };
}
