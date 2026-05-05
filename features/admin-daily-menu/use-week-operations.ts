"use client"

import { useCallback, useRef, useState } from "react"

import { useToast } from "@/hooks/use-toast"

import { calculateNextWeekDate, createTemplateCombos } from "./helpers"
import type { ComboItem, DayData } from "./types"

interface UseWeekOperationsArgs {
  days: Record<string, DayData>
  fetchData: () => Promise<void> | void
  setActiveWeekFilter: (week: number | null) => void
}

function serializeComboForCopy(combo: ComboItem) {
  return {
    name: combo.name,
    calories: combo.calories,
    proteinGrams: combo.proteinGrams,
    tags: combo.tags,
    tagsEn: combo.tagsEn,
    allergensZh: combo.allergensZh,
    allergensEn: combo.allergensEn,
    descriptionZh: combo.descriptionZh,
    descriptionEn: combo.descriptionEn,
    typeA: combo.typeA,
    typeB: combo.typeB,
    imageUrl: combo.imageUrl,
    imageKey: combo.imageKey,
    featuredInMenuPreview: combo.featuredInMenuPreview === true,
    sourceComboLibraryId: combo.sourceComboLibraryId,
    sourceComboLibraryUpdatedAt: combo.sourceComboLibraryUpdatedAt,
  }
}

export function useWeekOperations({
  days,
  fetchData,
  setActiveWeekFilter,
}: UseWeekOperationsArgs) {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [isRollingForward, setIsRollingForward] = useState(false)
  const [isActivatingNextWeek, setIsActivatingNextWeek] = useState(false)

  const refreshMenuData = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  const bulkSetWeekActiveState = useCallback(
    async (week: number, isActive: boolean, label: string) => {
      try {
        setIsActivatingNextWeek(true)
        const weekDays = Object.entries(days).filter(([_, day]) => day.week === week)

        if (weekDays.length === 0) {
          toastRef.current({
            title: "No Days Found",
            description: `No days found for ${label}`,
            variant: "destructive",
          })
          return
        }

        for (const [dayId] of weekDays) {
          await fetch(`/api/days/${dayId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive }),
          })
        }

        await refreshMenuData()
        toastRef.current({
          title: "Success",
          description: `${isActive ? "Activated" : "Deactivated"} ${weekDays.length} days for ${label}`,
        })
      } catch (error) {
        console.error("Error updating week active state:", error)
        toastRef.current({
          title: "Error",
          description: `Failed to update ${label}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        })
      } finally {
        setIsActivatingNextWeek(false)
      }
    },
    [days, refreshMenuData]
  )

  const initializeNextWeek = useCallback(async () => {
    try {
      const week1Days = Object.entries(days).filter(([_, day]) => day.week === 1)
      if (week1Days.length === 0) {
        toastRef.current({
          title: "Error",
          description: "No days found for This Week to duplicate",
          variant: "destructive",
        })
        return
      }

      const existingWeek2Days = Object.values(days).filter((day) => day.week === 2)
      if (
        existingWeek2Days.length > 0 &&
        !window.confirm("Next Week already has some days. Do you want to add more days from This Week?")
      ) {
        return
      }
      if (existingWeek2Days.length === 0 && !window.confirm("This will create Next Week days based on This Week. Continue?")) {
        return
      }

      let createdCount = 0

      for (const [dayId, day] of week1Days) {
        const existingDay = Object.values(days).find(
          (candidate) => candidate.week === 2 && candidate.displayName === day.displayName
        )
        if (existingDay) {
          continue
        }

        const newDayId = `${day.displayName}-w2-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        const nextWeekDate = calculateNextWeekDate(day.date)

        const dayResponse = await fetch("/api/days", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayId: newDayId,
            date: nextWeekDate,
            displayName: day.displayName,
            week: 2,
            isActive: true,
          }),
        })
        const dayData = await dayResponse.json()
        if (!dayData.success) {
          throw new Error(dayData.error || `Failed to create ${day.displayName}`)
        }

        for (const combo of day.combos) {
          const comboId = `${newDayId}-combo-${Date.now()}-${Math.floor(Math.random() * 1000)}`
          const comboResponse = await fetch("/api/combos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              comboId,
              dayId: newDayId,
              ...serializeComboForCopy(combo),
            }),
          })
          const comboData = await comboResponse.json()
          if (!comboData.success) {
            throw new Error(comboData.error || "Failed to create combo")
          }
        }

        createdCount += 1
      }

      await refreshMenuData()
      setActiveWeekFilter(2)
      toastRef.current({
        title: "Success",
        description: `Created ${createdCount} days for Next Week`,
      })
    } catch (error) {
      console.error("Error initializing next week:", error)
      toastRef.current({
        title: "Error",
        description: `Failed to initialize Next Week: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
    }
  }, [days, refreshMenuData, setActiveWeekFilter])

  const rollForwardWeek = useCallback(async () => {
    try {
      if (
        !window.confirm(
          "This will update This Week with Next Week's content and create a new Next Week. Continue?"
        )
      ) {
        return
      }

      setIsRollingForward(true)

      const week2Days = Object.entries(days).filter(([_, day]) => day.week === 2)
      const week1Days = Object.entries(days).filter(([_, day]) => day.week === 1)

      if (week2Days.length === 0) {
        toastRef.current({
          title: "Error",
          description: "No days found in Next Week to roll forward",
          variant: "destructive",
        })
        return
      }

      for (const [thisDayId, thisDay] of week1Days) {
        try {
          const historyId = `history-${thisDayId}-${Date.now()}`
          await fetch("/api/day-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              historyId,
              originalDayId: thisDayId,
              displayName: thisDay.displayName,
              date: thisDay.date,
              week: thisDay.week,
              archivedReason: "rolled_forward",
              combos: thisDay.combos.map((combo) => ({
                comboId: combo.id,
                ...serializeComboForCopy(combo),
              })),
            }),
          })
        } catch (historyError) {
          console.warn("Failed to archive day before roll forward:", historyError)
        }
      }

      for (const [nextDayId, nextDay] of week2Days) {
        const matchingThisWeekDay = week1Days.find(([_, day]) => day.displayName === nextDay.displayName)

        if (matchingThisWeekDay) {
          const [thisDayId] = matchingThisWeekDay
          await fetch(`/api/days/${thisDayId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: nextDay.date,
              displayName: nextDay.displayName,
              week: 1,
              isActive: true,
            }),
          })

          const thisWeekCombosResponse = await fetch(`/api/days/${thisDayId}/combos`)
          const thisWeekCombosData = await thisWeekCombosResponse.json()
          if (thisWeekCombosData.success && Array.isArray(thisWeekCombosData.data)) {
            for (const combo of thisWeekCombosData.data as Array<{ comboId?: string }>) {
              if (combo.comboId) {
                await fetch(`/api/combos/${combo.comboId}`, { method: "DELETE" })
              }
            }
          }

          for (const combo of nextDay.combos) {
            const newComboId = `${thisDayId}-combo-${Date.now()}-${Math.floor(Math.random() * 1000)}`
            await fetch("/api/combos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                comboId: newComboId,
                dayId: thisDayId,
                ...serializeComboForCopy(combo),
              }),
            })
          }
        } else {
          const newThisDayId = `${nextDay.displayName}-w1-${Date.now()}-${Math.floor(Math.random() * 1000)}`
          await fetch("/api/days", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dayId: newThisDayId,
              date: nextDay.date,
              displayName: nextDay.displayName,
              week: 1,
              isActive: true,
            }),
          })

          for (const combo of nextDay.combos) {
            const newComboId = `${newThisDayId}-combo-${Date.now()}-${Math.floor(Math.random() * 1000)}`
            await fetch("/api/combos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                comboId: newComboId,
                dayId: newThisDayId,
                ...serializeComboForCopy(combo),
              }),
            })
          }
        }
      }

      for (const [nextDayId, nextDay] of week2Days) {
        const newNextWeekDate = calculateNextWeekDate(nextDay.date)
        await fetch(`/api/days/${nextDayId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: newNextWeekDate,
            displayName: nextDay.displayName,
            week: 2,
            isActive: false,
          }),
        })

        const oldCombosResponse = await fetch(`/api/days/${nextDayId}/combos`)
        const oldCombosData = await oldCombosResponse.json()
        if (oldCombosData.success && Array.isArray(oldCombosData.data)) {
          for (const combo of oldCombosData.data as Array<{ comboId?: string }>) {
            if (combo.comboId) {
              await fetch(`/api/combos/${combo.comboId}`, { method: "DELETE" })
            }
          }
        }

        for (const template of createTemplateCombos(nextDayId)) {
          const comboId = `${nextDayId}-combo-${Date.now()}-${Math.floor(Math.random() * 1000)}`
          await fetch("/api/combos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              comboId,
              dayId: nextDayId,
              name: template.name,
              calories: template.calories,
              tags: template.tags,
              typeA: template.typeA,
              typeB: template.typeB,
            }),
          })
        }
      }

      await refreshMenuData()
      setActiveWeekFilter(1)
      toastRef.current({
        title: "Success",
        description:
          "Week rolled forward successfully. This Week has been updated with Next Week's content.",
      })
    } catch (error) {
      console.error("Error rolling forward week:", error)
      toastRef.current({
        title: "Error",
        description: `Failed to roll forward week: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
    } finally {
      setIsRollingForward(false)
    }
  }, [days, refreshMenuData, setActiveWeekFilter])

  return {
    isRollingForward,
    isActivatingNextWeek,
    rollForwardWeek,
    bulkActivateNextWeek: () => bulkSetWeekActiveState(2, true, "Next Week"),
    bulkDeactivateNextWeek: () => bulkSetWeekActiveState(2, false, "Next Week"),
    bulkActivateThisWeek: () => bulkSetWeekActiveState(1, true, "This Week"),
    bulkDeactivateThisWeek: () => bulkSetWeekActiveState(1, false, "This Week"),
    initializeNextWeek,
  }
}
