import type React from "react";
import type { Metadata } from "next";
import type { Viewport } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Start Your Kapioo Journey | Toronto Meal Plans",
  description:
    "Select your area and choose Daily Delivery or Weekly Meal Box. Fresh Asian comfort meals delivered across Toronto and the GTA.",
  path: "/starter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#C2884E",
};

export default function StarterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
