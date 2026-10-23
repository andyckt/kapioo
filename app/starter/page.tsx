"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { ServiceSelectionCards } from "@/components/service-selection-cards"
import type { ParsedGoogleAddress } from "@/lib/address/types"
import { getStarterAddressSelection, setStarterAddressSelection } from "@/lib/plan-flow-state"
import { resolveServiceability, type ServiceabilityResult } from "@/lib/zones/service-areas"
import "./order-flow.css"

export default function StarterPage() {
  const router = useRouter()
  const { language, setLanguage } = useLanguage()
  const resultRef = useRef<HTMLElement>(null)
  const [addressChosen, setAddressChosen] = useState(false)
  const [streetAddress, setStreetAddress] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null)

  useEffect(() => {
    const saved = getStarterAddressSelection()
    if (!saved) return
    setStreetAddress(saved.streetAddress || "")
    setPostalCode(saved.postalCode)
    setServiceability({
      areaLabel: saved.areaLabel, fsa: saved.fsa, canDaily: saved.canDaily,
      canWeekly: saved.canWeekly, isServed: saved.canDaily || saved.canWeekly,
      coordsMissing: true,
    })
  }, [])

  const handleAddressSelect = (result: ParsedGoogleAddress) => {
    const next = resolveServiceability({
      areaLabel: result.address.province,
      postalCode: result.addressGeo.postalCode || result.address.postalCode,
      lat: result.addressGeo.lat,
      lng: result.addressGeo.lng,
    })
    setStreetAddress(result.address.streetAddress || "")
    setPostalCode(result.addressGeo.postalCode || result.address.postalCode || "")
    setServiceability(next)
    setAddressChosen(true)
  }

  useEffect(() => {
    if (!serviceability || !addressChosen) return
    resultRef.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    })
  }, [serviceability, addressChosen])

  const selectPlan = (plan: "daily" | "weekly") => {
    if (!serviceability) return
    setStarterAddressSelection({
      areaLabel: serviceability.areaLabel,
      postalCode,
      fsa: serviceability.fsa,
      streetAddress: streetAddress || undefined,
      canDaily: serviceability.canDaily,
      canWeekly: serviceability.canWeekly,
    })
    router.push(plan === "daily" ? "/daily-delivery" : "/weekly-meal")
  }

  return <div className="ko-order ko-starter" lang={language === "zh" ? "zh-Hans" : "en"}>
    <header className="ko-header">
      <Link href="/" className="ko-logo" aria-label="Kapioo home">kapioo<span>.</span></Link>
      <div className="ko-header-actions">
        <span className="ko-header-step">{language === "zh" ? "01 / 查询配送" : "01 / Find your meals"}</span>
        <button type="button" onClick={() => setLanguage(language === "en" ? "zh" : "en")} className="ko-language">{language === "en" ? "中文" : "EN"}</button>
      </div>
    </header>
    <main>
      <section className="ko-starter-intro" aria-labelledby="starter-heading">
        <div className="ko-starter-copy">
          <p className="ko-eyebrow">{language === "zh" ? "美味，从这里开始" : "Your Kapioo journey"}</p>
          <h1 id="starter-heading">{language === "zh" ? <>好好吃饭，<em>从你家开始。</em></> : <>Good food, <em>starts here.</em></>}</h1>
          <p className="ko-lead">{language === "zh" ? "输入配送地址，查看你可以选择的每日便当和周次餐盒。" : "Fresh Asian fusion meals, made for real life. Enter your address to see the Daily Bento and Weekly Meal Box options available to you."}</p>
          <div className="ko-address-block">
            <div className="ko-address-label"><MapPin size={19} strokeWidth={1.6} />{language === "zh" ? "你的配送地址" : "Your delivery address"}</div>
            <AddressAutocomplete
              value={streetAddress}
              language={language}
              placeholder={language === "zh" ? "输入街道地址" : "Start typing your street address"}
              onInputChange={(value) => { setStreetAddress(value); setPostalCode(""); setServiceability(null) }}
              onAddressSelect={handleAddressSelect}
            />
            <p className="ko-address-help">{language === "zh" ? "我们会根据地址显示可用计划和配送日期。" : "We’ll show the plans and delivery days available at your address."}</p>
          </div>
          <Link href="/" className="ko-back-link"><ArrowLeft size={17} />{language === "zh" ? "返回首页" : "Back to home"}</Link>
        </div>
        <div className="ko-starter-visual" aria-hidden="true">
          <div className="ko-starter-photo ko-starter-photo-daily"><Image src="/marketing/plan-daily-1280.webp" alt="" fill priority sizes="(max-width: 760px) 50vw, 23vw" /></div>
          <div className="ko-starter-photo ko-starter-photo-weekly"><Image src="/marketing/plan-weekly-1280.webp" alt="" fill priority sizes="(max-width: 760px) 50vw, 23vw" /></div>
          <span className="ko-starter-photo-caption">{language === "zh" ? "为你的每一天，好好做饭。" : "Made for the way you live."}</span>
        </div>
      </section>

      <section ref={resultRef} className="ko-starter-result" aria-live="polite" aria-label={language === "zh" ? "配送结果" : "Delivery availability"}>
        {serviceability?.isServed ? <>
          <div className="ko-result-heading"><p className="ko-eyebrow">{language === "zh" ? "配送到你家" : "Available at your address"}</p><h2>{language === "zh" ? "选一种适合你的节奏。" : <>Choose your <em>kind of good.</em></>}</h2><p>{language === "zh" ? "以下计划可配送到你的地址。" : "These meal plans are available for your location."}</p></div>
          <ServiceSelectionCards variant="linen" showDaily={serviceability.canDaily} showWeekly={serviceability.canWeekly} onSelectDaily={() => selectPlan("daily")} onSelectWeekly={() => selectPlan("weekly")} />
        </> : serviceability ? <div className="ko-unserved"><MapPin size={26} strokeWidth={1.5} /><h2>{language === "zh" ? "暂未配送到这里。" : "We’re not there just yet."}</h2><p>{language === "zh" ? "试试另一个地址。我们正在不断扩大配送范围。" : "Try another address. We’re growing our delivery area and hope to reach you soon."}</p></div> : <div className="ko-before-result"><span aria-hidden="true">01 <ArrowRight size={18} /> 02 <ArrowRight size={18} /> 03</span><p>{language === "zh" ? "输入地址 · 选择计划 · 享用美食" : "Your address · Your meal plan · Your way to eat well"}</p></div>}
      </section>
    </main>
  </div>
}
