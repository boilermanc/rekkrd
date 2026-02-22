
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Album } from './types';
import { supabaseService, supabase } from './services/supabaseService';
import { geminiService } from './services/geminiService';
import AlbumCard from './components/AlbumCard';
import CameraModal from './components/CameraModal';
import SpinningRecord from './components/SpinningRecord';
import AlbumDetailModal from './components/AlbumDetailModal';
import PlaylistStudio from './components/PlaylistStudio';
import CollectionList from './components/CollectionList';
import Pagination from './components/Pagination';
import StakkdPage from './components/StakkdPage';
import Landing from './pages/Landing';
// AuthPage kept as standalone fallback; Landing page handles auth via dropdown
import { proxyImageUrl } from './services/imageProxy';
import { useToast } from './contexts/ToastContext';
import { useAuthContext } from './contexts/AuthContext';
import { useSubscription } from './contexts/SubscriptionContext';
import { useTheme } from './contexts/ThemeContext';
import { getProfile, createProfile, hasCompletedOnboarding } from './services/profileService';
import { ScanLimitError, UpgradeRequiredError } from './services/geminiService';
import OnboardingWizard from './components/OnboardingWizard';
import UpgradeModal from './components/UpgradeModal';
import DuplicateAlbumModal from './components/DuplicateAlbumModal';
import SubscriptionBanner from './components/SubscriptionBanner';
import PlanBadge from './components/PlanBadge';
import ErrorPage from './components/ErrorPage';
import SEO from './components/SEO';
import DiscogsSearch from './components/DiscogsSearch';
import DiscogsReleaseDetail from './components/DiscogsReleaseDetail';
import DiscogsConnect from './components/DiscogsConnect';

const PAGE_SIZE = 40;

type SortOption = 'recent' | 'year' | 'artist' | 'title' | 'value';
type ViewMode = 'public-landing' | 'landing' | 'grid' | 'list' | 'stakkd' | 'discogs';

interface DuplicatePendingData {
  identity: { artist: string; title: string };
  base64: string;
  existingAlbum: Album;
}

const DEFAULT_BG = 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?q=80&w=2000&auto=format&fit=crop';

const App: React.FC = () => {
  const { showToast } = useToast();
  const { user, loading: authLoading, signOut } = useAuthContext();
  const { canUse, scansRemaining, albumLimitReached, plan, refresh: refreshSubscription } = useSubscription();
  const { theme, toggleTheme } = useTheme();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null);
  const [showPricingPage, setShowPricingPage] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [heroBg, setHeroBg] = useState(DEFAULT_BG);
  const [duplicatePending, setDuplicatePending] = useState<DuplicatePendingData | null>(null);
  const [discogsReleaseId, setDiscogsReleaseId] = useState<number | null>(null);

  const [yearRange, setYearRange] = useState({ min: '', max: '' });
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [currentView, setCurrentView] = useState<ViewMode>(
    () => (sessionStorage.getItem('rekkrd-view') as ViewMode) || 'public-landing'
  );

  useEffect(() => {
    sessionStorage.setItem('rekkrd-view', currentView);
  }, [currentView]);

  const [gridPage, setGridPage] = useState(1);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSupabaseReady = !!supabase;
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  useEffect(() => {
    if (isSupabaseReady) {
      const loadAlbums = async () => {
        setLoading(true);
        const data = await supabaseService.getAlbums();
        setAlbums(data);
        setLoading(false);
      };
      loadAlbums();
    } else {
      setLoading(false);
    }
  }, [isSupabaseReady]);

  // Auto-create profile row on first signup & check onboarding
  const profileCheckedRef = useRef(false);
  useEffect(() => {
    if (!user || profileCheckedRef.current) return;
    profileCheckedRef.current = true;

    (async () => {
      try {
        const existing = await getProfile(user.id);
        if (!existing) {
          // Capture UTM params from sessionStorage (set by /welcome page)
          const utmFields: Record<string, string> = {};
          for (const key of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
            const val = sessionStorage.getItem(key);
            if (val) utmFields[key] = val;
          }
          await createProfile({ id: user.id, ...utmFields });
          // Clear UTM params after saving
          for (const key of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
            sessionStorage.removeItem(key);
          }
          setShowOnboarding(true);
          return;
        }
        const completed = await hasCompletedOnboarding(user.id);
        if (!completed) {
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error('Failed to ensure profile exists:', err);
      }
    })();
  }, [user]);

  // After login, redirect from public landing to in-app landing
  useEffect(() => {
    if (user && currentView === 'public-landing') {
      setCurrentView('landing');
    }
  }, [user, currentView]);

  // Handle Stripe checkout / portal return / downgrade
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');
    const portalReturned = params.has('portal');
    const downgraded = params.has('downgraded');

    if (!checkoutStatus && !portalReturned && !downgraded) return;

    window.history.replaceState({}, '', window.location.pathname);

    if (checkoutStatus === 'success') {
      refreshSubscription().then(() => {
        showToast(`Welcome to your new plan! Your 14-day trial has started.`, 'success');
      });
    } else if (checkoutStatus === 'canceled') {
      showToast('Checkout canceled. You can upgrade anytime.', 'info');
    } else if (portalReturned) {
      refreshSubscription().then(() => {
        showToast('Billing settings updated.', 'info');
      });
    } else if (downgraded) {
      refreshSubscription().then(() => {
        showToast("You're now on the free Collector plan. Your records and gear are safe \u2014 upgrade anytime to unlock premium features.", 'info');
      });
    }
  }, []);

  const isAlbumDeselected = selectedAlbum === null;
  useEffect(() => {
    if (albums.length > 0) {
      const randomIndex = Math.floor(Math.random() * albums.length);
      const selected = albums[randomIndex];
      if (selected.cover_url) {
        setHeroBg(selected.cover_url);
      }
    }
  }, [albums.length, isStudioOpen, isAlbumDeselected]);

  const resetView = () => {
    setSearchQuery('');
    setYearRange({ min: '', max: '' });
    setFavoritesOnly(false);
    setSortBy('recent');
    setIsFilterPanelOpen(false);
    setShowStats(false);
    setSelectedAlbum(null);
    setCurrentView('landing');

    // Pick a fresh random background
    if (albums.length > 0) {
      const randomIndex = Math.floor(Math.random() * albums.length);
      const selected = albums[randomIndex];
      if (selected.cover_url) setHeroBg(selected.cover_url);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveIdentifiedAlbum = async (
    identity: { artist: string; title: string },
    base64: string
  ) => {
    setProcessingStatus(`Appraising ${identity.title}...`);
    try {
      const metadata = await geminiService.fetchAlbumMetadata(identity.artist, identity.title);
      const { artist: mArtist, title: mTitle, cover_url: mCover, ...rest } = metadata;
      const saved = await supabaseService.saveAlbum({
        ...rest,
        original_photo_url: base64,
        artist: mArtist || identity.artist,
        title: mTitle || identity.title,
        cover_url: mCover || '',
        tags: metadata.tags || [],
        isFavorite: false,
        condition: 'Near Mint',
        play_count: 0
      });

      setAlbums(prev => [saved, ...prev]);
      setSelectedAlbum(saved);
      if (saved.cover_url) setHeroBg(saved.cover_url);

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
      if (err instanceof ScanLimitError) {
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

  const processImage = async (base64: string) => {
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

    setProcessingStatus("Identifying Record...");
    try {
      const identity = await geminiService.identifyAlbum(base64);
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

      await saveIdentifiedAlbum(identity, base64);
    } catch (err) {
      if (err instanceof ScanLimitError) {
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

  const handleUpdateAlbum = async (albumId: string, updates: Partial<Album>) => {
    try {
      await supabaseService.updateAlbum(albumId, updates);
      setAlbums(prev => prev.map(a => a.id === albumId ? { ...a, ...updates } : a));
      if (selectedAlbum?.id === albumId) {
        setSelectedAlbum(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err) {
      console.error('Failed to update album:', err);
      showToast("Failed to update album. Please try again.", "error");
    }
  };

  const handleToggleFavorite = async (albumId: string) => {
    const album = albums.find(a => a.id === albumId);
    if (album) {
      const updates = { isFavorite: !album.isFavorite };
      await handleUpdateAlbum(albumId, updates);
    }
  };

  const handleCapture = (base64: string) => {
    setIsCameraOpen(false);
    processImage(base64);
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

  const handleDelete = useCallback((id: string) => {
    showToast("Delete this masterpiece?", "warning", {
      action: "Delete",
      duration: 5000,
      onAction: async () => {
        try {
          await supabaseService.deleteAlbum(id);
          setAlbums(prev => prev.filter(a => a.id !== id));
          setSelectedAlbum(prev => prev?.id === id ? null : prev);
          showToast("Album removed from crate.", "success");
        } catch (err) {
          console.error(err);
          showToast("Failed to delete album. Please try again.", "error");
        }
      }
    });
  }, [showToast]);

  const handleDuplicateAddAnyway = async () => {
    if (!duplicatePending) return;
    const { identity, base64 } = duplicatePending;
    setDuplicatePending(null);
    await saveIdentifiedAlbum(identity, base64);
  };

  const handleDuplicateCancel = () => {
    if (!duplicatePending) return;
    const { existingAlbum } = duplicatePending;
    setDuplicatePending(null);
    setSelectedAlbum(existingAlbum);
    if (existingAlbum.cover_url) setHeroBg(existingAlbum.cover_url);
  };

  const stats = useMemo(() => {
    const genres: Record<string, number> = {};
    const decades: Record<string, number> = {};
    let totalVal = 0;

    albums.forEach(album => {
      const g = album.genre || 'Unknown';
      genres[g] = (genres[g] || 0) + 1;

      const year = parseInt(album.year || '0');
      if (year > 0) {
        const decade = Math.floor(year / 10) * 10 + 's';
        decades[decade] = (decades[decade] || 0) + 1;
      }

      totalVal += (album.price_median || 0);
    });

    const topGenre = Object.entries(genres).sort((a, b) => b[1] - a[1])[0];
    const topDecade = Object.entries(decades).sort((a, b) => b[1] - a[1])[0];

    return { genres, decades, topGenre, topDecade, total: albums.length, portfolioValue: totalVal };
  }, [albums]);

  const filteredAlbums = useMemo(() => {
    let result = albums.filter(a => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        a.title.toLowerCase().includes(query) ||
        a.artist.toLowerCase().includes(query) ||
        (a.genre && a.genre.toLowerCase().includes(query));

      const albumYear = parseInt(a.year || '0');
      const minYear = parseInt(yearRange.min || '0');
      const maxYear = parseInt(yearRange.max || '9999');
      const matchesYear = (minYear === 0 || albumYear >= minYear) && (maxYear === 9999 || albumYear <= maxYear);
      const matchesFavoriteOnly = !favoritesOnly || a.isFavorite;

      return matchesSearch && matchesYear && matchesFavoriteOnly;
    });

    result.sort((a, b) => {
      if (sortBy === 'year') return (parseInt(b.year || '0') - parseInt(a.year || '0'));
      if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'value') return (b.price_median || 0) - (a.price_median || 0);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return result;
  }, [albums, searchQuery, yearRange, favoritesOnly, sortBy]);

  // Reset grid page when filters change
  useEffect(() => {
    setGridPage(1);
  }, [searchQuery, yearRange, favoritesOnly, sortBy]);

  const gridTotalPages = Math.ceil(filteredAlbums.length / PAGE_SIZE);
  const paginatedAlbums = filteredAlbums.slice((gridPage - 1) * PAGE_SIZE, gridPage * PAGE_SIZE);

  // Offline — show standby page, auto-dismisses when back online
  if (isOffline) {
    return <ErrorPage type="offline" />;
  }

  // Auth loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-th-bg flex flex-col items-center justify-center">
        <SpinningRecord size="w-32 h-32" />
        <p className="font-label text-[10px] tracking-widest mt-6 text-th-text3 uppercase">Loading</p>
      </div>
    );
  }

  // Not signed in — show landing page with auth dropdown
  if (!user) {
    return <Landing />;
  }

  // Logged-in user viewing pricing page (from upgrade prompt)
  if (showPricingPage) {
    return <Landing onEnterApp={() => setShowPricingPage(false)} scrollToPricing />;
  }

  // Onboarding wizard for new/incomplete users
  if (showOnboarding) {
    return (
      <OnboardingWizard
        userId={user.id}
        onComplete={async (action, tier) => {
          setShowOnboarding(false);

          // Trigger Stripe checkout for paid tiers selected via /welcome CTAs
          if (tier === 'curator' || tier === 'enthusiast') {
            try {
              const pricesRes = await fetch('/api/prices');
              if (pricesRes.ok) {
                const { tiers } = await pricesRes.json();
                const priceId = tiers?.[tier]?.monthly?.priceId;
                if (priceId) {
                  const session = await supabase?.auth.getSession();
                  const token = session?.data?.session?.access_token;
                  if (token) {
                    const checkoutRes = await fetch('/api/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ priceId }),
                    });
                    const { url } = await checkoutRes.json();
                    if (url) { window.location.href = url; return; }
                  }
                }
              }
            } catch (err) {
              console.error('Post-onboarding checkout failed:', err);
            }
          }

          if (action === 'add') {
            setCurrentView('landing');
            setIsCameraOpen(true);
          } else {
            setCurrentView('landing');
          }
        }}
      />
    );
  }


  return (
    <div className={`min-h-screen ${currentView !== 'landing' && currentView !== 'discogs' ? 'pb-24' : ''} selection:bg-[#dd6e42]/30 relative overflow-x-hidden`}>
      <SEO
        title="My Collection"
        description="Browse and manage your vinyl record collection."
      />
      {!isSupabaseReady && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-[10px] py-1 text-center font-bold tracking-widest uppercase">
          Missing Supabase Configuration - Data will not persist
        </div>
      )}

      {/* Cinematic Background Layer */}
      <div className="fixed inset-0 z-[-1] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-[3000ms] ease-in-out opacity-20 scale-110 blur-[80px] animate-[ken-burns_60s_linear_infinite]"
          style={{ backgroundImage: `url(${proxyImageUrl(heroBg) || heroBg})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-th-bg via-transparent to-th-bg"></div>
      </div>

      <header className="sticky top-0 z-40 glass-morphism border-b border-th-surface/[0.10] px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between md:justify-start gap-3">
            <button
              onClick={resetView}
              aria-label="Rekkrd home"
              title="Home / Reset Filters"
              className="w-10 h-10 bg-gradient-to-tr from-[#dd6e42] to-[#4f6d7a] rounded-lg flex items-center justify-center shadow-lg neon-border cursor-pointer active:scale-90 transition-transform flex-shrink-0 border-none p-0"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                {/* Vinyl disc */}
                <circle cx="12" cy="12" r="11" fill="#f0a882"/>
                {/* Grooves */}
                <circle cx="12" cy="12" r="9.5" fill="none" stroke="#d48a6a" strokeWidth="0.4" opacity="0.5"/>
                <circle cx="12" cy="12" r="8" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.4"/>
                <circle cx="12" cy="12" r="6.5" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.3"/>
                {/* Center label */}
                <circle cx="12" cy="12" r="5.2" fill="#c45a30"/>
                {/* R letter */}
                <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#f0a882">R</text>
              </svg>
            </button>
            {currentView !== 'landing' && (
              <h1 className="font-label text-lg md:text-2xl font-bold tracking-tighter text-th-text truncate">
                REKK<span className="text-[#c45a30]">R</span>D
              </h1>
            )}
          </div>

          {currentView !== 'landing' && currentView !== 'stakkd' && currentView !== 'discogs' && <div className="flex-1 max-w-xl flex items-center gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className={`hidden md:flex p-3 rounded-full border transition-all flex-shrink-0 ${showStats ? 'bg-[#dd6e42] border-[#dd6e42] text-th-text shadow-lg' : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text2 hover:text-th-text'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search crate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50 transition-all placeholder:text-th-text3/50"
              />
              <svg className="absolute left-3.5 top-3 w-4 h-4 text-th-text3/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setCurrentView(currentView === 'list' ? 'grid' : 'list')}
              className={`p-3 rounded-full border transition-all flex-shrink-0 ${currentView === 'list' ? 'bg-[#dd6e42] border-[#dd6e42] text-th-text shadow-lg' : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text2 hover:text-th-text'}`}
              title={currentView === 'list' ? 'Switch to grid view' : 'Switch to list view'}
            >
              {currentView === 'list' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setCurrentView('stakkd')}
              className={`hidden md:flex p-3 rounded-full border transition-all flex-shrink-0 ${currentView === 'stakkd' ? 'bg-[#dd6e42] border-[#dd6e42] text-th-text shadow-lg' : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text2 hover:text-th-text'}`}
              title="Stakkd — your gear"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                {/* Speaker outline icon */}
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <circle cx="12" cy="14" r="4" />
                <circle cx="12" cy="6" r="2" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentView('discogs')}
              className={`hidden md:flex p-3 rounded-full border transition-all flex-shrink-0 ${currentView === 'discogs' ? 'bg-[#dd6e42] border-[#dd6e42] text-th-text shadow-lg' : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text2 hover:text-th-text'}`}
              title="Browse Discogs"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2a10 10 0 0 1 7.07 2.93" />
                <path d="M12 6a6 6 0 0 1 4.24 1.76" />
              </svg>
            </button>
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`hidden md:flex p-3 rounded-full border transition-all flex-shrink-0 ${isFilterPanelOpen ? 'bg-[#dd6e42] border-[#dd6e42] text-th-text shadow-lg' : 'bg-th-surface/[0.04] border-th-surface/[0.10] text-th-text2 hover:text-th-text'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>}

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Plan Badge */}
            <div className="relative">
              <PlanBadge albumCount={albums.length} onUpgrade={() => setUpgradeFeature('plan_upgrade')} />
            </div>

            {/* Blog */}
            <Link
              to="/blog"
              className="p-2 rounded-full text-th-text3/70 hover:text-th-text2 hover:bg-th-surface/[0.04] transition-all"
              title="Blog"
              aria-label="Blog"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-th-text3/70 hover:text-th-text2 hover:bg-th-surface/[0.04] transition-all"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>

            <button
              onClick={signOut}
              className="p-2 rounded-full text-th-text3/70 hover:text-th-text2 hover:bg-th-surface/[0.04] transition-all"
              title="Sign out"
              aria-label="Sign out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <SubscriptionBanner onUpgrade={() => setUpgradeFeature('plan_upgrade')} />

      {showStats && !loading && albums.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 mt-6 animate-in slide-in-from-top duration-500">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="glass-morphism p-4 md:p-6 rounded-3xl border border-th-surface/[0.10]">
              <p className="text-[9px] font-label text-th-text3 tracking-widest uppercase mb-1">Crate Count</p>
              <h3 className="text-3xl md:text-4xl font-bold text-th-text">{stats.total}</h3>
            </div>
            <div className="glass-morphism p-4 md:p-6 rounded-3xl border border-th-surface/[0.10]">
              <p className="text-[9px] font-label text-[#f0a882]/60 tracking-widest uppercase mb-1">Portfolio Value</p>
              <h3 className="text-3xl md:text-4xl font-bold text-[#f0a882]">${stats.portfolioValue.toLocaleString()}</h3>
            </div>
            <div className="glass-morphism p-4 md:p-6 rounded-3xl border border-th-surface/[0.10]">
              <p className="text-[9px] font-label text-th-text3 tracking-widest uppercase mb-1">Top Vibe</p>
              <h3 className="text-lg md:text-xl font-bold text-th-text truncate">{stats.topGenre?.[0] || 'Mixed'}</h3>
            </div>
            <div className="hidden lg:block glass-morphism p-6 rounded-3xl border border-th-surface/[0.10]">
              <p className="text-[9px] font-label text-th-text3 tracking-widest uppercase mb-1">Era Spotlight</p>
              <h3 className="text-xl font-bold text-th-text">{stats.topDecade?.[0] || 'N/A'}</h3>
            </div>
          </div>
        </div>
      )}

      {isFilterPanelOpen && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 mt-4">
          <div className="glass-morphism rounded-3xl p-6 border border-th-surface/[0.10] animate-in slide-in-from-top duration-300">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h4 className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-3">Sort Collection</h4>
                <div className="flex flex-wrap gap-2">
                  {(['recent', 'year', 'artist', 'value'] as const).map(opt => (
                    <button key={opt} onClick={() => setSortBy(opt)} className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest transition-all ${sortBy === opt ? 'bg-[#dd6e42] text-th-text' : 'bg-th-surface/[0.04] text-th-text3'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-th-text3 font-label text-[9px] tracking-widest uppercase mb-3">Release Era</h4>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="From" value={yearRange.min} onChange={(e) => setYearRange(prev => ({ ...prev, min: e.target.value }))} className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#dd6e42]" />
                  <span className="text-th-text3/50">—</span>
                  <input type="number" placeholder="To" value={yearRange.max} onChange={(e) => setYearRange(prev => ({ ...prev, max: e.target.value }))} className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#dd6e42]" />
                </div>
              </div>
              <div className="flex items-end">
                <button role="switch" aria-checked={favoritesOnly} aria-label="Show favorites only" onClick={() => setFavoritesOnly(!favoritesOnly)} className="flex items-center gap-3 cursor-pointer group bg-transparent border-none p-0 outline-none focus-visible:ring-2 focus-visible:ring-[#dd6e42] rounded-full">
                  <div className={`w-10 h-5 rounded-full transition-all relative border border-th-surface/[0.10] ${favoritesOnly ? 'bg-[#c45a30]' : 'bg-th-surface/[0.04]'}`}>
                    <div className={`absolute top-0.5 w-3.5 h-3.5 bg-th-text rounded-full transition-all ${favoritesOnly ? 'left-5.5' : 'left-1'}`}></div>
                  </div>
                  <span className="text-xs text-th-text2 group-hover:text-th-text">Favorites Only</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {processingStatus && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-th-bg/80 backdrop-blur-md">
          <SpinningRecord size="w-64 h-64 md:w-96 md:h-96" />
          <div className="mt-8 md:mt-12 text-center px-6">
            <p className={`font-label ${processingStatus === 'Already Cataloged!' ? 'text-[#6a8c9a]' : 'text-[#dd6e42]'} text-xl md:text-2xl font-bold animate-pulse tracking-[0.3em] uppercase transition-colors duration-500`}>
              {processingStatus}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <SpinningRecord size="w-40 h-40" />
          <p className="font-label text-[10px] tracking-widest mt-8 text-th-text3 uppercase">SYNCING COLLECTION</p>
        </div>
      ) : currentView === 'landing' ? (
        <main className="relative max-w-5xl mx-auto px-4 md:px-6 pb-32 md:pb-0 min-h-[calc(100vh-80px)] flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden">
          {/* Spinning vinyl record background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
            <svg
              className="animate-spin-vinyl w-[600px] h-[600px] md:w-[750px] md:h-[750px] opacity-[0.04] text-th-text"
              viewBox="0 0 400 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer disc */}
              <circle cx="200" cy="200" r="195" fill="currentColor" />
              <circle cx="200" cy="200" r="195" stroke="currentColor" strokeWidth="2" />

              {/* Grooves */}
              {[175, 165, 155, 145, 135, 125, 115, 105, 95, 85, 78, 71].map((r) => (
                <circle key={r} cx="200" cy="200" r={r} stroke="currentColor" strokeWidth="0.8" opacity="0.3" className="text-th-bg" />
              ))}

              {/* Groove highlight arcs — gives depth */}
              {[170, 150, 130, 110, 90].map((r) => (
                <circle key={`h-${r}`} cx="200" cy="200" r={r} stroke="currentColor" strokeWidth="0.3" opacity="0.15" />
              ))}

              {/* Center label */}
              <circle cx="200" cy="200" r="58" fill="#dd6e42" opacity="0.6" />
              <circle cx="200" cy="200" r="56" stroke="currentColor" strokeWidth="0.5" opacity="0.2" className="text-th-bg" />

              {/* Label details */}
              <circle cx="200" cy="200" r="45" stroke="currentColor" strokeWidth="0.3" opacity="0.15" className="text-th-bg" />
              <circle cx="200" cy="200" r="35" stroke="currentColor" strokeWidth="0.3" opacity="0.1" className="text-th-bg" />

              {/* Spindle hole */}
              <circle cx="200" cy="200" r="6" fill="currentColor" className="text-th-bg" />
              <circle cx="200" cy="200" r="8" stroke="currentColor" strokeWidth="0.5" opacity="0.3" className="text-th-bg" />
            </svg>
          </div>

          <div className="text-center mb-12 md:mb-16 relative z-10">
            <h2 className="font-label text-3xl md:text-5xl font-bold tracking-tight text-th-text mb-3">
              REKK<span className="text-[#c45a30]">R</span>D
            </h2>
            <p className="text-th-text3/70 text-sm md:text-base tracking-wide">
              {albums.length > 0 ? 'Your vinyl archive awaits' : 'Scan your first record to start your archive'}
            </p>
          </div>

          <div className={`relative z-10 grid grid-cols-1 ${albums.length > 0 ? 'sm:grid-cols-2 lg:grid-cols-4 max-w-4xl' : 'sm:grid-cols-2 max-w-lg'} gap-4 md:gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700`}>
            {albums.length > 0 && (
              <>
                {/* Browse Collection */}
                <button
                  onClick={() => setCurrentView('grid')}
                  className="glass-morphism rounded-3xl p-6 md:p-8 text-left group hover:border-[#dd6e42]/30 hover:bg-[#dd6e42]/5 transition-all duration-300 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#dd6e42]/10 flex items-center justify-center mb-5 group-hover:bg-[#dd6e42]/20 transition-colors">
                    <svg className="w-6 h-6 text-[#dd6e42]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <h3 className="font-label text-[10px] md:text-xs tracking-widest uppercase font-bold text-th-text mb-2">Browse Crate</h3>
                  <p className="text-th-text3/70 text-xs leading-relaxed">Visual grid of your vinyl — search, filter, and explore covers.</p>
                </button>

                {/* Collection List */}
                <button
                  onClick={() => setCurrentView('list')}
                  className="glass-morphism rounded-3xl p-6 md:p-8 text-left group hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-300 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 transition-colors">
                    <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <h3 className="font-label text-[10px] md:text-xs tracking-widest uppercase font-bold text-th-text mb-2">Collection List</h3>
                  <p className="text-th-text3/70 text-xs leading-relaxed">Sortable table view — sort by title, artist, year, value, and more.</p>
                </button>

                {/* Spin a Playlist */}
                <button
                  onClick={() => {
                    if (!canUse('playlist')) {
                      setUpgradeFeature('playlist');
                      return;
                    }
                    setIsStudioOpen(true);
                  }}
                  className="glass-morphism rounded-3xl p-6 md:p-8 text-left group hover:border-[#dd6e42]/30 hover:bg-[#dd6e42]/5 transition-all duration-300 cursor-pointer relative"
                >
                  {!canUse('playlist') && (
                    <span className="absolute top-4 right-4 text-[8px] font-label tracking-widest uppercase bg-th-accent/20 text-th-accent px-2 py-0.5 rounded-full">Curator</span>
                  )}
                  <div className="w-12 h-12 rounded-2xl bg-[#dd6e42]/10 flex items-center justify-center mb-5 group-hover:bg-[#dd6e42]/20 transition-colors">
                    <svg className="w-6 h-6 text-[#dd6e42]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                  </div>
                  <h3 className="font-label text-[10px] md:text-xs tracking-widest uppercase font-bold text-th-text mb-2">Spin a Playlist</h3>
                  <p className="text-th-text3/70 text-xs leading-relaxed">Let AI curate a session from your collection based on mood.</p>
                </button>
              </>
            )}

            {/* Scan a Record */}
            <button
              onClick={() => setIsCameraOpen(true)}
              className="glass-morphism rounded-3xl p-6 md:p-8 text-left group hover:border-[#6a8c9a]/30 hover:bg-[#6a8c9a]/5 transition-all duration-300 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#6a8c9a]/10 flex items-center justify-center mb-5 group-hover:bg-[#6a8c9a]/20 transition-colors">
                <svg className="w-6 h-6 text-[#6a8c9a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-label text-[10px] md:text-xs tracking-widest uppercase font-bold text-th-text mb-2">Scan a Record</h3>
              <p className="text-th-text3/70 text-xs leading-relaxed">Snap a cover photo to identify and catalog a new album.</p>
            </button>

            {/* Browse Discogs */}
            <button
              onClick={() => setCurrentView('discogs')}
              className="glass-morphism rounded-3xl p-6 md:p-8 text-left group hover:border-[#4f6d7a]/30 hover:bg-[#4f6d7a]/5 transition-all duration-300 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#4f6d7a]/10 flex items-center justify-center mb-5 group-hover:bg-[#4f6d7a]/20 transition-colors">
                <svg className="w-6 h-6 text-[#4f6d7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2a10 10 0 0 1 7.07 2.93" />
                  <path d="M12 6a6 6 0 0 1 4.24 1.76" />
                </svg>
              </div>
              <h3 className="font-label text-[10px] md:text-xs tracking-widest uppercase font-bold text-th-text mb-2">Browse Discogs</h3>
              <p className="text-th-text3/70 text-xs leading-relaxed">Search the Discogs database for releases, labels, and artists.</p>
            </button>

            {/* Upload a Cover — shown when crate is empty */}
            {albums.length === 0 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="glass-morphism rounded-3xl p-6 md:p-8 text-left group hover:border-[#6a8c9a]/30 hover:bg-[#6a8c9a]/5 transition-all duration-300 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#6a8c9a]/10 flex items-center justify-center mb-5 group-hover:bg-[#6a8c9a]/20 transition-colors">
                  <svg className="w-6 h-6 text-[#6a8c9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <h3 className="font-label text-[10px] md:text-xs tracking-widest uppercase font-bold text-th-text mb-2">Upload Cover</h3>
                <p className="text-th-text3/70 text-xs leading-relaxed">Pick an album cover photo from your device.</p>
              </button>
            )}
          </div>

          {/* Stakkd Banner */}
          <div
            className="relative z-10 mt-6 w-full flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ animationDelay: '150ms' }}
          >
            <div
              role="button"
              tabIndex={0}
              aria-label="Open Stakkd — your audio gear catalog"
              onClick={() => setCurrentView('stakkd')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentView('stakkd'); } }}
              className="flex flex-col items-center gap-4 px-8 py-6 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(221,110,66,0.12)] border group"
              style={{ maxWidth: 500, background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              {/* Illustration row: speaker — receiver — speaker */}
              <div className="flex items-center justify-center gap-3 relative scale-[0.65] sm:scale-100 origin-center">
                {/* Left Speaker */}
                <svg width="80" height="100" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  {/* Cabinet */}
                  <rect x="8" y="4" width="58" height="92" rx="6" stroke="#c0d6df" strokeWidth="1.5" />
                  {/* Right edge shadow */}
                  <line x1="66" y1="12" x2="66" y2="88" stroke="#c0d6df" strokeWidth="0.5" opacity="0.3" />
                  <line x1="68" y1="14" x2="68" y2="86" stroke="#c0d6df" strokeWidth="0.3" opacity="0.15" />
                  {/* Wood grain lines */}
                  <line x1="12" y1="20" x2="12" y2="80" stroke="#c0d6df" strokeWidth="0.4" opacity="0.2" />
                  <line x1="62" y1="15" x2="62" y2="85" stroke="#c0d6df" strokeWidth="0.4" opacity="0.2" />
                  {/* Tweeter */}
                  <circle cx="37" cy="24" r="10" stroke="#c0d6df" strokeWidth="1.5" />
                  <circle cx="37" cy="24" r="6" stroke="#c0d6df" strokeWidth="0.8" opacity="0.5" />
                  <circle cx="37" cy="24" r="2.5" fill="#dd6e42" opacity="0.4" />
                  {/* Woofer */}
                  <circle cx="37" cy="62" r="22" stroke="#c0d6df" strokeWidth="1.5" />
                  <circle cx="37" cy="62" r="17" stroke="#c0d6df" strokeWidth="0.8" opacity="0.4" />
                  <circle cx="37" cy="62" r="11" stroke="#c0d6df" strokeWidth="0.6" opacity="0.3" />
                  <circle cx="37" cy="62" r="5" stroke="#c0d6df" strokeWidth="1" opacity="0.5" />
                  <circle cx="37" cy="62" r="2" fill="#c0d6df" opacity="0.3" />
                  {/* Port hole */}
                  <rect x="30" y="88" width="14" height="4" rx="2" stroke="#c0d6df" strokeWidth="0.8" opacity="0.4" />
                </svg>

                {/* Dashed connection line — left */}
                <svg width="16" height="4" viewBox="0 0 16 4" aria-hidden="true" className="opacity-40">
                  <line x1="0" y1="2" x2="16" y2="2" stroke="#c0d6df" strokeWidth="1" strokeDasharray="3 2" />
                </svg>

                {/* Center Receiver */}
                <svg width="200" height="80" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  {/* Main chassis */}
                  <rect x="4" y="8" width="192" height="64" rx="4" stroke="#c0d6df" strokeWidth="1.5" />
                  {/* Top vent slits */}
                  {[40, 65, 90, 115, 140, 160].map((x) => (
                    <line key={x} x1={x} y1="12" x2={x + 18} y2="12" stroke="#c0d6df" strokeWidth="0.6" opacity="0.25" />
                  ))}
                  {/* Rack handles */}
                  <rect x="8" y="30" width="4" height="20" rx="2" stroke="#c0d6df" strokeWidth="1" opacity="0.4" />
                  <rect x="188" y="30" width="4" height="20" rx="2" stroke="#c0d6df" strokeWidth="1" opacity="0.4" />
                  {/* Display window */}
                  <rect x="28" y="20" width="144" height="24" rx="3" stroke="#c0d6df" strokeWidth="1" opacity="0.5" />
                  <rect x="30" y="22" width="140" height="20" rx="2" fill="#c0d6df" opacity="0.04" />
                  {/* STAKKD text in display */}
                  <text x="100" y="36" textAnchor="middle" dominantBaseline="central" fontFamily="'Space Mono', monospace" fontWeight="700" fontSize="14" letterSpacing="0.15em" fill="#dd6e42">STAKKD</text>
                  {/* Power LED */}
                  <circle cx="24" cy="58" r="2.5" fill="#dd6e42" opacity="0.8" />
                  <circle cx="24" cy="58" r="4" stroke="#dd6e42" strokeWidth="0.4" opacity="0.3" />
                  {/* Knobs row */}
                  {[55, 80, 105, 130, 155].map((x) => (
                    <g key={x}>
                      <circle cx={x} cy="58" r="5" stroke="#c0d6df" strokeWidth="1" opacity="0.5" />
                      <line x1={x} y1="53" x2={x} y2="56" stroke="#c0d6df" strokeWidth="0.8" opacity="0.4" />
                    </g>
                  ))}
                  {/* Bottom edge shadow */}
                  <line x1="8" y1="72" x2="192" y2="72" stroke="#c0d6df" strokeWidth="0.4" opacity="0.15" />
                </svg>

                {/* Dashed connection line — right */}
                <svg width="16" height="4" viewBox="0 0 16 4" aria-hidden="true" className="opacity-40">
                  <line x1="0" y1="2" x2="16" y2="2" stroke="#c0d6df" strokeWidth="1" strokeDasharray="3 2" />
                </svg>

                {/* Right Speaker (mirrored) */}
                <svg width="80" height="100" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ transform: 'scaleX(-1)' }}>
                  {/* Cabinet */}
                  <rect x="8" y="4" width="58" height="92" rx="6" stroke="#c0d6df" strokeWidth="1.5" />
                  {/* Right edge shadow */}
                  <line x1="66" y1="12" x2="66" y2="88" stroke="#c0d6df" strokeWidth="0.5" opacity="0.3" />
                  <line x1="68" y1="14" x2="68" y2="86" stroke="#c0d6df" strokeWidth="0.3" opacity="0.15" />
                  {/* Wood grain lines */}
                  <line x1="12" y1="20" x2="12" y2="80" stroke="#c0d6df" strokeWidth="0.4" opacity="0.2" />
                  <line x1="62" y1="15" x2="62" y2="85" stroke="#c0d6df" strokeWidth="0.4" opacity="0.2" />
                  {/* Tweeter */}
                  <circle cx="37" cy="24" r="10" stroke="#c0d6df" strokeWidth="1.5" />
                  <circle cx="37" cy="24" r="6" stroke="#c0d6df" strokeWidth="0.8" opacity="0.5" />
                  <circle cx="37" cy="24" r="2.5" fill="#dd6e42" opacity="0.4" />
                  {/* Woofer */}
                  <circle cx="37" cy="62" r="22" stroke="#c0d6df" strokeWidth="1.5" />
                  <circle cx="37" cy="62" r="17" stroke="#c0d6df" strokeWidth="0.8" opacity="0.4" />
                  <circle cx="37" cy="62" r="11" stroke="#c0d6df" strokeWidth="0.6" opacity="0.3" />
                  <circle cx="37" cy="62" r="5" stroke="#c0d6df" strokeWidth="1" opacity="0.5" />
                  <circle cx="37" cy="62" r="2" fill="#c0d6df" opacity="0.3" />
                  {/* Port hole */}
                  <rect x="30" y="88" width="14" height="4" rx="2" stroke="#c0d6df" strokeWidth="0.8" opacity="0.4" />
                </svg>
              </div>

              {/* Tagline */}
              <p className="text-[#7d9199] text-xs tracking-[0.1em] uppercase font-label">Your audio gear, identified</p>
            </div>
          </div>

          {albums.length > 0 && (
            <div className="relative z-10 mt-10 flex items-center gap-4">
              <p className="text-th-text3/50 text-xs font-label tracking-widest uppercase">{albums.length} records in your crate</p>
              {albums.some(a => a.isFavorite) && (
                <button
                  onClick={() => { setFavoritesOnly(true); setCurrentView('list'); }}
                  className="flex items-center gap-1.5 text-[#dd6e42]/60 hover:text-[#dd6e42] transition-colors group"
                  title="View favorites"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <span className="text-xs font-label tracking-widest uppercase">{albums.filter(a => a.isFavorite).length}</span>
                </button>
              )}
            </div>
          )}
        </main>
      ) : currentView === 'list' ? (
        <CollectionList
          albums={albums}
          onSelect={setSelectedAlbum}
          onDelete={handleDelete}
          onToggleFavorite={handleToggleFavorite}
          favoritesOnly={favoritesOnly}
          onToggleFavoritesFilter={() => setFavoritesOnly(prev => !prev)}
          searchQuery={searchQuery}
        />
      ) : currentView === 'stakkd' ? (
        <StakkdPage onUpgradeRequired={(feature: string) => setUpgradeFeature(feature)} />
      ) : currentView === 'discogs' ? (
        <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8 space-y-8 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-label text-lg md:text-xl tracking-widest uppercase font-bold text-th-text">Browse Discogs</h2>
              <p className="text-th-text3/60 text-sm mt-1">Search the world's largest music database</p>
            </div>
            <div className="w-full sm:w-72">
              <DiscogsConnect />
            </div>
          </div>
          <DiscogsSearch onSelectResult={(result) => setDiscogsReleaseId(result.id)} />
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8">
          {albums.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center px-6">
              <div className="w-20 h-20 mb-6 opacity-20 text-th-text">
                <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>
              </div>
              <h2 className="text-th-text2 font-label tracking-widest text-lg uppercase mb-2">CRATE IS EMPTY</h2>
              <p className="text-th-text3/70 text-sm max-w-xs">Scan your first record cover to begin your digital archive.</p>
            </div>
          ) : filteredAlbums.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center px-6">
              <svg className="w-16 h-16 text-th-text3/30 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h2 className="text-th-text2 font-label tracking-widest text-lg uppercase mb-2">No Matches</h2>
              <p className="text-th-text3/70 text-sm max-w-xs">No albums match your current filters. Try adjusting your search or clearing filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
                {paginatedAlbums.map(album => (
                  <AlbumCard key={album.id} album={album} onDelete={handleDelete} onSelect={setSelectedAlbum} />
                ))}
              </div>
              <Pagination
                currentPage={gridPage}
                totalPages={gridTotalPages}
                totalItems={filteredAlbums.length}
                pageSize={PAGE_SIZE}
                onPageChange={setGridPage}
              />
            </>
          )}
        </main>
      )}

      {currentView !== 'landing' && currentView !== 'stakkd' && currentView !== 'discogs' && (
        <div className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-4 z-50 w-full px-4 justify-center">
          <button
            onClick={() => {
              if (!canUse('playlist')) {
                setUpgradeFeature('playlist');
                return;
              }
              setIsStudioOpen(true);
            }}
            className="bg-th-surface/[0.08] backdrop-blur-md hover:bg-[#dd6e42]/20 text-th-text font-bold p-4 md:p-5 rounded-full shadow-2xl transition-all border border-th-surface/[0.15] group flex-shrink-0 relative"
            title="Magic Mix Studio"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </button>

          <button
            onClick={() => {
              if (!canUse('scan')) {
                setUpgradeFeature('scan');
                return;
              }
              setIsCameraOpen(true);
            }}
            className="bg-gradient-to-r from-[#c45a30] to-[#4f6d7a] hover:from-[#dd6e42] hover:to-[#6a8c9a] text-[#e8e2d6] font-bold py-3.5 px-6 md:py-4 md:px-10 rounded-full shadow-2xl transition-all transform hover:scale-105 flex items-center gap-2 md:gap-3 group border border-th-surface/[0.15] relative"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-label tracking-[0.2em] text-[9px] md:text-xs whitespace-nowrap">SCAN COVER</span>
            {scansRemaining !== null && (
              <span className="absolute -top-2 -right-2 bg-th-accent text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {scansRemaining}
              </span>
            )}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-th-surface/[0.08] backdrop-blur-md hover:bg-[#4f6d7a]/20 text-th-text font-bold p-4 md:p-5 rounded-full shadow-2xl transition-all border border-th-surface/[0.15] group flex-shrink-0"
            title="Upload Album Cover"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {isCameraOpen && <CameraModal onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
      {isStudioOpen && <PlaylistStudio albums={albums} onClose={() => setIsStudioOpen(false)} />}
      {selectedAlbum && (
        <AlbumDetailModal
          album={selectedAlbum}
          allAlbums={albums}
          onClose={() => setSelectedAlbum(null)}
          onUpdateTags={(id, tags) => handleUpdateAlbum(id, { tags })}
          onToggleFavorite={handleToggleFavorite}
          onSelectAlbum={setSelectedAlbum}
          onUpdateAlbum={handleUpdateAlbum}
          canUseLyrics={canUse('lyrics')}
          canUseCovers={canUse('covers')}
          onUpgradeRequired={(feature: string) => setUpgradeFeature(feature)}
        />
      )}
      {upgradeFeature && (
        <UpgradeModal
          isOpen={!!upgradeFeature}
          onClose={() => setUpgradeFeature(null)}
          feature={upgradeFeature}
        />
      )}
      {duplicatePending && (
        <DuplicateAlbumModal
          existingAlbum={duplicatePending.existingAlbum}
          onAddAnyway={handleDuplicateAddAnyway}
          onCancel={handleDuplicateCancel}
        />
      )}
      {discogsReleaseId !== null && (
        <DiscogsReleaseDetail
          releaseId={discogsReleaseId}
          onClose={() => setDiscogsReleaseId(null)}
        />
      )}
    </div>
  );
};

export default App;
