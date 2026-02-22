import React, { useEffect, useState } from 'react';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { supabase } from '../../services/supabaseService';

interface ValueSnapshot {
  totalMedian: number;
  valuedCount: number;
  totalCount: number;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

interface CollectionInsightsCardProps {
  onClick: () => void;
}

const CollectionInsightsCard: React.FC<CollectionInsightsCardProps> = ({ onClick }) => {
  const [data, setData] = useState<ValueSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await supabase?.auth.getSession();
        const token = session?.data?.session?.access_token;
        if (!token) return;
        const res = await fetch('/api/collection/value', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = (await res.json()) as ValueSnapshot;
        if (!cancelled) setData(json);
      } catch { /* non-critical */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full glass-morphism rounded-xl border border-th-surface/[0.10] px-4 py-3 flex items-center gap-4 text-left hover:scale-[1.01] hover:border-[#dd6e42]/20 transition-all cursor-pointer"
    >
      <div className="w-9 h-9 rounded-lg bg-[#dd6e42]/10 flex items-center justify-center shrink-0">
        <TrendingUp className="w-4.5 h-4.5 text-[#dd6e42]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-label tracking-widest text-th-text3 uppercase">Collection Value</p>
        {loading ? (
          <div className="h-6 w-24 bg-th-surface/[0.08] rounded animate-pulse mt-0.5" />
        ) : !data || data.valuedCount === 0 ? (
          <p className="text-sm text-th-text3 mt-0.5">Add pricing data to see value</p>
        ) : (
          <>
            <p className="text-lg font-bold text-[#dd6e42] leading-tight">{formatCurrency(data.totalMedian)}</p>
            <p className="text-[10px] text-th-text3">{data.valuedCount} of {data.totalCount} records valued</p>
          </>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-th-text3 shrink-0" />
    </button>
  );
};

export default CollectionInsightsCard;
