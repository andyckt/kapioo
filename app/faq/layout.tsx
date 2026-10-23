import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata = buildPageMetadata({ title: 'Meal Delivery FAQs: Plans, Ordering & Delivery | Kapioo', description: 'Questions about Kapioo meal delivery in Toronto and the GTA? Find answers about address availability, Daily Bento, Weekly Meal Box, flexible vouchers, ordering and payment.', path: '/faq' })
export default function FaqLayout({ children }: { children: React.ReactNode }) { return children }
