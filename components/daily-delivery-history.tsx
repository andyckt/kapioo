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
import { OrderDeliveryMeta } from "@/components/order-delivery-meta"
import {
  dailyMealTypeShortLabel,
  dailyVoucherTypeCountLabel,
  translateDailyComboDisplayName,
  translateHistoryDishName,
} from "@/lib/daily-order-display-i18n"
import { uniqueDeliveryDatesFromOrderItems } from "@/lib/user-order-delivery-display"

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

/** e.g. monday-w1 → Monday (only used when an order spans multiple delivery days). */
function daySlotLabelFromDailyItem(item: { day?: string }): string {
  const day = item?.day;
  if (!day || typeof day !== "string") return "";
  const base = day.split("-")[0]?.toLowerCase();
  if (!base) return "";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Card snippet only: combo lines (delivery date/day appears under 配送日期). */
function formatItemsSnippet(items: any[], language: string) {
  if (!items || !items.length) return "-";

  return items
    .map(
      (item) =>
        `${translateDailyComboDisplayName(String(item.comboName ?? ""), language)} (${dailyMealTypeShortLabel(item.type, language)}) x${item.quantity}`
    )
    .join("\n");
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
  const [dishTranslations, setDishTranslations] = useState<Record<string, string>>({});
  // Dish name zh -> en for English order history
  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/dishes", { signal: ac.signal });
        const result = await res.json();
        if (!result.success || !Array.isArray(result.data)) return;
        const map: Record<string, string> = {};
        for (const dish of result.data as { name?: string; nameEn?: string }[]) {
          if (dish?.name && dish?.nameEn) map[dish.name] = dish.nameEn;
        }
        setDishTranslations(map);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    })();
    return () => ac.abort();
  }, []);

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
    <Card className="overflow-hidden border border-[#C2884E]/12 bg-gradient-to-br from-white to-[#FFFCF9] shadow-sm sm:rounded-2xl">
      <CardHeader className="border-b border-[#C2884E]/10 bg-[#FBF7F2]/50 pb-4">
        <CardTitle className="text-lg font-semibold text-[#6B5F53]">
          {language === 'en' ? 'Daily Delivery Orders' : '每日直送订单'}
        </CardTitle>
        <CardDescription className="text-[#6B5F53]/70">
          {language === 'en' ? 'View your daily delivery orders and status' : '查看您的每日直送订单和状态'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">{t('loadingOrders')}</span>
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-5">
            {orders.map((order) => (
              <Card
                key={order._id}
                className="overflow-hidden rounded-xl border border-[#C2884E]/15 bg-white shadow-sm transition-all hover:border-[#C2884E]/28 hover:shadow-md"
              >
                <div className="border-b border-[#C2884E]/10 bg-gradient-to-b from-[#FBF7F2] to-[#FFFCF9] px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#4A3F36]">
                        {language === 'en' ? 'Order' : '订单号'}
                      </p>
                      <p className="mt-0.5 break-all font-mono text-sm font-semibold leading-snug text-[#6B5F53] sm:text-[0.9375rem]">
                        {order.orderId}
                      </p>
                      <p className="mt-1 text-xs text-[#6B5F53]/65">{formatOrderDate(order.createdAt)}</p>
                    </div>
                    <div className="shrink-0">
                      <OrderStatus status={order.status} />
                    </div>
                  </div>
                </div>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="rounded-lg border border-[#C2884E]/10 bg-[#FFFCF9] px-3 py-2.5">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.07em] text-[#4A3F36]">
                      {language === 'en' ? 'Items' : '餐点'}
                    </p>
                    <div className="mt-1 max-w-full whitespace-pre-line text-sm font-medium leading-relaxed text-[#6B5F53]">
                      {formatItemsSnippet(order.items, language)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                    <div className="rounded-lg border border-[#C2884E]/10 bg-[#FFFCF9] px-3 py-2.5">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.07em] text-[#4A3F36]">
                        {language === 'en' ? 'Vouchers' : '餐券'}
                      </p>
                      <p className="mt-1 text-sm font-medium leading-snug text-[#6B5F53]">
                        {dailyVoucherTypeCountLabel('two', language)}: {order.voucherCost?.twoDish || 0}
                        {language === 'zh' ? '，' : ', '}
                        {dailyVoucherTypeCountLabel('three', language)}: {order.voucherCost?.threeDish || 0}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#C2884E]/10 bg-[#FFFCF9] px-3 py-2.5">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.07em] text-[#4A3F36]">
                        {language === 'zh' ? '区域' : 'Area'}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#6B5F53]">{order.area || '—'}</p>
                    </div>
                    <div className="rounded-lg border border-[#C2884E]/10 bg-[#FFFCF9] px-3 py-2.5">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.07em] text-[#4A3F36]">
                        {language === 'zh' ? '电话' : 'Phone'}
                      </p>
                      <p className="mt-1 break-all text-sm font-medium tabular-nums text-[#6B5F53]">
                        {order.phoneNumber || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#C2884E]/12 bg-white/90 p-4 shadow-sm">
                    <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#4A3F36]">
                      {language === 'zh' ? '配送信息' : 'Delivery'}
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground">{t('deliveryAddress')}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#6B5F53]">
                      {formatAddress(order.deliveryAddress, language, order.area)}
                    </p>
                    <OrderDeliveryMeta
                      items={order.items}
                      service="daily"
                      className="mt-3 rounded-lg bg-[#FBF7F2]/80 px-3 py-2.5 text-sm"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-[#C2884E]/10 bg-[#FBF7F2]/35 px-4 py-3 sm:px-5">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-[#C2884E]/30 text-[#6B5F53] shadow-sm hover:bg-[#F5EDE4]"
                        onClick={() => fetchOrderDetails(order.orderId)}
                      >
                        {t('viewDetails')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[calc(100vw-1.25rem)] sm:max-w-[560px] max-h-[min(90vh,780px)] overflow-y-auto gap-0 border-[#E8DDD4] p-0 shadow-lg sm:rounded-2xl">
                      <VisuallyHidden>
                        <DialogTitle>{language === 'zh' ? '订单详情' : 'Order Details'}</DialogTitle>
                      </VisuallyHidden>
                      {selectedOrder && selectedOrder.orderId === order.orderId ? (
                        <>
                          <div className="border-b border-[#C2884E]/10 bg-gradient-to-b from-[#FBF7F2] to-[#FFFCF9] px-5 pt-5 pb-4 sm:px-6">
                            <DialogHeader className="space-y-1 text-left">
                              <DialogTitle className="text-lg font-semibold leading-snug text-[#6B5F53]">
                                {language === 'zh' ? '订单号' : 'Order'}{' '}
                                <span className="font-mono text-base tracking-tight">{selectedOrder.orderId}</span>
                              </DialogTitle>
                              <DialogDescription className="text-xs text-[#6B5F53]/70 sm:text-sm">
                                {language === 'zh' ? '下单时间：' : 'Placed on: '}
                                {formatOrderDateTime(selectedOrder.createdAt)}
                              </DialogDescription>
                            </DialogHeader>
                          </div>

                          <div className="space-y-5 px-5 py-5 sm:px-6">
                            <section className="rounded-xl border border-[#C2884E]/12 bg-white/90 p-4 shadow-sm">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#4A3F36]">
                                  {language === 'zh' ? '订单状态' : 'Order status'}
                                </h2>
                                <OrderStatus status={selectedOrder.status} />
                              </div>

                              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'refunded' && (
                                <div className="relative mt-1 overflow-x-auto pb-1">
                                  <div className="absolute left-2 right-2 top-[9px] h-0.5 rounded-full bg-muted sm:left-3 sm:right-3" />
                                  <div className="relative flex min-w-[280px] justify-between gap-1 sm:min-w-0">
                                    {statusSteps.map((step, index) => {
                                      const currentIndex = getCurrentStepIndex(selectedOrder.status);
                                      const isActive = index <= currentIndex;
                                      return (
                                        <div key={step.status} className="flex max-w-[25%] flex-1 flex-col items-center">
                                          <div
                                            className={`z-10 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white sm:h-3 sm:w-3 ${
                                              isActive ? 'bg-[#C2884E]' : 'bg-muted-foreground/25'
                                            }`}
                                          />
                                          <p
                                            className={`mt-2 text-center text-[10px] leading-tight sm:text-xs ${
                                              isActive ? 'font-medium text-[#6B5F53]' : 'text-muted-foreground'
                                            }`}
                                          >
                                            {step.label}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {selectedOrder.status === 'cancelled' && (
                                <div className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2.5 text-sm text-red-800">
                                  {t('orderCancelled')}
                                </div>
                              )}

                              {selectedOrder.status === 'refunded' && (
                                <div className="rounded-lg border border-orange-200 bg-orange-50/90 px-3 py-2.5 text-sm text-orange-900">
                                  <p>{language === 'en' ? 'Order has been refunded' : '订单已退款'}</p>
                                  {selectedOrder.refundedAt && (
                                    <p className="mt-1 text-xs text-orange-800/90">
                                      {language === 'en' ? 'Refunded on: ' : '退款日期：'}
                                      {formatOrderDate(selectedOrder.refundedAt)}
                                    </p>
                                  )}
                                </div>
                              )}
                            </section>

                            <section>
                              <h2 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#4A3F36]">
                                {language === 'zh' ? '已选餐点' : 'Selected meals'}
                              </h2>
                              {(() => {
                                const items = selectedOrder.items ?? [];
                                const multiDay = uniqueDeliveryDatesFromOrderItems(items).length > 1;
                                return (
                                  <ul className="space-y-2">
                                    {items.map((item: any, index: number) => (
                                      <li
                                        key={index}
                                        className="flex items-start justify-between gap-3 rounded-lg border border-[#C2884E]/10 bg-[#FFFCF9] px-3 py-2.5"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm leading-snug text-[#6B5F53]">
                                            {translateDailyComboDisplayName(String(item.comboName ?? ""), language)}
                                            {multiDay ? (
                                              <span className="text-muted-foreground">
                                                {" "}
                                                · {daySlotLabelFromDailyItem(item)}
                                              </span>
                                            ) : null}
                                          </p>
                                          <p className="mt-0.5 text-xs text-muted-foreground">
                                            ({dailyMealTypeShortLabel(item.type, language)})
                                          </p>
                                          {item.dishes && item.dishes.length > 0 ? (
                                            <div className="mt-2 space-y-1 border-t border-[#C2884E]/10 pt-2">
                                              {item.dishes.map((dish: string, dishIndex: number) => (
                                                <div key={dishIndex} className="flex items-center gap-1.5">
                                                  <div className="h-1 w-1 shrink-0 rounded-full bg-[#C2884E]/40" />
                                                  <span className="text-xs text-[#6B5F53]">
                                                    {translateHistoryDishName(dish, dishTranslations, language)}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : null}
                                        </div>
                                        <span className="shrink-0 rounded-md bg-[#C2884E]/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-[#8B6914]">
                                          ×{item.quantity}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                );
                              })()}
                            </section>

                            <section className="rounded-xl border border-[#C2884E]/12 bg-white/90 p-4 shadow-sm">
                              <h2 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#4A3F36]">
                                {language === 'zh' ? '配送信息' : 'Delivery'}
                              </h2>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {language === 'zh' ? '区域' : 'Area'}
                                  </p>
                                  <p className="mt-0.5 text-sm text-[#6B5F53]">{selectedOrder.area || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {language === 'zh' ? '电话' : 'Phone'}
                                  </p>
                                  <p className="mt-0.5 text-sm text-[#6B5F53]">{selectedOrder.phoneNumber || "—"}</p>
                                </div>
                              </div>
                              <div className="mt-3 border-t border-[#C2884E]/10 pt-3">
                                <p className="text-xs font-medium text-muted-foreground">{t('deliveryAddress')}</p>
                                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#6B5F53]">
                                  {formatAddress(selectedOrder.deliveryAddress, language, selectedOrder.area)}
                                </p>
                                <OrderDeliveryMeta
                                  items={selectedOrder.items}
                                  service="daily"
                                  className="mt-3 rounded-lg bg-[#FBF7F2]/80 px-3 py-2.5 text-sm"
                                />
                              </div>
                            </section>

                            {selectedOrder.specialInstructions ? (
                              <section className="rounded-xl border border-[#C2884E]/12 bg-white/90 p-4 shadow-sm">
                                <h2 className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#4A3F36]">
                                  {language === 'zh' ? '特别说明' : 'Special instructions'}
                                </h2>
                                <p className="text-sm leading-relaxed text-[#6B5F53]/90">
                                  {selectedOrder.specialInstructions}
                                </p>
                              </section>
                            ) : null}

                            <section className="rounded-xl border border-[#C2884E]/12 bg-white/90 p-4 shadow-sm">
                              <h2 className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#4A3F36]">
                                {language === 'zh' ? '使用的餐券' : 'Voucher Used'}
                              </h2>
                              <p className="text-sm text-[#6B5F53]">
                                {dailyVoucherTypeCountLabel("two", language)}: {selectedOrder.voucherCost?.twoDish || 0}
                                {language === "zh" ? "，" : ", "}
                                {dailyVoucherTypeCountLabel("three", language)}:{" "}
                                {selectedOrder.voucherCost?.threeDish || 0}
                              </p>
                            </section>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-[200px] items-center justify-center px-6">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="ml-2 text-sm text-muted-foreground">
                            {language === 'zh' ? '加载中...' : 'Loading...'}
                          </span>
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
          <div className="rounded-xl border border-[#C2884E]/12 bg-[#FBF7F2]/40 py-12 text-center">
            <div className="mb-3">
              <Package className="mx-auto h-12 w-12 text-[#C2884E]/50" />
            </div>
            <h3 className="text-lg font-medium text-[#6B5F53]">
              {language === 'en' ? 'No daily delivery orders yet' : '暂无每日直送订单'}
            </h3>
            <p className="mt-1 text-sm text-[#6B5F53]/65">
              {language === 'en' ? 'Your daily delivery orders will appear here' : '您的每日直送订单将显示在此处'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
