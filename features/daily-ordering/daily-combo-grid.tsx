"use client"

import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { ComboItem, DayData } from "@/lib/daily-delivery"

type DailyComboGridProps = {
  addToCart: (day: string, date: string, combo: ComboItem, type: "A" | "B") => void
  dayWarning: string | null
  days: Record<string, DayData>
  getQuantityInCart: (day: string, comboId: string, type: "A" | "B") => number
  isDayUnavailable: (day: string) => { unavailable: boolean; reason: string }
  language: "en" | "zh"
  removeFromCart: (day: string, combo: ComboItem, type: "A" | "B") => void
  selectedDay: string
  toChineseDayName: (englishDayName: string) => string
  translateComboName: (name: string) => string
  translateDishName: (name: string) => string
}

export function DailyComboGrid({
  addToCart,
  dayWarning,
  days,
  getQuantityInCart,
  isDayUnavailable,
  language,
  removeFromCart,
  selectedDay,
  toChineseDayName,
  translateComboName,
  translateDishName,
}: DailyComboGridProps) {
  const accentGradient = "from-[#C2884E] to-[#D1A46C]"

  if (!days[selectedDay]) {
    return null
  }

  const selectedDayData = days[selectedDay]
  const unavailableState = isDayUnavailable(selectedDay)

  return (
    <div className="relative pb-8 transition-all duration-300 ease-out">
      <div className="relative mb-6 hidden text-center md:block">
        <div className="inline-block">
          <div className="flex items-center justify-center gap-2">
            <h3 className="mb-1 text-2xl font-medium capitalize tracking-wide text-[#6B5F53]">
              {language === "zh" ? toChineseDayName(selectedDayData.displayName) : selectedDayData.displayName}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                selectedDayData.week === 1
                  ? "bg-[#F5EDE4] text-[#C2884E]"
                  : "bg-[#E4F0F5] text-[#4E88C2]"
              }`}
            >
              {selectedDayData.week === 1
                ? language === "zh"
                  ? "本周"
                  : "This Week"
                : language === "zh"
                  ? "下周"
                  : "Next Week"}
            </span>
          </div>
          <div className="mx-auto mb-2 h-px w-8 bg-[#C2884E]/10" />
          <p className="text-xs font-light tracking-wider text-[#6B5F53]/60">{selectedDayData.date}</p>
        </div>
      </div>

      <div className="mb-6 border-l-2 border-[#C2884E] pl-3 text-left">
        <h4 className="mb-1 text-xs font-bold text-[#C2884E]">
          {language === "zh" ? "下单须知" : "Order Notice"}
        </h4>
        <p className="text-[10px] text-[#6B5F53]">
          {language === "zh"
            ? "每天至少选购两餐起送"
            : "Minimum 2 meals per day required for delivery"}
        </p>
      </div>

      {dayWarning ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs font-medium text-red-600">{dayWarning}</p>
        </div>
      ) : null}

      {unavailableState.unavailable ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs font-medium text-red-600">
            <span className="font-bold">This day is unavailable: </span>
            {unavailableState.reason}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {selectedDayData.combos.map((combo) => (
          <div key={combo.id}>
            <div
              className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#C2884E]/20 bg-gradient-to-br from-[#FBF7F2] to-[#F5EDE4] shadow-md backdrop-blur-xl transition-all duration-300 ease-out ${
                unavailableState.unavailable ? "opacity-60" : ""
              }`}
            >
              {combo.imageUrl ? (
                <div className="aspect-[16/9] w-full shrink-0 overflow-hidden bg-[#F5EDE4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={combo.imageUrl}
                    alt={`${translateComboName(combo.name)} combo`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    onError={(event) => {
                      event.currentTarget.parentElement?.classList.add("hidden")
                    }}
                  />
                </div>
              ) : null}

              <div className="flex flex-1 flex-col p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between">
                <h3 className="text-lg font-bold tracking-wide text-[#6B5F53]">
                  {translateComboName(combo.name)}
                </h3>
                <div className="rounded-md bg-[#C2884E]/5 px-2 py-1 text-sm font-medium text-[#C2884E]">
                  {combo.calories} KCAL
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#C2884E]/10 px-2 py-0.5 text-sm font-semibold tracking-wider text-[#C2884E]">
                      {language === "zh" ? "每餐2菜" : "2-Dish Meal"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 bg-white/80"
                      onClick={() => removeFromCart(selectedDay, combo, "A")}
                      disabled={getQuantityInCart(selectedDay, combo.id, "A") === 0 || unavailableState.unavailable}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-5 text-center text-sm">
                      {getQuantityInCart(selectedDay, combo.id, "A")}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 bg-white/80"
                      onClick={() => addToCart(selectedDay, selectedDayData.date, combo, "A")}
                      disabled={unavailableState.unavailable}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3">
                  <ul className="grid grid-cols-1 gap-2">
                    {combo.typeA.dishes.map((dish, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-full rounded-md bg-[#F5EDE4] px-3 py-1.5 text-sm font-medium tracking-wide text-[#6B5F53]">
                          {translateDishName(dish)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="my-3">
                <div className="w-full border-t border-dashed border-[#6B5F53]/20" />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#C2884E]/10 px-2 py-0.5 text-sm font-semibold tracking-wider text-[#C2884E]">
                      {language === "zh" ? "每餐3菜" : "3-Dish Meal"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 bg-white/80"
                      onClick={() => removeFromCart(selectedDay, combo, "B")}
                      disabled={getQuantityInCart(selectedDay, combo.id, "B") === 0 || unavailableState.unavailable}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-5 text-center text-sm">
                      {getQuantityInCart(selectedDay, combo.id, "B")}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 bg-white/80"
                      onClick={() => addToCart(selectedDay, selectedDayData.date, combo, "B")}
                      disabled={unavailableState.unavailable}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-2 text-xs font-medium italic text-[#6B5F53]/80">
                    {language === "zh" ? "包含以上的所有菜品，再加:" : "Includes all dishes above, plus:"}
                  </div>
                  <ul className="grid grid-cols-1 gap-2">
                    {combo.typeB.dishes
                      .filter((dish) => !combo.typeA.dishes.includes(dish))
                      .map((dish, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-full rounded-md border-l-2 border-[#C2884E] bg-[#F5EDE4]/80 px-3 py-1.5 text-sm font-medium tracking-wide text-[#6B5F53]">
                            {translateDishName(dish)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {combo.tags.map((tag, tagIndex) => (
                  <div key={tagIndex} className="transition-all duration-300">
                    <div className={`flex items-center rounded-full bg-gradient-to-r ${accentGradient} px-2 py-1 text-white shadow-sm`}>
                      <span className="text-xs font-medium">{tag}</span>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
