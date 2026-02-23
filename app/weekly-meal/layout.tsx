import type { Metadata } from "next";
import type React from "react";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Weekly Meal Box | Kapioo Toronto",
  description:
    "Explore Kapioo Weekly Meal Box plans with rotating menus, flexible meal credits, and reliable delivery across the GTA.",
  path: "/weekly-meal",
});

export default function WeeklyMealLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
