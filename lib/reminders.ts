import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import type { ReminderTarget } from './types'

const resend = new Resend(process.env.RESEND_API_KEY!)

/**
 * Send a booking reminder via email (Resend) and SMS (Twilio).
 */
export async function sendReminder(target: ReminderTarget): Promise<void> {
  const { booking, type } = target
  const { services, businesses, customers } = booking

  const startsAt = parseISO(booking.starts_at)
  const dateStr = format(startsAt, 'EEEE d MMMM')
  const timeStr = format(startsAt, 'HH:mm')
  const label = type === '24h' ? 'tomorrow' : 'in 2 hours'
  const subject = `Reminder: ${services.name} ${label} at ${timeStr}`

  const body = `Hi ${customers.name ?? 'there'},\n\nJust a reminder that you have a ${services.name} booking at ${businesses.name} on ${dateStr} at ${timeStr}.\n\n${businesses.address ? `Address: ${businesses.address}` : ''}\n\nSee you then!`

  // Email
  if (customers.email) {
    await resend.emails.send({
      from: 'OpenBook <bookings@openbook.ai>',
      to: customers.email,
      subject,
      text: body,
    })
  }

  // SMS via Twilio (lazy import to avoid build error if not configured)
  if (customers.phone && process.env.TWILIO_ACCOUNT_SID) {
    const twilio = (await import('twilio')).default
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )
    await client.messages.create({
      body: `${businesses.name}: ${services.name} reminder — ${dateStr} at ${timeStr}. Reply STOP to opt out.`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: customers.phone,
    })
  }

  // Push notification (Expo) — fire and forget
  if (customers.expo_push_token) {
    void sendExpoPushNotification(customers.expo_push_token, subject, body)
  }
}

async function sendExpoPushNotification(
  token: string,
  title: string,
  body: string
): Promise<void> {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body }),
  })
}
