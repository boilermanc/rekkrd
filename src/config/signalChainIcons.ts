import {
  Disc3,
  Pen,
  Zap,
  Cpu,
  SlidersHorizontal,
  Volume2,
  Radio,
  Speaker,
  Headphones,
  Cable,
  type LucideIcon,
} from 'lucide-react';
import type { GearCategory } from '../types';

/** Maps each gear category to a Lucide icon for signal chain display. */
const SIGNAL_CHAIN_ICONS: Record<GearCategory, LucideIcon> = {
  turntable: Disc3,
  cartridge: Pen,
  phono_preamp: Zap,
  dac: Cpu,
  preamp: SlidersHorizontal,
  amplifier: Volume2,
  receiver: Radio,
  speakers: Speaker,
  headphones: Headphones,
  subwoofer: Speaker,
  cables_other: Cable,
};

/** Returns the Lucide icon component for a gear category. */
export function getSignalChainIcon(category: string): LucideIcon {
  return (SIGNAL_CHAIN_ICONS as Record<string, LucideIcon>)[category] ?? Disc3;
}
