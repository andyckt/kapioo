import type { Metadata } from "next";
import type React from "react";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PRODUCT_LINE_LABELS } from "@/lib/product-lines/names";

export const metadata: Metadata = buildPageMetadata({
  title: `${PRODUCT_LINE_LABELS.weekly.en} Delivery in Toronto | Kapioo`,
  description:
    `Stock your fridge with freshly prepared Asian fusion meals. Kapioo Weekly Meal Box delivers twice a week across Toronto and the GTA, with flexible weekly vouchers.`,
  path: "/weekly-meal",
});

export default function WeeklyMealLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
