"use client"

const STORAGE_KEYS = {
  starterLocation: "kapioo.starter.selectedLocation",
  weeklyMeal: "kapioo.weeklyMeal.state",
  dailyDelivery: "kapioo.dailyDelivery.state",
} as const

const STALE_MS = 30 * 60 * 1000 // 30 minutes

function safeParse<T>(key: string, parser: (v: unknown) => T | null): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return parser(parsed)
  } catch {
    return null
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

/** Restore starter selected location (used when returning from weekly/daily) */
export function getStarterLocation(): string | null {
  return safeParse(STORAGE_KEYS.starterLocation, (v) =>
    typeof v === "string" && v.trim() ? v.trim() : null
  )
}

/** Save starter location before navigating to weekly/daily */
export function setStarterLocation(location: string): void {
  safeSet(STORAGE_KEYS.starterLocation, location)
}

/** Weekly meal page state */
export interface WeeklyMealState {
  selectedMealsPerWeek: 6 | 8 | 10 | 12 | 16
  purchaseStep: "mealSelect" | "planSelect"
  savedAt: number
}

const VALID_MEALS = [6, 8, 10, 12, 16] as const
const VALID_STEPS = ["mealSelect", "planSelect"] as const

export function getWeeklyMealState(): WeeklyMealState | null {
  return safeParse(STORAGE_KEYS.weeklyMeal, (v) => {
    if (!v || typeof v !== "object") return null
    const o = v as Record<string, unknown>
    const meals = o.selectedMealsPerWeek
    const step = o.purchaseStep
    const savedAt = o.savedAt
    if (
      typeof meals !== "number" ||
      !VALID_MEALS.includes(meals as (typeof VALID_MEALS)[number])
    )
      return null
    if (
      typeof step !== "string" ||
      !VALID_STEPS.includes(step as (typeof VALID_STEPS)[number])
    )
      return null
    const ts = typeof savedAt === "number" ? savedAt : 0
    if (Date.now() - ts > STALE_MS) return null
    return {
      selectedMealsPerWeek: meals as WeeklyMealState["selectedMealsPerWeek"],
      purchaseStep: step as WeeklyMealState["purchaseStep"],
      savedAt: ts,
    }
  })
}

export function setWeeklyMealState(state: Omit<WeeklyMealState, "savedAt">): void {
  safeSet(STORAGE_KEYS.weeklyMeal, {
    ...state,
    savedAt: Date.now(),
  })
}

/** Daily delivery page state */
export interface DailyDeliveryState {
  pricingTab: "twoDish" | "threeDish"
  savedAt: number
}

export function getDailyDeliveryState(): DailyDeliveryState | null {
  return safeParse(STORAGE_KEYS.dailyDelivery, (v) => {
    if (!v || typeof v !== "object") return null
    const o = v as Record<string, unknown>
    const tab = o.pricingTab
    const savedAt = o.savedAt
    if (tab !== "twoDish" && tab !== "threeDish") return null
    const ts = typeof savedAt === "number" ? savedAt : 0
    if (Date.now() - ts > STALE_MS) return null
    return {
      pricingTab: tab,
      savedAt: ts,
    }
  })
}

export function setDailyDeliveryState(state: Omit<DailyDeliveryState, "savedAt">): void {
  safeSet(STORAGE_KEYS.dailyDelivery, {
    ...state,
    savedAt: Date.now(),
  })
}
