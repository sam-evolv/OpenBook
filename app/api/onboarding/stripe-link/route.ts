import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/stripe-link
 * Body: { businessId }
 *
 * Creates (or reuses) a Stripe Connect Express account for this business,
 * returns a URL to the hosted onboarding flow. When they finish, Stripe
 * redirects them back to /onboard/flow?stripe=ok.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { businessId } = await req.json();

  const { data: business } = await sb
    .from('businesses')
    .select('id, owner_id, stripe_account_id, name, city')
    .eq('id', businessId)
    .maybeSingle();

  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // Create account if missing
  let accountId = business.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'IE',
      email: user.email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: business.name,
      },
      metadata: {
        business_id: business.id,
        owner_id: user.id,
      },
    });
    accountId = account.id;

    await sb
      .from('businesses')
      .update({ stripe_account_id: accountId })
      .eq('id', business.id);
  }

  /* Onboarding lives only on the dashboard host (dash.openbook.ie) — the
     consumer host (app.*) doesn't serve /onboard/flow, so a return_url
     pointing there would 404. Derive from the request origin/host but
     force the dash subdomain for openbook.ie. */
  const rawOrigin =
    req.headers.get('origin') ??
    `https://${req.headers.get('host') ?? 'dash.openbook.ie'}`;
  const origin = rawOrigin.replace('://app.openbook.ie', '://dash.openbook.ie');

  const returnUrl = `${origin}/onboard/flow?stripe=ok`;
  const refreshUrl = `${origin}/onboard/flow?stripe=retry`;
  console.log('[stripe-link] account-link urls', { accountId, returnUrl, refreshUrl });

  const link = await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: link.url });
}
