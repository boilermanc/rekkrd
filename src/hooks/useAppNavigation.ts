import { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Album } from '../types';

export type ViewMode =
  | 'public-landing' | 'landing' | 'grid' | 'list'
  | 'stakkd' | 'discogs' | 'wantlist' | 'value-dashboard'
  | 'profile' | 'price-alerts' | 'spins' | 'shelves'
  | 'bulk-import' | 'analytics';

export function useAppNavigation(user: User | null) {
  const [currentView, setCurrentView] = useState<ViewMode>(
    () => (sessionStorage.getItem('rekkrd-view') as ViewMode) || 'public-landing'
  );
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  // Persist current view to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('rekkrd-view', currentView);
  }, [currentView]);

  // Reset view to public-landing on sign-out so the next login
  // always lands on the app home instead of a stale page.
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (prevUserRef.current && !user) {
      sessionStorage.removeItem('rekkrd-view');
      setCurrentView('public-landing');
    }
    prevUserRef.current = user;
  }, [user]);

  return {
    currentView,
    setCurrentView,
    selectedAlbum,
    setSelectedAlbum,
  };
}
