import type { Metadata } from "next";
import type React from "react";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PRODUCT_LINE_LABELS } from "@/lib/product-lines/names";

export const metadata: Metadata = buildPageMetadata({
  title: `${PRODUCT_LINE_LABELS.daily.en} Delivery in Toronto | Kapioo`,
  description:
    `Freshly cooked Asian fusion bentos delivered for lunch in Toronto. Buy meal vouchers, choose your meals and redeem when you want them. Minimum 2 meals per delivery.`,
  path: "/daily-delivery",
});

export default function DailyDeliveryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
