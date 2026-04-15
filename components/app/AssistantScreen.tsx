'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import TabBar from './TabBar'
import { suggestionPills } from './chatScripts'
import type { Screen } from '@/app/(consumer-app)/app/page'

export default function AssistantScreen({ navigate }: { navigate: (s: Screen, type?: string) => void }) {
  const [inputValue, setInputValue] = useState('')

  const handleSend = () => {
    if (inputValue.trim()) navigate('chat', 'custom')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#080808', overflow: 'hidden' }}>
      {/* Top nav */}
      <div style={{ padding: '16px 20px 8px', paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 4, color: '#D4AF37', textTransform: 'uppercase' as const }}>OPENBOOK</div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', paddingBottom: 140 }}>
        {/* Concentric rings */}
        <div style={{ position: 'relative', width: 160, height: 160, marginBottom: 32 }}>
          {[0, 1, 2].map((i) => (
            <motion.div key={i}
              style={{ position: 'absolute', inset: -10 * i - 10, borderRadius: '50%', border: '1px solid #D4AF37', opacity: 0.15 - i * 0.04 }}
              animate={{ scale: [1, 1.05, 1], opacity: [0.15 - i * 0.04, 0.08, 0.15 - i * 0.04] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }} />
          ))}
          <motion.div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, #D4AF3715 0%, transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            animate={{ boxShadow: ['0 0 40px rgba(212,175,55,0.1)', '0 0 60px rgba(212,175,55,0.2)', '0 0 40px rgba(212,175,55,0.1)'] }}
            transition={{ duration: 3, repeat: Infinity }}>
            <motion.div style={{ fontSize: 56 }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>&#10024;</motion.div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', textAlign: 'center' as const, marginBottom: 8 }}>
          How can I help you?
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ fontSize: 14, color: '#888', textAlign: 'center' as const, marginBottom: 28 }}>
          Ask me anything about local services
        </motion.div>

        {/* Suggestion pills 2x2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', maxWidth: 340, marginBottom: 24 }}>
          {suggestionPills.map((pill, i) => (
            <motion.button key={pill.type} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
              whileTap={{ scale: 0.93 }} onClick={() => navigate('chat', pill.type)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', background: '#161616', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', fontSize: 14, fontWeight: 500, color: '#f0f0f0', cursor: 'pointer' }}>
              <span style={{ fontSize: 18 }}>{pill.icon}</span>{pill.label}
            </motion.button>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ fontSize: 12, color: '#444' }}>
          Powered by OpenBook
        </motion.div>
      </div>

      {/* Input bar */}
      <div style={{ position: 'absolute', bottom: 68, left: 0, right: 0, padding: '8px 16px', background: 'linear-gradient(180deg, transparent 0%, #080808 30%)', zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#161616', borderRadius: 28, padding: '6px 6px 6px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <input value={inputValue} onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f0f0f0', fontSize: 15, WebkitUserSelect: 'text', userSelect: 'text' as const }} />
          <motion.button whileTap={{ scale: 0.93 }} onClick={handleSend}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" fill="#000"/></svg>
          </motion.button>
        </div>
      </div>

      <TabBar active="assistant" navigate={navigate} />
    </div>
  )
}
