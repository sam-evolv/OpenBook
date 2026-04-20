'use client';

/**
 * iPhone-style wallpaper with subtle animated aurora.
 * Not the generic purple-gradient AI look — carefully tuned dark
 * with warm gold glow drifting across the top.
 */
export function HomeWallpaper() {
  return (
    <>
      {/* Base */}
      <div
        aria-hidden
        className="fixed inset-0 -z-20"
        style={{
          background:
            'radial-gradient(at 20% 0%, #0a0a0f 0%, #000000 70%), #000000',
        }}
      />

      {/* Gold aurora — slow drift */}
      <div
        aria-hidden
        className="fixed -top-40 -left-20 w-[70vw] h-[70vw] -z-10 opacity-60 pointer-events-none animate-float"
        style={{
          background:
            'radial-gradient(circle, rgba(212, 175, 55, 0.18) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        aria-hidden
        className="fixed top-40 -right-20 w-[60vw] h-[60vw] -z-10 opacity-40 pointer-events-none animate-gentle-pulse"
        style={{
          background:
            'radial-gradient(circle, rgba(140, 90, 200, 0.15) 0%, transparent 60%)',
          filter: 'blur(100px)',
          animationDelay: '2s',
        }}
      />

      {/* Grain — essential for killing AI-gradient flatness */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 opacity-[0.04] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='7'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        }}
      />
    </>
  );
}
