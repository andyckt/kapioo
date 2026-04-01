"use client"

import { useCallback, useRef, useState } from "react"

import { useToast } from "@/hooks/use-toast"

import type { DayHistoryEntry } from "./types"

export function useMenuHistory() {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyData, setHistoryData] = useState<DayHistoryEntry[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<DayHistoryEntry | null>(null)
  const [selectedWeekRange, setSelectedWeekRange] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch("/api/day-history?limit=100")
      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        setHistoryData(data.data)
        return
      }

      throw new Error(data.error || "Failed to fetch history")
    } catch (error) {
      console.error("Error fetching history:", error)
      toastRef.current({
        title: "Error",
        description: `Failed to load history: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  const deleteHistoryEntry = useCallback(
    async (historyId: string) => {
      try {
        const response = await fetch(`/api/day-history/${encodeURIComponent(historyId)}`, {
          method: "DELETE",
        })
        const data = await response.json()

        if (data.success) {
          setHistoryData((prev) =>
            prev.filter((entry) => (entry.historyId || entry._id) !== historyId)
          )
          if ((selectedHistoryEntry?.historyId || selectedHistoryEntry?._id) === historyId) {
            setSelectedHistoryEntry(null)
          }
          toastRef.current({
            title: "Success",
            description: "History entry deleted successfully",
          })
          return
        }

        throw new Error(data.error || "Failed to delete history entry")
      } catch (error) {
        console.error("Error deleting history entry:", error)
        toastRef.current({
          title: "Error",
          description: `Failed to delete history entry: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        })
      }
    },
    [selectedHistoryEntry]
  )

  return {
    showHistoryModal,
    setShowHistoryModal,
    historyData,
    isLoadingHistory,
    selectedHistoryEntry,
    setSelectedHistoryEntry,
    selectedWeekRange,
    setSelectedWeekRange,
    fetchHistory,
    deleteHistoryEntry,
  }
}
