export const colors = {
  bg: '#080808',
  goldPrimary: '#D4AF37',
  goldLight: '#e8c547',
  goldDark: '#b88a18',
  goldGradient: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)',
  surface1: '#111111',
  surface2: '#161616',
  surface3: '#1e1e1e',
  surface4: '#242424',
  text: '#f0f0f0',
  textSecondary: '#888888',
  textTertiary: '#444444',
  green: '#30d158',
  red: '#ff453a',
  blue: '#0a84ff',
  white: '#ffffff',
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.1)',
  hairline: 'rgba(255,255,255,0.14)',
  hairlineSoft: 'rgba(255,255,255,0.24)',
  bgDeep: '#050504',
  dockGlass: 'rgba(30, 25, 18, 0.55)',
  mutedGlass: 'rgba(255,255,255,0.08)',
  wallpaper:
    'radial-gradient(85% 50% at 50% 12%, rgba(212,175,55,0.30) 0%, rgba(148,100,20,0.10) 25%, transparent 55%),' +
    'radial-gradient(70% 50% at 88% 78%, rgba(120,70,200,0.18) 0%, transparent 55%),' +
    'radial-gradient(60% 45% at 12% 88%, rgba(70,180,160,0.14) 0%, transparent 55%),' +
    '#050504',
} as const;

export const radius = {
  phone: 54,
  card: 24,
  squircle: 20,
  pill: 16,
  bubble: 22,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const shadows = {
  goldGlow: '0 0 30px rgba(212,175,55,0.3)',
  goldGlowStrong: '0 0 40px rgba(212,175,55,0.5)',
  cardShadow: '0 4px 20px rgba(0,0,0,0.3)',
  elevate: '0 8px 32px rgba(0,0,0,0.4)',
} as const;

export const transitions = {
  spring: { type: 'spring' as const, stiffness: 300, damping: 25 },
  springBouncy: { type: 'spring' as const, stiffness: 400, damping: 15 },
  springSmooth: { type: 'spring' as const, stiffness: 200, damping: 20 },
  buttonTap: { scale: 0.93 },
} as const;
