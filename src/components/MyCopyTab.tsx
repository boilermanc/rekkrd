import React, { useState } from 'react';
import { Album } from '../types';
import { CONDITION_BY_VALUE, type ConditionGrade } from '../constants/conditionGrades';
import GradingSheet from './GradingSheet';

interface MyCopyTabProps {
  album: Album;
  onUpdate: (updates: Partial<Album>) => Promise<void>;
  userPlan: 'collector' | 'curator' | 'enthusiast';
  discogsConnected: boolean;
}

const MyCopyTab: React.FC<MyCopyTabProps> = ({
  album,
  onUpdate,
  userPlan,
  discogsConnected,
}) => {
  const [gradingSheetOpen, setGradingSheetOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showDetailsOverride, setShowDetailsOverride] = useState(false);

  const conditionInfo = album.condition ? CONDITION_BY_VALUE[album.condition as ConditionGrade] : null;

  // Check if this is truly empty (first-time state)
  const isCompletelyEmpty = !album.condition && !album.purchase_price && !album.copy_notes && !album.acquired_from;

  const handleFieldUpdate = async (field: keyof Album, value: unknown) => {
    try {
      await onUpdate({ [field]: value });
      setEditingField(null);
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  // First-time empty state
  if (isCompletelyEmpty && !showDetailsOverride) {
    return (
      <div className="bg-paper min-h-[600px] relative flex items-center justify-center">
        <div className="max-w-md mx-auto text-center px-6">
          {/* Vinyl record icon - concentric circles */}
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <svg className="w-16 h-16 text-ink/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>

          {/* Heading */}
          <h3 className="font-display text-[20px] text-ink mb-3">Make it yours</h3>

          {/* Body */}
          <p className="font-serif text-[14px] text-ink/60 italic mb-6 leading-relaxed">
            Track condition, what you paid, where you got it.<br />
            Your copy — your story.
          </p>

          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setGradingSheetOpen(true)}
              aria-label={`Grade your copy of ${album.title} by ${album.artist}`}
              className="px-6 py-3 border-2 border-burnt-peach text-burnt-peach font-mono text-[10px] tracking-widest uppercase rounded-lg hover:bg-burnt-peach/10 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2"
            >
              Grade Your Copy →
            </button>
            <button
              onClick={() => setShowDetailsOverride(true)}
              aria-label={`Add details for ${album.title} by ${album.artist}`}
              className="px-6 py-3 border-2 border-burnt-peach text-burnt-peach font-mono text-[10px] tracking-widest uppercase rounded-lg hover:bg-burnt-peach/10 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2"
            >
              Add Details →
            </button>
          </div>
        </div>

        {/* GradingSheet */}
        <GradingSheet
          isOpen={gradingSheetOpen}
          onClose={() => setGradingSheetOpen(false)}
          onGradeSelected={async (grade) => {
            await onUpdate({ condition: grade });
          }}
          format={album.format || 'Vinyl'}
          currentGrade={album.condition as ConditionGrade | undefined}
        />
      </div>
    );
  }

  return (
    <div className="bg-paper min-h-[600px] relative">
      {/* Background ruled lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(42, 32, 22, 0.1) 0px, rgba(42, 32, 22, 0.1) 1px, transparent 1px, transparent 32px)',
        }}
      />

      {/* Acquired date annotation (top-right) */}
      {album.acquired_date && (
        <div
          className="absolute top-4 right-4 font-serif text-[10px] text-ink/40 italic"
          style={{ transform: 'rotate(-2deg)' }}
        >
          acquired {new Date(album.acquired_date).getFullYear()}
        </div>
      )}

      <div className="relative space-y-8">
        {/* Condition Section */}
        <section>
          <div className="flex items-center gap-4 mb-4">
            <h4 className="font-mono text-[8px] tracking-[0.3em] uppercase text-ink/60">Condition</h4>
            <div className="flex-1 h-px bg-paper-dark" />
          </div>

          {conditionInfo ? (
            /* Condition Hero Card */
            <div className="bg-cream rounded-xl border border-paper-dark p-4 flex items-center gap-4">
              {/* Left accent bar */}
              <div className="w-1 h-16 bg-burnt-peach rounded-full" />

              {/* Circular badge */}
              <div className="w-[52px] h-[52px] rounded-full bg-ink flex items-center justify-center flex-shrink-0">
                <span className="font-display font-bold text-pearl-beige text-lg">{conditionInfo.shortLabel}</span>
              </div>

              {/* Grade details */}
              <div className="flex-1 min-w-0">
                <p className="font-display text-[15px] text-ink">{conditionInfo.label}</p>
                <p className="font-serif text-[11px] text-ink/60 italic">{conditionInfo.description}</p>
              </div>

              {/* Edit button */}
              <button
                onClick={() => setGradingSheetOpen(true)}
                aria-label="Edit condition grade"
                className="px-4 py-2 border-2 border-burnt-peach text-burnt-peach font-mono text-[10px] tracking-widest uppercase rounded-lg hover:bg-burnt-peach/10 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2"
              >
                Edit
              </button>
            </div>
          ) : (
            /* Invitation Card */
            <div className="bg-cream rounded-xl border-2 border-dashed border-paper-dark p-6 text-center">
              <h5 className="font-display text-[15px] text-ink/60 mb-2">Grade your copy</h5>
              <p className="font-serif text-[11px] text-ink/60 italic mb-4">
                Takes 30 seconds. Unlocks value estimates.
              </p>
              <button
                onClick={() => setGradingSheetOpen(true)}
                aria-label={`Grade ${album.title} by ${album.artist}`}
                className="px-6 py-2 bg-burnt-peach text-white font-mono text-[10px] tracking-widest uppercase rounded-lg hover:bg-burnt-peach/90 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2"
              >
                Grade Now
              </button>
            </div>
          )}
        </section>

        {/* Value Section */}
        {album.condition && (
          <section>
            {userPlan === 'collector' || userPlan === 'curator' ? (
              /* Upgrade prompt */
              <div className="bg-ink text-pearl-beige rounded-xl p-6">
                <h5 className="font-display text-[18px] mb-2">See what your collection is worth</h5>
                <p className="font-serif text-[13px] italic mb-4">
                  Upgrade to Enthusiast to unlock live Discogs pricing.
                </p>
                <button className="px-6 py-2 bg-burnt-peach text-white font-mono text-[10px] tracking-widest uppercase rounded-lg hover:bg-burnt-peach/90 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2">
                  Upgrade to Enthusiast
                </button>
              </div>
            ) : !discogsConnected ? (
              /* Discogs connection prompt */
              <div className="bg-ink text-pearl-beige rounded-xl p-6">
                <h5 className="font-display text-[18px] mb-2">Connect Discogs to see value</h5>
                <p className="font-serif text-[13px] italic mb-4">
                  Link your Discogs account to unlock marketplace pricing.
                </p>
                <button className="px-6 py-2 bg-burnt-peach text-white font-mono text-[10px] tracking-widest uppercase rounded-lg hover:bg-burnt-peach/90 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2">
                  Connect Discogs
                </button>
              </div>
            ) : (
              /* Value display placeholder (will fetch from API) */
              <div className="bg-ink text-pearl-beige rounded-xl p-6">
                <div className="font-mono text-[8px] tracking-[0.3em] uppercase text-pearl-beige/60 mb-2">
                  Est. Value ({album.condition})
                </div>
                <div className="font-display text-[28px] text-pearl-beige mb-1">$—</div>
                <div className="font-mono text-[9px] text-pearl-beige/60">
                  Price data will be fetched in production
                </div>
              </div>
            )}
          </section>
        )}

        {/* My Copy Fields Section */}
        <section>
          <div className="flex items-center gap-4 mb-4">
            <h4 className="font-mono text-[8px] tracking-[0.3em] uppercase text-ink/60">My Copy</h4>
            <div className="flex-1 h-px bg-paper-dark" />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Paid */}
            <div className="bg-cream rounded-lg border border-paper-dark p-3">
              <label className="font-mono text-[7px] tracking-[0.3em] uppercase text-ink/60 block mb-1">
                Paid
              </label>
              {editingField === 'purchase_price' ? (
                <input
                  type="number"
                  step="0.01"
                  autoFocus
                  defaultValue={album.purchase_price || ''}
                  onBlur={(e) => handleFieldUpdate('purchase_price', parseFloat(e.target.value) || null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFieldUpdate('purchase_price', parseFloat(e.currentTarget.value) || null);
                    }
                  }}
                  className="font-serif text-[13px] text-ink w-full bg-transparent border-none outline-none"
                />
              ) : (
                <div
                  onClick={() => setEditingField('purchase_price')}
                  className="font-serif text-[13px] text-ink cursor-pointer"
                >
                  {album.purchase_price ? `$${album.purchase_price.toFixed(2)}` : '—'}
                </div>
              )}
            </div>

            {/* Acquired */}
            <div className="bg-cream rounded-lg border border-paper-dark p-3">
              <label className="font-mono text-[7px] tracking-[0.3em] uppercase text-ink/60 block mb-1">
                Acquired
              </label>
              {editingField === 'acquired_date' ? (
                <input
                  type="date"
                  autoFocus
                  defaultValue={album.acquired_date || ''}
                  onBlur={(e) => handleFieldUpdate('acquired_date', e.target.value || null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFieldUpdate('acquired_date', e.currentTarget.value || null);
                    }
                  }}
                  className="font-serif text-[13px] text-ink w-full bg-transparent border-none outline-none"
                />
              ) : (
                <div
                  onClick={() => setEditingField('acquired_date')}
                  className="font-serif text-[13px] text-ink cursor-pointer"
                >
                  {album.acquired_date
                    ? new Date(album.acquired_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : '—'}
                </div>
              )}
            </div>

            {/* Source */}
            <div className="bg-cream rounded-lg border border-paper-dark p-3">
              <label className="font-mono text-[7px] tracking-[0.3em] uppercase text-ink/60 block mb-1">
                Source
              </label>
              {editingField === 'acquired_from' ? (
                <input
                  type="text"
                  autoFocus
                  defaultValue={album.acquired_from || ''}
                  onBlur={(e) => handleFieldUpdate('acquired_from', e.target.value || null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFieldUpdate('acquired_from', e.currentTarget.value || null);
                    }
                  }}
                  className="font-serif text-[13px] text-ink w-full bg-transparent border-none outline-none"
                />
              ) : (
                <div
                  onClick={() => setEditingField('acquired_from')}
                  className="font-serif text-[13px] text-ink cursor-pointer"
                >
                  {album.acquired_from || '—'}
                </div>
              )}
            </div>

            {/* Format */}
            <div className="bg-cream rounded-lg border border-paper-dark p-3">
              <label className="font-mono text-[7px] tracking-[0.3em] uppercase text-ink/60 block mb-1">
                Format
              </label>
              <div className="font-serif text-[13px] text-ink">{album.format || '—'}</div>
            </div>
          </div>

          {/* Notes (full-width) */}
          <div className="bg-cream rounded-lg border border-paper-dark p-3">
            <label className="font-mono text-[7px] tracking-[0.3em] uppercase text-ink/60 block mb-1">
              Notes
            </label>
            {editingField === 'copy_notes' ? (
              <textarea
                autoFocus
                rows={3}
                defaultValue={album.copy_notes || ''}
                onBlur={(e) => handleFieldUpdate('copy_notes', e.target.value || null)}
                className="font-serif text-[13px] text-ink w-full bg-transparent border-none outline-none resize-none"
              />
            ) : (
              <div
                onClick={() => setEditingField('copy_notes')}
                className="font-serif text-[13px] text-ink cursor-pointer min-h-[3rem]"
              >
                {album.copy_notes || '—'}
              </div>
            )}
          </div>
        </section>

        {/* Pressing Section */}
        <section>
          <div className="flex items-center gap-4 mb-4">
            <h4 className="font-mono text-[8px] tracking-[0.3em] uppercase text-ink/60">Pressing</h4>
            <div className="flex-1 h-px bg-paper-dark" />
          </div>

          <div className="bg-cream rounded-lg border border-paper-dark divide-y divide-paper-dark">
            {/* Label */}
            <div className="p-3 flex justify-between items-center">
              <span className="font-mono text-[7px] tracking-[0.3em] uppercase text-ink/60">Label</span>
              <span className="font-serif text-[13px] text-ink">{album.label || '—'}</span>
            </div>

            {/* Cat. No. */}
            <div className="p-3 flex justify-between items-center">
              <span className="font-mono text-[7px] tracking-[0.3em] uppercase text-ink/60">Cat. No.</span>
              {editingField === 'catalog_number' ? (
                <input
                  type="text"
                  autoFocus
                  defaultValue={album.catalog_number || ''}
                  onBlur={(e) => handleFieldUpdate('catalog_number', e.target.value || null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFieldUpdate('catalog_number', e.currentTarget.value || null);
                    }
                  }}
                  className="font-serif text-[13px] text-blue-slate bg-transparent border-none outline-none text-right"
                />
              ) : (
                <span
                  onClick={() => setEditingField('catalog_number')}
                  className={`font-serif text-[13px] cursor-pointer ${
                    album.catalog_number ? 'text-blue-slate' : 'text-ink'
                  }`}
                >
                  {album.catalog_number || '—'}
                </span>
              )}
            </div>

            {/* Country */}
            <div className="p-3 flex justify-between items-center">
              <span className="font-mono text-[7px] tracking-[0.3em] uppercase text-ink/60">Country</span>
              {editingField === 'pressing_country' ? (
                <input
                  type="text"
                  autoFocus
                  defaultValue={album.pressing_country || ''}
                  onBlur={(e) => handleFieldUpdate('pressing_country', e.target.value || null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFieldUpdate('pressing_country', e.currentTarget.value || null);
                    }
                  }}
                  className="font-serif text-[13px] text-ink bg-transparent border-none outline-none text-right"
                />
              ) : (
                <span
                  onClick={() => setEditingField('pressing_country')}
                  className="font-serif text-[13px] text-ink cursor-pointer"
                >
                  {album.pressing_country || '—'}
                </span>
              )}
            </div>

            {/* Year */}
            <div className="p-3 flex justify-between items-center">
              <span className="font-mono text-[7px] tracking-[0.3em] uppercase text-ink/60">Year</span>
              {editingField === 'pressing_year' ? (
                <input
                  type="number"
                  autoFocus
                  defaultValue={album.pressing_year || ''}
                  onBlur={(e) => handleFieldUpdate('pressing_year', parseInt(e.target.value) || null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFieldUpdate('pressing_year', parseInt(e.currentTarget.value) || null);
                    }
                  }}
                  className={`font-serif text-[13px] bg-transparent border-none outline-none text-right ${
                    album.pressing_year && album.pressing_year.toString() !== album.year
                      ? 'text-blue-slate'
                      : 'text-ink'
                  }`}
                />
              ) : (
                <span
                  onClick={() => setEditingField('pressing_year')}
                  className={`font-serif text-[13px] cursor-pointer ${
                    album.pressing_year && album.pressing_year.toString() !== album.year
                      ? 'text-blue-slate'
                      : 'text-ink'
                  }`}
                >
                  {album.pressing_year || album.year || '—'}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Footer Stamp */}
        <div className="flex items-center justify-center gap-4 py-6">
          <div className="flex-1 h-px bg-ink/20" />
          <span className="font-mono text-[7px] tracking-[0.3em] uppercase text-ink/20">Rekkrd</span>
          <div className="flex-1 h-px bg-ink/20" />
        </div>
      </div>

      {/* GradingSheet */}
      <GradingSheet
        isOpen={gradingSheetOpen}
        onClose={() => setGradingSheetOpen(false)}
        onGradeSelected={async (grade) => {
          await onUpdate({ condition: grade });
        }}
        format={album.format || 'Vinyl'}
        currentGrade={album.condition as ConditionGrade | undefined}
      />
    </div>
  );
};

export default MyCopyTab;
