'use client'

import { motion } from 'framer-motion'
import type { Screen } from '@/app/(consumer-app)/app/page'

const C = {
  gold: '#D4AF37',
  goldGrad: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)',
  muted: '#888',
  surface: '#111111',
  border: 'rgba(255,255,255,0.06)',
  bg: '#080808',
}

function TabIcon({ icon, active }: { icon: string; active: boolean }) {
  const c = active ? C.gold : C.muted
  switch (icon) {
    case 'home':
      return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>)
    case 'explore':
      return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={c} strokeWidth="2"/><path d="M16.5 16.5L21 21" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>)
    case 'bookings':
      return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="3" stroke={c} strokeWidth="2"/><path d="M3 9h18" stroke={c} strokeWidth="2"/><path d="M8 2v4M16 2v4" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>)
    case 'me':
      return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={c} strokeWidth="2"/><path d="M5 20c0-3.3 2.7-6 7-6s7 2.7 7 6" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>)
    default: return null
  }
}

export default function TabBar({ active, navigate }: { active: Screen; navigate: (s: Screen) => void }) {
  const tabs: { id: Screen; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'home', label: 'Explore', icon: 'explore' },
    { id: 'assistant', label: 'Ask AI', icon: 'ai' },
    { id: 'home', label: 'Bookings', icon: 'bookings' },
    { id: 'home', label: 'Me', icon: 'me' },
  ]

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: `linear-gradient(180deg, transparent 0%, ${C.bg} 20%)` }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 64, background: `${C.surface}ee`, backdropFilter: 'blur(20px)', borderTop: `1px solid ${C.border}`, paddingBottom: 4 }}>
        {tabs.map((tab, idx) => {
          if (tab.icon === 'ai') {
            return (
              <div key="ai" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -30 }}>
                {/* Pulse rings */}
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }}>
                  <motion.div style={{ position: 'absolute', width: 62, height: 62, borderRadius: '50%', border: `1.5px solid ${C.gold}`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                    animate={{ scale: [1, 1.6, 1.6], opacity: [0.5, 0, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }} />
                  <motion.div style={{ position: 'absolute', width: 62, height: 62, borderRadius: '50%', border: `1.5px solid ${C.gold}`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                    animate={{ scale: [1, 1.9, 1.9], opacity: [0.3, 0, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.4 }} />
                </div>
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate('assistant')}
                  style={{ width: 62, height: 62, borderRadius: '50%', background: C.goldGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2, border: 'none', cursor: 'pointer' }}>
                  <motion.div animate={{ boxShadow: [`0 0 20px rgba(212,175,55,0.4)`, `0 0 35px rgba(212,175,55,0.6)`, `0 0 20px rgba(212,175,55,0.4)`] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%' }} />
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ position: 'relative', zIndex: 1 }}>
                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="#000" stroke="#000" strokeWidth="1.5"/>
                  </svg>
                </motion.button>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginTop: 4 }}>Ask AI</span>
              </div>
            )
          }
          const isActive = (tab.icon === 'home' && active === 'home') || (tab.icon === 'explore' && active === 'home')
          return (
            <motion.button key={idx} whileTap={{ scale: 0.93 }} onClick={() => navigate(tab.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 0', minWidth: 56, background: 'none', border: 'none', cursor: 'pointer' }}>
              <TabIcon icon={tab.icon} active={isActive} />
              <span style={{ fontSize: 10, fontWeight: 500, color: isActive ? C.gold : C.muted }}>{tab.label}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
