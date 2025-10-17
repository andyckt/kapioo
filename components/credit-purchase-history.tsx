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

interface CreditPurchaseHistoryProps {
  userId: string;
}

export function CreditPurchaseHistory({ userId }: CreditPurchaseHistoryProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
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

  // Fetch credit purchase requests
  const fetchRequests = async (page = 1) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/credits/request?userId=${userId}&page=${page}&limit=${pagination.limit}`);
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.data.requests);
        setPagination({
          page: data.data.page,
          limit: data.data.limit,
          total: data.data.total,
          pages: Math.ceil(data.data.total / data.data.limit)
        });
      } else {
        console.error("Error fetching credit requests:", data.error);
        toast({
          title: language === 'en' ? "Error" : "错误",
          description: language === 'en' ? "Failed to load credit requests" : "加载充值请求失败",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching credit requests:", error);
      toast({
        title: language === 'en' ? "Error" : "错误",
        description: language === 'en' ? "Failed to load credit requests" : "加载充值请求失败",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load requests when component mounts or when key changes
  useEffect(() => {
    if (userId) {
      console.log('CreditPurchaseHistory: Fetching requests');
      fetchRequests();
    }
  }, [userId]);
  
  // Force refresh when component is remounted with a new key
  useEffect(() => {
    console.log('CreditPurchaseHistory: Component mounted/remounted');
  }, []);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'en' ? 'Credit Purchase Requests' : '充值请求'}</CardTitle>
        <CardDescription>
          {language === 'en' 
            ? 'View your credit purchase request history and status' 
            : '查看您的餐券购买请求历史和状态'
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
              <Card key={request._id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
                      <p className="text-muted-foreground">${request.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'en' ? 'via e-Transfer' : '通过电子转账'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">
                        {language === 'en' ? 'Plan' : '套餐'}
                      </p>
                      {request.planDescription ? (
                        <p className="text-muted-foreground">{request.planDescription}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{language === 'en' ? 'No plan details' : '无套餐详情'}</p>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {language === 'en' ? 'Status' : '状态'}
                      </p>
                      <div className="mt-1">
                        <RequestStatusBadge status={request.status} />
                      </div>
                      {request.status === 'approved' && request.approvedCredits && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          {request.approvedCredits} {language === 'en' ? 'credits added' : '餐券已添加'}
                        </p>
                      )}
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
                ? 'Your credit purchase requests will appear here' 
                : '您的充值请求将显示在这里'
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
                        {language === 'en' ? 'Amount Paid' : '支付金额'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${selectedRequest.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'en' ? 'Amount transferred via e-Transfer' : '通过电子转账支付的金额'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'en' ? 'Status' : '状态'}
                      </p>
                      <div className="mt-1">
                        <RequestStatusBadge status={selectedRequest.status} />
                      </div>
                      {selectedRequest.status === 'approved' && selectedRequest.approvedCredits && (
                        <p className="text-xs text-green-600 font-medium mt-2">
                          {selectedRequest.approvedCredits} {language === 'en' ? 'credits added to your account' : '餐券已添加到您的账户'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {selectedRequest.planDescription && (
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'en' ? 'Selected Plan' : '所选套餐'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRequest.planDescription}
                      </p>
                    </div>
                  )}
                  
                  {selectedRequest.status === 'approved' && (
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'en' ? 'Approved Credits' : '批准餐券'}
                      </p>
                      <p className="text-sm text-green-600 font-medium">
                        {selectedRequest.approvedCredits}
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
