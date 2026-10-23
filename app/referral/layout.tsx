import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Kapioo Referral Program | Currently Paused",
  description: "The Kapioo referral program is currently paused. Explore our Asian fusion meal delivery service in Toronto and the GTA.",
  robots: { index: false, follow: true },
}

export default function ReferralLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
