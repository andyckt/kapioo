"use client"

type ComboLibraryThumbnailItem = {
  imageUrl?: string
  internalName?: string
  name?: string
}

type ComboLibraryThumbnailProps = {
  item: ComboLibraryThumbnailItem
  className?: string
}

/**
 * Small, lazy admin thumbnail for combo libraries. The source may still be the
 * original S3 object, so render compactly and deprioritize offscreen images.
 */
export function ComboLibraryThumbnail({
  item,
  className = "h-16 w-20",
}: ComboLibraryThumbnailProps) {
  const label = item.internalName || item.name || "Combo"

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
