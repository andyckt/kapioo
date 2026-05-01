"use client"

import { useState, useEffect } from "react"
import { Loader2, ExternalLink, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatDateTime } from "@/lib/format"
import { useLanguage } from "@/lib/language-context"
import { buildCanonicalBreakdown } from "@/lib/price-breakdown"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui/visually-hidden"

interface UnifiedRechargeHistoryProps {
  userId: string;
  weeklyRefreshKey?: number;
  dailyRefreshKey?: number;
}

/** From stored weekly credit request (mealPlanType / mealPlanQuantity). */
function parseMealsPerWeekFromWeeklyRequest(request: any): number {
  const direct = Number(request?.mealsPerWeek);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const t = request?.mealPlanType;
  if (typeof t === "string" && /^\d+aweek$/i.test(t)) {
    return parseInt(t.replace(/aweek/i, ""), 10);
  }
  return 0;
}

function parseDurationWeeksFromWeeklyRequest(request: any): number {
  const q = request?.mealPlanQuantity ?? request?.duration;
  const n = Number(q);
  if (Number.isFinite(n) && n > 0) return n;
  return 0;
}

/** When mealPlanType / mealPlanQuantity are missing (legacy), parse planDescription. */
function parseWeeklyFromPlanDescription(desc: string): { meals: number; weeks: number } {
  const s = desc.trim();
  if (!s) return { meals: 0, weeks: 0 };
  let meals = 0;
  let weeks = 0;
  const zhMeals = s.match(/(\d+)\s*餐一周/);
  const zhWeeks = s.match(/(\d+)\s*星期/);
  const enMeals = s.match(/(\d+)\s*meals\/week/i);
  const enWeeks = s.match(/(\d+)\s*weeks?/i);
  if (zhMeals) meals = parseInt(zhMeals[1], 10);
  else if (enMeals) meals = parseInt(enMeals[1], 10);
  if (zhWeeks) weeks = parseInt(zhWeeks[1], 10);
  else if (enWeeks) weeks = parseInt(enWeeks[1], 10);
  return { meals, weeks };
}

function weeklyVoucherTypeLabel(mealsPerWeek: number, language: string): string {
  if (mealsPerWeek <= 0) return language === "zh" ? "—" : "—";
  return language === "zh" ? `${mealsPerWeek}餐/周套餐` : `${mealsPerWeek} meals/week plan`;
}

function formatPaymentMethodName(method: string | undefined, language: string): string {
  if (method === "wechat") return language === "zh" ? "微信支付" : "WeChat Pay";
  if (method === "emt") return language === "zh" ? "Interac 电子转账" : "Interac e-Transfer";
  return language === "zh" ? "—" : "—";
}

function paymentReferenceFieldLabel(method: string | undefined, language: string): string {
  if (method === "wechat") return language === "zh" ? "支付账号" : "Payment account";
  return language === "zh" ? "转账邮箱" : "Transfer email";
}

export function UnifiedRechargeHistory({ 
  userId, 
  weeklyRefreshKey = 0, 
  dailyRefreshKey = 0 
}: UnifiedRechargeHistoryProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const locale = language === "en" ? "en-US" : "zh-CN";
  const toNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const formatMoney = (value: unknown) => toNumber(value).toFixed(2);
  
  const paginationLimit = 10;
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: paginationLimit,
    total: 0,
    pages: 1
  });
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Paginated slice derived from allRequests
  const startIndex = (pagination.page - 1) * pagination.limit;
  const requests = allRequests.slice(startIndex, startIndex + pagination.limit);

  // Load requests when component mounts or refresh keys change (with AbortController cleanup)
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const signal = controller.signal;

    const run = async () => {
      setIsLoading(true);
      try {
        const [weeklyResponse, dailyResponse] = await Promise.all([
          fetch(`/api/credits/request?userId=${userId}&page=1&limit=100`, { signal }),
          fetch(`/api/voucher-requests?userId=${userId}&page=1&limit=100`, { signal })
        ]);

        if (signal.aborted) return;

        const [weeklyData, dailyData] = await Promise.all([
          weeklyResponse.json(),
          dailyResponse.json()
        ]);

        if (signal.aborted) return;

        let combinedRequests: any[] = [];

        if (weeklyData.success && weeklyData.data?.requests) {
          combinedRequests = combinedRequests.concat(
            weeklyData.data.requests.map((req: any) => ({
              ...req,
              requestType: 'weekly'
            }))
          );
        }

        if (dailyData.success && dailyData.data) {
          combinedRequests = combinedRequests.concat(
            dailyData.data.map((req: any) => ({
              ...req,
              requestType: 'daily'
            }))
          );
        }

        combinedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (signal.aborted) return;

        setAllRequests(combinedRequests);
        setPagination((p) => ({
          ...p,
          page: 1,
          total: combinedRequests.length,
          pages: Math.max(1, Math.ceil(combinedRequests.length / paginationLimit))
        }));
      } catch (err) {
        if (signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
        console.error("Error fetching recharge requests:", err);
        toast({
          title: "Error",
          description: "Failed to load recharge requests",
          variant: "destructive"
        });
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [userId, weeklyRefreshKey, dailyRefreshKey]);

  const handlePagination = (direction: 'prev' | 'next') => {
    const newPage = direction === 'prev'
      ? Math.max(1, pagination.page - 1)
      : Math.min(pagination.pages, pagination.page + 1);
    if (newPage !== pagination.page) {
      setPagination((p) => ({ ...p, page: newPage }));
    }
  };

  const formatRequestDate = (dateString: string) =>
    formatDateTime(dateString, {
      locale,
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: language === "en" ? true : undefined,
    });

  // Request status badge
  const RequestStatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full border-[#E8C9A0]/90 bg-[#FFF4E8] px-2.5 py-1 text-[11px] font-semibold text-[#A06A28] shadow-sm sm:text-xs">
            <Clock className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} />
            {language === 'en' ? 'Pending review' : '待审核'}
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full border-[#B4D4BE]/90 bg-[#EDF6F0] px-2.5 py-1 text-[11px] font-semibold text-[#2E6B45] shadow-sm sm:text-xs">
            <CheckCircle className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} />
            {language === 'en' ? 'Approved' : '已批准'}
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="outline" className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full border-[#E0B8B8]/90 bg-[#F9EFEF] px-2.5 py-1 text-[11px] font-semibold text-[#984545] shadow-sm sm:text-xs">
            <XCircle className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} />
            {language === 'en' ? 'Declined' : '已拒绝'}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="inline-flex w-fit shrink-0 rounded-full border-[#D8CFC4]/90 bg-[#F5F0EA] px-2.5 py-1 text-[11px] font-semibold text-[#6B6056] sm:text-xs">
            {status}
          </Badge>
        );
    }
  };

  const getDisplayType = (request: { requestType?: string }) =>
    request.requestType === "weekly"
      ? language === "zh"
        ? "周餐盒充值"
        : "Weekly meal box recharge"
      : language === "zh"
        ? "每日直送充值"
        : "Daily delivery recharge";

  // Get voucher/plan details display (weekly uses mealPlanType + mealPlanQuantity; not planDescription locale)
  const getRequestDetails = (request: any) => {
    if (request.requestType === "weekly") {
      let meals = parseMealsPerWeekFromWeeklyRequest(request);
      let weeks = parseDurationWeeksFromWeeklyRequest(request);
      if ((meals <= 0 || weeks <= 0) && typeof request.planDescription === "string") {
        const parsed = parseWeeklyFromPlanDescription(request.planDescription);
        if (meals <= 0) meals = parsed.meals;
        if (weeks <= 0) weeks = parsed.weeks;
      }
      if (meals > 0 && weeks > 0) {
        const typeLabel = weeklyVoucherTypeLabel(meals, language);
        return `${typeLabel} × ${weeks}`;
      }
      return typeof request.planDescription === "string" && request.planDescription.trim()
        ? request.planDescription
        : "—";
    }

    const type =
      request.type === "twoDish"
        ? language === "zh"
          ? "2菜餐券"
          : "2-Dish Voucher"
        : language === "zh"
          ? "3菜餐券"
          : "3-Dish Voucher";

    return `${type} × ${request.quantity}`;
  };

  const getPaymentBreakdown = (request: any) => {
    const breakdown = buildCanonicalBreakdown({
      requestType: request.requestType === 'weekly' ? 'weekly' : 'daily',
      paymentMethod: request.paymentMethod,
      amount: request.amount,
      originalPrice: request.originalPrice,
      originalSubtotal: request.originalSubtotal,
      finalTotal: request.finalTotal,
      promoDiscountAmount: request.promoDiscountAmount,
      taxAmount: request.taxAmount,
      mealSubtotal: request.mealSubtotal,
      deliveryFeePerWeek: request.deliveryFeePerWeek,
      deliveryFeeTotal: request.deliveryFeeTotal,
      mealPlanQuantity: request.mealPlanQuantity ?? request.duration
    });
    return breakdown;
  };

  return (
    <>
    <div className="w-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">
              {language === 'zh' ? '加载请求中...' : 'Loading requests...'}
            </span>
          </div>
        ) : requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((request) => {
              const promoAmt = toNumber(request.promoDiscountAmount);
              const showPromoOnCard = Boolean(request.promoCode?.trim()) && promoAmt > 0;

              return (
              <div
                key={request._id || request.requestId}
                role="article"
                className="overflow-hidden rounded-2xl border border-[#C2884E]/12 bg-[#FFFCF9] shadow-sm ring-1 ring-[#C2884E]/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      <span className="text-sm font-semibold leading-snug text-[#3D342C] sm:text-[15px]">
                        {getDisplayType(request)}
                      </span>
                      <span className="inline-flex max-w-full rounded-full border-2 border-[#C2884E]/40 bg-gradient-to-b from-white to-[#fff6ef]/90 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#5C4D42] shadow-sm">
                        {request.requestId}
                      </span>
                    </div>
                    <p className="text-xs leading-snug text-[#6B5F53] sm:text-[13px]">
                      {formatRequestDate(request.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <RequestStatusBadge status={request.status} />
                  </div>
                </div>

                <div className="space-y-2 px-4 pb-4 pt-3 sm:px-5">
                  <div>
                    <p className="text-[11px] font-medium text-[#8B7D6E]">
                      {language === "zh" ? "充值详情" : "Recharge details"}
                    </p>
                    <p className="mt-0.5 text-[15px] font-semibold leading-snug text-[#3D342C]">
                      {getRequestDetails(request)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xl font-semibold tabular-nums tracking-tight text-[#3D342C]">
                      ${formatMoney(request.amount)}
                    </p>
                  </div>

                  {showPromoOnCard ? (
                    <p className="w-fit max-w-full rounded-md border border-emerald-200/90 bg-emerald-50/90 px-2 py-1 text-[11px] font-medium leading-snug text-[#1F5A3C] sm:text-xs">
                      {language === "zh"
                        ? `优惠码 ${request.promoCode}（-$${formatMoney(request.promoDiscountAmount)}）`
                        : `Promo ${request.promoCode} (-$${formatMoney(request.promoDiscountAmount)})`}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-[#C2884E]/10 px-4 py-3 sm:flex sm:justify-end sm:gap-2.5 sm:px-5">
                  <Button
                    variant="outline"
                    className="h-10 min-h-10 rounded-xl border border-[#C2884E]/12 bg-[#FFFCF9]/90 text-[13px] font-medium leading-tight text-[#6B5F53] shadow-none hover:border-[#C2884E]/20 hover:bg-[#fff6ef] sm:min-w-[128px]"
                    onClick={() => {
                      setSelectedRequest(request);
                      setImageDialogOpen(true);
                    }}
                  >
                    <ImageIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-[#C2884E] opacity-95 sm:h-4 sm:w-4" strokeWidth={2} />
                    {language === "zh" ? "查看证明" : "View proof"}
                  </Button>
                  <Button
                    className="h-10 min-h-10 rounded-xl bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-[13px] font-semibold leading-tight text-white shadow-md shadow-[#C2884E]/15 transition-opacity hover:opacity-90 sm:min-w-[100px]"
                    onClick={() => {
                      setImageDialogOpen(false);
                      setSelectedRequest(request);
                    }}
                  >
                    {language === "zh" ? "详情" : "Details"}
                  </Button>
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
                  className="text-[13px] leading-tight"
                  onClick={() => handlePagination('prev')}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {language === 'zh' ? '上一页' : 'Previous'}
                </Button>
                <div className="text-sm text-muted-foreground">
                  {language === 'zh' 
                    ? `第 ${pagination.page} 页，共 ${pagination.pages} 页` 
                    : `Page ${pagination.page} of ${pagination.pages}`
                  }
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-[13px] leading-tight"
                  onClick={() => handlePagination('next')}
                  disabled={pagination.page === pagination.pages}
                >
                  {language === 'zh' ? '下一页' : 'Next'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-[#C2884E]/12 bg-[#FBF7F2]/60 py-12 text-center">
            <div className="mb-3">
              <Clock className="mx-auto h-12 w-12 text-[#C2884E]/35" />
            </div>
            <h3 className="text-lg font-medium text-[#6B5F53]">
              {language === 'zh' ? '暂无请求' : 'No requests yet'}
            </h3>
            <p className="mt-1 text-sm text-[#6B5F53]/80">
              {language === 'zh'
                ? '您的充值请求将显示在这里'
                : 'Your recharge requests will appear here'}
            </p>
          </div>
        )}
    </div>

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest && !imageDialogOpen} onOpenChange={(open) => {
        if (!open) setSelectedRequest(null);
      }}>
        <DialogContent className="w-[calc(100vw-1.25rem)] sm:max-w-[560px] max-h-[min(90vh,780px)] overflow-y-auto gap-0 border-[#E8DDD4] p-0 shadow-lg sm:rounded-2xl">
          {selectedRequest && (
            <>
              <VisuallyHidden>
                <DialogTitle>
                  {language === 'zh' ? '充值请求详情' : 'Recharge request details'}
                </DialogTitle>
              </VisuallyHidden>
              <div className="border-b border-[#C2884E]/10 bg-gradient-to-b from-[#FBF7F2] to-[#FFFCF9] px-5 pt-5 pb-4 sm:px-6">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="text-lg font-semibold leading-snug text-[#6B5F53]">
                    {language === 'zh' ? '请求编号' : 'Request'}{' '}
                    <span className="font-mono text-base tracking-tight">{selectedRequest.requestId}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#6B5F53]/70 sm:text-sm">
                    {getDisplayType(selectedRequest)}
                    {' · '}
                    {language === 'zh' ? '提交时间：' : 'Submitted: '}
                    {formatRequestDate(selectedRequest.createdAt)}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="space-y-5 px-5 py-5 sm:px-6">
                <section className="rounded-xl border border-[#C2884E]/12 bg-white/90 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#4A3F36]">
                      {language === 'zh' ? '请求状态' : 'Request status'}
                    </h2>
                    <RequestStatusBadge status={selectedRequest.status} />
                  </div>
                </section>

                <section className="rounded-xl border border-[#C2884E]/12 bg-white/90 p-4 shadow-sm">
                  <h2 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#4A3F36]">
                    {language === 'zh' ? '请求信息' : 'Request information'}
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {language === 'zh' ? '请求日期' : 'Requested on'}
                      </p>
                      <p className="mt-0.5 text-sm font-medium leading-relaxed text-[#6B5F53]">
                        {formatRequestDate(selectedRequest.createdAt)}
                      </p>
                    </div>
                    {selectedRequest.status === 'approved' && selectedRequest.approvedAt ? (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {language === 'zh' ? '批准日期' : 'Approved on'}
                        </p>
                        <p className="mt-0.5 text-sm font-medium leading-relaxed text-[#6B5F53]">
                          {formatRequestDate(selectedRequest.approvedAt)}
                        </p>
                      </div>
                    ) : null}
                    {selectedRequest.status === 'declined' && selectedRequest.declinedAt ? (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {language === 'zh' ? '拒绝日期' : 'Declined on'}
                        </p>
                        <p className="mt-0.5 text-sm font-medium leading-relaxed text-[#6B5F53]">
                          {formatRequestDate(selectedRequest.declinedAt)}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {selectedRequest.requestType === 'weekly'
                    ? (() => {
                        let meals = parseMealsPerWeekFromWeeklyRequest(selectedRequest);
                        let weeks = parseDurationWeeksFromWeeklyRequest(selectedRequest);
                        if ((meals <= 0 || weeks <= 0) && typeof selectedRequest.planDescription === 'string') {
                          const parsed = parseWeeklyFromPlanDescription(selectedRequest.planDescription);
                          if (meals <= 0) meals = parsed.meals;
                          if (weeks <= 0) weeks = parsed.weeks;
                        }
                        const typeDisplay =
                          meals > 0
                            ? weeklyVoucherTypeLabel(meals, language)
                            : typeof selectedRequest.planDescription === 'string' && selectedRequest.planDescription.trim()
                              ? selectedRequest.planDescription
                              : '—';
                        return (
                          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-[#C2884E]/10 pt-4 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">
                                {language === 'zh' ? '餐券类型' : 'Voucher type'}
                              </p>
                              <p className="mt-0.5 text-sm font-medium leading-relaxed text-[#6B5F53]">{typeDisplay}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">
                                {language === 'zh' ? '数量' : 'Quantity'}
                              </p>
                              <p className="mt-0.5 text-sm font-medium leading-relaxed text-[#6B5F53]">
                                {weeks > 0 ? `${weeks}${language === 'zh' ? ' 张' : ''}` : '—'}
                              </p>
                            </div>
                          </div>
                        );
                      })()
                    : null}

                  {selectedRequest.requestType === 'daily' ? (
                    <div className="mt-4 grid grid-cols-1 gap-4 border-t border-[#C2884E]/10 pt-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {language === 'zh' ? '餐券类型' : 'Voucher type'}
                        </p>
                        <p className="mt-0.5 text-sm font-medium leading-relaxed text-[#6B5F53]">
                          {selectedRequest.type === 'twoDish'
                            ? language === 'zh'
                              ? '2菜餐券'
                              : '2-Dish Voucher'
                            : language === 'zh'
                              ? '3菜餐券'
                              : '3-Dish Voucher'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {language === 'zh' ? '数量' : 'Quantity'}
                        </p>
                        <p className="mt-0.5 text-sm font-medium leading-relaxed text-[#6B5F53]">
                          {selectedRequest.quantity} {language === 'zh' ? '张' : ''}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-xl border border-[#C2884E]/12 bg-white/90 p-4 shadow-sm">
                  <h2 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#4A3F36]">
                    {language === 'zh' ? '支付信息' : 'Payment'}
                  </h2>
                  <p className="text-xs font-medium text-muted-foreground">
                    {language === 'zh' ? '支付金额' : 'Amount paid'}
                  </p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-[#2E2823]">
                    ${formatMoney(selectedRequest.amount)}
                  </p>

                  <div className="mt-3 rounded-lg bg-[#FBF7F2]/80 px-3 py-2.5 text-sm">
                    {(() => {
                      const breakdown = getPaymentBreakdown(selectedRequest);
                      return (
                        <div className="space-y-1.5">
                          <div className="flex justify-between gap-4 text-[#6B5F53]">
                            <span>{language === 'zh' ? '小计' : 'Subtotal'}</span>
                            <span className="tabular-nums">${breakdown.mealSubtotal.toFixed(2)}</span>
                          </div>
                          {selectedRequest.requestType === 'weekly' ? (
                            <div className="flex justify-between gap-4 text-[#6B5F53]">
                              <span>{language === 'zh' ? '配送费' : 'Delivery fee'}</span>
                              <span className="tabular-nums">${breakdown.deliveryFeeTotal.toFixed(2)}</span>
                            </div>
                          ) : null}
                          {selectedRequest.promoCode ? (
                            <div className="flex justify-between gap-4 font-medium text-[#5A7A52]">
                              <span>
                                {language === 'zh' ? '优惠折扣' : 'Promo discount'} ({selectedRequest.promoCode})
                              </span>
                              <span className="tabular-nums">- ${breakdown.promoDiscount.toFixed(2)}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between gap-4 text-[#6B5F53]">
                            <span>{language === 'zh' ? '税费' : 'Tax'}</span>
                            <span className="tabular-nums">${breakdown.taxAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4 border-t border-[#C2884E]/15 pt-2 font-semibold text-[#2E2823]">
                            <span>{language === 'zh' ? '总金额' : 'Final total'}</span>
                            <span className="tabular-nums">${breakdown.finalTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {(selectedRequest.paymentMethod || selectedRequest.referenceNumber) && (
                    <div className="mt-3 space-y-3 border-t border-[#C2884E]/10 pt-3">
                      {selectedRequest.paymentMethod ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {language === 'zh' ? '支付方式' : 'Payment method'}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-[#6B5F53]">
                            {formatPaymentMethodName(selectedRequest.paymentMethod, language)}
                          </p>
                        </div>
                      ) : null}
                      {selectedRequest.referenceNumber ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {paymentReferenceFieldLabel(selectedRequest.paymentMethod, language)}
                          </p>
                          <p className="mt-0.5 select-text break-words text-sm font-medium leading-relaxed text-[#6B5F53] [overflow-wrap:anywhere]">
                            {selectedRequest.referenceNumber}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </section>

                {selectedRequest.status === 'approved' && selectedRequest.requestType === 'daily' ? (
                  <section className="rounded-xl border border-[#C2884E]/12 bg-white/90 p-4 shadow-sm">
                    <h2 className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#4A3F36]">
                      {language === 'zh' ? '批准餐券' : 'Approved vouchers'}
                    </h2>
                    <p className="text-sm font-semibold text-[#2F5A3C]">
                      {selectedRequest.quantity}{' '}
                      {selectedRequest.type === 'twoDish'
                        ? language === 'zh'
                          ? '2菜餐券'
                          : '2-Dish Voucher'
                        : language === 'zh'
                          ? '3菜餐券'
                          : '3-Dish Voucher'}
                    </p>
                  </section>
                ) : null}

                {selectedRequest.notes ? (
                  <section className="rounded-xl border border-[#C2884E]/12 bg-white/90 p-4 shadow-sm">
                    <h2 className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#4A3F36]">
                      {language === 'zh' ? '您的备注' : 'Your notes'}
                    </h2>
                    <p className="text-sm leading-relaxed text-[#6B5F53]">{selectedRequest.notes}</p>
                  </section>
                ) : null}

                {selectedRequest.adminNotes ? (
                  <section className="rounded-xl border border-[#C2884E]/12 bg-white/90 p-4 shadow-sm">
                    <h2 className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#4A3F36]">
                      {language === 'zh' ? '管理员备注' : 'Admin notes'}
                    </h2>
                    <p className="text-sm leading-relaxed text-[#6B5F53]">{selectedRequest.adminNotes}</p>
                  </section>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 border-t border-[#C2884E]/10 bg-[#FBF7F2]/35 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <Button
                  variant="outline"
                  className="h-11 min-h-11 w-full gap-2 rounded-xl border border-[#C2884E]/20 bg-white/90 text-base font-medium text-[#6B5F53] shadow-sm hover:bg-[#fff6ef] sm:w-auto sm:px-5"
                  onClick={() => {
                    setImageDialogOpen(true);
                  }}
                >
                  <ImageIcon className="h-4 w-4 shrink-0 text-[#C2884E]" />
                  {language === 'zh' ? '查看付款证明' : 'View payment proof'}
                </Button>
                <Button
                  className="h-11 min-h-11 w-full rounded-xl bg-gradient-to-r from-[#C2884E] to-[#D1A46C] px-5 text-base font-semibold text-white shadow-md shadow-[#C2884E]/15 hover:opacity-90 sm:w-auto"
                  onClick={() => setSelectedRequest(null)}
                >
                  {language === 'zh' ? '关闭' : 'Close'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="w-[calc(100vw-1.25rem)] sm:max-w-[700px] max-h-[min(90vh,780px)] gap-0 overflow-y-auto border-[#E8DDD4] p-0 shadow-lg sm:rounded-2xl">
          {selectedRequest && (
            <>
              <VisuallyHidden>
                <DialogTitle>{language === 'zh' ? '付款证明' : 'Payment proof'}</DialogTitle>
              </VisuallyHidden>
              <div className="border-b border-[#C2884E]/10 bg-gradient-to-b from-[#FBF7F2] to-[#FFFCF9] px-5 pt-5 pb-4 sm:px-6">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="text-lg font-semibold leading-snug text-[#6B5F53]">
                    {language === 'zh' ? '付款证明' : 'Payment proof'}
                  </DialogTitle>
                  <DialogDescription className="font-mono text-xs text-[#6B5F53]/70 sm:text-sm">
                    {selectedRequest.requestId}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="px-5 py-5 sm:px-6">
                <div className="flex flex-col items-center">
                  <img
                    src={selectedRequest.imageProof}
                    alt={language === 'zh' ? '付款凭证' : 'Payment proof'}
                    className="max-w-full rounded-xl border border-[#C2884E]/12 shadow-sm"
                  />

                  <Button
                    variant="outline"
                    className="mt-4 gap-2 rounded-xl border border-[#C2884E]/20 bg-white/90 px-4 font-medium text-[#6B5F53] hover:bg-[#fff6ef]"
                    onClick={() => window.open(selectedRequest.imageProof, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {language === 'zh' ? '在新标签页中打开' : 'Open in new tab'}
                  </Button>
                </div>
              </div>

              <div className="border-t border-[#C2884E]/10 bg-[#FBF7F2]/35 px-5 py-4 sm:px-6">
                <Button
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-[#C2884E] to-[#D1A46C] font-semibold text-white shadow-md shadow-[#C2884E]/15 hover:opacity-90 sm:ml-auto sm:w-auto"
                  onClick={() => setImageDialogOpen(false)}
                >
                  {language === 'zh' ? '关闭' : 'Close'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
