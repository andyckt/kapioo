import type { ComboItem, DailyMenuCalculatedDates, DayData } from "./types"

export const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "sunday"]

export function createEmptyCalculatedDates(): DailyMenuCalculatedDates {
  return {
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    sunday: "",
  }
}

export function sortDaysByWeekAndName(entries: Array<[string, DayData]>) {
  return [...entries].sort(([_, dayA], [__, dayB]) => {
    if (dayA.week !== dayB.week) {
      return dayA.week < dayB.week ? -1 : 1
    }

    const indexA = DAY_ORDER.indexOf(dayA.displayName.toLowerCase())
    const indexB = DAY_ORDER.indexOf(dayB.displayName.toLowerCase())

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    return 0
  })
}

export function parseDateString(dateStr: string): Date | null {
  const dateMatch = dateStr.match(/(\w+)\s+(\d+)/)
  if (!dateMatch || dateMatch.length < 3) {
    return null
  }

  const monthMap: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  }

  const month = monthMap[dateMatch[1]]
  const dayNum = Number.parseInt(dateMatch[2], 10)

  if (month === undefined || Number.isNaN(dayNum)) {
    return null
  }

  return new Date(new Date().getFullYear(), month, dayNum)
}

export function formatDateToMenuString(date: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}`
}

export function calculateNextWeekDate(dateStr: string) {
  const date = parseDateString(dateStr)
  if (!date) {
    return dateStr
  }

  date.setDate(date.getDate() + 7)
  return formatDateToMenuString(date)
}

export function calculateDatesForWeek(startDay: string, startDateStr: string): DailyMenuCalculatedDates {
  const result = createEmptyCalculatedDates()
  const startDate = parseDateString(startDateStr)
  if (!startDate) {
    return result
  }

  const dayPositions: Record<string, number> = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    sunday: 6,
  }

  const startDayPosition = dayPositions[startDay.toLowerCase()]
  if (startDayPosition === undefined) {
    return result
  }

  for (const dayName of Object.keys(result) as Array<keyof DailyMenuCalculatedDates>) {
    const targetPosition = dayPositions[dayName]
    if (targetPosition === undefined) {
      continue
    }

    const date = new Date(startDate)
    date.setDate(date.getDate() + (targetPosition - startDayPosition))
    result[dayName] = formatDateToMenuString(date)
  }

  return result
}

export function createDefaultCombo(comboId: string): ComboItem {
  return {
    id: comboId,
    name: "套餐 1",
    calories: 650,
    tags: ["Fresh", "Healthy"],
    typeA: {
      dishes: ["Dish 1", "Dish 2"],
      voucherType: "twoDish",
    },
    typeB: {
      dishes: ["Dish 1", "Dish 2", "Dish 3"],
      voucherType: "threeDish",
    },
  }
}

export function createTemplateCombos(dayId: string) {
  return [
    {
      ...createDefaultCombo(`${dayId}-combo-template-1`),
      name: "套餐 1",
    },
    {
      ...createDefaultCombo(`${dayId}-combo-template-2`),
      name: "套餐 2",
    },
  ]
}
