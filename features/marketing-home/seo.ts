import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const HOME_TITLE = 'Asian Fusion Meal Delivery in Toronto & GTA | Kapioo'
export const HOME_DESCRIPTION = 'Freshly made, never frozen Asian fusion meals delivered in Toronto and the GTA. Explore Daily Bento and Weekly Meal Box plans and order online.'
const origin = 'https://www.kapioo.com'

export function marketingMetadata(previewName?: string): Metadata {
  return {
    ...buildPageMetadata({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: '/' }),
    ...(previewName ? { title: HOME_TITLE + ' — ' + previewName + ' preview', robots: { index: false, follow: false } } : {}),
  }
}

// Verified business and service facts, without invented ratings, prices or rankings.
export const marketingStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': origin + '/#organization', name: 'Kapioo', url: origin },
    { '@type': 'WebSite', '@id': origin + '/#website', url: origin, name: 'Kapioo', publisher: { '@id': origin + '/#organization' }, inLanguage: ['en-CA', 'zh-Hans'] },
    {
      '@type': 'Service', '@id': origin + '/#meal-delivery', name: 'Kapioo Asian Fusion Meal Delivery', serviceType: 'Prepared Asian fusion meal delivery', url: origin + '/starter',
      provider: { '@id': origin + '/#organization' },
      areaServed: [{ '@type': 'City', name: 'Toronto' }, { '@type': 'Place', name: 'Greater Toronto Area' }],
      description: 'Daily Bento and Weekly Meal Box. Available plans and delivery options depend on the customer’s delivery address.',
    },
  ],
}

export function serializeStructuredData(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
