'use client'

import React from 'react'

interface WallpaperBackgroundProps {
  children: React.ReactNode
  className?: string
}

export default function WallpaperBackground({ children, className = '' }: WallpaperBackgroundProps) {
  return (
    <div className={`relative ${className}`} style={{ minHeight: '100vh' }}>
      {/* Fixed wallpaper — stays in place while content scrolls */}
      <div
        aria-hidden
        style={{
          position:   'fixed',
          inset:      0,
          zIndex:     0,
          background: `
            radial-gradient(ellipse at 25% 15%, #1a3a6b 0%, transparent 55%),
            radial-gradient(ellipse at 78% 55%, #2d1b4e 0%, transparent 50%),
            radial-gradient(ellipse at 50% 88%, #0d2d1a 0%, transparent 50%),
            radial-gradient(ellipse at 88% 8%,  #3b1a0a 0%, transparent 45%),
            #080812
          `,
        }}
      />
      {/* Content sits above wallpaper */}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
