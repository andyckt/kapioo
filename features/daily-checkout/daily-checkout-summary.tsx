"use client"

import { CheckCircle2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { CartItem, DayData } from "@/lib/daily-delivery"

type DailyCheckoutSummaryProps = {
  cart: CartItem[]
  days: Record<string, DayData>
  dishTranslations: Record<string, string>
  language: "en" | "zh"
  vouchersNeeded: {
    twoDish: number
    threeDish: number
  }
}

function getChineseDayName(englishDayName: string): string {
  const dayMap: Record<string, string> = {
    monday: "周一",
    tuesday: "周二",
    wednesday: "周三",
    thursday: "周四",
    friday: "周五",
    saturday: "周六",
    sunday: "周日",
  }

  const baseDayName = englishDayName?.toLowerCase()?.split("-")[0]
  return dayMap[baseDayName] || englishDayName || ""
}

function translateComboName(name: string, language: "en" | "zh"): string {
  if (language === "zh") {
    return name
  }
  return name.includes("套餐") ? name.replace(/套餐/g, "Combo") : name
}

function translateDishName(
  dishName: string,
  dishTranslations: Record<string, string>,
  language: "en" | "zh"
) {
  if (language === "zh" || !dishTranslations[dishName]) {
    return dishName
  }
  return dishTranslations[dishName]
}

export function DailyCheckoutSummary({
  cart,
  days,
  dishTranslations,
  language,
  vouchersNeeded,
}: DailyCheckoutSummaryProps) {
  const cartByDay: Record<string, CartItem[]> = {}

  cart.forEach((item) => {
    if (!cartByDay[item.day]) {
      cartByDay[item.day] = []
    }
    cartByDay[item.day].push(item)
  })

  return (
    <div className="space-y-2">
      <h3 className="mb-4 font-semibold text-[#6B5F53]">
        {language === "zh" ? "已选餐点" : "Selected Meals"}
      </h3>
      <Card className="border-[#C2884E]/20 bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4]">
        <CardContent className="p-6">
          <div className="space-y-4">
            {Object.entries(cartByDay).map(([dayId, items]) => (
              <div key={dayId} className="pb-3 last:pb-0">
                <div className="mb-2 flex items-center font-medium capitalize">
                  <span className="text-[#6B5F53]">
                    {language === "zh"
                      ? getChineseDayName(days[dayId]?.displayName || dayId)
                      : days[dayId]?.displayName || dayId}
                  </span>
                  {days[dayId]?.date ? (
                    <span className="ml-2 text-sm text-[#6B5F53]/60">
                      ({days[dayId].date})
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => {
                    const dayData = days[item.day]
                    const combo = dayData?.combos?.find((candidate) => candidate.id === item.comboId)
                    const dishes = combo
                      ? item.type === "A"
                        ? combo.typeA.dishes
                        : combo.typeB.dishes
                      : []

                    return (
                      <div
                        key={index}
                        className="mb-2 rounded-lg border border-[#C2884E]/10 bg-white p-3 shadow-sm"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="mr-2 rounded-full bg-[#F5EDE4] p-1.5">
                              <CheckCircle2 className="h-4 w-4 text-[#C2884E]" />
                            </div>
                            <div>
                              <span className="font-medium text-[#6B5F53]">
                                {translateComboName(item.comboName, language)}
                              </span>
                              <span className="ml-2 text-xs text-[#6B5F53]/60">
                                (
                                {item.type === "A"
                                  ? language === "zh"
                                    ? "2菜"
                                    : "2-Dish"
                                  : language === "zh"
                                    ? "3菜"
                                    : "3-Dish"}
                                )
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className="rounded-full bg-[#F5EDE4] px-2 py-0.5 text-sm font-medium text-[#C2884E]">
                              x{item.quantity}
                            </span>
                          </div>
                        </div>

                        {dishes.length > 0 ? (
                          <div className="mt-1 space-y-1 pl-8">
                            {dishes.map((dish, dishIndex) => (
                              <div key={dishIndex} className="flex items-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-[#C2884E]/40" />
                                <span className="text-xs text-[#6B5F53]">
                                  {translateDishName(dish, dishTranslations, language)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="flex justify-between border-t border-[#C2884E]/20 pt-3 font-medium">
              <span className="text-[#6B5F53]">{language === "zh" ? "总计" : "Total"}</span>
              <div className="flex gap-2 text-[#C2884E]">
                {vouchersNeeded.twoDish > 0 ? (
                  <span>
                    {language === "zh" ? "2菜" : "2-Dish"}: {vouchersNeeded.twoDish}
                  </span>
                ) : null}
                {vouchersNeeded.threeDish > 0 ? (
                  <span>
                    {language === "zh" ? "3菜" : "3-Dish"}: {vouchersNeeded.threeDish}
                  </span>
                ) : null}
                {vouchersNeeded.twoDish === 0 && vouchersNeeded.threeDish === 0 ? <span>0</span> : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
