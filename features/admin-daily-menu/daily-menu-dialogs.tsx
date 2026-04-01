"use client"

import { Loader2, Mail, Send, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"

import type { DayHistoryEntry, NotificationProgress } from "./types"

interface DailyMenuDialogsProps {
  showHistoryModal: boolean
  setShowHistoryModal: (open: boolean) => void
  historyData: DayHistoryEntry[]
  isLoadingHistory: boolean
  selectedHistoryEntry: DayHistoryEntry | null
  setSelectedHistoryEntry: (entry: DayHistoryEntry | null) => void
  deleteHistoryEntry: (historyId: string) => void
  showNotificationDialog: boolean
  setShowNotificationDialog: (open: boolean) => void
  showProgressDialog: boolean
  setShowProgressDialog: (open: boolean) => void
  isSendingNotifications: boolean
  notificationProgress: NotificationProgress
  sendMenuUpdateNotifications: () => void
}

export function DailyMenuDialogs({
  showHistoryModal,
  setShowHistoryModal,
  historyData,
  isLoadingHistory,
  selectedHistoryEntry,
  setSelectedHistoryEntry,
  deleteHistoryEntry,
  showNotificationDialog,
  setShowNotificationDialog,
  showProgressDialog,
  setShowProgressDialog,
  isSendingNotifications,
  notificationProgress,
  sendMenuUpdateNotifications,
}: DailyMenuDialogsProps) {
  return (
    <>
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-h-[85vh] max-w-5xl">
          <DialogHeader>
            <DialogTitle>Menu History</DialogTitle>
            <DialogDescription>Review archived weeks and archived day snapshots.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <ScrollArea className="h-[60vh] rounded-md border">
              <div className="space-y-2 p-3">
                {isLoadingHistory ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading history...
                  </div>
                ) : historyData.length > 0 ? (
                  historyData.map((entry) => {
                    const historyId = entry.historyId || entry._id || ""
                    const isSelected =
                      (selectedHistoryEntry?.historyId || selectedHistoryEntry?._id) === historyId

                    return (
                      <button
                        key={historyId}
                        type="button"
                        className={`w-full rounded-md border p-3 text-left ${
                          isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedHistoryEntry(entry)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium capitalize">{entry.displayName || "Archived day"}</p>
                            <p className="text-xs text-muted-foreground">{entry.date || "Unknown date"}</p>
                          </div>
                          <Badge variant="outline">{entry.week === 1 ? "Week 1" : "Week 2"}</Badge>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No history entries found.</p>
                )}
              </div>
            </ScrollArea>

            <div className="rounded-md border p-4">
              {selectedHistoryEntry ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold capitalize">
                        {selectedHistoryEntry.displayName || "Archived day"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedHistoryEntry.date || "Unknown date"}
                      </p>
                    </div>
                    {(selectedHistoryEntry.historyId || selectedHistoryEntry._id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500"
                        onClick={() => {
                          const historyId =
                            selectedHistoryEntry.historyId || selectedHistoryEntry._id || ""
                          if (historyId && window.confirm("Delete this history entry?")) {
                            deleteHistoryEntry(historyId)
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-2 text-sm">
                    <p>
                      <span className="font-medium">Archived Reason:</span>{" "}
                      {selectedHistoryEntry.archivedReason || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Created At:</span>{" "}
                      {selectedHistoryEntry.createdAt || "N/A"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Archived Combos</h4>
                    {Array.isArray(selectedHistoryEntry.combos) &&
                    selectedHistoryEntry.combos.length > 0 ? (
                      selectedHistoryEntry.combos.map((combo) => (
                        <div key={combo.id} className="rounded-md border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{combo.name}</p>
                            <Badge variant="outline">{combo.calories} KCAL</Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Tags: {combo.tags.join(", ") || "None"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No combos stored for this entry.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a history entry to inspect it.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notify Users About Menu Update</DialogTitle>
            <DialogDescription>
              This will send menu update emails to users. Continue?
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendMenuUpdateNotifications}>
              <Mail className="mr-2 h-4 w-4" />
              Send Notifications
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent className="max-h-[85vh] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Notification Progress</DialogTitle>
            <DialogDescription>Real-time progress for menu update notifications.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Progress value={notificationProgress.progress} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border p-3 text-sm">
                <p className="text-muted-foreground">Emails sent</p>
                <p className="text-lg font-semibold">{notificationProgress.emailsSent}</p>
              </div>
              <div className="rounded-md border p-3 text-sm">
                <p className="text-muted-foreground">Emails failed</p>
                <p className="text-lg font-semibold">{notificationProgress.emailsFailed}</p>
              </div>
              <div className="rounded-md border p-3 text-sm">
                <p className="text-muted-foreground">Batch</p>
                <p className="text-lg font-semibold">
                  {notificationProgress.currentBatch}/{notificationProgress.totalBatches}
                </p>
              </div>
            </div>

            <ScrollArea className="h-[320px] rounded-md border p-3">
              <div className="space-y-2">
                {notificationProgress.logs.length > 0 ? (
                  notificationProgress.logs.map((log, index) => (
                    <div key={`${log.timestamp.toISOString()}-${index}`} className="rounded-md border p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-1">{log.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Waiting for progress events...</p>
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-end">
              <Button onClick={() => setShowProgressDialog(false)} disabled={isSendingNotifications}>
                {isSendingNotifications ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Close
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
