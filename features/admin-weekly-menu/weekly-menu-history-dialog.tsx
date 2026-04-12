"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar, ChevronLeft, Loader2, Trash2 } from "lucide-react"

type WeeklyMenuHistoryDialogProps = {
  deletingHistoryId: string | null
  handleDeleteHistory: (historyId: string, event?: React.MouseEvent) => void | Promise<void>
  historyData: any[]
  isLoadingHistory: boolean
  onOpenChange: (open: boolean) => void
  open: boolean
  selectedHistoryEntry: any | null
  setSelectedHistoryEntry: (entry: any | null) => void
}

export function WeeklyMenuHistoryDialog({
  deletingHistoryId,
  handleDeleteHistory,
  historyData,
  isLoadingHistory,
  onOpenChange,
  open,
  selectedHistoryEntry,
  setSelectedHistoryEntry,
}: WeeklyMenuHistoryDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          setSelectedHistoryEntry(null)
        }
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-[1100px] flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {selectedHistoryEntry ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedHistoryEntry(null)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>Delivery Details</span>
              </div>
            ) : (
              "Weekly Delivery History"
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedHistoryEntry
              ? `Viewing details for ${selectedHistoryEntry.date}`
              : "Select a date to view archived meal details"}
          </DialogDescription>
        </DialogHeader>

        <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : historyData.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">No history available</p>
            </div>
          ) : selectedHistoryEntry ? (
            <div className="space-y-4 pb-4">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="mb-1 text-sm text-muted-foreground">
                        {selectedHistoryEntry.displayName}
                      </p>
                      <CardTitle className="text-2xl">{selectedHistoryEntry.date}</CardTitle>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Archived:{" "}
                        {new Date(selectedHistoryEntry.archivedAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          selectedHistoryEntry.archivedReason === "rolled_forward"
                            ? "default"
                            : "secondary"
                        }
                        className="px-3 py-1 text-sm"
                      >
                        {selectedHistoryEntry.archivedReason === "rolled_forward"
                          ? "Rolled Forward"
                          : "Manually Deleted"}
                      </Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteHistory(selectedHistoryEntry.historyId)}
                        disabled={deletingHistoryId === selectedHistoryEntry.historyId}
                      >
                        {deletingHistoryId === selectedHistoryEntry.historyId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Meal Options ({selectedHistoryEntry.mealOptions?.length || 0})
                </h3>
                {selectedHistoryEntry.mealOptions?.length ? (
                  selectedHistoryEntry.mealOptions.map((option: any, index: number) => (
                    <Card
                      key={index}
                      className="border-l-4 border-l-primary/30 transition-shadow hover:shadow-md"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <h4 className="text-base font-semibold">{option.name}</h4>
                              <Badge
                                variant={option.active ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {option.active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            {option.nameEn ? (
                              <div className="mb-2 text-sm italic text-muted-foreground">
                                {option.nameEn}
                              </div>
                            ) : null}
                            {option.tags?.length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {option.tags.map((tag: string, tagIndex: number) => (
                                  <Badge key={tagIndex} variant="outline" className="px-2 py-0.5 text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">No meal options available</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              <div className="mb-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Click on a date to view its meal details
                </p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {historyData.map((entry) => {
                  const dateMatch = entry.date.match(/(\w+)\s+(\d+)/)
                  const month = dateMatch ? dateMatch[1] : ""
                  const day = dateMatch ? dateMatch[2] : ""

                  return (
                    <Card
                      key={entry.historyId}
                      className="group relative cursor-pointer overflow-hidden transition-all duration-200 hover:border-primary hover:shadow-lg"
                      onClick={() => setSelectedHistoryEntry(entry)}
                    >
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute right-2 top-2 z-10 h-7 w-7 p-0 opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                        onClick={(event) => handleDeleteHistory(entry.historyId, event)}
                        disabled={deletingHistoryId === entry.historyId}
                      >
                        {deletingHistoryId === entry.historyId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>

                      <CardContent className="p-0">
                        <div className="border-b bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center transition-colors group-hover:from-primary/20 group-hover:to-primary/10">
                          <div className="mb-1 text-4xl font-bold text-primary">{day}</div>
                          <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            {month}
                          </div>
                        </div>

                        <div className="space-y-2 p-4">
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span className="truncate">
                              {entry.displayName.replace("This Week ", "").replace("Next Week ", "")}
                            </span>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {entry.mealOptions?.length || 0} meal
                              {entry.mealOptions?.length !== 1 ? "s" : ""}
                            </Badge>
                            <Badge
                              variant={entry.archivedReason === "rolled_forward" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {entry.archivedReason === "rolled_forward" ? "Rolled" : "Deleted"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
