import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#D4AF37',
          muted: '#B8934C',
          soft: 'rgba(212, 175, 55, 0.12)',
          border: 'rgba(212, 175, 55, 0.25)',
        },
        ink: {
          bg: '#08090B',
          surface: '#0F1115',
          surface2: '#161921',
          surface3: '#1C2029',
          border: '#1E2230',
          borderStrong: '#2A2F3E',
        },
        paper: {
          bg: '#FAFAFA',
          surface: '#FFFFFF',
          surface2: '#F5F5F4',
          surface3: '#EEEEEC',
          border: '#E8E8E5',
          borderStrong: '#D4D4D0',
        },
        'ink-text': {
          1: '#ECEEF2',
          2: '#9BA1B0',
          3: '#60667A',
        },
        'paper-text': {
          1: '#111113',
          2: '#55565C',
          3: '#8A8D96',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'card-dark': '0 1px 2px rgba(0, 0, 0, 0.4)',
        'card-light': '0 1px 3px rgba(0, 0, 0, 0.06)',
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.25)',
      },
      animation: {
        'slide-in-right': 'slideInRight 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 150ms ease-out',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
