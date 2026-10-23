"use client"

import { useLanguage } from "@/lib/language-context"
import { KapiooIcon, type KapiooIconName } from "@/features/marketing-home/kapioo-icons"

const steps: Record<"daily" | "weekly", Record<"en" | "zh", { icon: KapiooIconName; title: string; description: string }[]>> = {
  daily: {
    en: [
      { icon: "choice", title: "Buy meal vouchers", description: "Choose a 2- or 3-dish pack. Your vouchers stay in your account." },
      { icon: "calendar", title: "Pick your lunch days", description: "Browse the changing menu and redeem only on the days you want." },
      { icon: "delivery", title: "Enjoy a fresh lunch", description: "We cook, pack and deliver between 11 AM and 1 PM." },
    ],
    zh: [
      { icon: "choice", title: "购买餐券", description: "选择 2 菜或 3 菜套餐，餐券保存在账户中。" },
      { icon: "calendar", title: "挑选午餐日期", description: "浏览更新的菜单，只在想吃的日子兑换。" },
      { icon: "delivery", title: "享用新鲜午餐", description: "我们现做、装盒，并在上午 11 点至下午 1 点送达。" },
    ],
  },
  weekly: {
    en: [
      { icon: "choice", title: "Choose your week", description: "Select 6–16 meals per week and a voucher pack that fits your rhythm." },
      { icon: "calendar", title: "Redeem when ready", description: "Choose your meals for an available week. Pause between weeks." },
      { icon: "heat", title: "Fill the fridge", description: "Two evening deliveries each week. Refrigerate, heat and enjoy." },
    ],
    zh: [
      { icon: "choice", title: "选择每周餐数", description: "每周选 6–16 份，再选适合自己节奏的餐券套餐。" },
      { icon: "calendar", title: "想用再兑换", description: "为可用周次挑选餐食，两次兑换之间可以暂停。" },
      { icon: "heat", title: "装满冰箱", description: "每周两次晚间配送，冷藏、加热、享用。" },
    ],
  },
}

export function ProductJourney({ kind }: { kind: "daily" | "weekly" }) {
  const { language } = useLanguage()
  return <section className="ko-product-journey" aria-label={language === "zh" ? "订餐步骤" : "How ordering works"}>
    <div className="ko-product-journey-heading"><p className="ko-eyebrow">{language === "zh" ? "简单三步" : "The simple way to eat well"}</p><h2>{language === "zh" ? "按自己的节奏，好好吃饭。" : <>Good food, <em>on your terms.</em></>}</h2></div>
    <div className="ko-product-journey-grid">{steps[kind][language === "zh" ? "zh" : "en"].map((step, index) => <article key={step.title}><div className="ko-product-journey-icon"><KapiooIcon name={step.icon} size={32} /><span>0{index + 1}</span></div><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
  </section>
}
