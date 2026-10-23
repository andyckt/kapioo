"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { homeCopy } from "@/features/marketing-home/content"
import { Navigation } from "@/features/marketing-home/marketing-home"
import "./referral.css"

export default function ReferralPage() {
  const { language } = useLanguage()
  const zh = language === "zh"

  return (
    <div className="kapioo-home kp-referral-paused" lang={zh ? "zh-Hans" : "en"}>
      <Navigation copy={zh ? homeCopy.zh : homeCopy.en} homeHref="/" sectionPrefix="/" />
      <main className="kp-referral-main">
        <div className="kp-referral-copy">
          <p className="kh-eyebrow">{zh ? "Kapioo 推荐计划" : "The Kapioo referral program"}</p>
          <h1>{zh ? <>暂时休息，<br /><em>好饭照常。</em></> : <>Taking a pause.<br /><em>Good food continues.</em></>}</h1>
          <p className="kp-referral-description">
            {zh
              ? "我们的推荐活动目前暂停。感谢你愿意把 Kapioo 分享给朋友；如果活动重新开放，我们会在这里公布。"
              : "Our referral offer is currently paused. Thank you for sharing Kapioo with the people in your life. We’ll post any future update here."}
          </p>
          <div className="kp-referral-actions">
            <Link href="/starter" className="kh-button" prefetch={false}>
              {zh ? "查看配送选项" : "Explore meal delivery"}<ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/" className="kh-text-link">
              {zh ? "返回首页" : "Back to home"}<ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="kp-referral-side" aria-hidden="true">
          <span className="kp-referral-ring" />
          {/* The mascot is a quiet illustration here, rather than a promotion. */}
          <Image src="/mascot/kapioo-mascot-photo-bento-camera.png" alt="" width={1024} height={1024} />
        </div>
      </main>
    </div>
  )
}
