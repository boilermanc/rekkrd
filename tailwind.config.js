/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{ts,tsx}',
    '!./api/**',
    '!./node_modules/**',
  ],
  theme: {
    extend: {
      fontFamily: {
        label: ['"Space Mono"', 'monospace'],
        display: ['"Playfair Display"', 'serif'],
      },
      colors: {
        'th-bg': 'rgb(var(--color-bg) / <alpha-value>)',
        'th-bg2': 'rgb(var(--color-bg2) / <alpha-value>)',
        'th-bg3': 'rgb(var(--color-bg3) / <alpha-value>)',
        'th-text': 'rgb(var(--color-text) / <alpha-value>)',
        'th-text2': 'rgb(var(--color-text2) / <alpha-value>)',
        'th-text3': 'rgb(var(--color-text3) / <alpha-value>)',
        'th-surface': 'rgb(var(--color-surface) / <alpha-value>)',
        // Sellr palette
        'sellr-blue': '#2C4A6E',
        'sellr-amber': '#E8A838',
        'sellr-bg': '#F5F0E8',
        'sellr-charcoal': '#1A1A2E',
        'sellr-sage': '#6B8F71',
        'sellr-blue-light': '#3D6494',
        'sellr-amber-light': '#F0C060',
        'sellr-surface': '#EDE8DF',
      },
    },
  },
  plugins: [],
};
