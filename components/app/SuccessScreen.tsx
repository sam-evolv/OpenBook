'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Screen } from '@/app/(consumer-app)/app/page'

function ConfettiParticle({ delay, angle }: { delay: number; angle: number }) {
  const dist = 120 + Math.random() * 100
  const x = Math.cos(angle) * dist
  const y = Math.sin(angle) * dist
  const size = 6 + Math.random() * 6
  const cols = ['#D4AF37', '#e8c547', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24']
  const color = cols[Math.floor(Math.random() * cols.length)]

  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
      animate={{ x, y: y + 40, opacity: [1, 1, 0], scale: [1, 1.2, 0.5], rotate: Math.random() * 360 }}
      transition={{ duration: 1.2, delay, ease: 'easeOut' }}
      style={{ position: 'absolute', width: size, height: size, borderRadius: Math.random() > 0.5 ? '50%' : 2, background: color }} />
  )
}

export default function SuccessScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [showConfetti, setShowConfetti] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShowConfetti(true), 400); return () => clearTimeout(t) }, [])

  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i, delay: 0.3 + Math.random() * 0.3, angle: (i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
  }))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#080808', padding: 24, overflow: 'hidden' }}>
      {/* Checkmark + confetti */}
      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence>
          {showConfetti && particles.map((p) => <ConfettiParticle key={p.id} delay={p.delay} angle={p.angle} />)}
        </AnimatePresence>
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
          style={{ width: 100, height: 100, borderRadius: '50%', background: '#30d15815', border: '3px solid #30d158', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px #30d15833' }}>
          <motion.svg width="44" height="44" viewBox="0 0 24 24" fill="none"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.4 }}>
            <motion.path d="M5 13l4 4L19 7" stroke="#30d158" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.5 }} />
          </motion.svg>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        style={{ fontSize: 26, fontWeight: 800, color: '#f0f0f0', textAlign: 'center' as const, marginBottom: 8 }}>
        Booking Confirmed!
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        style={{ fontSize: 15, color: '#888', textAlign: 'center' as const, marginBottom: 32, lineHeight: 1.5 }}>
        You&apos;re all set. We&apos;ve sent the details to your phone.
      </motion.div>

      {/* Summary card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        style={{ width: '100%', maxWidth: 340, background: '#161616', borderRadius: 24, padding: 20, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>&#10024;</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f0f0' }}>PolishPro Nails</div>
            <div style={{ fontSize: 13, color: '#888' }}>Gel Manicure</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div><div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Date</div><div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f0' }}>Today, Apr 15</div></div>
          <div style={{ textAlign: 'right' as const }}><div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Time</div><div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f0' }}>2:00 PM</div></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 14, color: '#888' }}>Total paid</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#D4AF37' }}>$38.00</span>
        </div>
      </motion.div>

      <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}
        whileTap={{ scale: 0.93 }} onClick={() => navigate('home')}
        style={{ width: '100%', maxWidth: 340, padding: 18, background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', borderRadius: 16, color: '#000', fontSize: 17, fontWeight: 700, boxShadow: '0 4px 20px rgba(212,175,55,0.3)', border: 'none', cursor: 'pointer' }}>
        Back to Home
      </motion.button>
    </div>
  )
}
