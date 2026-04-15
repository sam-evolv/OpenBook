import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

const DEV_BYPASS = process.env.NODE_ENV === 'development'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (DEV_BYPASS) return <DashboardShell>{children}</DashboardShell>

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Redirect to onboarding if they have no business yet
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) redirect('/onboarding')

  return <DashboardShell>{children}</DashboardShell>
}
