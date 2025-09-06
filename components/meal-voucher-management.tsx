'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { 
  Check, 
  X, 
  Eye, 
  RefreshCcw, 
  Download, 
  ExternalLink,
  Loader2,
  Search,
  Filter,
  CreditCard,
  Users,
  Upload,
  Info,
  MessageSquare
} from 'lucide-react'
import { motion } from 'framer-motion'

// Define interfaces for our data
interface UserInfo {
  _id: string;
  name: string;
  email: string;
}

interface VoucherPurchaseRequest {
  id?: string; // For backward compatibility with mock data
  requestId: string;
  userId: UserInfo;
  type: 'twoDish' | 'threeDish';
  quantity: number;
  amount: number;
  imageProof: string;
  notes?: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
  approvedAt?: string;
  declinedAt?: string;
  adminNotes?: string;
}

// No mock data - we'll fetch real data from the API

export function MealVoucherManagement() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<VoucherPurchaseRequest[]>([])
  const [isLoading, setIsLoading] = useState(true) // Start with loading state true
  const [viewRequestOpen, setViewRequestOpen] = useState(false)
  const [approveRequestOpen, setApproveRequestOpen] = useState(false)
  const [declineRequestOpen, setDeclineRequestOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<VoucherPurchaseRequest | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [processingRequest, setProcessingRequest] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch requests when component mounts or active tab changes
  useEffect(() => {
    fetchVoucherRequests()
  }, [activeTab])

  // Filter requests based on search query (tab filtering is done on the server)
  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.requestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.userId.name && request.userId.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (request.userId.email && request.userId.email.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesSearch
  })

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Fetch voucher purchase requests from API
  const fetchVoucherRequests = async () => {
    setIsLoading(true)
    
    try {
      // Get query parameters based on active tab
      let queryParams = '';
      if (activeTab !== 'all') {
        queryParams = `?status=${activeTab}`;
      }
      
      const response = await fetch(`/api/voucher-requests${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch voucher purchase requests');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch voucher purchase requests');
      }
    } catch (error) {
      console.error('Error fetching voucher purchase requests:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to fetch voucher purchase requests',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    fetchVoucherRequests();
    toast({
      title: "Refreshing",
      description: "Fetching the latest voucher purchase requests",
    });
  }

  // Handle view request
  const handleViewRequest = (request: any) => {
    setSelectedRequest(request)
    setViewRequestOpen(true)
  }

  // Handle approve request dialog
  const handleApproveDialog = (request: any) => {
    setSelectedRequest(request)
    setAdminNotes('')
    setApproveRequestOpen(true)
  }

  // Handle decline request dialog
  const handleDeclineDialog = (request: any) => {
    setSelectedRequest(request)
    setAdminNotes('')
    setDeclineRequestOpen(true)
  }

  // Handle approve request
  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    
    setProcessingRequest(true)
    
    try {
      // Call the API to approve the request
      const response = await fetch(`/api/voucher-requests/${selectedRequest.requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'approved',
          adminNotes: adminNotes || undefined
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve request');
      }
      
      const data = await response.json();
      
      // Close the dialog and refresh the requests
      setApproveRequestOpen(false);
      fetchVoucherRequests();
      
      toast({
        title: "Request Approved",
        description: `Vouchers have been added to ${selectedRequest.userId.name}'s account.`,
      });
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to approve request',
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(false);
    }
  }

  // Handle decline request
  const handleDeclineRequest = async () => {
    if (!selectedRequest) return;
    
    setProcessingRequest(true)
    
    try {
      // Call the API to decline the request
      const response = await fetch(`/api/voucher-requests/${selectedRequest.requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'declined',
          adminNotes: adminNotes || undefined
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to decline request');
      }
      
      const data = await response.json();
      
      // Close the dialog and refresh the requests
      setDeclineRequestOpen(false);
      fetchVoucherRequests();
      
      toast({
        title: "Request Declined",
        description: `${selectedRequest.userId.name} has been notified.`,
      });
    } catch (error) {
      console.error('Error declining request:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to decline request',
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(false);
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Get voucher type display
  const getVoucherTypeDisplay = (type: string, quantity: number) => {
    return `${quantity} × ${type === 'twoDish' ? '2-Dish' : '3-Dish'} Vouchers`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">2Dish 3Dish Voucher Requests</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="h-9 gap-1"
        >
          <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>2Dish 3Dish Voucher Requests</CardTitle>
            <CardDescription>
              Review and process voucher purchase requests from users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="declined">Declined</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  className="pl-8 w-full sm:w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Request ID</th>
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium hidden md:table-cell">Vouchers</th>
                    <th className="text-left p-4 font-medium hidden md:table-cell">Amount</th>
                    <th className="text-left p-4 font-medium hidden lg:table-cell">Date</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-center p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </td>
                    </tr>
                  ) : filteredRequests.length > 0 ? (
                    filteredRequests.map((request) => (
                      <tr key={request.requestId} className="border-b hover:bg-muted/50">
                        <td className="p-4 align-middle">{request.requestId}</td>
                        <td className="p-4 align-middle">
                          <div>
                            <div className="font-medium">{request.userId.name}</div>
                            <div className="text-sm text-muted-foreground">{request.userId.email}</div>
                          </div>
                        </td>
                        <td className="p-4 align-middle hidden md:table-cell">
                          {getVoucherTypeDisplay(request.type, request.quantity)}
                        </td>
                        <td className="p-4 align-middle hidden md:table-cell">${request.amount}</td>
                        <td className="p-4 align-middle hidden lg:table-cell">{formatDate(request.createdAt)}</td>
                        <td className="p-4 align-middle">{getStatusBadge(request.status)}</td>
                        <td className="p-4 align-middle text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewRequest(request)}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-100"
                                  onClick={() => handleApproveDialog(request)}
                                >
                                  <Check className="h-4 w-4" />
                                  <span className="sr-only">Approve</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-100"
                                  onClick={() => handleDeclineDialog(request)}
                                >
                                  <X className="h-4 w-4" />
                                  <span className="sr-only">Decline</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        No voucher purchase requests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Request Dialog */}
      <Dialog open={viewRequestOpen} onOpenChange={setViewRequestOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-2 rounded-full text-white">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle>Voucher Purchase Request</DialogTitle>
                <DialogDescription className="mt-1">
                  Request ID: <span className="font-medium">{selectedRequest?.id}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="overflow-y-auto pr-1 flex-1">
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      Submitted on {formatDate(selectedRequest.createdAt)}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(selectedRequest.status)}
                    
                    {selectedRequest.status === 'approved' && selectedRequest.approvedAt && (
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        Approved on {formatDate(selectedRequest.approvedAt)}
                      </p>
                    )}
                    
                    {selectedRequest.status === 'declined' && selectedRequest.declinedAt && (
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        Declined on {formatDate(selectedRequest.declinedAt)}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-[#C2884E]/10">
                    <CardHeader className="pb-2 bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] border-b border-[#C2884E]/10">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#C2884E] p-1.5 rounded-full text-white">
                          <Users className="h-3 w-3" />
                        </div>
                        <CardTitle className="text-base">User Information</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <dl className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <dt className="font-medium text-[#6B5F53]">Name:</dt>
                          <dd className="font-medium">{selectedRequest.userId.name}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="font-medium text-[#6B5F53]">Email:</dt>
                          <dd>{selectedRequest.userId.email}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="font-medium text-[#6B5F53]">User ID:</dt>
                          <dd className="truncate max-w-[180px] text-muted-foreground">{selectedRequest.userId._id}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-[#C2884E]/10">
                    <CardHeader className="pb-2 bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] border-b border-[#C2884E]/10">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#C2884E] p-1.5 rounded-full text-white">
                          <CreditCard className="h-3 w-3" />
                        </div>
                        <CardTitle className="text-base">Purchase Details</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <dl className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <dt className="font-medium text-[#6B5F53]">Voucher Type:</dt>
                          <dd className="font-medium">{selectedRequest.type === 'twoDish' ? '2-Dish' : '3-Dish'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="font-medium text-[#6B5F53]">Quantity:</dt>
                          <dd className="font-medium">{selectedRequest.quantity}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="font-medium text-[#6B5F53]">Amount:</dt>
                          <dd className="font-medium text-[#C2884E]">${selectedRequest.amount}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="border-[#C2884E]/10">
                  <CardHeader className="pb-2 bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] border-b border-[#C2884E]/10">
                    <div className="flex items-center gap-2">
                      <div className="bg-[#C2884E] p-1.5 rounded-full text-white">
                        <Upload className="h-3 w-3" />
                      </div>
                      <CardTitle className="text-base">Payment Proof</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="border border-[#C2884E]/10 rounded-md p-3 text-center">
                      {/* Display the actual image */}
                      <div className="bg-[#F5EDE4]/50 rounded-md p-4 mb-3">
                        {selectedRequest.imageProof && (
                          <div className="flex flex-col items-center">
                            <div className="relative w-full max-w-md h-64 mb-3 overflow-hidden rounded-md border border-[#C2884E]/20">
                              <img 
                                src={selectedRequest.imageProof} 
                                alt="Payment Proof" 
                                className="object-contain w-full h-full"
                                onError={(e) => {
                                  // If image fails to load, show a fallback
                                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='18' y1='6' x2='6' y2='18'%3E%3C/line%3E%3Cline x1='6' y1='6' x2='18' y2='18'%3E%3C/line%3E%3C/svg%3E";
                                  e.currentTarget.className = "object-contain w-full h-full opacity-30";
                                }}
                              />
                            </div>
                            <p className="mt-2 text-sm text-[#6B5F53] break-all">
                              {selectedRequest.imageProof}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-[#C2884E]/20 text-[#6B5F53] hover:bg-[#F5EDE4]/50 hover:text-[#C2884E]"
                          onClick={() => window.open(selectedRequest.imageProof, '_blank')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open in New Tab
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedRequest.notes && (
                    <Card className="border-[#C2884E]/10">
                      <CardHeader className="pb-2 bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] border-b border-[#C2884E]/10">
                        <div className="flex items-center gap-2">
                          <div className="bg-[#C2884E] p-1.5 rounded-full text-white">
                            <Info className="h-3 w-3" />
                          </div>
                          <CardTitle className="text-base">User Notes</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-3">
                        <p className="text-sm text-[#6B5F53]">{selectedRequest.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedRequest.adminNotes && (
                    <Card className="border-[#C2884E]/10">
                      <CardHeader className="pb-2 bg-gradient-to-r from-[#FBF7F2] to-[#F5EDE4] border-b border-[#C2884E]/10">
                        <div className="flex items-center gap-2">
                          <div className="bg-[#C2884E] p-1.5 rounded-full text-white">
                            <MessageSquare className="h-3 w-3" />
                          </div>
                          <CardTitle className="text-base">Admin Notes</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-3">
                        <p className="text-sm text-[#6B5F53]">{selectedRequest.adminNotes}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                {selectedRequest.status === 'pending' && (
                  <div className="flex justify-end gap-4 pt-2 border-t border-[#C2884E]/10">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setViewRequestOpen(false)
                        handleDeclineDialog(selectedRequest)
                      }}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Decline
                    </Button>
                    <Button
                      onClick={() => {
                        setViewRequestOpen(false)
                        handleApproveDialog(selectedRequest)
                      }}
                      className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Request Dialog */}
      <Dialog open={approveRequestOpen} onOpenChange={setApproveRequestOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-full text-white">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle>Approve Voucher Purchase</DialogTitle>
                <DialogDescription className="mt-1">
                  This will add vouchers to the user's account and send a notification.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="overflow-y-auto pr-1 flex-1">
              <div className="space-y-4 py-2">
                <Card className="border-green-100">
                  <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-green-100/50 border-b border-green-100">
                    <div className="flex items-center gap-2">
                      <div className="bg-green-500 p-1.5 rounded-full text-white">
                        <CreditCard className="h-3 w-3" />
                      </div>
                      <CardTitle className="text-base text-green-800">Request Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="font-medium text-green-800">Request ID:</dt>
                        <dd className="font-medium">{selectedRequest.id}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium text-green-800">User:</dt>
                        <dd>{selectedRequest.userId.name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium text-green-800">Vouchers:</dt>
                        <dd>{getVoucherTypeDisplay(selectedRequest.type, selectedRequest.quantity)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium text-green-800">Amount:</dt>
                        <dd className="font-medium">${selectedRequest.amount}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-notes" className="text-[#6B5F53]">Admin Notes (Optional)</Label>
                  <Textarea
                    id="admin-notes"
                    placeholder="Add any notes about this approval..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="border-green-200 focus-visible:ring-green-500/30 focus-visible:border-green-500 min-h-[80px] max-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    These notes will be visible to the user in their purchase history.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="pt-2 mt-2 border-t border-green-100 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setApproveRequestOpen(false)}
              disabled={processingRequest}
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveRequest}
              disabled={processingRequest}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90"
            >
              {processingRequest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Request Dialog */}
      <Dialog open={declineRequestOpen} onOpenChange={setDeclineRequestOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-2 rounded-full text-white">
                <X className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle>Decline Voucher Purchase</DialogTitle>
                <DialogDescription className="mt-1">
                  This will notify the user that their request has been declined.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="overflow-y-auto pr-1 flex-1">
              <div className="space-y-4 py-2">
                <Card className="border-red-100">
                  <CardHeader className="pb-2 bg-gradient-to-r from-red-50 to-red-100/50 border-b border-red-100">
                    <div className="flex items-center gap-2">
                      <div className="bg-red-500 p-1.5 rounded-full text-white">
                        <CreditCard className="h-3 w-3" />
                      </div>
                      <CardTitle className="text-base text-red-800">Request Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="font-medium text-red-800">Request ID:</dt>
                        <dd className="font-medium">{selectedRequest.id}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium text-red-800">User:</dt>
                        <dd>{selectedRequest.userId.name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium text-red-800">Vouchers:</dt>
                        <dd>{getVoucherTypeDisplay(selectedRequest.type, selectedRequest.quantity)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium text-red-800">Amount:</dt>
                        <dd className="font-medium">${selectedRequest.amount}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                <div className="space-y-2">
                  <Label htmlFor="decline-reason" className="text-[#6B5F53]">Reason for Declining (Optional)</Label>
                  <Textarea
                    id="decline-reason"
                    placeholder="Explain why this request is being declined..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="border-red-200 focus-visible:ring-red-500/30 focus-visible:border-red-500 min-h-[80px] max-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    This reason will be included in the notification email sent to the user.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="pt-2 mt-2 border-t border-red-100 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setDeclineRequestOpen(false)}
              disabled={processingRequest}
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeclineRequest}
              disabled={processingRequest}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:opacity-90"
            >
              {processingRequest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
