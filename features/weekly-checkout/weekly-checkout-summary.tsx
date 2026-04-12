"use client"

import { CheckCircle2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { CartItem, DeliveryDay } from "@/lib/weekly-subscription"

type WeeklyCheckoutSummaryProps = {
  cart: CartItem[]
  deliveryDays: DeliveryDay[]
  language: "en" | "zh"
  totalItems: number
}

export function WeeklyCheckoutSummary({
  cart,
  deliveryDays,
  language,
  totalItems,
}: WeeklyCheckoutSummaryProps) {
  const cartByDay: Record<string, CartItem[]> = {}

  cart.forEach((item) => {
    const compositeKey = `${item.dayId}-${item.weekOffset ?? 0}`
    if (!cartByDay[compositeKey]) {
      cartByDay[compositeKey] = []
    }
    cartByDay[compositeKey].push(item)
  })

  return (
    <div className="space-y-2">
      <h3 className="mb-4 font-semibold text-[#6B5F53]">
        {language === "zh" ? "已选餐点" : "Selected Meals"}
      </h3>
      <Card className="border-[#C2884E]/20 bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4]">
        <CardContent className="p-6">
          <div className="space-y-4">
            {Object.entries(cartByDay).map(([compositeKey, items]) => {
              const [dayId, weekOffsetStr] = compositeKey.split("-")
              const weekOffset = Number.parseInt(weekOffsetStr, 10)

              return (
                <div key={compositeKey} className="pb-3 last:pb-0">
                  <div className="mb-2 flex items-center font-medium capitalize">
                    <span className="text-[#6B5F53]">
                      {dayId === "sunday"
                        ? language === "zh"
                          ? "周日"
                          : "Sunday"
                        : dayId === "tuesday"
                          ? language === "zh"
                            ? "周二"
                            : "Tuesday"
                          : dayId}
                    </span>
                    {(() => {
                      const matchingDay = deliveryDays.find(
                        (day) => day.id === dayId && day.weekOffset === weekOffset
                      )

                      if (!matchingDay?.date) {
                        return null
                      }

                      return (
                        <span className="ml-2 text-sm text-[#6B5F53]/60">
                          ({matchingDay.date})
                        </span>
                      )
                    })()}
                  </div>

                  <div className="space-y-2">
                    {items.map((item, index) => {
                      let optionName = item.optionId
                      const matchingDay = deliveryDays.find(
                        (day) =>
                          day.id === item.dayId && day.weekOffset === item.weekOffset
                      )

                      if (matchingDay) {
                        const option = matchingDay.options.find(
                          (candidate) => candidate.id === item.optionId
                        )
                        if (option) {
                          optionName =
                            language === "en" && option.nameEn ? option.nameEn : option.name
                        }
                      }

                      return (
                        <div key={index} className="flex justify-between text-sm">
                          <div className="flex flex-1 items-center">
                            <CheckCircle2 className="mr-2 h-4 w-4 flex-shrink-0 text-[#C2884E]" />
                            <span>
                              {optionName}
                              {item.quantity > 1 ? ` x${item.quantity}` : ""}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {Object.keys(cartByDay).length > 1 &&
                    Object.keys(cartByDay).indexOf(compositeKey) <
                      Object.keys(cartByDay).length - 1 && (
                      <div className="mt-3 border-b border-[#C2884E]/20" />
                    )}
                </div>
              )
            })}

            <div className="mt-2 flex justify-between border-t border-[#C2884E]/20 pt-2 font-medium">
              <span>{language === "zh" ? "总计" : "Total"}</span>
              <span>
                {totalItems === 6
                  ? language === "zh"
                    ? "6餐一周: 1张"
                    : "6 meals/week: 1 voucher"
                  : totalItems === 8
                    ? language === "zh"
                      ? "8餐一周: 1张"
                      : "8 meals/week: 1 voucher"
                    : totalItems === 10
                      ? language === "zh"
                        ? "10餐一周: 1张"
                        : "10 meals/week: 1 voucher"
                      : totalItems === 12
                        ? language === "zh"
                          ? "12餐一周: 1张"
                          : "12 meals/week: 1 voucher"
                        : `${totalItems} ${language === "zh" ? "餐" : "meals"}`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
