import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { HowItWorksContent } from "./how-it-works-content";

export const metadata: Metadata = buildPageMetadata({
  title: "How Kapioo Works | Meal Vouchers & Toronto Delivery",
  description:
    "Check your address, buy flexible meal vouchers and redeem them for freshly made Asian fusion meals. Explore Daily Bento and Weekly Meal Box delivery across Toronto and the GTA.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
