import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { HowItWorksContent } from "./how-it-works-content";

export const metadata: Metadata = buildPageMetadata({
  title: "How Kapioo Works | Toronto Meal Delivery",
  description:
    "See how Kapioo works in 3 simple steps. Choose your plan, pick meals, and get healthy Asian comfort meals delivered across Toronto and the GTA.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
