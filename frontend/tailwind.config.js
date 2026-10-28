/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Periwinkle clinical palette. Token names are unchanged from the old theme, so every page
        // re-skins through these values. 500 on white = 4.56:1 (AA for normal text).
        primary: {
          DEFAULT: '#4C6FDB',
          50:  '#EEF2FD',
          100: '#DFE6FB',
          200: '#C3D0F6',
          300: '#9DB1EF',
          400: '#7290E6',
          500: '#4C6FDB',
          600: '#3D5BC4',
          700: '#3249A0',
          800: '#2B3D80',
          900: '#263566',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          card:    '#EEF1FB', // page canvas (lavender)
          alt:     '#F5F7FD', // hover / subtle fills
          dark:    '#2B3D80', // deep indigo, replaces the old near-black
          darker:  '#263566',
        },
        ink: {
          DEFAULT: '#1F2A4D',
          muted:   '#646C8F', // 5.1:1 on white, 4.6:1 on the canvas
          subtle:  '#A2A9C6', // placeholders / decorative only
          invert:  '#FFFFFF',
        },
        border: {
          DEFAULT: '#E4E8F5',
          dark:    '#3D4E95',
        },
        // Chart / tint accents from the reference: coral, mint, pink
        coral: { DEFAULT: '#F26D6D', light: '#FDECEC' },
        mint:  { DEFAULT: '#1FA98F', light: '#E3F6F1', bright: '#5FD3B8', deep: '#06352C' }, // bright/deep: the clinic board
        pink:  { DEFAULT: '#E86BC4', light: '#FCE9F6' },
        // `ink` = text on the matching `light` tint, kept at >= 4.5:1 for badges/pills
        success: { DEFAULT: '#1FA98F', light: '#E3F6F1', ink: '#0F6E5C' },
        danger:  { DEFAULT: '#E5484D', light: '#FDECEC', ink: '#B4262C' },
        warning: { DEFAULT: '#E89B12', light: '#FEF3DC', ink: '#8A5A00', bright: '#F5B83D', deep: '#3D2600' },
        info:    { DEFAULT: '#4C6FDB', light: '#E4EAFB', ink: '#3249A0' },
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
        '4xl': '2rem',
      },
      boxShadow: {
        // Soft blue-tinted elevation instead of borders
        card: '0 10px 30px -14px rgb(76 111 219 / 0.22)',
        'card-hover': '0 16px 36px -14px rgb(76 111 219 / 0.32)',
        primary: '0 8px 20px -6px rgb(76 111 219 / 0.45)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        float:   { '0%, 100%': { translate: '0 0' }, '50%': { translate: '0 -6px' } },
      },
    },
  },
  plugins: [],
}
