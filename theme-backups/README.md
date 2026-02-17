# Old Dark Theme Backup

Saved 2026-02-17. This is the original "dark emerald" theme that was replaced with the landing-page-inspired dark slate/peach theme.

## To Revert

1. Copy `dark-emerald-theme.css` → `../index.css`
2. Copy `tailwind.config.dark-emerald.js` → `../tailwind.config.js`
3. Restore Google Fonts in `index.html` to: Space Grotesk + Syncopate
4. Git revert component changes (all `.tsx` files in `components/` and `App.tsx`)

## Old Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Background | #050505 | Body/page background |
| Text | #e5e7eb | Primary text (white-ish) |
| Emerald 500 | #10b981 | Primary accent |
| Pink 500 | #ec4899 | PlaylistStudio / CameraModal |
| Indigo 500 | #6366f1 | Tertiary accent |
| Rose 500 | #f43f5e | Favorites |
| Glass | rgba(255,255,255,0.03) | Glass-morphism |
| Borders | rgba(255,255,255,0.05-0.10) | Subtle dividers |

## Old Fonts

- Body: Space Grotesk
- Labels/headings: Syncopate
