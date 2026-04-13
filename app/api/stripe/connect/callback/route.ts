import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConnectAccountStatus } from '@/lib/stripe'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/**
 * GET /api/stripe/connect/callback
 *
 * Called by Stripe after the merchant completes (or skips) onboarding.
 * Verifies the account status and redirects to the payments settings page.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const businessId = searchParams.get('business_id')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !businessId) {
    return NextResponse.redirect(`${BASE_URL}/settings/payments?error=missing_params`)
  }

  // Fetch the business to get the current stripe_account_id
  const { data: business } = await supabase
    .from('businesses')
    .select('id, stripe_account_id, owner_id')
    .eq('id', businessId)
    .eq('owner_id', user.id)
    .single()

  if (!business?.stripe_account_id) {
    return NextResponse.redirect(`${BASE_URL}/settings/payments?error=no_account`)
  }

  // Verify the account is actually connected and enabled
  try {
    const status = await getConnectAccountStatus(business.stripe_account_id)

    // Stripe account is confirmed — redirect with success indicator
    const url = new URL(`${BASE_URL}/settings/payments`)
    url.searchParams.set('connected', '1')
    if (status.charges_enabled) url.searchParams.set('charges', '1')

    return NextResponse.redirect(url.toString())
  } catch {
    return NextResponse.redirect(`${BASE_URL}/settings/payments?error=verification_failed`)
  }
}
