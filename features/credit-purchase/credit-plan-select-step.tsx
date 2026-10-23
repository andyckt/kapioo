"use client"

export type CreditPlanOption = {
  id: string
  duration: 1 | 2 | 4 | 8
  durationLabel: string
  durationLabelZh: string
  mealsPerWeek: 6 | 8 | 10 | 12 | 16
  totalPrice: number
  pricePerMeal: number
  isPopular?: boolean
  isRecommended?: boolean
  tag?: string
  tagZh?: string
}

type CreditPlanSelectStepProps = {
  filteredPlans: CreditPlanOption[]
  getDeliveryFee: (region: string) => number
  language: "en" | "zh"
  onBack: () => void
  onSelectPlan: (plan: CreditPlanOption) => void
  selectedMealsPerWeek: 6 | 8 | 10 | 12 | 16
  userRegion: string
}

export function CreditPlanSelectStep({ filteredPlans, getDeliveryFee, language, onBack, onSelectPlan, selectedMealsPerWeek, userRegion }: CreditPlanSelectStepProps) {
  const zh = language === "zh"
  return <section className="kp-weekly-step" aria-labelledby="weekly-plan-title">
    <button type="button" className="kp-weekly-back" onClick={onBack}><span aria-hidden="true">←</span>{zh ? "返回选择每周餐数" : "Change meals per week"}</button>
    <div className="kp-weekly-step-heading">
      <p className="kp-overline">{zh ? `第二步 · 每周 ${selectedMealsPerWeek} 餐` : `STEP 02 · ${selectedMealsPerWeek} MEALS PER WEEK`}</p>
      <h2 id="weekly-plan-title">{zh ? "选择购买周数。" : "Choose your weeks."}</h2>
      <p>{zh ? "每使用一周，才扣除一周餐券。无需连续使用。" : "Redeem one week when you’re ready. Your weeks don’t need to run consecutively."}</p>
    </div>
    <div className="kp-weekly-plan-grid">
      {filteredPlans.map(plan => <article key={plan.id} className="kp-purchase-plan">
        <div className="kp-purchase-plan-top">
          <div className="kp-purchase-plan-eyebrow"><span>{zh ? "周次 MEAL BOX" : "WEEKLY MEAL BOX"}</span>{(plan.isPopular || plan.isRecommended) && <span className="kp-purchase-plan-tag">{zh ? plan.tagZh : plan.tag}</span>}</div>
          <p className="kp-purchase-plan-price"><strong>{zh ? plan.durationLabelZh : plan.durationLabel}</strong></p>
          <p className="kp-purchase-plan-unit">{selectedMealsPerWeek} {zh ? "餐 / 周" : "meals per week"}</p>
        </div>
        <div className="kp-purchase-plan-bottom">
          <p className="kp-weekly-plan-price">${plan.totalPrice}</p>
          <ul>
            <li>${plan.pricePerMeal.toFixed(2)} {zh ? "每餐" : "per meal"}</li>
            <li>{zh ? "按需兑换，无需连续使用" : "Redeem weeks on your schedule"}</li>
            <li>{zh ? "有效期 6 个月" : "Valid for 6 months"}</li>
          </ul>
          <button type="button" className="kp-purchase-primary" onClick={() => onSelectPlan(plan)}>{zh ? "选择此套餐" : "Choose this plan"}<span aria-hidden="true">↗</span></button>
        </div>
      </article>)}
    </div>
    <p className="kp-weekly-plan-delivery">{zh ? `配送费：每周 $${getDeliveryFee(userRegion || "").toFixed(2)}，包含 2 次配送。结账时显示含税总额。` : `Delivery: $${getDeliveryFee(userRegion || "").toFixed(2)} per week for two deliveries. Your tax-inclusive total is shown at checkout.`}</p>
  </section>
}
