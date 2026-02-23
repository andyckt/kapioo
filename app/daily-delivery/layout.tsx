import type { Metadata } from "next";
import type React from "react";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Daily Delivery | Kapioo Toronto",
  description:
    "Order Kapioo Daily Delivery meals for weekday lunch with fresh cooking, clear cutoffs, and area-based delivery availability.",
  path: "/daily-delivery",
});

export default function DailyDeliveryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
