import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export type SystemGoals = {
  useCases: string[];
  listeningPriority: string;
  specialistRoles: { gearId: string; gearName: string; role: string }[];
};

interface GearItem {
  id: string;
  name: string;
}

interface SystemGoalsStepProps {
  gearItems: GearItem[];
  onComplete: (goals: SystemGoals) => void;
  onSkip: () => void;
}

const USE_CASE_OPTIONS = [
  'Vinyl / analog listening',
  'Home theater / surround sound',
  'Streaming / digital',
  'Recording / studio monitoring',
  'Multi-room audio',
] as const;

const PRIORITY_OPTIONS = [
  'Vinyl purity',
  'Flexibility across sources',
  'Home theater immersion',
  'Balanced across all uses',
] as const;

const SystemGoalsStep: React.FC<SystemGoalsStepProps> = ({
  gearItems,
  onComplete,
  onSkip,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, onSkip);

  const [useCases, setUseCases] = useState<string[]>([]);
  const [listeningPriority, setListeningPriority] = useState('');
  const [specialistGearIds, setSpecialistGearIds] = useState<Set<string>>(new Set());
  const [specialistRoles, setSpecialistRoles] = useState<Record<string, string>>({});

  const toggleUseCase = (opt: string) => {
    setUseCases((prev) =>
      prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]
    );
  };

  const toggleSpecialist = (id: string) => {
    setSpecialistGearIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setSpecialistRoles((r) => {
          const updated = { ...r };
          delete updated[id];
          return updated;
        });
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const roles = gearItems
      .filter((g) => specialistGearIds.has(g.id))
      .map((g) => ({
        gearId: g.id,
        gearName: g.name,
        role: specialistRoles[g.id] || '',
      }));

    onComplete({
      useCases,
      listeningPriority,
      specialistRoles: roles,
    });
  };

  const canSubmit = useCases.length > 0 || listeningPriority;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="System goals — describe how you use your audio system"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-th-bg/95 p-4 md:p-8 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
      onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}
    >
      <div className="relative w-full max-w-lg glass-morphism rounded-3xl overflow-hidden border border-th-surface/[0.10] animate-in zoom-in-95 duration-500 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-th-surface/[0.10] shrink-0">
          <div>
            <h2 className="font-label text-sk-accent font-bold tracking-widest text-sm uppercase">
              System Goals
            </h2>
            <p className="text-th-text3 text-[11px] mt-0.5">
              Optional — helps the AI tailor recommendations to your setup
            </p>
          </div>
          <button
            onClick={onSkip}
            aria-label="Skip system goals"
            className="text-th-text2 hover:text-th-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-6">
          {/* Q1 — Use cases */}
          <fieldset>
            <legend className="text-th-text text-xs font-bold uppercase tracking-widest mb-2">
              How do you use your system?
            </legend>
            <div className="space-y-1.5">
              {USE_CASE_OPTIONS.map((opt) => {
                const checked = useCases.includes(opt);
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                      checked
                        ? 'border-sk-accent/40 bg-sk-accent/[0.08]'
                        : 'border-th-surface/[0.10] bg-th-surface/[0.03] hover:border-th-surface/[0.20]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUseCase(opt)}
                      aria-label={opt}
                      className="accent-sk-accent w-4 h-4 shrink-0"
                    />
                    <span className="text-th-text2 text-xs">{opt}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Q2 — Listening priority */}
          <fieldset>
            <legend className="text-th-text text-xs font-bold uppercase tracking-widest mb-2">
              What's your listening priority?
            </legend>
            <div className="space-y-1.5">
              {PRIORITY_OPTIONS.map((opt) => {
                const selected = listeningPriority === opt;
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                      selected
                        ? 'border-sk-accent/40 bg-sk-accent/[0.08]'
                        : 'border-th-surface/[0.10] bg-th-surface/[0.03] hover:border-th-surface/[0.20]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="listeningPriority"
                      checked={selected}
                      onChange={() => setListeningPriority(opt)}
                      aria-label={opt}
                      className="accent-sk-accent w-4 h-4 shrink-0"
                    />
                    <span className="text-th-text2 text-xs">{opt}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Q3 — Specialist roles */}
          {gearItems.length > 0 && (
            <fieldset>
              <legend className="text-th-text text-xs font-bold uppercase tracking-widest mb-1">
                Do any components serve a specialized role?
              </legend>
              <p className="text-th-text3 text-[10px] mb-2">
                Check items that serve a dedicated purpose, then optionally describe the role
              </p>
              <div className="space-y-1.5">
                {gearItems.map((item) => {
                  const checked = specialistGearIds.has(item.id);
                  return (
                    <div key={item.id}>
                      <label
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                          checked
                            ? 'border-sk-accent/40 bg-sk-accent/[0.08] rounded-b-none'
                            : 'border-th-surface/[0.10] bg-th-surface/[0.03] hover:border-th-surface/[0.20]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSpecialist(item.id)}
                          aria-label={`${item.name} serves a specialized role`}
                          className="accent-sk-accent w-4 h-4 shrink-0"
                        />
                        <span className="text-th-text2 text-xs truncate">{item.name}</span>
                      </label>
                      {checked && (
                        <div className="border border-t-0 border-sk-accent/40 bg-th-surface/[0.02] rounded-b-xl px-3 py-2">
                          <input
                            type="text"
                            value={specialistRoles[item.id] || ''}
                            onChange={(e) =>
                              setSpecialistRoles((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            placeholder='e.g. "Dedicated phono preamp"'
                            aria-label={`Describe the specialized role for ${item.name}`}
                            className="w-full bg-transparent text-th-text text-xs placeholder-th-text3/40 outline-none"
                            maxLength={100}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-th-surface/[0.10] flex items-center gap-3 shrink-0">
          <button
            onClick={onSkip}
            className="text-th-text3 hover:text-th-text2 text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="ml-auto bg-sk-accent text-th-text font-bold py-2.5 px-6 rounded-xl hover:bg-sk-accent-hover transition-all uppercase tracking-[0.2em] text-[10px] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sk-accent"
          >
            Analyze with Goals
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemGoalsStep;
