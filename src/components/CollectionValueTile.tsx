import React, { useState, useEffect } from 'react';
import { Album } from '../types';
import { CONDITION_ORDER, CONDITION_BY_VALUE, type ConditionGrade } from '../constants/conditionGrades';

interface CollectionValueTileProps {
  albums: Album[];
  userPlan: 'collector' | 'curator' | 'archivist';
  discogsConnected: boolean;
  onStartGrading?: () => void;
}

interface PriceData {
  [key: string]: {
    value: number;
  };
}

interface AlbumWithPrice extends Album {
  priceData?: PriceData;
  estimatedValue?: number;
}

interface UpgradeCandidate {
  album: Album;
  currentGrade: ConditionGrade;
  nextGrade: ConditionGrade;
  currentValue: number;
  nextValue: number;
  gain: number;
}

const CollectionValueTile: React.FC<CollectionValueTileProps> = ({
  albums,
  userPlan,
  discogsConnected,
  onStartGrading,
}) => {
  const [pricesFetched, setPricesFetched] = useState(false);
  const [albumsWithPrices, setAlbumsWithPrices] = useState<AlbumWithPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const totalAlbums = albums.length;
  const gradedAlbums = albums.filter(a => a.condition);
  const gradedCount = gradedAlbums.length;
  const gradedPercent = totalAlbums > 0 ? Math.round((gradedCount / totalAlbums) * 100) : 0;

  const shouldFetchPrices = userPlan === 'archivist' && discogsConnected;

  // Fetch prices for graded albums with discogs_release_id
  const fetchPrices = async (bustCache = false) => {
    if (!shouldFetchPrices || gradedCount === 0) return;

    setLoading(true);
    const albumsToPrice = gradedAlbums.filter(a => a.discogs_release_id);
    const results: AlbumWithPrice[] = [];

    for (const album of albumsToPrice) {
      try {
        const url = `/api/discogs-price?releaseId=${album.discogs_release_id}${
          bustCache ? `&bust=${Date.now()}` : ''
        }`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const priceData = data.prices as PriceData;

          // Get median price for this album's condition
          const conditionKey = CONDITION_BY_VALUE[album.condition as ConditionGrade]?.discogsKey;
          const medianValue = conditionKey && priceData[conditionKey]
            ? priceData[conditionKey].value
            : 0;

          results.push({
            ...album,
            priceData,
            estimatedValue: medianValue,
          });
        } else {
          results.push({ ...album, estimatedValue: 0 });
        }
      } catch (error) {
        console.error('Price fetch error:', error);
        results.push({ ...album, estimatedValue: 0 });
      }
    }

    setAlbumsWithPrices(results);
    setPricesFetched(true);
    setLastSync(new Date());
    setLoading(false);
  };

  useEffect(() => {
    if (shouldFetchPrices && gradedCount > 0 && !pricesFetched) {
      void fetchPrices();
    }
  }, [shouldFetchPrices, gradedCount, pricesFetched]);

  const handleRefresh = () => {
    setPricesFetched(false);
    void fetchPrices(true);
  };

  // Calculate total value
  const totalValue = albumsWithPrices.reduce((sum, a) => sum + (a.estimatedValue || 0), 0);

  // Calculate upgrade candidates
  const getUpgradeCandidates = (): UpgradeCandidate[] => {
    if (!shouldFetchPrices || albumsWithPrices.length === 0) return [];

    const candidates: UpgradeCandidate[] = [];

    for (const album of albumsWithPrices) {
      if (!album.condition || !album.priceData) continue;

      const currentGrade = album.condition as ConditionGrade;
      const currentOrder = CONDITION_ORDER[currentGrade];

      // Find next better grade
      const nextGrade = Object.entries(CONDITION_ORDER)
        .filter(([_, order]) => order === currentOrder - 1)
        .map(([grade]) => grade as ConditionGrade)[0];

      if (!nextGrade) continue;

      const currentKey = CONDITION_BY_VALUE[currentGrade]?.discogsKey;
      const nextKey = CONDITION_BY_VALUE[nextGrade]?.discogsKey;

      const currentValue = currentKey && album.priceData[currentKey]
        ? album.priceData[currentKey].value
        : 0;
      const nextValue = nextKey && album.priceData[nextKey]
        ? album.priceData[nextKey].value
        : 0;

      const gain = nextValue - currentValue;

      if (gain > 0) {
        candidates.push({
          album,
          currentGrade,
          nextGrade,
          currentValue,
          nextValue,
          gain,
        });
      }
    }

    return candidates.sort((a, b) => b.gain - a.gain).slice(0, 3);
  };

  const upgradeCandidates = getUpgradeCandidates();

  // Calculate condition breakdown
  const getConditionBreakdown = () => {
    const breakdown: Record<ConditionGrade, { count: number; value: number }> = {} as any;

    for (const album of albumsWithPrices) {
      if (!album.condition) continue;
      const grade = album.condition as ConditionGrade;

      if (!breakdown[grade]) {
        breakdown[grade] = { count: 0, value: 0 };
      }

      breakdown[grade].count += 1;
      breakdown[grade].value += album.estimatedValue || 0;
    }

    return Object.entries(breakdown)
      .map(([grade, data]) => ({
        grade: grade as ConditionGrade,
        ...data,
        order: CONDITION_ORDER[grade as ConditionGrade],
      }))
      .sort((a, b) => a.order - b.order);
  };

  const conditionBreakdown = getConditionBreakdown();

  const getGradePillColor = (grade: ConditionGrade): string => {
    const order = CONDITION_ORDER[grade];
    if (order <= 2) return 'bg-emerald-900 text-emerald-300';
    if (order === 3) return 'bg-sky-800 text-sky-200';
    if (order === 4) return 'bg-amber-700 text-amber-100';
    if (order <= 6) return 'bg-red-900 text-red-300';
    return 'bg-slate-800 text-slate-400';
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // STATE 1: No grades set
  if (gradedCount === 0) {
    return (
      <div className="bg-cream rounded-2xl border-2 border-dashed border-paper-darker shadow-sm p-8">
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          {/* Icon */}
          <div className="w-11 h-11 rounded-full bg-paper-dark flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-ink/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Heading */}
          <h3 className="font-display text-[15px] text-ink/60 mb-2">Value unknown</h3>

          {/* Body */}
          <p className="font-serif text-[11px] text-ink/60 italic mb-4">
            Grade your records to unlock collection value estimates based on live Discogs marketplace data.
          </p>

          {/* CTA */}
          <button
            onClick={onStartGrading}
            className="px-4 py-2 bg-burnt-peach/10 border border-burnt-peach/30 text-burnt-peach font-mono text-[8px] tracking-widest uppercase rounded-lg hover:bg-burnt-peach/20 transition-colors"
          >
            Start Grading →
          </button>
        </div>
      </div>
    );
  }

  // Gating for Collector/Curator plans
  if (userPlan === 'collector' || userPlan === 'curator') {
    return (
      <div className="bg-cream rounded-2xl border-2 border-dashed border-paper-darker shadow-sm p-8">
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          <div className="w-11 h-11 rounded-full bg-paper-dark flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-ink/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="font-display text-[15px] text-ink/60 mb-2">Unlock Value Estimates</h3>
          <p className="font-serif text-[11px] text-ink/60 italic mb-4">
            See what your collection is worth — upgrade to Archivist to unlock live Discogs pricing.
          </p>
          <button className="px-4 py-2 bg-burnt-peach/10 border border-burnt-peach/30 text-burnt-peach font-mono text-[8px] tracking-widest uppercase rounded-lg hover:bg-burnt-peach/20 transition-colors">
            Upgrade to Archivist
          </button>
        </div>
      </div>
    );
  }

  // STATE 2: Partial grades
  if (gradedCount < totalAlbums) {
    const hasValue = albumsWithPrices.some(a => (a.estimatedValue || 0) > 0);

    return (
      <div className="bg-cream rounded-2xl border border-divider shadow-sm overflow-hidden">
        {/* Top section */}
        <div className="p-[18px]">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="font-display text-[34px] text-ink leading-none mb-1">
                {hasValue ? `$${Math.round(totalValue)}` : '—'}
              </div>
              <div className="font-serif text-[10px] text-ink/60 italic">
                {hasValue
                  ? 'estimated across graded records'
                  : 'grade more records to see value'}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-[16px] text-ink/60 leading-none mb-1">
                {gradedCount}
              </div>
              <div className="font-mono text-[7px] text-ink/60 tracking-widest uppercase">
                Graded
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="h-1 bg-paper-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-burnt-peach to-burnt-peach/80 transition-all duration-500"
                style={{ width: `${gradedPercent}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] text-ink/60">
              {gradedCount} of {totalAlbums} graded
            </span>
            <span className="font-mono text-[9px] text-ink/60">{gradedPercent}%</span>
          </div>
        </div>

        {/* Nudge strip */}
        <div className="bg-paper-dark border-t border-paper-darker px-[18px] py-3 flex items-center justify-between">
          <span className="font-serif text-[11px] text-ink/70">
            {totalAlbums - gradedCount} records not yet graded — value may be higher
          </span>
          <button
            onClick={onStartGrading}
            className="font-mono text-[9px] text-burnt-peach tracking-wide hover:underline"
          >
            Grade now →
          </button>
        </div>
      </div>
    );
  }

  // STATE 3: All graded
  return (
    <div className="bg-cream rounded-2xl border border-divider shadow-sm overflow-hidden">
      {/* Top accent line */}
      <div className="h-0.5 bg-burnt-peach" />

      {/* Header */}
      <div className="p-[18px]">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="font-display text-[38px] text-ink leading-none mb-1">
              ${Math.round(totalValue)}
            </div>
            <div className="font-serif text-[10px] text-ink/60 italic">
              across all {totalAlbums} records
            </div>
          </div>
          {/* Optional: trend badge placeholder */}
        </div>
      </div>

      {/* Condition breakdown */}
      <div className="px-[14px] pb-[14px]">
        <div className="space-y-2">
          {conditionBreakdown.map(({ grade, count, value }) => {
            const maxValue = Math.max(...conditionBreakdown.map(b => b.value));
            const widthPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;

            return (
              <div key={grade} className="flex items-center gap-2">
                {/* Grade pill */}
                <div
                  className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 ${getGradePillColor(
                    grade
                  )}`}
                >
                  {CONDITION_BY_VALUE[grade].shortLabel}
                </div>

                {/* Bar track */}
                <div className="flex-1 h-6 bg-paper-dark rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-burnt-peach/60 transition-all duration-500"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>

                {/* Count */}
                <span className="font-mono text-[10px] text-ink/60 w-8 text-right">
                  {count}×
                </span>

                {/* Value */}
                <span className="font-display text-[14px] text-ink w-16 text-right">
                  ${Math.round(value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upgrade candidates strip */}
      {upgradeCandidates.length > 0 && (
        <div className="bg-paper border-t border-paper-darker px-[18px] py-3">
          <h4 className="font-mono text-[7px] tracking-[0.3em] uppercase text-ink/60 mb-2">
            Upgrade Opportunities
          </h4>
          <div className="space-y-2">
            {upgradeCandidates.map((candidate, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-[12px] text-ink truncate">
                    {candidate.album.title}
                  </div>
                  <div className="font-mono text-[7px] text-ink/60">
                    {CONDITION_BY_VALUE[candidate.currentGrade].shortLabel} →{' '}
                    {CONDITION_BY_VALUE[candidate.nextGrade].shortLabel} · upgrade value
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-display text-[14px] text-emerald-700">
                    +${Math.round(candidate.gain)}
                  </div>
                  <div className="font-mono text-[7px] text-emerald-700/60">
                    if upgraded
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Updated row */}
      {lastSync && (
        <div className="bg-cream border-t border-paper-darker px-[18px] py-2 flex items-center justify-between">
          <span className="font-mono text-[7px] text-paper-darker">
            Updated nightly · last sync {formatTimeAgo(lastSync)}
          </span>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="font-mono text-[7px] text-ink/60 hover:text-ink hover:underline transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh →'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CollectionValueTile;
