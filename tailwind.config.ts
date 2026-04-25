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
        // Single source of truth for dark-surface tones. Five-step ramp,
        // ~+8 HSL lightness per step, warmer than the previous cool-blue
        // ink.* values (red channel +3 across the board). Floor is #0B0B0D
        // not #000000 so highlights and shadows have headroom to register.
        surface: {
          0: '#0B0B0D',
          1: '#131316',
          2: '#1B1B20',
          3: '#25252B',
          4: '#33333A',
        },
        border: {
          weak: 'rgba(255, 255, 255, 0.06)',
          DEFAULT: 'rgba(255, 255, 255, 0.10)',
          strong: 'rgba(255, 255, 255, 0.16)',
        },
        // @deprecated — alias of surface.* / border.*. Kept so the 500+
        // existing `bg-ink-surface` / `border-ink-border` references keep
        // compiling. Reach for surface.* / border.* in new code.
        ink: {
          bg: '#0B0B0D',
          surface: '#131316',
          surface2: '#1B1B20',
          surface3: '#25252B',
          border: 'rgba(255, 255, 255, 0.10)',
          borderStrong: 'rgba(255, 255, 255, 0.16)',
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
        // Fraunces — for moments that should feel magazine-printed (business
        // names, service titles). Wired in app/layout.tsx via next/font.
        serif: ['var(--font-fraunces)', 'Georgia', 'ui-serif', 'serif'],
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
