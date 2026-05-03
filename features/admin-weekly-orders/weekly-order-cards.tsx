"use client"

import { Check, Copy, Eye, ShoppingCart, Ticket, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { AdminOrder } from "@/lib/types/orders"
import {
  OrderActionsMenu,
  OrderStatusBadge,
  getEffectiveCustomerInfo,
} from "@/components/admin-orders"

import {
  getLinkedWeeklyGroup,
  getWeeklyDeliverySummary,
  getWeeklyEntitlementSummary,
  getWeeklyOrderRouteId,
} from "./weekly-helpers"
import { WeeklyLinkedGroupDisplay } from "./weekly-linked-group-display"

interface WeeklyOrderCardsProps {
  orders: AdminOrder[]
  selectedOrders: Set<string>
  onToggleSelection: (orderId: string) => void
  onView: (orderId: string) => void
  onEditCustomerInfo: (order: AdminOrder) => void
  onDelete: (orderId: string) => void
  onStatusChange: (orderId: string, status: string) => void
  onCopyEmail: (email: string) => void
  disableActions?: boolean
}

export function WeeklyOrderCards({
  orders,
  selectedOrders,
  onToggleSelection,
  onView,
  onEditCustomerInfo,
  onDelete,
  onStatusChange,
  onCopyEmail,
  disableActions = false,
}: WeeklyOrderCardsProps) {
  if (orders.length === 0) {
    return <p className="py-10 text-center text-muted-foreground">No orders found</p>
  }

  return (
    <div className="space-y-4 md:hidden">
      {orders.map((order) => {
        const orderId = getWeeklyOrderRouteId(order)
        const customer = getEffectiveCustomerInfo(order)
        const delivery = getWeeklyDeliverySummary(order)
        const entitlement = getWeeklyEntitlementSummary(order)
        const linkedGroup = getLinkedWeeklyGroup(order)

        return (
          <Card key={order._id} className="overflow-hidden border shadow-sm">
            <CardHeader className="bg-muted/30 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 items-start gap-2">
                  <button
                    type="button"
                    className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border-2 border-muted-foreground/30"
                    onClick={() => onToggleSelection(orderId)}
                  >
                    {selectedOrders.has(orderId) && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                  <div>
                    <CardTitle className="text-base font-semibold">{orderId}</CardTitle>
                    <CardDescription>
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A"}
                    </CardDescription>
                  </div>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{customer.name || "Unknown"}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{customer.email || "N/A"}</p>
                    {customer.email && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onCopyEmail(customer.email!)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10">
                  <ShoppingCart className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium">
                    {delivery.date}
                    {delivery.day ? (
                      <span className="ml-2 text-xs text-muted-foreground">({delivery.day})</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{customer.area || "Area not set"}</p>
                </div>
              </div>

              <div className="rounded border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-purple-600" />
                  <p className="text-sm font-medium">Weekly entitlement</p>
                </div>
                <p className="text-sm">{entitlement.labelEn}</p>
                <p className="text-xs text-muted-foreground">
                  Allocated meals: {String(entitlement.allocatedMealCount || 0)}
                </p>
                {linkedGroup?.groupId ? (
                  <WeeklyLinkedGroupDisplay groupId={linkedGroup.groupId} className="mt-2" />
                ) : null}
              </div>
            </CardContent>

            <CardFooter className="flex gap-2 bg-muted/10 pb-3 pt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onView(orderId)}
                disabled={disableActions}
              >
                <Eye className="mr-1 h-4 w-4" />
                View Details
              </Button>

              <OrderActionsMenu
                onView={() => onView(orderId)}
                onEditCustomerInfo={() => onEditCustomerInfo(order)}
                onDelete={() => onDelete(orderId)}
                onStatusChange={(status) => onStatusChange(orderId, status)}
                disabled={disableActions}
              />
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
