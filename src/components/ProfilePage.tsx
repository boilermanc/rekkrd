import React, { useState, useEffect, useRef } from 'react';
import {
  Disc3, Heart, ClipboardList, Calendar, Pencil, ChevronRight, User, Lock, Link2,
  AlertTriangle, Crown, Gem, Sparkles, Headphones, Music, Tv, Trophy,
  TrendingUp, Mail, Eye, EyeOff, Check, Bell, LogOut, Trash2,
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getProfile, updateProfile, type Profile } from '../services/profileService';
import DiscogsConnect from './DiscogsConnect';
import { wantlistService } from '../services/wantlistService';
import { supabase } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';
import type { Plan } from '../services/subscriptionService';

// ── Shared constants (mirrored from OnboardingWizard, self-contained) ──

const GENRE_OPTIONS = [
  'Rock', 'Jazz', 'Blues', 'Soul', 'Funk', 'Hip-Hop', 'Electronic', 'Classical',
  'Country', 'Pop', 'R&B', 'Reggae', 'Metal', 'Folk', 'Latin', 'Punk', 'Indie',
  'Soundtrack', 'World', 'Gospel',
] as const;

const SETUP_OPTIONS = [
  { id: 'audiophile', label: 'Audiophile', Icon: Headphones },
  { id: 'casual', label: 'Casual', Icon: Music },
  { id: 'dj', label: 'DJ / Mixer', Icon: Disc3 },
  { id: 'home-theater', label: 'Home Theater', Icon: Tv },
  { id: 'all', label: 'All of the above', Icon: Sparkles },
] as const;

const GOAL_OPTIONS = [
  { id: 'enjoyment', label: 'Pure Enjoyment', Icon: Heart },
  { id: 'completionist', label: 'Completionist', Icon: Trophy },
  { id: 'investment', label: 'Investment', Icon: TrendingUp },
] as const;

// ── Small helper components ──

interface GenreChipGridProps {
  selected: string[];
  onToggle: (genre: string) => void;
}

const GenreChipGrid: React.FC<GenreChipGridProps> = ({ selected, onToggle }) => (
  <div className="flex flex-wrap gap-2">
    {GENRE_OPTIONS.map(genre => {
      const isSelected = selected.includes(genre);
      return (
        <button
          key={genre}
          type="button"
          onClick={() => onToggle(genre)}
          className={`rounded-full px-4 py-2 text-sm transition-all cursor-pointer border ${
            isSelected
              ? 'bg-[#dd6e42]/20 border-[#dd6e42] text-[#dd6e42]'
              : 'glass-morphism text-th-text3 border-white/10'
          }`}
        >
          {genre}
        </button>
      );
    })}
  </div>
);

interface IconCardGridProps {
  options: ReadonlyArray<{ id: string; label: string; Icon: React.FC<{ size?: number; className?: string }> }>;
  selected: string;
  onSelect: (id: string) => void;
  columns: 2 | 3;
}

const IconCardGrid: React.FC<IconCardGridProps> = ({ options, selected, onSelect, columns }) => (
  <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
    {options.map(({ id, label, Icon }) => {
      const isSelected = selected === id;
      return (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`glass-morphism rounded-xl p-4 flex flex-col items-center gap-2 transition-all cursor-pointer border ${
            isSelected
              ? 'border-[#dd6e42] bg-[#dd6e42]/10'
              : 'border-white/10'
          }`}
        >
          <Icon size={28} className={isSelected ? 'text-[#dd6e42]' : 'text-th-text3'} />
          <span className={`text-sm ${isSelected ? 'text-th-text' : 'text-th-text3'}`}>{label}</span>
        </button>
      );
    })}
  </div>
);

interface PillToggleProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onToggle: () => void;
}

const PillToggle: React.FC<PillToggleProps> = ({ label, description, icon, checked, onToggle }) => (
  <div className="flex items-center justify-between glass-morphism rounded-xl px-5 py-4 border border-white/10">
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-sm text-th-text">{label}</p>
        <p className="text-xs text-th-text3">{description}</p>
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-none shrink-0 ${
        checked ? 'bg-[#dd6e42]' : 'bg-th-surface/20'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

// ── Edit form state ──

interface EditFormState {
  displayName: string;
  favoriteGenres: string[];
  listeningSetup: string;
  collectingGoal: string;
}

function buildFormState(profile: Profile | null): EditFormState {
  return {
    displayName: profile?.display_name ?? '',
    favoriteGenres: profile?.favorite_genres ?? [],
    listeningSetup: profile?.listening_setup ?? '',
    collectingGoal: profile?.collecting_goal ?? '',
  };
}

// ── Main component ──

interface ProfilePageProps {
  userId: string;
  albumCount: number;
  onClose: () => void;
}

function getInitials(name: string | null): string {
  if (!name?.trim()) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  return `Member since ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}

const PLAN_CONFIG: Record<Plan, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  collector: {
    label: 'Collector',
    color: 'text-th-text3',
    bg: 'bg-th-surface/[0.08]',
    border: 'border-th-surface/[0.15]',
    icon: <Disc3 className="w-5 h-5" />,
  },
  curator: {
    label: 'Curator',
    color: 'text-[#6a8c9a]',
    bg: 'bg-[#4f6d7a]/15',
    border: 'border-[#4f6d7a]/25',
    icon: <Crown className="w-5 h-5" />,
  },
  enthusiast: {
    label: 'Archivist',
    color: 'text-[#f0a882]',
    bg: 'bg-[#dd6e42]/10',
    border: 'border-[#dd6e42]/25',
    icon: <Gem className="w-5 h-5" />,
  },
};

const ProfilePage: React.FC<ProfilePageProps> = ({ userId, albumCount, onClose }) => {
  const { user } = useAuthContext();
  const { showToast } = useToast();
  const {
    plan, status, isTrialing, isPastDue,
    scansUsed, scansLimit, albumLimit,
    hasStripeCustomer,
  } = useSubscription();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [wantlistCount, setWantlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Edit form
  const [form, setForm] = useState<EditFormState>(buildFormState(null));
  const [saving, setSaving] = useState(false);

  // Discogs connection
  const [discogsMode, setDiscogsMode] = useState(false);

  // Email preferences
  const [emailMode, setEmailMode] = useState(false);
  const [emailDigestOptin, setEmailDigestOptin] = useState(false);
  const [emailUpdatesOptin, setEmailUpdatesOptin] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  // Password change
  const [passwordMode, setPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Danger zone
  const [dangerMode, setDangerMode] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Section refs for scroll-into-view
  const passwordRef = useRef<HTMLElement>(null);
  const discogsRef = useRef<HTMLElement>(null);
  const emailRef = useRef<HTMLElement>(null);
  const dangerRef = useRef<HTMLElement>(null);

  // Auto-cancel delete confirmation after 5 seconds
  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = setTimeout(() => setConfirmingDelete(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [profileData, wantlist] = await Promise.all([
          getProfile(userId),
          wantlistService.getWantlist(),
        ]);
        if (!cancelled) {
          setProfile(profileData);
          setWantlistCount(wantlist.length);
          setForm(buildFormState(profileData));
          setEmailDigestOptin(profileData?.email_digest_optin ?? false);
          setEmailUpdatesOptin(profileData?.email_updates_optin ?? false);
        }
      } catch (err) {
        console.error('Failed to load profile data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [userId]);

  const closeAllSections = () => {
    setEditMode(false);
    setPasswordMode(false);
    setDiscogsMode(false);
    setEmailMode(false);
    setDangerMode(false);
    setConfirmingDelete(false);
  };

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const enterEditMode = () => {
    closeAllSections();
    setForm(buildFormState(profile));
    setEditMode(true);
  };

  const cancelEdit = () => {
    setForm(buildFormState(profile));
    setEditMode(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(userId, {
        display_name: form.displayName.trim() || null,
        favorite_genres: form.favoriteGenres.length > 0 ? form.favoriteGenres : null,
        listening_setup: form.listeningSetup || null,
        collecting_goal: form.collectingGoal || null,
      });

      // Re-fetch to get the server-side updated_at
      const updated = await getProfile(userId);
      if (updated) {
        setProfile(updated);
        setForm(buildFormState(updated));
      }

      setEditMode(false);
      showToast('Profile updated', 'success');
    } catch (err) {
      console.error('Failed to save profile:', err);
      showToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setForm(prev => ({
      ...prev,
      favoriteGenres: prev.favoriteGenres.includes(genre)
        ? prev.favoriteGenres.filter(g => g !== genre)
        : [...prev.favoriteGenres, genre],
    }));
  };

  // Password change
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const passwordValid = newPassword.length >= 8 && passwordsMatch;

  const cancelPasswordChange = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordMode(false);
  };

  const handlePasswordSave = async () => {
    if (!passwordValid || !supabase) return;
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast('Password updated successfully', 'success');
      cancelPasswordChange();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      console.error('Password update error:', err);
      showToast(message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Email preferences
  const enterEmailMode = () => {
    closeAllSections();
    setEmailDigestOptin(profile?.email_digest_optin ?? false);
    setEmailUpdatesOptin(profile?.email_updates_optin ?? false);
    setEmailMode(true);
  };

  const cancelEmailMode = () => {
    setEmailDigestOptin(profile?.email_digest_optin ?? false);
    setEmailUpdatesOptin(profile?.email_updates_optin ?? false);
    setEmailMode(false);
  };

  const handleEmailPrefsSave = async () => {
    setSavingEmail(true);
    try {
      await updateProfile(userId, {
        email_digest_optin: emailDigestOptin,
        email_updates_optin: emailUpdatesOptin,
      });

      const updated = await getProfile(userId);
      if (updated) {
        setProfile(updated);
        setEmailDigestOptin(updated.email_digest_optin ?? false);
        setEmailUpdatesOptin(updated.email_updates_optin ?? false);
      }

      setEmailMode(false);
      showToast('Preferences saved', 'success');
    } catch (err) {
      console.error('Failed to save email preferences:', err);
      showToast('Failed to save preferences', 'error');
    } finally {
      setSavingEmail(false);
    }
  };

  // Discogs connection change — refresh profile to pick up new discogs fields
  const handleDiscogsConnectionChange = async () => {
    const updated = await getProfile(userId);
    if (updated) setProfile(updated);
  };

  // Sign out
  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // Delete account — two-step confirmation
  const handleDeleteAccount = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    // Second click — actually delete
    setDeleting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
      }

      // Success — sign out and redirect
      if (supabase) await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      console.error('Account deletion error:', err);
      showToast(`${message}. Please contact support if this persists.`, 'error');
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }
      const response = await fetch('/api/customer-portal', {
        method: 'POST',
        headers,
      });
      if (!response.ok) throw new Error('Failed to create portal session');
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (e) {
      console.error('Customer portal error:', e);
    } finally {
      setPortalLoading(false);
    }
  };

  const email = user?.email ?? '';
  const displayName = profile?.display_name ?? '';
  const memberSince = profile?.created_at ? formatMemberSince(profile.created_at) : '';
  const planConfig = PLAN_CONFIG[plan];

  // In edit mode, avatar initials update live from the form
  const liveInitials = editMode ? getInitials(form.displayName) : getInitials(displayName);

  const statusLabel = isPastDue
    ? 'Past Due'
    : isTrialing
      ? 'Trial'
      : status === 'active'
        ? 'Active'
        : status === 'canceled'
          ? 'Canceled'
          : status;

  const statusColor = isPastDue
    ? 'text-amber-400'
    : isTrialing
      ? 'text-[#6a8c9a]'
      : status === 'active'
        ? 'text-emerald-400'
        : 'text-th-text3';

  // Usage bar helpers
  const scansPercent = scansLimit === -1 ? 0 : Math.min((scansUsed / scansLimit) * 100, 100);
  const albumsPercent = albumLimit === -1 ? 0 : Math.min((albumCount / albumLimit) * 100, 100);

  function barColor(pct: number): string {
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-[#dd6e42]';
  }

  const quickLinks = [
    { label: 'Edit Profile', icon: <User className="w-5 h-5" />, action: enterEditMode },
    { label: 'Change Password', icon: <Lock className="w-5 h-5" />, action: () => { closeAllSections(); setPasswordMode(true); scrollTo(passwordRef); } },
    { label: 'Discogs Connection', icon: <Link2 className="w-5 h-5" />, action: () => { closeAllSections(); setDiscogsMode(true); scrollTo(discogsRef); } },
    { label: 'Email Preferences', icon: <Bell className="w-5 h-5" />, action: () => { enterEmailMode(); scrollTo(emailRef); } },
    { label: 'Danger Zone', icon: <AlertTriangle className="w-5 h-5" />, accent: true, action: () => { closeAllSections(); setDangerMode(true); scrollTo(dangerRef); } },
  ];

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col items-center gap-4 py-32">
          <div className="w-12 h-12 rounded-full border-2 border-[#dd6e42] border-t-transparent animate-spin" />
          <p className="text-th-text3 text-sm font-label tracking-widest uppercase">Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
      {/* Back button */}
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 text-th-text3 hover:text-th-text transition-colors text-sm mb-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="font-label text-[10px] tracking-widest uppercase">Back</span>
      </button>

      {/* ── HERO SECTION / EDIT FORM ── */}
      <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-6 md:p-8 relative">
        {editMode ? (
          /* ── EDIT MODE ── */
          <div className="space-y-8">
            {/* Live avatar + display name */}
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#dd6e42] to-[#c4714a] flex items-center justify-center mb-6 shadow-lg">
                <span className="text-white font-bold text-2xl select-none">{liveInitials}</span>
              </div>

              <div className="w-full max-w-sm">
                <label
                  htmlFor="profile-display-name"
                  className="block font-label text-[10px] tracking-widest text-th-text3 uppercase mb-2"
                >
                  Display Name
                </label>
                <input
                  id="profile-display-name"
                  type="text"
                  value={form.displayName}
                  onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value }))}
                  maxLength={50}
                  placeholder="Your name or collector handle"
                  className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-4 py-3 text-sm text-th-text placeholder:text-th-text3/50 focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50 transition-all"
                />
              </div>
            </div>

            {/* Favorite Genres */}
            <div>
              <label className="block font-label text-[10px] tracking-widest text-th-text3 uppercase mb-3">
                What genres do you collect?
              </label>
              <GenreChipGrid selected={form.favoriteGenres} onToggle={toggleGenre} />
            </div>

            {/* Listening Setup */}
            <div>
              <label className="block font-label text-[10px] tracking-widest text-th-text3 uppercase mb-3">
                How do you listen?
              </label>
              <IconCardGrid
                options={SETUP_OPTIONS}
                selected={form.listeningSetup}
                onSelect={id => setForm(prev => ({ ...prev, listeningSetup: id }))}
                columns={2}
              />
            </div>

            {/* Collecting Goal */}
            <div>
              <label className="block font-label text-[10px] tracking-widest text-th-text3 uppercase mb-3">
                What drives your collecting?
              </label>
              <IconCardGrid
                options={GOAL_OPTIONS}
                selected={form.collectingGoal}
                onSelect={id => setForm(prev => ({ ...prev, collectingGoal: id }))}
                columns={3}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="flex-1 rounded-xl border border-th-surface/[0.15] px-4 py-3 text-[10px] font-label tracking-widest uppercase text-th-text2 font-bold hover:bg-th-surface/[0.08] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-[#dd6e42] px-4 py-3 text-[10px] font-label tracking-widest uppercase text-white font-bold hover:bg-[#c45a30] transition-all disabled:opacity-50"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ── VIEW MODE ── */
          <>
            {/* Edit button */}
            <button
              onClick={enterEditMode}
              className="absolute top-5 right-5 p-2 rounded-full text-th-text3/60 hover:text-th-text hover:bg-th-surface/[0.08] transition-all"
              title="Edit profile"
              aria-label="Edit profile"
            >
              <Pencil className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#dd6e42] to-[#c4714a] flex items-center justify-center mb-4 shadow-lg">
                <span className="text-white font-bold text-2xl select-none">{liveInitials}</span>
              </div>

              {/* Name & email */}
              <h2 className="text-2xl font-display text-th-text font-bold">
                {displayName || 'Unnamed Collector'}
              </h2>
              <p className="text-th-text3 text-sm mt-1">{email}</p>

              {/* Stat pills */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <div className="flex items-center gap-2 glass-morphism rounded-full px-4 py-2 border border-th-surface/[0.10]">
                  <Disc3 className="w-4 h-4 text-[#dd6e42]" />
                  <span className="text-[#dd6e42] font-bold text-sm">{albumCount}</span>
                  <span className="text-th-text3 text-xs">Records</span>
                </div>
                <div className="flex items-center gap-2 glass-morphism rounded-full px-4 py-2 border border-th-surface/[0.10]">
                  <ClipboardList className="w-4 h-4 text-[#dd6e42]" />
                  <span className="text-[#dd6e42] font-bold text-sm">{wantlistCount}</span>
                  <span className="text-th-text3 text-xs">Wanted</span>
                </div>
                {memberSince && (
                  <div className="flex items-center gap-2 glass-morphism rounded-full px-4 py-2 border border-th-surface/[0.10]">
                    <Calendar className="w-4 h-4 text-[#dd6e42]" />
                    <span className="text-th-text3 text-xs">{memberSince}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── PLAN SECTION ── */}
      <section className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-6 md:p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${planConfig.bg} ${planConfig.color}`}>
              {planConfig.icon}
            </div>
            <div>
              <h3 className={`text-lg font-bold font-display ${planConfig.color}`}>
                {planConfig.label}
              </h3>
              <p className={`text-xs font-label tracking-widest uppercase ${statusColor}`}>
                {statusLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Usage meters — only show limits for Collector tier */}
        {plan === 'collector' && (
          <div className="space-y-4 mb-6">
            {/* Albums meter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-label text-[9px] tracking-widest uppercase text-th-text3">Albums</span>
                <span className={`text-xs font-bold ${albumsPercent >= 100 ? 'text-red-400' : albumsPercent >= 80 ? 'text-amber-400' : 'text-th-text2'}`}>
                  {albumCount} / {albumLimit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-th-surface/[0.10] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor(albumsPercent)}`}
                  style={{ width: `${albumsPercent}%` }}
                />
              </div>
            </div>

            {/* AI Scans meter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-label text-[9px] tracking-widest uppercase text-th-text3">AI Scans</span>
                <span className={`text-xs font-bold ${scansPercent >= 100 ? 'text-red-400' : scansPercent >= 80 ? 'text-amber-400' : 'text-th-text2'}`}>
                  {scansUsed} / {scansLimit} this month
                </span>
              </div>
              <div className="h-2 rounded-full bg-th-surface/[0.10] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor(scansPercent)}`}
                  style={{ width: `${scansPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {plan !== 'collector' && (
          <div className="flex items-center gap-2 mb-6 text-th-text3 text-sm">
            <Sparkles className="w-4 h-4 text-[#dd6e42]" />
            <span>Unlimited albums & scans</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {hasStripeCustomer || plan === 'enthusiast' ? (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="flex-1 rounded-xl border border-th-surface/[0.15] px-4 py-3 text-[10px] font-label tracking-widest uppercase text-th-text2 font-bold hover:bg-th-surface/[0.08] transition-all disabled:opacity-50"
            >
              {portalLoading ? 'Loading\u2026' : 'Manage Subscription'}
            </button>
          ) : (
            <button
              onClick={handleManageSubscription}
              className="flex-1 rounded-xl bg-[#dd6e42] px-4 py-3 text-[10px] font-label tracking-widest uppercase text-white font-bold hover:bg-[#c45a30] transition-all"
            >
              Upgrade Plan
            </button>
          )}
        </div>
      </section>

      {/* ── PASSWORD CHANGE ── */}
      {passwordMode && (
        <section ref={passwordRef} className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-th-surface/[0.08] text-th-text3">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-display text-th-text">Change Password</h3>
          </div>

          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label
                htmlFor="profile-new-password"
                className="block font-label text-[10px] tracking-widest text-th-text3 uppercase mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="profile-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-4 py-3 pr-11 text-sm text-th-text placeholder:text-th-text3/50 focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-th-text3/60 hover:text-th-text transition-colors"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 8 && (
                <p className="text-xs text-th-text3 mt-1.5">Minimum 8 characters</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="profile-confirm-password"
                className="block font-label text-[10px] tracking-widest text-th-text3 uppercase mb-2"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="profile-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-th-surface/[0.04] border border-th-surface/[0.10] rounded-lg px-4 py-3 pr-11 text-sm text-th-text placeholder:text-th-text3/50 focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-th-text3/60 hover:text-th-text transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-400 mt-1.5">Passwords don't match</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Passwords match
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={cancelPasswordChange}
              disabled={savingPassword}
              className="flex-1 rounded-xl border border-th-surface/[0.15] px-4 py-3 text-[10px] font-label tracking-widest uppercase text-th-text2 font-bold hover:bg-th-surface/[0.08] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePasswordSave}
              disabled={!passwordValid || savingPassword}
              className="flex-1 rounded-xl bg-[#dd6e42] px-4 py-3 text-[10px] font-label tracking-widest uppercase text-white font-bold hover:bg-[#c45a30] transition-all disabled:opacity-50"
            >
              {savingPassword ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating...
                </span>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </section>
      )}

      {/* ── DISCOGS CONNECTION ── */}
      {discogsMode && (
        <section ref={discogsRef} className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-th-surface/[0.08] text-th-text3">
                <Link2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-display text-th-text">Discogs Connection</h3>
            </div>
            <button
              type="button"
              onClick={() => setDiscogsMode(false)}
              className="text-th-text3/60 hover:text-th-text transition-colors text-xs font-label tracking-widest uppercase"
            >
              Close
            </button>
          </div>

          <DiscogsConnect onConnectionChange={handleDiscogsConnectionChange} />

          {profile?.discogs_username && (
            <div className="mt-4 flex flex-wrap gap-2">
              {['Collection Import', 'Wantlist Sync', 'Price Data'].map(label => (
                <span
                  key={label}
                  className="glass-morphism rounded-full text-xs text-th-text3 px-3 py-1 border border-white/10"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── EMAIL PREFERENCES ── */}
      {emailMode && (
        <section ref={emailRef} className="glass-morphism rounded-2xl border border-th-surface/[0.10] p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-th-surface/[0.08] text-th-text3">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-display text-th-text">Email Preferences</h3>
          </div>

          <div className="space-y-3">
            <PillToggle
              label="Monthly Collection Digest"
              description="A monthly summary of your collection, new features, and vinyl highlights"
              icon={<Mail size={20} className="text-[#dd6e42]" />}
              checked={emailDigestOptin}
              onToggle={() => setEmailDigestOptin(prev => !prev)}
            />
            <PillToggle
              label="Product & Feature Updates"
              description="Be the first to know about new features and improvements"
              icon={<Bell size={20} className="text-[#dd6e42]" />}
              checked={emailUpdatesOptin}
              onToggle={() => setEmailUpdatesOptin(prev => !prev)}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={cancelEmailMode}
              disabled={savingEmail}
              className="flex-1 rounded-xl border border-th-surface/[0.15] px-4 py-3 text-[10px] font-label tracking-widest uppercase text-th-text2 font-bold hover:bg-th-surface/[0.08] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEmailPrefsSave}
              disabled={savingEmail}
              className="flex-1 rounded-xl bg-[#dd6e42] px-4 py-3 text-[10px] font-label tracking-widest uppercase text-white font-bold hover:bg-[#c45a30] transition-all disabled:opacity-50"
            >
              {savingEmail ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
        </section>
      )}

      {/* ── DANGER ZONE ── */}
      {dangerMode && (
        <section ref={dangerRef} className="glass-morphism rounded-2xl border border-red-500/20 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-display text-red-400">Danger Zone</h3>
            </div>
            <button
              type="button"
              onClick={() => { setDangerMode(false); setConfirmingDelete(false); }}
              className="text-th-text3/60 hover:text-th-text transition-colors text-xs font-label tracking-widest uppercase"
            >
              Close
            </button>
          </div>

          <div className="space-y-3">
            {/* Sign Out */}
            <div className="flex items-center justify-between glass-morphism rounded-xl px-5 py-4 border border-white/10">
              <div className="flex items-center gap-3">
                <LogOut size={20} className="text-th-text3" />
                <div>
                  <p className="text-sm text-th-text">Sign Out</p>
                  <p className="text-xs text-th-text3">Log out of your account on this device</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg border border-th-surface/[0.15] px-4 py-2 text-[10px] font-label tracking-widest uppercase text-th-text2 font-bold hover:bg-th-surface/[0.08] transition-all"
              >
                Sign Out
              </button>
            </div>

            {/* Delete Account */}
            <div className="flex items-center justify-between glass-morphism rounded-xl px-5 py-4 border border-red-500/20">
              <div className="flex items-center gap-3">
                <Trash2 size={20} className="text-red-400" />
                <div>
                  <p className="text-sm text-red-400 font-medium">Delete Account</p>
                  <p className="text-xs text-th-text3">Permanently delete all your data. This cannot be undone.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {confirmingDelete && (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="text-xs text-th-text3 hover:text-th-text transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className={`rounded-lg px-4 py-2 text-[10px] font-label tracking-widest uppercase font-bold transition-all disabled:opacity-50 ${
                    confirmingDelete
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'border border-red-500/30 text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  {deleting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </span>
                  ) : confirmingDelete ? (
                    'Are you sure?'
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── QUICK LINKS ── */}
      <section className="space-y-2">
        {quickLinks.map((link) => (
          <button
            key={link.label}
            onClick={link.action}
            className="w-full glass-morphism rounded-2xl border border-th-surface/[0.10] px-5 py-4 flex items-center gap-4 hover:bg-th-surface/[0.06] transition-all group text-left"
          >
            <span className={link.accent ? 'text-red-400' : 'text-th-text3'}>
              {link.icon}
            </span>
            <span className={`flex-1 text-sm font-medium ${link.accent ? 'text-red-400' : 'text-th-text'}`}>
              {link.label}
            </span>
            <ChevronRight className="w-4 h-4 text-th-text3/40 group-hover:text-th-text3 transition-colors" />
          </button>
        ))}
      </section>
    </main>
  );
};

export default ProfilePage;
