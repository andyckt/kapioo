"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollReveal } from "@/components/scroll-reveal"
import { useLanguage } from "@/lib/language-context"

const KITCHEN_PREP_DAWN_IMAGE = "/home-kitchen/kapioo-kitchen-prep-dawn.png"
const KITCHEN_COOKING_STIRFRY_IMAGE = "/home-kitchen/kapioo-kitchen-cooking-stirfry.png"
const KITCHEN_PLATING_PACKAGING_IMAGE = "/home-kitchen/kapioo-kitchen-plating-packaging.png"
const KITCHEN_DELIVERY_IMAGE = "/home-kitchen/kapioo-kitchen-delivery.png"
/** Public URL for the kitchen tour video (required in production deploys). Local dev can use the file in `public/` or set this in `.env.local`. */
const KITCHEN_TOUR_VIDEO_SRC =
  process.env.NEXT_PUBLIC_KITCHEN_TOUR_VIDEO_URL?.trim() || "/home-kitchen/kapioo-kitchen-tour.mp4"

export default function HomeKapiooKitchenSection() {
  const { language } = useLanguage()

  const videoRef = useRef<HTMLVideoElement>(null)
  const videoFrameRef = useRef<HTMLDivElement>(null)
  const videoInViewRef = useRef(false)
  const [videoMuted, setVideoMuted] = useState(true)

  const toggleVideoMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setVideoMuted(video.muted)
  }, [])

  /** Ensures continuous playback while in view if native `loop` is ignored (some mobile browsers). */
  const handleVideoEnded = useCallback(() => {
    const video = videoRef.current
    if (!video || !videoInViewRef.current) return
    video.currentTime = 0
    void video.play().catch(() => {})
  }, [])

  useEffect(() => {
    const video = videoRef.current
    const frame = videoFrameRef.current
    if (!video || !frame) return

    video.loop = true

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        videoInViewRef.current = entry.isIntersecting
        if (entry.isIntersecting) {
          void video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.35, rootMargin: "0px" }
    )
    observer.observe(frame)
    const onVisibility = () => {
      if (document.hidden) {
        video.pause()
      } else if (videoInViewRef.current) {
        void video.play().catch(() => {})
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  /**
   * Vertical scroll snap so this block is harder to flick past. `mandatory` on small screens only
   * (stronger lock); `md` and up use `proximity` (lighter). Off when reduced motion is preferred.
   */
  useEffect(() => {
    const root = document.documentElement
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    const mqMobile = window.matchMedia("(max-width: 767px)")

    const clearSnap = () => {
      root.classList.remove("snap-y", "snap-proximity", "snap-mandatory")
    }

    const sync = () => {
      clearSnap()
      if (mqReduce.matches) return
      root.classList.add("snap-y")
      if (mqMobile.matches) {
        root.classList.add("snap-mandatory")
      } else {
        root.classList.add("snap-proximity")
      }
    }

    sync()
    mqReduce.addEventListener("change", sync)
    mqMobile.addEventListener("change", sync)
    return () => {
      mqReduce.removeEventListener("change", sync)
      mqMobile.removeEventListener("change", sync)
      clearSnap()
    }
  }, [])

  const zh = language === "zh"

  const copy = {
    sectionEyebrow: zh ? "走进 Kapioo 厨房" : "Inside the Kapioo Kitchen",
    headline: zh ? "你的一餐，从每天清晨 5 点开始。" : "Your meal starts at five every morning.",
    lead: zh
      ? "每天清晨，当城市还在慢慢醒来，Kapioo 厨房已经开始备菜、烹饪、摆盘、封装、贴标和配送。我们把每一个步骤认真做好，只为了让你在忙碌的一天里，也能吃上一份热乎、干净、好吃、值得期待的饭。"
      : "While the city is still waking up, Kapioo’s kitchen is already prepping, cooking, plating, sealing, labeling, and getting meals on the route. Every step matters—so during your busiest days you can still heat up something fresh, tidy, flavorful, and worth looking forward to.",
    videoPoster: zh ? "30 秒带你走进 Kapioo 厨房" : "30 seconds inside the Kapioo kitchen",
    process: [
      {
        stepLabel: zh ? "01｜清晨备菜" : "01 · Prep at dawn",
        title: zh ? "新鲜食材，清晨开工" : "Fresh ingredients, early start",
        body: zh
          ? "每天早上 5 点起，我们的团队开始处理当天食材：清洗、切配、腌制、分装，为当天的餐食做好准备。不是提前很多天做好的「库存餐」，而是为你当天的日程认真准备。"
          : "Starting at 5 a.m., our team washes, chops, seasons, and portions that day’s ingredients—ready for cooking. Not leftovers from days ago—in sync with today’s menus.",
        imageHint: zh
          ? "Kapioo 厨房清晨备菜：团队处理新鲜食材。"
          : "Kapioo kitchen at dawn: the team prepping fresh ingredients.",
      },
      {
        stepLabel: zh ? "02｜当天制作" : "02 · Cooked today",
        title: zh ? "当天现做，认真调味" : "Made today, thoughtfully seasoned",
        body: zh
          ? "我们希望 Kapioo 吃起来不像冰冷的「健身餐」，而是一份真正有味道、有温度、可以每天期待的饭。每一道菜都会经过烹饪、调味和出品检查，尽量做到稳定、好吃、不过度油腻。"
          : "We want Kapioo to taste like everyday comfort—not cold “diet food.” Each dish is cooked, seasoned, and checked before it heads out—balanced, craveable, and never needlessly greasy.",
        imageHint: zh
          ? "Kapioo 厨师当天炒制中，灶台热气与整齐备料。"
          : "Kapioo cooks stir-frying to order—with steam rising and mise en place at the station.",
      },
      {
        stepLabel: zh ? "03｜安心包装" : "03 · Careful packing",
        title: zh ? "认真摆盘，安心封装" : "Plated neatly, sealed with care",
        body: zh
          ? "我们相信，一份好饭不只是吃得安心，也应该在打开的那一刻，让你心情变好。"
          : "We believe a good meal should be more than reassuring—it should brighten your mood the moment you open the box.",
        imageHint: zh
          ? "Kapioo 餐盒认真摆盘：不锈钢台面上的分装与点缀。"
          : "Kapioo meals plated in black containers on a stainless counter—with careful garnishing.",
      },
      {
        stepLabel: zh ? "04｜准时送达" : "04 · On-time delivery",
        title: zh ? "从厨房出发，送到你手上" : "From our kitchen to you",
        body: zh
          ? "你不需要临时想吃什么、不需要排队、不需要将就外卖，一到饭点，就有一份认真准备好的餐等你。"
          : "You don’t have to decide last minute, stand in line, or settle for mediocre takeout. When it’s mealtime, something thoughtful is already waiting.",
        imageHint: zh
          ? "Kapioo 品牌餐盒送达：双手递出的外带盒。"
          : "Kapioo branded meal box on delivery—passed to you with care.",
      },
    ] as const,
    closingZh: zh
      ? "我们只想让每一餐，都成为你每天期待的时刻。"
      : "Making every meal a moment to look forward to.",
    closingEnMicro: "Making every meal a moment to look forward to.",
    ctaPrimary: zh ? "看看本周菜单" : "See this week’s menu",
  }

  return (
    <section
      id="kapioo-kitchen"
      className="relative w-full scroll-mt-24 snap-start snap-always motion-reduce:snap-normal overflow-hidden bg-gradient-to-b from-[#FFF9F3] via-[#FBF7F2] to-[#F5EDE4] py-14 md:py-20 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-32 h-72 w-72 rounded-full bg-[#C2884E]/10 blur-3xl" />
        <div className="absolute -right-16 bottom-40 h-80 w-80 rounded-full bg-[#D1A46C]/12 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035] [background-size:28px_28px] [background-image:radial-gradient(#C2884E_1px,transparent_1px)]" />
      </div>

      <div className="container relative z-10 px-4 md:px-6">
        {/* Video (left) · Title + lead (right) */}
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:gap-14">
            <ScrollReveal rootMargin="0px 0px -60px 0px" className="flex flex-col items-center lg:items-stretch">
              <div className="reveal-item relative w-full max-w-[280px] lg:mx-0 lg:max-w-none">
                <div className="relative mx-auto max-w-[280px] lg:mx-0 lg:max-w-[min(100%,280px)]">
                  <div
                    className="pointer-events-none absolute -inset-6 -z-10 rounded-[1.75rem] bg-gradient-to-br from-[#C2884E]/35 via-[#E8D5C4]/25 to-[#D1A46C]/30 blur-3xl"
                    aria-hidden
                  />
                  <div
                    className="relative rounded-2xl bg-gradient-to-br from-[#C2884E]/35 via-[#E8D5C4]/45 to-[#D1A46C]/30 p-[2px] shadow-[0_20px_50px_-18px_rgba(194,136,78,0.45),0_8px_24px_-8px_rgba(63,53,43,0.12),0_0_48px_8px_rgba(194,136,78,0.15)]"
                  >
                    <div
                      ref={videoFrameRef}
                      className="relative overflow-hidden rounded-[14px] bg-[#14110e] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-black/20"
                      style={{ aspectRatio: "9 / 16" }}
                    >
                      <video
                        ref={videoRef}
                        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                        muted
                        playsInline
                        loop
                        preload="metadata"
                        disablePictureInPicture
                        aria-label={copy.videoPoster}
                        onVolumeChange={(e) => setVideoMuted(e.currentTarget.muted)}
                        onEnded={handleVideoEnded}
                      >
                        <source src={KITCHEN_TOUR_VIDEO_SRC} type="video/mp4" />
                      </video>
                      <div
                        className="pointer-events-none absolute inset-0 rounded-[14px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          toggleVideoMute()
                        }}
                        className="absolute bottom-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C2884E]"
                        aria-label={
                          videoMuted
                            ? zh
                              ? "开启声音"
                              : "Unmute video"
                            : zh
                              ? "静音"
                              : "Mute video"
                        }
                      >
                        {videoMuted ? <VolumeX className="h-3.5 w-3.5" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal rootMargin="0px 0px -40px 0px" className="min-w-0">
              <div className="reveal-item text-center lg:text-left">
                <div className="mb-4 inline-flex w-full flex-wrap items-center justify-center gap-2 lg:justify-start">
                  <span className="hidden h-px w-8 bg-gradient-to-r from-transparent to-[#C2884E]/40 sm:block" />
                  <span className="rounded-full bg-white/80 px-4 py-1 text-sm font-medium text-[#C2884E] shadow-sm ring-1 ring-[#C2884E]/10">
                    {copy.sectionEyebrow}
                  </span>
                  <span className="hidden h-px w-8 bg-gradient-to-l from-transparent to-[#C2884E]/40 sm:block" />
                </div>
                <h2 className="text-3xl font-bold leading-tight text-[#3f352b] md:text-4xl xl:text-5xl">
                  {copy.headline}
                </h2>
                <p className="mt-5 text-base leading-relaxed text-[#6B5F53] md:text-lg">
                  {copy.lead}
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* Four steps: full width below—same reading edge as intro, tighter vertical rhythm */}
        <div className="mx-auto mt-16 max-w-5xl space-y-10 md:mt-12 md:space-y-11 lg:mt-14 lg:space-y-12">
          {copy.process.map((step, idx) => {
            const reversed = idx % 2 === 1
            return (
              <ScrollReveal key={step.stepLabel} rootMargin="0px 0px -48px 0px">
                <article
                  className={`reveal-item flex flex-col gap-6 md:flex-row md:items-center md:gap-9 lg:gap-10 ${
                    reversed ? "md:flex-row-reverse" : ""
                  }`}
                >
                  <div className="relative w-full shrink-0 md:w-[42%] lg:w-[40%]">
                    <div
                      className="relative overflow-hidden rounded-2xl border border-[#C2884E]/12 shadow-md ring-1 ring-white/60"
                      style={{ aspectRatio: "4 / 3" }}
                    >
                      {idx === 0 ? (
                        <Image
                          src={KITCHEN_PREP_DAWN_IMAGE}
                          alt={
                            zh
                              ? "Kapioo 厨房团队清晨备菜，不锈钢操作台与新鲜食材"
                              : "Kapioo kitchen team prepping fresh ingredients at stainless prep stations"
                          }
                          fill
                          className="object-cover object-center"
                          sizes="(max-width: 768px) 100vw, 42vw"
                        />
                      ) : idx === 1 ? (
                        <Image
                          src={KITCHEN_COOKING_STIRFRY_IMAGE}
                          alt={
                            zh
                              ? "Kapioo 厨房当天炒制，大锅快炒与升腾热气"
                              : "Kapioo chef stir-frying in a commercial wok with steam rising"
                          }
                          fill
                          className="object-cover object-center"
                          sizes="(max-width: 768px) 100vw, 42vw"
                        />
                      ) : idx === 2 ? (
                        <Image
                          src={KITCHEN_PLATING_PACKAGING_IMAGE}
                          alt={
                            zh
                              ? "Kapioo 厨房认真摆盘，餐盒分装与点缀细节"
                              : "Kapioo team plating meals in containers on a stainless counter, garnishing with care"
                          }
                          fill
                          className="object-cover object-center"
                          sizes="(max-width: 768px) 100vw, 42vw"
                        />
                      ) : (
                        <Image
                          src={KITCHEN_DELIVERY_IMAGE}
                          alt={
                            zh
                              ? "双手递出 Kapioo 品牌餐盒，外带配送"
                              : "Hands presenting a white Kapioo branded meal box for delivery"
                          }
                          fill
                          className="object-cover object-center"
                          sizes="(max-width: 768px) 100vw, 42vw"
                        />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2 md:space-y-3">
                    <p className="text-sm font-semibold tracking-wide text-[#C2884E]/90">{step.stepLabel}</p>
                    <h3 className="text-xl font-bold text-[#3f352b] md:text-2xl">{step.title}</h3>
                    <p className="text-[15px] leading-relaxed text-[#6B5F53] md:text-base">{step.body}</p>
                  </div>
                </article>
              </ScrollReveal>
            )
          })}
        </div>

        {/* Closing + CTAs */}
        <ScrollReveal className="mx-auto mt-12 max-w-3xl text-center md:mt-14">
          <div className="reveal-item relative rounded-2xl border border-[#C2884E]/15 bg-white/65 px-6 py-10 shadow-sm backdrop-blur-sm md:px-10">
            <div className="pointer-events-none absolute left-8 top-0 h-1 w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]" />
            <blockquote className="text-lg font-medium leading-relaxed text-[#5c4f42] md:text-xl">
              {copy.closingZh}
            </blockquote>
            {zh ? (
              <p className="mt-4 text-sm italic text-[#8A7968]" lang="en">
                {copy.closingEnMicro}
              </p>
            ) : null}
            <div className="mt-8 flex justify-center">
              <Button
                asChild
                size="lg"
                className="rounded-xl bg-gradient-to-r from-[#C2884E] to-[#D1A46C] px-8 text-white shadow-lg shadow-[#C2884E]/18 hover:opacity-[0.96]"
              >
                <Link href="/starter">{copy.ctaPrimary}</Link>
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
