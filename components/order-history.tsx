"use client"

import { DailyDeliveryHistory } from "@/components/daily-delivery-history"

interface OrderHistoryProps {
  userId: string;
}

/**
 * @deprecated Legacy wrapper retained for compatibility.
 * Phase 2B routes this surface to the canonical daily-delivery customer history UI.
 */
export function OrderHistory({ userId }: OrderHistoryProps) {
  return <DailyDeliveryHistory userId={userId} />
}
