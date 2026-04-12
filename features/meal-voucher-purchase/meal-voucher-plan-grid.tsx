"use client"

import { motion } from "framer-motion"
import { Calendar, Check, Tag, Utensils } from "lucide-react"

import { Button } from "@/components/ui/button"

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

export function MealVoucherPlanGrid({
  language,
  plans,
  selectedPlanId,
  onSelectPlan,
}: MealVoucherPlanGridProps) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan) => (
        <motion.div
          key={plan.id}
          whileHover={{
            y: -8,
            boxShadow:
              "0 10px 25px -5px rgba(194, 136, 78, 0.1), 0 8px 10px -6px rgba(194, 136, 78, 0.1)",
          }}
          transition={{ duration: 0.3 }}
          className={`group relative flex h-full flex-col overflow-hidden rounded-xl border ${
            selectedPlanId === plan.id
              ? "border-[#C2884E] ring-2 ring-[#C2884E]/30"
              : "border-[#C2884E]/10 hover:border-[#C2884E]/30"
          }`}
        >
          {plan.savings ? (
            <div className="absolute right-0 top-0 z-10 rounded-bl-xl bg-[#F5EDE4] px-3 py-1 text-xs font-medium text-[#C2884E]">
              {plan.savings}
            </div>
          ) : null}

          <div className="relative overflow-hidden bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-5 text-white">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-full bg-white/20 p-1.5">
                  <Utensils className="h-3 w-3" />
                </div>
                <span className="text-sm font-medium opacity-90">
                  {plan.type === "twoDish"
                    ? language === "zh"
                      ? "每餐2菜"
                      : "2-Dish Meal"
                    : language === "zh"
                      ? "每餐3菜"
                      : "3-Dish Meal"}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-sm opacity-80">
                  / {plan.quantity} {language === "zh" ? "餐券" : "vouchers"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col bg-gradient-to-b from-white to-[#F5EDE4]/20 p-5">
            <div className="mb-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#C2884E]" />
                  <span className="text-sm font-medium text-[#6B5F53]">
                    {language === "zh" ? "餐券数量" : "Vouchers"}
                  </span>
                </div>
                <span className="font-bold text-[#C2884E]">{plan.quantity}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-[#C2884E]" />
                  <span className="text-sm font-medium text-[#6B5F53]">
                    {language === "zh" ? "单价" : "Per meal"}
                  </span>
                </div>
                <span className="font-bold text-[#C2884E]">${plan.pricePerMeal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-4 space-y-2 border-t border-[#C2884E]/10 pt-3">
              {plan.savings ? (
                <div className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C2884E]" />
                  <span className="text-[#6B5F53]">{plan.savings}</span>
                </div>
              ) : null}
              <div className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C2884E]" />
                <span className="text-[#6B5F53]">
                  {language === "zh" ? "可转让" : "Transferable"}
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C2884E]" />
                <span className="text-[#6B5F53]">
                  {language === "zh" ? "有效期半年" : "Valid for 6 months"}
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C2884E]" />
                <span className="text-[#6B5F53]">
                  {language === "zh"
                    ? "购买后7天内可退款未用部分"
                    : "Unused portion refundable within 7 days of purchase"}
                </span>
              </div>
            </div>

            <Button
              className="mt-auto w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white transition-all duration-300 hover:opacity-90"
              onClick={() => onSelectPlan(plan)}
            >
              {language === "zh" ? "选择此套餐" : "Select This Plan"}
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
