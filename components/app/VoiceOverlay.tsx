'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BAR_COUNT = 22

export default function VoiceOverlay({ onDismiss }: { onDismiss: (triggered: boolean) => void }) {
  const [phase, setPhase] = useState<'listening' | 'gotit' | 'sending'>('listening')
  const [barHeights, setBarHeights] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => Math.random() * 60 + 10)
  )

  useEffect(() => {
    if (phase !== 'listening') return
    const interval = setInterval(() => {
      setBarHeights(Array.from({ length: BAR_COUNT }, () => Math.random() * 60 + 10))
    }, 350)
    return () => clearInterval(interval)
  }, [phase])

  useEffect(() => {
    const timer = setTimeout(() => setPhase('gotit'), 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (phase === 'gotit') {
      const t = setTimeout(() => setPhase('sending'), 800)
      return () => clearTimeout(t)
    }
    if (phase === 'sending') {
      const t = setTimeout(() => onDismiss(true), 800)
      return () => clearTimeout(t)
    }
  }, [phase, onDismiss])

  const handleCancel = useCallback(() => onDismiss(false), [onDismiss])

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ position: 'absolute', inset: 0, background: '#080808f5', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' }}>
      <motion.div key={phase} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 18, fontWeight: 600, color: '#f0f0f0', marginBottom: 48 }}>
        {phase === 'listening' && 'Listening...'}
        {phase === 'gotit' && 'Got it!'}
        {phase === 'sending' && 'Sending...'}
      </motion.div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 80, marginBottom: 48 }}>
        {barHeights.map((h, i) => (
          <motion.div key={i} animate={{ height: phase === 'listening' ? h : 4 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            style={{ width: 4, borderRadius: 2, background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)' }} />
        ))}
      </div>
      <AnimatePresence>
        {phase === 'listening' && (
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} whileTap={{ scale: 0.9 }}
            onClick={handleCancel}
            style={{ width: 64, height: 64, borderRadius: '50%', background: '#ff453a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, border: 'none', cursor: 'pointer' }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, background: '#fff' }} />
          </motion.button>
        )}
      </AnimatePresence>
      {phase === 'listening' && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={handleCancel}
          style={{ fontSize: 15, color: '#888', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
          Cancel
        </motion.button>
      )}
    </motion.div>
  )
}
