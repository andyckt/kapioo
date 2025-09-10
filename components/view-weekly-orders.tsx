"use client"

import { useState, useEffect } from "react"
import { Truck, CheckCircle, Clock, Package, AlertCircle, Loader2, Search, Filter, RefreshCcw, MoreHorizontal } from "lucide-react"

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

export function ViewWeeklyOrders() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  })
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  })
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
      
      // Add status filter if selected
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status)
      }
      
      // Add search filter if provided
      if (filters.search) {
        params.append('search', filters.search)
      }
      
      const response = await fetch(`/api/admin/weekly-subscription/orders?${params.toString()}`)
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
          description: "Failed to load weekly subscription orders",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({
        title: "Error",
        description: "Failed to load weekly subscription orders",
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
  
  // Load orders when component mounts or filters change
  useEffect(() => {
    fetchOrders()
  }, [filters.status])
  
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
      <CardHeader>
        <CardTitle>All Weekly Subscription Orders</CardTitle>
        <CardDescription>View and manage all weekly subscription orders</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
          <Button variant="outline" className="flex items-center gap-1">
            <Filter className="h-4 w-4" />
            More Filters
          </Button>
        </div>

        {/* Orders Table */}
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading orders...</span>
          </div>
        ) : (
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-4 text-left align-middle font-medium">Order ID</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Customer</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Date</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-10 px-4 text-left align-middle font-medium">Area</th>
                    <th className="h-10 px-4 text-right align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order._id} className="border-b transition-colors hover:bg-muted/50">
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
                            <DialogContent className="sm:max-w-[600px]">
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
                                  
                                  <div className="py-4">
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
                                      
                                      {/* Subscription details */}
                                      <div>
                                        <h3 className="font-semibold mb-1">Subscription Details</h3>
                                        <ul className="ml-5 list-disc space-y-1">
                                          {selectedOrder.items && selectedOrder.items.map((item: any, index: number) => (
                                            <li key={index}>
                                              <span className="font-medium">{item.day || item.dayName}</span>
                                              {item.date && <span> ({item.date})</span>}: {item.optionName || item.mealName}
                                              {item.quantity > 1 && <span className="text-muted-foreground ml-1">x{item.quantity}</span>}
                                            </li>
                                          ))}
                                        </ul>
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
