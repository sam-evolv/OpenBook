'use client';

import Image from 'next/image';

/**
 * Home wallpaper — painted mesh gradient.
 * Single static asset wins over CSS gradients for premium feel.
 * Grain overlay kept to kill any banding on near-black areas.
 */
export function HomeWallpaper() {
  return (
    <>
      <div aria-hidden className="fixed inset-0 -z-20">
        <Image
          src="/wallpapers/home-1.jpg"
          alt=""
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* Grain — kills banding on near-black gradients */}
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
