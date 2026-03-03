import type { GearCategory } from '../types';

/**
 * Signal chain sort priority for each gear category.
 * Lower number = earlier in the audio signal path.
 */
export const SIGNAL_CHAIN_ORDER: Record<GearCategory, number> = {
  turntable: 1,
  cartridge: 2,
  phono_preamp: 3,
  dac: 4,
  preamp: 5,
  amplifier: 6,
  receiver: 7,
  speakers: 8,
  headphones: 9,
  subwoofer: 10,
  cables_other: 99,
};

/** Gear categories sorted by signal chain position. */
export const SIGNAL_CHAIN_CATEGORIES: GearCategory[] = (
  Object.entries(SIGNAL_CHAIN_ORDER) as [GearCategory, number][]
)
  .sort(([, a], [, b]) => a - b)
  .map(([cat]) => cat);

const DEFAULT_ORDER = 100;

/** Returns the signal chain sort priority for a category. */
export function getSignalOrder(category: string): number {
  return (SIGNAL_CHAIN_ORDER as Record<string, number>)[category] ?? DEFAULT_ORDER;
}

/** Returns a new array of gear items sorted by signal chain order. */
export function sortBySignalFlow<T extends { category?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    return getSignalOrder(a.category ?? '') - getSignalOrder(b.category ?? '');
  });
}

/** A group of gear items sharing the same signal chain position. */
export interface SignalChainGroup<T> {
  category: string;
  order: number;
  items: T[];
}

/**
 * Groups gear by category and sorts groups by signal chain order.
 * Items within each group preserve their original array order.
 */
export function groupBySignalChain<T extends { category?: string }>(items: T[]): SignalChainGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const cat = item.category ?? '';
    const list = map.get(cat);
    if (list) list.push(item);
    else map.set(cat, [item]);
  }
  return Array.from(map.entries())
    .map(([category, groupItems]) => ({
      category,
      order: getSignalOrder(category),
      items: groupItems,
    }))
    .sort((a, b) => a.order - b.order);
}
