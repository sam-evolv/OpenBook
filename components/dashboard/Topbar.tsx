'use client'

import { useState } from 'react'
import { Bell, Plus } from 'lucide-react'
import { NewBookingModal } from './NewBookingModal'

interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between px-6 h-[52px] border-b border-gray-100 bg-white shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-900">{title}</h1>

        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <button
            className="relative flex items-center justify-center w-8 h-8 rounded-premium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-150 ease-premium focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
          </button>

          {/* New Booking */}
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-premium bg-brand-500 text-[12px] font-semibold text-black hover:bg-brand-600 active:bg-brand-700 transition-all duration-150 ease-premium shadow-gold focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <Plus size={14} strokeWidth={2.5} />
            New Booking
          </button>
        </div>
      </header>

      <NewBookingModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
