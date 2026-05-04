"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Mobile tile width: definite flex basis so aspect-ratio boxes resolve; avoids vw blowout vs padding. */
export const menuPreviewCarouselTileWidthClass =
  "w-[min(240px,calc(100vw-3.25rem))] max-w-[min(240px,calc(100vw-3.25rem))] md:w-full md:max-w-none"

/**
 * Horizontal scroll strip on small screens + grid on md+.
 * `-mx-*`/`px-*` bleed: use in full-width columns so cards align with sibling copy
 * that shares the outer container padding (e.g. landing hero beside text).
 *
 * **`menuPreviewCarouselRowInsetClassName`** (no bleed): use inside a padded card so
 * the first tile aligns with headings/buttons rather than sticking to the card edge.
 *
 * On small screens horizontal scrollbars are visually hidden (`scrollbar-hide`); drag/slide still scrolls.
 *
 * **`snap-proximity`** reads more “editorial” than mandatory snapping; pair with `MenuPreviewCarouselViewport` edge fades.
 */
export const menuPreviewCarouselRowClassName =
  "scrollbar-hide -mx-4 flex w-full min-w-0 max-w-full flex-nowrap snap-x snap-proximity gap-4 overflow-x-auto overflow-y-visible px-4 pb-2 [-webkit-overflow-scrolling:touch] scroll-smooth motion-reduce:scroll-auto md:mx-0 md:grid md:w-full md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-4"

export const menuPreviewCarouselRowInsetClassName =
  "scrollbar-hide flex w-full min-w-0 max-w-full flex-nowrap snap-x snap-proximity gap-4 overflow-x-auto overflow-y-visible pb-2 [-webkit-overflow-scrolling:touch] scroll-smooth motion-reduce:scroll-auto md:grid md:w-full md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible lg:grid-cols-4"

type MenuPreviewCarouselFade = { left: boolean; right: boolean }

/** Feather width — keep modest so previews stay readable while hinting overflow. */
const EDGE_FADE_SLOT = "pointer-events-none absolute inset-y-0 z-[2] w-9 md:hidden [backface-visibility:hidden] [-webkit-transform:translateZ(0)]"

/** Smooth multi-stop wash (no sharp `via` band — that reads as a “line”). */
const edgeFadeGradientLeft =
  "bg-[linear-gradient(to_right,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0.12)_52%,transparent_100%)]"
const edgeFadeGradientRight =
  "bg-[linear-gradient(to_left,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0.12)_52%,transparent_100%)]"

/** Scroll-linked edge fades for mobile horizontal lanes (“more beside” cue). */
function MenuPreviewCarouselEdgeMasks({
  fade,
}: {
  fade: MenuPreviewCarouselFade
}) {
  return (
    <>
      <div
        className={cn(
          EDGE_FADE_SLOT,
          "left-0",
          edgeFadeGradientLeft,
          "transition-opacity duration-300 ease-out motion-reduce:transition-none",
          fade.left ? "opacity-100" : "opacity-0"
        )}
        aria-hidden
      />
      <div
        className={cn(
          EDGE_FADE_SLOT,
          "right-0",
          edgeFadeGradientRight,
          "transition-opacity duration-300 ease-out motion-reduce:transition-none",
          fade.right ? "opacity-100" : "opacity-0"
        )}
        aria-hidden
      />
    </>
  )
}

/**
 * Wraps the scroll/grid row so mobile gets soft edge fades that react to scroll position.
 * Keeps typography-level polish without changing parent layout on `md:` (grid unchanged).
 */
export function MenuPreviewCarouselViewport({
  rowClassName,
  className,
  /** Set when skeleton strip is mounted */
  busy = false,
  children,
}: {
  rowClassName: string
  className?: string
  busy?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState<MenuPreviewCarouselFade>({ left: false, right: false })

  const updateFade = useCallback(() => {
    const el = ref.current
    if (!el || typeof window === "undefined") return

    if (window.matchMedia("(min-width: 768px)").matches) {
      setFade({ left: false, right: false })
      return
    }

    const { scrollLeft, scrollWidth, clientWidth } = el
    const overflow = scrollWidth - clientWidth
    if (overflow <= 4) {
      setFade({ left: false, right: false })
      return
    }

    setFade({
      left: scrollLeft > 6,
      right: scrollLeft < overflow - 6,
    })
  }, [])

  useEffect(() => {
    updateFade()
  }, [updateFade, children])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const ro = new ResizeObserver(() => updateFade())
    ro.observe(el)
    window.addEventListener("resize", updateFade)

    const id = window.requestAnimationFrame(() => updateFade())

    return () => {
      ro.disconnect()
      window.removeEventListener("resize", updateFade)
      window.cancelAnimationFrame(id)
    }
  }, [updateFade])

  return (
    <div
      className={cn(
        /** No `isolate` here — avoids 1px compositing seams beside scroll layers on WebKit */
        "relative z-0 min-w-0 w-full",
        className
      )}
      aria-busy={busy}
      aria-label={busy ? "Loading menu preview" : undefined}
    >
      <div ref={ref} className={rowClassName} onScroll={updateFade}>
        {children}
      </div>
      <MenuPreviewCarouselEdgeMasks fade={fade} />
    </div>
  )
}

const brokenLabel = (language: "en" | "zh") =>
  language === "zh" ? "图片即将更新" : "Photo coming soon"

export function MenuPreviewCarouselSkeleton({
  count = 8,
  variant = "daily",
  rowClassName = menuPreviewCarouselRowClassName,
}: {
  count?: number
  /** 'daily' shows a faux KCAL pill; 'weekly' shows tag placeholders */
  variant?: "daily" | "weekly"
  /** Use `menuPreviewCarouselRowInsetClassName` when the carousel sits inside padded cards. */
  rowClassName?: string
}) {
  return (
    <MenuPreviewCarouselViewport rowClassName={rowClassName} busy>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "snap-start shrink-0 animate-pulse overflow-hidden rounded-xl border border-[#F5EDE4] bg-white text-left shadow-sm",
            menuPreviewCarouselTileWidthClass
          )}
        >
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-[#EDE4DB] via-[#F5EDE4] to-[#EDE4DC]" />
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="h-6 w-28 rounded-full bg-[#F5EDE4]" />
              {variant === "daily" ? <div className="h-4 w-14 rounded bg-[#F5EDE4]" /> : null}
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-[#F5EDE4]" />
              <div className="h-4 w-[85%] rounded bg-[#F5EDE4]" />
            </div>
            {variant === "weekly" ? (
              <div className="flex flex-wrap gap-1.5">
                <div className="h-5 w-12 rounded-full bg-[#F5EDE4]" />
                <div className="h-5 w-16 rounded-full bg-[#F5EDE4]" />
              </div>
            ) : (
              <div className="h-3 w-full rounded bg-[#F5EDE4]/80" />
            )}
          </div>
        </div>
      ))}
    </MenuPreviewCarouselViewport>
  )
}

type MenuPreviewCardButtonProps = {
  language: "en" | "zh"
  imageUrl: string
  imageAlt: string
  badge: string
  title: string
  /** Combo dish line or similar */
  subtitle?: string | null
  /** e.g. "650 KCAL" */
  metaRight?: string | null
  tags?: string[]
  allergens?: string[]
  description?: string | null
  onClick: () => void
}

/**
 * Landing preview tile: fixed 16:9 media area, pulse placeholder until image fires load,
 * opacity fade-in on load, and in-place copy fallback when the image errors.
 */
export function MenuPreviewCardButton({
  language,
  imageUrl,
  imageAlt,
  badge,
  title,
  subtitle,
  metaRight,
  tags,
  allergens,
  description,
  onClick,
}: MenuPreviewCardButtonProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageBroken, setImageBroken] = useState(false)

  useEffect(() => {
    setImageLoaded(false)
    setImageBroken(false)
  }, [imageUrl])

  const handleLoad = useCallback(() => setImageLoaded(true), [])
  const handleError = useCallback(() => {
    setImageBroken(true)
    setImageLoaded(false)
  }, [])

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // No vertical translate on hover: parent rows use overflow-x-auto, where overflow-y
        // effectively clips — lift would shear the top of the card against the viewport.
        "group relative flex shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-[#F5EDE4] bg-white text-left shadow-sm transition-[box-shadow,border-color] duration-300 hover:border-[#C2884E]/30 hover:shadow-md",
        menuPreviewCarouselTileWidthClass
      )}
    >
      <div className="relative isolate aspect-[16/9] w-full shrink-0 overflow-hidden bg-[#F5EDE4]">
        {imageBroken ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#F5EDE4] px-3 text-center">
            <p className="text-xs font-medium leading-snug text-[#6B5F53]/80">{brokenLabel(language)}</p>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "absolute inset-0 z-10 bg-gradient-to-br from-[#EDE4DB] via-[#F5EDE4] to-[#EDE4DC] transition-opacity duration-500 ease-out",
                imageLoaded ? "pointer-events-none opacity-0" : "opacity-100",
                imageLoaded ? "" : "animate-pulse"
              )}
              aria-hidden
            />
            {/* eslint-disable-next-line @next/next/no-img-element — S3 URLs; matches existing landing pattern */}
            <img
              src={imageUrl}
              alt={imageAlt}
              loading="lazy"
              decoding="async"
              onLoad={handleLoad}
              onError={handleError}
              className={cn(
                "relative z-0 origin-top h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out will-change-transform motion-reduce:transition-opacity motion-reduce:duration-150",
                // Grow from top so the dish “hero” stays visually anchored (less harsh top crop than center-scale inside overflow-hidden).
                imageLoaded
                  ? "opacity-100 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                  : "opacity-0 scale-100 group-hover:scale-100",
              )}
            />
          </>
        )}
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="rounded-full bg-[#C2884E]/10 px-2 py-1 text-xs font-semibold text-[#C2884E]">
            {badge}
          </span>
        </div>
        <h3 className="line-clamp-2 text-base font-semibold text-[#6B5F53]">{title}</h3>
        {subtitle ? <p className="mt-2 line-clamp-2 text-xs text-[#6B5F53]/70">{subtitle}</p> : null}
        {description ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#6B5F53]/70">{description}</p> : null}
        {(metaRight || (tags && tags.length > 0)) ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {metaRight ? (
              <span className="rounded-full bg-[#C2884E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#C2884E]">
                {metaRight}
              </span>
            ) : null}
            {tags?.slice(0, 3).map((tag, tagIndex) => (
              <span
                key={tagIndex}
                className="rounded-full bg-[#F5EDE4]/70 px-2 py-0.5 text-[10px] font-medium text-[#6B5F53]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {allergens && allergens.length > 0 ? (
          <div className="mt-2 rounded-lg border border-[#E8D8C7] bg-[#FBF7F2]/70 px-2 py-1 text-[10px] font-medium leading-snug text-[#8A6A4D]">
            <span className="text-[#6B5F53]">{language === "zh" ? "过敏原: " : "Allergens: "}</span>
            {allergens.slice(0, 3).join(" / ")}
          </div>
        ) : null}
      </div>
    </button>
  )
}
