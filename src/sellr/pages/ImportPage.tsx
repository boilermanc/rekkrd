import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseService';
import SellrLayout from '../components/SellrLayout';
import ImportConfirmation from '../components/ImportConfirmation';
import type { SellrRecord, SellrSession } from '../types';

interface ImportPreview {
  total: number;
  to_import: SellrRecord[];
  duplicates: Array<{ sellr_record: SellrRecord; existing_album: { id: string; title: string; artist: string } }>;
  session: SellrSession;
}

interface ImportResult {
  imported: number;
  skipped: number;
  album_ids: string[];
}

const ImportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();

  const sessionId = searchParams.get('session');

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // After successful import, store album_ids for highlighting then redirect
  useEffect(() => {
    if (!importResult) return;
    if (importResult.album_ids.length > 0) {
      localStorage.setItem('rekkrd_imported_album_ids', JSON.stringify(importResult.album_ids));
    }
    const timer = setTimeout(() => navigate('/'), 2000);
    return () => clearTimeout(timer);
  }, [importResult, navigate]);

  // If not authenticated once auth finishes loading, redirect to login
  // preserving the import session param
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const target = sessionId
        ? `/?import=${encodeURIComponent(sessionId)}`
        : '/';
      navigate(target, { replace: true });
    }
  }, [user, authLoading, sessionId, navigate]);

  // Fetch preview once authenticated
  useEffect(() => {
    if (!user || !sessionId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Get Supabase JWT for authenticated request
        const { data: { session } } = await supabase!.auth.getSession();
        if (!session?.access_token) {
          setError('Authentication session expired. Please sign in again.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/sellr/import/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Preview failed (${res.status})`);
        }

        const data = await res.json();
        if (!cancelled) {
          setPreview(data);

          // Clean up localStorage now that we've successfully loaded the preview
          localStorage.removeItem('sellr_import_session_id');
          localStorage.removeItem('sellr_import_report_token');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load import preview');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, sessionId]);

  // Don't render until auth check completes
  if (authLoading) {
    return (
      <SellrLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-sellr-blue" />
          <p className="text-sellr-charcoal/60 text-sm">Loading...</p>
        </div>
      </SellrLayout>
    );
  }

  if (!sessionId) {
    return (
      <SellrLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-sellr-charcoal/60">No session specified.</p>
          <button
            onClick={() => navigate('/sellr')}
            className="px-5 py-2.5 bg-sellr-amber text-white text-sm font-medium rounded hover:bg-sellr-amber-light transition-colors"
          >
            Back to Sellr
          </button>
        </div>
      </SellrLayout>
    );
  }

  return (
    <SellrLayout>
      <div className="max-w-3xl mx-auto py-8">
        {/* Header shown only during loading/error — ImportConfirmation has its own */}
        {(loading || (error && !preview)) && (
          <h1 className="font-display text-3xl tracking-tight text-sellr-charcoal mb-6">
            Import to Rekkrd
          </h1>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-sellr-blue" />
            <p className="text-sellr-charcoal/60 text-sm">Checking your collection...</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={() => navigate('/sellr')}
              className="mt-4 px-5 py-2.5 bg-sellr-amber text-white text-sm font-medium rounded hover:bg-sellr-amber-light transition-colors"
            >
              Back to Sellr
            </button>
          </div>
        )}

        {preview && !loading && !importResult && (
          <ImportConfirmation
            preview={preview}
            sessionId={sessionId}
            onImportComplete={setImportResult}
          />
        )}

        {importResult && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sellr-sage/15 mb-6">
              <svg className="w-8 h-8 text-sellr-sage" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="font-display text-2xl text-sellr-charcoal mb-2">Import Complete</h2>
            <p className="text-sellr-charcoal/60 mb-2">
              {importResult.imported} record{importResult.imported !== 1 ? 's' : ''} added to your collection.
              {importResult.skipped > 0 && ` ${importResult.skipped} skipped.`}
            </p>
            <p className="text-sellr-charcoal/40 text-sm">Redirecting to your collection...</p>
          </div>
        )}
      </div>
    </SellrLayout>
  );
};

export default ImportPage;
