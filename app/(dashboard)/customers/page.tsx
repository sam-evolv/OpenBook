'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { mockCustomers } from '@/lib/mock-data'
import { formatCurrency, getInitials } from '@/lib/utils'
import type { PackageType } from '@/lib/types'

const avatarColors = [
  '#D4AF37', // gold
  '#60A5FA', // blue
  '#34D399', // green
  '#F87171', // red
  '#A78BFA', // violet
  '#FB923C', // orange
]

const packageLabels: Record<PackageType, string> = {
  bundle: 'Bundle',
  membership: 'Membership',
  starter: 'Starter',
  group: 'Group Pass',
  none: 'Pay as you go',
}

const packageStyles: Record<PackageType, string> = {
  bundle: 'bg-brand-500/10 text-brand-600',
  membership: 'bg-blue-50 text-blue-600',
  starter: 'bg-emerald-50 text-emerald-600',
  group: 'bg-rose-50 text-rose-600',
  none: 'bg-gray-100 text-gray-500',
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')

  const filtered = mockCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search */}
      <div className="flex justify-end">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 pr-4 w-56 text-[13px] border border-gray-200 rounded-premium bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-150"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-premium border border-gray-100 shadow-card overflow-hidden">
        <div className="divide-y divide-gray-50">
          {filtered.map((customer, idx) => {
            const color = avatarColors[idx % avatarColors.length]
            const initials = getInitials(customer.name)
            const memberYear = new Date(customer.memberSince).getFullYear()

            return (
              <div
                key={customer.id}
                className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
              >
                {/* Avatar */}
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-full text-white text-[13px] font-bold shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900">{customer.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {customer.visitCount} visits · member since {memberYear}
                  </p>
                </div>

                {/* Right */}
                <div className="text-right shrink-0">
                  <p className="text-[14px] font-bold text-gray-900">
                    {formatCurrency(customer.totalSpend)}
                  </p>
                  <span className={`inline-flex items-center h-4 px-2 rounded-full text-[9px] font-semibold uppercase tracking-wide ${packageStyles[customer.packageType]}`}>
                    {packageLabels[customer.packageType]}
                  </span>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-[13px] text-gray-400">No clients match your search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
