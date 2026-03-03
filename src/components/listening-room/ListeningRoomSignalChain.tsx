import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { Gear } from '../../types';
import { gearService } from '../../services/gearService';
import { sortBySignalFlow } from '../../config/signalChainOrder';
import { getSignalChainIcon } from '../../config/signalChainIcons';

interface ListeningRoomSignalChainProps {
  ambientMode?: boolean;
}

const ListeningRoomSignalChain: React.FC<ListeningRoomSignalChainProps> = ({ ambientMode }) => {
  const [gear, setGear] = useState<Gear[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await gearService.getGear();
        if (!cancelled) setGear(data);
      } catch {
        // Silently fail — this is supplementary info
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Filter to signal-chain-relevant categories (exclude cables_other) and sort
  const chainGear = sortBySignalFlow<Gear>(
    gear.filter((g) => g.category !== 'cables_other')
  );

  // Don't render if no gear or still loading
  if (!loaded || chainGear.length === 0) return null;

  return (
    <div
      aria-label="Signal chain"
      className={`mx-4 mb-2 rounded-lg overflow-hidden transition-colors duration-500 ${
        ambientMode ? 'bg-white/[0.04]' : 'bg-th-surface/[0.06]'
      }`}
    >
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-label font-bold uppercase tracking-widest transition-colors ${
          ambientMode ? 'text-[#c4b5a0]/50 hover:text-[#c4b5a0]/70' : 'text-th-text3 hover:text-th-text2'
        }`}
      >
        Signal Chain
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Chain strip */}
      {expanded && (
        <div className="px-3 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1 min-w-max">
            {chainGear.map((item, index) => {
              const Icon = getSignalChainIcon(item.category);
              return (
                <React.Fragment key={item.id}>
                  {index > 0 && (
                    <ChevronRight
                      aria-hidden="true"
                      className="w-3 h-3 text-th-text3/30 flex-shrink-0"
                    />
                  )}
                  <div
                    aria-label={`${item.brand} ${item.model}`}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md flex-shrink-0 transition-colors duration-500 ${
                      ambientMode ? 'bg-white/[0.06]' : 'bg-th-surface/[0.08]'
                    }`}
                  >
                    <Icon
                      aria-hidden="true"
                      className={`w-3.5 h-3.5 flex-shrink-0 transition-colors duration-500 ${
                        ambientMode ? 'text-[#c4b5a0]/50' : 'text-th-text3'
                      }`}
                    />
                    <span className={`text-[11px] font-label truncate max-w-[80px] transition-colors duration-500 ${
                      ambientMode ? 'text-[#c4b5a0]/70' : 'text-th-text2'
                    }`}>
                      {item.brand} {item.model}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListeningRoomSignalChain;
