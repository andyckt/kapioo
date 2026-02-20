"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Loader2, ExternalLink, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface VoucherPurchaseHistoryProps {
  userId: string;
  refreshKey?: number; // Add a key prop to trigger refresh
}

export function VoucherPurchaseHistory({ userId, refreshKey = 0 }: VoucherPurchaseHistoryProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const toNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const formatMoney = (value: unknown) => toNumber(value).toFixed(2);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    pages: 1
  });
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Fetch voucher purchase requests
  const fetchRequests = async (page = 1) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/voucher-requests?userId=${userId}&page=${page}&limit=${pagination.limit}`);
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.data);
        setPagination({
          page: data.page || 1,
          limit: data.limit || 5,
          total: data.total || 0,
          pages: Math.ceil((data.total || 0) / (data.limit || 5))
        });
      } else {
        console.error("Error fetching voucher requests:", data.error);
        toast({
          title: language === 'en' ? "Error" : "错误",
          description: language === 'en' ? "Failed to load voucher requests" : "加载餐券请求失败",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching voucher requests:", error);
      toast({
        title: language === 'en' ? "Error" : "错误",
        description: language === 'en' ? "Failed to load voucher requests" : "加载餐券请求失败",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load requests when component mounts or refreshKey changes
  useEffect(() => {
    if (userId) {
      console.log('VoucherPurchaseHistory: Fetching requests', { refreshKey });
      fetchRequests();
    }
  }, [userId, refreshKey]);

  // Handle pagination
  const handlePagination = (direction: 'prev' | 'next') => {
    const newPage = direction === 'prev' 
      ? Math.max(1, pagination.page - 1)
      : Math.min(pagination.pages, pagination.page + 1);
      
    if (newPage !== pagination.page) {
      fetchRequests(newPage);
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

  // Get voucher type display
  const getVoucherTypeDisplay = (type: string) => {
    return type === 'twoDish' 
      ? (language === 'en' ? '2-Dish Meal' : '每餐2菜') 
      : (language === 'en' ? '3-Dish Meal' : '每餐3菜');
  };

  const getDailyBreakdown = (request: any) => {
    const subtotal = toNumber(request.originalSubtotal ?? request.originalPrice ?? request.amount);
    const promoDiscount = toNumber(request.promoDiscountAmount);
    const discountedSubtotal = Math.max(0, subtotal - promoDiscount);
    const finalTotal = toNumber(request.finalTotal ?? request.amount);
    const taxAmount = Math.max(0, Number((finalTotal - discountedSubtotal).toFixed(2)));
    return { subtotal, promoDiscount, taxAmount, finalTotal };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'en' ? 'Voucher Purchase Requests' : '充值请求'}</CardTitle>
        <CardDescription>
          {language === 'en' 
            ? 'View your voucher purchase request history and status' 
            : '查看您的餐券充值请求历史和状态'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">
              {language === 'en' ? 'Loading requests...' : '加载请求中...'}
            </span>
          </div>
        ) : requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request._id || request.requestId} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="p-4 pb-2 bg-muted/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{request.requestId}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <RequestStatusBadge status={request.status} />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium">
                        {language === 'en' ? 'Amount Paid' : '支付金额'}
                      </p>
                      <p className="text-muted-foreground">${formatMoney(request.amount)}</p>
                      {request.promoCode && (
                        <p className="text-xs text-green-700 mt-1">
                          {language === 'en' ? 'Promo:' : '优惠码:'} {request.promoCode} (-${Number(request.promoDiscountAmount || 0).toFixed(2)})
                        </p>
                      )}
                      {request.referenceNumber && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">{language === 'en' ? 'INTERAC e-Transfer Email:' : 'INTERAC 电子转账邮箱:'}</span> {request.referenceNumber}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {language === 'en' ? 'Voucher Type' : '餐券类型'}
                      </p>
                      <p className="text-muted-foreground">
                        {getVoucherTypeDisplay(request.type)} × {request.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">
                        {language === 'en' ? 'Status' : '状态'}
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
                    {language === 'en' ? 'View Proof' : '查看证明'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedRequest(request)}
                  >
                    {language === 'en' ? 'Details' : '详情'}
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
                  {language === 'en' ? 'Previous' : '上一页'}
                </Button>
                <div className="text-sm text-muted-foreground">
                  {language === 'en' 
                    ? `Page ${pagination.page} of ${pagination.pages}` 
                    : `第 ${pagination.page} 页，共 ${pagination.pages} 页`
                  }
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePagination('next')}
                  disabled={pagination.page === pagination.pages}
                >
                  {language === 'en' ? 'Next' : '下一页'}
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
              {language === 'en' ? 'No requests yet' : '暂无请求'}
            </h3>
            <p className="text-muted-foreground mt-1">
              {language === 'en' 
                ? 'Your voucher purchase requests will appear here' 
                : '您的餐券充值请求将显示在这里'
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
                <DialogTitle>
                  {language === 'en' ? 'Request Details' : '请求详情'}
                </DialogTitle>
                <DialogDescription>
                  {selectedRequest.requestId}
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <div className="grid gap-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <span className="text-sm font-medium">
                      {language === 'en' ? 'Status' : '状态'}
                    </span>
                    <RequestStatusBadge status={selectedRequest.status} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'en' ? 'Requested On' : '请求日期'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedRequest.createdAt)}
                      </p>
                    </div>
                    
                    {selectedRequest.status === 'approved' && selectedRequest.approvedAt && (
                      <div>
                        <p className="text-sm font-medium">
                          {language === 'en' ? 'Approved On' : '批准日期'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(selectedRequest.approvedAt)}
                        </p>
                      </div>
                    )}
                    
                    {selectedRequest.status === 'declined' && selectedRequest.declinedAt && (
                      <div>
                        <p className="text-sm font-medium">
                          {language === 'en' ? 'Declined On' : '拒绝日期'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(selectedRequest.declinedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'en' ? 'Voucher Type' : '餐券类型'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getVoucherTypeDisplay(selectedRequest.type)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'en' ? 'Quantity' : '数量'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRequest.quantity} {language === 'zh' ? '张' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">
                      {language === 'en' ? 'Amount Paid' : '支付金额'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${formatMoney(selectedRequest.amount)}
                    </p>
                  </div>

                  <div className="rounded-md border p-3 bg-muted/20">
                    {(() => {
                      const breakdown = getDailyBreakdown(selectedRequest);
                      return (
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span>{language === 'en' ? 'Subtotal' : '小计'}</span>
                            <span>${breakdown.subtotal.toFixed(2)}</span>
                          </div>
                          {selectedRequest.promoCode ? (
                            <div className="flex justify-between text-green-700">
                              <span>{language === 'en' ? 'Promo Discount' : '优惠折扣'} ({selectedRequest.promoCode})</span>
                              <span>- ${breakdown.promoDiscount.toFixed(2)}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between">
                            <span>{language === 'en' ? 'Tax' : '税费'}</span>
                            <span>${breakdown.taxAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold pt-1 border-t">
                            <span>{language === 'en' ? 'Final Total' : '总金额'}</span>
                            <span>${breakdown.finalTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {selectedRequest.referenceNumber && (
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'en' ? 'INTERAC e-Transfer Email' : 'INTERAC 电子转账邮箱'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRequest.referenceNumber}
                      </p>
                    </div>
                  )}
                  
                  {selectedRequest.status === 'approved' && (
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'en' ? 'Approved Vouchers' : '批准餐券'}
                      </p>
                      <p className="text-sm text-green-600 font-medium">
                        {selectedRequest.quantity} {getVoucherTypeDisplay(selectedRequest.type)}
                      </p>
                    </div>
                  )}
                  
                  {selectedRequest.notes && (
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'en' ? 'Your Notes' : '您的备注'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRequest.notes}
                      </p>
                    </div>
                  )}
                  
                  {selectedRequest.adminNotes && (
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'en' ? 'Admin Notes' : '管理员备注'}
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
                      {language === 'en' ? 'View Payment Proof' : '查看付款证明'}
                    </Button>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={() => setSelectedRequest(null)}>
                  {language === 'en' ? 'Close' : '关闭'}
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
                <DialogTitle>
                  {language === 'en' ? 'Payment Proof' : '付款证明'}
                </DialogTitle>
                <DialogDescription>
                  {selectedRequest.requestId}
                </DialogDescription>
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
                    {language === 'en' ? 'Open in New Tab' : '在新标签页中打开'}
                  </Button>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={() => setImageDialogOpen(false)}>
                  {language === 'en' ? 'Close' : '关闭'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
