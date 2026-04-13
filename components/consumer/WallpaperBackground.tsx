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
            radial-gradient(ellipse 110% 65% at 10% -10%, rgba(139,92,246,0.72) 0%, transparent 58%),
            radial-gradient(ellipse 80%  55% at 90% -8%,  rgba(37,99,235,0.55)  0%, transparent 55%),
            radial-gradient(ellipse 70%  50% at 60% 110%, rgba(16,185,129,0.28) 0%, transparent 58%),
            radial-gradient(ellipse 50%  40% at 30% 70%,  rgba(99,102,241,0.18) 0%, transparent 50%),
            #05051a
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
