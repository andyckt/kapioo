"use client"

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Mail, Send, Users, TestTube, Loader2 } from 'lucide-react'
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
    jobId: '',
    status: 'idle',
    emailsSent: 0,
    emailsFailed: 0,
    totalUsers: 0,
    progress: 0,
    currentBatch: 0,
    totalBatches: 0,
    isComplete: false,
    failedEmails: [] as Array<{ email: string; name: string; error: string }>,
    startedAt: null as Date | null,
    lastProcessedAt: null as Date | null,
    completedAt: null as Date | null,
  })
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  const startJobPolling = (jobId: string, fallbackTotalUsers = 0) => {
    stopPolling()

    const pollOnce = async () => {
      try {
        const response = await fetch(`/api/admin/next-week-email-jobs/${jobId}`)
        const result = await response.json()

        if (!result.success) {
          return
        }

        const data = result.data
        const isComplete = data.status === 'completed' || data.status === 'failed'

        setProgress((prev) => ({
          ...prev,
          jobId,
          status: data.status,
          emailsSent: data.sentCount ?? prev.emailsSent,
          emailsFailed: data.failedCount ?? prev.emailsFailed,
          totalUsers: data.totalUsers || fallbackTotalUsers || prev.totalUsers,
          progress: data.progress ?? prev.progress,
          isComplete,
          failedEmails: Array.isArray(data.failedEmails) ? data.failedEmails : prev.failedEmails,
          startedAt: data.startedAt ? new Date(data.startedAt) : prev.startedAt,
          lastProcessedAt: data.lastProcessedAt ? new Date(data.lastProcessedAt) : prev.lastProcessedAt,
          completedAt: data.completedAt ? new Date(data.completedAt) : prev.completedAt,
        }))

        if (isComplete) {
          stopPolling()
        }
      } catch (error) {
        console.error('Error polling email job status:', error)
      }
    }

    void pollOnce()
    pollTimerRef.current = setInterval(() => {
      void pollOnce()
    }, 2000)
  }

  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

  // Update current time every second for live time calculations
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Helper functions for time calculations
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const getElapsedTime = () => {
    if (!progress.startedAt) return '0s'
    const elapsed = currentTime.getTime() - progress.startedAt.getTime()
    return formatDuration(elapsed)
  }

  const getEstimatedTimeRemaining = () => {
    if (!progress.startedAt || progress.emailsSent === 0 || progress.isComplete) return 'Calculating...'
    
    const elapsed = currentTime.getTime() - progress.startedAt.getTime()
    const emailsProcessed = progress.emailsSent + progress.emailsFailed
    const emailsRemaining = progress.totalUsers - emailsProcessed
    
    if (emailsRemaining <= 0) return 'Almost done...'
    
    const avgTimePerEmail = elapsed / emailsProcessed
    const estimatedMs = avgTimePerEmail * emailsRemaining
    
    return formatDuration(estimatedMs)
  }

  const getProcessingSpeed = () => {
    if (!progress.startedAt || progress.emailsSent === 0) return '0'
    
    const elapsed = (currentTime.getTime() - progress.startedAt.getTime()) / 1000 // in seconds
    const emailsProcessed = progress.emailsSent + progress.emailsFailed
    const emailsPerMinute = (emailsProcessed / elapsed) * 60
    
    return emailsPerMinute.toFixed(1)
  }

  const getTimeSinceLastUpdate = () => {
    if (!progress.lastProcessedAt) return 'Never'
    const diff = currentTime.getTime() - progress.lastProcessedAt.getTime()
    
    if (diff < 5000) return 'Just now'
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    return `${Math.floor(diff / 60000)}m ago`
  }
  
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
  
  // Confirm send to all (creates async job that background worker will process)
  const confirmSendToAll = async () => {
    setShowSummaryDialog(false)
    setShowProgressDialog(true)

    try {
      setProgress({
        jobId: '',
        status: 'pending',
        emailsSent: 0,
        emailsFailed: 0,
        totalUsers: summary?.eligibleUsers || 0,
        progress: 0,
        currentBatch: 0,
        totalBatches: 0,
        isComplete: false,
        failedEmails: []
      })

      const response = await fetch('/api/admin/next-week-email-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to create email job')
      }

      const jobId = result.data?.jobId
      if (!jobId) {
        throw new Error('Email job id missing')
      }

      startJobPolling(jobId, result.data?.totalUsers || summary?.eligibleUsers || 0)
    } catch (error) {
      console.error('Error sending emails:', error)
      toast({
        title: "Error",
        description: "Failed to send emails",
        variant: "destructive"
      })
      setProgress((prev) => ({ ...prev, status: 'failed', isComplete: true }))
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
  
  // Select/Deselect all users (entire database, not just current page)
  const toggleSelectAll = async () => {
    // If all users are already selected, deselect all
    if (selectedUserIds.size === totalUsers) {
      setSelectedUserIds(new Set())
      return
    }
    
    // Otherwise, fetch all user IDs and select them
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        idsOnly: 'true',
        ...(searchTerm && { search: searchTerm })
      })
      
      const response = await fetch(`/api/admin/eligible-users?${params}`)
      const data = await response.json()
      
      if (data.success) {
        const allIds = new Set(data.data.ids)
        setSelectedUserIds(allIds)
        toast({
          title: "All users selected",
          description: `${data.data.total} users selected`
        })
      }
    } catch (error) {
      console.error('Error fetching all user IDs:', error)
      toast({
        title: "Error",
        description: "Failed to select all users",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
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
      setProgress({
        jobId: '',
        status: 'pending',
        emailsSent: 0,
        emailsFailed: 0,
        totalUsers: selectedUserIds.size,
        progress: 0,
        currentBatch: 0,
        totalBatches: 0,
        isComplete: false,
        failedEmails: []
      })

      const response = await fetch('/api/admin/next-week-email-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedUserIds) })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to create email job')
      }

      const jobId = result.data?.jobId
      if (!jobId) {
        throw new Error('Email job id missing')
      }

      startJobPolling(jobId, result.data?.totalUsers || selectedUserIds.size)
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
      setProgress({
        jobId: '',
        status: 'processing',
        emailsSent: 0,
        emailsFailed: 0,
        totalUsers: 15,
        progress: 0,
        currentBatch: 0,
        totalBatches: 0,
        isComplete: false,
        failedEmails: []
      })

      const response = await fetch('/api/admin/notify-next-week-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testBatchMode: true })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to run test batch')
      }

      const data = result.data || {}
      const total = data.totalUsers || 15
      const sent = data.emailsSent || 0
      const failed = data.emailsFailed || 0

      setProgress((prev) => ({
        ...prev,
        status: failed > 0 ? 'failed' : 'completed',
        emailsSent: sent,
        emailsFailed: failed,
        totalUsers: total,
        progress: total > 0 ? Math.round(((sent + failed) / total) * 100) : 100,
        isComplete: true,
        failedEmails: data.failedEmails || []
      }))
    } catch (error) {
      console.error('Error sending test batch:', error)
      toast({
        title: "Error",
        description: "Failed to send test batch",
        variant: "destructive"
      })
    }
  }

  // Select/Deselect users from current page only
  const toggleSelectPage = () => {
    const currentPageIds = users.map((user) => user._id)
    const allCurrentSelected =
      currentPageIds.length > 0 &&
      currentPageIds.every((id) => selectedUserIds.has(id))

    const nextSelected = new Set(selectedUserIds)
    if (allCurrentSelected) {
      currentPageIds.forEach((id) => nextSelected.delete(id))
    } else {
      currentPageIds.forEach((id) => nextSelected.add(id))
    }
    setSelectedUserIds(nextSelected)
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
                  Send to all eligible users (excludes unsubscribed, bounced, invalid).
                  Job is queued and processed automatically in the background.
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectPage}
                  disabled={isLoading || users.length === 0}
                >
                  {users.length > 0 && users.every((u) => selectedUserIds.has(u._id))
                    ? 'Deselect this page'
                    : 'Select this page'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleSelectAll}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : selectedUserIds.size === totalUsers ? (
                    'Deselect All'
                  ) : (
                    `Select All (${totalUsers})`
                  )}
                </Button>
              </div>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {progress.isComplete ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Sending Complete
                </>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-[#C2884E]" />
                  Sending Emails...
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {progress.isComplete 
                ? `Completed ${progress.completedAt ? `at ${progress.completedAt.toLocaleTimeString()}` : 'successfully'}`
                : 'Processing in background via automated cron job'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Progress Bar with Percentage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="text-[#6B5F53]">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="w-full h-3" />
            </div>
            
            {/* Main Stats Grid */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-3xl font-bold text-green-600">
                  {progress.emailsSent}
                </div>
                <div className="text-sm text-green-700 font-medium">Sent Successfully</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="text-3xl font-bold text-red-600">
                  {progress.emailsFailed}
                </div>
                <div className="text-sm text-red-700 font-medium">Failed</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">
                  {progress.totalUsers}
                </div>
                <div className="text-sm text-blue-700 font-medium">Total Users</div>
              </div>
            </div>

            {/* Detailed Information */}
            {!progress.isComplete && (
              <div className="bg-gradient-to-r from-[#F5EDE4] to-[#FFF6EF] rounded-lg p-4 space-y-3 border border-[#C2884E]/20">
                <h4 className="font-semibold text-[#C2884E] flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Real-Time Monitoring
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6B5F53]">Time Elapsed:</span>
                    <span className="font-semibold text-[#333]">{getElapsedTime()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B5F53]">Est. Remaining:</span>
                    <span className="font-semibold text-[#333]">{getEstimatedTimeRemaining()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B5F53]">Processing Speed:</span>
                    <span className="font-semibold text-[#333]">{getProcessingSpeed()} emails/min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B5F53]">Last Update:</span>
                    <span className="font-semibold text-[#333]">{getTimeSinceLastUpdate()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B5F53]">Remaining:</span>
                    <span className="font-semibold text-[#333]">{progress.totalUsers - (progress.emailsSent + progress.emailsFailed)} emails</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B5F53]">Status:</span>
                    <span className="font-semibold text-[#333] capitalize">{progress.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Completion Summary */}
            {progress.isComplete && (
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
                  <CheckCircle className="h-4 w-4" />
                  Completion Summary
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Total Time:</span>
                    <span className="font-semibold text-green-900">
                      {progress.startedAt && progress.completedAt 
                        ? formatDuration(progress.completedAt.getTime() - progress.startedAt.getTime())
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Success Rate:</span>
                    <span className="font-semibold text-green-900">
                      {progress.totalUsers > 0 
                        ? `${((progress.emailsSent / progress.totalUsers) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Started:</span>
                    <span className="font-semibold text-green-900">
                      {progress.startedAt?.toLocaleTimeString() || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Completed:</span>
                    <span className="font-semibold text-green-900">
                      {progress.completedAt?.toLocaleTimeString() || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Important Notice */}
            {!progress.isComplete && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">You can safely close this dialog!</p>
                  <p className="text-amber-700">
                    The email sending process runs automatically on the server via Cron-Job.org. 
                    Even if you close this tab or browser, emails will continue sending in the background. 
                    You can come back anytime to check progress.
                  </p>
                </div>
              </div>
            )}
            
            {/* Failed Emails Section */}
            {progress.failedEmails.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
                  <XCircle className="h-4 w-4" />
                  Failed Emails ({progress.failedEmails.length})
                </h4>
                <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                  {progress.failedEmails.map((failed, index) => (
                    <div key={index} className="bg-white rounded p-2 border border-red-100">
                      <div className="font-medium text-red-900">{failed.name}</div>
                      <div className="text-red-700">{failed.email}</div>
                      <div className="text-red-600 text-xs mt-1">Error: {failed.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant={progress.isComplete ? 'default' : 'outline'}
              onClick={() => setShowProgressDialog(false)}
              className={progress.isComplete ? 'bg-gradient-to-r from-[#C2884E] to-[#D1A46C]' : ''}
            >
              {progress.isComplete ? 'Close' : 'Hide (Continues in Background)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
