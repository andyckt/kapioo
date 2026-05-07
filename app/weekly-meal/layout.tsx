import type { Metadata } from "next";
import type React from "react";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PRODUCT_LINE_LABELS } from "@/lib/product-lines/names";

export const metadata: Metadata = buildPageMetadata({
  title: `${PRODUCT_LINE_LABELS.weekly.en} | Kapioo Toronto`,
  description:
    `Explore Kapioo ${PRODUCT_LINE_LABELS.weekly.en} plans with rotating menus, flexible meal credits, and reliable delivery across the GTA.`,
  path: "/weekly-meal",
});

export default function WeeklyMealLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
