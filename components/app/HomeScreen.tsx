'use client'

import { motion } from 'framer-motion'
import TabBar from './TabBar'
import type { Screen } from '@/app/(consumer-app)/app/page'

const favourites = [
  { initials: 'EP', name: 'Elite Pampering', rating: '4.9', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { initials: 'SW', name: 'StyleWorks', rating: '4.8', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { initials: 'NS', name: 'NailStar', rating: '4.7', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { initials: 'RB', name: 'Rose Beauty', rating: '4.9', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { initials: 'CP', name: 'CorePower', rating: '4.8', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { initials: 'YF', name: 'YogaFlow', rating: '4.9', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  { initials: 'IG', name: 'IronGrip Gym', rating: '4.7', gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
]

const myPlaces = [
  { initials: 'BB', name: 'Bean & Brew', category: 'Coffee', distance: '0.1 mi', gradient: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)' },
  { initials: 'SB', name: 'Stack Burger', category: 'Food', distance: '0.3 mi', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)' },
  { initials: 'FL', name: 'FitLife', category: 'Gym', distance: '0.5 mi', gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
]

export default function HomeScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#080808', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, letterSpacing: -0.3 }}>
              <span style={{ color: '#f0f0f0' }}>OpenBook</span>
            </div>
            <div style={{ fontSize: 15, color: '#888' }}>Good evening, Sam</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: '#000' }}>S</div>
        </div>
      </div>

      {/* Scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
        {/* Favourites */}
        <div style={{ padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', marginBottom: 14 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#f0f0f0' }}>Favourites</span>
            <span style={{ fontSize: 13, color: '#D4AF37', fontWeight: 600 }}>See all</span>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingLeft: 20, paddingRight: 20 }}>
            {favourites.map((fav, i) => (
              <motion.div key={fav.initials} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
                whileTap={{ scale: 0.93 }}
                style={{ flexShrink: 0, width: 76, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: fav.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.5, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                  {fav.initials}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#f0f0f0', textAlign: 'center', lineHeight: 1.2, maxWidth: 76, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ color: '#FFD700', fontSize: 10 }}>&#9733;</span>
                  <span style={{ fontSize: 10, color: '#888' }}>{fav.rating}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* My Places */}
        <div style={{ padding: '8px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#f0f0f0' }}>My Places</span>
            <span style={{ fontSize: 13, color: '#D4AF37', fontWeight: 600 }}>See all</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myPlaces.map((place, i) => (
              <motion.div key={place.initials} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
                whileTap={{ scale: 0.93 }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#161616', borderRadius: 20, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: place.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: -0.5, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  {place.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0' }}>{place.name}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>{place.category}</div>
                </div>
                <span style={{ fontSize: 12, color: '#444' }}>{place.distance}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Add a place */}
        <div style={{ padding: '12px 20px' }}>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate('assistant')}
            style={{ width: '100%', padding: 16, borderRadius: 20, border: '1.5px dashed #444', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
            <span style={{ fontSize: 20, color: '#444' }}>+</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#888' }}>Add a place</span>
          </motion.button>
        </div>
      </div>

      <TabBar active="home" navigate={navigate} />
    </div>
  )
}
