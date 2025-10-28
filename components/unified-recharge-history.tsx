"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Loader2, ExternalLink, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Image as ImageIcon, Gem, Ticket } from "lucide-react"

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
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  // Combined requests array
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Fetch both types of recharge requests and combine them
  const fetchRequests = async (page = 1) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Fetch weekly subscription recharge requests
      const weeklyResponse = await fetch(`/api/credits/request?userId=${userId}&page=1&limit=100`);
      const weeklyData = await weeklyResponse.json();
      
      // Fetch daily delivery recharge requests
      const dailyResponse = await fetch(`/api/voucher-requests?userId=${userId}&page=1&limit=100`);
      const dailyData = await dailyResponse.json();
      
      let combinedRequests = [];
      
      // Process weekly requests
      if (weeklyData.success && weeklyData.data && weeklyData.data.requests) {
        const processedWeeklyRequests = weeklyData.data.requests.map((req: any) => ({
          ...req,
          requestType: 'weekly',
          displayType: language === 'zh' ? '周次Meal Box' : 'Weekly Subscription'
        }));
        combinedRequests = [...combinedRequests, ...processedWeeklyRequests];
      }
      
      // Process daily requests
      if (dailyData.success && dailyData.data) {
        const processedDailyRequests = dailyData.data.map((req: any) => ({
          ...req,
          requestType: 'daily',
          displayType: language === 'zh' ? '每日直送' : 'Daily Delivery'
        }));
        combinedRequests = [...combinedRequests, ...processedDailyRequests];
      }
      
      // Sort combined requests by date (newest first)
      combinedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Apply pagination
      const startIndex = (page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedRequests = combinedRequests.slice(startIndex, endIndex);
      
      setRequests(paginatedRequests);
      setPagination({
        page,
        limit: pagination.limit,
        total: combinedRequests.length,
        pages: Math.ceil(combinedRequests.length / pagination.limit)
      });
    } catch (error) {
      console.error("Error fetching recharge requests:", error);
      toast({
        title: language === 'en' ? "Error" : "错误",
        description: language === 'en' ? "Failed to load recharge requests" : "加载充值请求失败",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load requests when component mounts or refresh keys change
  useEffect(() => {
    if (userId) {
      console.log('UnifiedRechargeHistory: Fetching requests', { weeklyRefreshKey, dailyRefreshKey });
      fetchRequests();
    }
  }, [userId, weeklyRefreshKey, dailyRefreshKey]);

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

  // Get request type display
  const getRequestTypeIcon = (type: string) => {
    if (type === 'weekly') {
      return <Gem className="h-4 w-4 text-[#C2884E]" />;
    } else {
      return <Ticket className="h-4 w-4 text-[#C2884E]" />;
    }
  };

  // Get voucher/plan details display
  const getRequestDetails = (request: any) => {
    if (request.requestType === 'weekly') {
      // Weekly subscription request
      const mealsPerWeek = request.mealsPerWeek || 0;
      const duration = request.duration || 1;
      
      return language === 'zh'
        ? `${mealsPerWeek}餐/周 x ${duration}周`
        : `${mealsPerWeek} meals/week x ${duration} ${duration > 1 ? 'weeks' : 'week'}`;
    } else {
      // Daily delivery request
      const type = request.type === 'twoDish'
        ? (language === 'zh' ? '2菜餐券' : '2-Dish Voucher')
        : (language === 'zh' ? '3菜餐券' : '3-Dish Voucher');
      
      return `${type} × ${request.quantity}`;
    }
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
                          <p className="font-medium text-sm">{request.displayType}</p>
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
                      <p className="text-muted-foreground">${request.amount?.toFixed(2)}</p>
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
                      {selectedRequest.displayType} {language === 'zh' ? '请求详情' : 'Request Details'}
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
                      ${selectedRequest.amount?.toFixed(2)}
                    </p>
                  </div>
                  
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
