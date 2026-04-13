'use client'

import { Wallet } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import GlassDock from '@/components/consumer/GlassDock'

export default function WalletPage() {
  return (
    <WallpaperBackground>
      <div className="min-h-screen pb-32">
        <div className="px-5 pt-14 pb-5">
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
            Wallet
          </h1>
        </div>

        <div className="flex flex-col items-center justify-center" style={{ paddingTop: 80 }}>
          <div
            style={{
              width:          72,
              height:         72,
              borderRadius:   24,
              background:     'rgba(212,175,55,0.12)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              marginBottom:   16,
            }}
          >
            <Wallet size={32} color="#D4AF37" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
            Wallet coming soon
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', textAlign: 'center', maxWidth: 240 }}>
            Store membership cards, gift vouchers, and session credits here.
          </p>
        </div>
      </div>

      <GlassDock />
    </WallpaperBackground>
  )
}
