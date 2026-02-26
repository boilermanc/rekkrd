export const GEAR_CATEGORY_IMAGES: Record<string, string> = {
  turntable: 'https://cvqqiuhloefvaaacwxkg.supabase.co/storage/v1/object/public/gear-category-images/BCO.09566462-3700-483e-991a-663149e2dc9b.png',
  cartridge: '',
  phono_preamp: '',
  preamp: '',
  amplifier: '',
  receiver: '',
  speakers: '',
  headphones: '',
  dac: '',
  subwoofer: '',
  cables_other: '',
};

export function getGearImage(imageUrl: string | null, category: string | null): string {
  if (imageUrl) return imageUrl;
  if (category && GEAR_CATEGORY_IMAGES[category]) return GEAR_CATEGORY_IMAGES[category];
  return '';
}
