export type ConditionGrade = 'M' | 'NM' | 'VG+' | 'VG' | 'G+' | 'G' | 'F' | 'P';

export interface ConditionOption {
  value: ConditionGrade;
  label: string;
  shortLabel: string;
  sortOrder: number;
  discogsKey: string;
  description: string;
  vinylDetail: string;
  cdDetail: string;
}

export const CONDITION_GRADES: ConditionOption[] = [
  {
    value: 'M',
    label: 'Mint (M)',
    shortLabel: 'M',
    sortOrder: 1,
    discogsKey: 'Mint (M)',
    description: 'Perfect. Unplayed. Often still sealed.',
    vinylDetail: 'No marks whatsoever. Grooves pristine. Rarely assigned — if you have played it, it is not Mint.',
    cdDetail: 'Sealed or unplayed. Mirror-like disc. No marks on case, booklet, or tray.',
  },
  {
    value: 'NM',
    label: 'Near Mint (NM)',
    shortLabel: 'NM',
    sortOrder: 2,
    discogsKey: 'Near Mint (NM or M-)',
    description: 'Nearly perfect. May have been played once or twice.',
    vinylDetail: 'No visible marks under normal light. Grooves sharp. Dead quiet between tracks.',
    cdDetail: 'Disc mirror-like or near-so. Fine hairlines only. All inserts present and perfect.',
  },
  {
    value: 'VG+',
    label: 'Very Good Plus (VG+)',
    shortLabel: 'VG+',
    sortOrder: 3,
    discogsKey: 'Very Good Plus (VG+)',
    description: 'Light signs of play. Looks great, plays quietly.',
    vinylDetail: 'Faint marks visible only under direct light. Occasional faint tick. The sweet spot for most collections.',
    cdDetail: 'Light hairlines on disc. Plays flawlessly. Booklet and case in good shape with minor wear.',
  },
  {
    value: 'VG',
    label: 'Very Good (VG)',
    shortLabel: 'VG',
    sortOrder: 4,
    discogsKey: 'Very Good (VG)',
    description: 'Clearly played. Surface noise present but enjoyable.',
    vinylDetail: 'Marks visible in normal light. Audible surface noise but does not overpower music.',
    cdDetail: 'Visible scratches in normal light. May have occasional skip. Wear on packaging.',
  },
  {
    value: 'G+',
    label: 'Good Plus (G+)',
    shortLabel: 'G+',
    sortOrder: 5,
    discogsKey: 'Good Plus (G+)',
    description: 'Heavy wear. Still plays through without skipping.',
    vinylDetail: 'Heavy marks clearly visible. Significant surface noise. A beater copy. Rarely used for CDs.',
    cdDetail: 'Heavy scratches. Plays with difficulty. Missing or damaged inserts.',
  },
  {
    value: 'G',
    label: 'Good (G)',
    shortLabel: 'G',
    sortOrder: 6,
    discogsKey: 'Good (G)',
    description: 'Very heavy wear. Music barely audible over noise.',
    vinylDetail: 'Very heavy marks and scratches. Significant groove damage. Possible skips.',
    cdDetail: 'Deep gouges. Skips frequently or will not load reliably.',
  },
  {
    value: 'F',
    label: 'Fair (F)',
    shortLabel: 'F',
    sortOrder: 7,
    discogsKey: 'Fair (F)',
    description: 'Damaged. Plays with great difficulty.',
    vinylDetail: 'Plays but with extreme noise and skipping. Value only as a placeholder.',
    cdDetail: 'Barely readable. Catastrophic scratch damage.',
  },
  {
    value: 'P',
    label: 'Poor (P)',
    shortLabel: 'P',
    sortOrder: 8,
    discogsKey: 'Poor (P)',
    description: 'Essentially unplayable. Value only from rarity.',
    vinylDetail: 'Unplayable. Worth keeping only if extremely rare pressing.',
    cdDetail: 'Will not play. Disc physically damaged.',
  },
];

export const CONDITION_ORDER: Record<ConditionGrade, number> = Object.fromEntries(
  CONDITION_GRADES.map((g) => [g.value, g.sortOrder])
) as Record<ConditionGrade, number>;

export const CONDITION_BY_VALUE: Record<ConditionGrade, ConditionOption> = Object.fromEntries(
  CONDITION_GRADES.map((g) => [g.value, g])
) as Record<ConditionGrade, ConditionOption>;

// Vinyl-specific checklist questions
export const VINYL_CHECKLIST = [
  {
    id: 'visual',
    question: 'Hold the record under a light — what do you see?',
    options: [
      { label: 'No marks at all. Looks factory new.', score: 0 },
      { label: 'Faint marks only under direct light. Looks great normally.', score: 1 },
      { label: 'Marks visible in normal light. Clearly been played.', score: 2 },
      { label: 'Heavy marks, deep scratches clearly visible.', score: 3 },
    ],
  },
  {
    id: 'playback',
    question: 'How does it sound when played?',
    options: [
      { label: 'Unplayed or silent between tracks.', score: 0 },
      { label: 'Very quiet. Occasional faint tick or pop.', score: 1 },
      { label: 'Noticeable surface noise throughout.', score: 2 },
      { label: 'Heavy noise, skips, or struggles to track.', score: 3 },
    ],
  },
  {
    id: 'grooves',
    question: 'Look at the grooves edge-on under light',
    options: [
      { label: 'Grooves look sharp and deep. No clouding.', score: 0 },
      { label: 'Light cloudy haze in groove walls.', score: 1 },
      { label: 'Visible whitening throughout groove walls.', score: 2 },
    ],
  },
];

export const CD_CHECKLIST = [
  {
    id: 'disc',
    question: 'Look at the disc under a light — what do you see?',
    options: [
      { label: 'Mirror-like. No marks whatsoever.', score: 0 },
      { label: 'Fine hairlines only. Looks great.', score: 1 },
      { label: 'Visible scratches in normal light.', score: 2 },
      { label: 'Deep gouges or surface damage.', score: 3 },
    ],
  },
  {
    id: 'playback',
    question: 'How does it play?',
    options: [
      { label: 'Unplayed. Loads instantly, perfect.', score: 0 },
      { label: 'Plays flawlessly without any issues.', score: 1 },
      { label: 'Occasional skip or stutter.', score: 2 },
      { label: "Won't load or skips constantly.", score: 3 },
    ],
  },
  {
    id: 'packaging',
    question: 'Check booklet, tray card & case',
    options: [
      { label: 'All inserts present and perfect.', score: 0 },
      { label: 'Minor wear. All inserts present.', score: 1 },
      { label: 'Creasing, missing inserts, or cracked case.', score: 2 },
    ],
  },
];

// Score → grade mapping
// Total score 0 = M, 1 = NM, 2-3 = VG+, 4-5 = VG, 6-7 = G+, 8+ = G
export function scoreToGrade(total: number): ConditionGrade {
  if (total === 0) return 'M';
  if (total === 1) return 'NM';
  if (total <= 3) return 'VG+';
  if (total <= 5) return 'VG';
  if (total <= 7) return 'G+';
  return 'G';
}
