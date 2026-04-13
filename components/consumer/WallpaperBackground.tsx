'use client'

import React from 'react'

interface WallpaperBackgroundProps {
  children: React.ReactNode
  className?: string
}

export default function WallpaperBackground({ children, className = '' }: WallpaperBackgroundProps) {
  return (
    <div
      className={`min-h-screen relative ${className}`}
      style={{
        background: 'linear-gradient(160deg, #0a0a0f 0%, #0d0d14 50%, #080808 100%)',
      }}
    >
      {/* Subtle gold ambient glow at top */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(212,175,55,0.07) 0%, transparent 70%)',
        }}
      />
      {children}
    </div>
  )
}
