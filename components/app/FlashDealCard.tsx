'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { FlashDealData } from './chatScripts'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function FlashDealCard({ data, onGrab }: { data: FlashDealData; onGrab?: () => void }) {
  const [remaining, setRemaining] = useState(data.expiresInSeconds)

  useEffect(() => {
    const interval = setInterval(() => setRemaining((p) => (p > 0 ? p - 1 : 0)), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.03) 100%)', borderRadius: 24, border: '1px solid #D4AF3733', overflow: 'hidden' }}>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#D4AF3722', padding: '5px 12px', borderRadius: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 13 }}>&#9889;</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', letterSpacing: 0.5 }}>FLASH DEAL</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', marginBottom: 6 }}>{data.business}</div>
        <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5, marginBottom: 14 }}>{data.description}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#444', textDecoration: 'line-through' }}>{data.originalPrice}</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#f0f0f0' }}>{data.currentPrice}</span>
          <span style={{ background: '#30d15822', color: '#30d158', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>{data.savings}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff453a', animation: 'pulse-dot 1s infinite' }} />
          <span style={{ fontSize: 13, color: '#ff453a', fontWeight: 600 }}>Expires in {formatTime(remaining)}</span>
        </div>
        <motion.button whileTap={{ scale: 0.93 }} onClick={onGrab}
          style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', borderRadius: 16, color: '#000', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          Grab This Deal
        </motion.button>
      </div>
      <style>{`@keyframes pulse-dot { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
    </div>
  )
}
