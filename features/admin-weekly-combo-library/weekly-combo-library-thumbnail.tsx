"use client"

import type { WeeklyComboLibraryItem } from "@/lib/combo-library/weekly/types"

type WeeklyComboLibraryThumbnailProps = {
  item: Pick<WeeklyComboLibraryItem, "imageUrl" | "internalName" | "name">
  className?: string
}

/**
 * Small, lazy admin thumbnail. The source object may still be the original S3
 * image, so keep the rendered box compact and deprioritize offscreen loading.
 */
export function WeeklyComboLibraryThumbnail({
  item,
  className = "h-16 w-20",
}: WeeklyComboLibraryThumbnailProps) {
  const label = item.internalName || item.name || "Weekly combo"

  if (!item.imageUrl) {
    return (
      <div
        className={`${className} flex shrink-0 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground`}
      >
        No image
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.imageUrl}
      alt={`${label} preview`}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      className={`${className} shrink-0 rounded-md object-cover`}
    />
  )
}
