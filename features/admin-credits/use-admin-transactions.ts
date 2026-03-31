"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useToast } from "@/hooks/use-toast"
import type { AdminTransaction } from "@/lib/types/admin"
import type { PaginationState } from "@/lib/types/pagination"

const DEFAULT_TRANSACTIONS_PAGINATION: PaginationState = {
  page: 1,
  limit: 25,
  total: 0,
  pages: 1,
}

interface UseAdminTransactionsArgs {
  activeTab: string
  hasVerifiedAdminSession: boolean
  usersCount: number
  usersLoading: boolean
  ensureUsersLoaded: () => void | Promise<void>
}

export function useAdminTransactions({
  activeTab,
  hasVerifiedAdminSession,
  usersCount,
  usersLoading,
  ensureUsersLoaded,
}: UseAdminTransactionsArgs) {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsPagination, setTransactionsPagination] = useState<PaginationState>(
    DEFAULT_TRANSACTIONS_PAGINATION
  )

  const transactionsPaginationRef = useRef(transactionsPagination)
  useEffect(() => {
    transactionsPaginationRef.current = transactionsPagination
  }, [transactionsPagination])

  const fetchTransactions = useCallback(async (page = 1, options?: { signal?: AbortSignal }) => {
    setTransactionsLoading(true)
    try {
      const response = await fetch(
        `/api/transactions?page=${page}&limit=${transactionsPaginationRef.current.limit}`,
        {
          signal: options?.signal,
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      if (options?.signal?.aborted) return

      if (data.success) {
        setTransactions(data.data.transactions || [])
        setTransactionsPagination((prev) => ({
          ...prev,
          page: data.data.page,
          total: data.data.total,
          pages: Math.ceil(data.data.total / data.data.limit),
        }))
        return
      }

      console.error("Transactions API returned error:", data.error)
      setTransactions([])
      toastRef.current({
        title: "Error",
        description: data.error || "Failed to fetch transactions",
        variant: "destructive",
      })
    } catch (error) {
      if (options?.signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
        return
      }

      console.error("Error fetching transactions:", error)
      setTransactions([])
      toastRef.current({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      })
    } finally {
      // Always clear loading, including on abort: effect cleanup aborts in-flight fetches when
      // deps change; skipping this left transactionsLoading stuck true forever.
      setTransactionsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasVerifiedAdminSession) return
    if (activeTab !== "credits") return

    const controller = new AbortController()

    if (usersCount === 0 && !usersLoading) {
      void ensureUsersLoaded()
    }

    void fetchTransactions(1, { signal: controller.signal })

    return () => controller.abort()
  }, [activeTab, ensureUsersLoaded, fetchTransactions, hasVerifiedAdminSession, usersCount, usersLoading])

  const handleTransactionPagination = useCallback(
    (direction: "prev" | "next") => {
      const newPage =
        direction === "prev"
          ? Math.max(1, transactionsPagination.page - 1)
          : Math.min(transactionsPagination.pages, transactionsPagination.page + 1)

      if (newPage !== transactionsPagination.page) {
        void fetchTransactions(newPage)
      }
    },
    [fetchTransactions, transactionsPagination.page, transactionsPagination.pages]
  )

  const changeTransactionsPageSize = useCallback(
    (limit: number) => {
      setTransactionsPagination((prev) => ({
        ...prev,
        limit,
        page: 1,
      }))
      void fetchTransactions(1)
    },
    [fetchTransactions]
  )

  return {
    transactions,
    transactionsLoading,
    transactionsPagination,
    setTransactionsPagination,
    fetchTransactions,
    handleTransactionPagination,
    changeTransactionsPageSize,
  }
}
