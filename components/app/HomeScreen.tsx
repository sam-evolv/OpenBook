'use client'

import { motion } from 'framer-motion'
import TabBar from './TabBar'
import type { Screen } from '@/app/(consumer-app)/app/page'

const favourites = [
  { initials: 'EP', name: 'Elite Pampering', gradient: 'linear-gradient(145deg, #d4a820, #8a6810)' },
  { initials: 'SW', name: 'StyleWorks', gradient: 'linear-gradient(145deg, #8070d0, #5040a8)', badge: 2 },
  { initials: 'NS', name: 'NailStar', gradient: 'linear-gradient(145deg, #d05070, #a02848)' },
  { initials: 'RB', name: 'Rose Beauty', gradient: 'linear-gradient(145deg, #28b880, #107850)' },
]

const myPlaces = [
  { initials: 'CP', name: 'CorePower', gradient: 'linear-gradient(145deg, #3880d8, #1858a8)' },
  { initials: 'YF', name: 'YogaFlow', gradient: 'linear-gradient(145deg, #d08028, #a05808)' },
  { initials: 'IG', name: 'IronGrip', gradient: 'linear-gradient(145deg, #585858, #303030)', badge: 1 },
]

function SquircleTile({ item, index, baseDelay }: { item: typeof favourites[0]; index: number; baseDelay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: baseDelay + index * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
      whileTap={{ scale: 0.93 }}
      style={{ flexShrink: 0, width: 76, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
    >
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 62, height: 62, borderRadius: 20,
          background: item.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.5,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {item.initials}
        </div>
        {item.badge && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 20, height: 20, borderRadius: '50%',
            background: '#ff453a', border: '2px solid #080808',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff',
          }}>
            {item.badge}
          </div>
        )}
      </div>
      <span style={{
        fontSize: 11, fontWeight: 500, color: '#888',
        textAlign: 'center', lineHeight: 1.2,
        maxWidth: 76, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.name}
      </span>
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#333' }} />
    </motion.div>
  )
}

export default function HomeScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#080808', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#f0f0f0', letterSpacing: -0.3 }}>
            OpenBook
          </div>
          <motion.button whileTap={{ scale: 0.93 }}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#D4AF37" strokeWidth="2" />
              <path d="M16.5 16.5L21 21" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
        {/* Favourites */}
        <div style={{ padding: '16px 0 20px' }}>
          <div style={{ padding: '0 20px', marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
              Favourites
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingLeft: 20, paddingRight: 20 }}>
            {favourites.map((fav, i) => (
              <SquircleTile key={fav.initials} item={fav} index={i} baseDelay={0} />
            ))}
          </div>
        </div>

        {/* My Places */}
        <div style={{ padding: '0 0 20px' }}>
          <div style={{ padding: '0 20px', marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
              My Places
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingLeft: 20, paddingRight: 20 }}>
            {myPlaces.map((place, i) => (
              <SquircleTile key={place.initials} item={place} index={i} baseDelay={0.25} />
            ))}
          </div>
        </div>

        {/* Add a place */}
        <div style={{ padding: '4px 20px' }}>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate('assistant')}
            style={{
              width: '100%', padding: 16, borderRadius: 20,
              border: '1.5px dashed #333', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer',
            }}>
            <span style={{ fontSize: 18, color: '#444' }}>+</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>Add a place</span>
          </motion.button>
        </div>
      </div>

      <TabBar active="home" navigate={navigate} />
    </div>
  )
}
