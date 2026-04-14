import type { AdminOrder, AdminOrderFilters, AdminOrderItem } from "@/lib/types/orders"
import { getDailyComboTypeLabel } from "@/lib/orders/admin-order-item-display"

export function getDailyOrderRouteId(order: AdminOrder) {
  return (typeof order.orderId === "string" && order.orderId) || order._id
}

export function getDailyDeliverySummary(order: AdminOrder) {
  const firstItem = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : null
  const date = typeof firstItem?.date === "string" ? firstItem.date : "N/A"
  const day = typeof firstItem?.day === "string" ? firstItem.day.split("-")[0] : ""
  return { date, day }
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

export function getFilteredDailyOrderItems(order: AdminOrder, filters: AdminOrderFilters) {
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

export function formatDailyOrderItem(item: AdminOrderItem) {
  const comboName = typeof item.comboName === "string" ? item.comboName : "Combo"
  const comboType = getDailyComboTypeLabel(item.type) || "Order"
  const quantity = typeof item.quantity === "number" ? item.quantity : 1
  return `${comboName} (${comboType}) x${quantity}`
}
