"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useToast } from "@/hooks/use-toast"
import { formatDateForCSV } from "@/lib/format"
import { getWeeklyPlanBalanceRows, listWeeklyPlanBalanceOptions } from "@/lib/plans/balances"
import { deleteUser, getAllUsersForExport, getUsers, type User } from "@/lib/utils"
import type { PaginationState } from "@/lib/types/pagination"

export type AdminUserSearchType = "all" | "name" | "email" | "userID"

const DEFAULT_USERS_PAGINATION: PaginationState = {
  page: 1,
  limit: 25,
  total: 0,
  pages: 1,
}

interface UseAdminUsersArgs {
  hasVerifiedAdminSession: boolean
  activeTab: string
}

interface FetchUsersOptions {
  signal?: AbortSignal
}

function formatCSV(text: string | undefined) {
  if (!text) return ""
  return text.includes(",") ? `"${text}"` : text
}

async function enrichUserOrderCounts(user: User): Promise<User> {
  try {
    const updatedUser = { ...user }

    const totalOrderResponse = await fetch(`/api/users/${user._id}/order-count`)
    if (totalOrderResponse.ok) {
      const totalOrderData = await totalOrderResponse.json()
      updatedUser.totalOrders = totalOrderData.success ? totalOrderData.count : 0
    }

    const dailyOrderResponse = await fetch(`/api/users/${user._id}/daily-orders/count`)
    if (dailyOrderResponse.ok) {
      const dailyOrderData = await dailyOrderResponse.json()
      updatedUser.dailyOrdersCount = dailyOrderData.success ? dailyOrderData.count : 0
    }

    const weeklyOrderResponse = await fetch(`/api/users/${user._id}/weekly-orders/count`)
    if (weeklyOrderResponse.ok) {
      const weeklyOrderData = await weeklyOrderResponse.json()
      updatedUser.weeklyOrdersCount = weeklyOrderData.success ? weeklyOrderData.count : 0
    }

    return updatedUser
  } catch (error) {
    console.error(`Error fetching order counts for user ${user._id}:`, error)
    return user
  }
}

export function useAdminUsers({ hasVerifiedAdminSession, activeTab }: UseAdminUsersArgs) {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersPagination, setUsersPagination] = useState<PaginationState>(DEFAULT_USERS_PAGINATION)
  const [usersError, setUsersError] = useState<string | null>(null)

  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [userSearchType, setUserSearchType] = useState<AdminUserSearchType>("all")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const [totalUsersCount, setTotalUsersCount] = useState(0)
  const [userGrowthRate, setUserGrowthRate] = useState(0)
  const [totalUsersLoading, setTotalUsersLoading] = useState(true)
  const [isExportingUsers, setIsExportingUsers] = useState(false)
  const [isExportingSituationReport, setIsExportingSituationReport] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)

  const lastUsersFetchKeyRef = useRef<string | null>(null)

  const fetchTotalUsersStats = useCallback(async (opts?: { signal?: AbortSignal }) => {
    try {
      setTotalUsersLoading(true)
      const response = await fetch("/api/users/count", { signal: opts?.signal })
      if (opts?.signal?.aborted) return

      const data = await response.json()
      if (opts?.signal?.aborted) return

      if (data.success) {
        setTotalUsersCount(data.data.total)
        setUserGrowthRate(data.data.growthRate || 0)
      }
    } catch (error) {
      if (opts?.signal?.aborted || (error instanceof Error && error.name === "AbortError")) return
      console.error("Error fetching total users stats:", error)
    } finally {
      if (!opts?.signal?.aborted) {
        setTotalUsersLoading(false)
      }
    }
  }, [])

  const fetchUsers = useCallback(
    async (
      page = 1,
      limit = 10,
      search?: string,
      searchType?: AdminUserSearchType,
      opts?: FetchUsersOptions
    ) => {
      try {
        setUsersLoading(true)
        setUsersError(null)

        try {
          let url = `/api/users/with-order-counts?page=${page}&limit=${limit}`

          if (search && search.trim()) {
            url += `&search=${encodeURIComponent(search.trim())}`
            if (searchType && searchType !== "all") {
              url += `&searchType=${searchType}`
            }
          }

          const response = await fetch(url, { signal: opts?.signal })
          if (opts?.signal?.aborted) return
          const result = await response.json()
          if (opts?.signal?.aborted) return

          if (result.success && result.data) {
            setUsers(result.data)
            setFilteredUsers(result.data)
            setUsersPagination(result.pagination)
            if (!search?.trim()) {
              lastUsersFetchKeyRef.current = `${result.pagination.page}-${result.pagination.limit}`
            }

            if (search && search.trim()) {
              toastRef.current({
                title: result.data.length === 0 ? "No matches" : "Search results",
                description:
                  result.data.length === 0
                    ? `No users found matching "${search}"${searchType !== "all" ? ` in ${searchType}` : ""}`
                    : `Found ${result.pagination.total} users matching "${search}"${searchType !== "all" ? ` in ${searchType}` : ""}`,
              })
            }
            return
          }

          throw new Error("Optimized endpoint failed")
        } catch (optimizedError) {
          if (opts?.signal?.aborted || (optimizedError instanceof Error && optimizedError.name === "AbortError")) {
            return
          }

          console.log("Optimized endpoint failed, falling back to original method")

          const result = await getUsers(page, limit, search, searchType)
          if (!result.users) {
            throw new Error("Fallback user fetch failed")
          }

          const usersWithOrderCounts = await Promise.all(result.users.map(enrichUserOrderCounts))
          if (opts?.signal?.aborted) return

          setUsers(usersWithOrderCounts)
          setFilteredUsers(usersWithOrderCounts)
          setUsersPagination(result.pagination)
          if (!search?.trim()) {
            lastUsersFetchKeyRef.current = `${result.pagination.page}-${result.pagination.limit}`
          }

          if (search && search.trim()) {
            toastRef.current({
              title: result.users.length === 0 ? "No matches" : "Search results",
              description:
                result.users.length === 0
                  ? `No users found matching "${search}"${searchType !== "all" ? ` in ${searchType}` : ""}`
                  : `Found ${result.pagination.total} users matching "${search}"${searchType !== "all" ? ` in ${searchType}` : ""}`,
            })
          }
        }
      } catch (error) {
        if (opts?.signal?.aborted || (error instanceof Error && error.name === "AbortError")) return

        console.error("Error fetching users:", error)
        setUsersError("An unexpected error occurred")
        toastRef.current({
          title: "Error",
          description: "An unexpected error occurred while fetching users",
          variant: "destructive",
        })
      } finally {
        if (!opts?.signal?.aborted) {
          setUsersLoading(false)
        }
      }
    },
    []
  )

  const searchUsers = useCallback(async (query: string) => {
    try {
      setSearchLoading(true)
      const result = await getUsers(1, 20, query, "all")
      setSearchResults(result.users || [])
    } catch (error) {
      console.error("Error searching users:", error)
      toastRef.current({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      })
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  const handleUserSearch = useCallback(() => {
    if (!userSearchQuery.trim()) {
      void fetchUsers(1, usersPagination.limit)
      return
    }

    setUsersPagination((prev) => ({
      ...prev,
      page: 1,
    }))
    void fetchUsers(1, usersPagination.limit, userSearchQuery, userSearchType)
  }, [fetchUsers, userSearchQuery, userSearchType, usersPagination.limit])

  const resetUserSearch = useCallback(() => {
    setUserSearchQuery("")
    setUserSearchType("all")
    void fetchUsers(1, usersPagination.limit)
  }, [fetchUsers, usersPagination.limit])

  const handleUserPagination = useCallback(
    (direction: "prev" | "next") => {
      const newPage =
        direction === "prev"
          ? Math.max(1, usersPagination.page - 1)
          : Math.min(usersPagination.pages, usersPagination.page + 1)

      if (newPage !== usersPagination.page) {
        void fetchUsers(newPage, usersPagination.limit)
      }
    },
    [fetchUsers, usersPagination.limit, usersPagination.page, usersPagination.pages]
  )

  const handleExportUsers = useCallback(async () => {
    try {
      setIsExportingUsers(true)
      toastRef.current({
        title: "Export started",
        description: "Fetching all users for export. This may take a moment...",
      })

      const allUsers = await getAllUsersForExport()
      const processedUsers = await Promise.all(allUsers.map(enrichUserOrderCounts))
      const weeklyPlanBalanceOptions = listWeeklyPlanBalanceOptions()

      const headers = [
        "User ID",
        "Name",
        "Phone",
        "Email",
        "Created",
        "2-Dish Vouchers",
        "3-Dish Vouchers",
        ...weeklyPlanBalanceOptions.map((plan) => `${plan.mealsPerWeek} Meals Plan`),
        "Daily Orders",
        "Weekly Orders",
        "Total Orders",
      ].join(",")

      const rows = processedUsers.map((user) => {
        const weeklyPlanBalances = getWeeklyPlanBalanceRows(user)

        return [
          formatCSV(user.userID),
          formatCSV(user.name),
          formatCSV(user.phone),
          formatCSV(user.email),
          formatDateForCSV(user.joined),
          user.twoDishVoucher || 0,
          user.threeDishVoucher || 0,
          ...weeklyPlanBalances.map((plan) => plan.balance),
          user.dailyOrdersCount || 0,
          user.weeklyOrdersCount || 0,
          user.totalOrders || 0,
        ].join(",")
      })

      const csvContent = [headers, ...rows].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const fileName = `users-export-${new Date().toISOString().split("T")[0]}.csv`

      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", fileName)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toastRef.current({
        title: "Export successful",
        description: `${rows.length} users exported to ${fileName}`,
      })
    } catch (error) {
      console.error("Error exporting users:", error)
      toastRef.current({
        title: "Export failed",
        description: "There was an error exporting users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExportingUsers(false)
    }
  }, [])

  const handleExportSituationReport = useCallback(async () => {
    try {
      setIsExportingSituationReport(true)
      toastRef.current({
        title: "Generating report",
        description: "Building customer order situation report. This may take a moment...",
      })

      const response = await fetch("/api/admin/users/order-situation-report/export")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error((errorData as { error?: string }).error ?? `HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const date = new Date().toISOString().split("T")[0]
      const fileName = `kapioo_customer_order_situation_report_${date}.xlsx`

      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toastRef.current({
        title: "Report downloaded",
        description: `Saved as ${fileName}`,
      })
    } catch (error) {
      console.error("Error exporting situation report:", error)
      toastRef.current({
        title: "Export failed",
        description: error instanceof Error ? error.message : "There was an error generating the report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExportingSituationReport(false)
    }
  }, [])

  const handleDeleteUser = useCallback(async (userId: string) => {
    try {
      setIsDeletingUser(true)
      const success = await deleteUser(userId)
      return success
    } catch (error) {
      console.error("Error deleting user:", error)
      return false
    } finally {
      setIsDeletingUser(false)
    }
  }, [])

  useEffect(() => {
    if (!hasVerifiedAdminSession) return
    if (activeTab !== "users" && activeTab !== "credits") return

    const page = usersPagination.page
    const limit = usersPagination.limit
    const fetchKey = `${page}-${limit}`

    if (users.length > 0 && lastUsersFetchKeyRef.current === fetchKey) {
      setSearchResults([])
      return
    }

    const controller = new AbortController()
    const signal = controller.signal

    const run = async () => {
      setSearchResults([])
      try {
        await Promise.all([
          fetchUsers(page, limit, undefined, undefined, { signal }),
          fetchTotalUsersStats({ signal }),
        ])
        if (signal.aborted) return
        lastUsersFetchKeyRef.current = fetchKey
      } catch (error) {
        if (signal.aborted || (error instanceof Error && error.name === "AbortError")) return
      }
    }

    void run()
    return () => controller.abort()
  }, [activeTab, fetchTotalUsersStats, fetchUsers, hasVerifiedAdminSession, users.length, usersPagination.limit, usersPagination.page])

  return {
    users,
    setUsers,
    filteredUsers,
    setFilteredUsers,
    usersLoading,
    usersPagination,
    setUsersPagination,
    usersError,
    userSearchQuery,
    setUserSearchQuery,
    userSearchType,
    setUserSearchType,
    searchResults,
    setSearchResults,
    searchLoading,
    totalUsersCount,
    userGrowthRate,
    totalUsersLoading,
    isExportingUsers,
    isExportingSituationReport,
    isDeletingUser,
    fetchUsers,
    fetchTotalUsersStats,
    searchUsers,
    handleUserSearch,
    resetUserSearch,
    handleUserPagination,
    handleExportUsers,
    handleExportSituationReport,
    handleDeleteUser,
  }
}
