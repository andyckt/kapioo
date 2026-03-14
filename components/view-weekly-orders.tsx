"use client"

import { useState, useEffect } from "react"
import { Truck, CheckCircle, Clock, Package, AlertCircle, Loader2, Search, Filter, RefreshCcw, MoreHorizontal, Download, Calendar, X, Check, CheckSquare, Users, ShoppingCart, Eye, Ticket, Copy, Trash2 } from "lucide-react"
import { ALL_WEEKLY_AREAS } from '@/lib/constants/areas'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

// Order status component with appropriate icon and color
function OrderStatus({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      )
    case 'confirmed':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Confirmed
        </Badge>
      )
    case 'delivery':
      return (
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1">
          <Truck className="h-3 w-3" />
          Delivery
        </Badge>
      )
    case 'delivered':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Delivered
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Cancelled
        </Badge>
      )
    case 'refunded':
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-1">
          <RefreshCcw className="h-3 w-3" />
          Refunded
        </Badge>
      )
    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      )
  }
}

export function ViewWeeklyOrders() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [selectAllChecked, setSelectAllChecked] = useState(false)
  const [isBatchUpdating, setIsBatchUpdating] = useState(false)
  const [batchStatus, setBatchStatus] = useState<string | null>(null)
  
  // Copy email to clipboard
  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email).then(() => {
      toast({
        title: "Email copied!",
        description: `${email} copied to clipboard`,
      })
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Failed to copy email to clipboard",
        variant: "destructive"
      })
    })
  }
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  })
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    area: '',
    deliveryDate: '',
    deliveryDateEnd: ''
  })
  const [deliveryDates, setDeliveryDates] = useState<Array<{date: string, day: string, display: string}>>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [areas, setAreas] = useState<string[]>([])
  const [updateStatusDialog, setUpdateStatusDialog] = useState({
    isOpen: false,
    orderId: '',
    currentStatus: ''
  })
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    orderId: '',
    returnCredits: false
  })
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false)
  const [overrideOrderId, setOverrideOrderId] = useState('')
  const [isSavingOverride, setIsSavingOverride] = useState(false)
  const [overrideForm, setOverrideForm] = useState({
    name: '',
    phoneNumber: '',
    area: '',
    specialInstructions: '',
    deliveryAddress: {
      unitNumber: '',
      streetAddress: '',
      postalCode: '',
      country: '',
      buzzCode: ''
    }
  })

  // Fetch orders with pagination and filters
  const fetchOrders = async (page = 1, options?: { signal?: AbortSignal }) => {
    setIsLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })
      
      // Add status filter if selected
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status)
      }
      
      // Add search filter if provided
      if (filters.search) {
        params.append('search', filters.search)
      }
      
      // Add area filter if provided
      if (filters.area && filters.area !== 'all') {
        params.append('area', filters.area)
      }
      
      // Add delivery date filter if provided
      if (filters.deliveryDate) {
        params.append('deliveryDate', filters.deliveryDate)
      }
      
      // Add delivery date end filter if provided
      if (filters.deliveryDateEnd) {
        params.append('deliveryDateEnd', filters.deliveryDateEnd)
      }
      
      const response = await fetch(`/api/admin/weekly-subscription/orders?${params.toString()}`, { signal: options?.signal })
      if (options?.signal?.aborted) return
      const data = await response.json()
      if (options?.signal?.aborted) return
      
      if (data.success) {
        setOrders(data.data.orders || [])
        setPagination({
          page: data.data.page || page,
          limit: data.data.limit || pagination.limit,
          total: data.data.total || 0,
          pages: data.data.pages || 1
        })
      } else {
        console.error("Error fetching orders:", data.error)
        toast({
          title: "Error",
          description: "Failed to load weekly meal box orders",
          variant: "destructive"
        })
      }
    } catch (error) {
      if (options?.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) return
      console.error("Error fetching orders:", error)
      toast({
        title: "Error",
        description: "Failed to load weekly meal box orders",
        variant: "destructive"
      })
    } finally {
      if (!options?.signal?.aborted) setIsLoading(false)
    }
  }
  
  // Handle pagination
  const handlePagination = (direction: 'prev' | 'next') => {
    const newPage = direction === 'prev' 
      ? Math.max(1, pagination.page - 1)
      : Math.min(pagination.pages, pagination.page + 1)
      
    if (newPage !== pagination.page) {
      fetchOrders(newPage)
    }
  }
  
  // Handle search input
  const handleSearch = () => {
    fetchOrders(1) // Reset to first page when searching
  }
  
  // Fetch order details
  const fetchOrderDetails = async (orderId: string) => {
    try {
      const response = await fetch(`/api/admin/weekly-subscription/orders/${orderId}`)
      const data = await response.json()
      
      if (data.success) {
        setSelectedOrder(data.data)
      } else {
        toast({
          title: "Error",
          description: "Failed to load order details",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching order details:", error)
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive"
      })
    }
  }
  
  // Fetch unique delivery dates for filter dropdown
  const fetchDeliveryDates = async () => {
    try {
      console.log('Fetching delivery dates...')
      const response = await fetch('/api/admin/weekly-subscription/orders/delivery-dates')
      const data = await response.json()
      console.log('Delivery dates API response:', data)
      
      if (data.success && data.deliveryDates && data.deliveryDates.length > 0) {
        console.log('Setting delivery dates:', data.deliveryDates)
        setDeliveryDates(data.deliveryDates)
      } else {
        console.log('No delivery dates found or invalid response format')
        setDeliveryDates([])
      }
    } catch (error) {
      console.error('Error fetching delivery dates:', error)
      setDeliveryDates([])
    }
  }

  // Fetch unique areas for filter dropdown
  const fetchAreas = async () => {
    try {
      const response = await fetch('/api/admin/weekly-subscription/orders/areas')
      const data = await response.json()
      
      if (data.success && data.areas && data.areas.length > 0) {
        setAreas(data.areas)
      } else {
        // Use centralized area list as default
        setAreas([...ALL_WEEKLY_AREAS])
      }
    } catch (error) {
      console.error('Error fetching areas:', error)
      // Use centralized area list as default on error
      setAreas([...ALL_WEEKLY_AREAS])
    }
  }

  // Export orders to CSV
  const exportToCSV = async () => {
    setIsExporting(true)
    try {
      // Build query parameters for export
      const params = new URLSearchParams()
      
      // Add status filter if selected and not "all"
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status)
      }
      
      // Add search filter if provided
      if (filters.search) {
        params.append('search', filters.search)
      }
      
      // Add area filter if provided
      if (filters.area && filters.area !== 'all') {
        params.append('area', filters.area)
      }
      
      // Meal plan type filter removed

      // Add delivery date filter if provided
      if (filters.deliveryDate) {
        params.append('deliveryDate', filters.deliveryDate)
      }
      
      // Add delivery date end filter if provided
      if (filters.deliveryDateEnd) {
        params.append('deliveryDateEnd', filters.deliveryDateEnd)
      }

      // Create a link to download the CSV
      const link = document.createElement('a')
      link.href = `/api/admin/weekly-subscription/orders/export?${params.toString()}`
      link.setAttribute('download', `weekly-subscription-orders-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export Started",
        description: "Your CSV file will download shortly."
      })
    } catch (error) {
      console.error('Error exporting orders:', error)
      toast({
        title: "Export Failed",
        description: "There was an error exporting orders to CSV.",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Load orders when component mounts or filters change
  useEffect(() => {
    const controller = new AbortController()
    void fetchOrders(1, { signal: controller.signal })
    return () => controller.abort()
  }, [filters.status, filters.area, filters.search, filters.deliveryDate, filters.deliveryDateEnd])
  
  // Load areas and delivery dates when component mounts
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    const run = async () => {
      try {
        const [areasRes, datesRes] = await Promise.all([
          fetch('/api/admin/weekly-subscription/orders/areas', { signal }),
          fetch('/api/admin/weekly-subscription/orders/delivery-dates', { signal })
        ])
        if (signal.aborted) return
        const [areasData, datesData] = await Promise.all([areasRes.json(), datesRes.json()])
        if (signal.aborted) return
        if (areasData.success && areasData.areas?.length > 0) setAreas(areasData.areas)
        else setAreas([...ALL_WEEKLY_AREAS])
        if (datesData.success && datesData.deliveryDates?.length > 0) setDeliveryDates(datesData.deliveryDates)
        else setDeliveryDates([])
      } catch (e) {
        if (signal.aborted || (e instanceof Error && e.name === 'AbortError')) return
        setAreas([...ALL_WEEKLY_AREAS])
        setDeliveryDates([])
      }
    }
    run()
    return () => controller.abort()
  }, [])
  
  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/weekly-subscription/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        const updatedOrder = data.data
        if (updatedOrder?.orderId) {
          setOrders(orders.map(order =>
            order.orderId === orderId ? { ...order, ...updatedOrder } : order
          ))
        } else {
          setOrders(orders.map(order =>
            order.orderId === orderId ? { ...order, status: newStatus } : order
          ))
        }
        
        // Update selected order if it's the one being viewed
        if (selectedOrder && selectedOrder.orderId === orderId) {
          setSelectedOrder(updatedOrder?.orderId ? { ...selectedOrder, ...updatedOrder } : { ...selectedOrder, status: newStatus })
        }
        
        toast({
          title: "Status Updated",
          description: data.meta?.noOp
            ? `Order ${orderId} is already ${newStatus}.`
            : data.meta?.refundSummary && newStatus === 'refunded'
              ? `Order ${orderId} status changed to refunded (${data.meta.refundSummary}).`
              : `Order ${orderId} status changed to ${newStatus}.`,
        })
      } else {
        toast({
          title: "Update Failed",
          description: data.error || "Failed to update order status",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Update Failed",
        description: "An error occurred while updating the order status",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
      setUpdateStatusDialog({ isOpen: false, orderId: '', currentStatus: '' })
    }
  }
  
  // Delete order without notification
  const deleteOrderWithoutNotice = async () => {
    const { orderId, returnCredits } = deleteDialog
    setIsUpdating(true)
    try {
      const url = `/api/admin/weekly-subscription/orders/${orderId}${returnCredits ? '?returnCredits=true' : ''}`
      const response = await fetch(url, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Remove the order from the list
        setOrders(orders.filter(order => order.orderId !== orderId))
        
        // Close selected order dialog if it's the one being deleted
        if (selectedOrder && selectedOrder.orderId === orderId) {
          setSelectedOrder(null)
        }
        
        // Update pagination total
        setPagination(prev => ({ ...prev, total: prev.total - 1 }))
        
        toast({
          title: "Order Deleted",
          description: data.message || `Order ${orderId} deleted successfully without notification${returnCredits ? ' (entitlement restored)' : ''}.`,
        })
      } else {
        toast({
          title: "Delete Failed",
          description: data.error || "Failed to delete order",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting order:", error)
      toast({
        title: "Delete Failed",
        description: "An error occurred while deleting the order",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
      setDeleteDialog({ isOpen: false, orderId: '', returnCredits: false })
    }
  }
  
  // Toggle selection of a single order
  const toggleOrderSelection = (orderId: string) => {
    const newSelectedOrders = new Set(selectedOrders)
    if (newSelectedOrders.has(orderId)) {
      newSelectedOrders.delete(orderId)
    } else {
      newSelectedOrders.add(orderId)
    }
    setSelectedOrders(newSelectedOrders)
    
    // Update selectAll checkbox state
    if (newSelectedOrders.size === 0) {
      setSelectAllChecked(false)
    } else if (newSelectedOrders.size === orders.length) {
      setSelectAllChecked(true)
    } else {
      setSelectAllChecked(false)
    }
  }
  
  // Toggle selection of all orders
  const toggleSelectAll = () => {
    if (selectAllChecked) {
      // Unselect all
      setSelectedOrders(new Set())
    } else {
      // Select all orders
      const allOrderIds = orders.map(order => order.orderId)
      setSelectedOrders(new Set(allOrderIds))
    }
    setSelectAllChecked(!selectAllChecked)
  }
  
  // Update status for all selected orders
  const updateSelectedOrdersStatus = async (newStatus: string) => {
    if (selectedOrders.size === 0) {
      toast({
        title: "No orders selected",
        description: "Please select at least one order to update",
        variant: "destructive"
      })
      return
    }
    
    setIsBatchUpdating(true)
    setBatchStatus(newStatus)
    
    try {
      const orderIds = Array.from(selectedOrders)
      const results = await Promise.allSettled(
        orderIds.map(orderId => 
          fetch(`/api/admin/weekly-subscription/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus }),
          }).then(res => res.json())
        )
      )
      
      const successfulUpdates = results
        .map((result, index) => ({ result, orderId: orderIds[index] }))
        .filter((entry): entry is { result: PromiseFulfilledResult<any>; orderId: string } => (
          entry.result.status === 'fulfilled' && Boolean(entry.result.value?.success)
        ))

      const successfulOrderIds = new Set(successfulUpdates.map(entry => entry.orderId))
      const successfulOrderMap = new Map(
        successfulUpdates
          .filter(entry => entry.result.value?.data?.orderId)
          .map(entry => [entry.orderId, entry.result.value.data])
      )

      // Count successes and failures
      const successful = successfulUpdates.length
      const failed = results.length - successful
      
      // Update only successful orders in the UI
      setOrders(orders.map(order => {
        if (!successfulOrderIds.has(order.orderId)) return order
        const updatedOrder = successfulOrderMap.get(order.orderId)
        return updatedOrder ? { ...order, ...updatedOrder } : { ...order, status: newStatus }
      }))

      if (selectedOrder && successfulOrderIds.has(selectedOrder.orderId)) {
        const updatedSelectedOrder = successfulOrderMap.get(selectedOrder.orderId)
        setSelectedOrder(updatedSelectedOrder ? { ...selectedOrder, ...updatedSelectedOrder } : { ...selectedOrder, status: newStatus })
      }
      
      // Clear selection
      setSelectedOrders(new Set())
      setSelectAllChecked(false)
      
      // Show toast with results
      toast({
        title: `Batch update complete`,
        description: `Successfully updated ${successful} orders to "${newStatus}" status${failed > 0 ? `. Failed: ${failed}` : ''}`,
        variant: failed > 0 ? "destructive" : "default"
      })
    } catch (error) {
      console.error('Error in batch update:', error)
      toast({
        title: "Update failed",
        description: "An error occurred during the batch update",
        variant: "destructive"
      })
    } finally {
      setIsBatchUpdating(false)
      setBatchStatus(null)
    }
  }
  
  // Format address for display
  const formatAddress = (address: any, area?: string) => {
    if (!address) return "No address provided"
    
    let formattedAddress = ''
    
    if (address.unitNumber) {
      formattedAddress += `Unit ${address.unitNumber}, `
    }
    
    formattedAddress += address.streetAddress || ''
    
    if (area) {
      formattedAddress += `, ${area}`
    }

    if (address.postalCode) {
      formattedAddress += ` ${address.postalCode}`
    }
    
    if (address.country) {
      formattedAddress += `, ${address.country}`
    }
    
    return formattedAddress.trim()
  }

  const getEffectiveCustomerInfo = (order: any) => {
    const fallbackAddress = order?.deliveryAddress || {}
    const fallbackUser = order?.user || {}
    const fallback = {
      name: fallbackUser.name || '',
      email: fallbackUser.email || '',
      phoneNumber: order?.phoneNumber || '',
      area: order?.area || '',
      specialInstructions: order?.specialInstructions || '',
      deliveryAddress: fallbackAddress
    }

    return {
      ...fallback,
      ...(order?.effectiveCustomerInfo || {}),
      deliveryAddress: {
        unitNumber: order?.effectiveCustomerInfo?.deliveryAddress?.unitNumber ?? fallbackAddress.unitNumber ?? '',
        streetAddress: order?.effectiveCustomerInfo?.deliveryAddress?.streetAddress ?? fallbackAddress.streetAddress ?? '',
        postalCode: order?.effectiveCustomerInfo?.deliveryAddress?.postalCode ?? fallbackAddress.postalCode ?? '',
        country: order?.effectiveCustomerInfo?.deliveryAddress?.country ?? fallbackAddress.country ?? '',
        buzzCode: order?.effectiveCustomerInfo?.deliveryAddress?.buzzCode ?? fallbackAddress.buzzCode ?? ''
      }
    }
  }

  const getOrderUpdateLogs = (order: any) => {
    if (!order || !Array.isArray(order.orderCustomerOverrideLogs)) return []
    return [...order.orderCustomerOverrideLogs].sort((a: any, b: any) => {
      const aTs = new Date(a?.updatedAt || 0).getTime()
      const bTs = new Date(b?.updatedAt || 0).getTime()
      return bTs - aTs
    })
  }

  const openOverrideDialog = (order: any) => {
    const effective = getEffectiveCustomerInfo(order)
    setOverrideOrderId(order.orderId)
    setOverrideForm({
      name: effective.name || '',
      phoneNumber: effective.phoneNumber || '',
      area: effective.area || '',
      specialInstructions: effective.specialInstructions || '',
      deliveryAddress: {
        unitNumber: effective.deliveryAddress?.unitNumber || '',
        streetAddress: effective.deliveryAddress?.streetAddress || '',
        postalCode: effective.deliveryAddress?.postalCode || '',
        country: effective.deliveryAddress?.country || '',
        buzzCode: effective.deliveryAddress?.buzzCode || ''
      }
    })
    setIsOverrideDialogOpen(true)
  }

  const applyUpdatedOrder = (updatedOrder: any) => {
    setOrders((prev) => prev.map((order) => (order.orderId === updatedOrder.orderId ? { ...order, ...updatedOrder } : order)))
    setSelectedOrder((prev: any) => {
      if (!prev || prev.orderId !== updatedOrder.orderId) return prev
      return { ...prev, ...updatedOrder }
    })
  }

  const submitOrderOnlyOverride = async () => {
    if (!overrideOrderId) return
    setIsSavingOverride(true)
    try {
      const response = await fetch(`/api/admin/weekly-subscription/orders/${overrideOrderId}/customer-info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrideForm)
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save order-only override')
      }

      applyUpdatedOrder(data.data)
      toast({
        title: "Order-only override saved",
        description: `Customer info updated for ${overrideOrderId} only. User profile was not changed.`
      })
      setIsOverrideDialogOpen(false)
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save order-only override",
        variant: "destructive"
      })
    } finally {
      setIsSavingOverride(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle>All Weekly Meal Box Orders</CardTitle>
          <CardDescription>View and manage all weekly meal box orders</CardDescription>
        </div>
        <Button
          variant="outline"
          className="flex items-center gap-2 sm:self-end"
          onClick={exportToCSV}
          disabled={isExporting}
        >
          {isExporting ? (
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
        {/* Basic Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, customer name or email"
              className="pl-8"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
            />
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({...filters, status: value})}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showAdvancedFilters ? 'Hide Filters' : 'Advanced Filters'}
          </Button>
          <Button onClick={handleSearch}>Search</Button>
        </div>
        
        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="bg-muted/50 p-4 rounded-lg mb-6 border border-border/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="area">Area</Label>
                <Select
                  value={filters.area}
                  onValueChange={(value) => setFilters({...filters, area: value})}
                >
                  <SelectTrigger id="area">
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Delivery Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="deliveryDate"
                      type="date"
                      placeholder="Start date"
                      className="pl-8"
                      value={filters.deliveryDate}
                      onChange={(e) => {
                        setFilters({...filters, deliveryDate: e.target.value});
                      }}
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="deliveryDateEnd"
                      type="date"
                      placeholder="End date"
                      className="pl-8"
                      value={filters.deliveryDateEnd}
                      onChange={(e) => {
                        setFilters({...filters, deliveryDateEnd: e.target.value});
                      }}
                    />
                  </div>
                </div>
                {filters.deliveryDate && filters.deliveryDateEnd && (
                  <p className="text-xs text-muted-foreground">
                    Showing orders from {(() => {
                      const [year, month, day] = filters.deliveryDate.split('-').map(Number);
                      return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    })()} to {(() => {
                      const [year, month, day] = filters.deliveryDateEnd.split('-').map(Number);
                      return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    })()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilters({
                    status: 'all',
                    search: '',
                    area: '',
                    deliveryDate: '',
                    deliveryDateEnd: ''
                  });
                  handleSearch();
                }}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
              <Button onClick={handleSearch}>Apply Filters</Button>
            </div>
          </div>
        )}

        {/* Orders Table */}
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading orders...</span>
          </div>
        ) : (
          <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border">
            <div className="overflow-x-auto">
              {/* Batch Actions */}
              {selectedOrders.size > 0 && (
                <div className="mb-4 p-3 bg-muted/30 border rounded-lg flex flex-col md:flex-row items-start md:items-center gap-3">
                  <span className="text-sm font-medium">{selectedOrders.size} orders selected</span>
                  <div className="flex-1 w-full md:w-auto"></div>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-2 w-full md:w-auto">
                    <span className="text-sm">Update status to:</span>
                    <Select
                      value={batchStatus || ""}
                      onValueChange={setBatchStatus}
                      disabled={isBatchUpdating}
                    >
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => batchStatus && updateSelectedOrdersStatus(batchStatus)}
                      disabled={isBatchUpdating || !batchStatus}
                      className="w-full md:w-auto"
                    >
                      {isBatchUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Selected'
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedOrders(new Set())
                        setSelectAllChecked(false)
                      }}
                      disabled={isBatchUpdating}
                      className="w-full md:w-auto"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}
              
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-2 text-left align-middle font-medium">
                      <div className="flex items-center">
                        <div 
                          className="cursor-pointer flex items-center justify-center w-5 h-5 rounded border border-muted-foreground/30 mr-2"
                          onClick={toggleSelectAll}
                        >
                          {selectAllChecked && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </div>
                    </th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Order ID</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Customer</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Date Ordered</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Order Items</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Delivery Date</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Area</th>
                    <th className="h-10 px-4 text-right align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order._id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="px-2 py-4 align-middle">
                          <div 
                            className="cursor-pointer flex items-center justify-center w-5 h-5 rounded border border-muted-foreground/30"
                            onClick={() => toggleOrderSelection(order.orderId)}
                          >
                            {selectedOrders.has(order.orderId) && <Check className="h-3.5 w-3.5 text-primary" />}
                          </div>
                        </td>
                        <td className="p-4 align-middle">{order.orderId}</td>
                        <td className="p-4 align-middle">
                          {getEffectiveCustomerInfo(order).name || 'Unknown'}
                          {getEffectiveCustomerInfo(order).email && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-muted-foreground truncate">{getEffectiveCustomerInfo(order).email}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyEmail(getEffectiveCustomerInfo(order).email)
                                }}
                                className="flex-shrink-0 p-0.5 hover:bg-muted rounded transition-colors"
                                title="Copy email"
                              >
                                <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                          <div className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          {order.items && order.items.length > 0 ? (
                            <div className="space-y-2 max-w-[180px]">
                              {(() => {
                                // Filter items by delivery date if filter is active
                                const itemsToDisplay = filters.deliveryDate 
                                  ? order.items.filter((item: any) => {
                                      if (!filters.deliveryDate) return true;
                                      
                                      // Handle date range filtering
                                      if (filters.deliveryDateEnd) {
                                        const [startYear, startMonth, startDay] = filters.deliveryDate.split('-').map(Number);
                                        const [endYear, endMonth, endDay] = filters.deliveryDateEnd.split('-').map(Number);
                                        
                                        const startDate = new Date(startYear, startMonth - 1, startDay);
                                        const endDate = new Date(endYear, endMonth - 1, endDay);
                                        
                                        // Generate all valid date formats in the range
                                        const validDates: string[] = [];
                                        const currentDate = new Date(startDate);
                                        
                                        while (currentDate <= endDate) {
                                          const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
                                          const dayNum = currentDate.getDate();
                                          validDates.push(`${monthName} ${dayNum < 10 ? `0${dayNum}` : `${dayNum}`}`);
                                          validDates.push(`${monthName} ${dayNum}`);
                                          currentDate.setDate(currentDate.getDate() + 1);
                                        }
                                        
                                        return validDates.includes(item.date);
                                      } else {
                                        // Single date filtering
                                        const [year, month, day] = filters.deliveryDate.split('-').map(Number);
                                        const dateObj = new Date(year, month - 1, day);
                                        const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                                        const dayNum = dateObj.getDate();
                                        
                                        const formattedWithZero = `${monthName} ${dayNum < 10 ? `0${dayNum}` : `${dayNum}`}`;
                                        const formattedWithoutZero = `${monthName} ${dayNum}`;
                                        
                                        return item.date === formattedWithZero || item.date === formattedWithoutZero;
                                      }
                                    })
                                  : order.items;
                                
                                return itemsToDisplay.map((item: any, index: number) => (
                                  <div key={index} className="flex items-center gap-2 bg-muted/30 rounded-md px-2 py-1.5 border border-muted">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium truncate">
                                        {item.date}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground capitalize">
                                        {item.day || item.dayName || item.dayId?.split('-')[0]}
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto font-semibold">
                                        ×{item.quantity || 1}
                                      </Badge>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          {order.items && order.items.length > 0 ? (
                            <>
                              {order.items[0].date}
                              <div className="text-xs text-muted-foreground">
                                {order.items[0].dayId.split('-')[0]}
                              </div>
                            </>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <OrderStatus status={order.status} />
                        </td>
                        <td className="p-4 align-middle">{getEffectiveCustomerInfo(order).area || 'N/A'}</td>
                        <td className="p-4 text-right align-middle">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem 
                                onClick={() => fetchOrderDetails(order.orderId)}
                              >
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                              <DropdownMenuItem 
                                onClick={() => updateOrderStatus(order.orderId, 'pending')}
                                disabled={order.status === 'pending' || isUpdating}
                              >
                                Set to Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateOrderStatus(order.orderId, 'confirmed')}
                                disabled={order.status === 'confirmed' || isUpdating}
                              >
                                Set to Confirmed
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateOrderStatus(order.orderId, 'delivery')}
                                disabled={order.status === 'delivery' || isUpdating}
                              >
                                Set to Delivery
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateOrderStatus(order.orderId, 'delivered')}
                                disabled={order.status === 'delivered' || isUpdating}
                              >
                                Set to Delivered
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => updateOrderStatus(order.orderId, 'cancelled')}
                                disabled={order.status === 'cancelled' || isUpdating}
                                className="text-red-600"
                              >
                                Cancel Order
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateOrderStatus(order.orderId, 'refunded')}
                                disabled={order.status === 'refunded' || isUpdating}
                                className="text-orange-600"
                              >
                                Mark as Refunded
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeleteDialog({ isOpen: true, orderId: order.orderId, returnCredits: false })}
                                disabled={isUpdating}
                                className="text-red-800"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete without notice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="ml-2"
                                onClick={() => fetchOrderDetails(order.orderId)}
                              >
                                Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[85vh]">
                              {selectedOrder && selectedOrder.orderId === order.orderId ? (
                                <>
                                  <DialogHeader>
                                    <DialogTitle>Order {selectedOrder.orderId}</DialogTitle>
                                    <DialogDescription>
                                      Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="overflow-y-auto max-h-[calc(85vh-120px)] py-4">
                                    {/* Order status section */}
                                    <div className="mb-4">
                                      <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-semibold">Order Status</h3>
                                        <OrderStatus status={selectedOrder.status} />
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {selectedOrder.hasOrderOnlyOverride ? (
                                          <Badge variant="secondary">Order-only override active</Badge>
                                        ) : (
                                          <Badge variant="outline">Using original order snapshot</Badge>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => openOverrideDialog(selectedOrder)}
                                        >
                                          Edit order-only customer info
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {/* Order details section */}
                                    <div className="grid gap-3 text-sm border-t pt-3">
                                      {/* Customer info */}
                                      <div>
                                        <h3 className="font-semibold mb-1">Customer</h3>
                                        <p className="text-muted-foreground">
                                          {getEffectiveCustomerInfo(selectedOrder).name || 'Unknown'}
                                          {getEffectiveCustomerInfo(selectedOrder).email && (
                                            <span className="block">{getEffectiveCustomerInfo(selectedOrder).email}</span>
                                          )}
                                        </p>
                                      </div>
                                      
                                      {/* Subscription details */}
                                      <div>
                                        <h3 className="font-semibold mb-2">Subscription Details</h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                          {selectedOrder.items && selectedOrder.items.map((item: any, index: number) => (
                                            <div key={index} className="border rounded-lg p-3 bg-muted/30">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-medium truncate text-sm">{item.optionName || item.mealName}</p>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    {item.date} • {item.day || item.dayName || item.dayId?.split('-')[0]}
                                                  </p>
                                                </div>
                                                <Badge variant="secondary" className="ml-2 flex-shrink-0">
                                                  × {item.quantity || 1}
                                                </Badge>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      {/* Credit cost */}
                                      <div>
                                        <h3 className="font-semibold mb-1">Credit Cost</h3>
                                        <p className="text-muted-foreground">
                                          {selectedOrder.creditCost || 0} credits
                                        </p>
                                      </div>
                                      
                                      {/* Delivery details */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <h3 className="font-semibold mb-1">Area</h3>
                                          <p className="text-muted-foreground">
                                            {getEffectiveCustomerInfo(selectedOrder).area || 'N/A'}
                                          </p>
                                        </div>
                                        
                                        <div>
                                          <h3 className="font-semibold mb-1">Phone Number</h3>
                                          <p className="text-muted-foreground">
                                            {getEffectiveCustomerInfo(selectedOrder).phoneNumber || 'N/A'}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h3 className="font-semibold mb-1">Delivery Address</h3>
                                        <p className="text-muted-foreground">
                                          {formatAddress(getEffectiveCustomerInfo(selectedOrder).deliveryAddress, getEffectiveCustomerInfo(selectedOrder).area)}
                                        </p>
                                      </div>
                                      
                                      {getEffectiveCustomerInfo(selectedOrder).specialInstructions && (
                                        <div>
                                          <h3 className="font-semibold mb-1">Special Request</h3>
                                          <p className="text-muted-foreground">
                                            {getEffectiveCustomerInfo(selectedOrder).specialInstructions}
                                          </p>
                                        </div>
                                      )}

                                      {getOrderUpdateLogs(selectedOrder).length > 0 && (
                                        <div>
                                          <h3 className="font-semibold mb-1">Order Update Notes</h3>
                                          <div className="space-y-2">
                                            {getOrderUpdateLogs(selectedOrder).slice(0, 10).map((log: any, idx: number) => (
                                              <div key={`${log.updatedAt || idx}-${idx}`} className="rounded border p-2 bg-muted/20">
                                                <p className="text-xs font-medium">
                                                  {new Date(log.updatedAt).toLocaleString()}
                                                  {log.updatedBy ? ` • ${log.updatedBy}` : ''}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                  Updated: {Array.isArray(log.changedFields) && log.changedFields.length > 0 ? log.changedFields.join(', ') : 'customer info'}
                                                </p>
                                                {Array.isArray(log.changedDetails) && log.changedDetails.length > 0 && (
                                                  <div className="mt-2 space-y-1">
                                                    {log.changedDetails.map((detail: any, detailIdx: number) => (
                                                      <p key={`${detail.field}-${detailIdx}`} className="text-xs text-muted-foreground">
                                                        {detail.field}: {detail.from}{' -> '}{detail.to}
                                                      </p>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="flex justify-center items-center h-[200px]">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                  <span className="ml-2">Loading...</span>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-muted-foreground">
                        {isLoading ? "" : "No orders found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {orders.length > 0 ? (
              orders.map((order) => (
                <Card key={order._id} className="overflow-hidden border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 bg-muted/20">
                    <div className="flex items-center">
                      <div
                        className="cursor-pointer flex items-center justify-center w-5 h-5 rounded border border-muted-foreground/30 mr-2"
                        onClick={() => toggleOrderSelection(order.orderId)}
                      >
                        {selectedOrders.has(order.orderId) && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <CardTitle className="text-base font-medium">Order {order.orderId}</CardTitle>
                    </div>
                    <OrderStatus status={order.status} />
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    {/* Customer Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 flex items-center justify-center text-primary flex-shrink-0">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{getEffectiveCustomerInfo(order).name || 'Unknown'}</p>
                        {getEffectiveCustomerInfo(order).email && (
                          <div className="flex items-center gap-1">
                            <p className="text-xs text-muted-foreground truncate flex-1">{getEffectiveCustomerInfo(order).email}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                copyEmail(getEffectiveCustomerInfo(order).email)
                              }}
                              className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
                              title="Copy email"
                            >
                              <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 flex items-center justify-center text-green-600 flex-shrink-0">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {order.items && order.items.length > 0 ? order.items[0].date : 'N/A'}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({order.items && order.items.length > 0 && order.items[0].dayId ? order.items[0].dayId.split('-')[0] : ''})
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{getEffectiveCustomerInfo(order).area || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 flex items-center justify-center text-orange-600 flex-shrink-0">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-2">
                            {order.items.map((item: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 bg-muted/30 rounded-md px-2 py-1.5 border border-muted">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">
                                    {item.date}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground capitalize">
                                    {item.day || item.dayName || item.dayId?.split('-')[0]}
                                  </div>
                                </div>
                                <div className="flex-shrink-0">
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto font-semibold">
                                    ×{item.quantity || 1}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm">N/A</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end p-4 pt-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchOrderDetails(order.orderId)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] p-0">
                        {selectedOrder && selectedOrder.orderId === order.orderId ? (
                          <>
                            {/* Sticky Header */}
                            <DialogHeader className="sticky top-0 z-[5] bg-gradient-to-r from-primary/5 to-primary/10 px-4 sm:px-6 py-4 border-b">
                              <DialogTitle className="text-lg sm:text-xl">Order {selectedOrder.orderId}</DialogTitle>
                              <DialogDescription className="text-xs sm:text-sm">
                                {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}, {new Date(selectedOrder.createdAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </DialogDescription>
                            </DialogHeader>
                            
                            {/* Scrollable Content */}
                            <div className="overflow-y-auto max-h-[calc(85vh-120px)] px-4 sm:px-6 py-4 space-y-5">
                              {/* Customer Information Card */}
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 rounded-lg p-4 border border-blue-200/50">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <h3 className="font-semibold text-sm sm:text-base">Customer Information</h3>
                                </div>
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  {selectedOrder.hasOrderOnlyOverride ? (
                                    <Badge variant="secondary">Order-only override active</Badge>
                                  ) : (
                                    <Badge variant="outline">Using original order snapshot</Badge>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openOverrideDialog(selectedOrder)}
                                  >
                                    Edit order-only customer info
                                  </Button>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                    <span className="text-muted-foreground font-medium min-w-[60px]">Name:</span>
                                    <span className="font-medium">{getEffectiveCustomerInfo(selectedOrder).name || 'N/A'}</span>
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                    <span className="text-muted-foreground font-medium min-w-[60px]">Email:</span>
                                    <span className="text-xs sm:text-sm break-all">{getEffectiveCustomerInfo(selectedOrder).email || 'N/A'}</span>
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                    <span className="text-muted-foreground font-medium min-w-[60px]">Phone:</span>
                                    <span>{getEffectiveCustomerInfo(selectedOrder).phoneNumber || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Delivery Information Card */}
                              <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 rounded-lg p-4 border border-green-200/50">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <Truck className="h-4 w-4 text-green-600" />
                                  </div>
                                  <h3 className="font-semibold text-sm sm:text-base">Delivery Information</h3>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                    <span className="text-muted-foreground font-medium min-w-[60px]">Area:</span>
                                    <span className="font-medium">{getEffectiveCustomerInfo(selectedOrder).area || 'N/A'}</span>
                                  </div>
                                  {getEffectiveCustomerInfo(selectedOrder).deliveryAddress && (
                                    <div className="mt-2 pt-2 border-t border-green-200/50">
                                      <p className="text-muted-foreground font-medium mb-1">Address:</p>
                                      <div className="pl-2 space-y-1">
                                        <p>
                                          {getEffectiveCustomerInfo(selectedOrder).deliveryAddress.unitNumber && `${getEffectiveCustomerInfo(selectedOrder).deliveryAddress.unitNumber}, `}
                                          {getEffectiveCustomerInfo(selectedOrder).deliveryAddress.streetAddress}
                                        </p>
                                        <p>{getEffectiveCustomerInfo(selectedOrder).deliveryAddress.postalCode}</p>
                                        <p>{getEffectiveCustomerInfo(selectedOrder).deliveryAddress.postalCode}</p>
                                        {getEffectiveCustomerInfo(selectedOrder).deliveryAddress.buzzCode && (
                                          <p className="flex items-center gap-1">
                                            <span className="text-muted-foreground">Buzz:</span>
                                            <span className="font-medium">{getEffectiveCustomerInfo(selectedOrder).deliveryAddress.buzzCode}</span>
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Subscription Items Card */}
                              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 rounded-lg p-4 border border-orange-200/50">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                                    <ShoppingCart className="h-4 w-4 text-orange-600" />
                                  </div>
                                  <h3 className="font-semibold text-sm sm:text-base">Subscription Items</h3>
                                </div>
                                <div className="space-y-3">
                                  {selectedOrder.items && selectedOrder.items.map((item: any, index: number) => (
                                    <div key={index} className="bg-white dark:bg-gray-900 rounded-lg p-3 border shadow-sm">
                                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                        <div className="flex-1">
                                          <p className="font-medium text-sm sm:text-base">{item.optionName || item.mealName}</p>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            📅 {item.date} • {item.day || item.dayName || item.dayId?.split('-')[0]}
                                          </p>
                                        </div>
                                        <Badge variant="secondary" className="self-start">
                                          × {item.quantity || 1}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Credit Cost */}
                              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 rounded-lg p-4 border border-purple-200/50">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                                    <Ticket className="h-4 w-4 text-purple-600" />
                                  </div>
                                  <h3 className="font-semibold text-sm sm:text-base">Credit Cost</h3>
                                </div>
                                <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded px-3 py-2">
                                  <span className="text-sm">Credits Used</span>
                                  <span className="font-bold text-purple-600">{selectedOrder.creditCost || 0}</span>
                                </div>
                              </div>

                              {/* Special Instructions */}
                              {getEffectiveCustomerInfo(selectedOrder).specialInstructions && (
                                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 rounded-lg p-4 border border-amber-200/50">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                                      <AlertCircle className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <h3 className="font-semibold text-sm sm:text-base">Special Request</h3>
                                  </div>
                                  <p className="text-sm bg-white dark:bg-gray-900 p-3 rounded-lg border">
                                    {getEffectiveCustomerInfo(selectedOrder).specialInstructions}
                                  </p>
                                </div>
                              )}

                              {/* Order Status */}
                              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950/20 dark:to-slate-900/10 rounded-lg p-4 border border-slate-200/50">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-500/10 flex items-center justify-center">
                                    <Package className="h-4 w-4 text-slate-600" />
                                  </div>
                                  <h3 className="font-semibold text-sm sm:text-base">Order Status</h3>
                                </div>
                                <OrderStatus status={selectedOrder.status} />
                                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                                  {selectedOrder.confirmedAt && (
                                    <p className="flex items-center gap-2">
                                      <CheckCircle className="h-3 w-3" />
                                      <span>Confirmed: {new Date(selectedOrder.confirmedAt).toLocaleDateString()} {new Date(selectedOrder.confirmedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </p>
                                  )}
                                  {selectedOrder.deliveredAt && (
                                    <p className="flex items-center gap-2">
                                      <Truck className="h-3 w-3" />
                                      <span>Delivered: {new Date(selectedOrder.deliveredAt).toLocaleDateString()} {new Date(selectedOrder.deliveredAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </p>
                                  )}
                                </div>
                              </div>

                              {getOrderUpdateLogs(selectedOrder).length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100/40 dark:from-blue-950/20 dark:to-blue-900/10 rounded-lg p-4 border border-blue-200/50">
                                  <h3 className="font-semibold text-sm sm:text-base mb-2">Order Update Notes</h3>
                                  <div className="space-y-2">
                                    {getOrderUpdateLogs(selectedOrder).slice(0, 10).map((log: any, idx: number) => (
                                      <div key={`${log.updatedAt || idx}-${idx}`} className="text-sm bg-white dark:bg-gray-900 p-3 rounded border">
                                        <p className="font-medium">
                                          {new Date(log.updatedAt).toLocaleString()}
                                          {log.updatedBy ? ` • ${log.updatedBy}` : ''}
                                        </p>
                                        <p className="text-muted-foreground mt-1">
                                          Updated: {Array.isArray(log.changedFields) && log.changedFields.length > 0 ? log.changedFields.join(', ') : 'customer info'}
                                        </p>
                                        {Array.isArray(log.changedDetails) && log.changedDetails.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            {log.changedDetails.map((detail: any, detailIdx: number) => (
                                              <p key={`${detail.field}-${detailIdx}`} className="text-xs text-muted-foreground">
                                                {detail.field}: {detail.from}{' -> '}{detail.to}
                                              </p>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col justify-center items-center py-16">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                            <span className="text-sm text-muted-foreground">Loading order details...</span>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="ml-2">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => updateOrderStatus(order.orderId, 'pending')} disabled={order.status === 'pending' || isUpdating}>Set to Pending</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateOrderStatus(order.orderId, 'confirmed')} disabled={order.status === 'confirmed' || isUpdating}>Set to Confirmed</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateOrderStatus(order.orderId, 'delivery')} disabled={order.status === 'delivery' || isUpdating}>Set to Delivery</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateOrderStatus(order.orderId, 'delivered')} disabled={order.status === 'delivered' || isUpdating}>Set to Delivered</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => updateOrderStatus(order.orderId, 'cancelled')} disabled={order.status === 'cancelled' || isUpdating} className="text-red-600">Cancel Order</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateOrderStatus(order.orderId, 'refunded')} disabled={order.status === 'refunded' || isUpdating} className="text-orange-600">Mark as Refunded</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No orders found.</p>
            )}
          </div>
          </>
        )}
        
        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {orders.length > 0 ? (
              <>Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders</>
            ) : (
              <>No orders found</>
            )}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => handlePagination('prev')}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.pages}
              onClick={() => handlePagination('next')}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
      
      <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order-Only Customer Info</DialogTitle>
            <DialogDescription>
              This updates this order only and does not change user profile or future orders.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="override-name">Name</Label>
              <Input
                id="override-name"
                value={overrideForm.name}
                onChange={(e) => setOverrideForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="override-phone">Phone Number</Label>
                <Input
                  id="override-phone"
                  value={overrideForm.phoneNumber}
                  onChange={(e) => setOverrideForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="override-area">Area</Label>
                <Select
                  value={overrideForm.area || 'all'}
                  onValueChange={(value) =>
                    setOverrideForm((prev) => ({ ...prev, area: value === 'all' ? '' : value }))
                  }
                >
                  <SelectTrigger id="override-area">
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">No override (use original)</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="override-unit">Unit Number</Label>
              <Input
                id="override-unit"
                value={overrideForm.deliveryAddress.unitNumber}
                onChange={(e) =>
                  setOverrideForm((prev) => ({
                    ...prev,
                    deliveryAddress: { ...prev.deliveryAddress, unitNumber: e.target.value }
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="override-street">Street Address</Label>
              <Input
                id="override-street"
                value={overrideForm.deliveryAddress.streetAddress}
                onChange={(e) =>
                  setOverrideForm((prev) => ({
                    ...prev,
                    deliveryAddress: { ...prev.deliveryAddress, streetAddress: e.target.value }
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2 md:col-span-1">
                <Label htmlFor="override-postal">Postal Code</Label>
                <Input
                  id="override-postal"
                  value={overrideForm.deliveryAddress.postalCode}
                  onChange={(e) =>
                    setOverrideForm((prev) => ({
                      ...prev,
                      deliveryAddress: { ...prev.deliveryAddress, postalCode: e.target.value }
                    }))
                  }
                />
              </div>
              <div className="grid gap-2 md:col-span-1">
                <Label htmlFor="override-country">Country</Label>
                <Input
                  id="override-country"
                  value={overrideForm.deliveryAddress.country}
                  onChange={(e) =>
                    setOverrideForm((prev) => ({
                      ...prev,
                      deliveryAddress: { ...prev.deliveryAddress, country: e.target.value }
                    }))
                  }
                />
              </div>
              <div className="grid gap-2 md:col-span-1">
                <Label htmlFor="override-buzz">Buzz Code</Label>
                <Input
                  id="override-buzz"
                  value={overrideForm.deliveryAddress.buzzCode}
                  onChange={(e) =>
                    setOverrideForm((prev) => ({
                      ...prev,
                      deliveryAddress: { ...prev.deliveryAddress, buzzCode: e.target.value }
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="override-special">Special Request</Label>
              <Input
                id="override-special"
                value={overrideForm.specialInstructions}
                onChange={(e) => setOverrideForm((prev) => ({ ...prev, specialInstructions: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitOrderOnlyOverride} disabled={isSavingOverride}>
              {isSavingOverride ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Order-Only Override'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Order Dialog */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, orderId: '', returnCredits: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Order Without Notice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete order <strong>{deleteDialog.orderId}</strong>? 
              This action cannot be undone and the user will NOT be notified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center space-x-2 py-4">
            <Checkbox 
              id="returnCredits" 
              checked={deleteDialog.returnCredits}
              onCheckedChange={(checked) => 
                setDeleteDialog(prev => ({ ...prev, returnCredits: checked as boolean }))
              }
            />
            <label
              htmlFor="returnCredits"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Return consumed weekly voucher / credits to user
            </label>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ isOpen: false, orderId: '', returnCredits: false })}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteOrderWithoutNotice}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
