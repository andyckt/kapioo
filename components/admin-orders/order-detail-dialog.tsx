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
import { ProofOfDeliveryCard } from "@/components/orders/proof-of-delivery-card"
import { formatDateTime } from "@/lib/format"
import { getAdminOrderItemDisplay } from "@/lib/orders/admin-order-item-display"
import { SHOW_POD_IN_ADMIN_ORDER_DETAILS } from "@/lib/proof-of-delivery-flags"
import type { AdminOrder, AdminOrderCustomerInfo, AdminOrderUpdateLog } from "@/lib/types/orders"

import { formatAddress, getEffectiveCustomerInfo, getOrderUpdateLogs } from "./order-helpers"
import { OrderStatusBadge } from "./order-status-badge"

function summarizeCustomerSnapshot(info: AdminOrderCustomerInfo | undefined): string {
  if (!info) {
    return "—"
  }
  const parts: string[] = []
  if (info.name) {
    parts.push(`Name: ${info.name}`)
  }
  if (info.phoneNumber) {
    parts.push(`Phone: ${info.phoneNumber}`)
  }
  if (info.area) {
    parts.push(`Area: ${info.area}`)
  }
  if (info.email) {
    parts.push(`Email: ${info.email}`)
  }
  if (info.specialInstructions) {
    parts.push(`Special request: ${info.specialInstructions}`)
  }
  const addr = formatAddress(info.deliveryAddress, info.area)
  if (addr !== "N/A") {
    parts.push(`Delivery: ${addr}`)
  }
  return parts.length > 0 ? parts.join("\n") : "—"
}

function isHiddenOverrideAuditField(field: string): boolean {
  return field.trim().toLowerCase() === "province"
}

function OverrideHistoryEntry({ log }: { log: AdminOrderUpdateLog }) {
  const details =
    Array.isArray(log.changedDetails) && log.changedDetails.length > 0
      ? log.changedDetails
          .filter(
            (row) =>
              typeof row?.field === "string" &&
              typeof row?.from === "string" &&
              typeof row?.to === "string" &&
              !isHiddenOverrideAuditField(row.field)
          )
      : []

  const fieldsOnly =
    details.length === 0 && Array.isArray(log.changedFields) && log.changedFields.length > 0
      ? log.changedFields.filter((f) => typeof f === "string" && !isHiddenOverrideAuditField(f))
      : []

  return (
    <div className="space-y-3 rounded-md border p-3 text-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4">
        <p className="font-medium">
          {log.updatedAt ? formatDateTime(log.updatedAt) : "Override update"}
        </p>
        {log.updatedBy ? (
          <p className="text-muted-foreground">
            Edited by <span className="text-foreground">{log.updatedBy}</span>
          </p>
        ) : null}
      </div>
      {log.reason ? <p className="text-muted-foreground">{log.reason}</p> : null}
      {details.length > 0 ? (
        <div className="overflow-x-auto rounded-md border bg-muted/20">
          <table className="w-full min-w-[280px] text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-2 py-2 font-medium text-muted-foreground">Field</th>
                <th className="px-2 py-2 font-medium text-muted-foreground">Previous</th>
                <th className="px-2 py-2 font-medium text-muted-foreground">New</th>
              </tr>
            </thead>
            <tbody>
              {details.map((row, i) => (
                <tr key={`${row.field}-${i}`} className="border-b border-border/60 last:border-0">
                  <td className="px-2 py-2 align-top font-medium">{row.field}</td>
                  <td className="max-w-[200px] break-words px-2 py-2 align-top text-muted-foreground">
                    {row.from}
                  </td>
                  <td className="max-w-[200px] break-words px-2 py-2 align-top">{row.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : fieldsOnly.length > 0 ? (
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Updated fields: </span>
          {fieldsOnly.join(", ")}
        </p>
      ) : log.previousCustomerInfo || log.newCustomerInfo ? (
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-md border bg-muted/10 p-2">
            <p className="mb-1 font-medium text-foreground">Previous</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {summarizeCustomerSnapshot(log.previousCustomerInfo)}
            </p>
          </div>
          <div className="rounded-md border bg-muted/10 p-2">
            <p className="mb-1 font-medium text-foreground">New</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {summarizeCustomerSnapshot(log.newCustomerInfo)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No field-level details were stored for this entry.
        </p>
      )}
    </div>
  )
}

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

            {SHOW_POD_IN_ADMIN_ORDER_DETAILS ? (
              <ProofOfDeliveryCard proofOfDelivery={order.proofOfDelivery} />
            ) : null}

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
                  order.items.map((item, index) => {
                    const displayItem = getAdminOrderItemDisplay(item)

                    return (
                      <div key={`${order._id}-item-${index}`} className="rounded-md border p-3 text-sm">
                        <p className="font-medium">{displayItem.title}</p>
                        {displayItem.typeLabel && (
                          <p className="text-muted-foreground">{displayItem.typeLabel}</p>
                        )}
                        {displayItem.scheduleLabel && (
                          <p className="text-muted-foreground">
                            <Calendar className="mr-1 inline h-3.5 w-3.5" />
                            {displayItem.scheduleLabel}
                          </p>
                        )}
                        {displayItem.quantity !== null && (
                          <p className="text-muted-foreground">Quantity: {displayItem.quantity}</p>
                        )}
                        {displayItem.dishes.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Included dishes
                            </p>
                            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                              {displayItem.dishes.map((dish, dishIndex) => (
                                <li key={`${order._id}-item-${index}-dish-${dishIndex}`}>{dish}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  })
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
                    <OverrideHistoryEntry key={`${order._id}-log-${index}`} log={log} />
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
