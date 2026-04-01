"use client"

import { useRef } from "react"
import { Copy, Download, Loader2 } from "lucide-react"

import {
  OrderDeleteDialog,
  OrderDetailDialog,
  OrderFiltersBar,
  OrderOverrideDialog,
  useAdminOrders,
} from "@/components/admin-orders"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import type { AdminOrder } from "@/lib/types/orders"

import { WeeklyOrderCards } from "./weekly-order-cards"
import { WeeklyOrderTable } from "./weekly-order-table"
import {
  getLinkedWeeklyGroup,
  getWeeklyEntitlementSummary,
  getWeeklyOrderRouteId,
} from "./weekly-helpers"

export function AdminWeeklyOrdersTab() {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const ordersState = useAdminOrders({
    apiBase: "/api/admin/weekly-subscription/orders",
    initialFilters: {
      status: "all",
      search: "",
      area: "",
      deliveryDate: "",
      deliveryDateEnd: "",
    },
  })

  const copyText = (label: string, value: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        toastRef.current({
          title: `${label} copied`,
          description: `${value} copied to clipboard`,
        })
      })
      .catch(() => {
        toastRef.current({
          title: "Copy failed",
          description: `Failed to copy ${label.toLowerCase()}`,
          variant: "destructive",
        })
      })
  }

  const openDeleteDialog = (orderId: string) => {
    ordersState.setDeleteDialog({
      isOpen: true,
      orderId,
      refundValue: false,
    })
  }

  const openDetailDialog = (orderId: string) => {
    void ordersState.fetchOrderDetails(orderId)
  }

  const openOverrideDialog = (order: AdminOrder) => {
    ordersState.openOverrideDialog(order)
  }

  const selectedOrderExtra =
    ordersState.selectedOrder && typeof ordersState.selectedOrder === "object" ? (
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Entitlement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(() => {
              const entitlement = getWeeklyEntitlementSummary(ordersState.selectedOrder!)
              return (
                <>
                  <p>
                    <span className="font-medium">Voucher Used:</span> {entitlement.labelEn}
                  </p>
                  <p>
                    <span className="font-medium">Allocated Meals:</span>{" "}
                    {String(entitlement.allocatedMealCount || 0)}
                  </p>
                </>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked Weekly Group</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(() => {
              const linkedGroup = getLinkedWeeklyGroup(ordersState.selectedOrder!)
              if (!linkedGroup?.groupId) {
                return <p className="text-muted-foreground">No linked weekly group.</p>
              }

              return (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {linkedGroup.groupId}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyText("Weekly group ID", linkedGroup.groupId as string)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {"linkedChildOrderCount" in linkedGroup && (
                    <p>
                      <span className="font-medium">Linked Child Order Count:</span>{" "}
                      {String(linkedGroup.linkedChildOrderCount || 0)}
                    </p>
                  )}
                </>
              )
            })()}
          </CardContent>
        </Card>
      </div>
    ) : null

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>All Weekly Meal Box Orders</CardTitle>
          <CardDescription>View and manage all weekly meal box orders</CardDescription>
        </div>
        <Button
          variant="outline"
          className="flex items-center gap-2 sm:self-end"
          onClick={() => void ordersState.exportToCSV()}
          disabled={ordersState.isExporting}
        >
          {ordersState.isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Export to CSV</span>
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent>
        <OrderFiltersBar
          filters={ordersState.filters}
          onFiltersChange={ordersState.setFilters}
          onSearch={ordersState.handleSearch}
          onClear={ordersState.clearFilters}
          areas={ordersState.areas}
          deliveryDates={ordersState.deliveryDates}
          showAdvanced={ordersState.showAdvancedFilters}
          onShowAdvancedChange={ordersState.setShowAdvancedFilters}
          searchPlaceholder="Search by order ID, weekly group ID, customer name or email"
        />

        {ordersState.selectedOrdersCount > 0 && (
          <div className="mb-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <span className="text-sm font-medium">
                {ordersState.selectedOrdersCount}{" "}
                {ordersState.selectedOrdersCount === 1 ? "order" : "orders"} selected
              </span>
              <div className="hidden md:block md:flex-1" />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-sm">Update status to:</span>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={ordersState.batchStatus || ""}
                  onChange={(e) => ordersState.setBatchStatus(e.target.value || null)}
                  disabled={ordersState.isBatchUpdating}
                >
                  <option value="">Select status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="delivery">Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <Button
                  onClick={() =>
                    ordersState.batchStatus &&
                    void ordersState.updateSelectedOrdersStatus(ordersState.batchStatus)
                  }
                  disabled={ordersState.isBatchUpdating || !ordersState.batchStatus}
                >
                  {ordersState.isBatchUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Selected"
                  )}
                </Button>
                <Button variant="outline" onClick={ordersState.clearSelection}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>
        )}

        {ordersState.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading orders...</span>
          </div>
        ) : (
          <>
            <WeeklyOrderCards
              orders={ordersState.orders}
              selectedOrders={ordersState.selectedOrders}
              onToggleSelection={ordersState.toggleOrderSelection}
              onView={openDetailDialog}
              onEditCustomerInfo={openOverrideDialog}
              onDelete={openDeleteDialog}
              onStatusChange={(orderId, status) => void ordersState.updateOrderStatus(orderId, status)}
              onCopyEmail={(email) => copyText("Email", email)}
              disableActions={ordersState.isUpdating}
            />

            <WeeklyOrderTable
              orders={ordersState.orders}
              filters={ordersState.filters}
              selectedOrders={ordersState.selectedOrders}
              selectAllChecked={ordersState.selectAllChecked}
              onToggleSelection={ordersState.toggleOrderSelection}
              onToggleSelectAll={ordersState.toggleSelectAll}
              onView={openDetailDialog}
              onEditCustomerInfo={openOverrideDialog}
              onDelete={openDeleteDialog}
              onStatusChange={(orderId, status) => void ordersState.updateOrderStatus(orderId, status)}
              onCopyEmail={(email) => copyText("Email", email)}
              disableActions={ordersState.isUpdating}
            />

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {ordersState.orders.length > 0 ? (
                  <>
                    Showing {(ordersState.pagination.page - 1) * ordersState.pagination.limit + 1} to{" "}
                    {Math.min(
                      ordersState.pagination.page * ordersState.pagination.limit,
                      ordersState.pagination.total
                    )}{" "}
                    of {ordersState.pagination.total} orders
                  </>
                ) : (
                  <>No orders found</>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ordersState.pagination.page === 1}
                  onClick={() => ordersState.handlePagination("prev")}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ordersState.pagination.page === ordersState.pagination.pages}
                  onClick={() => ordersState.handlePagination("next")}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <OrderDetailDialog
        open={ordersState.isDetailDialogOpen}
        order={ordersState.selectedOrder}
        onOpenChange={ordersState.setIsDetailDialogOpen}
        title="Weekly Order Details"
        customerActions={
          ordersState.selectedOrder ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openOverrideDialog(ordersState.selectedOrder!)}
            >
              Edit order-only customer info
            </Button>
          ) : null
        }
        extraContent={selectedOrderExtra}
      />

      <OrderOverrideDialog
        open={ordersState.isOverrideDialogOpen}
        form={ordersState.overrideForm}
        areas={ordersState.areas}
        saving={ordersState.isSavingOverride}
        onOpenChange={ordersState.setIsOverrideDialogOpen}
        onFormChange={ordersState.setOverrideForm}
        onConfirm={() => void ordersState.submitOrderOnlyOverride()}
      />

      <OrderDeleteDialog
        open={ordersState.deleteDialog.isOpen}
        orderId={ordersState.deleteDialog.orderId}
        refundLabel="Return consumed weekly voucher / credits to user"
        refundValue={ordersState.deleteDialog.refundValue}
        processing={ordersState.isUpdating}
        onOpenChange={(open) =>
          ordersState.setDeleteDialog((prev) =>
            open ? prev : { isOpen: false, orderId: "", refundValue: false }
          )
        }
        onRefundValueChange={(value) =>
          ordersState.setDeleteDialog((prev) => ({ ...prev, refundValue: value }))
        }
        onConfirm={() => void ordersState.deleteOrder("returnCredits")}
      />
    </Card>
  )
}
