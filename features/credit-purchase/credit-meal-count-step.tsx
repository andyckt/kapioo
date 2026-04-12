"use client"

import { motion } from "framer-motion"

import { Card, CardContent } from "@/components/ui/card"

type CreditMealCountStepProps = {
  language: "en" | "zh"
  onSelectMealCount: (mealCount: 6 | 8 | 10 | 12 | 16) => void
}

const MEAL_COUNTS: Array<{ value: 6 | 8 | 10 | 12 | 16; recommended?: boolean }> = [
  { value: 6 },
  { value: 8, recommended: true },
  { value: 10 },
  { value: 12 },
  { value: 16 },
]

export function CreditMealCountStep({
  language,
  onSelectMealCount,
}: CreditMealCountStepProps) {
  return (
    <motion.div
      key="meal-count-selection"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <h3 className="mb-4 text-center text-lg font-medium text-[#6B5F53]">
        {language === "zh" ? "请选择每周餐数" : "Please select meals per week"}
      </h3>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {MEAL_COUNTS.map(({ value, recommended }) => (
          <div key={value} className={recommended ? "relative" : undefined}>
            <Card
              className={`cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-md ${
                recommended
                  ? "border-[#C2884E]"
                  : "border-[#E5D6BC] hover:border-[#C2884E]"
              }`}
              onClick={() => onSelectMealCount(value)}
            >
              <CardContent className="p-6 text-center">
                <h3 className="mb-2 text-2xl font-bold text-[#6B5F53]">{value}</h3>
                <p className="text-sm text-[#8A7968]">
                  {language === "zh" ? "餐/周" : "meals/week"}
                </p>
              </CardContent>
            </Card>
            {recommended ? (
              <div className="absolute -top-3 left-0 right-0 flex justify-center">
                <span className="rounded-full bg-[#C2884E] px-3 py-1 text-xs text-white shadow-sm">
                  {language === "zh" ? "最推荐" : "Most Recommended"}
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-1 text-xs text-[#8A7968]">
        <p>
          *{" "}
          {language === "zh"
            ? "餐券卡有效期为半年，可转赠亲友，购买后7天内可退款未用部分"
            : "Credits valid for 6 months, transferable, unused portion refundable within 7 days of purchase"}
        </p>
        <p>
          *{" "}
          {language === "zh"
            ? "以上均为税前价格，支付方式：EMT"
            : "All prices before tax, payment method: EMT"}
        </p>
      </div>
    </motion.div>
  )
}
