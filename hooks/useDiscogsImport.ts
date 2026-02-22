import { useState, useCallback } from 'react';
import { supabase } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';
import type {
  DiscogsCollectionRelease,
  DiscogsCollectionResponse,
  DiscogsPagination,
  DiscogsImportResult,
} from '../types';

const PER_PAGE = 50;

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

interface UseDiscogsImportOptions {
  onImportComplete: () => void;
}

export function useDiscogsImport({ onImportComplete }: UseDiscogsImportOptions) {
  const { showToast } = useToast();

  const [collection, setCollection] = useState<DiscogsCollectionRelease[]>([]);
  const [pagination, setPagination] = useState<DiscogsPagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notConnected, setNotConnected] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Fetch a single page ────────────────────────────────────────

  const fetchPage = useCallback(async (page: number) => {
    const headers = await authHeaders();
    if (!headers['Authorization']) return;

    setLoading(true);
    setNotConnected(false);
    try {
      const res = await fetch(
        `/api/discogs-collection?page=${page}&per_page=${PER_PAGE}`,
        { headers },
      );

      if (res.status === 401) {
        setNotConnected(true);
        setCollection([]);
        setPagination(null);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error || `Failed to fetch collection (${res.status})`,
        );
      }

      const data: DiscogsCollectionResponse = await res.json();
      setCollection(data.releases || []);
      setPagination(data.pagination || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch collection';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // ── Selection helpers ──────────────────────────────────────────

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const r of collection) {
        next.add(r.basic_information.id);
      }
      return next;
    });
  }, [collection]);

  const deselectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const r of collection) {
        next.delete(r.basic_information.id);
      }
      return next;
    });
  }, [collection]);

  // ── Import helpers ─────────────────────────────────────────────

  const postImport = async (releases: DiscogsCollectionRelease[]): Promise<DiscogsImportResult> => {
    const headers = await authHeaders();
    if (!headers['Authorization']) {
      throw new Error('Not authenticated');
    }

    const res = await fetch('/api/discogs-import', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ releases }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || `Import failed (${res.status})`);
    }

    return res.json() as Promise<DiscogsImportResult>;
  };

  const handleImportResult = (result: DiscogsImportResult) => {
    if (result.errors.length > 0) {
      showToast(
        `Imported ${result.imported}, skipped ${result.skipped}, ${result.errors.length} error(s)`,
        'error',
      );
    } else {
      const count = result.imported;
      showToast(
        `Successfully imported ${count} record${count !== 1 ? 's' : ''} to your collection${
          result.skipped > 0 ? ` (${result.skipped} already existed)` : ''
        }`,
        'success',
      );
    }
  };

  // ── Import selected releases ───────────────────────────────────

  const importSelected = useCallback(async () => {
    const selected = collection.filter(r => selectedIds.has(r.basic_information.id));
    if (selected.length === 0) return;

    setImporting(true);
    try {
      const result = await postImport(selected);
      handleImportResult(result);
      setSelectedIds(new Set());
      onImportComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      showToast(message, 'error');
      throw err;
    } finally {
      setImporting(false);
    }
  }, [collection, selectedIds, onImportComplete, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Import ALL pages ───────────────────────────────────────────

  const importAll = useCallback(async () => {
    setImporting(true);
    try {
      const headers = await authHeaders();
      if (!headers['Authorization']) {
        throw new Error('Not authenticated');
      }

      // Fetch all pages
      const allReleases: DiscogsCollectionRelease[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const res = await fetch(
          `/api/discogs-collection?page=${currentPage}&per_page=${PER_PAGE}`,
          { headers },
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error || `Failed to fetch page ${currentPage} (${res.status})`,
          );
        }

        const data: DiscogsCollectionResponse = await res.json();
        allReleases.push(...(data.releases || []));
        totalPages = data.pagination?.pages ?? 1;
        currentPage++;
      } while (currentPage <= totalPages);

      if (allReleases.length === 0) {
        showToast('No releases found in your Discogs collection', 'error');
        return;
      }

      // Post in batches of 500 (API limit)
      const BATCH_SIZE = 500;
      let totalImported = 0;
      let totalSkipped = 0;
      const allErrors: string[] = [];

      for (let i = 0; i < allReleases.length; i += BATCH_SIZE) {
        const batch = allReleases.slice(i, i + BATCH_SIZE);
        const result = await postImport(batch);
        totalImported += result.imported;
        totalSkipped += result.skipped;
        allErrors.push(...result.errors);
      }

      handleImportResult({
        imported: totalImported,
        skipped: totalSkipped,
        errors: allErrors,
      });

      setSelectedIds(new Set());
      onImportComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      showToast(message, 'error');
      throw err;
    } finally {
      setImporting(false);
    }
  }, [onImportComplete, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    collection,
    pagination,
    loading,
    importing,
    notConnected,
    selectedIds,
    fetchPage,
    toggleSelect,
    selectAll,
    deselectAll,
    importSelected,
    importAll,
  };
}
