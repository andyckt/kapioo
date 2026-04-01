"use client"

import { useCallback, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"

import { useToast } from "@/hooks/use-toast"

import { calculateDatesForWeek, createDefaultCombo, createEmptyCalculatedDates } from "./helpers"
import type { DailyMenuCalculatedDates, DayData } from "./types"

interface UseDayScheduleArgs {
  days: Record<string, DayData>
  setDays: Dispatch<SetStateAction<Record<string, DayData>>>
}

export function useDaySchedule({ days, setDays }: UseDayScheduleArgs) {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [activeWeekFilter, setActiveWeekFilter] = useState<number | null>(null)
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [editedDate, setEditedDate] = useState("")
  const [editedDisplayName, setEditedDisplayName] = useState("")
  const [editedWeek, setEditedWeek] = useState(1)
  const [editedIsActive, setEditedIsActive] = useState(true)
  const [showDayCreationModal, setShowDayCreationModal] = useState(false)
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string | null>(null)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState(1)
  const [startDate, setStartDate] = useState("")
  const [calculatedDates, setCalculatedDates] = useState<DailyMenuCalculatedDates>(
    createEmptyCalculatedDates()
  )

  const updateDay = useCallback(async (dayId: string, updatedDay: Partial<DayData>) => {
    try {
      const response = await fetch(`/api/days/${dayId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDay),
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to update day")
      }

      setDays((prevDays) => {
        const day = prevDays[dayId]
        if (!day) return prevDays

        return {
          ...prevDays,
          [dayId]: {
            ...day,
            ...updatedDay,
          },
        }
      })

      toastRef.current({
        title: "Success",
        description: "Day updated successfully",
      })
    } catch (error) {
      console.error("Error updating day:", error)
      toastRef.current({
        title: "Error",
        description: `Failed to update day: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
    }
  }, [setDays])

  const startEditingDay = useCallback((dayId: string) => {
    const day = days[dayId]
    if (!day) {
      return
    }

    setEditingDay(dayId)
    setEditedDate(day.date)
    setEditedDisplayName(day.displayName)
    setEditedWeek(day.week)
    setEditedIsActive(day.isActive !== false)
  }, [days])

  const saveEditedDay = useCallback(async () => {
    if (!editingDay) {
      return
    }

    await updateDay(editingDay, {
      date: editedDate,
      displayName: editedDisplayName,
      week: editedWeek,
      isActive: editedIsActive,
    })
    setEditingDay(null)
  }, [editedDate, editedDisplayName, editedIsActive, editedWeek, editingDay, updateDay])

  const cancelEditingDay = useCallback(() => {
    setEditingDay(null)
  }, [])

  const resetDayCreation = useCallback(() => {
    setShowDayCreationModal(false)
    setSelectedDayOfWeek(null)
    setStartDate("")
    setCalculatedDates(createEmptyCalculatedDates())
  }, [])

  const createDay = useCallback(async () => {
    if (!selectedDayOfWeek || !startDate) {
      return
    }

    try {
      const dayLower = selectedDayOfWeek.toLowerCase()
      const newDayId = `${dayLower}-w${selectedWeekNumber}-${Date.now()}`
      const dateForDay = calculatedDates[dayLower as keyof DailyMenuCalculatedDates] || startDate
      const defaultCombo = createDefaultCombo(`${newDayId}-combo1`)

      const dayResponse = await fetch("/api/days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayId: newDayId,
          date: dateForDay,
          displayName: dayLower,
          week: selectedWeekNumber,
          isActive: true,
        }),
      })
      const dayData = await dayResponse.json()
      if (!dayData.success) {
        throw new Error(dayData.error || "Failed to create day")
      }

      const comboResponse = await fetch("/api/combos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comboId: defaultCombo.id,
          dayId: newDayId,
          name: defaultCombo.name,
          calories: defaultCombo.calories,
          tags: defaultCombo.tags,
          typeA: defaultCombo.typeA,
          typeB: defaultCombo.typeB,
        }),
      })
      const comboData = await comboResponse.json()
      if (!comboData.success) {
        throw new Error(comboData.error || "Failed to create combo")
      }

      setDays((prev) => ({
        ...prev,
        [newDayId]: {
          date: dateForDay,
          displayName: dayLower,
          week: selectedWeekNumber,
          isActive: true,
          combos: [defaultCombo],
        },
      }))
      setActiveWeekFilter(selectedWeekNumber)
      resetDayCreation()
      startEditingDay(newDayId)

      toastRef.current({
        title: "Success",
        description: `${selectedDayOfWeek} (${dateForDay}) created successfully`,
      })
    } catch (error) {
      console.error("Error creating day:", error)
      toastRef.current({
        title: "Error",
        description: `Failed to create day: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
    }
  }, [
    calculatedDates,
    resetDayCreation,
    selectedDayOfWeek,
    selectedWeekNumber,
    setDays,
    startDate,
    startEditingDay,
  ])

  const deleteDay = useCallback(async (dayId: string) => {
    const day = days[dayId]
    if (!day) {
      return
    }

    try {
      const response = await fetch(`/api/days/${encodeURIComponent(dayId)}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to delete day")
      }

      for (const combo of day.combos) {
        try {
          await fetch(`/api/combos/${encodeURIComponent(combo.id)}`, { method: "DELETE" })
        } catch (comboError) {
          console.warn("Error deleting combo:", combo.id, comboError)
        }
      }

      setDays((prev) => {
        const next = { ...prev }
        delete next[dayId]
        return next
      })

      toastRef.current({
        title: "Success",
        description: "Day deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting day:", error)
      toastRef.current({
        title: "Error",
        description: `Failed to delete day: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
    }
  }, [days, setDays])

  return {
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
    showDayCreationModal,
    setShowDayCreationModal,
    selectedDayOfWeek,
    setSelectedDayOfWeek,
    selectedWeekNumber,
    setSelectedWeekNumber,
    startDate,
    setStartDate,
    calculatedDates,
    setCalculatedDates,
    updateDay,
    startEditingDay,
    saveEditedDay,
    cancelEditingDay,
    createDay,
    deleteDay,
    resetDayCreation,
    calculateDatesForWeek,
  }
}
