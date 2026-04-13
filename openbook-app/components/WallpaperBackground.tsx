'use client'

interface WallpaperBackgroundProps {
  children: React.ReactNode
  className?: string
  fixed?: boolean
}

/**
 * The iOS 26-style deep space wallpaper.
 * Wraps all screens. The gradient is always behind glass elements.
 */
export default function WallpaperBackground({
  children,
  className = '',
  fixed = false,
}: WallpaperBackgroundProps) {
  return (
    <div
      className={`wallpaper ${fixed ? 'fixed inset-0' : 'min-h-screen'} ${className}`}
      style={{
        background: `
          radial-gradient(ellipse at 25% 15%, #1a3a6b 0%, transparent 55%),
          radial-gradient(ellipse at 78% 55%, #2d1b4e 0%, transparent 50%),
          radial-gradient(ellipse at 50% 88%, #0d2d1a 0%, transparent 50%),
          #080812
        `,
      }}
    >
      {children}
    </div>
  )
}
