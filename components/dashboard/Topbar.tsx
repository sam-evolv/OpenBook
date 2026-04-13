'use client'

import { useState } from 'react'
import { Bell, Plus, Zap } from 'lucide-react'
import { NewBookingModal } from './NewBookingModal'
import { FlashSaleModal } from './FlashSaleModal'

interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  const [modalOpen,     setModalOpen]     = useState(false)
  const [flashSaleOpen, setFlashSaleOpen] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between px-6 h-[52px] border-b border-white/[0.07] bg-surface shrink-0">
        <h1 className="text-[15px] font-semibold text-white">{title}</h1>

        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button
            className="relative flex items-center justify-center w-8 h-8 rounded-premium text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all duration-150 ease-premium focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
          </button>

          {/* ⚡ Flash Sale */}
          <button
            onClick={() => setFlashSaleOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-premium text-[12px] font-semibold text-black transition-all duration-150 ease-premium hover:brightness-110 active:brightness-90 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            style={{ background: '#D4AF37' }}
          >
            <Zap size={13} strokeWidth={2.5} />
            Flash Sale
          </button>

          {/* New Booking */}
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-premium text-[12px] font-semibold text-white transition-all duration-150 ease-premium hover:bg-white/15 active:bg-white/20 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)' }}
          >
            <Plus size={14} strokeWidth={2.5} />
            New Booking
          </button>
        </div>
      </header>

      <NewBookingModal open={modalOpen}     onClose={() => setModalOpen(false)} />
      <FlashSaleModal  open={flashSaleOpen} onClose={() => setFlashSaleOpen(false)} />
    </>
  )
}
