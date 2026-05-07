import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function safeNextPath(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

async function ensureOwnerForUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
}) {
  const email = user.email;
  if (!email) return { ok: false as const, error: 'Missing email on account' };

  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === 'string'
      ? metadata.full_name
      : typeof metadata.name === 'string'
        ? metadata.name
        : null;
  const avatarUrl =
    typeof metadata.avatar_url === 'string'
      ? metadata.avatar_url
      : typeof metadata.picture === 'string'
        ? metadata.picture
        : null;

  const admin = supabaseAdmin();
  const { error } = await admin
    .from('owners')
    .upsert(
      {
        id: user.id,
        email,
        full_name: fullName,
        avatar_url: avatarUrl,
      },
      { onConflict: 'id' },
    );

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/**
 * OAuth callback: exchange the code for a session, then send the user to
 * the right destination based on their onboarding state.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(`${origin}/onboard?error=no_code`);
  }

  const sb = createSupabaseServerClient();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/onboard?error=${encodeURIComponent(error.message)}`);
  }

  // Look up owner state — route accordingly
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/onboard?error=no_user`);
  }

  const ensured = await ensureOwnerForUser(user);
  if (!ensured.ok) {
    return NextResponse.redirect(`${origin}/onboard?error=${encodeURIComponent(ensured.error)}`);
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
