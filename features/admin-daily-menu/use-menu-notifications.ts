"use client"

import { useCallback, useRef, useState } from "react"

import { useToast } from "@/hooks/use-toast"

import type { NotificationLogEntry, NotificationProgress } from "./types"

function createInitialNotificationProgress(): NotificationProgress {
  return {
    totalUsers: 0,
    emailsSent: 0,
    emailsFailed: 0,
    currentBatch: 0,
    totalBatches: 0,
    progress: 0,
    logs: [],
    failedEmails: [],
    isComplete: false,
  }
}

export function useMenuNotifications() {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [isSendingNotifications, setIsSendingNotifications] = useState(false)
  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [notificationProgress, setNotificationProgress] = useState<NotificationProgress>(
    createInitialNotificationProgress()
  )

  const appendLog = useCallback((entry: NotificationLogEntry) => {
    setNotificationProgress((prev) => ({
      ...prev,
      logs: [...prev.logs, entry],
    }))
  }, [])

  const applyProgressEvent = useCallback((payload: Record<string, unknown>) => {
    setNotificationProgress((prev) => ({
      ...prev,
      totalUsers: Number(payload.totalUsers ?? prev.totalUsers),
      emailsSent: Number(payload.emailsSent ?? prev.emailsSent),
      emailsFailed: Number(payload.emailsFailed ?? prev.emailsFailed),
      currentBatch: Number(payload.currentBatch ?? prev.currentBatch),
      totalBatches: Number(payload.totalBatches ?? prev.totalBatches),
      progress: Number(payload.progress ?? prev.progress),
      failedEmails: Array.isArray(payload.failedEmails)
        ? (payload.failedEmails as NotificationProgress["failedEmails"])
        : prev.failedEmails,
      isComplete: Boolean(payload.isComplete ?? prev.isComplete),
    }))
  }, [])

  const sendMenuUpdateNotifications = useCallback(async () => {
    setIsSendingNotifications(true)
    setShowNotificationDialog(false)
    setShowProgressDialog(true)
    setNotificationProgress(createInitialNotificationProgress())

    try {
      const response = await fetch("/api/admin/notify-menu-update", { method: "POST" })
      if (!response.ok || !response.body) {
        throw new Error("Failed to start notification process")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const segments = buffer.split("\n")
        buffer = segments.pop() || ""

        for (const line of segments) {
          const trimmed = line.trim()
          if (!trimmed.startsWith("data:")) {
            continue
          }

          const rawData = trimmed.replace(/^data:\s*/, "")
          if (!rawData) {
            continue
          }

          try {
            const payload = JSON.parse(rawData) as Record<string, unknown>
            const message = typeof payload.message === "string" ? payload.message : ""
            const type = typeof payload.type === "string" ? payload.type : "info"

            applyProgressEvent(payload)
            if (message) {
              appendLog({
                type,
                message,
                timestamp: new Date(),
                data: payload,
              })
            }
          } catch (parseError) {
            appendLog({
              type: "info",
              message: rawData,
              timestamp: new Date(),
            })
            console.warn("Could not parse notification stream line:", parseError)
          }
        }
      }

      setNotificationProgress((prev) => ({
        ...prev,
        isComplete: true,
        progress: 100,
      }))

      toastRef.current({
        title: "Notifications complete",
        description: "Menu update notification process finished.",
      })
    } catch (error) {
      console.error("Error sending menu notifications:", error)
      appendLog({
        type: "error",
        message: `Critical error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      })
      toastRef.current({
        title: "Error",
        description: "Failed to send menu update notifications",
        variant: "destructive",
      })
    } finally {
      setIsSendingNotifications(false)
    }
  }, [appendLog, applyProgressEvent])

  return {
    isSendingNotifications,
    showNotificationDialog,
    setShowNotificationDialog,
    showProgressDialog,
    setShowProgressDialog,
    notificationProgress,
    sendMenuUpdateNotifications,
  }
}
