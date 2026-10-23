import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { FaqContent } from "./faq-content";

export const metadata: Metadata = buildPageMetadata({
  title: "Kapioo FAQs | Meal Vouchers, Plans & Toronto Delivery",
  description:
    "Answers about Kapioo Daily Bento and Weekly Meal Box, flexible meal vouchers, e-Transfer payments, delivery areas, order cutoffs and food storage in Toronto and the GTA.",
  path: "/faq",
});

export default function FaqPage() {
  return <FaqContent />;
}
