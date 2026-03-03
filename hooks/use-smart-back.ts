"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"

/**
 * Returns a handler that navigates to the previous page in history when possible,
 * or falls back to the homepage. Use for back buttons so users can compare plans
 * without being sent to the homepage every time.
 */
export function useSmartBack(fallbackPath = "/") {
  const router = useRouter()
  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackPath)
    }
  }, [router, fallbackPath])
}
