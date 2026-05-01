"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Mail, Package, Send, Trash2, Utensils } from "lucide-react"

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

type WeekHistoryGroup = {
  key: string
  label: string
  archivedAtLabel: string
  entries: DayHistoryEntry[]
  comboCount: number
}

function getHistoryId(entry: DayHistoryEntry) {
  return entry.historyId || entry._id || ""
}

function parseArchivedAt(entry: DayHistoryEntry): Date | null {
  const raw = entry.archivedAt || entry.createdAt
  if (typeof raw !== "string") return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseHistoryDate(entry: DayHistoryEntry): Date | null {
  if (!entry.date) return null
  const archivedYear = parseArchivedAt(entry)?.getFullYear() || new Date().getFullYear()
  const parsed = new Date(`${entry.date}, ${archivedYear}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfMondayWeek(date: Date) {
  const copy = new Date(date)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function formatMonthDay(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatArchivedAt(date: Date | null) {
  if (!date) return "Unknown"
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function getDaySortValue(entry: DayHistoryEntry) {
  return parseHistoryDate(entry)?.getTime() || 0
}

function groupHistoryByWeek(historyData: DayHistoryEntry[]): WeekHistoryGroup[] {
  const groups = new Map<string, WeekHistoryGroup>()

  for (const entry of historyData) {
    const historyDate = parseHistoryDate(entry)
    const weekStart = historyDate ? startOfMondayWeek(historyDate) : new Date(0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const key = weekStart.toISOString().slice(0, 10)
    const existing = groups.get(key)
    const archivedAt = parseArchivedAt(entry)

    if (existing) {
      existing.entries.push(entry)
      existing.comboCount += Array.isArray(entry.combos) ? entry.combos.length : 0
      const existingArchived = new Date(existing.archivedAtLabel)
      if (archivedAt && Number.isNaN(existingArchived.getTime())) {
        existing.archivedAtLabel = formatArchivedAt(archivedAt)
      }
      continue
    }

    groups.set(key, {
      key,
      label: historyDate ? `${formatMonthDay(weekStart)} - ${formatMonthDay(weekEnd)}` : "Unknown week",
      archivedAtLabel: formatArchivedAt(archivedAt),
      entries: [entry],
      comboCount: Array.isArray(entry.combos) ? entry.combos.length : 0,
    })
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      entries: [...group.entries].sort((a, b) => getDaySortValue(a) - getDaySortValue(b)),
    }))
    .sort((a, b) => (a.key < b.key ? 1 : -1))
}

interface DailyMenuDialogsProps {
  showHistoryModal: boolean
  setShowHistoryModal: (open: boolean) => void
  historyData: DayHistoryEntry[]
  isLoadingHistory: boolean
  selectedHistoryEntry: DayHistoryEntry | null
  setSelectedHistoryEntry: (entry: DayHistoryEntry | null) => void
  deleteHistoryEntry: (historyId: string) => void
  deleteHistoryWeek: (entries: DayHistoryEntry[], label: string) => Promise<boolean>
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
  deleteHistoryWeek,
  showNotificationDialog,
  setShowNotificationDialog,
  showProgressDialog,
  setShowProgressDialog,
  isSendingNotifications,
  notificationProgress,
  sendMenuUpdateNotifications,
}: DailyMenuDialogsProps) {
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null)
  const [expandedDayIds, setExpandedDayIds] = useState<Set<string>>(new Set())
  const [deletingWeekKey, setDeletingWeekKey] = useState<string | null>(null)
  const historyWeeks = useMemo(() => groupHistoryByWeek(historyData), [historyData])
  const selectedWeek = historyWeeks.find((week) => week.key === selectedWeekKey) || null

  const handleDeleteWeek = async (week: WeekHistoryGroup) => {
    if (
      !window.confirm(
        `Delete archived week ${week.label}? This will remove ${week.entries.length} archived day${week.entries.length === 1 ? "" : "s"}.`
      )
    ) {
      return
    }

    setDeletingWeekKey(week.key)
    try {
      const deleted = await deleteHistoryWeek(week.entries, week.label)
      if (deleted && selectedWeekKey === week.key) {
        setSelectedWeekKey(null)
        setExpandedDayIds(new Set())
      }
    } finally {
      setDeletingWeekKey(null)
    }
  }

  return (
    <>
      <Dialog
        open={showHistoryModal}
        onOpenChange={(open) => {
          setShowHistoryModal(open)
          if (!open) {
            setSelectedWeekKey(null)
            setExpandedDayIds(new Set())
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Archived Days History</DialogTitle>
            <DialogDescription>
              View previously archived days and their menus from roll forward operations
            </DialogDescription>
          </DialogHeader>

          {isLoadingHistory ? (
            <div className="flex items-center gap-2 rounded-md border p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading history...
            </div>
          ) : selectedWeek ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Week Details</h3>
                  <p className="text-sm text-muted-foreground">
                    Viewing archived days from this week
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedWeekKey(null)
                      setExpandedDayIds(new Set())
                    }}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Weeks
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    disabled={deletingWeekKey === selectedWeek.key}
                    onClick={() => void handleDeleteWeek(selectedWeek)}
                  >
                    {deletingWeekKey === selectedWeek.key ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete Week
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {selectedWeek.entries.map((entry) => {
                  const historyId = getHistoryId(entry)
                  const isExpanded = expandedDayIds.has(historyId)
                  const combos = Array.isArray(entry.combos) ? entry.combos : []

                  return (
                    <div key={historyId || `${entry.displayName}-${entry.date}`} className="rounded-lg border p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-lg font-semibold capitalize">
                              {entry.displayName || "Archived day"}
                            </h4>
                            <Badge variant="secondary">{entry.week === 1 ? "This Week" : "Next Week"}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Date: {entry.date || "Unknown"} - Archived: {formatArchivedAt(parseArchivedAt(entry))}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {combos.length} combo(s) archived
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedHistoryEntry(entry)
                              setExpandedDayIds((current) => {
                                const next = new Set(current)
                                if (next.has(historyId)) {
                                  next.delete(historyId)
                                } else {
                                  next.add(historyId)
                                }
                                return next
                              })
                            }}
                          >
                            {isExpanded ? "Hide Details" : "View Details"}
                          </Button>
                          {historyId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => {
                                if (window.confirm("Delete this history entry?")) {
                                  deleteHistoryEntry(historyId)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 space-y-4">
                          {combos.length > 0 ? (
                            combos.map((combo, comboIndex) => (
                              <div
                                key={combo.id || combo.comboId || `${combo.name}-${comboIndex}`}
                                className="rounded-lg border p-4"
                              >
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  <h5 className="font-semibold">{combo.name}</h5>
                                  <Badge variant="outline">{combo.calories} KCAL</Badge>
                                </div>
                                <div className="grid gap-4 lg:grid-cols-2">
                                  {(["typeA", "typeB"] as const).map((type) => (
                                    <div
                                      key={`${combo.id || combo.comboId || comboIndex}-${type}`}
                                      className={`rounded-md p-3 ${
                                        type === "typeA" ? "bg-blue-50" : "bg-green-50"
                                      }`}
                                    >
                                      <h6 className="mb-2 text-sm font-medium text-blue-700">
                                        {type === "typeA" ? "2-Dish Option" : "3-Dish Option"}
                                      </h6>
                                      {combo[type]?.dishes?.length ? (
                                        <ol className="space-y-2 text-sm">
                                          {combo[type].dishes.map((dish, dishIndex) => (
                                            <li
                                              key={`${combo.id || combo.comboId || comboIndex}-${type}-${dish}-${dishIndex}`}
                                              className="rounded bg-white/70 px-2 py-1"
                                            >
                                              <span className="mr-2 font-medium">{dishIndex + 1}.</span>
                                              {dish}
                                            </li>
                                          ))}
                                        </ol>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No dishes stored.</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No combos stored for this day.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : historyWeeks.length > 0 ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Select a Week to View
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a week range to see the archived days and menus
                </p>
              </div>

              <div className="space-y-3">
                {historyWeeks.map((week) => (
                  <div key={week.key} className="flex flex-col gap-4 rounded-lg border p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-amber-700" />
                        <h3 className="text-xl font-semibold">{week.label}</h3>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Archived: {week.archivedAtLabel}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          <Package className="mr-1 h-3 w-3" />
                          {week.entries.length} days
                        </Badge>
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          <Utensils className="mr-1 h-3 w-3" />
                          {week.comboCount} combos
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        disabled={deletingWeekKey === week.key}
                        onClick={() => void handleDeleteWeek(week)}
                      >
                        {deletingWeekKey === week.key ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedWeekKey(week.key)
                          const firstHistoryId = getHistoryId(week.entries[0])
                          setExpandedDayIds(firstHistoryId ? new Set([firstHistoryId]) : new Set())
                          setSelectedHistoryEntry(week.entries[0] || null)
                        }}
                      >
                        View Days
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-md border p-6 text-sm text-muted-foreground">No history entries found.</p>
          )}
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
