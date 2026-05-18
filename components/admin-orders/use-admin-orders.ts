"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useToast } from "@/hooks/use-toast"
import { ALL_WEEKLY_AREAS } from "@/lib/constants/areas"
import { DEFAULT_PAGINATION, type PaginationState } from "@/lib/types/pagination"
import type {
  AdminOrder,
  AdminOrderDeliveryDateOption,
  AdminOrderFilters,
  AdminOrderOverrideForm,
} from "@/lib/types/orders"

import { createEmptyOrderOverrideForm, getEffectiveCustomerInfo } from "./order-helpers"

interface UseAdminOrdersArgs {
  apiBase: string
  initialFilters: AdminOrderFilters
  debounceMs?: number
}

interface FetchOrdersOptions {
  signal?: AbortSignal
  filters?: AdminOrderFilters
}

function getOrderRouteId(order: AdminOrder) {
  return (typeof order.orderId === "string" && order.orderId) || order._id
}

export function useAdminOrders({ apiBase, initialFilters, debounceMs = 0 }: UseAdminOrdersArgs) {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUploadingPod, setIsUploadingPod] = useState(false)
  const [isBatchUpdating, setIsBatchUpdating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [pagination, setPagination] = useState<PaginationState>({
    ...DEFAULT_PAGINATION,
    pages: 1,
  })
  const [filters, setFilters] = useState<AdminOrderFilters>(initialFilters)
  const [debouncedFilters, setDebouncedFilters] = useState(initialFilters)
  const [deliveryDates, setDeliveryDates] = useState<AdminOrderDeliveryDateOption[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [selectAllChecked, setSelectAllChecked] = useState(false)
  const [batchStatus, setBatchStatus] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    orderId: "",
    refundValue: false,
  })
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false)
  const [overrideOrderId, setOverrideOrderId] = useState("")
  const [isSavingOverride, setIsSavingOverride] = useState(false)
  const [overrideForm, setOverrideForm] = useState<AdminOrderOverrideForm>(
    createEmptyOrderOverrideForm()
  )

  const paginationRef = useRef(pagination)
  const filtersRef = useRef(filters)
  paginationRef.current = pagination
  filtersRef.current = filters

  const activeFilters = debounceMs > 0 ? debouncedFilters : filters

  useEffect(() => {
    if (debounceMs <= 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedFilters(filters)
    }, debounceMs)

    return () => window.clearTimeout(timeoutId)
  }, [debounceMs, filters])

  const fetchOrders = useCallback(
    async (page = 1, options?: FetchOrdersOptions) => {
      setIsLoading(true)

      try {
        const currentFilters = options?.filters || filtersRef.current
        const params = new URLSearchParams({
          page: String(page),
          limit: String(paginationRef.current.limit),
        })

        if (currentFilters.status && currentFilters.status !== "all") {
          params.append("status", currentFilters.status)
        }
        if (currentFilters.search) {
          params.append("search", currentFilters.search)
        }
        if (currentFilters.area && currentFilters.area !== "all") {
          params.append("area", currentFilters.area)
        }
        if (currentFilters.deliveryDate) {
          params.append("deliveryDate", currentFilters.deliveryDate)
        }
        if (currentFilters.deliveryDateEnd) {
          params.append("deliveryDateEnd", currentFilters.deliveryDateEnd)
        }
        if (currentFilters.comboName && currentFilters.comboName !== "all") {
          params.append("comboName", currentFilters.comboName)
        }

        const response = await fetch(`${apiBase}?${params.toString()}`, {
          signal: options?.signal,
        })
        if (options?.signal?.aborted) return

        const data = await response.json()
        if (options?.signal?.aborted) return

        if (data.success) {
          setOrders((data.data?.orders || []) as AdminOrder[])
          setPagination({
            page: data.data?.page || page,
            limit: data.data?.limit || paginationRef.current.limit,
            total: data.data?.total || 0,
            pages: data.data?.pages || 1,
          })
          return
        }

        toastRef.current({
          title: "Error",
          description: data.error || "Failed to load orders",
          variant: "destructive",
        })
      } catch (error) {
        if (options?.signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
          return
        }

        console.error("Error fetching orders:", error)
        toastRef.current({
          title: "Error",
          description: "Failed to load orders",
          variant: "destructive",
        })
      } finally {
        if (!options?.signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [apiBase]
  )

  const fetchOrderDetails = useCallback(
    async (orderId: string) => {
      try {
        const response = await fetch(`${apiBase}/${encodeURIComponent(orderId)}`)
        const data = await response.json()

        if (data.success) {
          setSelectedOrder(data.data as AdminOrder)
          setIsDetailDialogOpen(true)
          return
        }

        toastRef.current({
          title: "Error",
          description: "Failed to load order details",
          variant: "destructive",
        })
      } catch (error) {
        console.error("Error fetching order details:", error)
        toastRef.current({
          title: "Error",
          description: "Failed to load order details",
          variant: "destructive",
        })
      }
    },
    [apiBase]
  )

  const applyUpdatedOrder = useCallback((updatedOrder: AdminOrder) => {
    setOrders((prev) =>
      prev.map((order) =>
        getOrderRouteId(order) === getOrderRouteId(updatedOrder) ? updatedOrder : order
      )
    )
    setSelectedOrder((prev) =>
      prev && getOrderRouteId(prev) === getOrderRouteId(updatedOrder) ? updatedOrder : prev
    )
  }, [])

  const uploadProofOfDelivery = useCallback(
    async (orderId: string, file: File, note?: string) => {
      setIsUploadingPod(true)

      try {
        const formData = new FormData()
        formData.append("file", file)
        if (note) {
          formData.append("note", note)
        }

        const response = await fetch(
          `/api/admin/orders/${encodeURIComponent(orderId)}/proof-of-delivery`,
          {
            method: "POST",
            body: formData,
          }
        )
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to upload proof of delivery")
        }

        applyUpdatedOrder(data.data as AdminOrder)
        toastRef.current({
          title: "Proof uploaded",
          description: "Order marked as delivered with proof of delivery.",
        })
      } catch (error) {
        console.error("Error uploading proof of delivery:", error)
        toastRef.current({
          title: "Upload failed",
          description:
            error instanceof Error ? error.message : "Failed to upload proof of delivery",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsUploadingPod(false)
      }
    },
    [applyUpdatedOrder]
  )

  const updateOrderStatus = useCallback(
    async (orderId: string, status: string) => {
      setIsUpdating(true)

      try {
        const response = await fetch(`${apiBase}/${encodeURIComponent(orderId)}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        })
        const data = await response.json()

        if (data.success) {
          if (data.data) {
            applyUpdatedOrder(data.data as AdminOrder)
          } else {
            setOrders((prev) =>
              prev.map((order) =>
                getOrderRouteId(order) === orderId ? { ...order, status } : order
              )
            )
            setSelectedOrder((prev) =>
              prev && getOrderRouteId(prev) === orderId ? { ...prev, status } : prev
            )
          }

          toastRef.current({
            title: "Status updated",
            description: data.meta?.noOp
              ? "Order already had this status"
              : "Order status updated successfully",
          })
          return
        }

        toastRef.current({
          title: "Error",
          description: data.error || "Failed to update order status",
          variant: "destructive",
        })
      } catch (error) {
        console.error("Error updating order status:", error)
        toastRef.current({
          title: "Error",
          description: "Failed to update order status",
          variant: "destructive",
        })
      } finally {
        setIsUpdating(false)
      }
    },
    [apiBase, applyUpdatedOrder]
  )

  const deleteOrder = useCallback(
    async (refundQueryKey: string) => {
      if (!deleteDialog.orderId) {
        return
      }

      setIsUpdating(true)

      try {
        const query = deleteDialog.refundValue ? `?${refundQueryKey}=true` : ""
        const response = await fetch(
          `${apiBase}/${encodeURIComponent(deleteDialog.orderId)}${query}`,
          { method: "DELETE" }
        )
        const data = await response.json()

        if (data.success) {
          setOrders((prev) => prev.filter((order) => getOrderRouteId(order) !== deleteDialog.orderId))
          setSelectedOrder((prev) =>
            prev && getOrderRouteId(prev) === deleteDialog.orderId ? null : prev
          )
          setDeleteDialog({ isOpen: false, orderId: "", refundValue: false })
          setSelectedOrders((prev) => {
            const next = new Set(prev)
            next.delete(deleteDialog.orderId)
            return next
          })
          toastRef.current({
            title: "Order deleted",
            description: "The order was deleted successfully.",
          })
          return
        }

        toastRef.current({
          title: "Error",
          description: data.error || "Failed to delete order",
          variant: "destructive",
        })
      } catch (error) {
        console.error("Error deleting order:", error)
        toastRef.current({
          title: "Error",
          description: "Failed to delete order",
          variant: "destructive",
        })
      } finally {
        setIsUpdating(false)
      }
    },
    [apiBase, deleteDialog]
  )

  const toggleOrderSelection = useCallback((orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedOrders((prev) => {
      if (prev.size === orders.length) {
        setSelectAllChecked(false)
        return new Set()
      }
      const next = new Set(orders.map(getOrderRouteId))
      setSelectAllChecked(true)
      return next
    })
  }, [orders])

  useEffect(() => {
    setSelectAllChecked(orders.length > 0 && selectedOrders.size === orders.length)
  }, [orders, selectedOrders])

  const updateSelectedOrdersStatus = useCallback(
    async (status: string) => {
      if (selectedOrders.size === 0) {
        return
      }

      setIsBatchUpdating(true)

      try {
        const results = await Promise.allSettled(
          Array.from(selectedOrders).map(async (orderId) => {
            const response = await fetch(`${apiBase}/${encodeURIComponent(orderId)}/status`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ status }),
            })
            return response.json()
          })
        )

        let successCount = 0
        const updatedOrders: AdminOrder[] = []

        for (const result of results) {
          if (result.status === "fulfilled" && result.value?.success) {
            successCount += 1
            if (result.value.data) {
              updatedOrders.push(result.value.data as AdminOrder)
            }
          }
        }

        if (successCount > 0) {
          if (updatedOrders.length > 0) {
            setOrders((prev) =>
              prev.map((order) => {
                const updated = updatedOrders.find(
                  (item) => getOrderRouteId(item) === getOrderRouteId(order)
                )
                return updated || order
              })
            )
          } else {
            setOrders((prev) =>
              prev.map((order) =>
                selectedOrders.has(getOrderRouteId(order)) ? { ...order, status } : order
              )
            )
          }
          setSelectedOrders(new Set())
          setSelectAllChecked(false)
          setBatchStatus(null)
          toastRef.current({
            title: "Batch update complete",
            description: `${successCount} order(s) updated successfully.`,
          })
          return
        }

        toastRef.current({
          title: "Error",
          description: "Failed to update selected orders",
          variant: "destructive",
        })
      } catch (error) {
        console.error("Error batch updating orders:", error)
        toastRef.current({
          title: "Error",
          description: "Failed to update selected orders",
          variant: "destructive",
        })
      } finally {
        setIsBatchUpdating(false)
      }
    },
    [apiBase, selectedOrders]
  )

  const exportToCSV = useCallback(async () => {
    setIsExporting(true)

    try {
      const currentFilters = filtersRef.current
      const params = new URLSearchParams()
      if (currentFilters.status && currentFilters.status !== "all") {
        params.append("status", currentFilters.status)
      }
      if (currentFilters.search) {
        params.append("search", currentFilters.search)
      }
      if (currentFilters.area && currentFilters.area !== "all") {
        params.append("area", currentFilters.area)
      }
      if (currentFilters.deliveryDate) {
        params.append("deliveryDate", currentFilters.deliveryDate)
      }
      if (currentFilters.deliveryDateEnd) {
        params.append("deliveryDateEnd", currentFilters.deliveryDateEnd)
      }
      if (currentFilters.comboName && currentFilters.comboName !== "all") {
        params.append("comboName", currentFilters.comboName)
      }

      const link = document.createElement("a")
      link.href = `${apiBase}/export?${params.toString()}`
      link.setAttribute("download", "")
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error("Error exporting orders:", error)
      toastRef.current({
        title: "Error",
        description: "Failed to export orders",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }, [apiBase])

  const openOverrideDialog = useCallback((order: AdminOrder) => {
    const effective = getEffectiveCustomerInfo(order)
    setOverrideOrderId(getOrderRouteId(order))
    setOverrideForm({
      name: effective.name || "",
      phoneNumber: effective.phoneNumber || "",
      area: effective.area || "",
      specialInstructions: effective.specialInstructions || "",
      deliveryAddress: {
        unitNumber: effective.deliveryAddress?.unitNumber || "",
        streetAddress: effective.deliveryAddress?.streetAddress || "",
        postalCode: effective.deliveryAddress?.postalCode || "",
        country: effective.deliveryAddress?.country || "",
        buzzCode: effective.deliveryAddress?.buzzCode || "",
      },
    })
    setIsOverrideDialogOpen(true)
  }, [])

  const submitOrderOnlyOverride = useCallback(async () => {
    if (!overrideOrderId) {
      return
    }

    setIsSavingOverride(true)

    try {
      const response = await fetch(
        `${apiBase}/${encodeURIComponent(overrideOrderId)}/customer-info`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(overrideForm),
        }
      )
      const data = await response.json()

      if (data.success && data.data) {
        applyUpdatedOrder(data.data as AdminOrder)
        setIsOverrideDialogOpen(false)
        toastRef.current({
          title: "Order updated",
          description: "Order-only customer info updated successfully.",
        })
        return
      }

      toastRef.current({
        title: "Error",
        description: data.error || "Failed to update order",
        variant: "destructive",
      })
    } catch (error) {
      console.error("Error updating order:", error)
      toastRef.current({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      })
    } finally {
      setIsSavingOverride(false)
    }
  }, [apiBase, applyUpdatedOrder, overrideForm, overrideOrderId])

  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
    void fetchOrders(1, { filters: initialFilters })
  }, [fetchOrders, initialFilters])

  useEffect(() => {
    const controller = new AbortController()
    void fetchOrders(1, { signal: controller.signal, filters: activeFilters })

    return () => controller.abort()
  }, [
    activeFilters.area,
    activeFilters.comboName,
    activeFilters.deliveryDate,
    activeFilters.deliveryDateEnd,
    activeFilters.search,
    activeFilters.status,
    fetchOrders,
  ])

  useEffect(() => {
    const controller = new AbortController()

    async function fetchMetadata() {
      try {
        const [areasResponse, deliveryDatesResponse] = await Promise.all([
          fetch(`${apiBase}/areas`, { signal: controller.signal }),
          fetch(`${apiBase}/delivery-dates`, { signal: controller.signal }),
        ])

        if (controller.signal.aborted) {
          return
        }

        const [areasData, deliveryDatesData] = await Promise.all([
          areasResponse.json(),
          deliveryDatesResponse.json(),
        ])

        if (controller.signal.aborted) {
          return
        }

        setAreas(areasData.success ? areasData.areas || [] : ALL_WEEKLY_AREAS)
        setDeliveryDates(
          deliveryDatesData.success ? (deliveryDatesData.deliveryDates || []) : []
        )
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
          return
        }

        console.error("Error fetching order metadata:", error)
        setAreas(ALL_WEEKLY_AREAS)
        setDeliveryDates([])
      }
    }

    void fetchMetadata()
    return () => controller.abort()
  }, [apiBase])

  const selectedOrdersCount = useMemo(() => selectedOrders.size, [selectedOrders])

  return {
    orders,
    selectedOrder,
    setSelectedOrder,
    isDetailDialogOpen,
    setIsDetailDialogOpen,
    isLoading,
    isUpdating,
    isUploadingPod,
    isBatchUpdating,
    isExporting,
    pagination,
    filters,
    setFilters,
    areas,
    deliveryDates,
    showAdvancedFilters,
    setShowAdvancedFilters,
    selectedOrders,
    selectedOrdersCount,
    selectAllChecked,
    batchStatus,
    setBatchStatus,
    deleteDialog,
    setDeleteDialog,
    isOverrideDialogOpen,
    setIsOverrideDialogOpen,
    isSavingOverride,
    overrideForm,
    setOverrideForm,
    fetchOrders,
    handlePagination: (direction: "prev" | "next") => {
      const newPage =
        direction === "prev"
          ? Math.max(1, pagination.page - 1)
          : Math.min(pagination.pages, pagination.page + 1)

      if (newPage !== pagination.page) {
        void fetchOrders(newPage, { filters })
      }
    },
    handleSearch: () => {
      void fetchOrders(1, { filters })
    },
    fetchOrderDetails,
    updateOrderStatus,
    uploadProofOfDelivery,
    toggleOrderSelection,
    toggleSelectAll,
    updateSelectedOrdersStatus,
    exportToCSV,
    openOverrideDialog,
    submitOrderOnlyOverride,
    deleteOrder,
    clearFilters,
    clearSelection: () => {
      setSelectedOrders(new Set())
      setSelectAllChecked(false)
      setBatchStatus(null)
    },
  }
}
