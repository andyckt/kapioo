"use client"

import { AlertCircle, CheckCircle, Clock, RefreshCcw, Truck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { AdminOrderStatus } from "@/lib/types/orders"

interface OrderStatusBadgeProps {
  status: AdminOrderStatus
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  switch (status) {
    case "pending":
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-yellow-200 bg-yellow-50 text-yellow-700"
        >
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      )
    case "confirmed":
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-blue-200 bg-blue-50 text-blue-700"
        >
          <CheckCircle className="h-3 w-3" />
          Confirmed
        </Badge>
      )
    case "delivery":
    case "out-for-delivery":
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-indigo-200 bg-indigo-50 text-indigo-700"
        >
          <Truck className="h-3 w-3" />
          Delivery
        </Badge>
      )
    case "delivered":
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-green-200 bg-green-50 text-green-700"
        >
          <CheckCircle className="h-3 w-3" />
          Delivered
        </Badge>
      )
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-red-200 bg-red-50 text-red-700"
        >
          <AlertCircle className="h-3 w-3" />
          Cancelled
        </Badge>
      )
    case "refunded":
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-orange-200 bg-orange-50 text-orange-700"
        >
          <RefreshCcw className="h-3 w-3" />
          Refunded
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
