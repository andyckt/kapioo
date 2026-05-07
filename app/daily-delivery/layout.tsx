import type { Metadata } from "next";
import type React from "react";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PRODUCT_LINE_LABELS } from "@/lib/product-lines/names";

export const metadata: Metadata = buildPageMetadata({
  title: `${PRODUCT_LINE_LABELS.daily.en} | Kapioo Toronto`,
  description:
    `Order Kapioo ${PRODUCT_LINE_LABELS.daily.en} meals for weekday lunch with fresh cooking, clear cutoffs, and area-based delivery availability.`,
  path: "/daily-delivery",
});

export default function DailyDeliveryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
