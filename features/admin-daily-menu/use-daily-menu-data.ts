"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useToast } from "@/hooks/use-toast"

import type { ComboItem, DayData } from "./types"

function formatCombo(combo: Record<string, unknown>): ComboItem {
  const typeA = combo.typeA as { dishes?: unknown[]; dishesEn?: unknown[]; voucherType?: "twoDish" } | undefined
  const typeB = combo.typeB as { dishes?: unknown[]; dishesEn?: unknown[]; voucherType?: "threeDish" } | undefined

  return {
    id: String(combo.comboId || combo.id || ""),
    comboId: typeof combo.comboId === "string" ? combo.comboId : undefined,
    name: String(combo.name || ""),
    calories: Number(combo.calories || 0),
    proteinGrams:
      combo.proteinGrams !== undefined && combo.proteinGrams !== null && combo.proteinGrams !== ""
        ? Number(combo.proteinGrams)
        : undefined,
    tags: Array.isArray(combo.tags) ? combo.tags.map(String) : [],
    tagsEn: Array.isArray(combo.tagsEn) ? combo.tagsEn.map(String) : [],
    allergensZh: Array.isArray(combo.allergensZh) ? combo.allergensZh.map(String) : [],
    allergensEn: Array.isArray(combo.allergensEn) ? combo.allergensEn.map(String) : [],
    descriptionZh: typeof combo.descriptionZh === "string" && combo.descriptionZh ? combo.descriptionZh : undefined,
    descriptionEn: typeof combo.descriptionEn === "string" && combo.descriptionEn ? combo.descriptionEn : undefined,
    typeA: {
      dishes: Array.isArray(typeA?.dishes)
        ? (typeA.dishes.map(String) as string[])
        : [],
      dishesEn: Array.isArray(typeA?.dishesEn)
        ? (typeA.dishesEn.map(String) as string[])
        : [],
      voucherType: typeA?.voucherType || "twoDish",
    },
    typeB: {
      dishes: Array.isArray(typeB?.dishes)
        ? (typeB.dishes.map(String) as string[])
        : [],
      dishesEn: Array.isArray(typeB?.dishesEn)
        ? (typeB.dishesEn.map(String) as string[])
        : [],
      voucherType: typeB?.voucherType || "threeDish",
    },
    imageUrl: typeof combo.imageUrl === "string" ? combo.imageUrl : undefined,
    imageKey: typeof combo.imageKey === "string" ? combo.imageKey : undefined,
    sourceComboLibraryId:
      typeof combo.sourceComboLibraryId === "string" ? combo.sourceComboLibraryId : undefined,
    sourceComboLibraryUpdatedAt:
      typeof combo.sourceComboLibraryUpdatedAt === "string" || combo.sourceComboLibraryUpdatedAt instanceof Date
        ? combo.sourceComboLibraryUpdatedAt
        : undefined,
  }
}

export function useDailyMenuData() {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [days, setDays] = useState<Record<string, DayData>>({})
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [dishTranslations, setDishTranslations] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async (options?: { signal?: AbortSignal }) => {
    setIsLoading(true)

    try {
      const formattedDays: Record<string, DayData> = {}

      try {
        const daysResponse = await fetch("/api/days/with-combos", {
          cache: "no-store",
          signal: options?.signal,
        })
        if (options?.signal?.aborted) return
        const daysData = await daysResponse.json()
        if (options?.signal?.aborted) return

        if (daysData.success && Array.isArray(daysData.data)) {
          for (const day of daysData.data as Array<Record<string, unknown>>) {
            formattedDays[String(day.dayId)] = {
              date: String(day.date || ""),
              displayName: String(day.displayName || ""),
              week: Number(day.week || 1),
              isActive: day.isActive !== false,
              combos: Array.isArray(day.combos)
                ? day.combos.map((combo) => formatCombo(combo as Record<string, unknown>))
                : [],
            }
          }
        } else {
          throw new Error("Optimized endpoint failed")
        }
      } catch (optimizedError) {
        if (options?.signal?.aborted) return
        console.warn("Optimized menu endpoint failed, falling back:", optimizedError)

        const daysResponse = await fetch("/api/days", { signal: options?.signal })
        if (options?.signal?.aborted) return
        const daysData = await daysResponse.json()
        if (options?.signal?.aborted) return

        if (!daysData.success || !Array.isArray(daysData.data)) {
          throw new Error(daysData.error || "Failed to fetch days")
        }

        for (const day of daysData.data as Array<Record<string, unknown>>) {
          const combosResponse = await fetch(`/api/days/${String(day.dayId)}/combos`, {
            signal: options?.signal,
          })
          if (options?.signal?.aborted) return
          const combosData = await combosResponse.json()
          if (options?.signal?.aborted) return

          formattedDays[String(day.dayId)] = {
            date: String(day.date || ""),
            displayName: String(day.displayName || ""),
            week: Number(day.week || 1),
            isActive: day.isActive !== false,
            combos: combosData.success && Array.isArray(combosData.data)
              ? combosData.data.map((combo: Record<string, unknown>) => formatCombo(combo))
              : [],
          }
        }
      }

      setDays(formattedDays)

      const tagsResponse = await fetch("/api/tags", { signal: options?.signal })
      if (options?.signal?.aborted) return
      const tagsData = await tagsResponse.json()
      if (options?.signal?.aborted) return

      if (!tagsData.success || !Array.isArray(tagsData.data)) {
        throw new Error(tagsData.error || "Failed to fetch tags")
      }

      setAvailableTags(
        tagsData.data.map((tag: { name?: string }) => tag.name).filter(Boolean) as string[]
      )
    } catch (error) {
      if (options?.signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
        return
      }

      console.error("Error fetching daily menu data:", error)
      toastRef.current({
        title: "Error",
        description: `Failed to load data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
    } finally {
      if (!options?.signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [])

  const fetchDishTranslations = useCallback(async (options?: { signal?: AbortSignal }) => {
    try {
      const response = await fetch("/api/dishes", { signal: options?.signal })
      if (options?.signal?.aborted) return
      const result = await response.json()
      if (options?.signal?.aborted) return

      if (result.success && Array.isArray(result.data)) {
        const translationsMap: Record<string, string> = {}
        result.data.forEach((dish: { name?: string; nameEn?: string }) => {
          if (dish.name && dish.nameEn) {
            translationsMap[dish.name] = dish.nameEn
          }
        })
        setDishTranslations(translationsMap)
      }
    } catch (error) {
      if (options?.signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
        return
      }

      console.error("Error fetching dish translations:", error)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void fetchData({ signal: controller.signal })
    void fetchDishTranslations({ signal: controller.signal })

    return () => controller.abort()
  }, [fetchData, fetchDishTranslations])

  return {
    days,
    setDays,
    availableTags,
    setAvailableTags,
    dishTranslations,
    setDishTranslations,
    isLoading,
    fetchData,
    fetchDishTranslations,
  }
}
