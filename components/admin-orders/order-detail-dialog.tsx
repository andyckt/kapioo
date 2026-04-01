"use client"

import type { ReactNode } from "react"
import { Calendar, ClipboardList, MapPin, User } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/format"
import type { AdminOrder } from "@/lib/types/orders"

import { formatAddress, getEffectiveCustomerInfo, getOrderUpdateLogs } from "./order-helpers"
import { OrderStatusBadge } from "./order-status-badge"

interface OrderDetailDialogProps {
  open: boolean
  order: AdminOrder | null
  onOpenChange: (open: boolean) => void
  title?: string
  customerActions?: ReactNode
  extraContent?: ReactNode
}

export function OrderDetailDialog({
  open,
  order,
  onOpenChange,
  title = "Order Details",
  customerActions,
  extraContent,
}: OrderDetailDialogProps) {
  const customer = order ? getEffectiveCustomerInfo(order) : null
  const logs = order ? getOrderUpdateLogs(order) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Review the order snapshot, order-only customer overrides, and update history.
          </DialogDescription>
        </DialogHeader>

        {!order || !customer ? (
          <p className="py-6 text-sm text-muted-foreground">No order selected.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Order</p>
                <p className="text-lg font-semibold">{order.orderId || order._id}</p>
                <p className="text-sm text-muted-foreground">
                  Created {order.createdAt ? formatDateTime(order.createdAt) : "N/A"}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Name:</span> {customer.name || "Unknown"}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span> {customer.phoneNumber || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">Area:</span> {customer.area || "N/A"}
                  </p>
                  {customer.specialInstructions && (
                    <p>
                      <span className="font-medium">Special Request:</span>{" "}
                      {customer.specialInstructions}
                    </p>
                  )}
                  {customerActions}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Delivery
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Address:</span>{" "}
                    {formatAddress(customer.deliveryAddress, customer.area)}
                  </p>
                  {order.deliveryDate && (
                    <p>
                      <span className="font-medium">Delivery Date:</span>{" "}
                      {formatDateTime(order.deliveryDate)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {extraContent}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-4 w-4" />
                  Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.isArray(order.items) && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <div key={`${order._id}-item-${index}`} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">
                        {(typeof item.comboName === "string" && item.comboName) ||
                          (typeof item.itemType === "string" && item.itemType) ||
                          "Order item"}
                      </p>
                      {item.deliveryDate && (
                        <p className="text-muted-foreground">
                          <Calendar className="mr-1 inline h-3.5 w-3.5" />
                          {formatDateTime(String(item.deliveryDate))}
                        </p>
                      )}
                      {typeof item.quantity === "number" && (
                        <p className="text-muted-foreground">Quantity: {item.quantity}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No line items available.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order-only override history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={`${order._id}-log-${index}`} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">
                        {log.updatedAt ? formatDateTime(log.updatedAt) : "Override update"}
                      </p>
                      {log.reason && <p className="text-muted-foreground">{log.reason}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No override history found.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
