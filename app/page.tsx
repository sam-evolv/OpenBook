import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/landing/LandingPage'

export const dynamic = 'force-dynamic'

export default async function Home() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/overview')
  } catch (err) {
    // Next.js redirect() and notFound() throw special errors that MUST be
    // re-thrown — swallowing them causes a 500 on Netlify's runtime.
    if (
      typeof (err as Record<string, unknown>)?.digest === 'string' &&
      ((err as Record<string, unknown>).digest as string).startsWith('NEXT_')
    ) {
      throw err
    }
    // All other errors (Supabase unavailable, missing env vars, cookie
    // context issues): fall through and render the landing page.
  }

  return <LandingPage />
}
