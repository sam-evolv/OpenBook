'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  User, Clock, CreditCard, Bell,
  Copy, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BusinessInfo {
  name: string; category: string; city: string; address: string
  website: string; instagram: string; whatsapp: string; buffer: string
  bookingUrl: string; isLive: boolean
}

const settingsNav = [
  { href: '/settings', label: 'Profile', icon: User },
  { href: '/settings/hours', label: 'Hours', icon: Clock },
  { href: '/settings/payments', label: 'Payments', icon: CreditCard },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
]

export function SettingsClient({ business }: { business: BusinessInfo }) {
  return (
    <div className="flex gap-6">
      {/* Settings sidebar nav */}
      <div className="hidden md:block w-[180px] shrink-0 space-y-1">
        {settingsNav.map((item) => (
          <SettingsNavItem key={item.href} {...item} />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Business info card */}
        <div className="dashboard-card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-white">Business Profile</h2>
            <button
              className="h-8 px-3 rounded-lg text-[12px] font-medium text-white/40 hover:text-white/60 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              Edit
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldDisplay label="Business name" value={business.name} />
            <FieldDisplay label="Category" value={business.category} />
            <FieldDisplay label="City" value={business.city} />
            <FieldDisplay label="Address" value={business.address} />
            <FieldDisplay label="Website" value={business.website} />
            <FieldDisplay label="Instagram" value={business.instagram} />
            <FieldDisplay label="WhatsApp bot" value={business.whatsapp} />
            <FieldDisplay label="Buffer between bookings" value={business.buffer} />
          </div>
        </div>

        {/* Booking URL card */}
        <div
          className="dashboard-card flex items-center justify-between"
          style={{ borderLeft: '3px solid #D4AF37' }}
        >
          <div>
            <p className="text-[12px] font-medium text-white/40 mb-0.5">Your booking URL</p>
            <p className="text-[14px] font-medium text-[#D4AF37]">{business.bookingUrl}</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: business.isLive ? '#22c55e' : '#ef4444' }}
            />
            <span className="text-[11px] text-white/35">
              {business.isLive ? 'Live' : 'Offline'}
            </span>
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white/30 hover:text-[#D4AF37] hover:bg-white/[0.05] transition-all"
              title="Copy URL"
            >
              <Copy size={14} />
            </button>
            <a
              href={business.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.05] transition-all"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { href: '/settings/hours', label: 'Opening hours', desc: 'Set your weekly schedule', icon: Clock },
            { href: '/settings/payments', label: 'Payments', desc: 'Connect Stripe to accept cards', icon: CreditCard },
            { href: '/settings/notifications', label: 'Notifications', desc: 'Reminders & alerts', icon: Bell },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="dashboard-card group flex items-start gap-3"
            >
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                style={{ background: 'rgba(212,175,55,0.1)' }}
              >
                <item.icon size={16} className="text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">{item.label}</p>
                <p className="text-[12px] text-white/35 mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function SettingsNavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-all duration-150',
        isActive
          ? 'text-[#D4AF37] bg-[rgba(212,175,55,0.1)]'
          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]',
      )}
    >
      <Icon size={15} className={isActive ? 'text-[#D4AF37]' : 'text-white/30'} />
      {label}
    </Link>
  )
}

function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block section-label mb-1.5">{label}</label>
      <div
        className="rounded-xl px-4 py-3 text-[13px] text-white"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {value}
      </div>
    </div>
  )
}
