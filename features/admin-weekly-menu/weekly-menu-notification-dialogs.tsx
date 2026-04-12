"use client"

import { AlertCircle, CheckCircle, History, Loader2, Mail, Send, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"

export type WeeklyMenuNotificationLog = {
  data?: unknown
  message: string
  timestamp: Date
  type: string
}

export type WeeklyMenuNotificationProgress = {
  currentBatch: number
  emailsFailed: number
  emailsSent: number
  failedEmails: Array<{ email: string; name: string; error: string }>
  isComplete: boolean
  logs: WeeklyMenuNotificationLog[]
  progress: number
  totalBatches: number
  totalUsers: number
}

type WeeklyMenuNotificationDialogsProps = {
  isSendingNotifications: boolean
  notificationProgress: WeeklyMenuNotificationProgress
  onCloseNotificationDialog: () => void
  onCloseProgressDialog: () => void
  onOpenNotificationDialogChange: (open: boolean) => void
  onOpenProgressDialogChange: (open: boolean) => void
  onSendNotifications: () => void | Promise<void>
  showNotificationDialog: boolean
  showProgressDialog: boolean
}

export function WeeklyMenuNotificationDialogs({
  isSendingNotifications,
  notificationProgress,
  onCloseNotificationDialog,
  onCloseProgressDialog,
  onOpenNotificationDialogChange,
  onOpenProgressDialogChange,
  onSendNotifications,
  showNotificationDialog,
  showProgressDialog,
}: WeeklyMenuNotificationDialogsProps) {
  return (
    <>
      <Dialog open={showNotificationDialog} onOpenChange={onOpenNotificationDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Send Weekly Menu Update Notification
            </DialogTitle>
            <DialogDescription>
              This will send an email notification to all users who have weekly subscription credits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-semibold text-blue-900">
                <AlertCircle className="h-4 w-4" />
                Email Details:
              </h4>
              <ul className="ml-6 list-disc space-y-1 text-sm text-blue-800">
                <li>Bilingual: English for English users, Chinese for Chinese users</li>
                <li>Eye-catching, minimalistic, high-end design</li>
                <li>Informs users about menu update without specific details</li>
                <li>Includes call-to-action button to view menu</li>
              </ul>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-semibold text-amber-900">
                <Send className="h-4 w-4" />
                Batch Processing:
              </h4>
              <p className="text-sm text-amber-800">
                Emails will be sent in batches of 50 with 2-second delays between batches to ensure smooth
                delivery and avoid rate limits.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onCloseNotificationDialog}
              disabled={isSendingNotifications}
            >
              Cancel
            </Button>
            <Button
              onClick={onSendNotifications}
              disabled={isSendingNotifications}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSendingNotifications ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Notifications
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProgressDialog} onOpenChange={onOpenProgressDialogChange}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Sending Weekly Menu Update Notifications
            </DialogTitle>
            <DialogDescription>Real-time progress tracking for email notifications</DialogDescription>
          </DialogHeader>

          <div className="flex flex-1 flex-col space-y-4 overflow-hidden">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total Users</CardDescription>
                  <CardTitle className="text-2xl">{notificationProgress.totalUsers}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Emails Sent</CardDescription>
                  <CardTitle className="text-2xl text-green-600">{notificationProgress.emailsSent}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Failed</CardDescription>
                  <CardTitle className="text-2xl text-red-600">{notificationProgress.emailsFailed}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Progress</CardDescription>
                  <CardTitle className="text-2xl">{notificationProgress.progress}%</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {notificationProgress.currentBatch > 0 ? (
                    <>Batch {notificationProgress.currentBatch} of {notificationProgress.totalBatches}</>
                  ) : null}
                </span>
                <span className="font-medium">{notificationProgress.progress}%</span>
              </div>
              <Progress value={notificationProgress.progress} className="h-2" />
            </div>

            <div className="flex items-center gap-2">
              {!notificationProgress.isComplete ? (
                <Badge className="bg-blue-600">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Processing...
                </Badge>
              ) : notificationProgress.emailsFailed === 0 ? (
                <Badge className="bg-green-600">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Complete - All emails sent successfully
                </Badge>
              ) : (
                <Badge className="bg-orange-600">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Complete - {notificationProgress.emailsFailed} emails failed
                </Badge>
              )}
            </div>

            {notificationProgress.failedEmails.length > 0 ? (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm text-red-900">
                    <XCircle className="h-4 w-4" />
                    Failed Emails ({notificationProgress.failedEmails.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {notificationProgress.failedEmails.map((failed, index) => (
                        <div key={index} className="rounded border border-red-200 bg-white p-2 text-xs">
                          <div className="font-medium text-red-900">
                            {failed.name} ({failed.email})
                          </div>
                          <div className="mt-1 text-red-700">{failed.error}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : null}

            <Card className="flex flex-1 flex-col overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <History className="h-4 w-4" />
                  Live Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden pb-0">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-1 font-mono text-xs">
                    {notificationProgress.logs.map((log, index) => (
                      <div
                        key={index}
                        className={`rounded px-2 py-1 ${
                          log.type === "error" || log.type === "email_failed"
                            ? "bg-red-50 text-red-900"
                            : log.type === "email_sent"
                              ? "bg-green-50 text-green-900"
                              : log.type === "batch_start" || log.type === "batch_complete"
                                ? "bg-blue-50 font-semibold text-blue-900"
                                : log.type === "complete"
                                  ? "bg-green-100 font-bold text-green-900"
                                  : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span className="mr-2 text-gray-500">{log.timestamp.toLocaleTimeString()}</span>
                        {log.message}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              {notificationProgress.isComplete ? (
                <>Process completed at {notificationProgress.logs[notificationProgress.logs.length - 1]?.timestamp.toLocaleTimeString()}</>
              ) : (
                <>Please wait while emails are being sent...</>
              )}
            </div>
            <Button
              onClick={onCloseProgressDialog}
              disabled={!notificationProgress.isComplete}
              variant={notificationProgress.isComplete ? "default" : "outline"}
            >
              {notificationProgress.isComplete ? "Close" : "Processing..."}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
