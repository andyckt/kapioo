"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Truck, CheckCircle, Clock, Package, AlertCircle, Loader2, RefreshCcw } from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/format"
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
import { VisuallyHidden } from "@/components/ui/visually-hidden"

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

// Format items for display
function formatItems(items: any[]) {
  if (!items || !items.length) return "-";
  
  return items.map(item => {
    // Extract day name from item.day (e.g., "monday-w1" -> "Monday")
    const dayName = item.day.split('-')[0].charAt(0).toUpperCase() + item.day.split('-')[0].slice(1);
    const dayInfo = `${item.date} ${dayName}`;
    const comboInfo = `${item.comboName} (${item.type === 'A' ? '2菜' : '3菜'}) x${item.quantity}`;
    return `${dayInfo}: ${comboInfo}`;
  }).join('\n');
}

interface DailyDeliveryHistoryProps {
  userId: string;
}

export function DailyDeliveryHistory({ userId }: DailyDeliveryHistoryProps) {
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
  const locale = language === "en" ? "en-US" : "zh-CN";
  const formatOrderDate = (dateString: string) => formatDate(dateString, { locale, month: "long" });
  const formatOrderDateTime = (dateString: string) =>
    formatDateTime(dateString, {
      locale,
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: language === "en" ? true : undefined,
    });

  // Fetch daily delivery orders for the user
  const fetchOrders = async (page = 1, options?: { signal?: AbortSignal }) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/daily-delivery/order?userId=${userId}&page=${page}&limit=${pagination.limit}`, {
        signal: options?.signal,
      });
      const data = await response.json();
      if (options?.signal?.aborted) return;
      
      if (data.success) {
        setOrders(data.data.orders || []);
        setPagination({
          page: data.data.page || page,
          limit: data.data.limit || pagination.limit,
          total: data.data.total || 0,
          pages: data.data.pages || 1
        });
      } else {
        console.error("Error fetching daily delivery orders:", data.error);
        toast({
          title: t('errorOccurred'),
          description: t('loadingOrders'),
          variant: "destructive"
        });
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError' || options?.signal?.aborted) return;
      console.error("Error fetching daily delivery orders:", error);
      toast({
        title: t('errorOccurred'),
        description: t('loadingOrders'),
        variant: "destructive"
      });
    } finally {
      if (!options?.signal?.aborted) {
        setIsLoading(false);
      }
    }
  }

  // Get order details
  const fetchOrderDetails = async (orderId: string) => {
    try {
      const response = await fetch(`/api/daily-delivery/order/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedOrder(data.data);
      } else {
        toast({
          title: t('errorOccurred'),
          description: t('loadingOrders'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast({
        title: t('errorOccurred'),
        description: t('loadingOrders'),
        variant: "destructive"
      });
    }
  }

  // Load orders when component mounts
  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();
    void fetchOrders(1, { signal: controller.signal });

    return () => controller.abort();
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
    { status: 'pending', label: t('orderPlaced') },
    { status: 'confirmed', label: t('orderConfirmed') },
    { status: 'delivery', label: t('outForDelivery') },
    { status: 'delivered', label: t('delivered') },
  ];

  // Get current step index for timeline
  const getCurrentStepIndex = (status: string) => {
    if (status === 'cancelled' || status === 'refunded') return -1;
    return statusSteps.findIndex(step => step.status === status);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'en' ? 'Daily Delivery Orders' : '每日直送订单'}</CardTitle>
        <CardDescription>{language === 'en' ? 'View your daily delivery orders and status' : '查看您的每日直送订单和状态'}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">{t('loadingOrders')}</span>
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order._id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="p-4 pb-2 bg-muted/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{language === 'en' ? 'Order' : '订单'} {order.orderId}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatOrderDate(order.createdAt)}
                      </p>
                    </div>
                    <OrderStatus status={order.status} />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div className="md:col-span-2">
                      <p className="font-medium">{language === 'en' ? 'Items' : '餐点'}</p>
                      <div className="text-muted-foreground max-w-[400px] whitespace-pre-line">
                        {formatItems(order.items)}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">{language === 'en' ? 'Vouchers Used' : '使用的餐券'}</p>
                      <p className="text-muted-foreground">
                        2菜: {order.voucherCost?.twoDish || 0}, 
                        3菜: {order.voucherCost?.threeDish || 0}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">{language === 'zh' ? '区域' : 'Area'}</p>
                      <p className="text-muted-foreground">{order.area || '-'}</p>
                    </div>
                  </div>
                  <div className="mt-2 grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">{t('deliveryAddress')}</p>
                      <p className="text-muted-foreground truncate max-w-full">
                        {formatAddress(order.deliveryAddress, language, order.area)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">{language === 'zh' ? '电话' : 'Phone'}</p>
                      <p className="text-muted-foreground">{order.phoneNumber || '-'}</p>
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
                        {t('viewDetails')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <VisuallyHidden>
                        <DialogTitle>{language === 'zh' ? '订单详情' : 'Order Details'}</DialogTitle>
                      </VisuallyHidden>
                      {selectedOrder && selectedOrder.orderId === order.orderId ? (
                        <>
                          <DialogHeader>
                            <DialogTitle>{language === 'en' ? 'Order' : '订单'} {selectedOrder.orderId}</DialogTitle>
                            <DialogDescription>
                              {language === 'en' ? 'Placed on' : '下单于'} {formatOrderDateTime(selectedOrder.createdAt)}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="py-4">
                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold">{t('orderStatusTitle')}</h3>
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
                                  {t('orderCancelled')}
                                </div>
                              )}

                              {selectedOrder.status === 'refunded' && (
                                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-700 my-3">
                                  {language === 'en' ? 'Order has been refunded' : '订单已退款'}
                                  {selectedOrder.refundedAt && (
                                    <div className="mt-1">
                                      {language === 'en' ? 'Refunded on' : '退款日期'} {formatOrderDate(selectedOrder.refundedAt)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="grid gap-3 text-sm border-t pt-3">
                              <div>
                                <h3 className="font-semibold mb-1">{language === 'en' ? 'Ordered Items' : '订购的餐点'}</h3>
                                <ul className="ml-5 list-disc space-y-1">
                                  {selectedOrder.items.map((item: any, index: number) => (
                                    <li key={index} className="mb-2">
                                      <div>
                                        <span className="font-medium">{item.date} {item.day.split('-')[0].charAt(0).toUpperCase() + item.day.split('-')[0].slice(1)}</span>: {item.comboName} 
                                        <span className="text-muted-foreground ml-1">
                                          ({item.type === 'A' ? '2菜' : '3菜'}) x{item.quantity}
                                        </span>
                                      </div>
                                      
                                      {/* Display dish details if available */}
                                      {item.dishes && item.dishes.length > 0 && (
                                        <div className="mt-1 pl-4 space-y-1">
                                          {item.dishes.map((dish: string, dishIndex: number) => (
                                            <div key={dishIndex} className="flex items-center gap-1.5">
                                              <div className="w-1.5 h-1.5 rounded-full bg-[#C2884E]/40"></div>
                                              <span className="text-xs text-[#6B5F53]">{dish}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <h3 className="font-semibold mb-1">{language === 'zh' ? '区域' : 'Area'}</h3>
                                  <p className="text-muted-foreground">
                                    {selectedOrder.area || '-'}
                                  </p>
                                </div>
                                
                                <div>
                                  <h3 className="font-semibold mb-1">{language === 'zh' ? '电话' : 'Phone Number'}</h3>
                                  <p className="text-muted-foreground">
                                    {selectedOrder.phoneNumber || '-'}
                                  </p>
                                </div>
                              </div>
                              
                              <div>
                                <h3 className="font-semibold mb-1">{t('deliveryAddress')}</h3>
                                <p className="text-muted-foreground">
                                  {formatAddress(selectedOrder.deliveryAddress, language, selectedOrder.area)}
                                </p>
                              </div>
                              
                              {selectedOrder.specialInstructions && (
                                <div>
                                  <h3 className="font-semibold mb-1">{t('specialInstructions')}</h3>
                                  <p className="text-muted-foreground">
                                    {selectedOrder.specialInstructions}
                                  </p>
                                </div>
                              )}
                              
                              <div>
                                <h3 className="font-semibold mb-1">{language === 'en' ? 'Vouchers Used' : '使用的餐券'}</h3>
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
                          <span className="ml-2">{language === 'en' ? 'Loading...' : '加载中...'}</span>
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
                  {t('previous')}
                </Button>
                <div className="text-sm text-muted-foreground">
                  {t('pageXofY').replace('X', pagination.page.toString()).replace('Y', pagination.pages.toString())}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePagination('next')}
                  disabled={pagination.page === pagination.pages}
                >
                  {t('next')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 border rounded-md bg-muted/10">
            <div className="mb-3">
              <Package className="h-12 w-12 mx-auto text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{language === 'en' ? 'No daily delivery orders yet' : '暂无每日直送订单'}</h3>
            <p className="text-muted-foreground mt-1">
              {language === 'en' ? 'Your daily delivery orders will appear here' : '您的每日直送订单将显示在此处'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
