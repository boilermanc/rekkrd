import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Gear, GearCategory } from '../../types';
import { getSignalChainIcon } from '../../config/signalChainIcons';
import {
  groupBySignalChain,
  getSignalOrder,
  type SignalChainGroup,
} from '../../config/signalChainOrder';

// ── Types ───────────────────────────────────────────────────────

export interface ChainGap {
  category: string;
  reason: string;
  insert_after: string;
  priority: 'required' | 'recommended' | 'nice_to_have';
}

/** A render entry: either a real gear group or a gap marker. */
type ChainEntry =
  | { type: 'group'; key: string; group: SignalChainGroup<Gear> }
  | { type: 'gap'; key: string; gap: ChainGap };

// ── Constants ───────────────────────────────────────────────────

const CATEGORY_LABELS: Record<GearCategory, string> = {
  turntable: 'Turntable',
  cartridge: 'Cartridge',
  phono_preamp: 'Phono Preamp',
  preamp: 'Preamp',
  amplifier: 'Amplifier',
  receiver: 'Receiver',
  speakers: 'Speakers',
  headphones: 'Headphones',
  dac: 'DAC',
  subwoofer: 'Subwoofer',
  cables_other: 'Cables & Other',
};

function getCategoryLabel(category: string): string {
  return (CATEGORY_LABELS as Record<string, string>)[category] || category || 'Other';
}

const PRIORITY_COLORS: Record<ChainGap['priority'], string> = {
  required: 'bg-red-500',
  recommended: 'bg-amber-500',
  nice_to_have: 'bg-th-text3/30',
};

const PRIORITY_LABELS: Record<ChainGap['priority'], string> = {
  required: 'Required',
  recommended: 'Recommended',
  nice_to_have: 'Nice to have',
};

// ── Placeholder Icons ───────────────────────────────────────────

function NodeIcon({ category }: { category: GearCategory }) {
  const cls = 'w-8 h-8 text-th-text3/25';
  switch (category) {
    case 'turntable':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'speakers':
    case 'subwoofer':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      );
    case 'headphones':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0118 0v6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" />
        </svg>
      );
    case 'amplifier':
    case 'receiver':
    case 'preamp':
    case 'phono_preamp':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      );
    case 'cartridge':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
      );
    case 'dac':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      );
  }
}

// ── Connectors ──────────────────────────────────────────────────

function HorizontalConnector({ dashed }: { dashed?: boolean }) {
  return (
    <div className="flex items-center shrink-0 px-1">
      {dashed ? (
        <div className="w-6 border-t border-dashed border-th-surface/[0.2]" />
      ) : (
        <div className="w-6 h-px bg-th-surface/[0.2]" />
      )}
      <svg className="w-3 h-3 text-th-surface/[0.3] -ml-1" fill="currentColor" viewBox="0 0 12 12">
        <path d="M4.5 2l5 4-5 4V2z" />
      </svg>
    </div>
  );
}

function VerticalConnector({ dashed }: { dashed?: boolean }) {
  return (
    <div className="flex flex-col items-center shrink-0 py-1">
      {dashed ? (
        <div className="h-4 border-l border-dashed border-th-surface/[0.2]" />
      ) : (
        <div className="w-px h-4 bg-th-surface/[0.2]" />
      )}
      <svg className="w-3 h-3 text-th-surface/[0.3] -mt-0.5" fill="currentColor" viewBox="0 0 12 12">
        <path d="M2 4.5l4 5 4-5H2z" />
      </svg>
    </div>
  );
}

// ── Build interleaved entries ───────────────────────────────────

function buildChainEntries(
  groups: SignalChainGroup<Gear>[],
  gaps: ChainGap[] | undefined,
): ChainEntry[] {
  const entries: ChainEntry[] = groups.map((g) => ({
    type: 'group' as const,
    key: `group-${g.category}`,
    group: g,
  }));

  if (!gaps || gaps.length === 0) return entries;

  // Build a set of categories the user already has
  const ownedCategories = new Set(groups.map((g) => g.category));

  // Insert each gap after its insert_after category, or at its natural signal order position
  for (const gap of gaps) {
    // Skip gaps for categories the user already owns
    if (ownedCategories.has(gap.category)) continue;

    const gapOrder = getSignalOrder(gap.category);
    const afterOrder = getSignalOrder(gap.insert_after);

    // Find insertion index: after the insert_after group if it exists,
    // otherwise at the position where this category naturally belongs
    let insertIdx = -1;
    if (ownedCategories.has(gap.insert_after)) {
      // Place after the insert_after group
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (e.type === 'group' && e.group.category === gap.insert_after) {
          insertIdx = i + 1;
          break;
        }
      }
    }

    if (insertIdx === -1) {
      // Fallback: find position by signal chain order
      const targetOrder = ownedCategories.has(gap.insert_after) ? afterOrder + 0.5 : gapOrder;
      insertIdx = entries.length; // default: end
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const eOrder = e.type === 'group' ? e.group.order : getSignalOrder(e.gap.category);
        if (eOrder > targetOrder) {
          insertIdx = i;
          break;
        }
      }
    }

    entries.splice(insertIdx, 0, {
      type: 'gap',
      key: `gap-${gap.category}`,
      gap,
    });
  }

  return entries;
}

// ── Props ───────────────────────────────────────────────────────

interface SignalChainDiagramProps {
  gear: Gear[];
  onClickGear: (gear: Gear) => void;
  onAddGear?: () => void;
  gaps?: ChainGap[];
}

// ── Main Component ──────────────────────────────────────────────

const SignalChainDiagram: React.FC<SignalChainDiagramProps> = ({
  gear,
  onClickGear,
  onAddGear,
  gaps,
}) => {
  const groups = useMemo(() => groupBySignalChain(gear), [gear]);
  const entries = useMemo(() => buildChainEntries(groups, gaps), [groups, gaps]);

  // Empty state
  if (gear.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center text-center" role="status">
        <svg className="w-16 h-16 text-th-text3/15 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.82" />
        </svg>
        <p className="text-th-text3 text-sm mb-4">Add gear to see your signal chain</p>
        {onAddGear && (
          <button
            onClick={onAddGear}
            className="bg-[#dd6e42] text-th-text font-bold py-2.5 px-6 rounded-xl hover:bg-[#c45e38] transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Gear
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Desktop: horizontal scroll with edge fade hints */}
      <div className="hidden md:block relative">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-th-bg to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-th-bg to-transparent z-10" />

        <div className="overflow-x-auto pb-4 px-6">
          <div className="flex items-center w-max">
            <ChainFlow entries={entries} direction="horizontal" onClickGear={onClickGear} onAddGear={onAddGear} />
          </div>
        </div>
      </div>

      {/* Mobile: vertical flow */}
      <div className="md:hidden flex flex-col items-center">
        <ChainFlow entries={entries} direction="vertical" onClickGear={onClickGear} onAddGear={onAddGear} />
      </div>
    </div>
  );
};

// ── Chain Flow Renderer ─────────────────────────────────────────

interface ChainFlowProps {
  entries: ChainEntry[];
  direction: 'horizontal' | 'vertical';
  onClickGear: (gear: Gear) => void;
  onAddGear?: () => void;
}

function ChainFlow({ entries, direction, onClickGear, onAddGear }: ChainFlowProps) {
  return (
    <>
      {entries.map((entry, i) => {
        // Determine if the connector before or after this entry should be dashed
        const isGap = entry.type === 'gap';
        const prevIsGap = i > 0 && entries[i - 1].type === 'gap';
        const useDashedBefore = isGap || prevIsGap;

        return (
          <React.Fragment key={entry.key}>
            {/* Connector between entries */}
            {i > 0 && (
              direction === 'horizontal'
                ? <HorizontalConnector dashed={useDashedBefore} />
                : <VerticalConnector dashed={useDashedBefore} />
            )}

            {/* Node */}
            {entry.type === 'group' ? (
              <GroupNode group={entry.group} onClickGear={onClickGear} direction={direction} />
            ) : (
              <GapMarkerNode gap={entry.gap} onAddGear={onAddGear} />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

// ── Group Node ──────────────────────────────────────────────────

interface GroupNodeProps {
  group: SignalChainGroup<Gear>;
  onClickGear: (gear: Gear) => void;
  direction: 'horizontal' | 'vertical';
}

function GroupNode({ group, onClickGear, direction }: GroupNodeProps) {
  if (group.items.length === 1) {
    return <DiagramNode gear={group.items[0]} onClick={onClickGear} />;
  }

  const label = getCategoryLabel(group.category);

  if (direction === 'horizontal') {
    return (
      <div className="flex items-center shrink-0">
        <div className="flex flex-col items-center shrink-0 mr-1">
          <div className="w-px bg-th-surface/[0.15]" style={{ height: `${Math.max(20, (group.items.length - 1) * 24)}px` }} />
        </div>
        <div className="rounded-xl border border-dashed border-th-surface/[0.12] bg-th-surface/[0.02] p-2">
          <p className="text-th-text3/40 text-[8px] font-bold uppercase tracking-[0.2em] text-center mb-1.5">{label}</p>
          <div className="flex flex-col gap-2">
            {group.items.map((item) => (
              <DiagramNode key={item.id} gear={item} onClick={onClickGear} />
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center shrink-0 ml-1">
          <div className="w-px bg-th-surface/[0.15]" style={{ height: `${Math.max(20, (group.items.length - 1) * 24)}px` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center shrink-0">
      <div className="flex items-center shrink-0 mb-1">
        <div className="h-px bg-th-surface/[0.15]" style={{ width: `${Math.max(20, (group.items.length - 1) * 32)}px` }} />
      </div>
      <div className="rounded-xl border border-dashed border-th-surface/[0.12] bg-th-surface/[0.02] p-2">
        <p className="text-th-text3/40 text-[8px] font-bold uppercase tracking-[0.2em] text-center mb-1.5">{label}</p>
        <div className="flex gap-2 justify-center">
          {group.items.map((item) => (
            <DiagramNode key={item.id} gear={item} onClick={onClickGear} />
          ))}
        </div>
      </div>
      <div className="flex items-center shrink-0 mt-1">
        <div className="h-px bg-th-surface/[0.15]" style={{ width: `${Math.max(20, (group.items.length - 1) * 32)}px` }} />
      </div>
    </div>
  );
}

// ── Gap Marker Node ─────────────────────────────────────────────

interface GapMarkerNodeProps {
  gap: ChainGap;
  onAddGear?: () => void;
}

function GapMarkerNode({ gap, onAddGear }: GapMarkerNodeProps) {
  const label = getCategoryLabel(gap.category);
  const priorityColor = PRIORITY_COLORS[gap.priority];
  const priorityLabel = PRIORITY_LABELS[gap.priority];

  return (
    <div
      onClick={onAddGear}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onAddGear) {
          e.preventDefault();
          onAddGear();
        }
      }}
      role="button"
      tabIndex={0}
      data-gap-category={gap.category}
      aria-label={`Missing ${label} - ${priorityLabel}: ${gap.reason}`}
      className="group w-32 md:w-36 shrink-0 rounded-xl border border-dashed border-th-surface/[0.15] bg-th-surface/[0.02] hover:border-[#dd6e42]/25 hover:bg-th-surface/[0.05] transition-all duration-200 cursor-pointer overflow-hidden opacity-60 hover:opacity-80"
    >
      {/* Placeholder thumbnail */}
      <div className="relative w-full aspect-square flex items-center justify-center bg-th-bg/20">
        <Plus className="w-8 h-8 text-th-text3/20" aria-hidden="true" />
        {/* Priority dot */}
        <div
          className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${priorityColor}`}
          title={priorityLabel}
          aria-hidden="true"
        />
      </div>

      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="text-th-text3/60 text-[11px] font-semibold truncate">
          {label}
        </p>
        <p
          className="text-th-text3/35 text-[9px] mt-0.5 truncate"
          title={gap.reason}
        >
          {gap.reason}
        </p>
      </div>
    </div>
  );
}

// ── Diagram Node ────────────────────────────────────────────────

interface DiagramNodeProps {
  gear: Gear;
  onClick: (gear: Gear) => void;
}

const DiagramNode: React.FC<DiagramNodeProps> = ({ gear, onClick }) => {
  const imageUrl = gear.image_url || gear.original_photo_url;
  const label = getCategoryLabel(gear.category);
  const name = `${gear.brand} ${gear.model}`;
  const Icon = getSignalChainIcon(gear.category);

  return (
    <div
      onClick={() => onClick(gear)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(gear);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${name} - ${label}`}
      className="group w-32 md:w-36 shrink-0 rounded-xl border border-th-surface/[0.10] bg-th-surface/[0.04] hover:border-[#dd6e42]/30 hover:bg-th-surface/[0.08] transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-square overflow-hidden bg-th-bg/40 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <NodeIcon category={gear.category} />
        )}
        <div className="absolute top-1.5 right-1.5 bg-th-bg/70 backdrop-blur-sm rounded-full p-1" aria-hidden="true">
          <Icon className="w-3.5 h-3.5 text-th-text3/50" />
        </div>
      </div>

      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="text-th-text text-[11px] font-semibold truncate" title={name}>
          {name}
        </p>
        <p className="text-th-text3/50 text-[9px] uppercase tracking-widest mt-0.5 truncate">
          {label}
        </p>
      </div>
    </div>
  );
};

export default React.memo(SignalChainDiagram);
