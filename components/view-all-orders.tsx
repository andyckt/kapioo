"use client"

import { useState, useEffect } from "react"
import { Truck, CheckCircle, Clock, Package, AlertCircle, Loader2, Search, Filter, RefreshCcw, MoreHorizontal, Download, Calendar, X, Check, CheckSquare, Users, ShoppingCart, Eye, Ticket } from "lucide-react"

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
    startDate: '',
    endDate: '',
    area: '',
    deliveryStartDate: '',
    deliveryEndDate: '',
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

  // Fetch orders with pagination and filters
  const fetchOrders = async (page = 1) => {
    setIsLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })
      
      // Add status filter if selected and not "all"
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status)
      }
      
      // Add search filter if provided
      if (filters.search) {
        params.append('search', filters.search)
      }
      
      // Add date range filters if provided
      if (filters.startDate) {
        params.append('startDate', filters.startDate)
      }
      
      if (filters.endDate) {
        params.append('endDate', filters.endDate)
      }
      
      // Add area filter if provided
      if (filters.area && filters.area !== 'all') {
        params.append('area', filters.area)
      }
      
      // Add delivery date range filters if provided
      if (filters.deliveryStartDate) {
        params.append('deliveryStartDate', filters.deliveryStartDate)
      }
      
      if (filters.deliveryEndDate) {
        params.append('deliveryEndDate', filters.deliveryEndDate)
      }
      
      // Add combo name filter if provided
      if (filters.comboName && filters.comboName !== 'all') {
        params.append('comboName', filters.comboName)
      }
      
      const response = await fetch(`/api/admin/daily-delivery/orders?${params.toString()}`)
      const data = await response.json()
      
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
      console.error("Error fetching orders:", error)
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
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
        // Provide default areas if none are returned from the API
        setAreas([
          'Downtown',
          'Midtown',
          'North York',
          'Markham',
          'Richmond Hill',
          'Scarborough',
          'Etobicoke',
          'Mississauga',
          'Vaughan'
        ])
      }
    } catch (error) {
      console.error('Error fetching areas:', error)
      // Set default areas on error
      setAreas([
        'Downtown',
        'Midtown',
        'North York',
        'Markham',
        'Richmond Hill',
        'Scarborough',
        'Etobicoke',
        'Mississauga',
        'Vaughan'
      ])
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
      
      // Add date range filters if provided
      if (filters.startDate) {
        params.append('startDate', filters.startDate)
      }
      
      if (filters.endDate) {
        params.append('endDate', filters.endDate)
      }
      
      // Add area filter if provided
      if (filters.area && filters.area !== 'all') {
        params.append('area', filters.area)
      }
      
      // Add delivery date range filters if provided
      if (filters.deliveryStartDate) {
        params.append('deliveryStartDate', filters.deliveryStartDate)
      }
      
      if (filters.deliveryEndDate) {
        params.append('deliveryEndDate', filters.deliveryEndDate)
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
    fetchOrders()
  }, [filters.status, filters.area, filters.startDate, filters.endDate, filters.search, filters.deliveryStartDate, filters.deliveryEndDate, filters.comboName])
  
  // Load areas, delivery dates, and combo names when component mounts
  useEffect(() => {
    fetchAreas()
    fetchDeliveryDates()
    fetchComboNames()
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
  const formatAddress = (address: any) => {
    if (!address) return "No address provided"
    
    let formattedAddress = ''
    
    if (address.unitNumber) {
      formattedAddress += `Unit ${address.unitNumber}, `
    }
    
    formattedAddress += address.streetAddress || ''
    
    if (address.city || address.province || address.postalCode) {
      formattedAddress += `, ${address.city || ''} ${address.province || ''} ${address.postalCode || ''}`
    }
    
    if (address.country) {
      formattedAddress += `, ${address.country}`
    }
    
    return formattedAddress
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Ordered Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startDate"
                    type="date"
                    className="pl-8"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Ordered End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="date"
                    className="pl-8"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
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
                <Label htmlFor="deliveryStartDate">Delivery Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="deliveryStartDate"
                    type="date"
                    className="pl-8"
                    value={filters.deliveryStartDate}
                    onChange={(e) => setFilters({...filters, deliveryStartDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryEndDate">Delivery End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="deliveryEndDate"
                    type="date"
                    className="pl-8"
                    value={filters.deliveryEndDate}
                    onChange={(e) => setFilters({...filters, deliveryEndDate: e.target.value})}
                  />
                </div>
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
                    startDate: '',
                    endDate: '',
                    area: '',
                    deliveryStartDate: '',
                    deliveryEndDate: '',
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
                            {order.user?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {order.user?.email || 'N/A'}
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
                            {order.area || 'Area not specified'}
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
                                  <div className="space-y-2 text-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                      <span className="text-muted-foreground font-medium min-w-[60px]">Name:</span>
                                      <span className="font-medium">{selectedOrder.user?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                      <span className="text-muted-foreground font-medium min-w-[60px]">Email:</span>
                                      <span className="text-xs sm:text-sm break-all">{selectedOrder.user?.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                      <span className="text-muted-foreground font-medium min-w-[60px]">Phone:</span>
                                      <span>{selectedOrder.phoneNumber || 'N/A'}</span>
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
                                      <span className="font-medium">{selectedOrder.area || 'N/A'}</span>
                                    </div>
                                    {selectedOrder.deliveryAddress && (
                                      <div className="mt-2 pt-2 border-t border-green-200/50">
                                        <p className="text-muted-foreground font-medium mb-1">Address:</p>
                                        <div className="pl-2 space-y-1">
                                          <p>
                                            {selectedOrder.deliveryAddress.unitNumber && `${selectedOrder.deliveryAddress.unitNumber}, `}
                                            {selectedOrder.deliveryAddress.streetAddress}
                                          </p>
                                          <p>
                                            {selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.province}
                                          </p>
                                          <p>{selectedOrder.deliveryAddress.postalCode}</p>
                                          {selectedOrder.deliveryAddress.buzzCode && (
                                            <p className="flex items-center gap-1">
                                              <span className="text-muted-foreground">Buzz:</span>
                                              <span className="font-medium">{selectedOrder.deliveryAddress.buzzCode}</span>
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
                                {selectedOrder.specialInstructions && (
                                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 rounded-lg p-4 border border-amber-200/50">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                                        <AlertCircle className="h-4 w-4 text-amber-600" />
                                      </div>
                                      <h3 className="font-semibold text-sm sm:text-base">Special Instructions</h3>
                                    </div>
                                    <p className="text-sm bg-white dark:bg-gray-900 p-3 rounded-lg border">
                                      {selectedOrder.specialInstructions}
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
                          {order.user?.name || 'Unknown'}
                          <div className="text-xs text-muted-foreground">
                            {order.user?.email || ''}
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
                              {order.items.map((item: any, index: number) => (
                                <div key={index} className={index > 0 ? 'mt-1' : ''}>
                                  {item.comboName} ({item.type === 'A' ? '2菜' : '3菜'}) x{item.quantity}
                                </div>
                              ))}
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <OrderStatus status={order.status} />
                        </td>
                        <td className="p-4 align-middle">{order.area || 'N/A'}</td>
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
                                    </div>
                                    
                                    {/* Order details section */}
                                    <div className="grid gap-3 text-sm border-t pt-3">
                                      {/* Customer info */}
                                      <div>
                                        <h3 className="font-semibold mb-1">Customer</h3>
                                        <p className="text-muted-foreground">
                                          {selectedOrder.user?.name || 'Unknown'}
                                          {selectedOrder.user?.email && (
                                            <span className="block">{selectedOrder.user.email}</span>
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
                                            {selectedOrder.area || 'N/A'}
                                          </p>
                                        </div>
                                        
                                        <div>
                                          <h3 className="font-semibold mb-1">Phone Number</h3>
                                          <p className="text-muted-foreground">
                                            {selectedOrder.phoneNumber || 'N/A'}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h3 className="font-semibold mb-1">Delivery Address</h3>
                                        <p className="text-muted-foreground">
                                          {formatAddress(selectedOrder.deliveryAddress)}
                                        </p>
                                      </div>
                                      
                                      {selectedOrder.specialInstructions && (
                                        <div>
                                          <h3 className="font-semibold mb-1">Special Instructions</h3>
                                          <p className="text-muted-foreground">
                                            {selectedOrder.specialInstructions}
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
    </Card>
  )
}