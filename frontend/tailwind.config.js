/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Omni-inspired palette
        primary: {
          DEFAULT: '#F45D22',
          50:  '#FFF3EE',
          100: '#FFE4D5',
          200: '#FFC9AB',
          300: '#FFAD82',
          400: '#FF8F58',
          500: '#F45D22',
          600: '#E04410',
          700: '#C2350B',
          800: '#9E2909',
          900: '#7A2008',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark:    '#1C1C1C',
          darker:  '#141414',
          card:    '#F8F8F8',
        },
        ink: {
          DEFAULT: '#1C1C1C',
          muted:   '#71717A',
          subtle:  '#A1A1AA',
          invert:  '#FFFFFF',
        },
        border: {
          DEFAULT: '#E4E4E7',
          dark:    '#2E2E2E',
        },
        success: { DEFAULT: '#22C55E', light: '#DCFCE7' },
        danger:  { DEFAULT: '#EF4444', light: '#FEE2E2' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7' },
        info:    { DEFAULT: '#3B82F6', light: '#DBEAFE' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10)',
        'orange': '0 4px 14px 0 rgb(244 93 34 / 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
