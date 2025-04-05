"use client"

import { useState, useEffect } from "react"
import { Truck, CheckCircle, Clock, Package, AlertCircle, Loader2, Search, Filter, RefreshCcw } from "lucide-react"

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
          Out for Delivery
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

// Format address for display
function formatAddress(address: any) {
  if (!address) return "No address provided";
  
  let formattedAddress = '';
  
  if (address.unitNumber) {
    formattedAddress += `Unit ${address.unitNumber}, `;
  }
  
  formattedAddress += address.streetAddress || '';
  
  if (address.city || address.province || address.postalCode) {
    formattedAddress += `, ${address.city || ''} ${address.province || ''} ${address.postalCode || ''}`;
  }
  
  if (address.country) {
    formattedAddress += `, ${address.country}`;
  }
  
  return formattedAddress;
}

// Format selected meals for display
function formatSelectedMeals(selectedMeals: Record<string, any>) {
  if (!selectedMeals) return "None";
  
  return Object.entries(selectedMeals)
    .filter(([_, value]) => {
      // Handle both old and new structure
      return typeof value === 'boolean' ? value : value.selected;
    })
    .map(([day, value]) => {
      const formattedDay = day.charAt(0).toUpperCase() + day.slice(1);
      
      // Handle both old and new structure
      if (typeof value === 'object' && value.date) {
        return `${formattedDay} (${value.date})`;
      }
      
      return formattedDay;
    })
    .join(', ');
}

export function OrderManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [refundOrderDialog, setRefundOrderDialog] = useState<{ open: boolean, order: any | null }>({ 
    open: false, 
    order: null 
  });
  const [cancelOrderDialog, setCancelOrderDialog] = useState<{ 
    open: boolean, 
    order: any | null,
    refundCredits: boolean 
  }>({ 
    open: false, 
    order: null,
    refundCredits: false
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const { toast } = useToast();

  // Fetch all orders with optional status filter
  const fetchOrders = async (page = 1, status = '') => {
    setIsLoading(true);
    try {
      const url = new URL('/api/orders', window.location.origin);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', pagination.limit.toString());
      
      if (status && status !== 'all') {
        url.searchParams.append('status', status);
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data.orders);
        setFilteredOrders(data.data.orders);
        setPagination({
          page: data.data.page,
          limit: data.data.limit,
          total: data.data.total,
          pages: Math.ceil(data.data.total / data.data.limit)
        });
      } else {
        console.error("Error fetching orders:", data.error);
        toast({
          title: "Error",
          description: "Failed to load orders",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading orders",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get order details
  const fetchOrderDetails = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedOrder(data.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load order details",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  // Add new method to handle refund confirmation
  const handleRefundOrder = (order: any) => {
    setRefundOrderDialog({ open: true, order });
  };

  // Add new method to handle cancel confirmation
  const handleCancelOrder = (order: any) => {
    setCancelOrderDialog({ 
      open: true, 
      order,
      refundCredits: false 
    });
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string, refundCredits?: boolean) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: newStatus,
          refundCredits: refundCredits // Pass the refund option to the API
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        const updatedOrders = orders.map(order => 
          order.orderId === orderId ? { ...order, status: newStatus } : order
        );
        setOrders(updatedOrders);
        setFilteredOrders(updatedOrders);
        
        // If selected order is the one we just updated, update it too
        if (selectedOrder && selectedOrder.orderId === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
        
        // Close refund dialog if it was open
        setRefundOrderDialog({ open: false, order: null });
        
        // Close cancel dialog if it was open
        setCancelOrderDialog({ open: false, order: null, refundCredits: false });
        
        toast({
          title: "Status updated",
          description: `Order ${orderId} status changed to ${newStatus}${refundCredits ? ' with credit refund' : ''}`,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update order status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  // Load orders when component mounts
  useEffect(() => {
    fetchOrders();
  }, []);

  // Handle pagination
  const handlePagination = (direction: 'prev' | 'next') => {
    const newPage = direction === 'prev' 
      ? Math.max(1, pagination.page - 1)
      : Math.min(pagination.pages, pagination.page + 1);
      
    if (newPage !== pagination.page) {
      fetchOrders(newPage, statusFilter !== 'all' ? statusFilter : '');
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    fetchOrders(1, status !== 'all' ? status : '');
  };

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredOrders(orders);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = orders.filter(order => 
      order.orderId.toLowerCase().includes(query) || 
      (order.userId.name && order.userId.name.toLowerCase().includes(query)) || 
      (order.userId.email && order.userId.email.toLowerCase().includes(query))
    );
    
    setFilteredOrders(filtered);
    
    if (filtered.length === 0) {
      toast({
        title: "No matches",
        description: `No orders found matching "${searchQuery}"`,
      });
    }
  };

  // Reset search
  const resetSearch = () => {
    setSearchQuery('');
    setFilteredOrders(orders);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>View and manage customer orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex gap-2 flex-1">
              <Input
                placeholder="Search by order ID or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="max-w-sm"
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              {searchQuery && (
                <Button variant="ghost" onClick={resetSearch} size="sm">
                  Clear
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter" className="mr-2">Status:</Label>
              <Select 
                value={statusFilter} 
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger id="status-filter" className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading orders...</span>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-4 font-medium">Order ID</th>
                    <th className="text-left p-4 font-medium">Customer</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Meals</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-center p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className="border-t">
                      <td className="p-4 font-medium">{order.orderId}</td>
                      <td className="p-4">
                        {order.userId && typeof order.userId === 'object' ? (
                          <div>
                            <div>{order.userId.name}</div>
                            <div className="text-sm text-muted-foreground">{order.userId.email}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">User ID: {order.userId}</span>
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="p-4">
                        {formatSelectedMeals(order.selectedMeals)}
                      </td>
                      <td className="p-4">
                        <OrderStatus status={order.status} />
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => fetchOrderDetails(order.orderId)}
                              >
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                              {selectedOrder && selectedOrder.orderId === order.orderId ? (
                                <>
                                  <DialogHeader>
                                    <div className="flex justify-between items-center">
                                      <DialogTitle>Order {selectedOrder.orderId}</DialogTitle>
                                      <OrderStatus status={selectedOrder.status} />
                                    </div>
                                    <DialogDescription>
                                      Placed on {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="py-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                      <div>
                                        <h3 className="font-semibold mb-2">Customer Information</h3>
                                        <div className="space-y-1 text-sm">
                                          {selectedOrder.userId && typeof selectedOrder.userId === 'object' ? (
                                            <>
                                              <p><span className="font-medium">Name:</span> {selectedOrder.userId.name}</p>
                                              <p><span className="font-medium">Email:</span> {selectedOrder.userId.email}</p>
                                              <p><span className="font-medium">User ID:</span> {selectedOrder.userId.userID}</p>
                                            </>
                                          ) : (
                                            <p><span className="font-medium">User ID:</span> {selectedOrder.userId}</p>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h3 className="font-semibold mb-2">Order Details</h3>
                                        <div className="space-y-1 text-sm">
                                          <p><span className="font-medium">Credits Used:</span> {selectedOrder.creditCost}</p>
                                          <p><span className="font-medium">Selected Meals:</span> {formatSelectedMeals(selectedOrder.selectedMeals)}</p>
                                          {selectedOrder.confirmedAt && (
                                            <p><span className="font-medium">Confirmed:</span> {new Date(selectedOrder.confirmedAt).toLocaleString()}</p>
                                          )}
                                          {selectedOrder.deliveredAt && (
                                            <p><span className="font-medium">Delivered:</span> {new Date(selectedOrder.deliveredAt).toLocaleString()}</p>
                                          )}
                                          {selectedOrder.status === 'refunded' && selectedOrder.refundedAt && (
                                            <p><span className="font-medium">Refunded:</span> {new Date(selectedOrder.refundedAt).toLocaleString()}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="mb-4">
                                      <h3 className="font-semibold mb-2">Delivery Address</h3>
                                      <p className="text-sm">{formatAddress(selectedOrder.deliveryAddress)}</p>
                                    </div>
                                    
                                    {selectedOrder.specialInstructions && (
                                      <div className="mb-4">
                                        <h3 className="font-semibold mb-2">Special Instructions</h3>
                                        <p className="text-sm bg-muted/30 p-3 rounded-md">
                                          {selectedOrder.specialInstructions}
                                        </p>
                                      </div>
                                    )}
                                    
                                    <div className="mt-6 border-t pt-4">
                                      <h3 className="font-semibold mb-3">Update Order Status</h3>
                                      <div className="flex flex-wrap gap-2">
                                        <Button 
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateOrderStatus(selectedOrder.orderId, 'pending')}
                                          disabled={selectedOrder.status === 'pending'}
                                          className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                                        >
                                          <Clock className="h-3 w-3 mr-1" />
                                          Pending
                                        </Button>
                                        <Button 
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateOrderStatus(selectedOrder.orderId, 'confirmed')}
                                          disabled={selectedOrder.status === 'confirmed'}
                                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                        >
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Confirm
                                        </Button>
                                        <Button 
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateOrderStatus(selectedOrder.orderId, 'delivery')}
                                          disabled={selectedOrder.status === 'delivery'}
                                          className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                                        >
                                          <Truck className="h-3 w-3 mr-1" />
                                          Out for Delivery
                                        </Button>
                                        <Button 
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateOrderStatus(selectedOrder.orderId, 'delivered')}
                                          disabled={selectedOrder.status === 'delivered'}
                                          className="border-green-300 text-green-700 hover:bg-green-50"
                                        >
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Delivered
                                        </Button>
                                        <Button 
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleCancelOrder(selectedOrder)}
                                          disabled={selectedOrder.status === 'cancelled'}
                                          className="border-red-300 text-red-700 hover:bg-red-50"
                                        >
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Cancelled
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="flex justify-center items-center h-[200px]">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                Update
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.orderId, 'confirmed')}>
                                <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                                <span>Confirm Order</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.orderId, 'delivery')}>
                                <Truck className="h-4 w-4 mr-2 text-indigo-600" />
                                <span>Out for Delivery</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.orderId, 'delivered')}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                <span>Mark as Delivered</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleRefundOrder(order)} className="text-orange-600">
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                <span>Refund Order</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCancelOrder(order)} className="text-red-600">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                <span>Cancel Order</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 border rounded-md bg-muted/10">
              <div className="mb-3">
                <Package className="h-12 w-12 mx-auto text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No orders found</h3>
              <p className="text-muted-foreground mt-1">
                {statusFilter !== 'all' 
                  ? `No ${statusFilter} orders found. Try a different filter.`
                  : searchQuery
                    ? `No orders matching "${searchQuery}"`
                    : "No orders have been placed yet."}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between w-full">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePagination('prev')}
                disabled={pagination.page === 1 || isLoading}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePagination('next')}
                disabled={pagination.page === pagination.pages || isLoading}
              >
                Next
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Refund Confirmation Dialog */}
      <Dialog open={refundOrderDialog.open} onOpenChange={(open) => setRefundOrderDialog({ ...refundOrderDialog, open })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-orange-600">Confirm Refund</DialogTitle>
            <DialogDescription>
              Are you sure you want to refund this order? This will:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Return {refundOrderDialog.order?.creditCost || 0} credits to the customer's account</li>
              <li>Create a transaction record with type "refund"</li>
              <li>Change the order status to "refunded"</li>
              <li>This action cannot be undone</li>
            </ul>
            
            {refundOrderDialog.order && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mt-3">
                <p className="text-sm font-medium text-orange-800">Order: {refundOrderDialog.order.orderId}</p>
                <p className="text-xs text-orange-700 mt-1">
                  Customer: {typeof refundOrderDialog.order.userId === 'object' 
                    ? refundOrderDialog.order.userId.name 
                    : refundOrderDialog.order.userId}
                </p>
                <p className="text-xs text-orange-700">
                  Amount: {refundOrderDialog.order.creditCost} credits
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRefundOrderDialog({ open: false, order: null })}
            >
              Cancel
            </Button>
            <Button 
              variant="default"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => {
                if (refundOrderDialog.order) {
                  updateOrderStatus(refundOrderDialog.order.orderId, 'refunded');
                }
              }}
            >
              Confirm Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Confirmation Dialog */}
      <Dialog open={cancelOrderDialog.open} onOpenChange={(open) => setCancelOrderDialog({ ...cancelOrderDialog, open })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Cancellation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {cancelOrderDialog.order && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-sm font-medium text-red-800">Order: {cancelOrderDialog.order.orderId}</p>
                <p className="text-xs text-red-700 mt-1">
                  Customer: {typeof cancelOrderDialog.order.userId === 'object' 
                    ? cancelOrderDialog.order.userId.name 
                    : cancelOrderDialog.order.userId}
                </p>
                <p className="text-xs text-red-700">
                  Amount: {cancelOrderDialog.order.creditCost} credits
                </p>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Would you like to refund the customer's credits?</h4>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="refund-credits"
                  checked={cancelOrderDialog.refundCredits}
                  onChange={() => 
                    setCancelOrderDialog({
                      ...cancelOrderDialog,
                      refundCredits: !cancelOrderDialog.refundCredits
                    })
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="refund-credits" className="text-sm">
                  Yes, refund {cancelOrderDialog.order?.creditCost || 0} credits to customer
                </label>
              </div>
              
              <div className="text-sm text-muted-foreground mt-2">
                {cancelOrderDialog.refundCredits ? (
                  <p>A refund transaction will be created and the credits will be returned to the customer's account.</p>
                ) : (
                  <p>The order will be cancelled but no credits will be refunded.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCancelOrderDialog({ open: false, order: null, refundCredits: false })}
            >
              Cancel
            </Button>
            <Button 
              variant="default"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (cancelOrderDialog.order) {
                  updateOrderStatus(
                    cancelOrderDialog.order.orderId, 
                    'cancelled',
                    cancelOrderDialog.refundCredits
                  );
                }
              }}
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 