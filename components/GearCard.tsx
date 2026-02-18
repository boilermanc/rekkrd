
import React from 'react';
import { Gear, GearCategory } from '../types';

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

/** Category-specific placeholder icons (outline style). */
function CategoryIcon({ category }: { category: GearCategory }) {
  const cls = "w-10 h-10 text-th-text3/20";
  switch (category) {
    case 'turntable':
      // Disc/vinyl icon
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'speakers':
    case 'subwoofer':
      // Speaker icon
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      );
    case 'headphones':
      // Headphones icon
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
      // Signal/bolt icon
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      );
    case 'cartridge':
      // Stylus/pen icon
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
      );
    case 'dac':
      // Chip/cpu icon
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
        </svg>
      );
    default:
      // Cable/link icon
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      );
  }
}

interface GearCardProps {
  gear: Gear;
  onClick: (gear: Gear) => void;
}

const GearCard: React.FC<GearCardProps> = ({ gear, onClick }) => {
  const imageUrl = gear.image_url || gear.original_photo_url;
  const label = CATEGORY_LABELS[gear.category] || gear.category;
  const truncatedDesc = gear.description
    ? gear.description.length > 80
      ? gear.description.slice(0, 80) + '...'
      : gear.description
    : null;

  return (
    <div
      onClick={() => onClick(gear)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(gear);
        }
      }}
      className="group relative glass-morphism rounded-xl overflow-hidden hover:neon-border transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-th-surface/[0.06] flex"
      role="button"
      tabIndex={0}
      aria-label={`${gear.brand} ${gear.model} - ${label}`}
    >
      {/* Thumbnail */}
      <div className="w-24 h-24 md:w-28 md:h-28 flex-shrink-0 overflow-hidden bg-th-bg/40 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${gear.brand} ${gear.model}`}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
        ) : (
          <CategoryIcon category={gear.category} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 p-3 md:p-4 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="inline-block bg-[#dd6e42]/15 border border-[#dd6e42]/25 text-[#f0a882] text-[9px] font-label font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full">
            {label}
          </span>
          {gear.year && (
            <span className="text-th-text3/50 text-[10px] uppercase tracking-widest">{gear.year}</span>
          )}
        </div>
        <h3 className="font-bold text-th-text text-sm md:text-base truncate" title={`${gear.brand} ${gear.model}`}>
          {gear.brand} {gear.model}
        </h3>
        {truncatedDesc && (
          <p className="text-th-text3/60 text-[11px] mt-1 leading-snug line-clamp-1">
            {truncatedDesc}
          </p>
        )}
      </div>

      {/* Hover overlay hint */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="bg-th-surface/[0.08] backdrop-blur-md border border-th-surface/[0.15] p-1.5 rounded-full">
          <svg className="w-4 h-4 text-th-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GearCard);
