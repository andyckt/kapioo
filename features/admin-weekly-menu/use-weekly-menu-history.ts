"use client"

import { useState } from "react"

import { useToast } from "@/hooks/use-toast"

export function useWeeklyMenuHistory() {
  const { toast } = useToast()

  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any | null>(null)
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null)

  const fetchHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch("/api/weekly-delivery-history?limit=100")
      const data = await response.json()

      if (data.success) {
        setHistoryData(data.data)
      }
    } catch (error) {
      console.error("Error fetching history:", error)
      toast({
        title: "Error",
        description: "Failed to load history data",
        variant: "destructive",
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleDeleteHistory = async (historyId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    setDeletingHistoryId(historyId)

    try {
      const response = await fetch(`/api/weekly-delivery-history/${historyId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to delete history")
      }

      setHistoryData((prev) => prev.filter((entry) => entry.historyId !== historyId))

      if (selectedHistoryEntry?.historyId === historyId) {
        setSelectedHistoryEntry(null)
      }

      toast({
        title: "History deleted",
        description: "The history entry has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting history:", error)
      toast({
        title: "Error",
        description: "Failed to delete history entry",
        variant: "destructive",
      })
    } finally {
      setDeletingHistoryId(null)
    }
  }

  return {
    showHistoryModal,
    setShowHistoryModal,
    historyData,
    isLoadingHistory,
    selectedHistoryEntry,
    setSelectedHistoryEntry,
    deletingHistoryId,
    fetchHistory,
    handleDeleteHistory,
  }
}
