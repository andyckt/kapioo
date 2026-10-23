import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { CateringContent } from './catering-content'

export const metadata: Metadata = buildPageMetadata({
  title: 'Asian Catering Toronto & GTA | Kapioo Sharing Trays & Corporate Bento',
  description: 'Bring people together with Kapioo catering. Explore Chinese and Japanese-inspired sharing trays, desserts, corporate bentos and transparent menu prices for Toronto and the GTA.',
  path: '/catering',
})

export default function CateringPage() {
  return <CateringContent />
}
