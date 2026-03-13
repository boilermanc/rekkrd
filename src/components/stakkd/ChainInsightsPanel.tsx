import React, { useState, useEffect } from 'react';
import { Info, AlertTriangle, AlertCircle, CheckCircle2, X, Plus } from 'lucide-react';
import { getSignalChainIcon } from '../../config/signalChainIcons';
import type { ChainAnalysisResult } from '../StakkdPage';
import type { GearCategory } from '../../types';

interface ChainInsightsPanelProps {
  analysis: ChainAnalysisResult;
  onClose: () => void;
  onAddGear?: () => void;
}

const SEVERITY_ORDER: Record<string, number> = { issue: 0, warning: 1, info: 2 };
const PRIORITY_ORDER: Record<string, number> = { required: 0, recommended: 1, nice_to_have: 2 };

const RATING_CONFIG: Record<
  ChainAnalysisResult['overall_rating'],
  { label: string; bg: string; text: string; border: string }
> = {
  excellent: {
    label: 'Excellent',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  good: {
    label: 'Good',
    bg: 'bg-sky-500/15',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
  },
  needs_attention: {
    label: 'Needs Attention',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  incomplete: {
    label: 'Incomplete',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
};

const PRIORITY_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  required: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  recommended: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  nice_to_have: { bg: 'bg-th-surface/[0.1]', text: 'text-th-text3/60', border: 'border-th-surface/[0.15]' },
};

const PRIORITY_LABELS: Record<string, string> = {
  required: 'Required',
  recommended: 'Recommended',
  nice_to_have: 'Nice to Have',
};

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
  tape_deck: 'Tape Deck',
  cables_other: 'Cables & Other',
};

function getCategoryLabel(category: string): string {
  return (CATEGORY_LABELS as Record<string, string>)[category] || category || 'Other';
}

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case 'issue':
      return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-label="Issue" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-label="Warning" />;
    default:
      return <Info className="w-4 h-4 text-sky-400 shrink-0" aria-label="Info" />;
  }
}

function scrollToGapMarker(category: string) {
  const el = document.querySelector(`[data-gap-category="${category}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // Brief highlight pulse
    el.classList.add('ring-2', 'ring-sk-accent/50');
    setTimeout(() => el.classList.remove('ring-2', 'ring-sk-accent/50'), 1500);
  }
}

const ChainInsightsPanel: React.FC<ChainInsightsPanelProps> = ({ analysis, onClose, onAddGear }) => {
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const rating = RATING_CONFIG[analysis.overall_rating] ?? RATING_CONFIG.good;

  const sortedNotes = [...analysis.compatibility_notes].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );

  const sortedGaps = [...analysis.gaps].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
  );

  const hasContent =
    analysis.compatibility_notes.length > 0 ||
    analysis.tips.length > 0 ||
    analysis.gaps.length > 0;

  return (
    <div
      role="region"
      aria-label="Signal chain analysis results"
      className={`mt-4 rounded-xl border border-th-surface/[0.15] bg-th-surface/[0.04] overflow-hidden transition-all duration-300 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${rating.bg} ${rating.text} ${rating.border}`}
            >
              {rating.label}
            </span>
          </div>
          <p className="text-th-text2 text-sm leading-relaxed">{analysis.summary}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Dismiss analysis results"
          className="text-th-text3/70 hover:text-th-text3 transition-colors p-1 -mt-0.5 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* All-clear state */}
      {!hasContent && (
        <div className="px-4 pb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-th-text3 text-xs">
            Your signal chain looks great! No issues detected.
          </p>
        </div>
      )}

      {/* Compatibility Notes */}
      {sortedNotes.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase">
              Compatibility
            </h3>
            <span className="text-[9px] font-bold text-th-text3/70 bg-th-surface/[0.1] rounded-full px-1.5 py-0.5 leading-none">
              {sortedNotes.length}
            </span>
          </div>
          <div className="space-y-2">
            {sortedNotes.map((note, i) => (
              <div
                key={i}
                className="rounded-lg border border-th-surface/[0.10] bg-th-surface/[0.04] px-3 py-2.5"
              >
                <div className="flex items-start gap-2">
                  <SeverityIcon severity={note.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-th-text text-xs font-semibold mb-0.5">{note.title}</p>
                    <p className="text-th-text3 text-xs leading-relaxed">{note.description}</p>
                    {note.affected_gear.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {note.affected_gear.map((gearId) => (
                          <span
                            key={gearId}
                            className="text-[9px] font-medium text-th-text3/70 bg-th-surface/[0.1] rounded px-1.5 py-0.5"
                          >
                            {gearId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gaps — Missing from Your Chain */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase">
            Missing from Your Chain
          </h3>
          {sortedGaps.length > 0 && (
            <span className="text-[9px] font-bold text-th-text3/70 bg-th-surface/[0.1] rounded-full px-1.5 py-0.5 leading-none">
              {sortedGaps.length}
            </span>
          )}
        </div>

        {sortedGaps.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.15] px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <p className="text-th-text3 text-xs">
              No gaps detected — your signal chain covers all the essentials!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedGaps.map((gap, i) => {
              const Icon = getSignalChainIcon(gap.category);
              const label = getCategoryLabel(gap.category);
              const afterLabel = getCategoryLabel(gap.insert_after);
              const badge = PRIORITY_BADGE[gap.priority] ?? PRIORITY_BADGE.nice_to_have;
              const priorityLabel = PRIORITY_LABELS[gap.priority] ?? 'Nice to Have';

              return (
                <div
                  key={i}
                  role="article"
                  className="relative rounded-lg border border-th-surface/[0.10] bg-th-surface/[0.04] px-3 py-2.5 cursor-pointer hover:border-th-surface/[0.20] transition-colors"
                  onClick={() => scrollToGapMarker(gap.category)}
                >
                  {/* Priority badge — top right */}
                  <span
                    aria-label={`Priority: ${priorityLabel}`}
                    className={`absolute top-2 right-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${badge.bg} ${badge.text} ${badge.border}`}
                  >
                    {priorityLabel}
                  </span>

                  <div className="flex items-start gap-2.5 pr-20">
                    {/* Category icon */}
                    <div className="w-7 h-7 rounded-lg bg-th-surface/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-th-text3/70" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Category name */}
                      <p className="text-th-text text-xs font-semibold">{label}</p>

                      {/* Reason */}
                      <p className="text-th-text3 text-xs leading-relaxed mt-0.5">{gap.reason}</p>

                      {/* Position hint */}
                      <p className="text-th-text3/70 text-[10px] mt-1">
                        After {afterLabel} in the signal chain
                      </p>

                      {/* Add gear CTA */}
                      {onAddGear && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddGear();
                          }}
                          aria-label={`Add ${label} to your gear collection`}
                          className="mt-2 inline-flex items-center gap-1 border border-th-surface/[0.2] text-th-text2 font-bold py-1 px-2.5 rounded-lg hover:bg-th-surface/[0.1] hover:text-th-text transition-all uppercase tracking-[0.15em] text-[9px]"
                        >
                          <Plus className="w-3 h-3" />
                          Add {label}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tips */}
      {analysis.tips.length > 0 && (
        <div className="px-4 pb-3">
          <h3 className="text-th-text3/70 text-[9px] font-label tracking-[0.3em] uppercase mb-2">
            Tips
          </h3>
          <div className="space-y-2">
            {analysis.tips.map((tip, i) => (
              <div
                key={i}
                className="rounded-lg border border-th-surface/[0.08] bg-th-surface/[0.02] px-3 py-2.5"
              >
                <p className="text-th-text text-xs font-semibold mb-0.5">{tip.title}</p>
                <p className="text-th-text3 text-xs leading-relaxed">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChainInsightsPanel;
