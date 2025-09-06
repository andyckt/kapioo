'use client'

import React, { useState } from 'react'
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
  id: string;
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

// Mock data for voucher purchase requests
const mockRequests: VoucherPurchaseRequest[] = [
  {
    id: 'VPR-001',
    userId: {
      _id: 'user1',
      name: 'John Smith',
      email: 'john@example.com'
    },
    type: 'twoDish',
    quantity: 10,
    amount: 195,
    imageProof: 'payment_proof_1.jpg',
    notes: 'First time purchase',
    status: 'pending',
    createdAt: '2023-05-27T08:30:00Z'
  },
  {
    id: 'VPR-002',
    userId: {
      _id: 'user2',
      name: 'Emily Wong',
      email: 'emily@example.com'
    },
    type: 'threeDish',
    quantity: 22,
    amount: 417,
    imageProof: 'payment_proof_2.jpg',
    notes: 'Monthly subscription',
    status: 'approved',
    createdAt: '2023-05-26T15:45:00Z',
    approvedAt: '2023-05-26T17:20:00Z',
    adminNotes: 'Payment verified'
  },
  {
    id: 'VPR-003',
    userId: {
      _id: 'user3',
      name: 'Michael Chen',
      email: 'michael@example.com'
    },
    type: 'twoDish',
    quantity: 46,
    amount: 712,
    imageProof: 'payment_proof_3.jpg',
    status: 'declined',
    createdAt: '2023-05-25T10:15:00Z',
    declinedAt: '2023-05-25T14:30:00Z',
    adminNotes: 'Payment not received'
  },
  {
    id: 'VPR-004',
    userId: {
      _id: 'user4',
      name: 'Sarah Johnson',
      email: 'sarah@example.com'
    },
    type: 'threeDish',
    quantity: 10,
    amount: 228,
    imageProof: 'payment_proof_4.jpg',
    notes: 'Family plan',
    status: 'pending',
    createdAt: '2023-05-27T09:45:00Z'
  },
  {
    id: 'VPR-005',
    userId: {
      _id: 'user5',
      name: 'David Lee',
      email: 'david@example.com'
    },
    type: 'twoDish',
    quantity: 22,
    amount: 356,
    imageProof: 'payment_proof_5.jpg',
    status: 'pending',
    createdAt: '2023-05-27T11:20:00Z'
  }
]

export function MealVoucherManagement() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<VoucherPurchaseRequest[]>(mockRequests)
  const [isLoading, setIsLoading] = useState(false)
  const [viewRequestOpen, setViewRequestOpen] = useState(false)
  const [approveRequestOpen, setApproveRequestOpen] = useState(false)
  const [declineRequestOpen, setDeclineRequestOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<VoucherPurchaseRequest | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [processingRequest, setProcessingRequest] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter requests based on active tab and search query
  const filteredRequests = requests.filter(request => {
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'pending' && request.status === 'pending') ||
      (activeTab === 'approved' && request.status === 'approved') ||
      (activeTab === 'declined' && request.status === 'declined')
    
    const matchesSearch = 
      request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.userId.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.userId.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesTab && matchesSearch
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

  // Handle refresh
  const handleRefresh = () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: "Refreshed",
        description: "Voucher purchase requests have been refreshed",
      })
    }, 1000)
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
  const handleApproveRequest = () => {
    if (!selectedRequest) return;
    
    setProcessingRequest(true)
    // Simulate API call
    setTimeout(() => {
      setProcessingRequest(false)
      setApproveRequestOpen(false)
      
      // Update the request status
      const updatedRequests = requests.map(req => 
        req.id === selectedRequest.id 
          ? { 
              ...req, 
              status: 'approved' as const, 
              approvedAt: new Date().toISOString(),
              adminNotes: adminNotes || undefined
            } 
          : req
      )
      setRequests(updatedRequests)
      
      toast({
        title: "Request Approved",
        description: `Vouchers have been added to ${selectedRequest.userId.name}'s account.`,
      })
    }, 1500)
  }

  // Handle decline request
  const handleDeclineRequest = () => {
    if (!selectedRequest) return;
    
    setProcessingRequest(true)
    // Simulate API call
    setTimeout(() => {
      setProcessingRequest(false)
      setDeclineRequestOpen(false)
      
      // Update the request status
      const updatedRequests = requests.map(req => 
        req.id === selectedRequest.id 
          ? { 
              ...req, 
              status: 'declined' as const, 
              declinedAt: new Date().toISOString(),
              adminNotes: adminNotes || undefined
            } 
          : req
      )
      setRequests(updatedRequests)
      
      toast({
        title: "Request Declined",
        description: `${selectedRequest.userId.name} has been notified.`,
      })
    }, 1500)
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
        <h2 className="text-3xl font-bold tracking-tight">Meal Voucher Requests</h2>
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
            <CardTitle>Voucher Purchase Requests</CardTitle>
            <CardDescription>
              Review and process meal voucher purchase requests from users
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
                      <tr key={request.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 align-middle">{request.id}</td>
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
                      {/* In a real application, this would be an actual image preview */}
                      <div className="bg-[#F5EDE4]/50 rounded-md p-4 mb-3">
                        <div className="flex items-center justify-center">
                          <ExternalLink className="h-10 w-10 text-[#C2884E]" />
                        </div>
                        <p className="mt-2 text-sm text-[#6B5F53]">
                          {selectedRequest.imageProof}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-[#C2884E]/20 text-[#6B5F53] hover:bg-[#F5EDE4]/50 hover:text-[#C2884E]"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Payment Proof
                      </Button>
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
