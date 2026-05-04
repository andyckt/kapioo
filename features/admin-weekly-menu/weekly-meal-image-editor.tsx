"use client"

import { MenuImageEditor } from "@/components/admin/menu-image-editor"
import { uploadWeeklyMealImage } from "@/lib/upload/weekly-meal-image-client"
import type { MealOption } from "@/lib/weekly-subscription"

type WeeklyMealImageEditorProps = {
  option: Pick<MealOption, "id" | "name" | "imageUrl" | "imageKey">
  onChange: (updates: Pick<MealOption, "imageUrl" | "imageKey">) => void
}

/**
 * Thin wrapper around MenuImageEditor for weekly meal options. Mirrors
 * ComboImageEditor so admins get the same UX in both menu surfaces.
 */
export function WeeklyMealImageEditor({ option, onChange }: WeeklyMealImageEditorProps) {
  return (
    <MenuImageEditor
      label="Meal Image"
      altText={`${option.name} meal preview`}
      imageUrl={option.imageUrl}
      uploadImage={(file) => uploadWeeklyMealImage(file, option.id)}
      onChange={onChange}
      emptyTitle="Upload meal photo"
      emptyHint="Optional, shown on the weekly meal page and customer menu."
    />
  )
}
