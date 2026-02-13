"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Mail, Send, Users, TestTube, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'

export function NextWeekMenuEmail() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [showSelectUsersDialog, setShowSelectUsersDialog] = useState(false)
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  
  // Summary data
  const [summary, setSummary] = useState<any>(null)
  
  // User selection
  const [users, setUsers] = useState<any[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  
  // Progress tracking
  const [progress, setProgress] = useState({
    emailsSent: 0,
    emailsFailed: 0,
    totalUsers: 0,
    progress: 0,
    currentBatch: 0,
    totalBatches: 0,
    isComplete: false,
    failedEmails: [] as Array<{ email: string; name: string; error: string }>
  })
  
  // Fetch summary for "Send to all users"
  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/admin/notify-next-week-menu')
      const data = await response.json()
      
      if (data.success) {
        setSummary(data.data)
      }
    } catch (error) {
      console.error('Error fetching summary:', error)
      toast({
        title: "Error",
        description: "Failed to fetch user summary",
        variant: "destructive"
      })
    }
  }
  
  // Fetch eligible users for selection
  const fetchUsers = async (pageNum: number = 1, search: string = '') => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
        ...(search && { search })
      })
      
      const response = await fetch(`/api/admin/eligible-users?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.data.users)
        setTotalPages(data.data.pages)
        setTotalUsers(data.data.total)
        
        // Select all users by default
        if (selectedUserIds.size === 0) {
          const allIds = new Set(data.data.users.map((u: any) => u._id))
          setSelectedUserIds(allIds)
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle "Send to all users"
  const handleSendToAll = async () => {
    await fetchSummary()
    setShowSummaryDialog(true)
  }
  
  // Confirm send to all
  const confirmSendToAll = async () => {
    setShowSummaryDialog(false)
    setShowProgressDialog(true)
    
    try {
      const response = await fetch('/api/admin/notify-next-week-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // No userIds = send to all
      })
      
      // Handle SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6))
            
            setProgress(prev => ({
              ...prev,
              emailsSent: data.emailsSent || prev.emailsSent,
              emailsFailed: data.emailsFailed || prev.emailsFailed,
              totalUsers: data.totalUsers || prev.totalUsers,
              progress: data.progress || prev.progress,
              currentBatch: data.currentBatch || prev.currentBatch,
              totalBatches: data.totalBatches || prev.totalBatches,
              isComplete: data.type === 'complete',
              failedEmails: data.failedEmails || prev.failedEmails
            }))
          }
        }
      }
    } catch (error) {
      console.error('Error sending emails:', error)
      toast({
        title: "Error",
        description: "Failed to send emails",
        variant: "destructive"
      })
    }
  }
  
  // Handle "Select users to send"
  const handleSelectUsers = async () => {
    setSelectedUserIds(new Set())
    await fetchUsers(1, '')
    setShowSelectUsersDialog(true)
  }
  
  // Toggle user selection
  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUserIds(newSelected)
  }
  
  // Select/Deselect all on current page
  const toggleSelectAll = () => {
    if (users.every(u => selectedUserIds.has(u._id))) {
      // Deselect all on current page
      const newSelected = new Set(selectedUserIds)
      users.forEach(u => newSelected.delete(u._id))
      setSelectedUserIds(newSelected)
    } else {
      // Select all on current page
      const newSelected = new Set(selectedUserIds)
      users.forEach(u => newSelected.add(u._id))
      setSelectedUserIds(newSelected)
    }
  }
  
  // Send to selected users
  const sendToSelected = async () => {
    if (selectedUserIds.size === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user",
        variant: "destructive"
      })
      return
    }
    
    setShowSelectUsersDialog(false)
    setShowProgressDialog(true)
    
    try {
      const response = await fetch('/api/admin/notify-next-week-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedUserIds) })
      })
      
      // Handle SSE stream (same as sendToAll)
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6))
            
            setProgress(prev => ({
              ...prev,
              emailsSent: data.emailsSent || prev.emailsSent,
              emailsFailed: data.emailsFailed || prev.emailsFailed,
              totalUsers: data.totalUsers || prev.totalUsers,
              progress: data.progress || prev.progress,
              currentBatch: data.currentBatch || prev.currentBatch,
              totalBatches: data.totalBatches || prev.totalBatches,
              isComplete: data.type === 'complete',
              failedEmails: data.failedEmails || prev.failedEmails
            }))
          }
        }
      }
    } catch (error) {
      console.error('Error sending emails:', error)
      toast({
        title: "Error",
        description: "Failed to send emails",
        variant: "destructive"
      })
    }
  }
  
  // Handle "Send test email"
  const handleSendTest = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/notify-next-week-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testMode: true,
          testEmail: 'kapioomeal@gmail.com'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "✅ Test email sent!",
          description: "Check your inbox at kapioomeal@gmail.com"
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle "Test Batch" - sends 15 test emails to verify rate limiting
  const handleTestBatch = async () => {
    setShowProgressDialog(true)
    
    try {
      const response = await fetch('/api/admin/notify-next-week-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testBatchMode: true })
      })
      
      // Handle SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6))
            
            setProgress(prev => ({
              ...prev,
              emailsSent: data.emailsSent || prev.emailsSent,
              emailsFailed: data.emailsFailed || prev.emailsFailed,
              totalUsers: data.totalUsers || prev.totalUsers,
              progress: data.progress || prev.progress,
              currentBatch: data.currentBatch || prev.currentBatch,
              totalBatches: data.totalBatches || prev.totalBatches,
              isComplete: data.type === 'complete',
              failedEmails: data.failedEmails || prev.failedEmails
            }))
          }
        }
      }
    } catch (error) {
      console.error('Error sending test batch:', error)
      toast({
        title: "Error",
        description: "Failed to send test batch",
        variant: "destructive"
      })
    }
  }
  
  // Handle search
  const handleSearch = () => {
    setPage(1)
    fetchUsers(1, searchTerm)
  }
  
  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchUsers(newPage, searchTerm)
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#C2884E]" />
            Next Week Menu Update Email
          </CardTitle>
          <CardDescription>
            Send next week's menu update notification to Kapioo users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Button 1: Send to all users */}
            <Card className="border-2 border-[#C2884E]/20 hover:border-[#C2884E]/40 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send to All Users
                </CardTitle>
                <CardDescription>
                  Send to all eligible users (excludes unsubscribed, bounced, invalid)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleSendToAll}
                  className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                  disabled={isLoading}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send to All
                </Button>
              </CardContent>
            </Card>
            
            {/* Button 2: Select users to send */}
            <Card className="border-2 border-blue-200 hover:border-blue-300 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Users
                </CardTitle>
                <CardDescription>
                  Choose specific users to send the email to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleSelectUsers}
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  disabled={isLoading}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Select Users
                </Button>
              </CardContent>
            </Card>
            
            {/* Button 3: Test Batch (NEW) */}
            <Card className="border-2 border-purple-200 hover:border-purple-300 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Test Batch
                </CardTitle>
                <CardDescription>
                  Test with 15 emails to verify rate limiting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleTestBatch}
                  variant="outline"
                  className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                  disabled={isLoading}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Batch (15 emails)
                </Button>
              </CardContent>
            </Card>
            
            {/* Button 4: Send test email */}
            <Card className="border-2 border-green-200 hover:border-green-300 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Test Email
                </CardTitle>
                <CardDescription>
                  Send test email to kapioomeal@gmail.com
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleSendTest}
                  variant="outline"
                  className="w-full border-green-300 text-green-700 hover:bg-green-50"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Send Test
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Sending Summary</DialogTitle>
            <DialogDescription>
              Review before sending to all users
            </DialogDescription>
          </DialogHeader>
          
          {summary && (
            <div className="space-y-4">
              <div className="bg-[#F5EDE4] rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Total accounts:</span>
                  <span className="font-bold">{summary.totalUsers}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span className="font-medium">Will receive email:</span>
                  <span className="font-bold">{summary.eligibleUsers}</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Excluded:</h4>
                <div className="space-y-1 text-sm text-[#6B5F53]">
                  <div className="flex justify-between">
                    <span>• Unsubscribed from this email type:</span>
                    <span>{summary.excluded.unsubscribed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Bounced/blocked emails:</span>
                    <span>{summary.excluded.bounced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Missing/invalid emails:</span>
                    <span>{summary.excluded.invalid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Unverified accounts:</span>
                    <span>{summary.excluded.unverified}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total excluded:</span>
                    <span>{summary.excluded.total}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummaryDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmSendToAll}
              className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
            >
              Confirm Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Select Users Dialog */}
      <Dialog open={showSelectUsersDialog} onOpenChange={setShowSelectUsersDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Users to Send Email</DialogTitle>
            <DialogDescription>
              Choose which users should receive the next week menu update
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-auto">
            {/* Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Search by User ID, Name, or Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} variant="outline">
                Search
              </Button>
            </div>
            
            {/* Selection summary */}
            <div className="flex justify-between items-center bg-[#F5EDE4] rounded-lg p-3">
              <span className="font-medium">
                Selected: {selectedUserIds.size} of {totalUsers} users
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleSelectAll}
              >
                {users.every(u => selectedUserIds.has(u._id)) ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            {/* User list */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#C2884E]" />
                </div>
              ) : (
                users.map((user) => (
                  <div 
                    key={user._id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-[#F5EDE4]/30 transition-colors"
                  >
                    <Checkbox
                      checked={selectedUserIds.has(user._id)}
                      onCheckedChange={() => toggleUser(user._id)}
                    />
                    <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                      <span className="font-medium">ID: {user.userID}</span>
                      <span>{user.name}</span>
                      <span className="text-[#6B5F53]">{user.email}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSelectUsersDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={sendToSelected}
              className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
              disabled={selectedUserIds.size === 0}
            >
              Send to {selectedUserIds.size} Selected Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {progress.isComplete ? 'Sending Complete' : 'Sending Emails...'}
            </DialogTitle>
            <DialogDescription>
              {progress.isComplete 
                ? 'Email sending process has finished'
                : `Batch ${progress.currentBatch} of ${progress.totalBatches}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Progress value={progress.progress} className="w-full" />
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">
                  {progress.emailsSent}
                </div>
                <div className="text-sm text-green-700">Sent</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-600">
                  {progress.emailsFailed}
                </div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600">
                  {progress.totalUsers}
                </div>
                <div className="text-sm text-blue-700">Total</div>
              </div>
            </div>
            
            {progress.failedEmails.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-auto">
                <h4 className="font-medium text-red-800 mb-2">Failed Emails:</h4>
                <div className="space-y-1 text-sm">
                  {progress.failedEmails.map((failed, index) => (
                    <div key={index} className="text-red-700">
                      • {failed.name} ({failed.email}): {failed.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            {progress.isComplete && (
              <Button 
                onClick={() => setShowProgressDialog(false)}
                className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
