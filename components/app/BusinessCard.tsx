'use client'

import { motion } from 'framer-motion'
import type { BusinessCardData } from './chatScripts'

export default function BusinessCard({ data, onBook }: { data: BusinessCardData; onBook?: () => void }) {
  return (
    <div style={{ background: '#161616', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ height: 100, background: 'linear-gradient(135deg, #1e1e1e 0%, #111111 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>
        {data.emoji}
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#f0f0f0', marginBottom: 8 }}>{data.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#FFD700', fontSize: 14 }}>&#9733;</span>
            <span style={{ color: '#f0f0f0', fontSize: 14, fontWeight: 600 }}>{data.rating}</span>
            <span style={{ color: '#888', fontSize: 13 }}>({data.reviews})</span>
          </div>
          <div style={{ background: '#242424', borderRadius: 8, padding: '3px 8px', fontSize: 12, color: '#888' }}>{data.distance}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {data.categories.map((cat) => (
            <span key={cat} style={{ background: '#242424', color: '#888', fontSize: 12, padding: '4px 10px', borderRadius: 10 }}>{cat}</span>
          ))}
        </div>
        <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5, marginBottom: 12 }}>{data.description}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#D4AF37', marginBottom: 14 }}>{data.price}</div>
        <motion.button whileTap={{ scale: 0.93 }} onClick={onBook}
          style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', borderRadius: 16, color: '#000', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          Book Now
        </motion.button>
      </div>
    </div>
  )
}
