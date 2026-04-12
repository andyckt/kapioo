"use client"

import { cn } from "@/lib/utils"

type DailyDaySidebarProps = {
  cart: Array<{ day: string; quantity: number }>
  dayOrder: string[]
  days: Record<string, { date: string; displayName: string; week: number }>
  isDayUnavailable: (day: string) => { unavailable: boolean; reason: string }
  language: "en" | "zh"
  onSelectDay: (day: string) => void
  selectedDay: string
  toChineseDayName: (englishDayName: string) => string
}

export function DailyDaySidebar({
  cart,
  dayOrder,
  days,
  isDayUnavailable,
  language,
  onSelectDay,
  selectedDay,
  toChineseDayName,
}: DailyDaySidebarProps) {
  const renderDayButton = (day: string) => (
    <button
      key={day}
      onClick={() => onSelectDay(day)}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left transition-all duration-200",
        selectedDay === day
          ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md"
          : isDayUnavailable(day).unavailable
            ? "cursor-not-allowed text-[#6B5F53] opacity-50"
            : "text-[#6B5F53] hover:bg-[#F5EDE4]"
      )}
    >
      <div className="w-full">
        <p className="text-sm font-medium capitalize">
          {language === "zh"
            ? toChineseDayName(days[day].displayName)
            : days[day].displayName.substring(0, 3)}
        </p>
        <p className="text-xs opacity-80">{days[day].date}</p>
        {isDayUnavailable(day).unavailable ? (
          <p className="mt-1 text-[10px] text-red-500 md:text-xs">Unavailable</p>
        ) : null}
      </div>
    </button>
  )

  return (
    <div className="space-y-2">
      {dayOrder.filter((day) => days[day].week === 1).map(renderDayButton)}

      <div className="mb-2 mt-4 px-3">
        <div className="relative flex items-center">
          <div className="h-px flex-grow bg-[#C2884E]/50" />
          <span className="whitespace-nowrap px-2 text-xs font-medium text-[#C2884E]">
            {language === "zh" ? "下周" : "Next Week"}
          </span>
          <div className="h-px flex-grow bg-[#C2884E]/50" />
        </div>
      </div>

      {dayOrder.filter((day) => days[day].week === 2).length === 0 ? (
        <div className="px-3 py-2 text-center text-sm text-[#6B5F53]">
          {language === "zh" ? "暂无下周菜单" : "No Next Week menu available yet"}
        </div>
      ) : null}

      {dayOrder.filter((day) => days[day].week === 2).map(renderDayButton)}
    </div>
  )
}
