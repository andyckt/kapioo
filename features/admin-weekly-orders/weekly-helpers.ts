import type { AdminOrder, AdminOrderItem } from "@/lib/types/orders"

export function getWeeklyOrderRouteId(order: AdminOrder) {
  return (typeof order.orderId === "string" && order.orderId) || order._id
}

export function getWeeklyEntitlementSummary(order: AdminOrder) {
  if (order.weeklyEntitlementSummary && typeof order.weeklyEntitlementSummary === "object") {
    return order.weeklyEntitlementSummary
  }

  const allocatedMealCount = Number.isFinite(Number(order.allocatedMealCount))
    ? Number(order.allocatedMealCount)
    : Array.isArray(order.items)
      ? order.items.reduce(
          (sum, item) => sum + (typeof item.quantity === "number" ? item.quantity : 0),
          0
        )
      : Number(order.creditCost) || 0

  if (typeof order.mealPlanType === "string" && order.mealPlanType !== "legacy") {
    const mealsPerWeek = Number(String(order.mealPlanType).replace("aweek", ""))
    if (Number.isFinite(mealsPerWeek)) {
      return {
        labelEn: `${mealsPerWeek} meals/week: 1 voucher`,
        allocatedMealCount,
      }
    }
  }

  return {
    labelEn: `${Number(order.creditCost) || 0} meals`,
    allocatedMealCount,
  }
}

export function getLinkedWeeklyGroup(order: AdminOrder) {
  if (order.linkedWeeklyGroup && typeof order.linkedWeeklyGroup === "object") {
    return order.linkedWeeklyGroup
  }

  if (typeof order.weeklyEntitlementGroupId === "string" && order.weeklyEntitlementGroupId) {
    return {
      groupId: order.weeklyEntitlementGroupId,
      parentRecordExists: false,
      linkedChildOrderCount: 1,
      otherLinkedChildOrders: [],
    }
  }

  return null
}

function getItemDateVariants(date: string) {
  const [year, month, day] = date.split("-").map(Number)
  if (!year || !month || !day) {
    return []
  }

  const dateObj = new Date(year, month - 1, day)
  const monthName = dateObj.toLocaleDateString("en-US", { month: "short" })
  const dayNum = dateObj.getDate()
  return [`${monthName} ${dayNum}`, `${monthName} ${String(dayNum).padStart(2, "0")}`]
}

export function getFilteredWeeklyOrderItems(
  order: AdminOrder,
  filters: { deliveryDate: string; deliveryDateEnd: string }
) {
  if (!Array.isArray(order.items)) {
    return []
  }

  const items = order.items as AdminOrderItem[]
  if (!filters.deliveryDate) {
    return items
  }

  const validDates = new Set<string>()
  const endDate = filters.deliveryDateEnd || filters.deliveryDate
  const currentDate = new Date(`${filters.deliveryDate}T00:00:00`)
  const lastDate = new Date(`${endDate}T00:00:00`)

  while (currentDate <= lastDate) {
    getItemDateVariants(currentDate.toISOString().split("T")[0]).forEach((date) =>
      validDates.add(date)
    )
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return items.filter((item) => {
    const rawDate = typeof item.date === "string" ? item.date : ""
    return validDates.has(rawDate)
  })
}

export function getWeeklyDeliverySummary(order: AdminOrder) {
  const firstItem = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : null
  return {
    date: typeof firstItem?.date === "string" ? firstItem.date : "N/A",
    day:
      typeof firstItem?.day === "string"
        ? firstItem.day
        : typeof firstItem?.dayName === "string"
          ? firstItem.dayName
          : typeof firstItem?.dayId === "string"
            ? firstItem.dayId.split("-")[0]
            : "",
  }
}
