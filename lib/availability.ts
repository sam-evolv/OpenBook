import { toZonedTime, fromZonedTime, format } from 'date-fns-tz'
import { addMinutes, parseISO, isWithinInterval } from 'date-fns'
import { createClient } from './supabase/server'
import type { AvailabilityResult, TimeSlot } from './types'

const TIMEZONE = 'Europe/Dublin'

/**
 * Core availability engine.
 * Returns available time slots for a given business, service, and date.
 */
export async function getAvailability(
  businessId: string,
  serviceId: string,
  date: string // YYYY-MM-DD
): Promise<AvailabilityResult> {
  const supabase = await createClient()

  // 1. Fetch service details
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes, capacity')
    .eq('id', serviceId)
    .single()

  if (!service) {
    return { date, slots: [], isClosed: true, closureName: 'Service not found' }
  }

  // 2. Fetch business buffer minutes
  const { data: business } = await supabase
    .from('businesses')
    .select('buffer_minutes')
    .eq('id', businessId)
    .single()

  const bufferMinutes = business?.buffer_minutes ?? 15
  const slotDuration = service.duration_minutes + bufferMinutes
  const capacity = service.capacity ?? 1

  // 3. Check for closure on this date
  const { data: closure } = await supabase
    .from('business_closures')
    .select('name')
    .eq('business_id', businessId)
    .eq('date', date)
    .maybeSingle()

  if (closure) {
    return { date, slots: [], isClosed: true, closureName: closure.name ?? 'Closed' }
  }

  // 4. Get day of week (0=Sun) in business timezone
  const zonedDate = toZonedTime(parseISO(date), TIMEZONE)
  const dayOfWeek = zonedDate.getDay()

  // 5. Fetch business hours for this day
  const { data: hours } = await supabase
    .from('business_hours')
    .select('is_open, open_time, close_time')
    .eq('business_id', businessId)
    .eq('day_of_week', dayOfWeek)
    .maybeSingle()

  if (!hours || !hours.is_open) {
    return { date, slots: [], isClosed: true, closureName: 'Closed' }
  }

  const openTime = hours.open_time ?? '09:00'
  const closeTime = hours.close_time ?? '18:00'

  // 6. Fetch all confirmed bookings for this service on this date
  const dayStart = fromZonedTime(
    new Date(`${date}T${openTime}`),
    TIMEZONE
  )
  const dayEnd = fromZonedTime(
    new Date(`${date}T${closeTime}`),
    TIMEZONE
  )

  const { data: bookings } = await supabase
    .from('bookings')
    .select('starts_at, ends_at')
    .eq('business_id', businessId)
    .eq('service_id', serviceId)
    .in('status', ['confirmed'])
    .gte('starts_at', dayStart.toISOString())
    .lte('starts_at', dayEnd.toISOString())

  // 7. Generate slots
  const [openHour, openMin] = openTime.split(':').map(Number)
  const [closeHour, closeMin] = closeTime.split(':').map(Number)

  const openMinutes = openHour * 60 + openMin
  const closeMinutes = closeHour * 60 + closeMin

  const slots: TimeSlot[] = []

  for (
    let minuteOffset = openMinutes;
    minuteOffset + service.duration_minutes <= closeMinutes;
    minuteOffset += slotDuration
  ) {
    const slotHour = Math.floor(minuteOffset / 60)
    const slotMin = minuteOffset % 60
    const timeLabel = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`

    const slotStart = fromZonedTime(
      new Date(`${date}T${timeLabel}:00`),
      TIMEZONE
    )
    const slotEnd = addMinutes(slotStart, service.duration_minutes)

    // Count how many confirmed bookings overlap this slot
    const overlappingBookings = (bookings ?? []).filter((b) => {
      const bStart = parseISO(b.starts_at)
      const bEnd = parseISO(b.ends_at)
      return (
        isWithinInterval(slotStart, { start: bStart, end: bEnd }) ||
        isWithinInterval(bStart, { start: slotStart, end: slotEnd }) ||
        slotStart.getTime() === bStart.getTime()
      )
    })

    const spotsLeft = capacity - overlappingBookings.length
    const available = spotsLeft > 0

    slots.push({ time: timeLabel, available, spotsLeft: Math.max(0, spotsLeft) })
  }

  return { date, slots, isClosed: false }
}

/**
 * Returns all available dates in a given month for quick calendar rendering.
 */
export async function getAvailableDatesInMonth(
  businessId: string,
  serviceId: string,
  year: number,
  month: number // 1-based
): Promise<string[]> {
  const supabase = await createClient()

  const { data: hours } = await supabase
    .from('business_hours')
    .select('day_of_week, is_open')
    .eq('business_id', businessId)

  const openDays = new Set(
    (hours ?? []).filter((h) => h.is_open).map((h) => h.day_of_week)
  )

  const { data: closures } = await supabase
    .from('business_closures')
    .select('date')
    .eq('business_id', businessId)
    .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
    .lte('date', `${year}-${String(month).padStart(2, '0')}-31`)

  const closedDates = new Set((closures ?? []).map((c) => c.date))

  const daysInMonth = new Date(year, month, 0).getDate()
  const available: string[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayOfWeek = new Date(dateStr).getDay()
    if (openDays.has(dayOfWeek) && !closedDates.has(dateStr)) {
      available.push(dateStr)
    }
  }

  return available
}
