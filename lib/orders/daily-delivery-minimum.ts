export const DEFAULT_DAILY_DELIVERY_MINIMUM = 2

export type DailyDeliveryMinimumOverride = {
  minimumMeals: 1
  startsOn: string
  endsOn: string
}

type DailyDeliveryMinimumOverrideLike = Partial<DailyDeliveryMinimumOverride> | null | undefined

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== "string") return false
  const match = DATE_KEY_PATTERN.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

export function getTorontoDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  if (!isValidDateKey(dateKey)) return dateKey
  const [year, month, day] = dateKey.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** Converts menu labels such as "Sep 14" into an exact delivery date. */
export function normalizeDeliveryDateKey(value: unknown, now = new Date()): string | null {
  if (isValidDateKey(value)) return value
  if (typeof value !== "string") return null

  const match = /^([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(value.trim())
  if (!match) return null

  const month = MONTHS[match[1].toLowerCase()]
  const day = Number(match[2])
  if (!month || day < 1 || day > 31) return null

  const today = getTorontoDateKey(now)
  let year = match[3] ? Number(match[3]) : Number(today.slice(0, 4))
  let candidate = `${year}-${pad(month)}-${pad(day)}`
  if (!isValidDateKey(candidate)) return null

  // Active menus cross New Year. A yearless date far behind today belongs to next year.
  if (!match[3] && candidate < addDaysToDateKey(today, -31)) {
    year += 1
    candidate = `${year}-${pad(month)}-${pad(day)}`
  }

  return isValidDateKey(candidate) ? candidate : null
}

export function getDailyDeliveryMinimum(
  override: DailyDeliveryMinimumOverrideLike,
  deliveryDate: unknown,
  now = new Date()
): number {
  const dateKey = normalizeDeliveryDateKey(deliveryDate, now)
  const today = getTorontoDateKey(now)
  const minimumMeals = Number(override?.minimumMeals)

  if (
    dateKey &&
    minimumMeals === 1 &&
    isValidDateKey(override?.startsOn) &&
    isValidDateKey(override?.endsOn) &&
    today <= override.endsOn &&
    dateKey >= override.startsOn &&
    dateKey <= override.endsOn
  ) {
    return minimumMeals
  }

  return DEFAULT_DAILY_DELIVERY_MINIMUM
}

export function getDailyDeliveryMinimumStatus(
  override: DailyDeliveryMinimumOverrideLike,
  today = getTorontoDateKey()
): "off" | "scheduled" | "active" | "expired" {
  if (
    Number(override?.minimumMeals) !== 1 ||
    !isValidDateKey(override?.startsOn) ||
    !isValidDateKey(override?.endsOn)
  ) {
    return "off"
  }

  if (today < override.startsOn) return "scheduled"
  if (today > override.endsOn) return "expired"
  return "active"
}
