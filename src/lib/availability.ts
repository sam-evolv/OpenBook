import { addMinutes, parseISO, isWithinInterval } from 'date-fns'
import { supabase } from './supabase'
import type { AvailabilityResult, TimeSlot } from './types'

/**
 * Client-side availability engine.
 * Returns available time slots for a given business, service, and date.
 */
export async function getAvailability(
  businessId: string,
  serviceId: string,
  date: string // YYYY-MM-DD
): Promise<AvailabilityResult> {
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

  // 4. Get day of week (0=Sun)
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()

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
  const dayStart = `${date}T${openTime}:00`
  const dayEnd = `${date}T${closeTime}:00`

  const { data: bookings } = await supabase
    .from('bookings')
    .select('starts_at, ends_at')
    .eq('business_id', businessId)
    .eq('service_id', serviceId)
    .in('status', ['confirmed'])
    .gte('starts_at', dayStart)
    .lte('starts_at', dayEnd)

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

    const slotStart = parseISO(`${date}T${timeLabel}:00`)
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
