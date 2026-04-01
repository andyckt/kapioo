"use client"

import { Calendar as CalendarIcon, Check, Edit, Loader2, Plus, RefreshCcw, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { sortDaysByWeekAndName } from "./helpers"
import type { DayData } from "./types"

interface DailyMenuDatesTabProps {
  days: Record<string, DayData>
  activeWeekFilter: number | null
  setActiveWeekFilter: (week: number | null) => void
  editingDay: string | null
  editedDate: string
  setEditedDate: (value: string) => void
  editedDisplayName: string
  setEditedDisplayName: (value: string) => void
  editedWeek: number
  setEditedWeek: (value: number) => void
  editedIsActive: boolean
  setEditedIsActive: (value: boolean) => void
  startEditingDay: (dayId: string) => void
  saveEditedDay: () => void
  cancelEditingDay: () => void
  deleteDay: (dayId: string) => void
  showDayCreationModal: boolean
  setShowDayCreationModal: (open: boolean) => void
  selectedDayOfWeek: string | null
  setSelectedDayOfWeek: (day: string | null) => void
  selectedWeekNumber: number
  setSelectedWeekNumber: (week: number) => void
  startDate: string
  setStartDate: (value: string) => void
  createDay: () => void
  resetDayCreation: () => void
  calculateDatesForWeek: (startDay: string, startDate: string) => Record<string, string>
  setCalculatedDates: (dates: Record<string, string>) => void
  isRollingForward: boolean
  rollForwardWeek: () => void
  initializeNextWeek: () => void
}

export function DailyMenuDatesTab({
  days,
  activeWeekFilter,
  setActiveWeekFilter,
  editingDay,
  editedDate,
  setEditedDate,
  editedDisplayName,
  setEditedDisplayName,
  editedWeek,
  setEditedWeek,
  editedIsActive,
  setEditedIsActive,
  startEditingDay,
  saveEditedDay,
  cancelEditingDay,
  deleteDay,
  showDayCreationModal,
  setShowDayCreationModal,
  selectedDayOfWeek,
  setSelectedDayOfWeek,
  selectedWeekNumber,
  setSelectedWeekNumber,
  startDate,
  setStartDate,
  createDay,
  resetDayCreation,
  calculateDatesForWeek,
  setCalculatedDates,
  isRollingForward,
  rollForwardWeek,
  initializeNextWeek,
}: DailyMenuDatesTabProps) {
  const sortedDays = sortDaysByWeekAndName(Object.entries(days)).filter(
    ([_, day]) => activeWeekFilter === null || day.week === activeWeekFilter
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Date Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <h3 className="text-base font-medium whitespace-nowrap">Current Delivery Schedule</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant={activeWeekFilter === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveWeekFilter(null)}
                >
                  All
                </Button>
                <Button
                  variant={activeWeekFilter === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveWeekFilter(1)}
                >
                  This Week
                </Button>
                <Button
                  variant={activeWeekFilter === 2 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveWeekFilter(2)}
                >
                  Next Week
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setSelectedWeekNumber(1)
                  setShowDayCreationModal(true)
                }}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Day (This Week)
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedWeekNumber(2)
                  setShowDayCreationModal(true)
                }}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Day (Next Week)
              </Button>
              <Button size="sm" variant="outline" onClick={initializeNextWeek}>
                <Plus className="mr-1 h-3 w-3" />
                Initialize Next Week
              </Button>
              <Button size="sm" variant="outline" onClick={rollForwardWeek} disabled={isRollingForward}>
                {isRollingForward ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Rolling...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-1 h-3 w-3" />
                    Roll Forward Week
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDays.map(([dayId, day]) => (
                  <TableRow key={dayId}>
                    {editingDay === dayId ? (
                      <>
                        <TableCell>
                          <Input value={editedDisplayName} onChange={(e) => setEditedDisplayName(e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input value={editedDate} onChange={(e) => setEditedDate(e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Select value={String(editedWeek)} onValueChange={(value) => setEditedWeek(Number(value))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">This Week</SelectItem>
                              <SelectItem value="2">Next Week</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editedIsActive ? "active" : "inactive"}
                            onValueChange={(value) => setEditedIsActive(value === "active")}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={saveEditedDay} className="text-green-600">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={cancelEditingDay} className="text-red-500">
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium capitalize">{day.displayName}</TableCell>
                        <TableCell>{day.date}</TableCell>
                        <TableCell>{day.week === 1 ? "This Week" : "Next Week"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              day.isActive
                                ? "bg-green-50 text-green-700 hover:bg-green-50"
                                : "bg-gray-50 text-gray-700 hover:bg-gray-50"
                            }
                          >
                            {day.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => startEditingDay(dayId)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete ${day.displayName} (${day.date})?`)) {
                                void deleteDay(dayId)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {sortedDays.map(([dayId, day]) => (
              <Card key={dayId} className="overflow-hidden">
                {editingDay === dayId ? (
                  <CardContent className="space-y-3 p-4">
                    <div className="space-y-2">
                      <Label>Day</Label>
                      <Input value={editedDisplayName} onChange={(e) => setEditedDisplayName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input value={editedDate} onChange={(e) => setEditedDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Week</Label>
                      <Select value={String(editedWeek)} onValueChange={(value) => setEditedWeek(Number(value))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">This Week</SelectItem>
                          <SelectItem value="2">Next Week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={editedIsActive ? "active" : "inactive"}
                        onValueChange={(value) => setEditedIsActive(value === "active")}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={saveEditedDay}>
                        <Check className="mr-1 h-4 w-4" />
                        Save
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={cancelEditingDay}>
                        <X className="mr-1 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-base capitalize">{day.displayName}</CardTitle>
                        </div>
                        <Badge variant="outline" className={day.isActive ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}>
                          {day.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Date</p>
                          <p className="font-medium">{day.date}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Week</p>
                          <Badge variant="outline">{day.week === 1 ? "This Week" : "Next Week"}</Badge>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2 pb-3 pt-0">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => startEditingDay(dayId)}>
                        <Edit className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${day.displayName} (${day.date})?`)) {
                            void deleteDay(dayId)
                          }
                        }}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </CardFooter>
                  </>
                )}
              </Card>
            ))}
          </div>
        </div>
      </CardContent>

      {showDayCreationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[500px] max-w-[90vw] rounded-lg bg-white shadow-lg">
            <div className="border-b p-4">
              <h3 className="text-lg font-medium">
                Add Day ({selectedWeekNumber === 1 ? "This Week" : "Next Week"})
              </h3>
            </div>

            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <Label>Select Day</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sunday"].map((day) => (
                    <Button
                      key={day}
                      variant={selectedDayOfWeek === day.toLowerCase() ? "default" : "outline"}
                      onClick={() => {
                        const value = day.toLowerCase()
                        setSelectedDayOfWeek(value)
                        if (startDate) {
                          setCalculatedDates(calculateDatesForWeek(value, startDate))
                        }
                      }}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedDayOfWeek && (
                <div className="space-y-2">
                  <Label htmlFor="start-date">Date for {selectedDayOfWeek}</Label>
                  <Input
                    id="start-date"
                    placeholder="e.g. Dec 15"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      if (selectedDayOfWeek && e.target.value) {
                        setCalculatedDates(calculateDatesForWeek(selectedDayOfWeek, e.target.value))
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Format: "MMM D" (e.g. "Dec 15")</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t p-4">
              <Button variant="outline" onClick={resetDayCreation}>
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
              <Button
                disabled={!selectedDayOfWeek || !startDate}
                onClick={() => void createDay()}
              >
                <Check className="mr-2 h-4 w-4" />
                Create Day
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
