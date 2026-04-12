import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        gold: '#D4AF37',
        'gold-dark': '#B8960C',
        'wallpaper-bg': '#080812',
      },
      borderRadius: {
        icon: '18px',
        dock: '28px',
        card: '16px',
      },
      backdropBlur: {
        glass: '24px',
        dock: '32px',
      },
      fontSize: {
        'label': ['11px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '0.06em' }],
        'icon-label': ['11px', { lineHeight: '1.3', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
}

export default config
