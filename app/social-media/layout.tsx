import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = buildPageMetadata({
  title: "Kapioo — Follow us",
  description:
    "Find Kapioo on Instagram or Xiaohongshu, or open our website for menus. Toggle English or Chinese from the globe icon anytime.",
  path: "/social-media",
})

export default function SocialMediaLayout({ children }: { children: React.ReactNode }) {
  return children
}
