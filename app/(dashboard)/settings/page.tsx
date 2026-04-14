import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from '@/components/dashboard/SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user!.id)
    .single()

  if (!business) return null

  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://openbook.ai'}/${business.slug}`

  return (
    <SettingsClient
      business={{
        name: business.name,
        category: business.category,
        city: business.city ?? '—',
        address: business.address ?? '—',
        website: business.website ?? '—',
        instagram: business.instagram_handle ? `@${business.instagram_handle}` : '—',
        whatsapp: business.whatsapp_number ?? 'Not connected',
        buffer: `${business.buffer_minutes ?? 15} min`,
        bookingUrl,
        isLive: business.is_live ?? false,
      }}
    />
  )
}
