"use client"

import { useEffect } from "react"

import {
  ensureUserPhone,
  getStoredUser,
  normalizePhoneInput,
} from "@/lib/phone-helper"

type UseUserPhoneSyncOptions = {
  phone: string
  userId?: string | null
  delayMs?: number
}

export function useUserPhoneSync({
  phone,
  userId,
  delayMs = 400,
}: UseUserPhoneSyncOptions) {
  useEffect(() => {
    const normalizedPhone = normalizePhoneInput(phone)
    const storedPhone = normalizePhoneInput(getStoredUser()?.phone || "")
    const needsSync = Boolean(userId && normalizedPhone) && normalizedPhone !== storedPhone

    if (!needsSync) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void ensureUserPhone({
        userId: userId as string,
        phoneInput: normalizedPhone,
        requirePhone: false,
      })
    }, delayMs)

    return () => window.clearTimeout(timeoutId)
  }, [delayMs, phone, userId])
}
