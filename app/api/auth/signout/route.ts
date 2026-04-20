import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = createSupabaseServerClient();
  await sb.auth.signOut();
  const origin = new URL(req.url).origin;
  return NextResponse.redirect(`${origin}/onboard`);
}
