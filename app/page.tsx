import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/landing/LandingPage'

// Root: show landing page for guests, redirect dashboard users straight to /overview.
export default async function RootPage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/overview')
  } catch {
    // Supabase unavailable or cookies context missing — render landing page
  }

  return <LandingPage />
}
