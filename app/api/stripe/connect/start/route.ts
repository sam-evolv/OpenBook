import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createConnectAccount, createConnectAccountLink } from '@/lib/stripe'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/**
 * GET /api/stripe/connect/start
 *
 * Creates (or reuses) a Stripe Express account for the authenticated business,
 * generates an account-onboarding link, and redirects the browser to Stripe.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${BASE_URL}/login`)
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, stripe_account_id')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  let accountId = business.stripe_account_id

  if (!accountId) {
    // Create a new Stripe Express account
    accountId = await createConnectAccount(user.email!)

    // Persist immediately so we don't create duplicates on refresh
    await supabase
      .from('businesses')
      .update({ stripe_account_id: accountId })
      .eq('id', business.id)
  }

  const returnUrl  = `${BASE_URL}/api/stripe/connect/callback?business_id=${business.id}`
  const refreshUrl = `${BASE_URL}/api/stripe/connect/start`

  const onboardingUrl = await createConnectAccountLink(accountId, returnUrl, refreshUrl)

  return NextResponse.redirect(onboardingUrl)
}
