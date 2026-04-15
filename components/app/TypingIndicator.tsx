'use client'

import { motion } from 'framer-motion'

export default function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '4px 0' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
        &#10024;
      </div>
      <div style={{ background: '#1e1e1e', borderRadius: 22, padding: '14px 20px', display: 'flex', gap: 6, alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <motion.div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#888' }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }} />
        ))}
      </div>
    </div>
  )
}
