import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BusinessBookingPage from '@/components/public/BusinessBookingPage'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props) {
  const supabase = await createClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('name, description')
    .eq('slug', params.slug)
    .eq('is_live', true)
    .single()

  if (!business) return {}
  return {
    title: `Book ${business.name}`,
    description: business.description ?? `Book your appointment with ${business.name}`,
  }
}

export default async function PublicBookingRoute({ params }: Props) {
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_live', true)
    .single()

  if (!business) notFound()

  const [{ data: services }, { data: reviews }, { data: staff }] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('reviews')
      .select('id, rating, comment, created_at, customers:customer_id(name)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('staff')
      .select('id, name, avatar_url')
      .eq('business_id', business.id)
      .eq('is_active', true),
  ])

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length
      : null

  return (
    <BusinessBookingPage
      business={business}
      services={services ?? []}
      reviews={(reviews ?? []).map((r) => ({
        ...r,
        customers: { name: (r.customers as { name: string | null } | null)?.name ?? 'Anonymous' },
      }))}
      staff={staff ?? []}
      avgRating={avgRating}
    />
  )
}
