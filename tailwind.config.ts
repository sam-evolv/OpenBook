import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          500: '#D4AF37',
          600: '#C9A929',
          700: '#B8934C',
        },
        sidebar: '#050505',
        surface: '#111111',
        'surface-2': '#080808',
        'surface-elevated': '#1a1a1a',
      },
      borderRadius: {
        premium: '12px',
        card: '16px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 24px rgba(0,0,0,0.3)',
        premium: '0 4px 24px -4px rgba(0,0,0,0.12), 0 2px 8px -2px rgba(0,0,0,0.08)',
        gold: '0 4px 16px -4px rgba(212,175,55,0.35)',
        'gold-lg': '0 4px 20px rgba(212,175,55,0.4)',
        'gold-glow': '0 0 20px rgba(212,175,55,0.2)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'page-in': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'chart-draw': {
          '0%': { 'clip-path': 'inset(0 100% 0 0)' },
          '100%': { 'clip-path': 'inset(0 0% 0 0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        'page-in': 'page-in 200ms ease-out',
        shimmer: 'shimmer 1.5s infinite linear',
        'chart-draw': 'chart-draw 800ms ease-out forwards',
        'slide-in-right': 'slide-in-right 300ms ease-out',
        'slide-out-right': 'slide-out-right 200ms ease-in',
      },
    },
  },
  plugins: [],
}

export default config
