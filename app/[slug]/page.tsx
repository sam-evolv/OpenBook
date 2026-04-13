import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BusinessBookingPage from '@/components/public/BusinessBookingPage'

// Slugs that belong to app routes, static files, or common attack probes —
// short-circuit to notFound() without touching Supabase.
const RESERVED = new Set([
  'favicon.ico', 'favicon.png', 'robots.txt', 'sitemap.xml',
  'admin', 'api', 'login', 'signup', 'home', 'explore', 'overview',
  'onboarding', 'settings', 'booking', 'bookings', 'wallet', 'me',
  'welcome', 'health', 'index.html', 'checkout', 'pricing', 'shop',
  'donate', 'register', 'billing', 'payment', 'account',
  'trace.axd', 'swagger.json', 'swagger-ui.html',
  'info.php', 'config.json', '.env', 'nodesync', 'exec',
])

function isReserved(slug: string): boolean {
  return (
    RESERVED.has(slug) ||
    slug.includes('.') ||
    slug.startsWith('_') ||
    slug.startsWith('.')
  )
}

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props) {
  if (isReserved(params.slug)) return {}

  try {
    const supabase = await createClient()
    const { data: business } = await supabase
      .from('businesses')
      .select('name, description, hero_image_url, city, category')
      .eq('slug', params.slug)
      .eq('is_live', true)
      .single()

    if (!business) return {}

    const title       = `Book ${business.name}`
    const description = business.description ?? `Book your appointment with ${business.name} in ${business.city ?? 'Ireland'}.`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type:   'website',
        images: business.hero_image_url
          ? [{ url: business.hero_image_url, width: 1200, height: 630, alt: business.name }]
          : [],
      },
      twitter: {
        card:        'summary_large_image',
        title,
        description,
        images:      business.hero_image_url ? [business.hero_image_url] : [],
      },
    }
  } catch {
    return {}
  }
}

export default async function PublicBookingRoute({ params }: Props) {
  if (isReserved(params.slug)) return notFound()

  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_live', true)
    .single()

  if (!business) return notFound()

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
