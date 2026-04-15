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
            radial-gradient(ellipse at 20% 20%, rgba(212,175,55,0.09) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(212,175,55,0.06) 0%, transparent 50%),
            #080808
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
