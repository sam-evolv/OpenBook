import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/overview',
        '/calendar',
        '/bookings',
        '/customers',
        '/services',
        '/packages',
        '/messages',
        '/settings',
        '/onboarding',
        '/api/',
      ],
    },
    sitemap: 'https://openbook.ie/sitemap.xml',
  }
}
