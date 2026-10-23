import type React from "react";
import type { Metadata } from "next";
import type { Viewport } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Check Meal Delivery Availability in Toronto | Kapioo",
  description:
    "Enter your address to see Kapioo Daily Bento and Weekly Meal Box options available to you. Fresh Asian fusion meal delivery in Toronto and the GTA.",
  path: "/starter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f8f2e9",
};

export default function StarterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
