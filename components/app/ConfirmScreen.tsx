'use client'

import { motion } from 'framer-motion'
import type { Screen } from '@/app/(consumer-app)/app/page'

export default function ConfirmScreen({ navigate, goBack }: { navigate: (s: Screen) => void; goBack: () => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#080808', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <motion.button whileTap={{ scale: 0.93 }} onClick={goBack}
          style={{ width: 36, height: 36, borderRadius: '50%', background: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#f0f0f0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </motion.button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#f0f0f0' }}>Confirm Booking</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* Booking card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
          style={{ background: '#161616', borderRadius: 24, padding: 20, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>&#10024;</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0' }}>PolishPro Nails</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <span style={{ color: '#FFD700', fontSize: 13 }}>&#9733;</span>
                <span style={{ fontSize: 13, color: '#f0f0f0', fontWeight: 600 }}>4.9</span>
                <span style={{ fontSize: 12, color: '#888' }}>(284 reviews)</span>
              </div>
            </div>
          </div>
          {[
            { icon: '\u{1F485}', label: 'Service', value: 'Gel Manicure' },
            { icon: '\u{1F4C5}', label: 'Date', value: 'Today, April 15' },
            { icon: '\u{1F552}', label: 'Time', value: '2:00 PM' },
            { icon: '\u23F1\uFE0F', label: 'Duration', value: '45 minutes' },
            { icon: '\u{1F4CD}', label: 'Location', value: '123 Main St, 0.3 mi away' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontSize: 14, color: '#888' }}>{item.label}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f0' }}>{item.value}</span>
            </div>
          ))}
        </motion.div>

        {/* Payment */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
          style={{ background: '#161616', borderRadius: 24, padding: 20, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0' }}>Payment</span>
            <span style={{ fontSize: 13, color: '#D4AF37', fontWeight: 600 }}>Change</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #1a1f71, #2d4fd7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>VISA</div>
            <span style={{ fontSize: 14, color: '#f0f0f0' }}>&#8226;&#8226;&#8226;&#8226; 4242</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#f0f0f0' }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#D4AF37' }}>$38.00</span>
          </div>
        </motion.div>
        <div style={{ height: 120 }} />
      </div>

      {/* Bottom buttons */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)', background: 'linear-gradient(180deg, transparent 0%, #080808 30%)' }}>
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate('success')}
          style={{ width: '100%', padding: 18, background: 'linear-gradient(135deg, #e8c547 0%, #b88a18 100%)', borderRadius: 16, color: '#000', fontSize: 17, fontWeight: 700, marginBottom: 10, boxShadow: '0 4px 20px rgba(212,175,55,0.3)', border: 'none', cursor: 'pointer' }}>
          Confirm &amp; Pay $38.00
        </motion.button>
        <motion.button whileTap={{ scale: 0.93 }} onClick={goBack}
          style={{ width: '100%', padding: 14, background: 'transparent', borderRadius: 16, color: '#888', fontSize: 15, fontWeight: 600, border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
          Go Back
        </motion.button>
      </div>
    </div>
  )
}
