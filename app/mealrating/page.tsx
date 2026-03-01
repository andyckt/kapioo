import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { MealRatingContent } from "./meal-rating-content";

export const metadata: Metadata = buildPageMetadata({
  title: "Rate Your Meal | Kapioo Toronto",
  description:
    "Share your feedback on today's Kapioo meals. Your input helps us improve.",
  path: "/mealrating",
});

export default function MealRatingPage() {
  return <MealRatingContent />;
}
