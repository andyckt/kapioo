"use client"

import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AdminOrder, AdminOrderFilters } from "@/lib/types/orders"
import {
  OrderActionsMenu,
  OrderStatusBadge,
  getEffectiveCustomerInfo,
} from "@/components/admin-orders"
import { formatDate, formatDateTime } from "@/lib/format"

import {
  formatDailyOrderItem,
  getDailyDeliverySummary,
  getDailyOrderRouteId,
  getFilteredDailyOrderItems,
} from "./daily-order-helpers"

interface DailyOrderTableProps {
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
  disableActions?: boolean
}

export function DailyOrderTable({
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
  disableActions = false,
}: DailyOrderTableProps) {
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
              <th className="h-10 px-4 text-left align-middle font-medium">Date Ordered</th>
              <th className="h-10 px-4 text-left align-middle font-medium">Delivery Date</th>
              <th className="h-10 px-4 text-left align-middle font-medium">Order Items</th>
              <th className="h-10 px-4 text-left align-middle font-medium">Status</th>
              <th className="h-10 px-4 text-left align-middle font-medium">Area</th>
              <th className="h-10 px-4 text-right align-middle font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const orderId = getDailyOrderRouteId(order)
              const customer = getEffectiveCustomerInfo(order)
              const delivery = getDailyDeliverySummary(order)
              const itemsToDisplay = getFilteredDailyOrderItems(order, filters)

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
                  <td className="p-4 align-middle">{orderId}</td>
                  <td className="p-4 align-middle">
                    {customer.name || "Unknown"}
                    <div className="text-xs text-muted-foreground">{customer.email || ""}</div>
                  </td>
                  <td className="p-4 align-middle">
                    {order.createdAt ? formatDate(order.createdAt) : "N/A"}
                    <div className="text-xs text-muted-foreground">
                      {order.createdAt ? formatDateTime(order.createdAt) : ""}
                    </div>
                  </td>
                  <td className="p-4 align-middle">
                    {delivery.date}
                    <div className="text-xs text-muted-foreground">{delivery.day}</div>
                  </td>
                  <td className="p-4 align-middle">
                    {itemsToDisplay.length > 0 ? (
                      <div className="max-w-[240px] space-y-1 truncate">
                        {itemsToDisplay.map((item, index) => (
                          <div key={`${order._id}-${index}`}>{formatDailyOrderItem(item)}</div>
                        ))}
                      </div>
                    ) : (
                      "N/A"
                    )}
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
                        View
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
