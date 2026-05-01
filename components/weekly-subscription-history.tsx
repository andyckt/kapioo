"use client"

import { useState, useEffect } from "react"
import { Truck, CheckCircle, Clock, Package, AlertCircle, Loader2, RefreshCcw } from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/format"
import { useLanguage } from "@/lib/language-context"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { parseWeeklyMealPlanMeals } from "@/lib/orders/weekly-entitlement-display"
import {
  formatDeliveryDatesList,
  getStandardDeliveryWindow,
  uniqueDeliveryDatesFromOrderItems,
} from "@/lib/user-order-delivery-display"

// Order status component with appropriate icon and color
function OrderStatus({ status }: { status: string }) {
  const { t } = useLanguage();
  
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-[#DCC29A]/60 bg-[#FFF8ED] px-2.5 py-0.5 text-[#7A5C2E] shadow-sm">
          <Clock className="h-3 w-3 shrink-0 opacity-90" />
          {t('pendingStatus')}
        </Badge>
      )
    case 'confirmed':
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-[#B8C9DA]/80 bg-[#F2F6FA] px-2.5 py-0.5 text-[#3D5A72] shadow-sm">
          <CheckCircle className="h-3 w-3 shrink-0 opacity-90" />
          {t('confirmedStatus')}
        </Badge>
      )
    case 'delivery':
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-[#C5B8D4]/70 bg-[#F5F2FA] px-2.5 py-0.5 text-[#57466D] shadow-sm">
          <Truck className="h-3 w-3 shrink-0 opacity-90" />
          {t('deliveryStatus')}
        </Badge>
      )
    case 'delivered':
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-[#A8C9B0]/80 bg-[#F1F8F3] px-2.5 py-0.5 text-[#2F5A3C] shadow-sm">
          <CheckCircle className="h-3 w-3 shrink-0 opacity-90" />
          {t('deliveredStatus')}
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-[#E0BCBC]/90 bg-[#FCF4F4] px-2.5 py-0.5 text-[#8F3D3D] shadow-sm">
          <AlertCircle className="h-3 w-3 shrink-0 opacity-90" />
          {t('cancelledStatus')}
        </Badge>
      )
    case 'refunded':
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-[#E5C4A8]/90 bg-[#FFF6ED] px-2.5 py-0.5 text-[#9A5C2E] shadow-sm">
          <RefreshCcw className="h-3 w-3 shrink-0 opacity-90" />
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

function weeklyMealOptionDisplayName(
  optionId: unknown,
  storedName: string,
  language: string,
  optionsById: Map<string, { nameEn?: string }>
): string {
  if (language === "zh") return storedName;
  const id = String(optionId ?? "");
  const meta = optionsById.get(id);
  if (meta?.nameEn?.trim()) return meta.nameEn.trim();
  return storedName;
}

function getWeeklyEntitlementLabel(order: any, language: string) {
  if (order?.weeklyEntitlementSummary) {
    return language === 'zh'
      ? order.weeklyEntitlementSummary.labelZh
      : order.weeklyEntitlementSummary.labelEn;
  }

  if (typeof order?.mealPlanType === 'string' && order.mealPlanType !== 'legacy') {
    const mealsPerWeek = Number(String(order.mealPlanType).replace('aweek', ''));
    if (Number.isFinite(mealsPerWeek)) {
      return language === 'zh'
        ? `${mealsPerWeek}餐一周: 1张`
        : `${mealsPerWeek} meals/week: 1 voucher`;
    }
  }

  return `${Number(order?.creditCost) || 0} ${language === 'zh' ? '餐' : 'meals'}`;
}

/** Customer-facing plan line for list cards (not the legacy admin label format). */
function formatWeeklyCardPlanUsage(order: any, language: string): string {
  const s = order?.weeklyEntitlementSummary;
  const mealsFromOrder =
    typeof order?.mealPlanType === "string" ? parseWeeklyMealPlanMeals(order.mealPlanType) : null;
  const mealsFromSummary =
    s?.mealPlanType != null ? parseWeeklyMealPlanMeals(String(s.mealPlanType)) : null;
  const mealsPerWeek = mealsFromSummary ?? mealsFromOrder;

  if (mealsPerWeek != null) {
    const v = Math.max(1, Number(s?.voucherCountUsed) || 1);
    if (language === "zh") {
      return `${mealsPerWeek}餐/周套餐 · 使用 ${v} 张餐券`;
    }
    return `${mealsPerWeek} meals/week plan · ${v} voucher${v === 1 ? "" : "s"} used`;
  }

  const mealCount =
    Array.isArray(order?.items) && order.items.length
      ? order.items.reduce((sum: number, item: any) => sum + (Number(item?.quantity) || 0), 0)
      : Number(order?.creditCost) || 0;
  if (language === "zh") {
    return `${mealCount}份餐（按次配送）`;
  }
  return `${mealCount} meals (per delivery)`;
}

function weeklyListDeliverySummaryLines(items: any[] | undefined, language: string) {
  const dates = uniqueDeliveryDatesFromOrderItems(items);
  const datesText = formatDeliveryDatesList(dates, language);
  const windowText = getStandardDeliveryWindow("weekly", language);
  return { datesText, windowText };
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
  const [weeklyOptionNames, setWeeklyOptionNames] = useState<Map<string, { nameEn?: string }>>(() => new Map());

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/weekly-subscription/meal-options", { signal: ac.signal });
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) return;
        const next = new Map<string, { nameEn?: string }>();
        for (const opt of json.data as { _id?: string; id?: string; nameEn?: string }[]) {
          const id = opt._id != null ? String(opt._id) : opt.id != null ? String(opt.id) : "";
          if (id) next.set(id, { nameEn: opt.nameEn });
        }
        setWeeklyOptionNames(next);
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

  // Fetch weekly subscription orders for the user
  const fetchOrders = async (page = 1, options?: { signal?: AbortSignal }) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/weekly-subscription/user/history?userId=${userId}&page=${page}&limit=${pagination.limit}`, {
        signal: options?.signal,
      });
      const data = await response.json();
      if (options?.signal?.aborted) return;
      
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
      if ((error as Error).name === 'AbortError' || options?.signal?.aborted) return;
      console.error("Error fetching weekly subscription orders:", error);
      toast({
        title: t('errorOccurred'),
        description: language === 'zh' ? '加载订阅订单失败' : 'Failed to load subscription orders',
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
    <Card className="overflow-hidden border border-[#C2884E]/12 bg-gradient-to-br from-white to-[#FFFCF9] shadow-sm sm:rounded-2xl">
      <CardHeader className="border-b border-[#C2884E]/10 bg-[#FBF7F2]/50 pb-4">
        <CardTitle className="text-lg font-semibold text-[#6B5F53]">
          {language === 'zh' ? '周餐盒配送记录' : 'Weekly meal box deliveries'}
        </CardTitle>
        <CardDescription className="text-[#6B5F53]/70">
          {language === 'zh' ? '查看您的周餐盒订单及配送状态' : 'View your weekly meal box orders and delivery status'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">
              {language === 'zh' ? '加载中...' : 'Loading...'}
            </span>
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => {
              const { datesText, windowText } = weeklyListDeliverySummaryLines(order.items, language);
              const mealTotal = order.items.reduce((total: number, item: any) => total + item.quantity, 0);

              return (
              <div
                key={order._id}
                role="article"
                className="overflow-hidden rounded-2xl border border-[#C2884E]/14 bg-gradient-to-b from-[#FFFCF9] via-[#FFFBF7] to-white shadow-[0_10px_40px_-18px_rgba(194,136,78,0.35)]"
              >
                {/* Header: order id + status */}
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-4 pt-5 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#6B5F53]/72">
                      {language === 'zh' ? '订单号' : 'Order'}
                    </p>
                    <p className="mt-1 break-all font-mono text-base font-semibold leading-snug text-[#3D3630]">
                      {order.orderId}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#6B5F53]/75">
                      {formatOrderDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <OrderStatus status={order.status} />
                  </div>
                </div>

                <div className="px-4 sm:px-6">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-[#C2884E]/18 to-transparent" />
                </div>

                <div className="space-y-6 px-4 pb-6 pt-5 sm:px-6">
                  {/* Delivery schedule — prominent, calm */}
                  <div className="rounded-xl bg-[#FDF6ED]/95 px-4 py-4 ring-1 ring-[#C2884E]/[0.07]">
                    <p className="text-xs font-medium tracking-wide text-[#6B5F53]/72">
                      {language === 'zh' ? '配送时间' : 'Delivery time'}
                    </p>
                    <p className="mt-2 text-base font-semibold leading-snug text-[#2E2823]">
                      {datesText}
                    </p>
                    <p className="mt-1.5 text-base font-semibold leading-snug text-[#2E2823]">
                      {windowText}
                    </p>
                  </div>

                  {/* This delivery */}
                  <div>
                    <p className="text-xs font-medium tracking-wide text-[#6B5F53]/72">
                      {language === 'zh' ? '本次配送' : 'This delivery'}
                    </p>
                    <p className="mt-2 text-base font-semibold leading-relaxed text-[#2E2823]">
                      {language === 'zh'
                        ? `${mealTotal} 份餐`
                        : `${mealTotal} ${mealTotal === 1 ? 'meal' : 'meals'}`}
                    </p>
                  </div>

                  {/* Plan / vouchers */}
                  <div>
                    <p className="text-xs font-medium tracking-wide text-[#6B5F53]/72">
                      {language === 'zh' ? '使用套餐' : 'Plan usage'}
                    </p>
                    <p className="mt-2 text-base font-semibold leading-relaxed text-[#2E2823]">
                      {formatWeeklyCardPlanUsage(order, language)}
                    </p>
                  </div>

                  <div className="h-px w-full bg-[#C2884E]/10" />

                  {/* Delivery details */}
                  <div className="space-y-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B5F53]/65">
                      {language === 'zh' ? '配送信息' : 'Delivery details'}
                    </p>
                    <div>
                      <p className="text-xs font-medium text-[#6B5F53]/65">{t('deliveryAddress')}</p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-base font-medium leading-[1.65] text-[#2E2823]">
                        {formatAddress(order.deliveryAddress, language, order.area)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#6B5F53]/65">
                        {language === 'zh' ? '联系电话' : 'Phone'}
                      </p>
                      <p className="mt-2 break-all text-base font-semibold tabular-nums text-[#2E2823]">
                        {order.phoneNumber || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-11 min-h-11 w-full rounded-xl border-[#C2884E]/35 bg-white/80 px-5 text-base font-medium text-[#5A4A3C] shadow-sm hover:bg-[#FBF7F2] sm:w-auto"
                        onClick={() => fetchOrderDetails(order.orderId)}
                      >
                        {language === 'zh' ? '查看详情' : 'View Details'}
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
                                  {language === 'zh' ? '此订单已取消' : 'This order has been cancelled'}
                                </div>
                              )}

                              {selectedOrder.status === 'refunded' && (
                                <div className="rounded-lg border border-orange-200 bg-orange-50/90 px-3 py-2.5 text-sm text-orange-900">
                                  <p>{language === 'zh' ? '已退还餐券' : 'Your meal plan has been refunded'}</p>
                                  {selectedOrder.refundedAt && (
                                    <p className="mt-1 text-xs text-orange-800/90">
                                      {language === 'zh' ? '退款日期：' : 'Refunded on: '}
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
                              <ul className="space-y-2">
                                {selectedOrder.items.map((item: any, index: number) => (
                                  <li
                                    key={index}
                                    className="flex items-start justify-between gap-3 rounded-lg border border-[#C2884E]/10 bg-[#FFFCF9] px-3 py-2.5"
                                  >
                                    <span className="min-w-0 flex-1 text-sm leading-snug text-[#6B5F53]">
                                      {weeklyMealOptionDisplayName(
                                        item.optionId,
                                        String(item.optionName ?? ''),
                                        language,
                                        weeklyOptionNames
                                      )}
                                    </span>
                                    <span className="shrink-0 rounded-md bg-[#C2884E]/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-[#8B6914]">
                                      ×{item.quantity}
                                    </span>
                                  </li>
                                ))}
                              </ul>
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
                                  <p className="mt-0.5 text-sm text-[#6B5F53]">{selectedOrder.area}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {language === 'zh' ? '电话' : 'Phone'}
                                  </p>
                                  <p className="mt-0.5 text-sm text-[#6B5F53]">{selectedOrder.phoneNumber}</p>
                                </div>
                              </div>
                              <div className="mt-3 border-t border-[#C2884E]/10 pt-3">
                                <p className="text-xs font-medium text-muted-foreground">{t('deliveryAddress')}</p>
                                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#6B5F53]">
                                  {formatAddress(selectedOrder.deliveryAddress, language, selectedOrder.area)}
                                </p>
                                <OrderDeliveryMeta
                                  items={selectedOrder.items}
                                  service="weekly"
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
                                {getWeeklyEntitlementLabel(selectedOrder, language)}
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
                  </div>
                </div>
              </div>
            );
            })}
            
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
          <div className="rounded-xl border border-[#C2884E]/12 bg-[#FBF7F2]/40 py-12 text-center">
            <div className="mb-3">
              <Package className="mx-auto h-12 w-12 text-[#C2884E]/50" />
            </div>
            <h3 className="text-lg font-medium text-[#6B5F53]">
              {language === 'zh' ? '暂无订阅订单' : 'No Subscription Orders Yet'}
            </h3>
            <p className="mt-1 text-sm text-[#6B5F53]/65">
              {language === 'zh' ? '您的订阅订单将显示在这里' : 'Your subscription orders will appear here'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
