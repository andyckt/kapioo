import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { SupportContent } from './support-content'

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Kapioo Support | Submit a Ticket',
  description: 'Questions about your Kapioo meals, delivery, vouchers or account? Submit a support ticket. Our Toronto team replies by email within 2–3 business days.',
  path: '/support',
})

export default function SupportPage() {
  return <SupportContent />
}
