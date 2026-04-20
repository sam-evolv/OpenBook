import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * OAuth callback: exchange the code for a session, then send the user to
 * the right destination based on their onboarding state.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? null;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const sb = createSupabaseServerClient();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // Look up owner state — route accordingly
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  // If caller asked for a specific next page, honour it
  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const { data: owner } = await sb
    .from('owners')
    .select('onboarding_completed, onboarding_step')
    .eq('id', user.id)
    .maybeSingle();

  if (!owner?.onboarding_completed) {
    return NextResponse.redirect(`${origin}/onboard`);
  }

  // Completed onboarding — send to dashboard on the dash subdomain
  const host = req.headers.get('host') ?? '';
  if (host.startsWith('app.')) {
    return NextResponse.redirect(
      `https://${host.replace('app.', 'dash.')}/dashboard`
    );
  }
  return NextResponse.redirect(`${origin}/dashboard`);
}
