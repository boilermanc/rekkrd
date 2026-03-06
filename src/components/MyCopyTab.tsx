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
      <div className="bg-paper-warm min-h-[600px] relative flex items-center justify-center">
        <div className="flex flex-col items-center text-center gap-3 py-10 px-6">
          {/* Icon container */}
          <div className="w-12 h-12 rounded-full bg-paper-dark border border-paper-darker flex items-center justify-center">
            <svg className="w-6 h-6 text-ink/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>

          {/* Heading */}
          <h3 className="font-display text-[20px] text-ink-soft">Make it yours</h3>

          {/* Body */}
          <p className="font-serif text-[13px] text-ink-soft italic leading-relaxed">
            Track condition, what you paid, where you got it.<br />
            Your copy — your story.
          </p>

          {/* Buttons */}
          <div className="flex gap-3 mt-1">
            <button
              onClick={() => setGradingSheetOpen(true)}
              aria-label={`Grade your copy of ${album.title} by ${album.artist}`}
              className="border border-burnt-peach text-burnt-peach bg-burnt-peach/10 font-mono text-[8px] tracking-widest uppercase px-4 py-2.5 rounded-xl hover:bg-burnt-peach/20 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2"
            >
              Grade Your Copy →
            </button>
            <button
              onClick={() => setShowDetailsOverride(true)}
              aria-label={`Add details for ${album.title} by ${album.artist}`}
              className="border border-burnt-peach text-burnt-peach bg-burnt-peach/10 font-mono text-[8px] tracking-widest uppercase px-4 py-2.5 rounded-xl hover:bg-burnt-peach/20 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2"
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
    <div className="bg-paper-warm min-h-[600px] relative">
      {/* Background ruled lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(162,140,100,0.10) 31px, rgba(162,140,100,0.10) 32px)',
        }}
      />

      {/* Acquired date annotation (top-right) */}
      {album.acquired_date && (
        <div
          className="absolute top-4 right-5 font-serif italic text-[10px] text-ink-soft/40"
          style={{ transform: 'rotate(-2deg)' }}
        >
          acquired {new Date(album.acquired_date).getFullYear()}
        </div>
      )}

      <div className="relative space-y-8">
        {/* Condition Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h4 className="font-mono text-[8px] tracking-[3px] uppercase text-ink-soft">Condition</h4>
            <div className="flex-1 h-px bg-paper-darker" />
          </div>

          {conditionInfo ? (
            /* Condition Hero Card */
            <div className="relative bg-cream border border-paper-darker rounded-2xl shadow-sm p-4 flex items-center gap-4">
              {/* Left accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-burnt-peach rounded-l-2xl" />

              {/* Circular badge */}
              <div className="w-[52px] h-[52px] rounded-full bg-ink flex items-center justify-center flex-shrink-0 ml-2">
                <span className="font-display font-bold text-pearl-beige text-lg">{conditionInfo.shortLabel}</span>
              </div>

              {/* Grade details */}
              <div className="flex-1 min-w-0">
                <p className="font-display text-[15px] text-ink">{conditionInfo.label}</p>
                <p className="font-serif text-[11px] text-ink-soft italic">{conditionInfo.description}</p>
              </div>

              {/* Edit button */}
              <button
                onClick={() => setGradingSheetOpen(true)}
                aria-label="Edit condition grade"
                className="text-burnt-peach border border-burnt-peach/40 bg-burnt-peach/10 font-mono text-[8px] tracking-wide uppercase px-3 py-1.5 rounded-lg hover:bg-burnt-peach/20 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2"
              >
                Edit
              </button>
            </div>
          ) : (
            /* Invitation Card */
            <div className="bg-cream rounded-2xl border-2 border-dashed border-paper-darker p-6 text-center shadow-sm">
              <h5 className="font-display text-[15px] text-ink-soft mb-2">Grade your copy</h5>
              <p className="font-serif text-[11px] text-ink-soft italic mb-4">
                Takes 30 seconds. Unlocks value estimates.
              </p>
              <button
                onClick={() => setGradingSheetOpen(true)}
                aria-label={`Grade ${album.title} by ${album.artist}`}
                className="px-6 py-2 bg-burnt-peach text-white font-mono text-[9px] tracking-wide uppercase rounded-lg hover:bg-burnt-peach/90 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2"
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
              /* Upgrade prompt — stays dark */
              <div className="bg-ink rounded-2xl p-6">
                <h5 className="font-display text-[15px] text-pearl-beige mb-2">See what your collection is worth</h5>
                <p className="font-serif text-[11px] text-white/50 italic mb-4">
                  Upgrade to Enthusiast to unlock live Discogs pricing.
                </p>
                <button className="bg-burnt-peach text-white font-mono text-[9px] tracking-wide uppercase px-4 py-2 rounded-lg hover:bg-burnt-peach/90 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2">
                  Upgrade to Enthusiast
                </button>
              </div>
            ) : !discogsConnected ? (
              /* Discogs connection prompt — stays dark */
              <div className="bg-ink rounded-2xl p-6">
                <h5 className="font-display text-[15px] text-pearl-beige mb-2">Connect Discogs to see value</h5>
                <p className="font-serif text-[11px] text-white/50 italic mb-4">
                  Link your Discogs account to unlock marketplace pricing.
                </p>
                <button className="bg-burnt-peach text-white font-mono text-[9px] tracking-wide uppercase px-4 py-2 rounded-lg hover:bg-burnt-peach/90 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2">
                  Connect Discogs
                </button>
              </div>
            ) : (
              /* Value display — stays dark */
              <div className="bg-ink rounded-2xl p-6">
                <div className="font-mono text-[7px] tracking-widest uppercase text-white/30 mb-2">
                  Est. Value ({album.condition})
                </div>
                <div className="font-display text-[28px] text-pearl-beige mb-1">$—</div>
                <div className="font-mono text-[8px] text-burnt-peach/80">
                  View on Discogs →
                </div>
              </div>
            )}
          </section>
        )}

        {/* My Copy Fields Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h4 className="font-mono text-[8px] tracking-[3px] uppercase text-ink-soft">My Copy</h4>
            <div className="flex-1 h-px bg-paper-darker" />
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {/* Paid */}
            <div className="bg-cream border border-paper-darker rounded-xl p-3 shadow-sm">
              <label className="font-mono text-[7px] tracking-[2px] uppercase text-ink-soft block mb-1">
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
                  className="bg-transparent font-serif text-[13px] text-ink border-b border-burnt-peach/50 outline-none w-full"
                />
              ) : (
                <div
                  onClick={() => setEditingField('purchase_price')}
                  className={`font-serif text-[13px] cursor-pointer ${album.purchase_price ? 'text-ink' : 'font-serif text-[12px] text-ink-soft italic'}`}
                >
                  {album.purchase_price ? `$${album.purchase_price.toFixed(2)}` : '—'}
                </div>
              )}
            </div>

            {/* Acquired */}
            <div className="bg-cream border border-paper-darker rounded-xl p-3 shadow-sm">
              <label className="font-mono text-[7px] tracking-[2px] uppercase text-ink-soft block mb-1">
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
                  className="bg-transparent font-serif text-[13px] text-ink border-b border-burnt-peach/50 outline-none w-full"
                />
              ) : (
                <div
                  onClick={() => setEditingField('acquired_date')}
                  className={`font-serif text-[13px] cursor-pointer ${album.acquired_date ? 'text-ink' : 'font-serif text-[12px] text-ink-soft italic'}`}
                >
                  {album.acquired_date
                    ? new Date(album.acquired_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : '—'}
                </div>
              )}
            </div>

            {/* Source */}
            <div className="bg-cream border border-paper-darker rounded-xl p-3 shadow-sm">
              <label className="font-mono text-[7px] tracking-[2px] uppercase text-ink-soft block mb-1">
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
                  className="bg-transparent font-serif text-[13px] text-ink border-b border-burnt-peach/50 outline-none w-full"
                />
              ) : (
                <div
                  onClick={() => setEditingField('acquired_from')}
                  className={`font-serif text-[13px] cursor-pointer ${album.acquired_from ? 'text-ink' : 'font-serif text-[12px] text-ink-soft italic'}`}
                >
                  {album.acquired_from || '—'}
                </div>
              )}
            </div>

            {/* Format */}
            <div className="bg-cream border border-paper-darker rounded-xl p-3 shadow-sm">
              <label className="font-mono text-[7px] tracking-[2px] uppercase text-ink-soft block mb-1">
                Format
              </label>
              <div className={`font-serif text-[13px] ${album.format ? 'text-ink' : 'text-[12px] text-ink-soft italic'}`}>
                {album.format || '—'}
              </div>
            </div>
          </div>

          {/* Notes (full-width) */}
          <div className="bg-cream border border-paper-darker rounded-xl p-3 shadow-sm">
            <label className="font-mono text-[7px] tracking-[2px] uppercase text-ink-soft block mb-1">
              Notes
            </label>
            {editingField === 'copy_notes' ? (
              <textarea
                autoFocus
                rows={3}
                defaultValue={album.copy_notes || ''}
                onBlur={(e) => handleFieldUpdate('copy_notes', e.target.value || null)}
                className="bg-transparent font-serif text-[13px] text-ink border-b border-burnt-peach/50 outline-none w-full resize-none"
              />
            ) : (
              <div
                onClick={() => setEditingField('copy_notes')}
                className={`font-serif text-[13px] cursor-pointer min-h-[3rem] ${album.copy_notes ? 'text-ink' : 'font-serif text-[12px] text-ink-soft italic'}`}
              >
                {album.copy_notes || '—'}
              </div>
            )}
          </div>
        </section>

        {/* Pressing Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h4 className="font-mono text-[8px] tracking-[3px] uppercase text-ink-soft">Pressing</h4>
            <div className="flex-1 h-px bg-paper-darker" />
          </div>

          <div className="bg-cream border border-paper-darker rounded-xl overflow-hidden shadow-sm">
            {/* Label */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-paper-darker">
              <span className="font-mono text-[9px] tracking-wide text-ink-soft">Label</span>
              <span className="font-serif text-[13px] text-ink">{album.label || '—'}</span>
            </div>

            {/* Cat. No. */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-paper-darker">
              <span className="font-mono text-[9px] tracking-wide text-ink-soft">Cat. No.</span>
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
                  className="font-serif text-[13px] text-blue-slate font-semibold bg-transparent border-none outline-none text-right"
                />
              ) : (
                <span
                  onClick={() => setEditingField('catalog_number')}
                  className={`font-serif text-[13px] cursor-pointer ${
                    album.catalog_number ? 'text-blue-slate font-semibold' : 'text-ink'
                  }`}
                >
                  {album.catalog_number || '—'}
                </span>
              )}
            </div>

            {/* Country */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-paper-darker">
              <span className="font-mono text-[9px] tracking-wide text-ink-soft">Country</span>
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
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-mono text-[9px] tracking-wide text-ink-soft">Year</span>
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
                      ? 'text-blue-slate font-semibold'
                      : 'text-ink'
                  }`}
                />
              ) : (
                <span
                  onClick={() => setEditingField('pressing_year')}
                  className={`font-serif text-[13px] cursor-pointer ${
                    album.pressing_year && album.pressing_year.toString() !== album.year
                      ? 'text-blue-slate font-semibold'
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
        <div className="flex items-center justify-center gap-2.5 opacity-20 mt-6">
          <div className="flex-1 h-px bg-ink" />
          <span className="font-mono text-[7px] tracking-[3px] uppercase text-ink">Rekkrd</span>
          <div className="flex-1 h-px bg-ink" />
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
