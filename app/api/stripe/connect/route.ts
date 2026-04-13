import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createConnectAccount,
  createConnectAccountLink,
  getConnectAccountStatus,
} from '@/lib/stripe'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/** GET /api/stripe/connect — get connect status for authenticated business */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_account_id')
    .eq('owner_id', user.id)
    .single()

  if (!business?.stripe_account_id) {
    return NextResponse.json({ connected: false })
  }

  try {
    const status = await getConnectAccountStatus(business.stripe_account_id)
    return NextResponse.json(status)
  } catch {
    return NextResponse.json({ connected: false })
  }
}

/** POST /api/stripe/connect — start Stripe Connect onboarding (legacy) */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id, stripe_account_id')
    .eq('owner_id', user.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  let accountId = business.stripe_account_id

  if (!accountId) {
    accountId = await createConnectAccount(user.email!)
    await supabase
      .from('businesses')
      .update({ stripe_account_id: accountId })
      .eq('id', business.id)
  }

  const url = await createConnectAccountLink(
    accountId,
    `${BASE_URL}/settings/payments?connected=1`,
    `${BASE_URL}/settings/payments?refresh=1`
  )

  return NextResponse.json({ url })
}

/** DELETE /api/stripe/connect — disconnect Stripe account */
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  await supabase
    .from('businesses')
    .update({ stripe_account_id: null })
    .eq('id', business.id)

  return NextResponse.json({ disconnected: true })
}

