"use client"

import { motion } from "framer-motion"
import { Calendar, Info, Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DeliveryDay } from "@/lib/weekly-subscription"

type WeeklyDeliveryDaysGridProps = {
  addToCart: (dayId: string, optionId: string, weekOffset?: number) => void
  disabledDates: Set<string>
  getQuantityInCart: (dayId: string, optionId: string, weekOffset?: number) => number
  isDayUnavailable: (day: DeliveryDay) => { unavailable: boolean; reason: string }
  language: "en" | "zh"
  removeFromCart: (dayId: string, optionId: string, weekOffset?: number) => void
  visibleDeliveryDays: DeliveryDay[]
}

export function WeeklyDeliveryDaysGrid({
  addToCart,
  disabledDates,
  getQuantityInCart,
  isDayUnavailable,
  language,
  removeFromCart,
  visibleDeliveryDays,
}: WeeklyDeliveryDaysGridProps) {
  return (
    <div className="space-y-4">
      <p className="text-left text-[10px] leading-tight text-[#6B5F53]/45">
        {language === "zh" ? "* 图片仅供参考" : "* Pictures are for reference only."}
      </p>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {visibleDeliveryDays.map((day) => {
        const isDateDisabled = disabledDates.has(day.date)

        return (
          <motion.div
            key={`${day.id}-${day.weekOffset}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col"
          >
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#C2884E]" />
              <h3 className="text-xl font-semibold text-[#6B5F53]">{day.name}</h3>
              <span className="text-sm text-[#6B5F53]/70">{day.date}</span>
            </div>

            <div className="relative space-y-4">
              {isDateDisabled ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 p-4 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#F5EDE4]">
                      <Info className="h-6 w-6 text-[#C2884E]" />
                    </div>
                    <p className="max-w-[200px] text-xs font-medium text-[#6B5F53]">
                      {language === "zh"
                        ? "您必须选择连续的配送日期（周日+周二 或 周二+周日）"
                        : "You must select consecutive delivery days (Sun+Tue or Tue+Sun)"}
                    </p>
                  </div>
                </div>
              ) : null}

              {day.options.map((option) => {
                const optionDisplayName =
                  language === "en" && option.nameEn ? option.nameEn : option.name

                return (
                <Card
                  key={option.id}
                  className={cn(
                    "group overflow-hidden rounded-lg border-[#C2884E]/10 bg-white transition-all duration-300",
                    !isDateDisabled && "hover:rounded-xl hover:border-[#C2884E]/30 hover:shadow-md"
                  )}
                >
                  <CardContent className="flex flex-col p-0">
                    {option.imageUrl ? (
                      <div className="aspect-[16/9] w-full shrink-0 overflow-hidden bg-[#F5EDE4]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={option.imageUrl}
                          alt={`${optionDisplayName} meal`}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          onError={(event) => {
                            event.currentTarget.parentElement?.classList.add("hidden")
                          }}
                        />
                      </div>
                    ) : null}

                    <div className="space-y-3 p-4">
                      <div>
                        <h4 className="font-medium text-[#6B5F53]">
                          {optionDisplayName}
                        </h4>
                      </div>

                      {option.description ? (
                        <p className="text-xs leading-relaxed text-[#6B5F53]/70">
                          {option.description}
                        </p>
                      ) : null}

                      {(typeof option.calories === "number" || option.tags?.length) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {typeof option.calories === "number" ? (
                            <span className="rounded-full bg-[#C2884E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#C2884E]">
                              {option.calories} KCAL
                            </span>
                          ) : null}
                          {option.tags?.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="rounded-full bg-[#F5EDE4]/70 px-2 py-0.5 text-[10px] font-medium text-[#6B5F53]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {option.allergens?.length ? (
                        <div className="rounded-lg border border-[#E8D8C7] bg-[#FBF7F2]/70 px-2.5 py-1.5 text-[10px] leading-relaxed text-[#8A6A4D]">
                          <span className="font-medium text-[#6B5F53]">{language === "zh" ? "过敏原" : "Allergens"}: </span>
                          {option.allergens.join(" / ")}
                        </div>
                      ) : null}
                    </div>

                    <div className="mb-3 flex items-center justify-end px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-white/80"
                          onClick={() => removeFromCart(day.id, option.id, day.weekOffset)}
                          disabled={getQuantityInCart(day.id, option.id, day.weekOffset) === 0 || isDateDisabled}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-5 text-center text-sm">
                          {getQuantityInCart(day.id, option.id, day.weekOffset)}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-white/80"
                          onClick={() => addToCart(day.id, option.id, day.weekOffset)}
                          disabled={isDateDisabled}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
              })}
            </div>
          </motion.div>
        )
        })}
      </div>
    </div>
  )
}
