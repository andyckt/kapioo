"use client"

export type VoucherPlanCard = {
  id: string
  type: "twoDish" | "threeDish"
  quantity: number
  price: number
  pricePerMeal: number
  savings?: string
}

type MealVoucherPlanGridProps = {
  language: "en" | "zh"
  plans: VoucherPlanCard[]
  selectedPlanId?: string | null
  onSelectPlan: (plan: VoucherPlanCard) => void
}

export function MealVoucherPlanGrid({ language, plans, selectedPlanId, onSelectPlan }: MealVoucherPlanGridProps) {
  const zh = language === "zh"
  return <div className="kp-purchase-plan-grid">
    {plans.map((plan) => {
      const selected = selectedPlanId === plan.id
      return <article key={plan.id} className="kp-purchase-plan" data-selected={selected || undefined}>
        <div className="kp-purchase-plan-top">
          <div className="kp-purchase-plan-eyebrow">
            <span>{plan.type === "twoDish" ? (zh ? "每餐 2 菜" : "2-DISH MEAL") : (zh ? "每餐 3 菜" : "3-DISH MEAL")}</span>
            {plan.savings && <span className="kp-purchase-plan-tag">{plan.savings}</span>}
          </div>
          <p className="kp-purchase-plan-price"><strong>${plan.price}</strong><span> / {plan.quantity} {zh ? "张餐券" : "vouchers"}</span></p>
          <p className="kp-purchase-plan-unit">${plan.pricePerMeal.toFixed(2)} {zh ? "每餐" : "per meal"}</p>
        </div>
        <div className="kp-purchase-plan-bottom">
          <p>{zh ? "随时兑换想吃的餐食" : "Redeem on the days you want"}</p>
          <ul>
            <li>{zh ? "可转让" : "Transferable"}</li>
            <li>{zh ? "有效期 6 个月" : "Valid for 6 months"}</li>
            <li>{zh ? "购买后 7 天内，未用部分可退款" : "Unused portion refundable within 7 days"}</li>
          </ul>
          <button type="button" className="kp-purchase-primary" onClick={() => onSelectPlan(plan)}>
            {zh ? "选择此套餐" : "Choose this pack"}<span aria-hidden="true">↗</span>
          </button>
        </div>
      </article>
    })}
  </div>
}
