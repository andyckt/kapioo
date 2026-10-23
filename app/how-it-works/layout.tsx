import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata = buildPageMetadata({ title: 'How Kapioo Meal Delivery Works | Toronto & GTA', description: 'Enter your address, discover available plans, buy meal vouchers and redeem them when you want delivery. Learn how Kapioo Asian fusion meal delivery works in Toronto and the GTA.', path: '/how-it-works' })
export default function HowItWorksLayout({ children }: { children: React.ReactNode }) { return children }
