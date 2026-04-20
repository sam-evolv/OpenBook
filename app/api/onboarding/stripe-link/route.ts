import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
}

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

  const origin = req.headers.get('origin') ?? `https://${req.headers.get('host') ?? 'app.openbook.ie'}`;

  const link = await stripe.accountLinks.create({
    account: accountId,
    return_url: `${origin}/onboard/flow?stripe=ok`,
    refresh_url: `${origin}/onboard/flow?stripe=retry`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: link.url });
}
