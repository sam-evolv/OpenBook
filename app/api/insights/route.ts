import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Insight {
  type: 'peak_time' | 'revenue' | 'no_show' | 'opportunity'
  title: string
  body: string
  metric: string
  action: string
}

export interface InsightsResponse {
  insights: Insight[]
  empty?: boolean
}

// ── In-memory cache (1 hour per business) ────────────────────────────────────

const cache = new Map<string, { data: InsightsResponse; expiresAt: number }>()

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── Fallback insights (when Claude parsing fails) ─────────────────────────────

function buildFallback(stats: {
  count: number
  revenue: number
  noShows: number
  cancellations: number
  topService: string
  peakHour: number
  peakDay: number
}): InsightsResponse {
  const noShowRate = stats.count > 0 ? Math.round((stats.noShows / stats.count) * 100) : 0
  return {
    insights: [
      {
        type: 'peak_time',
        title: 'Your busiest hour',
        body: `Most bookings happen at ${stats.peakHour}:00. Adding extra slots then could increase revenue.`,
        metric: `${stats.peakHour}:00`,
        action: 'Add slots at peak hour',
      },
      {
        type: 'revenue',
        title: `${stats.topService} drives bookings`,
        body: `${stats.topService} is your most-booked service across ${stats.count} bookings this month.`,
        metric: `€${stats.revenue.toFixed(2)}`,
        action: 'Review pricing strategy',
      },
      {
        type: 'no_show',
        title: 'Reduce no-show losses',
        body: `${stats.noShows} no-shows (${noShowRate}%) in 30 days. Automated reminders can cut this significantly.`,
        metric: `${noShowRate}% no-show`,
        action: 'Enable booking reminders',
      },
    ],
  }
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, category')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // Serve from cache if still fresh
  const cached = cache.get(business.id)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data)
  }

  // Query last 30 days of bookings with service info
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      starts_at,
      status,
      price_cents,
      source,
      services:service_id ( name, duration_minutes )
    `)
    .eq('business_id', business.id)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('starts_at', { ascending: false })

  type BookingRow = {
    starts_at: string
    status: string
    price_cents: number
    source: string | null
    services: { name: string; duration_minutes: number } | null
  }
  const rows: BookingRow[] = (bookings ?? []) as BookingRow[]

  // No bookings yet — return empty state
  if (rows.length === 0) {
    return NextResponse.json({ insights: [], empty: true } satisfies InsightsResponse)
  }

  // ── Summary stats ──────────────────────────────────────────────────────────

  const count = rows.length
  const revenue = rows.reduce((s: number, b: BookingRow) => s + b.price_cents, 0) / 100
  const noShows = rows.filter((b: BookingRow) => b.status === 'no_show').length
  const cancellations = rows.filter((b: BookingRow) => b.status === 'cancelled').length

  // Most booked service
  const serviceCount: Record<string, number> = {}
  for (const b of rows) {
    if (b.services?.name) serviceCount[b.services.name] = (serviceCount[b.services.name] ?? 0) + 1
  }
  const topService = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'

  // Hour and day of week breakdowns
  const hourCount: Record<number, number> = {}
  const dayCount: Record<number, number> = {}
  for (const b of rows) {
    const d = new Date(b.starts_at)
    const h = d.getHours()
    const dow = d.getDay()
    hourCount[h] = (hourCount[h] ?? 0) + 1
    dayCount[dow] = (dayCount[dow] ?? 0) + 1
  }

  const peakHourEntry = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]
  const peakDayEntry = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]
  const peakHour = Number(peakHourEntry?.[0] ?? 9)
  const peakDay = Number(peakDayEntry?.[0] ?? 1)

  const hourBreakdown = Object.entries(hourCount)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([h, c]) => `  ${h.padStart(2, '0')}:00 → ${c} bookings`)
    .join('\n')

  const dayBreakdown = Object.entries(dayCount)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([d, c]) => `  ${DAY_NAMES[Number(d)]} → ${c} bookings`)
    .join('\n')

  // ── Claude API call ────────────────────────────────────────────────────────

  const userPrompt = `Business: ${business.name}
Category: ${business.category ?? 'wellness'}
Period: Last 30 days

Stats:
- Total bookings: ${count}
- Total revenue: €${revenue.toFixed(2)}
- No-shows: ${noShows}
- Cancellations: ${cancellations}
- Most popular service: ${topService}
- Peak hour: ${peakHour}:00
- Peak day: ${DAY_NAMES[peakDay]}

Booking breakdown by hour:
${hourBreakdown || '  No data'}

Booking breakdown by day:
${dayBreakdown || '  No data'}

Return exactly this JSON structure:
{
  "insights": [
    {
      "type": "peak_time|revenue|no_show|opportunity",
      "title": "Short punchy title (max 6 words)",
      "body": "One specific actionable sentence (max 20 words)",
      "metric": "The key number or stat",
      "action": "What to do about it (max 8 words)"
    }
  ]
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are an AI business analyst for OpenBook, a booking platform for wellness businesses in Cork, Ireland. Analyse booking data and return exactly 3 insights as JSON. Each insight must be specific, actionable, and surprising. Focus on patterns the business owner might not have noticed. Return ONLY valid JSON, no other text.`,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const parsed = JSON.parse(text) as InsightsResponse

    cache.set(business.id, { data: parsed, expiresAt: Date.now() + 60 * 60 * 1000 })
    return NextResponse.json(parsed)
  } catch {
    // JSON parse or API failure — return deterministic fallback
    const fallback = buildFallback({ count, revenue, noShows, cancellations, topService, peakHour, peakDay })
    return NextResponse.json(fallback)
  }
}
