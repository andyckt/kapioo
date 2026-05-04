"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { WeeklyComboLibraryItem } from "@/lib/combo-library/weekly/types"

type Filters = {
  q?: string
  status?: "active" | "archived" | "draft" | ""
  sort?: "updated-desc" | "created-desc" | "name-asc" | "calories-asc" | "calories-desc"
  page?: number
  limit?: number
}

type ListResponse = {
  success: boolean
  data?: {
    items: WeeklyComboLibraryItem[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }
  error?: string
}

export function useWeeklyComboLibraryList(initialFilters: Filters = {}) {
  const [items, setItems] = useState<WeeklyComboLibraryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<Filters>({
    page: 1,
    limit: 20,
    sort: "updated-desc",
    ...initialFilters,
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchItems = useCallback(async (nextFilters = filters, options?: { signal?: AbortSignal }) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") params.set(key, String(value))
      })
      const response = await fetch(`/api/admin/weekly-combo-library?${params.toString()}`, {
        cache: "no-store",
        signal: options?.signal,
      })
      const result = (await response.json()) as ListResponse
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "Failed to load Weekly combo library")
      }
      setItems(result.data.items)
      setPagination(result.data.pagination)
    } catch (fetchError) {
      if (options?.signal?.aborted || (fetchError instanceof Error && fetchError.name === "AbortError")) return
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load Weekly combo library")
    } finally {
      if (!options?.signal?.aborted) setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const controller = new AbortController()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void fetchItems(filters, { signal: controller.signal })
    }, filters.q ? 300 : 0)
    return () => {
      controller.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchItems, filters])

  const setFilters = useCallback((updates: Filters) => {
    setFiltersState((current) => ({ ...current, ...updates, page: updates.page ?? 1 }))
  }, [])

  return { items, isLoading, error, filters, pagination, setFilters, refresh: () => fetchItems(filters) }
}
