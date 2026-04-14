'use client'

import { useState } from 'react'
import { Plus, Zap } from 'lucide-react'
import { NewBookingModal } from './NewBookingModal'
import { FlashSaleModal } from './FlashSaleModal'

interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [flashSaleModalOpen, setFlashSaleModalOpen] = useState(false)

  return (
    <>
      <header
        className="flex items-center justify-between px-6 h-14 shrink-0"
        style={{
          background: '#080808',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <h1 className="text-[16px] font-semibold text-white">{title}</h1>

        <div className="flex items-center gap-2">
          {/* Flash Sale button */}
          <button
            onClick={() => setFlashSaleModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-[13px] font-semibold transition-all duration-150 btn-press"
            style={{
              background: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.3)',
              color: '#D4AF37',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.1)'
            }}
          >
            <Zap size={14} />
            Flash Sale
          </button>

          {/* New Booking button */}
          <button
            onClick={() => setBookingModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-[13px] font-bold text-black transition-all duration-150 btn-press"
            style={{
              background: '#D4AF37',
              boxShadow: '0 2px 8px rgba(212,175,55,0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#C9A929'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#D4AF37'
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            New Booking
          </button>
        </div>
      </header>

      <NewBookingModal open={bookingModalOpen} onClose={() => setBookingModalOpen(false)} />
      <FlashSaleModal open={flashSaleModalOpen} onClose={() => setFlashSaleModalOpen(false)} />
    </>
  )
}
