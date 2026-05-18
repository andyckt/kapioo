"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Loader2 } from "lucide-react"

import {
  AdminProofOfDeliveryUpload,
  OrderDeleteDialog,
  OrderDetailDialog,
  OrderFiltersBar,
  OrderOverrideDialog,
  useAdminOrders,
} from "@/components/admin-orders"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import type { AdminOrder } from "@/lib/types/orders"

import { DailyOrderCards } from "./daily-order-cards"
import { DailyOrderTable } from "./daily-order-table"
import { PRODUCT_LINE_LABELS } from "@/lib/product-lines/names"

export function AdminDailyOrdersTab() {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const [comboNames, setComboNames] = useState<string[]>([])

  const ordersState = useAdminOrders({
    apiBase: "/api/admin/daily-delivery/orders",
    initialFilters: {
      status: "all",
      search: "",
      area: "",
      deliveryDate: "",
      deliveryDateEnd: "",
      comboName: "all",
    },
    debounceMs: 300,
  })

  useEffect(() => {
    const controller = new AbortController()

    async function fetchComboNames() {
      try {
        const response = await fetch("/api/admin/daily-delivery/orders/combos", {
          signal: controller.signal,
        })
        if (controller.signal.aborted) {
          return
        }

        const data = await response.json()
        if (controller.signal.aborted) {
          return
        }

        setComboNames(data.success && Array.isArray(data.comboNames) ? data.comboNames : [])
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
          return
        }

        console.error("Error fetching combo names:", error)
        setComboNames([])
        toastRef.current({
          title: "Error",
          description: "Failed to load combo filters",
          variant: "destructive",
        })
      }
    }

    void fetchComboNames()
    return () => controller.abort()
  }, [])

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

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>All {PRODUCT_LINE_LABELS.daily.en} Orders</CardTitle>
          <CardDescription>View and manage all daily delivery orders</CardDescription>
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
          comboNames={comboNames}
          searchPlaceholder="Search by order ID, customer name or email"
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
                  <option value="refunded">Refunded</option>
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
                <Button
                  variant="outline"
                  onClick={ordersState.clearSelection}
                >
                  Clear Actions
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
            <DailyOrderCards
              orders={ordersState.orders}
              selectedOrders={ordersState.selectedOrders}
              onToggleSelection={ordersState.toggleOrderSelection}
              onView={openDetailDialog}
              onEditCustomerInfo={openOverrideDialog}
              onDelete={openDeleteDialog}
              onStatusChange={(orderId, status) => void ordersState.updateOrderStatus(orderId, status)}
              disableActions={ordersState.isUpdating}
            />

            <DailyOrderTable
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
        title="Daily Order Details"
        customerActions={
          ordersState.selectedOrder ? (
            <Button size="sm" variant="outline" onClick={() => openOverrideDialog(ordersState.selectedOrder!)}>
              Edit order-only customer info
            </Button>
          ) : null
        }
        proofOfDeliverySlot={
          ordersState.selectedOrder ? (
            <AdminProofOfDeliveryUpload
              orderId={
                (typeof ordersState.selectedOrder.orderId === "string" &&
                  ordersState.selectedOrder.orderId) ||
                ordersState.selectedOrder._id
              }
              status={ordersState.selectedOrder.status}
              hasProof={Boolean(ordersState.selectedOrder.proofOfDelivery?.imageUrl)}
              isUploading={ordersState.isUploadingPod}
              onUpload={ordersState.uploadProofOfDelivery}
            />
          ) : null
        }
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
        refundLabel="Return vouchers to user"
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
        onConfirm={() => void ordersState.deleteOrder("returnVouchers")}
      />
    </Card>
  )
}
