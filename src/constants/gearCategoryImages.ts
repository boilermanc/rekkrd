export const GEAR_CATEGORY_IMAGES: Record<string, string> = {
  turntable: 'https://cvqqiuhloefvaaacwxkg.supabase.co/storage/v1/object/public/gear-category-images/BCO.09566462-3700-483e-991a-663149e2dc9b.png',
  receiver: 'https://cvqqiuhloefvaaacwxkg.supabase.co/storage/v1/object/public/gear-category-images/BCO.8ab5c8e2-101f-469f-a756-3328628d42c4.png',
  cartridge: 'https://cvqqiuhloefvaaacwxkg.supabase.co/storage/v1/object/public/gear-category-images/BCO.e5447948-383c-404b-80f6-9892fb92a345.png',
  phono_preamp: 'https://cvqqiuhloefvaaacwxkg.supabase.co/storage/v1/object/public/gear-category-images/BCO.36ae9db6-5d48-4921-8f6d-0e6bfd98aea5.png',
  preamp: 'https://cvqqiuhloefvaaacwxkg.supabase.co/storage/v1/object/public/gear-category-images/BCO.3b9949ce-2f4d-4327-b091-31e8b28c595b.png',
  amplifier: 'https://cvqqiuhloefvaaacwxkg.supabase.co/storage/v1/object/public/gear-category-images/BCO.6b821be9-441e-47f2-aaf3-3a13551a433f.png',
  speakers: 'https://cvqqiuhloefvaaacwxkg.supabase.co/storage/v1/object/public/gear-category-images/BCO.1bbf59f3-b509-4dc1-8391-0ae106682d96.png',
  dac: 'https://cvqqiuhloefvaaacwxkg.supabase.co/storage/v1/object/public/gear-category-images/BCO.19da338b-b9a1-4a9f-9bcf-56cfe9df70ad.png',
  cables_other: 'https://cvqqiuhloefvaaacwxkg.supabase.co/storage/v1/object/public/gear-category-images/BCO.99bb7242-7cd0-42e3-8d4e-e6204c04be7a.png',
  subwoofer: 'https://cvqqiuhloefvaaacwxkg.supabase.co/storage/v1/object/public/gear-category-images/BCO.6c30e5bf-130c-4607-91ee-96910488dea9.png',
  headphones: 'https://cvqqiuhloefvaaacwxkg.supabase.co/storage/v1/object/public/gear-category-images/BCO.6b5da340-f4f4-49dc-a106-f3bce116896e.png',
};

export function getGearImage(imageUrl: string | null, category: string | null): string {
  if (imageUrl) return imageUrl;
  if (category && GEAR_CATEGORY_IMAGES[category]) return GEAR_CATEGORY_IMAGES[category];
  return '';
}
