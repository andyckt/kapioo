import type { DayData } from "@/lib/daily-delivery"
import type { CutoffTime } from "@/lib/cutoff-time"
import { getDeliveryDayAvailability } from "@/lib/orders/delivery-day-availability"

type Language = "en" | "zh"

/**
 * Initial / fallback selection: earliest future menu day that passes ordering rules
 * (aligned with lib/orders/delivery-day-availability).
 */
export function pickDefaultAvailableDay(
  formattedDays: Record<string, DayData>,
  effectiveCutoffTime: CutoffTime
): string {
  const dayIds = Object.keys(formattedDays)
  if (dayIds.length === 0) return ""

  const torontoNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }))
  const currentHour = torontoNow.getHours()
  const currentMinute = torontoNow.getMinutes()
  const todayYMD = new Date(torontoNow.getFullYear(), torontoNow.getMonth(), torontoNow.getDate())
  const tomorrowYMD = new Date(
    torontoNow.getFullYear(),
    torontoNow.getMonth(),
    torontoNow.getDate() + 1
  )

  const shortMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]

  const parseMealDate = (mealDate: string): Date | null => {
    const parts = mealDate.split(" ")
    if (parts.length !== 2) return null

    const monthIndex = shortMonths.findIndex(
      (month) => month.toLowerCase() === parts[0].toLowerCase()
    )
    const dayNum = parseInt(parts[1], 10)

    if (monthIndex === -1 || Number.isNaN(dayNum)) return null

    let year = torontoNow.getFullYear()
    if (monthIndex < torontoNow.getMonth() - 1) {
      year += 1
    }

    return new Date(year, monthIndex, dayNum)
  }

  const availableDays = dayIds
    .map((dayId) => {
      const parsedDate = parseMealDate(formattedDays[dayId]?.date || "")
      return { dayId, parsedDate }
    })
    .filter((entry): entry is { dayId: string; parsedDate: Date } => {
      if (!entry.parsedDate) return false

      if (entry.parsedDate.getTime() <= todayYMD.getTime()) return false

      if (
        entry.parsedDate.getTime() === tomorrowYMD.getTime() &&
        (currentHour > effectiveCutoffTime.hour ||
          (currentHour === effectiveCutoffTime.hour &&
            currentMinute > effectiveCutoffTime.minute))
      ) {
        return false
      }

      return true
    })
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())

  return availableDays[0]?.dayId || dayIds[0]
}

/**
 * After a menu refetch, keep the user's day when it still exists and is orderable;
 * otherwise fall back to pickDefaultAvailableDay.
 */
export function resolveDailyMenuSelectedDayAfterFetch(
  previousId: string,
  formattedDays: Record<string, DayData>,
  effectiveCutoffTime: CutoffTime,
  language: Language
): string {
  if (Object.keys(formattedDays).length === 0) {
    return previousId
  }

  if (previousId && formattedDays[previousId]) {
    const { unavailable } = getDeliveryDayAvailability({
      dateLabel: formattedDays[previousId].date,
      cutoffTime: effectiveCutoffTime,
      language,
    })
    if (!unavailable) {
      return previousId
    }
  }

  return pickDefaultAvailableDay(formattedDays, effectiveCutoffTime)
}
