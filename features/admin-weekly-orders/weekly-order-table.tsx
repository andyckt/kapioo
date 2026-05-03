"use client"

import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AdminOrder, AdminOrderFilters } from "@/lib/types/orders"
import {
  OrderActionsMenu,
  OrderStatusBadge,
  getEffectiveCustomerInfo,
} from "@/components/admin-orders"
import { formatDate, formatDateTime } from "@/lib/format"

import {
  getFilteredWeeklyOrderItems,
  getLinkedWeeklyGroup,
  getWeeklyDeliverySummary,
  getWeeklyEntitlementSummary,
  getWeeklyOrderRouteId,
} from "./weekly-helpers"
import { WeeklyLinkedGroupDisplay } from "./weekly-linked-group-display"

interface WeeklyOrderTableProps {
  orders: AdminOrder[]
  filters: AdminOrderFilters
  selectedOrders: Set<string>
  selectAllChecked: boolean
  onToggleSelection: (orderId: string) => void
  onToggleSelectAll: () => void
  onView: (orderId: string) => void
  onEditCustomerInfo: (order: AdminOrder) => void
  onDelete: (orderId: string) => void
  onStatusChange: (orderId: string, status: string) => void
  onCopyEmail: (email: string) => void
  disableActions?: boolean
}

export function WeeklyOrderTable({
  orders,
  filters,
  selectedOrders,
  selectAllChecked,
  onToggleSelection,
  onToggleSelectAll,
  onView,
  onEditCustomerInfo,
  onDelete,
  onStatusChange,
  onCopyEmail,
  disableActions = false,
}: WeeklyOrderTableProps) {
  if (orders.length === 0) {
    return <p className="hidden py-10 text-center text-muted-foreground md:block">No orders found</p>
  }

  return (
    <div className="hidden rounded-md border md:block">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-10 px-2 text-left align-middle font-medium">
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center rounded border border-muted-foreground/30"
                  onClick={onToggleSelectAll}
                >
                  {selectAllChecked && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              </th>
              <th className="h-10 px-4 text-left align-middle font-medium">Order ID</th>
              <th className="h-10 px-4 text-left align-middle font-medium">Customer</th>
              <th className="h-10 px-4 text-left align-middle font-medium">Weekly Entitlement</th>
              <th className="h-10 px-4 text-left align-middle font-medium">Deliveries</th>
              <th className="h-10 px-4 text-left align-middle font-medium">Created</th>
              <th className="h-10 px-4 text-left align-middle font-medium">Status</th>
              <th className="h-10 px-4 text-left align-middle font-medium">Area</th>
              <th className="h-10 px-4 text-right align-middle font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const orderId = getWeeklyOrderRouteId(order)
              const customer = getEffectiveCustomerInfo(order)
              const entitlement = getWeeklyEntitlementSummary(order)
              const itemsToDisplay = getFilteredWeeklyOrderItems(order, filters)
              const delivery = getWeeklyDeliverySummary(order)
              const linkedGroup = getLinkedWeeklyGroup(order)

              return (
                <tr key={order._id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="px-2 py-4 align-middle">
                    <button
                      type="button"
                      className="flex h-5 w-5 items-center justify-center rounded border border-muted-foreground/30"
                      onClick={() => onToggleSelection(orderId)}
                    >
                      {selectedOrders.has(orderId) && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  </td>
                  <td className="p-4 align-middle">
                    <div className="flex flex-col gap-1">
                      <p className="font-medium tabular-nums">{orderId}</p>
                      {linkedGroup?.groupId ? (
                        <WeeklyLinkedGroupDisplay groupId={linkedGroup.groupId} className="w-fit" />
                      ) : null}
                    </div>
                  </td>
                  <td className="p-4 align-middle">
                    <div>{customer.name || "Unknown"}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{customer.email || ""}</span>
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
                  </td>
                  <td className="p-4 align-middle">
                    <div className="max-w-[220px] text-sm">
                      <p className="font-medium">{entitlement.labelEn}</p>
                      <p className="text-xs text-muted-foreground">
                        Allocated meals: {String(entitlement.allocatedMealCount || 0)}
                      </p>
                    </div>
                  </td>
                  <td className="p-4 align-middle">
                    {itemsToDisplay.length > 0 ? (
                      <div className="max-w-[220px] space-y-1">
                        {itemsToDisplay.map((item, index) => (
                          <div
                            key={`${order._id}-${index}`}
                            className="rounded-md border border-muted bg-muted/30 px-2 py-1.5"
                          >
                            <div className="text-xs font-medium">
                              {typeof item.date === "string" ? item.date : delivery.date}
                            </div>
                            <div className="text-[10px] text-muted-foreground capitalize">
                              {typeof item.day === "string"
                                ? item.day
                                : typeof item.dayName === "string"
                                  ? item.dayName
                                  : typeof item.dayId === "string"
                                    ? item.dayId.split("-")[0]
                                    : delivery.day}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Qty {typeof item.quantity === "number" ? item.quantity : 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="p-4 align-middle">
                    {order.createdAt ? formatDate(order.createdAt) : "N/A"}
                    <div className="text-xs text-muted-foreground">
                      {order.createdAt ? formatDateTime(order.createdAt) : ""}
                    </div>
                  </td>
                  <td className="p-4 align-middle">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="p-4 align-middle">{customer.area || "N/A"}</td>
                  <td className="p-4 text-right align-middle">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(orderId)}
                        disabled={disableActions}
                      >
                        Details
                      </Button>
                      <OrderActionsMenu
                        onView={() => onView(orderId)}
                        onEditCustomerInfo={() => onEditCustomerInfo(order)}
                        onDelete={() => onDelete(orderId)}
                        onStatusChange={(status) => onStatusChange(orderId, status)}
                        disabled={disableActions}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
