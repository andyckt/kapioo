"use client"

import Link from "next/link"
import { ArrowUpRight, Globe, Instagram } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { SocialMediaLeadLanguageGate } from "@/components/social-media-lead-language-gate"
import "./social-media.css"

const instagram = "https://www.instagram.com/kapioo_official/?igsh=NzR3cWF0YWU5cjZk"
const rednote = "https://www.xiaohongshu.com/user/profile/66ad59e5000000001d0303d8?xsec_token=ABdcazfEV_I7ZnKK-qYVq8RyEXTqmw8Dtv2AguBABFh6w=&xsec_source=pc_search"

export default function SocialMediaPage() {
  const { language, chooseLanguage } = useLanguage()
  const zh = language === "zh"
  const links = [
    { href: "/", label: zh ? "浏览网站" : "Explore our website", detail: zh ? "看看菜单、餐食计划与配送范围" : "Meals, plans and where we deliver", icon: <Globe size={25} strokeWidth={1.5} />, external: false },
    { href: instagram, label: "Instagram", detail: zh ? "看看我们的日常" : "A look at life around the table", icon: <Instagram size={25} strokeWidth={1.5} />, external: true },
    { href: rednote, label: zh ? "小红书" : "Rednote", detail: zh ? "更多餐食与灵感" : "More meals and little moments", icon: <span className="kp-social-rednote" aria-hidden="true">小红书</span>, external: true },
  ]

  return (
    <main className="kp-social" lang={zh ? "zh-Hans" : "en"}>
      <SocialMediaLeadLanguageGate />
      <header className="kp-social-header">
        <Link href="/" className="kp-social-brand" aria-label="Kapioo home">kapioo<span>.</span></Link>
        <button type="button" onClick={() => chooseLanguage(zh ? "en" : "zh")} aria-label={zh ? "Switch to English" : "切换为中文"}>{zh ? "EN" : "中文"}</button>
      </header>
      <div className="kp-social-inner">
        <div className="kp-social-lead">
          <p className="kp-social-eyebrow">{zh ? "好好吃饭，随你安排" : "GOOD FOOD. YOUR RHYTHM."}</p>
          <h1>{zh ? <>今天，<em>吃点好的。</em></> : <>Let&apos;s eat <em>well.</em></>}</h1>
          <p>{zh ? "新鲜现做的亚洲融合餐食，送到你身边。想了解 Kapioo？从这里开始。" : "Freshly made Asian fusion meals delivered across Toronto and the GTA. Come get to know Kapioo."}</p>
        </div>
        <div className="kp-social-links" aria-label={zh ? "Kapioo 链接" : "Kapioo links"}>
          {links.map((item, index) => (
            <Link key={item.href} href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noopener noreferrer" : undefined} className="kp-social-link">
              <span className="kp-social-number">0{index + 1}</span>
              <span className="kp-social-icon">{item.icon}</span>
              <span className="kp-social-link-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
              <ArrowUpRight className="kp-social-arrow" size={22} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          ))}
        </div>
        <Link href="/starter" className="kp-social-cta">{zh ? "查看我可以选择的餐食" : "See what’s available to me"}<ArrowUpRight size={19} strokeWidth={1.6} /></Link>
      </div>
      <footer className="kp-social-footer">{zh ? "Kapioo · 多伦多及 GTA" : "Kapioo · Toronto & the GTA"}</footer>
    </main>
  )
}
