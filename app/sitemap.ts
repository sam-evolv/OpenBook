import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('slug, created_at')
    .eq('is_live', true)

  const businessUrls: MetadataRoute.Sitemap = (businesses ?? []).map((b) => ({
    url: `https://openbook.ie/${b.slug}`,
    lastModified: b.created_at ? new Date(b.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: 'https://openbook.ie',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://openbook.ie/explore',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...businessUrls,
  ]
}
