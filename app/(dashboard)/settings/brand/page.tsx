import { createClient } from '@/lib/supabase/server'
import { tokens } from '@/lib/types'
import { BrandSettingsClient } from './BrandSettingsClient'

export const dynamic = 'force-dynamic'

export default async function BrandSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, logo_url, primary_colour')
    .eq('owner_id', user!.id)
    .single()

  if (!business) return null

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white">Brand</h1>
        <p className="text-sm mt-1" style={{ color: tokens.text2 }}>
          Your logo appears as the app icon on the customer home screen.
        </p>
      </div>

      <BrandSettingsClient
        businessId={business.id}
        businessName={business.name}
        currentLogoUrl={business.logo_url}
        primaryColour={business.primary_colour ?? '#D4AF37'}
      />
    </div>
  )
}
