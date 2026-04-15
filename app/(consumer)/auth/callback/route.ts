import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code       = searchParams.get('code')
  const redirectTo = searchParams.get('redirectTo') ?? '/home'

  if (!code) {
    return NextResponse.redirect(`${origin}/welcome`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !session) {
    return NextResponse.redirect(`${origin}/welcome`)
  }

  const user = session.user

  // Ensure a customer record exists for this user.
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    // Derive a display name from email
    const emailPrefix = user.email?.split('@')[0] ?? 'User'
    const name = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).replace(/[._-]/g, ' ')

    await supabase.from('customers').insert({
      user_id: user.id,
      email:   user.email ?? null,
      name,
    })
  }

  // Redirect to requested page (or /home as default)
  const dest = redirectTo.startsWith('/') ? `${origin}${redirectTo}` : `${origin}/home`
  return NextResponse.redirect(dest)
}
