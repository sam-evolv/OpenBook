'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { tokens } from '@/lib/types'
import type { Insight, InsightsResponse } from '@/app/api/insights/route'

// ── Type badge labels ─────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  peak_time: 'PEAK TIME',
  revenue: 'REVENUE',
  no_show: 'NO-SHOWS',
  opportunity: 'OPPORTUNITY',
}

// ── Skeleton card (loading state) ─────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-[14px] p-[18px] animate-pulse"
      style={{
        background: 'rgba(212,175,55,0.05)',
        border: '1px solid rgba(212,175,55,0.15)',
        borderLeft: '2px solid #D4AF37',
      }}
    >
      {/* badge */}
      <div
        className="h-4 w-20 rounded-full"
        style={{ background: 'rgba(212,175,55,0.15)' }}
      />
      {/* title */}
      <div
        className="h-4 w-3/4 rounded mt-[10px]"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      />
      {/* body lines */}
      <div
        className="h-3 w-full rounded mt-[6px]"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      />
      <div
        className="h-3 w-2/3 rounded mt-2"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      />
      {/* bottom row */}
      <div className="flex items-center justify-between mt-4">
        <div
          className="h-5 w-16 rounded"
          style={{ background: 'rgba(212,175,55,0.15)' }}
        />
        <div
          className="h-3 w-24 rounded"
          style={{ background: 'rgba(212,175,55,0.08)' }}
        />
      </div>
    </div>
  )
}

// ── Insight card ──────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div
      className="rounded-[14px] p-[18px]"
      style={{
        background: 'rgba(212,175,55,0.05)',
        border: '1px solid rgba(212,175,55,0.15)',
        borderLeft: '2px solid #D4AF37',
        borderRadius: '14px',
      }}
    >
      <span
        className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
        style={{
          background: 'rgba(212,175,55,0.1)',
          color: tokens.gold,
        }}
      >
        {TYPE_LABELS[insight.type] ?? insight.type.replace('_', ' ').toUpperCase()}
      </span>

      <h3
        className="text-[15px] font-bold text-white mt-[10px] leading-snug"
      >
        {insight.title}
      </h3>

      <p
        className="text-[13px] mt-[6px]"
        style={{ color: 'rgba(255,255,255,0.55)', lineHeight: '1.6' }}
      >
        {insight.body}
      </p>

      <div className="flex items-end justify-between mt-4 gap-3">
        <span
          className="text-[20px] font-black leading-none shrink-0"
          style={{ color: tokens.gold }}
        >
          {insight.metric}
        </span>
        <span
          className="text-[12px] italic text-right"
          style={{ color: 'rgba(212,175,55,0.7)' }}
        >
          {insight.action}
        </span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AiInsights() {
  const [data, setData] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)

  const loadInsights = useCallback(async (manual = false) => {
    if (manual) {
      setSpinning(true)
    } else {
      setLoading(true)
    }
    try {
      const res = await fetch('/api/insights')
      if (res.ok) {
        setData(await res.json() as InsightsResponse)
      }
    } catch {
      // silently fail — fallback already handled server-side
    } finally {
      setLoading(false)
      setSpinning(false)
    }
  }, [])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  const isEmpty = !loading && (!data?.insights?.length || data.empty)

  return (
    <div>
      {/* Section header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span style={{ color: tokens.gold, fontSize: '14px' }}>✦</span>
            <h2 className="text-[16px] font-bold text-white">AI Insights</h2>
            <button
              onClick={() => loadInsights(true)}
              disabled={loading || spinning}
              className="p-1 rounded-lg transition-colors hover:bg-white/5 disabled:opacity-40"
              style={{ color: tokens.text3 }}
              aria-label="Refresh insights"
            >
              <RefreshCw
                size={14}
                className={spinning ? 'animate-spin' : ''}
              />
            </button>
          </div>
          <p className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Based on your last 30 days
          </p>
        </div>
        <span className="text-[12px] mt-1 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Powered by Claude
        </span>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty state */}
      {!loading && isEmpty && (
        <div
          className="rounded-[14px] p-[18px] flex items-center gap-3"
          style={{
            background: 'rgba(212,175,55,0.05)',
            border: '1px solid rgba(212,175,55,0.15)',
            borderLeft: '2px solid #D4AF37',
          }}
        >
          <span style={{ color: tokens.gold, fontSize: '16px' }}>✦</span>
          <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Take your first booking to unlock AI insights about your business.
          </p>
        </div>
      )}

      {/* Insight cards */}
      {!loading && !isEmpty && data?.insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      )}
    </div>
  )
}
