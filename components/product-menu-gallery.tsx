"use client"

import { useState } from "react"
import { ArrowUpRight } from "lucide-react"

export type ProductMenuGalleryItem = {
  id: string
  imageUrl: string
  title: string
  eyebrow: string
  groupId?: string
  onSelect?: () => void
}

type ProductMenuGalleryProps = {
  kind: "daily" | "weekly"
  language: "en" | "zh"
  items: ProductMenuGalleryItem[]
  loading: boolean
  onViewMenu: () => void
}

const samplePhotos = {
  daily: [
    { imageUrl: "/marketing/chinese-1280.webp", en: "Chinese-inspired", zh: "中式灵感" },
    { imageUrl: "/marketing/thai-1280.webp", en: "Thai-inspired", zh: "泰式灵感" },
    { imageUrl: "/marketing/korean-1280.webp", en: "Korean-inspired", zh: "韩式灵感" },
    { imageUrl: "/marketing/plan-daily-1280.webp", en: "Freshly cooked bentos", zh: "新鲜现做便当" },
  ],
  weekly: [
    { imageUrl: "/marketing/plan-weekly-1280.webp", en: "Meals for the week", zh: "一周好餐" },
    { imageUrl: "/marketing/korean-1280.webp", en: "Korean-inspired", zh: "韩式灵感" },
    { imageUrl: "/marketing/thai-1280.webp", en: "Thai-inspired", zh: "泰式灵感" },
    { imageUrl: "/marketing/weekly-1280.webp", en: "Ready when you are", zh: "随时享用" },
  ],
} as const

function GalleryPhoto({ item, index, language }: { item: ProductMenuGalleryItem; index: number; language: "en" | "zh" }) {
  const [broken, setBroken] = useState(false)
  const [photoRatio, setPhotoRatio] = useState(16 / 9)
  const content = (
    <>
      <div className="ko-gallery-image" style={{ aspectRatio: photoRatio }}>
        {broken ? (
          <span className="ko-gallery-image-fallback">{language === "zh" ? "图片即将更新" : "Photo coming soon"}</span>
        ) : (
          // Menu photos may come from our upload CDN, so use their published URL directly.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            decoding="async"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget
              if (naturalWidth && naturalHeight) setPhotoRatio(naturalWidth / naturalHeight)
            }}
            onError={() => setBroken(true)}
          />
        )}
      </div>
      <div className="ko-gallery-caption">
        <span className="ko-gallery-index">{String(index + 1).padStart(2, "0")}</span>
        <div>
          <span className="ko-gallery-caption-eyebrow">{item.eyebrow}</span>
          <h3>{item.title}</h3>
        </div>
        {item.onSelect ? <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" /> : null}
      </div>
    </>
  )

  return item.onSelect ? (
    <button type="button" className="ko-gallery-card ko-gallery-card-action" onClick={item.onSelect} aria-label={`${language === "zh" ? "查看包含以下餐食的菜单" : "View menu featuring"} ${item.title}`}>
      {content}
    </button>
  ) : (
    <article className="ko-gallery-card">{content}</article>
  )
}

export function ProductMenuGallery({ kind, language, items, loading, onViewMenu }: ProductMenuGalleryProps) {
  const isZh = language === "zh"
  const uniqueItems = items.filter((item, index, all) =>
    all.findIndex((candidate) => candidate.imageUrl === item.imageUrl) === index
  )
  // Spread the preview across delivery days, so one day's menu cannot dominate the gallery.
  const groups = new Map<string, ProductMenuGalleryItem[]>()
  uniqueItems.forEach((item) => {
    const key = item.groupId || item.id
    groups.set(key, [...(groups.get(key) || []), item])
  })
  const liveItems: ProductMenuGalleryItem[] = []
  while (liveItems.length < 4 && [...groups.values()].some((group) => group.length > 0)) {
    groups.forEach((group) => {
      if (liveItems.length < 4 && group.length > 0) liveItems.push(group.shift()!)
    })
  }
  const photos = liveItems.length > 0
    ? [...liveItems, ...samplePhotos[kind]
        .filter((photo) => !liveItems.some((item) => item.imageUrl === photo.imageUrl))
        .map((photo, index) => ({
          id: `sample-${kind}-${index}`,
          imageUrl: photo.imageUrl,
          title: isZh ? photo.zh : photo.en,
          eyebrow: isZh ? "Kapioo 餐食" : "From our kitchen",
        }))].slice(0, 4)
    : samplePhotos[kind].map((photo, index) => ({
        id: `sample-${kind}-${index}`,
        imageUrl: photo.imageUrl,
        title: isZh ? photo.zh : photo.en,
        eyebrow: isZh ? "Kapioo 餐食" : "From our kitchen",
      }))

  return (
    <section className="ko-gallery" id="menu-gallery" aria-labelledby={`${kind}-gallery-title`}>
      <div className="ko-gallery-heading">
        <div>
          <p className="ko-eyebrow">{isZh ? "看看餐食" : "A look at the menu"}</p>
          <h2 id={`${kind}-gallery-title`}>
            {kind === "daily"
              ? (isZh ? <>午餐，<em>每天有新意。</em></> : <>Meet your <em>next lunch.</em></>)
              : (isZh ? <>一周好餐，<em>随心选择。</em></> : <>A week of <em>good choices.</em></>)}
          </h2>
        </div>
        <div className="ko-gallery-heading-side">
          <p>{isZh
            ? "菜单定期更新。先看看我们做的餐食，再到完整菜单挑选喜欢的味道。"
            : "Our menu changes regularly. Take a look at what we make, then explore the current choices."}</p>
          <button type="button" onClick={onViewMenu} className="ko-gallery-link">
            {isZh ? "查看完整菜单" : "View the full menu"}<ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="ko-gallery-rail" aria-busy={loading}>
        {loading ? Array.from({ length: 4 }, (_, index) => (
          <div className="ko-gallery-card ko-gallery-skeleton" key={index} aria-hidden="true">
            <div className="ko-gallery-image" /><div className="ko-gallery-caption" />
          </div>
        )) : photos.map((item, index) => <GalleryPhoto key={item.id} item={item} index={index} language={language} />)}
      </div>
      {!loading && liveItems.length < 4 ? <p className="ko-gallery-footnote">{isZh
        ? "图片展示 Kapioo 餐食；具体供应以当期菜单为准。"
        : "Photographs show Kapioo meals. Availability varies with the current menu."}</p> : null}
    </section>
  )
}
