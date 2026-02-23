import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { FaqContent } from "./faq-content";

export const metadata: Metadata = buildPageMetadata({
  title: "FAQ | Kapioo Toronto Meal Delivery",
  description:
    "Frequently asked questions about Kapioo delivery areas, cutoff times, freshness, meal selection, dietary notes, and support.",
  path: "/faq",
});

export default function FaqPage() {
  return <FaqContent />;
}
