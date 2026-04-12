"use client"

import { motion } from "framer-motion"
import { Calendar, Check, ChevronLeft, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

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

export function CreditPlanSelectStep({
  filteredPlans,
  getDeliveryFee,
  language,
  onBack,
  onSelectPlan,
  selectedMealsPerWeek,
  userRegion,
}: CreditPlanSelectStepProps) {
  return (
    <motion.div
      key="plan-selection"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 p-0 text-[#8A7968] hover:bg-transparent hover:text-[#6B5F53]"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" />
          {language === "zh" ? "返回选择餐数" : "Back to meal selection"}
        </Button>

        <h3 className="text-lg font-medium text-[#6B5F53]">
          {selectedMealsPerWeek} {language === "zh" ? "餐/周" : "meals/week"}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredPlans.map((plan) => (
          <Card
            key={plan.id}
            className={`flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-md ${
              plan.isPopular || plan.isRecommended ? "border-[#C2884E]" : "border-[#E5D6BC]"
            }`}
          >
            <div className="relative flex flex-1 flex-col">
              {plan.isPopular || plan.isRecommended ? (
                <div className="absolute left-0 right-0 top-0 bg-[#C2884E] py-1.5 text-center text-sm font-medium text-white">
                  {language === "zh" ? plan.tagZh : plan.tag}
                </div>
              ) : null}

              <CardHeader className={plan.isPopular || plan.isRecommended ? "pt-10" : "pt-6"}>
                <CardTitle className="text-center text-xl text-[#6B5F53]">
                  {language === "zh" ? plan.durationLabelZh : plan.durationLabel}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#C2884E]">${plan.totalPrice}</div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-[#C2884E]" />
                      <span className="text-sm font-medium text-[#6B5F53]">
                        {language === "zh" ? "餐数/周" : "Meals/week"}
                      </span>
                    </div>
                    <span className="font-bold text-[#C2884E]">{plan.mealsPerWeek}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-[#C2884E]" />
                      <span className="text-sm font-medium text-[#6B5F53]">
                        {language === "zh" ? "单价" : "Per meal"}
                      </span>
                    </div>
                    <span className="font-bold text-[#C2884E]">${plan.pricePerMeal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-[#C2884E]/10 pt-3">
                  {plan.duration !== 1 ? (
                    <div className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C2884E]" />
                      <span className="text-[#6B5F53]">
                        {language === "zh"
                          ? "非连续使用 | 用1周扣1周"
                          : "Use Week-by-Week | Pause & Resume Anytime"}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C2884E]" />
                    <span className="text-[#6B5F53]">
                      {language === "zh" ? "有效期半年" : "Valid for 6 months"}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  onClick={() => onSelectPlan(plan)}
                  className="w-full rounded-xl bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90"
                >
                  {language === "zh" ? "选择此套餐" : "Select This Plan"}
                </Button>
              </CardFooter>
            </div>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border border-[#E5D6BC] bg-[#F9F3EC] p-4 text-center">
        <span className="text-[#8A7968]">
          {language === "zh" ? "配送费/周 (2次配送)" : "Delivery fee/week (2 deliveries)"}:
        </span>
        <span className="ml-2 font-medium text-[#6B5F53]">${getDeliveryFee(userRegion || "")}</span>
        <span className="ml-1 text-[#8A7968]">(Hamilton/Burlington: $15.99)</span>
      </div>
    </motion.div>
  )
}
