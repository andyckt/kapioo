import type { AdminOrderItem } from "@/lib/types/orders"

export interface AdminOrderItemDisplay {
  title: string
  typeLabel?: string
  scheduleLabel?: string
  quantity: number | null
  dishes: string[]
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ")
}

export function getDailyComboTypeLabel(value: unknown) {
  if (value === "A") {
    return "2 dishes"
  }

  if (value === "B") {
    return "3 dishes"
  }

  const typeValue = normalizeText(value)
  return typeValue || undefined
}

function getDayLabel(item: AdminOrderItem) {
  const dayName = normalizeText(item.dayName)
  if (dayName) {
    return dayName
  }

  const dayValue = normalizeText(item.day) || normalizeText(item.dayId)
  if (!dayValue) {
    return ""
  }

  return toTitleCase(dayValue.split("-")[0] || dayValue)
}

function getDateLabel(item: AdminOrderItem) {
  return normalizeText(item.date) || normalizeText(item.deliveryDate)
}

function getDishLabel(dish: unknown) {
  if (typeof dish === "string") {
    return dish.trim()
  }

  if (dish && typeof dish === "object" && "name" in dish && typeof dish.name === "string") {
    return dish.name.trim()
  }

  return ""
}

export function getAdminOrderItemDishes(item: AdminOrderItem) {
  if (!Array.isArray(item.dishes)) {
    return []
  }

  return item.dishes
    .map((dish) => getDishLabel(dish))
    .filter((dish): dish is string => dish.length > 0)
}

export function getAdminOrderItemDisplay(item: AdminOrderItem): AdminOrderItemDisplay {
  const dishes = getAdminOrderItemDishes(item)
  const comboTypeLabel = getDailyComboTypeLabel(item.type)
  const title =
    normalizeText(item.optionName) ||
    normalizeText(item.comboName) ||
    normalizeText(item.itemType) ||
    (comboTypeLabel ? `${comboTypeLabel} combo` : "") ||
    dishes[0] ||
    "Order item"

  const dateLabel = getDateLabel(item)
  const dayLabel = getDayLabel(item)
  const scheduleLabel = dateLabel && dayLabel ? `${dateLabel} (${dayLabel})` : dateLabel || dayLabel || undefined
  const quantity = typeof item.quantity === "number" && Number.isFinite(item.quantity) ? item.quantity : null

  return {
    title,
    typeLabel: comboTypeLabel,
    scheduleLabel,
    quantity,
    dishes,
  }
}
