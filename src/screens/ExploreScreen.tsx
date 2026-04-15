import { useState } from 'react';
import { motion } from 'framer-motion';
import { colors, radius, transitions } from '../constants/theme';
import TabBar from '../components/TabBar';

const categories = ['All', 'Gym', 'Sauna', 'Salon', 'Barber', 'Massage', 'Physio'];

const GRADIENTS = [
  'linear-gradient(145deg, #3880d8, #1858a8)',
  'linear-gradient(145deg, #d05070, #a02848)',
  'linear-gradient(145deg, #8070d0, #5040a8)',
  'linear-gradient(145deg, #28b880, #107850)',
  'linear-gradient(145deg, #d08028, #a05808)',
  'linear-gradient(145deg, #d4a820, #8a6810)',
  'linear-gradient(145deg, #585858, #303030)',
];

function gradientFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return GRADIENTS[h % GRADIENTS.length];
}

function initials(name: string) {
  const w = name.trim().split(/\s+/);
  return w.length === 1 ? w[0].slice(0, 2).toUpperCase() : (w[0][0] + w[1][0]).toUpperCase();
}

const nearYou = [
  { name: 'IronWorks Gym', category: 'Gym', rating: '4.8', price: '€29' },
  { name: 'Serenity Spa', category: 'Sauna', rating: '4.9', price: '€45' },
  { name: 'GlowUp Studio', category: 'Salon', rating: '4.7', price: '€35' },
  { name: 'CleanCut Barber', category: 'Barber', rating: '4.8', price: '€20' },
  { name: 'Zen Massage', category: 'Massage', rating: '4.9', price: '€60' },
  { name: 'CoreFlex Physio', category: 'Physio', rating: '4.6', price: '€55' },
];

const allNearby = [
  { name: 'Elite Pampering', category: 'Salon', distance: '0.2 mi' },
  { name: 'FitLife Studio', category: 'Gym', distance: '0.4 mi' },
  { name: 'NailStar', category: 'Salon', distance: '0.5 mi' },
  { name: 'Revive Physio', category: 'Physio', distance: '0.6 mi' },
  { name: 'The Barbershop', category: 'Barber', distance: '0.7 mi' },
];

export default function ExploreScreen() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -30 }}
      transition={transitions.spring}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bg,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="safe-top" style={{ padding: '18px 24px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: colors.text,
              letterSpacing: '-0.03em',
            }}
          >
            Explore
          </span>
          <motion.button
            whileTap={transitions.buttonTap}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="9.5" cy="9.5" r="6.5" stroke="#D4AF37" strokeWidth="2" />
              <line x1="14.5" y1="14.5" x2="20" y2="20" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.button>
        </div>

        {/* Search bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#161616',
            borderRadius: 28,
            padding: '10px 16px',
            marginTop: 14,
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="9.5" cy="9.5" r="6.5" stroke={colors.textSecondary} strokeWidth="1.8" />
            <line x1="14.5" y1="14.5" x2="20" y2="20" stroke={colors.textSecondary} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gyms, salons, sauna..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: colors.text,
              fontSize: 15,
              fontWeight: 400,
            }}
          />
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>

        {/* Category chips */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '8px 24px 14px',
            scrollbarWidth: 'none',
          }}
        >
          {categories.map((cat) => {
            const active = cat === activeCategory;
            return (
              <motion.button
                key={cat}
                whileTap={transitions.buttonTap}
                onClick={() => setActiveCategory(cat)}
                style={{
                  flexShrink: 0,
                  padding: '7px 16px',
                  borderRadius: radius.full,
                  background: active ? colors.goldGradient : 'rgba(255,255,255,0.06)',
                  color: active ? '#000' : colors.textSecondary,
                  fontSize: 13,
                  fontWeight: 600,
                  border: active ? 'none' : '0.5px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
              >
                {cat}
              </motion.button>
            );
          })}
        </div>

        {/* NEAR YOU section */}
        <div style={{ padding: '0 24px' }}>
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Near You
          </span>

          {/* 2-column grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 28,
            }}
          >
            {nearYou.map((biz, i) => (
              <motion.div
                key={biz.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, ...transitions.spring }}
                whileTap={transitions.buttonTap}
                style={{
                  background: '#161616',
                  borderRadius: 20,
                  overflow: 'hidden',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                }}
              >
                {/* Top: gradient with initials */}
                <div
                  style={{
                    height: 80,
                    background: gradientFor(biz.name),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 900,
                    color: '#fff',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {initials(biz.name)}
                </div>
                {/* Bottom: info */}
                <div style={{ padding: '10px 12px 12px' }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: colors.text,
                      letterSpacing: '-0.02em',
                      marginBottom: 3,
                    }}
                  >
                    {biz.name}
                  </div>
                  <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>
                    {biz.category}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ color: '#FFD700', fontSize: 11 }}>&#9733;</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>{biz.rating}</span>
                    </div>
                    <span style={{ fontSize: 11, color: colors.textSecondary }}>{biz.price}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ALL NEARBY section */}
        <div style={{ padding: '0 24px' }}>
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            All Nearby
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allNearby.map((biz, i) => (
              <motion.div
                key={biz.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06, ...transitions.spring }}
                whileTap={transitions.buttonTap}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: '#161616',
                  borderRadius: 16,
                  padding: '12px 14px',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                }}
              >
                {/* Small squircle */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: gradientFor(biz.name),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 900,
                    color: '#fff',
                    letterSpacing: '-0.02em',
                    flexShrink: 0,
                  }}
                >
                  {initials(biz.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, letterSpacing: '-0.02em' }}>
                    {biz.name}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textSecondary }}>{biz.category}</div>
                </div>
                <span style={{ fontSize: 12, color: colors.textSecondary }}>{biz.distance}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <TabBar />
    </motion.div>
  );
}
