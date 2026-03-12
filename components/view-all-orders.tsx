"use client"

import { useState, useEffect } from "react"
import { Truck, CheckCircle, Clock, Package, AlertCircle, Loader2, Search, Filter, RefreshCcw, MoreHorizontal, Download, Calendar, X, Check, CheckSquare, Users, ShoppingCart, Eye, Ticket, Trash2 } from "lucide-react"
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

export function ViewAllOrders() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [selectAllChecked, setSelectAllChecked] = useState(false)
  const [isBatchUpdating, setIsBatchUpdating] = useState(false)
  const [batchStatus, setBatchStatus] = useState<string | null>(null)
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
    deliveryDateEnd: '',
    comboName: 'all'
  })
  const [comboNames, setComboNames] = useState<string[]>([])
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
    returnVouchers: false
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
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })
      if (filters.status && filters.status !== 'all') params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)
      if (filters.area && filters.area !== 'all') params.append('area', filters.area)
      if (filters.deliveryDate) params.append('deliveryDate', filters.deliveryDate)
      if (filters.deliveryDateEnd) params.append('deliveryDateEnd', filters.deliveryDateEnd)
      if (filters.comboName && filters.comboName !== 'all') params.append('comboName', filters.comboName)
      
      const response = await fetch(`/api/admin/daily-delivery/orders?${params.toString()}`, { signal: options?.signal })
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
          description: "Failed to load orders",
          variant: "destructive"
        })
      }
    } catch (error) {
      if (options?.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) return
      console.error("Error fetching orders:", error)
      toast({
        title: "Error",
        description: "Failed to load orders",
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
      const response = await fetch(`/api/admin/daily-delivery/orders/${orderId}`)
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
  
  // Fetch unique combo names for filter dropdown
  const fetchComboNames = async () => {
    try {
      console.log('Fetching combo names...')
      const response = await fetch('/api/admin/daily-delivery/orders/combos')
      const data = await response.json()
      console.log('Combo names API response:', data)
      
      if (data.success && data.comboNames && data.comboNames.length > 0) {
        console.log('Setting combo names:', data.comboNames)
        setComboNames(data.comboNames)
      } else {
        console.log('No combo names found or invalid response format')
        setComboNames([])
      }
    } catch (error) {
      console.error('Error fetching combo names:', error)
      setComboNames([])
    }
  }

  // Fetch unique delivery dates for filter dropdown
  const fetchDeliveryDates = async () => {
    try {
      console.log('Fetching delivery dates...')
      const response = await fetch('/api/admin/daily-delivery/orders/delivery-dates')
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
      const response = await fetch('/api/admin/daily-delivery/orders/areas')
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
      
      // Add delivery date filter if provided
      if (filters.deliveryDate) {
        params.append('deliveryDate', filters.deliveryDate)
      }
      
      // Add delivery date end filter if provided
      if (filters.deliveryDateEnd) {
        params.append('deliveryDateEnd', filters.deliveryDateEnd)
      }
      
      // Add combo name filter if provided
      if (filters.comboName && filters.comboName !== 'all') {
        params.append('comboName', filters.comboName)
      }

      // Create a link to download the CSV
      const link = document.createElement('a')
      link.href = `/api/admin/daily-delivery/orders/export?${params.toString()}`
      link.setAttribute('download', `daily-delivery-orders-${new Date().toISOString().split('T')[0]}.csv`)
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
  }, [filters.status, filters.area, filters.search, filters.deliveryDate, filters.deliveryDateEnd, filters.comboName])
  
  // Load areas, delivery dates, and combo names when component mounts
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    const run = async () => {
      try {
        const [areasRes, datesRes, combosRes] = await Promise.all([
          fetch('/api/admin/daily-delivery/orders/areas', { signal }),
          fetch('/api/admin/daily-delivery/orders/delivery-dates', { signal }),
          fetch('/api/admin/daily-delivery/orders/combos', { signal })
        ])
        if (signal.aborted) return
        const [areasData, datesData, combosData] = await Promise.all([areasRes.json(), datesRes.json(), combosRes.json()])
        if (signal.aborted) return
        if (areasData.success && areasData.areas?.length > 0) setAreas(areasData.areas)
        else setAreas([...ALL_WEEKLY_AREAS])
        if (datesData.success && datesData.deliveryDates?.length > 0) setDeliveryDates(datesData.deliveryDates)
        else setDeliveryDates([])
        if (combosData.success && combosData.comboNames?.length > 0) setComboNames(combosData.comboNames)
        else setComboNames([])
      } catch (e) {
        if (signal.aborted || (e instanceof Error && e.name === 'AbortError')) return
        setAreas([...ALL_WEEKLY_AREAS])
        setDeliveryDates([])
        setComboNames([])
      }
    }
    run()
    return () => controller.abort()
  }, [])
  
  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/daily-delivery/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Update the order in the list
        setOrders(orders.map(order => 
          order.orderId === orderId ? { ...order, status: newStatus } : order
        ))
        
        // Update selected order if it's the one being viewed
        if (selectedOrder && selectedOrder.orderId === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus })
        }
        
        toast({
          title: "Status Updated",
          description: `Order ${orderId} status changed to ${newStatus}. Email notification sent to customer.`,
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
    const { orderId, returnVouchers } = deleteDialog
    setIsUpdating(true)
    try {
      const url = `/api/admin/daily-delivery/orders/${orderId}${returnVouchers ? '?returnVouchers=true' : ''}`
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
          description: data.message || `Order ${orderId} deleted successfully without notification${returnVouchers ? ' (vouchers returned)' : ''}.`,
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
      setDeleteDialog({ isOpen: false, orderId: '', returnVouchers: false })
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
          fetch(`/api/admin/daily-delivery/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus }),
          }).then(res => res.json())
        )
      )
      
      // Count successes and failures
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value?.success ?? false)).length
      const failed = results.length - successful
      
      // Update orders in the UI
      setOrders(orders.map(order => 
        selectedOrders.has(order.orderId) ? { ...order, status: newStatus } : order
      ))
      
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
      const response = await fetch(`/api/admin/daily-delivery/orders/${overrideOrderId}/customer-info`, {
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
          <CardTitle>All Daily Delivery Orders</CardTitle>
          <CardDescription>View and manage all daily delivery orders</CardDescription>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
              <div className="space-y-2">
                <Label htmlFor="comboName">Combo Name</Label>
                <Select
                  value={filters.comboName}
                  onValueChange={(value) => setFilters({...filters, comboName: value})}
                >
                  <SelectTrigger id="comboName">
                    <SelectValue placeholder="Select combo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Combos</SelectItem>
                    {comboNames.map((combo) => (
                      <SelectItem key={combo} value={combo}>{combo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    comboName: 'all'
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
            {/* Mobile Card View - Hidden on Desktop */}
            <div className="block md:hidden space-y-4">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <Card key={order._id} className="overflow-hidden border shadow-sm">
                    {/* Card Header with Order ID and Status */}
                    <CardHeader className="bg-muted/30 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div 
                              className="cursor-pointer flex items-center justify-center w-5 h-5 rounded border-2 border-muted-foreground/30"
                              onClick={() => toggleOrderSelection(order.orderId)}
                            >
                              {selectedOrders.has(order.orderId) && (
                                <Check className="h-3.5 w-3.5 text-primary font-bold" />
                              )}
                            </div>
                            <CardTitle className="text-base font-semibold">
                              {order.orderId}
                            </CardTitle>
                          </div>
                          <CardDescription className="text-xs">
                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </CardDescription>
                        </div>
                        <OrderStatus status={order.status} />
                      </div>
                    </CardHeader>

                    {/* Card Content */}
                    <CardContent className="pt-4 pb-3 space-y-3">
                      {/* Customer Info */}
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {getEffectiveCustomerInfo(order).name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {getEffectiveCustomerInfo(order).email || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Delivery Info */}
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <Truck className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {order.items && order.items.length > 0 ? (
                              <>
                                {order.items[0].date}
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({order.items[0].day ? order.items[0].day.split('-')[0] : ''})
                                </span>
                              </>
                            ) : (
                              'N/A'
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getEffectiveCustomerInfo(order).area || 'Area not specified'}
                          </p>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <ShoppingCart className="h-4 w-4 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Order Items
                          </p>
                          {order.items && order.items.length > 0 ? (
                            <div className="space-y-1">
                              {order.items.map((item: any, index: number) => (
                                <div key={index} className="text-sm bg-muted/50 px-2 py-1 rounded">
                                  <span className="font-medium">{item.comboName}</span>
                                  <span className="text-muted-foreground mx-1">•</span>
                                  <span className="text-xs">
                                    {item.type === 'A' ? '2菜' : '3菜'}
                                  </span>
                                  <span className="text-muted-foreground mx-1">×</span>
                                  <span className="font-medium">{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No items</p>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    {/* Card Footer with Actions */}
                    <CardFooter className="bg-muted/10 pt-3 pb-3 flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
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

                                {/* Order Items Card */}
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 rounded-lg p-4 border border-orange-200/50">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                                      <ShoppingCart className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <h3 className="font-semibold text-sm sm:text-base">Order Items</h3>
                                  </div>
                                  <div className="space-y-3">
                                    {selectedOrder.items && selectedOrder.items.map((item: any, index: number) => (
                                      <div key={index} className="bg-white dark:bg-gray-900 rounded-lg p-3 border shadow-sm">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                          <div className="flex-1">
                                            <p className="font-medium text-sm sm:text-base">{item.comboName}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              📅 {item.date} • {item.day}
                                            </p>
                                          </div>
                                          <Badge variant="secondary" className="self-start">
                                            {item.type === 'A' ? '2菜' : '3菜'} × {item.quantity}
                                          </Badge>
                                        </div>
                                        {item.dishes && item.dishes.length > 0 && (
                                          <div className="mt-3 pt-3 border-t">
                                            <p className="text-xs font-medium text-muted-foreground mb-2">Dishes:</p>
                                            <ul className="text-sm space-y-1.5">
                                              {item.dishes.map((dish: any, dishIndex: number) => (
                                                <li key={dishIndex} className="flex items-start gap-2">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                                  <span className="flex-1">{typeof dish === 'string' ? dish : dish.name}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Vouchers Used */}
                                {(selectedOrder.twoDishVouchersUsed > 0 || selectedOrder.threeDishVouchersUsed > 0) && (
                                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 rounded-lg p-4 border border-purple-200/50">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                                        <Ticket className="h-4 w-4 text-purple-600" />
                                      </div>
                                      <h3 className="font-semibold text-sm sm:text-base">Vouchers Used</h3>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                      {selectedOrder.twoDishVouchersUsed > 0 && (
                                        <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded px-3 py-2">
                                          <span>2-Dish Vouchers</span>
                                          <span className="font-bold text-purple-600">{selectedOrder.twoDishVouchersUsed}</span>
                                        </div>
                                      )}
                                      {selectedOrder.threeDishVouchersUsed > 0 && (
                                        <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded px-3 py-2">
                                          <span>3-Dish Vouchers</span>
                                          <span className="font-bold text-purple-600">{selectedOrder.threeDishVouchersUsed}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

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
                          <Button variant="outline" size="sm" className="px-3">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
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
                          <DropdownMenuItem 
                            onClick={() => updateOrderStatus(order.orderId, 'cancelled')}
                            disabled={order.status === 'cancelled' || isUpdating}
                          >
                            Set to Cancelled
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateOrderStatus(order.orderId, 'refunded')}
                            disabled={order.status === 'refunded' || isUpdating}
                          >
                            Set to Refunded
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No orders found</p>
                </div>
              )}
            </div>

            {/* Desktop Table View - Hidden on Mobile */}
            <div className="hidden md:block rounded-md border">
              <div className="overflow-x-auto">
              {/* Batch Actions - Mobile Friendly */}
              {selectedOrders.size > 0 && (
                <div className="mb-4 p-4 bg-muted/30 border rounded-lg">
                  {/* Mobile: Stack vertically */}
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <span className="text-sm font-medium">
                      {selectedOrders.size} {selectedOrders.size === 1 ? 'order' : 'orders'} selected
                    </span>
                    <div className="hidden md:block md:flex-1"></div>
                    
                    {/* Action Controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                      <span className="text-sm hidden sm:inline">Update status to:</span>
                      <Select
                        value={batchStatus || ""}
                        onValueChange={setBatchStatus}
                        disabled={isBatchUpdating}
                      >
                        <SelectTrigger className="w-full sm:w-[180px]">
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
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => batchStatus && updateSelectedOrdersStatus(batchStatus)}
                          disabled={isBatchUpdating || !batchStatus}
                          className="flex-1 sm:flex-none"
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
                          className="flex-1 sm:flex-none"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
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
                    <th className="h-10 px-4 text-left align-middle font-medium">Delivery Date</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Order Items</th>
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
                          <div className="text-xs text-muted-foreground">
                            {getEffectiveCustomerInfo(order).email || ''}
                          </div>
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
                            <>
                              {order.items[0].date}
                              <div className="text-xs text-muted-foreground">
                                {order.items[0].day ? order.items[0].day.split('-')[0] : ''}
                              </div>
                            </>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          {order.items && order.items.length > 0 ? (
                            <div className="max-w-[200px] truncate">
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
                                  <div key={index} className={index > 0 ? 'mt-1' : ''}>
                                    {item.comboName} ({item.type === 'A' ? '2菜' : '3菜'}) x{item.quantity}
                                  </div>
                                ));
                              })()}
                            </div>
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
                                onClick={() => setDeleteDialog({ isOpen: true, orderId: order.orderId, returnVouchers: false })}
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
                                      
                                      {/* Items ordered */}
                                      <div>
                                        <h3 className="font-semibold mb-2">Ordered Items</h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                          {selectedOrder.items.map((item: any, index: number) => (
                                            <div key={index} className="border rounded-lg p-3 bg-muted/30">
                                              <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-medium truncate">{item.comboName}</p>
                                                  <p className="text-xs text-muted-foreground">
                                                    {item.date} ({item.day ? item.day.split('-')[0].charAt(0).toUpperCase() + item.day.split('-')[0].slice(1) : ''})
                                                  </p>
                                                </div>
                                                <Badge variant="secondary" className="ml-2 flex-shrink-0">
                                                  {item.type === 'A' ? '2菜' : '3菜'} × {item.quantity}
                                                </Badge>
                                              </div>
                                              {item.dishes && item.dishes.length > 0 && (
                                                <div className="mt-2 pt-2 border-t">
                                                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Dishes:</p>
                                                  <ul className="text-xs space-y-1">
                                                    {item.dishes.map((dish: any, dishIndex: number) => (
                                                      <li key={dishIndex} className="flex items-start gap-1.5">
                                                        <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                                        <span className="flex-1 leading-tight">{typeof dish === 'string' ? dish : dish.name}</span>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
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
                                      
                                      <div>
                                        <h3 className="font-semibold mb-1">Vouchers Used</h3>
                                        <p className="text-muted-foreground">
                                          2菜: {selectedOrder.voucherCost?.twoDish || 0}, 
                                          3菜: {selectedOrder.voucherCost?.threeDish || 0}
                                        </p>
                                      </div>
                                    </div>

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
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">
                        {isLoading ? "" : "No orders found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, orderId: '', returnVouchers: false })}>
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
              id="returnVouchers" 
              checked={deleteDialog.returnVouchers}
              onCheckedChange={(checked) => 
                setDeleteDialog(prev => ({ ...prev, returnVouchers: checked as boolean }))
              }
            />
            <label
              htmlFor="returnVouchers"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Return vouchers to user
            </label>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ isOpen: false, orderId: '', returnVouchers: false })}
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