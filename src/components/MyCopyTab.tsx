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
      <div className="bg-[#f5efe3] min-h-[600px] relative flex items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center text-center gap-3 py-10 px-6">
          {/* Icon container */}
          <div className="w-12 h-12 rounded-full bg-[#ede4d3] border border-[#e0d4bc] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#2a2016]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>

          {/* Heading */}
          <h3 className="font-display text-[20px] text-[#9a8f80]">Make it yours</h3>

          {/* Body */}
          <p className="font-serif text-[14px] text-[#9a8f80] italic leading-relaxed">
            Track condition, what you paid, where you got it.<br />
            Your copy — your story.
          </p>

          {/* Buttons */}
          <div className="flex gap-3 mt-1">
            <button
              onClick={() => setGradingSheetOpen(true)}
              aria-label={`Grade your copy of ${album.title} by ${album.artist}`}
              className="border-[1.5px] border-burnt-peach text-burnt-peach bg-burnt-peach/8 font-mono text-[10px] tracking-widest uppercase px-5 py-2.5 rounded-xl hover:bg-burnt-peach/20 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2"
            >
              Grade Your Copy
            </button>
            <button
              onClick={() => setShowDetailsOverride(true)}
              aria-label={`Add details for ${album.title} by ${album.artist}`}
              className="border-[1.5px] border-burnt-peach text-burnt-peach bg-burnt-peach/8 font-mono text-[10px] tracking-widest uppercase px-5 py-2.5 rounded-xl hover:bg-burnt-peach/20 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2"
            >
              Add Details
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
    <div className="bg-[#f5efe3] relative overflow-hidden">
      {/* Background ruled lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 35px, rgba(162,140,100,0.09) 35px, rgba(162,140,100,0.09) 36px)',
        }}
      />

      {/* Acquired date annotation (top-right) */}
      {album.acquired_date && (
        <div
          className="absolute top-[18px] right-8 font-serif italic text-[11px] text-[#9a8f80] opacity-45 z-[2]"
          style={{ transform: 'rotate(-1.5deg)' }}
        >
          acquired {new Date(album.acquired_date).getFullYear()}
        </div>
      )}

      <div className="relative px-8 py-7 pb-10">
        {/* ── CONDITION ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h4 className="font-mono text-[10px] tracking-[3px] uppercase text-[#9a8f80] flex-shrink-0">Condition</h4>
            <div className="flex-1 h-px bg-[#ddd4be]" />
          </div>

          {conditionInfo ? (
            /* Condition Hero Card */
            <div
              className="relative bg-[#fefcf8] border border-[#e0d4bc] rounded-2xl overflow-hidden flex items-center gap-5 mb-4"
              style={{ padding: '22px 22px 22px 26px', boxShadow: '0 2px 12px rgba(42,32,22,0.07)' }}
            >
              {/* Left accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-burnt-peach rounded-l-2xl" />

              {/* Circular badge */}
              <div
                className="w-[60px] h-[60px] rounded-full bg-[#2a2016] text-[#e8dab2] flex items-center justify-center flex-shrink-0 font-display text-[20px] font-bold"
                style={{ letterSpacing: '-1px', boxShadow: '0 3px 12px rgba(42,32,22,0.25)' }}
              >
                {conditionInfo.shortLabel}
              </div>

              {/* Grade details */}
              <div className="flex-1 min-w-0">
                <p className="font-display text-[18px] text-[#2a2016] mb-1.5">{conditionInfo.label}</p>
                <p className="font-serif text-[13px] text-[#7a6f60] italic leading-relaxed">{conditionInfo.description}</p>
              </div>

              {/* Edit button */}
              <button
                onClick={() => setGradingSheetOpen(true)}
                aria-label="Edit condition grade"
                className="text-burnt-peach border-[1.5px] border-burnt-peach/35 bg-burnt-peach/8 font-mono text-[10px] tracking-[1.5px] uppercase px-3.5 py-2 rounded-lg flex-shrink-0 whitespace-nowrap hover:bg-burnt-peach/20 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2 cursor-pointer"
              >
                Edit
              </button>
            </div>
          ) : (
            /* Invitation Card */
            <div className="bg-[#fefcf8] rounded-2xl border-2 border-dashed border-[#e0d4bc] p-6 text-center mb-4" style={{ boxShadow: '0 2px 12px rgba(42,32,22,0.07)' }}>
              <h5 className="font-display text-[18px] text-[#9a8f80] mb-2">Grade your copy</h5>
              <p className="font-serif text-[13px] text-[#9a8f80] italic mb-4">
                Takes 30 seconds. Unlocks value estimates.
              </p>
              <button
                onClick={() => setGradingSheetOpen(true)}
                aria-label={`Grade ${album.title} by ${album.artist}`}
                className="px-6 py-2.5 bg-burnt-peach text-white font-mono text-[10px] tracking-[2px] uppercase rounded-xl hover:bg-burnt-peach/90 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2"
              >
                Grade Now
              </button>
            </div>
          )}
        </section>

        {/* ── VALUE / UPGRADE ───────────────────────────────── */}
        {album.condition && (
          <section className="mb-7">
            {userPlan === 'collector' || userPlan === 'curator' ? (
              /* Upgrade prompt — dark card */
              <div className="bg-[#2a2016] rounded-2xl" style={{ padding: '22px 24px', boxShadow: '0 4px 20px rgba(42,32,22,0.2)' }}>
                <h5 className="font-display text-[18px] text-[#e8dab2] mb-2">See what your collection is worth</h5>
                <p className="font-serif text-[13px] text-white/45 italic leading-relaxed mb-4">
                  Upgrade to Archivist to unlock live Discogs pricing.
                </p>
                <button className="bg-burnt-peach text-white font-mono text-[10px] tracking-[2px] uppercase px-5 py-2.5 rounded-xl border-none cursor-pointer hover:bg-burnt-peach/90 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2">
                  Upgrade to Archivist
                </button>
              </div>
            ) : !discogsConnected ? (
              /* Discogs connection prompt — dark card */
              <div className="bg-[#2a2016] rounded-2xl" style={{ padding: '22px 24px', boxShadow: '0 4px 20px rgba(42,32,22,0.2)' }}>
                <h5 className="font-display text-[18px] text-[#e8dab2] mb-2">Connect Discogs to see value</h5>
                <p className="font-serif text-[13px] text-white/45 italic leading-relaxed mb-4">
                  Link your Discogs account to unlock marketplace pricing.
                </p>
                <button className="bg-burnt-peach text-white font-mono text-[10px] tracking-[2px] uppercase px-5 py-2.5 rounded-xl border-none cursor-pointer hover:bg-burnt-peach/90 transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2">
                  Connect Discogs
                </button>
              </div>
            ) : (
              /* Value display — dark card */
              <div className="bg-[#2a2016] rounded-2xl flex items-center justify-between" style={{ padding: '22px 24px', boxShadow: '0 4px 20px rgba(42,32,22,0.2)' }}>
                <div>
                  <div className="font-mono text-[10px] tracking-[2px] uppercase text-white/35 mb-1.5">
                    Est. Value ({album.condition})
                  </div>
                  <div className="font-display text-[36px] text-[#e8dab2] leading-none" style={{ letterSpacing: '-1.5px' }}>$—</div>
                  <div className="font-mono text-[10px] text-white/25 mt-1.5">—</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[9px] tracking-[1.5px] uppercase text-white/25 border border-white/10 px-2.5 py-1 rounded mb-1.5 inline-block">
                    Discogs
                  </div>
                  <a href="#" className="font-mono text-[10px] text-burnt-peach/70 block">
                    View on Discogs →
                  </a>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── MY COPY FIELDS ────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h4 className="font-mono text-[10px] tracking-[3px] uppercase text-[#9a8f80] flex-shrink-0">My Copy</h4>
            <div className="flex-1 h-px bg-[#ddd4be]" />
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-7">
            {/* Paid */}
            <div className="bg-[#fefcf8] border border-[#e0d4bc] rounded-xl" style={{ padding: '14px 16px', boxShadow: '0 1px 4px rgba(42,32,22,0.05)' }}>
              <label className="font-mono text-[9px] tracking-[2.5px] uppercase text-[#9a8f80] block mb-1.5">
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
                  className="bg-transparent font-serif text-[15px] text-[#2a2016] border-b border-burnt-peach/50 outline-none w-full"
                />
              ) : (
                <div
                  onClick={() => setEditingField('purchase_price')}
                  className={`font-serif cursor-pointer ${album.purchase_price ? 'text-[15px] text-[#2a2016] leading-relaxed' : 'text-[14px] text-[#bbb0a0] italic'}`}
                >
                  {album.purchase_price ? `$${album.purchase_price.toFixed(2)}` : '—'}
                </div>
              )}
            </div>

            {/* Acquired */}
            <div className="bg-[#fefcf8] border border-[#e0d4bc] rounded-xl" style={{ padding: '14px 16px', boxShadow: '0 1px 4px rgba(42,32,22,0.05)' }}>
              <label className="font-mono text-[9px] tracking-[2.5px] uppercase text-[#9a8f80] block mb-1.5">
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
                  className="bg-transparent font-serif text-[15px] text-[#2a2016] border-b border-burnt-peach/50 outline-none w-full"
                />
              ) : (
                <div
                  onClick={() => setEditingField('acquired_date')}
                  className={`font-serif cursor-pointer ${album.acquired_date ? 'text-[15px] text-[#2a2016] leading-relaxed' : 'text-[14px] text-[#bbb0a0] italic'}`}
                >
                  {album.acquired_date
                    ? new Date(album.acquired_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : '—'}
                </div>
              )}
            </div>

            {/* Source */}
            <div className="bg-[#fefcf8] border border-[#e0d4bc] rounded-xl" style={{ padding: '14px 16px', boxShadow: '0 1px 4px rgba(42,32,22,0.05)' }}>
              <label className="font-mono text-[9px] tracking-[2.5px] uppercase text-[#9a8f80] block mb-1.5">
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
                  className="bg-transparent font-serif text-[15px] text-[#2a2016] border-b border-burnt-peach/50 outline-none w-full"
                />
              ) : (
                <div
                  onClick={() => setEditingField('acquired_from')}
                  className={`font-serif cursor-pointer ${album.acquired_from ? 'text-[15px] text-[#2a2016] leading-relaxed' : 'text-[14px] text-[#bbb0a0] italic'}`}
                >
                  {album.acquired_from || '—'}
                </div>
              )}
            </div>

            {/* Format */}
            <div className="bg-[#fefcf8] border border-[#e0d4bc] rounded-xl" style={{ padding: '14px 16px', boxShadow: '0 1px 4px rgba(42,32,22,0.05)' }}>
              <label className="font-mono text-[9px] tracking-[2.5px] uppercase text-[#9a8f80] block mb-1.5">
                Format
              </label>
              <div className={`font-serif ${album.format ? 'text-[15px] text-[#2a2016] leading-relaxed' : 'text-[14px] text-[#bbb0a0] italic'}`}>
                {album.format || '—'}
              </div>
            </div>
          </div>

          {/* Notes (full-width) */}
          <div className="bg-[#fefcf8] border border-[#e0d4bc] rounded-xl col-span-2 mb-7" style={{ padding: '14px 16px', boxShadow: '0 1px 4px rgba(42,32,22,0.05)' }}>
            <label className="font-mono text-[9px] tracking-[2.5px] uppercase text-[#9a8f80] block mb-1.5">
              Notes
            </label>
            {editingField === 'copy_notes' ? (
              <textarea
                autoFocus
                rows={3}
                defaultValue={album.copy_notes || ''}
                onBlur={(e) => handleFieldUpdate('copy_notes', e.target.value || null)}
                className="bg-transparent font-serif text-[15px] text-[#2a2016] border-b border-burnt-peach/50 outline-none w-full resize-none"
              />
            ) : (
              <div
                onClick={() => setEditingField('copy_notes')}
                className={`font-serif cursor-pointer min-h-[3rem] ${album.copy_notes ? 'text-[15px] text-[#2a2016] leading-relaxed' : 'text-[14px] text-[#bbb0a0] italic'}`}
              >
                {album.copy_notes || '—'}
              </div>
            )}
          </div>
        </section>

        {/* ── PRESSING ──────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h4 className="font-mono text-[10px] tracking-[3px] uppercase text-[#9a8f80] flex-shrink-0">Pressing</h4>
            <div className="flex-1 h-px bg-[#ddd4be]" />
          </div>

          <div className="bg-[#fefcf8] border border-[#e0d4bc] rounded-xl overflow-hidden mb-7" style={{ boxShadow: '0 1px 4px rgba(42,32,22,0.05)' }}>
            {/* Label */}
            <div className="flex items-center justify-between border-b border-[#ede4d3]" style={{ padding: '14px 18px' }}>
              <span className="font-mono text-[10px] tracking-[1.5px] uppercase text-[#9a8f80]">Label</span>
              <span className="font-serif text-[15px] text-[#2a2016]">{album.label || '—'}</span>
            </div>

            {/* Cat. No. */}
            <div className="flex items-center justify-between border-b border-[#ede4d3]" style={{ padding: '14px 18px' }}>
              <span className="font-mono text-[10px] tracking-[1.5px] uppercase text-[#9a8f80]">Cat. No.</span>
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
                  className="font-serif text-[15px] text-[#4f6d7a] font-semibold bg-transparent border-none outline-none text-right"
                />
              ) : (
                <span
                  onClick={() => setEditingField('catalog_number')}
                  className={`font-serif text-[15px] cursor-pointer ${
                    album.catalog_number ? 'text-[#4f6d7a] font-semibold' : 'text-[#2a2016]'
                  }`}
                >
                  {album.catalog_number || '—'}
                </span>
              )}
            </div>

            {/* Country */}
            <div className="flex items-center justify-between border-b border-[#ede4d3]" style={{ padding: '14px 18px' }}>
              <span className="font-mono text-[10px] tracking-[1.5px] uppercase text-[#9a8f80]">Country</span>
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
                  className="font-serif text-[15px] text-[#2a2016] bg-transparent border-none outline-none text-right"
                />
              ) : (
                <span
                  onClick={() => setEditingField('pressing_country')}
                  className="font-serif text-[15px] text-[#2a2016] cursor-pointer"
                >
                  {album.pressing_country || '—'}
                </span>
              )}
            </div>

            {/* Year */}
            <div className="flex items-center justify-between" style={{ padding: '14px 18px' }}>
              <span className="font-mono text-[10px] tracking-[1.5px] uppercase text-[#9a8f80]">Year</span>
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
                  className={`font-serif text-[15px] bg-transparent border-none outline-none text-right ${
                    album.pressing_year && album.pressing_year.toString() !== album.year
                      ? 'text-[#4f6d7a] font-semibold'
                      : 'text-[#2a2016]'
                  }`}
                />
              ) : (
                <span
                  onClick={() => setEditingField('pressing_year')}
                  className={`font-serif text-[15px] cursor-pointer ${
                    album.pressing_year && album.pressing_year.toString() !== album.year
                      ? 'text-[#4f6d7a] font-semibold'
                      : 'text-[#2a2016]'
                  }`}
                >
                  {album.pressing_year || album.year || '—'}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── FOOTER STAMP ──────────────────────────────────── */}
        <div className="flex items-center gap-3.5 opacity-[0.18] mt-2">
          <div className="flex-1 h-px bg-[#2a2016]" />
          <span className="font-mono text-[9px] tracking-[4px] uppercase text-[#2a2016]">Rekkrd</span>
          <div className="flex-1 h-px bg-[#2a2016]" />
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
