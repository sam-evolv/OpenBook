import { stripe } from './stripe'
import { createServiceClient } from './supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://openbook.ie'

/**
 * Create a Stripe Checkout Session for a WhatsApp booking.
 * Returns the payment URL to send to the customer.
 */
export async function createWhatsAppPaymentLink({
  bookingId,
  businessId,
  customerPhone,
  serviceName,
  priceEurCents,
  stripeAccountId,
}: {
  bookingId: string
  businessId: string
  customerPhone: string
  serviceName: string
  priceEurCents: number
  stripeAccountId: string
}): Promise<string> {
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: serviceName },
            unit_amount: priceEurCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}/booking/whatsapp-success?bookingId=${bookingId}`,
      cancel_url: `${BASE_URL}/booking/whatsapp-cancel?bookingId=${bookingId}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
      metadata: {
        bookingId,
        businessId,
        customerPhone,
        source: 'whatsapp',
      },
    },
    {
      stripeAccount: stripeAccountId,
    }
  )

  if (!session.url) throw new Error('Stripe did not return a session URL')
  return session.url
}

/**
 * Mark a booking as confirmed after successful WhatsApp payment.
 */
export async function confirmWhatsAppBooking(bookingId: string): Promise<{
  serviceName: string
  startsAt: string
  businessName: string
  customerPhone: string | null
} | null> {
  const supabase = await createServiceClient()

  const { data: booking } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)
    .eq('source', 'whatsapp')
    .select(`
      starts_at,
      services:service_id ( name ),
      businesses:business_id ( name ),
      customers:customer_id ( whatsapp_number )
    `)
    .single()

  if (!booking) return null

  const services = booking.services as { name: string } | null
  const businesses = booking.businesses as { name: string } | null
  const customers = booking.customers as { whatsapp_number: string | null } | null

  return {
    serviceName: services?.name ?? 'your appointment',
    startsAt: booking.starts_at,
    businessName: businesses?.name ?? 'us',
    customerPhone: customers?.whatsapp_number ?? null,
  }
}
