'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, ArrowRight } from 'lucide-react'

interface Insight {
  type: 'REVENUE' | 'TREND' | 'OPPORTUNITY'
  text: string
  action?: { label: string; href: string }
}

const PLACEHOLDER_INSIGHTS: Insight[] = [
  {
    type: 'REVENUE',
    text: 'Your Tuesday bookings have grown 23% over the past month. Consider adding an extra evening slot to capture more demand.',
    action: { label: 'Edit Tuesday hours', href: '/settings/hours' },
  },
  {
    type: 'TREND',
    text: 'Personal Training sessions generate 3.2x more revenue than group classes. Your most loyal clients book on average every 5 days.',
  },
  {
    type: 'OPPORTUNITY',
    text: '6 clients haven\'t booked in the last 14 days. A flash sale could help re-engage them and recover potential lost revenue.',
    action: { label: 'Create flash sale', href: '#flash-sale' },
  },
]

export function AIInsights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setInsights(PLACEHOLDER_INSIGHTS)
      setLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  function handleRefresh() {
    setRefreshing(true)
    setTimeout(() => {
      setInsights(PLACEHOLDER_INSIGHTS)
      setRefreshing(false)
    }, 600)
  }

  const typeColors: Record<string, string> = {
    REVENUE: '#D4AF37',
    TREND: '#D4AF37',
    OPPORTUNITY: '#D4AF37',
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#D4AF37]" />
          <h2 className="text-[14px] font-semibold text-[#D4AF37]">AI Insights</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/30">Powered by Claude</span>
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
            disabled={refreshing}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[14px] p-4"
              style={{
                background: 'rgba(212,175,55,0.06)',
                border: '1px solid rgba(212,175,55,0.15)',
              }}
            >
              <div className="skeleton-shimmer h-3 w-20 mb-3" />
              <div className="skeleton-shimmer h-3 w-full mb-2" />
              <div className="skeleton-shimmer h-3 w-3/4 mb-2" />
              <div className="skeleton-shimmer h-3 w-1/2" />
            </div>
          ))
        ) : (
          insights.map((insight, i) => (
            <div
              key={i}
              className="rounded-[14px] p-4 transition-all duration-200 hover:border-[rgba(212,175,55,0.3)]"
              style={{
                background: 'rgba(212,175,55,0.06)',
                border: '1px solid rgba(212,175,55,0.15)',
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-2"
                style={{ color: typeColors[insight.type] }}
              >
                {insight.type}
              </p>
              <p className="text-[14px] leading-[1.6] text-white/80 mb-3">
                {insight.text}
              </p>
              {insight.action && (
                <a
                  href={insight.action.href}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-[#D4AF37] hover:text-[#e8c84a] transition-colors"
                >
                  {insight.action.label}
                  <ArrowRight size={12} />
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
