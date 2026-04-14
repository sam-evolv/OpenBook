import { createClient } from '@/lib/supabase/server'
import { ServicesClient } from '@/components/dashboard/ServicesClient'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business!.id)
    .order('sort_order')

  return <ServicesClient services={services ?? []} />
}
