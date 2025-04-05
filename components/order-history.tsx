"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Truck, CheckCircle, Clock, Package, AlertCircle, Loader2, RefreshCcw } from "lucide-react"

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
      if (typeof value === 'boolean') {
        return value;
      } else if (value && typeof value === 'object' && 'selected' in value) {
        return value.selected;
      }
      return false;
    })
    .map(([day, value]) => {
      const formattedDay = day.charAt(0).toUpperCase() + day.slice(1);
      
      // Handle both old and new structure
      if (value && typeof value === 'object' && 'date' in value && value.date) {
        return `${formattedDay} (${value.date})`;
      }
      
      return formattedDay;
    })
    .join(', ');
}

interface OrderHistoryProps {
  userId: string;
}

export function OrderHistory({ userId }: OrderHistoryProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    pages: 1
  });
  const { toast } = useToast();

  // Fetch orders for the user
  const fetchOrders = async (page = 1) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/orders?page=${page}&limit=${pagination.limit}`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data.orders);
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
          description: "Failed to load your order history",
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
  }

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
  }

  // Load orders when component mounts
  useEffect(() => {
    if (userId) {
      fetchOrders();
    }
  }, [userId]);

  // Handle pagination
  const handlePagination = (direction: 'prev' | 'next') => {
    const newPage = direction === 'prev' 
      ? Math.max(1, pagination.page - 1)
      : Math.min(pagination.pages, pagination.page + 1);
      
    if (newPage !== pagination.page) {
      fetchOrders(newPage);
    }
  };

  // Status timeline steps for order tracking
  const statusSteps = [
    { status: 'pending', label: 'Order Placed' },
    { status: 'confirmed', label: 'Order Confirmed' },
    { status: 'delivery', label: 'Out for Delivery' },
    { status: 'delivered', label: 'Delivered' },
  ];

  // Get current step index for timeline
  const getCurrentStepIndex = (status: string) => {
    if (status === 'cancelled' || status === 'refunded') return -1;
    return statusSteps.findIndex(step => step.status === status);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order History</CardTitle>
        <CardDescription>View your meal orders and delivery status</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading your orders...</span>
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order._id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="p-4 pb-2 bg-muted/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">Order {order.orderId}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <OrderStatus status={order.status} />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Selected Meals</p>
                      <p className="text-muted-foreground">{formatSelectedMeals(order.selectedMeals)}</p>
                    </div>
                    <div>
                      <p className="font-medium">Credits Used</p>
                      <p className="text-muted-foreground">{order.creditCost} credits</p>
                    </div>
                    <div>
                      <p className="font-medium">Delivery Address</p>
                      <p className="text-muted-foreground truncate max-w-[250px]">
                        {formatAddress(order.deliveryAddress)}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-end">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fetchOrderDetails(order.orderId)}
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      {selectedOrder && selectedOrder.orderId === order.orderId ? (
                        <>
                          <DialogHeader>
                            <DialogTitle>Order {selectedOrder.orderId}</DialogTitle>
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
                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold">Order Status</h3>
                                <OrderStatus status={selectedOrder.status} />
                              </div>
                              
                              {/* Status Timeline */}
                              {selectedOrder.status !== 'cancelled' && (
                                <div className="relative mt-4 mb-6">
                                  <div className="absolute left-0 top-[9px] w-full h-1 bg-muted"></div>
                                  <div className="flex justify-between relative">
                                    {statusSteps.map((step, index) => {
                                      const currentIndex = getCurrentStepIndex(selectedOrder.status);
                                      const isActive = index <= currentIndex;
                                      
                                      return (
                                        <div key={step.status} className="flex flex-col items-center relative">
                                          <div className={`w-5 h-5 rounded-full z-10 ${
                                            isActive ? 'bg-primary' : 'bg-muted'
                                          }`}></div>
                                          <p className={`text-xs mt-1 ${
                                            isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                                          }`}>
                                            {step.label}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {selectedOrder.status === 'cancelled' && (
                                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 my-3">
                                  This order has been cancelled.
                                  {/* Check for a refund transaction associated with this cancelled order */}
                                  {selectedOrder.refundTransaction && (
                                    <div className="mt-1">
                                      {selectedOrder.creditCost} credits have been returned to your account.
                                      {selectedOrder.refundTransaction.createdAt && (
                                        <div>
                                          Refunded on {new Date(selectedOrder.refundTransaction.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {selectedOrder.status === 'refunded' && (
                                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-700 my-3">
                                  This order has been refunded and {selectedOrder.creditCost} credits have been returned to your account.
                                  {selectedOrder.refundedAt && (
                                    <div className="mt-1">
                                      Refunded on {new Date(selectedOrder.refundedAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="grid gap-3 text-sm border-t pt-3">
                              <div>
                                <h3 className="font-semibold mb-1">Selected Meals</h3>
                                <ul className="ml-5 list-disc space-y-1">
                                  {Object.entries(selectedOrder.selectedMeals)
                                    .filter(([_, mealValue]: [string, any]) => {
                                      // Handle both old and new structure
                                      if (typeof mealValue === 'boolean') {
                                        return mealValue; 
                                      } else if (mealValue && typeof mealValue === 'object' && 'selected' in mealValue) {
                                        return mealValue.selected;
                                      }
                                      return false;
                                    })
                                    .map(([day, mealValue]: [string, any]) => {
                                      // Format the day name
                                      const formattedDay = day.charAt(0).toUpperCase() + day.slice(1);
                                      
                                      // Get date if available
                                      let dateString = '';
                                      if (mealValue && typeof mealValue === 'object' && 'date' in mealValue && mealValue.date) {
                                        dateString = `(${mealValue.date})`;
                                      }
                                      
                                      return (
                                        <li key={day}>
                                          {formattedDay}
                                          {dateString && (
                                            <span className="text-muted-foreground ml-1">
                                              {dateString}
                                            </span>
                                          )}
                                        </li>
                                      );
                                    })}
                                </ul>
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
                                <h3 className="font-semibold mb-1">Payment</h3>
                                <p className="text-muted-foreground">
                                  {selectedOrder.creditCost} credits
                                </p>
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
                </CardFooter>
              </Card>
            ))}
            
            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePagination('prev')}
                  disabled={pagination.page === 1}
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
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 border rounded-md bg-muted/10">
            <div className="mb-3">
              <Package className="h-12 w-12 mx-auto text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No orders yet</h3>
            <p className="text-muted-foreground mt-1">
              Your order history will appear here once you place your first order.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 