import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendFlashSaleEmail } from '@/lib/email'
import { formatPrice } from '@/lib/utils'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { flashSaleId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { flashSaleId } = body
  if (!flashSaleId) {
    return NextResponse.json({ error: 'flashSaleId required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch the flash sale with related service + business
  const { data: sale, error: saleErr } = await supabase
    .from('flash_sales')
    .select(`
      id,
      sale_price_cents,
      original_price_cents,
      discount_percent,
      slot_time,
      expires_at,
      message,
      services:service_id  ( name ),
      businesses:business_id ( id, name, slug )
    `)
    .eq('id', flashSaleId)
    .single()

  if (saleErr || !sale) {
    return NextResponse.json({ error: 'Flash sale not found' }, { status: 404 })
  }

  const business = sale.businesses as { id: string; name: string; slug: string } | null
  const service  = sale.services  as { name: string } | null

  if (!business || !service) {
    return NextResponse.json({ error: 'Invalid flash sale data' }, { status: 400 })
  }

  // Get all customers who have saved this business
  const { data: savedBy, error: savedErr } = await supabase
    .from('customer_businesses')
    .select('customers:customer_id ( id, name, email )')
    .eq('business_id', business.id)

  if (savedErr) {
    return NextResponse.json({ error: savedErr.message }, { status: 500 })
  }

  type CustomerRow = { id: string; name: string | null; email: string | null }

  const customers: CustomerRow[] = (savedBy ?? [])
    .map((row) => row.customers as CustomerRow | null)
    .filter((c): c is CustomerRow => c !== null && !!c.email)

  if (customers.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0, message: 'No saved customers to notify' })
  }

  const expiresAt      = new Date(sale.expires_at)
  const bookBy         = format(expiresAt, 'h:mma').toLowerCase()
  const slotLabel      = format(new Date(sale.slot_time), 'EEEE d MMM, h:mma')
  const salePriceFmt   = formatPrice(sale.sale_price_cents)
  const origPriceFmt   = formatPrice(sale.original_price_cents)

  // Send emails concurrently (fire them all off)
  const results = await Promise.allSettled(
    customers.map((customer) =>
      sendFlashSaleEmail({
        to:              customer.email!,
        customerName:    customer.name ?? 'there',
        serviceName:     service.name,
        businessName:    business.name,
        businessSlug:    business.slug,
        salePrice:       salePriceFmt,
        origPrice:       origPriceFmt,
        discountPercent: sale.discount_percent,
        slotLabel,
        bookBy,
        message:         sale.message ?? undefined,
      })
    )
  )

  const sent   = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  console.log(`[flash-sales/notify] sent=${sent} failed=${failed} total=${customers.length}`)
  return NextResponse.json({ sent, failed, total: customers.length })
}
