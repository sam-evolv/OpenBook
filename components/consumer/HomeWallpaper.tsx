'use client';

/**
 * iPhone-style wallpaper with subtle animated aurora.
 * Not the generic purple-gradient AI look — carefully tuned dark
 * with warm gold glow drifting across the top.
 */
export function HomeWallpaper() {
  return (
    <>
      {/* Base — top-down warm-bronze ramp into a near-black floor with
          warmth in the red channel (#050403 not #000000). The previous
          #0a0a0f → #000000 sat below the eye's perception threshold for
          warmth; this gradient does real top-half work. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-20"
        style={{
          background:
            'radial-gradient(ellipse 120% 80% at 50% 0%, #1F1A12 0%, #110E09 35%, #0A0806 70%, #050403 100%)',
        }}
      />

      {/* Gold aurora — top-centre, the thing your eye should land on first */}
      <div
        aria-hidden
        className="fixed -top-60 left-1/2 -translate-x-1/2 w-[90vw] h-[90vw] -z-10 opacity-50 pointer-events-none animate-float"
        style={{
          background:
            'radial-gradient(circle, rgba(212, 175, 55, 0.30) 0%, rgba(212, 175, 55, 0.10) 35%, transparent 65%)',
          filter: 'blur(120px)',
        }}
      />

      {/* Bottom-left bronze pool — diagonal warmth axis from top-centre
          down. Replaces the previous off-brand purple aurora. */}
      <div
        aria-hidden
        className="fixed -bottom-40 -left-40 w-[70vw] h-[70vw] -z-10 opacity-40 pointer-events-none animate-gentle-pulse"
        style={{
          background:
            'radial-gradient(circle, rgba(180, 130, 60, 0.25) 0%, transparent 60%)',
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
