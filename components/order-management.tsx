"use client"

import { ViewAllOrders } from "@/components/view-all-orders"

/**
 * @deprecated Legacy wrapper retained for compatibility.
 * Phase 2B routes this surface to the canonical daily-delivery admin UI.
 */
export function OrderManagement() {
  return <ViewAllOrders />
}
