"use client"

type CreditMealCountStepProps = {
  language: "en" | "zh"
  onSelectMealCount: (mealCount: 6 | 8 | 10 | 12 | 16) => void
}

const MEAL_COUNTS: Array<6 | 8 | 10 | 12 | 16> = [6, 8, 10, 12, 16]

export function CreditMealCountStep({ language, onSelectMealCount }: CreditMealCountStepProps) {
  const zh = language === "zh"
  return <section className="kp-weekly-step" aria-labelledby="weekly-count-title">
    <div className="kp-weekly-step-heading">
      <p className="kp-overline">{zh ? "第一步 · 选择餐数" : "STEP 01 · CHOOSE YOUR MEALS"}</p>
      <h2 id="weekly-count-title">{zh ? "每周想要多少餐？" : "How many meals each week?"}</h2>
      <p>{zh ? "选择适合你生活节奏的餐数。接下来再选想购买的周数。" : "Choose the number that fits your routine. You’ll choose how many weeks to buy next."}</p>
    </div>
    <div className="kp-weekly-count-grid">
      {MEAL_COUNTS.map(value => <button key={value} type="button" className="kp-weekly-count" onClick={() => onSelectMealCount(value)} aria-label={zh ? `选择每周 ${value} 餐` : `Choose ${value} meals per week`}>
        {value === 8 && <span className="kp-weekly-count-tag">{zh ? "热门选择" : "Popular"}</span>}
        <strong>{value}</strong><span>{zh ? "餐 / 周" : "meals / week"}</span>
      </button>)}
    </div>
    <div className="kp-weekly-benefits" aria-label={zh ? "餐券权益" : "Voucher benefits"}>
      <span>{zh ? "餐券可转让" : "Transferable vouchers"}</span>
      <span>{zh ? "有效期 6 个月" : "Valid for 6 months"}</span>
      <span>{zh ? "购买后 7 天内，未用部分可退款" : "Unused portion refundable within 7 days of purchase"}</span>
    </div>
  </section>
}
