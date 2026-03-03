"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Truck, CheckCircle, Clock, Package, AlertCircle, Loader2, RefreshCcw } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

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
  const { t } = useLanguage();
  
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {t('pendingStatus')}
        </Badge>
      )
    case 'confirmed':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {t('confirmedStatus')}
        </Badge>
      )
    case 'delivery':
      return (
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1">
          <Truck className="h-3 w-3" />
          {t('deliveryStatus')}
        </Badge>
      )
    case 'delivered':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {t('deliveredStatus')}
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {t('cancelledStatus')}
        </Badge>
      )
    case 'refunded':
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-1">
          <RefreshCcw className="h-3 w-3" />
          {t('refundedStatus')}
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
function formatAddress(address: any, language: string, area?: string) {
  if (!address) return language === 'en' ? "No address provided" : "未提供地址";
  
  let formattedAddress = '';
  
  if (address.unitNumber) {
    formattedAddress += language === 'en' ? `Unit ${address.unitNumber}, ` : `单元 ${address.unitNumber}, `;
  }
  
  formattedAddress += address.streetAddress || '';
  
  if (area) {
    formattedAddress += `, ${area}`;
  }

  if (address.postalCode) {
    formattedAddress += ` ${address.postalCode}`;
  }
  
  if (address.country) {
    formattedAddress += `, ${address.country}`;
  }
  
  return formattedAddress;
}

interface WeeklySubscriptionHistoryProps {
  userId: string;
}

export function WeeklySubscriptionHistory({ userId }: WeeklySubscriptionHistoryProps) {
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
  const { t, language } = useLanguage();

  // Fetch weekly subscription orders for the user
  const fetchOrders = async (page = 1) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/weekly-subscription/user/history?userId=${userId}&page=${page}&limit=${pagination.limit}`);
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
        console.error("Error fetching weekly subscription orders:", data.error);
        toast({
          title: t('errorOccurred'),
          description: language === 'zh' ? '加载订阅订单失败' : 'Failed to load subscription orders',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching weekly subscription orders:", error);
      toast({
        title: t('errorOccurred'),
        description: language === 'zh' ? '加载订阅订单失败' : 'Failed to load subscription orders',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Get order details
  const fetchOrderDetails = async (orderId: string) => {
    try {
      const response = await fetch(`/api/weekly-orders/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedOrder(data.data);
      } else {
        toast({
          title: t('errorOccurred'),
          description: language === 'zh' ? '加载订单详情失败' : 'Failed to load order details',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast({
        title: t('errorOccurred'),
        description: language === 'zh' ? '加载订单详情失败' : 'Failed to load order details',
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
    { status: 'pending', label: language === 'zh' ? '订单已下' : 'Order Placed' },
    { status: 'confirmed', label: language === 'zh' ? '订单已确认' : 'Order Confirmed' },
    { status: 'delivery', label: language === 'zh' ? '配送中' : 'Out for Delivery' },
    { status: 'delivered', label: language === 'zh' ? '已送达' : 'Delivered' },
  ];

  // Get current step index for timeline
  const getCurrentStepIndex = (status: string) => {
    if (status === 'cancelled' || status === 'refunded') return -1;
    return statusSteps.findIndex(step => step.status === status);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'zh' ? '周次Meal Box订单' : 'Weekly Meal Box Orders'}</CardTitle>
        <CardDescription>{language === 'zh' ? '查看您的周次Meal Box订单及状态' : 'View your weekly meal box orders and their status'}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">{language === 'zh' ? '加载中...' : 'Loading...'}</span>
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order._id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="p-4 pb-2 bg-muted/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{language === 'zh' ? '订单号' : 'Order'} {order.orderId}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString(
                          language === 'en' ? 'en-US' : 'zh-CN', {
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
                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">{language === 'zh' ? '餐点数量' : 'Meal Count'}</p>
                      <p className="text-muted-foreground">
                        {order.items.reduce((total: number, item: any) => total + item.quantity, 0)} {language === 'zh' ? '份餐点' : 'meals'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">{language === 'zh' ? '使用餐券' : 'Meal Plan Used'}</p>
                      <p className="text-muted-foreground">
                        {(() => {
                          if (order.creditCost === 6) {
                            return language === 'zh' ? '6餐一周: 1张' : '6 meals/week: 1 voucher';
                          } else if (order.creditCost === 8) {
                            return language === 'zh' ? '8餐一周: 1张' : '8 meals/week: 1 voucher';
                          } else if (order.creditCost === 10) {
                            return language === 'zh' ? '10餐一周: 1张' : '10 meals/week: 1 voucher';
                          } else if (order.creditCost === 12) {
                            return language === 'zh' ? '12餐一周: 1张' : '12 meals/week: 1 voucher';
                          } else {
                            return `${order.creditCost} ${language === 'zh' ? '餐' : 'meals'}`;
                          }
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">{language === 'zh' ? '区域' : 'Area'}</p>
                      <p className="text-muted-foreground">{order.area}</p>
                    </div>
                    <div>
                      <p className="font-medium">{language === 'zh' ? '电话' : 'Phone'}</p>
                      <p className="text-muted-foreground">{order.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <p className="font-medium">{language === 'zh' ? '配送地址' : 'Delivery Address'}</p>
                    <p className="text-muted-foreground truncate max-w-full">
                      {formatAddress(order.deliveryAddress, language, order.area)}
                    </p>
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
                        {language === 'zh' ? '查看详情' : 'View Details'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      {selectedOrder && selectedOrder.orderId === order.orderId ? (
                        <>
                          <DialogHeader>
                            <DialogTitle>{language === 'zh' ? '订单号' : 'Order'} {selectedOrder.orderId}</DialogTitle>
                            <DialogDescription>
                              {language === 'zh' ? '下单时间：' : 'Placed on: '} {new Date(selectedOrder.createdAt).toLocaleDateString(
                                language === 'en' ? 'en-US' : 'zh-CN', {
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
                                <h3 className="font-semibold">{language === 'zh' ? '订单状态' : 'Order Status'}</h3>
                                <OrderStatus status={selectedOrder.status} />
                              </div>
                              
                              {/* Status Timeline */}
                              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'refunded' && (
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
                                  {language === 'zh' ? '此订单已取消' : 'This order has been cancelled'}
                                </div>
                              )}

                              {selectedOrder.status === 'refunded' && (
                                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-700 my-3">
                                  {language === 'zh' 
                                    ? `已退还餐券` 
                                    : `Your meal plan has been refunded`}
                                  {selectedOrder.refundedAt && (
                                    <div className="mt-1">
                                      {language === 'zh' ? '退款日期：' : 'Refunded on: '} {new Date(selectedOrder.refundedAt).toLocaleDateString(
                                        language === 'en' ? 'en-US' : 'zh-CN', {
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
                                <h3 className="font-semibold mb-1">{language === 'zh' ? '已选餐点' : 'Selected Meals'}</h3>
                                <ul className="ml-5 list-disc space-y-1">
                                  {selectedOrder.items.map((item: any, index: number) => (
                                    <li key={index}>
                                      <span>
                                        {item.optionName} x{item.quantity}
                                      </span>
                                      <span className="text-muted-foreground ml-1">
                                        ({item.dayId === 'sunday' ? (language === 'zh' ? '周日' : 'Sunday') : (language === 'zh' ? '周二' : 'Tuesday')}, {item.date})
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <h3 className="font-semibold mb-1">{language === 'zh' ? '区域' : 'Area'}</h3>
                                  <p className="text-muted-foreground">
                                    {selectedOrder.area}
                                  </p>
                                </div>
                                
                                <div>
                                  <h3 className="font-semibold mb-1">{language === 'zh' ? '电话' : 'Phone Number'}</h3>
                                  <p className="text-muted-foreground">
                                    {selectedOrder.phoneNumber}
                                  </p>
                                </div>
                              </div>
                              
                              <div>
                                <h3 className="font-semibold mb-1">{language === 'zh' ? '配送地址' : 'Delivery Address'}</h3>
                                <p className="text-muted-foreground">
                                  {formatAddress(selectedOrder.deliveryAddress, language, selectedOrder.area)}
                                </p>
                              </div>
                              
                              {selectedOrder.specialInstructions && (
                                <div>
                                  <h3 className="font-semibold mb-1">{language === 'zh' ? '特别说明' : 'Special Instructions'}</h3>
                                  <p className="text-muted-foreground">
                                    {selectedOrder.specialInstructions}
                                  </p>
                                </div>
                              )}
                              
                              <div>
                                <h3 className="font-semibold mb-1">{language === 'zh' ? '使用餐券' : 'Meal Plan Used'}</h3>
                                <p className="text-muted-foreground">
                                  {(() => {
                                    if (selectedOrder.creditCost === 6) {
                                      return language === 'zh' ? '6餐一周: 1张' : '6 meals/week: 1 voucher';
                                    } else if (selectedOrder.creditCost === 8) {
                                      return language === 'zh' ? '8餐一周: 1张' : '8 meals/week: 1 voucher';
                                    } else if (selectedOrder.creditCost === 10) {
                                      return language === 'zh' ? '10餐一周: 1张' : '10 meals/week: 1 voucher';
                                    } else if (selectedOrder.creditCost === 12) {
                                      return language === 'zh' ? '12餐一周: 1张' : '12 meals/week: 1 voucher';
                                    } else {
                                      return `${selectedOrder.creditCost} ${language === 'zh' ? '餐' : 'meals'}`;
                                    }
                                  })()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-center items-center h-[200px]">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="ml-2">{language === 'zh' ? '加载中...' : 'Loading...'}</span>
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
                  {language === 'zh' ? '上一页' : 'Previous'}
                </Button>
                <div className="text-sm text-muted-foreground">
                  {language === 'zh' 
                    ? `第 ${pagination.page} 页，共 ${pagination.pages} 页` 
                    : `Page ${pagination.page} of ${pagination.pages}`}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePagination('next')}
                  disabled={pagination.page === pagination.pages}
                >
                  {language === 'zh' ? '下一页' : 'Next'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 border rounded-md bg-muted/10">
            <div className="mb-3">
              <Package className="h-12 w-12 mx-auto text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{language === 'zh' ? '暂无订阅订单' : 'No Subscription Orders Yet'}</h3>
            <p className="text-muted-foreground mt-1">
              {language === 'zh' ? '您的订阅订单将显示在这里' : 'Your subscription orders will appear here'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
