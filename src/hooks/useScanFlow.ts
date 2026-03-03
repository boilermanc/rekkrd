import { useState, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Album, ScanConfirmation, DiscogsMatch } from '../types';
import type { ScanMode } from '../components/CameraModal';
import { supabaseService, supabase } from '../services/supabaseService';
import {
  geminiService,
  ScanLimitError,
  UpgradeRequiredError,
  AlbumLimitError,
  IdentificationFailedError,
  checkAlbumLimit,
} from '../services/geminiService';
import { getAlbumPlacementInfo } from '../helpers/shelfHelpers';
import type { GatedFeature } from '../contexts/SubscriptionContext';

export interface DuplicatePendingData {
  identity: {
    artist: string;
    title: string;
    barcode?: string;
    discogsMatches?: DiscogsMatch[];
    scanMode?: ScanMode;
  };
  base64: string;
  existingAlbum: Album;
}

export interface UseScanFlowOptions {
  albums: Album[];
  setAlbums: React.Dispatch<React.SetStateAction<Album[]>>;
  setSelectedAlbum: React.Dispatch<React.SetStateAction<Album | null>>;
  setHeroBg: (bg: string) => void;
  setUpgradeFeature: (feature: string | null) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  user: User | null;
  isSupabaseReady: boolean;
  albumLimitReached: (count: number) => boolean;
  canUse: (feature: GatedFeature) => boolean;
}

export function useScanFlow(opts: UseScanFlowOptions) {
  const {
    albums, setAlbums, setSelectedAlbum, setHeroBg, setUpgradeFeature,
    showToast, user, isSupabaseReady, albumLimitReached, canUse,
  } = opts;

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [scanElapsed, setScanElapsed] = useState(0);
  const [scanTimedOut, setScanTimedOut] = useState(false);
  const scanAbortRef = useRef<AbortController | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [duplicatePending, setDuplicatePending] = useState<DuplicatePendingData | null>(null);
  const [pendingScan, setPendingScan] = useState<{ scan: ScanConfirmation; base64: string } | null>(null);
  const [showScanFailed, setShowScanFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearScanTimers = () => {
    if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
    if (scanTimeoutRef.current) { clearTimeout(scanTimeoutRef.current); scanTimeoutRef.current = null; }
    setScanElapsed(0);
    setScanTimedOut(false);
  };

  const startScanTimers = () => {
    clearScanTimers();
    const startTime = Date.now();
    scanTimerRef.current = setInterval(() => {
      setScanElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    scanTimeoutRef.current = setTimeout(() => {
      setScanTimedOut(true);
    }, 30_000);
  };

  const handleCancelScan = () => {
    scanAbortRef.current?.abort();
    clearScanTimers();
    setProcessingStatus(null);
    showToast('Scan cancelled', 'info');
  };

  const handleKeepWaiting = () => {
    setScanTimedOut(false);
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = setTimeout(() => {
      setScanTimedOut(true);
    }, 30_000);
  };

  const saveIdentifiedAlbum = async (
    identity: { artist: string; title: string },
    base64: string,
    discogsReleaseIdParam?: number,
    barcodeParam?: string,
    formatParam?: string,
    discogsCoverUrl?: string,
  ) => {
    setProcessingStatus(`Appraising ${identity.title}...`);
    try {
      // Server-side album limit enforcement
      await checkAlbumLimit();

      const metadata = await geminiService.fetchAlbumMetadata(identity.artist, identity.title, discogsCoverUrl);
      const { artist: mArtist, title: mTitle, cover_url: mCover, ...rest } = metadata;
      const saved = await supabaseService.saveAlbum({
        ...rest,
        original_photo_url: base64,
        artist: mArtist || identity.artist,
        title: mTitle || identity.title,
        cover_url: mCover || discogsCoverUrl || '',
        tags: metadata.tags || [],
        isFavorite: false,
        condition: 'Near Mint',
        play_count: 0,
        ...(discogsReleaseIdParam !== undefined && {
          discogs_release_id: discogsReleaseIdParam,
          discogs_url: `https://www.discogs.com/release/${discogsReleaseIdParam}`,
        }),
        ...(barcodeParam ? { barcode: barcodeParam } : {}),
        format: formatParam || 'Vinyl',
      });

      setAlbums(prev => [saved, ...prev]);
      setSelectedAlbum(saved);
      if (saved.cover_url) setHeroBg(saved.cover_url);

      // Fire-and-forget: shelf placement toast
      if (user) {
        getAlbumPlacementInfo(saved, albums, user.id).then(p => {
          if (p) showToast(`Section ${p.unit}, position ~${p.position} on ${p.shelfName}`, 'info');
        });
      }

      // Fire-and-forget: milestone email check
      (async () => {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              headers['Authorization'] = `Bearer ${session.access_token}`;
            }
          }
          await fetch('/api/collection/milestone-check', { method: 'POST', headers });
        } catch { /* milestone email is best-effort */ }
      })();
    } catch (err) {
      if (err instanceof AlbumLimitError) {
        setUpgradeFeature('album_limit');
      } else if (err instanceof ScanLimitError) {
        setUpgradeFeature('scan');
      } else if (err instanceof UpgradeRequiredError) {
        setUpgradeFeature(err.requiredPlan === 'curator' ? 'scan' : 'scan');
      } else {
        console.error(err);
        showToast("Something went wrong during processing.", "error");
      }
    } finally {
      setProcessingStatus(null);
    }
  };

  const processImage = async (base64: string, scanMode?: ScanMode) => {
    if (!isSupabaseReady) {
      showToast("Database not configured. Check your Supabase environment variables.", "error");
      return;
    }

    // Check album limit for free tier before processing
    if (albumLimitReached(albums.length)) {
      setUpgradeFeature('album_limit');
      return;
    }

    // Check scan limit for free tier
    if (!canUse('scan')) {
      setUpgradeFeature('scan');
      return;
    }

    const abortController = new AbortController();
    scanAbortRef.current = abortController;
    setProcessingStatus(scanMode === 'barcode' ? "Reading Barcode..." : "Identifying Record...");
    startScanTimers();
    try {
      const identity = await geminiService.identifyAlbum(base64, scanMode, abortController.signal);
      clearScanTimers();
      if (!identity) {
        showToast("Couldn't identify that album. Try a clearer photo or different angle!", "error");
        setProcessingStatus(null);
        return;
      }

      const normalizedNewArtist = identity.artist.toLowerCase().trim();
      const normalizedNewTitle = identity.title.toLowerCase().trim();

      const existingAlbum = albums.find(a =>
        a.artist.toLowerCase().trim() === normalizedNewArtist &&
        a.title.toLowerCase().trim() === normalizedNewTitle
      );

      if (existingAlbum) {
        setProcessingStatus(null);
        setDuplicatePending({ identity, base64, existingAlbum });
        return;
      }

      // Show confirmation modal instead of auto-saving
      setProcessingStatus(null);
      setPendingScan({
        scan: {
          artist: identity.artist,
          title: identity.title,
          barcode: identity.barcode,
          discogsMatches: identity.discogsMatches,
          scanMode,
          format: identity.format,
        },
        base64,
      });
    } catch (err) {
      clearScanTimers();
      // User cancelled — handleCancelScan already reset state & toasted
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (err instanceof IdentificationFailedError) {
        setShowScanFailed(true);
      } else if (err instanceof ScanLimitError) {
        setUpgradeFeature('scan');
      } else if (err instanceof UpgradeRequiredError) {
        setUpgradeFeature(err.requiredPlan === 'curator' ? 'scan' : 'scan');
      } else {
        console.error(err);
        const msg = err instanceof Error ? err.message : "Something went wrong during processing.";
        showToast(msg, "error");
      }
      setProcessingStatus(null);
    }
  };

  const handleCapture = (base64: string, scanMode?: ScanMode) => {
    setIsCameraOpen(false);
    processImage(base64, scanMode);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 1080;
        let w = img.width, h = img.height;
        if (w > max || h > max) {
          const scale = max / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        processImage(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDuplicateAddAnyway = () => {
    if (!duplicatePending) return;
    const { identity, base64 } = duplicatePending;
    setDuplicatePending(null);
    setPendingScan({
      scan: {
        artist: identity.artist,
        title: identity.title,
        barcode: identity.barcode,
        discogsMatches: identity.discogsMatches,
        scanMode: identity.scanMode,
      },
      base64,
    });
  };

  const handleDuplicateCancel = () => {
    if (!duplicatePending) return;
    const { existingAlbum } = duplicatePending;
    setDuplicatePending(null);
    setSelectedAlbum(existingAlbum);
    if (existingAlbum.cover_url) setHeroBg(existingAlbum.cover_url);
  };

  const handleScanConfirm = async (
    artist: string,
    title: string,
    confirmedDiscogsReleaseId?: number,
    barcode?: string,
    format?: string,
    discogsCoverUrl?: string,
  ) => {
    if (!pendingScan) return;
    const { base64 } = pendingScan;
    setPendingScan(null);
    await saveIdentifiedAlbum({ artist, title }, base64, confirmedDiscogsReleaseId, barcode, format, discogsCoverUrl);
  };

  const handleScanCancel = () => {
    setPendingScan(null);
  };

  return {
    isCameraOpen,
    setIsCameraOpen,
    processingStatus,
    scanElapsed,
    scanTimedOut,
    duplicatePending,
    pendingScan,
    showScanFailed,
    setShowScanFailed,
    fileInputRef,
    handleCancelScan,
    handleKeepWaiting,
    handleCapture,
    handleFileUpload,
    handleDuplicateAddAnyway,
    handleDuplicateCancel,
    handleScanConfirm,
    handleScanCancel,
  };
}
