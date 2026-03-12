"use client"

import { useState, useEffect } from "react"
import { Loader2, ExternalLink, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Image as ImageIcon, Gem, Ticket } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import { buildCanonicalBreakdown } from "@/lib/price-breakdown"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UnifiedRechargeHistoryProps {
  userId: string;
  weeklyRefreshKey?: number;
  dailyRefreshKey?: number;
}

export function UnifiedRechargeHistory({ 
  userId, 
  weeklyRefreshKey = 0, 
  dailyRefreshKey = 0 
}: UnifiedRechargeHistoryProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
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

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === 'en' ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Request status badge
  const RequestStatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {language === 'en' ? 'Pending' : '待处理'}
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {language === 'en' ? 'Approved' : '已批准'}
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {language === 'en' ? 'Declined' : '已拒绝'}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const getRequestTypeIcon = (type: string) => {
    if (type === 'weekly') {
      return <Gem className="h-4 w-4 text-[#C2884E]" />;
    } else {
      return <Ticket className="h-4 w-4 text-[#C2884E]" />;
    }
  };

  const getDisplayType = (request: { requestType?: string }) =>
    request.requestType === 'weekly'
      ? (language === 'zh' ? '周次Meal Box' : 'Weekly Subscription')
      : (language === 'zh' ? '每日直送' : 'Daily Delivery');

  // Get voucher/plan details display
  const getRequestDetails = (request: any) => {
    if (request.requestType === 'weekly') {
      // Weekly subscription request
      // Use planDescription if available, otherwise format it consistently
      if (request.planDescription) {
        return request.planDescription;
      }
      
      const mealsPerWeek = request.mealsPerWeek || 0;
      const duration = request.duration || 1;
      
      // Format similar to the 套餐 field in credit-purchase-history
      return `${mealsPerWeek} meals/week × ${duration}`;
    } else {
      // Daily delivery request
      const type = request.type === 'twoDish'
        ? (language === 'zh' ? '2菜餐券' : '2-Dish Voucher')
        : (language === 'zh' ? '3菜餐券' : '3-Dish Voucher');
      
      return `${type} × ${request.quantity}`;
    }
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
    <Card>
      <CardHeader>
        <CardTitle>{language === 'zh' ? '充值请求历史' : 'Recharge Request History'}</CardTitle>
        <CardDescription>
          {language === 'zh' 
            ? '查看您的所有充值请求历史和状态' 
            : 'View all your recharge request history and status'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">
              {language === 'zh' ? '加载请求中...' : 'Loading requests...'}
            </span>
          </div>
        ) : requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request._id || request.requestId} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="p-4 pb-2 bg-muted/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#F5EDE4] flex items-center justify-center">
                        {getRequestTypeIcon(request.requestType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{getDisplayType(request)}</p>
                          <Badge variant="outline" className="bg-[#F5EDE4] text-[#6B5F53] border-[#C2884E]/20">
                            {request.requestId}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(request.createdAt)}
                        </p>
                      </div>
                    </div>
                    <RequestStatusBadge status={request.status} />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium">
                        {language === 'zh' ? '充值详情' : 'Recharge Details'}
                      </p>
                      <p className="text-muted-foreground">
                        {getRequestDetails(request)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">
                        {language === 'zh' ? '支付金额' : 'Amount Paid'}
                      </p>
                      <p className="text-muted-foreground">${formatMoney(request.amount)}</p>
                      {request.promoCode && (
                        <p className="text-xs text-green-700 mt-1">
                          {language === 'zh' ? '优惠码:' : 'Promo:'} {request.promoCode} (-${Number(request.promoDiscountAmount || 0).toFixed(2)})
                        </p>
                      )}
                      {request.referenceNumber && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">{language === 'zh' ? 'INTERAC 电子转账邮箱:' : 'INTERAC e-Transfer Email:'}</span> {request.referenceNumber}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {language === 'zh' ? '状态' : 'Status'}
                      </p>
                      <RequestStatusBadge status={request.status} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1.5"
                    onClick={() => {
                      setSelectedRequest(request);
                      setImageDialogOpen(true);
                    }}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    {language === 'zh' ? '查看证明' : 'View Proof'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedRequest(request)}
                  >
                    {language === 'zh' ? '详情' : 'Details'}
                  </Button>
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
          <div className="text-center py-10 border rounded-md bg-muted/10">
            <div className="mb-3">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">
              {language === 'zh' ? '暂无请求' : 'No requests yet'}
            </h3>
            <p className="text-muted-foreground mt-1">
              {language === 'zh' 
                ? '您的充值请求将显示在这里' 
                : 'Your recharge requests will appear here'
              }
            </p>
          </div>
        )}
      </CardContent>
      
      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest && !imageDialogOpen} onOpenChange={(open) => {
        if (!open) setSelectedRequest(null);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-[#F5EDE4] flex items-center justify-center">
                    {getRequestTypeIcon(selectedRequest.requestType)}
                  </div>
                  <div>
                    <DialogTitle>
                      {getDisplayType(selectedRequest)} {language === 'zh' ? '请求详情' : 'Request Details'}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedRequest.requestId}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="py-4">
                <div className="grid gap-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <span className="text-sm font-medium">
                      {language === 'zh' ? '状态' : 'Status'}
                    </span>
                    <RequestStatusBadge status={selectedRequest.status} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'zh' ? '请求日期' : 'Requested On'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedRequest.createdAt)}
                      </p>
                    </div>
                    
                    {selectedRequest.status === 'approved' && selectedRequest.approvedAt && (
                      <div>
                        <p className="text-sm font-medium">
                          {language === 'zh' ? '批准日期' : 'Approved On'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(selectedRequest.approvedAt)}
                        </p>
                      </div>
                    )}
                    
                    {selectedRequest.status === 'declined' && selectedRequest.declinedAt && (
                      <div>
                        <p className="text-sm font-medium">
                          {language === 'zh' ? '拒绝日期' : 'Declined On'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(selectedRequest.declinedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Weekly specific fields */}
                  {selectedRequest.requestType === 'weekly' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">
                          {language === 'zh' ? '每周餐数' : 'Meals Per Week'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedRequest.mealsPerWeek}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {language === 'zh' ? '周数' : 'Duration'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedRequest.duration} {language === 'zh' ? '周' : (selectedRequest.duration > 1 ? 'weeks' : 'week')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Daily specific fields */}
                  {selectedRequest.requestType === 'daily' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">
                          {language === 'zh' ? '餐券类型' : 'Voucher Type'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedRequest.type === 'twoDish' 
                            ? (language === 'zh' ? '2菜餐券' : '2-Dish Voucher')
                            : (language === 'zh' ? '3菜餐券' : '3-Dish Voucher')
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {language === 'zh' ? '数量' : 'Quantity'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedRequest.quantity} {language === 'zh' ? '张' : ''}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium">
                      {language === 'zh' ? '支付金额' : 'Amount Paid'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${formatMoney(selectedRequest.amount)}
                    </p>
                  </div>

                  <div className="rounded-md border p-3 bg-muted/20">
                    {(() => {
                      const breakdown = getPaymentBreakdown(selectedRequest);
                      return (
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span>{language === 'zh' ? '小计' : 'Subtotal'}</span>
                            <span>${breakdown.mealSubtotal.toFixed(2)}</span>
                          </div>
                          {selectedRequest.requestType === 'weekly' ? (
                            <div className="flex justify-between">
                              <span>{language === 'zh' ? '配送费' : 'Delivery fee'}</span>
                              <span>${breakdown.deliveryFeeTotal.toFixed(2)}</span>
                            </div>
                          ) : null}
                          {selectedRequest.promoCode ? (
                            <div className="flex justify-between text-green-700">
                              <span>{language === 'zh' ? '优惠折扣' : 'Promo Discount'} ({selectedRequest.promoCode})</span>
                              <span>- ${breakdown.promoDiscount.toFixed(2)}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between">
                            <span>{language === 'zh' ? '税费' : 'Tax'}</span>
                            <span>${breakdown.taxAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold pt-1 border-t">
                            <span>{language === 'zh' ? '总金额' : 'Final Total'}</span>
                            <span>${breakdown.finalTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {selectedRequest.referenceNumber && (
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'zh' ? 'INTERAC 电子转账邮箱' : 'INTERAC e-Transfer Email'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRequest.referenceNumber}
                      </p>
                    </div>
                  )}
                  
                  {selectedRequest.status === 'approved' && selectedRequest.requestType === 'daily' && (
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'zh' ? '批准餐券' : 'Approved Vouchers'}
                      </p>
                      <p className="text-sm text-green-600 font-medium">
                        {selectedRequest.quantity} {selectedRequest.type === 'twoDish' 
                          ? (language === 'zh' ? '2菜餐券' : '2-Dish Voucher')
                          : (language === 'zh' ? '3菜餐券' : '3-Dish Voucher')
                        }
                      </p>
                    </div>
                  )}
                  
                  {selectedRequest.notes && (
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'zh' ? '您的备注' : 'Your Notes'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRequest.notes}
                      </p>
                    </div>
                  )}
                  
                  {selectedRequest.adminNotes && (
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'zh' ? '管理员备注' : 'Admin Notes'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRequest.adminNotes}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={() => {
                        setImageDialogOpen(true);
                      }}
                    >
                      <ImageIcon className="h-4 w-4" />
                      {language === 'zh' ? '查看付款证明' : 'View Payment Proof'}
                    </Button>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={() => setSelectedRequest(null)}>
                  {language === 'zh' ? '关闭' : 'Close'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-[#F5EDE4] flex items-center justify-center">
                    {getRequestTypeIcon(selectedRequest.requestType)}
                  </div>
                  <div>
                    <DialogTitle>
                      {language === 'zh' ? '付款证明' : 'Payment Proof'}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedRequest.requestId}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="py-4">
                <div className="flex flex-col items-center">
                  <img 
                    src={selectedRequest.imageProof} 
                    alt="Payment proof" 
                    className="max-w-full rounded-md border shadow-sm"
                  />
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 gap-2"
                    onClick={() => window.open(selectedRequest.imageProof, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {language === 'zh' ? '在新标签页中打开' : 'Open in New Tab'}
                  </Button>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={() => setImageDialogOpen(false)}>
                  {language === 'zh' ? '关闭' : 'Close'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
