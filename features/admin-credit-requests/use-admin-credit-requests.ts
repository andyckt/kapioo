"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { format } from "date-fns"

import { useToast } from "@/hooks/use-toast"
import type {
  AdminDateRange,
  CreditRequest,
} from "@/lib/types/admin"
import type { PaginationState } from "@/lib/types/pagination"

const DEFAULT_CREDIT_REQUESTS_PAGINATION: PaginationState = {
  page: 1,
  limit: 10,
  total: 0,
  pages: 1,
}

const EMPTY_DATE_RANGE: AdminDateRange = {
  startDate: undefined,
  endDate: undefined,
}

interface FetchCreditRequestsOptions {
  page?: number
  limit?: number
  startDate?: Date
  endDate?: Date
  signal?: AbortSignal
}

interface UseAdminCreditRequestsArgs {
  activeTab: string
  hasVerifiedAdminSession: boolean
}

function deriveApprovedPlanCounts(request: CreditRequest) {
  const result = {
    approvedSixMeals: 0,
    approvedEightMeals: 0,
    approvedTenMeals: 0,
    approvedTwelveMeals: 0,
    approvedSixteenMeals: 0,
  }

  if (request.mealPlanType && request.mealPlanQuantity) {
    const quantity = request.mealPlanQuantity

    switch (request.mealPlanType) {
      case "6aweek":
        result.approvedSixMeals = quantity
        return result
      case "8aweek":
        result.approvedEightMeals = quantity
        return result
      case "10aweek":
        result.approvedTenMeals = quantity
        return result
      case "12aweek":
        result.approvedTwelveMeals = quantity
        return result
      case "16aweek":
        result.approvedSixteenMeals = quantity
        return result
    }
  }

  if (!request.planDescription) {
    return result
  }

  const mealsMatch = request.planDescription.match(/(\d+)\s*meals\/week/i)
  let mealsPerWeek = mealsMatch?.[1] ? parseInt(mealsMatch[1], 10) : 0

  if (!mealsPerWeek) {
    const altMatch = request.planDescription.match(/(\d+)\s*meals/i)
    if (altMatch?.[1]) {
      mealsPerWeek = parseInt(altMatch[1], 10)
    }
  }

  if (!mealsPerWeek) {
    return result
  }

  let quantity = request.mealPlanQuantity

  if (!quantity) {
    const durationMatch = request.planDescription.match(/(\d+)[\s-]*(weeks?|周)/i)
    if (durationMatch?.[1]) {
      quantity = parseInt(durationMatch[1], 10)
    }
  }

  if (!quantity && request.amount) {
    const amount = Number(request.amount)

    if (mealsPerWeek === 6) {
      quantity = amount < 150 ? 1 : amount < 300 ? 2 : 4
    } else if (mealsPerWeek === 8) {
      quantity = amount < 200 ? 1 : amount < 350 ? 2 : 4
    } else if (mealsPerWeek === 10) {
      quantity = amount < 250 ? 1 : amount < 450 ? 2 : 4
    } else if (mealsPerWeek === 12) {
      quantity = amount < 300 ? 1 : amount < 500 ? 2 : 4
    }
  }

  quantity = quantity || 1

  if (mealsPerWeek === 6) {
    result.approvedSixMeals = quantity
  } else if (mealsPerWeek === 8) {
    result.approvedEightMeals = quantity
  } else if (mealsPerWeek === 10) {
    result.approvedTenMeals = quantity
  } else if (mealsPerWeek === 12) {
    result.approvedTwelveMeals = quantity
  } else if (mealsPerWeek === 16) {
    result.approvedSixteenMeals = quantity
  }

  return result
}

export function useAdminCreditRequests({
  activeTab,
  hasVerifiedAdminSession,
}: UseAdminCreditRequestsArgs) {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [creditRequestsLoading, setCreditRequestsLoading] = useState(false)
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([])
  const [creditRequestsPagination, setCreditRequestsPagination] = useState<PaginationState>(
    DEFAULT_CREDIT_REQUESTS_PAGINATION
  )
  const [isExportingCreditRequests, setIsExportingCreditRequests] = useState(false)
  const [creditRequestsDateRange, setCreditRequestsDateRange] = useState<AdminDateRange>(EMPTY_DATE_RANGE)
  const [viewRequestOpen, setViewRequestOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<CreditRequest | null>(null)
  const [approveRequestOpen, setApproveRequestOpen] = useState(false)
  const [declineRequestOpen, setDeclineRequestOpen] = useState(false)
  const [approvedSixMeals, setApprovedSixMeals] = useState(0)
  const [approvedEightMeals, setApprovedEightMeals] = useState(0)
  const [approvedTenMeals, setApprovedTenMeals] = useState(0)
  const [approvedTwelveMeals, setApprovedTwelveMeals] = useState(0)
  const [approvedSixteenMeals, setApprovedSixteenMeals] = useState(0)
  const [adminNotes, setAdminNotes] = useState("")
  const [processingRequest, setProcessingRequest] = useState(false)

  const paginationRef = useRef(creditRequestsPagination)
  const dateRangeRef = useRef(creditRequestsDateRange)

  useEffect(() => {
    paginationRef.current = creditRequestsPagination
  }, [creditRequestsPagination])

  useEffect(() => {
    dateRangeRef.current = creditRequestsDateRange
  }, [creditRequestsDateRange])

  const fetchCreditRequests = useCallback(async (options?: FetchCreditRequestsOptions) => {
    const page = options?.page ?? 1
    const limit = options?.limit ?? paginationRef.current.limit
    const startDate =
      options && "startDate" in options ? options.startDate : dateRangeRef.current.startDate
    const endDate =
      options && "endDate" in options ? options.endDate : dateRangeRef.current.endDate

    setCreditRequestsLoading(true)

    try {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", limit.toString())

      if (startDate) {
        params.append("startDate", format(startDate, "yyyy-MM-dd"))
      }

      if (endDate) {
        params.append("endDate", format(endDate, "yyyy-MM-dd"))
      }

      const response = await fetch(`/api/credits/request/admin?${params.toString()}`, {
        signal: options?.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      if (options?.signal?.aborted) return

      if (data.success) {
        setCreditRequests(data.data.requests || [])
        setCreditRequestsPagination((prev) => ({
          ...prev,
          limit,
          page: data.data.page,
          total: data.data.total,
          pages: Math.ceil(data.data.total / data.data.limit),
        }))
        return
      }

      console.error("Credit requests API returned error:", data.error)
      setCreditRequests([])
      toastRef.current({
        title: "Error",
        description: data.error || "Failed to fetch credit purchase requests",
        variant: "destructive",
      })
    } catch (error) {
      if (options?.signal?.aborted || (error instanceof Error && error.name === "AbortError")) return

      console.error("Error fetching credit requests:", error)
      setCreditRequests([])
      toastRef.current({
        title: "Error",
        description: "Failed to fetch credit purchase requests",
        variant: "destructive",
      })
    } finally {
      if (!options?.signal?.aborted) {
        setCreditRequestsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!hasVerifiedAdminSession) return
    if (activeTab !== "credit-requests") return

    const controller = new AbortController()
    void fetchCreditRequests({ page: 1, signal: controller.signal })
    return () => controller.abort()
  }, [activeTab, fetchCreditRequests, hasVerifiedAdminSession])

  const handleCreditRequestPagination = useCallback(
    (direction: "prev" | "next") => {
      const newPage =
        direction === "prev"
          ? Math.max(1, creditRequestsPagination.page - 1)
          : Math.min(creditRequestsPagination.pages, creditRequestsPagination.page + 1)

      if (newPage !== creditRequestsPagination.page) {
        void fetchCreditRequests({ page: newPage })
      }
    },
    [creditRequestsPagination.page, creditRequestsPagination.pages, fetchCreditRequests]
  )

  const applyCreditRequestsDateRange = useCallback(
    (range: AdminDateRange) => {
      setCreditRequestsDateRange(range)
      setCreditRequestsPagination((prev) => ({
        ...prev,
        page: 1,
      }))
      void fetchCreditRequests({
        page: 1,
        startDate: range.startDate,
        endDate: range.endDate,
      })
    },
    [fetchCreditRequests]
  )

  const clearCreditRequestsDateRange = useCallback(() => {
    applyCreditRequestsDateRange(EMPTY_DATE_RANGE)
  }, [applyCreditRequestsDateRange])

  const changeCreditRequestsPageSize = useCallback(
    (limit: number) => {
      setCreditRequestsPagination((prev) => ({
        ...prev,
        limit,
        page: 1,
      }))
      void fetchCreditRequests({
        page: 1,
        limit,
      })
    },
    [fetchCreditRequests]
  )

  const refreshCreditRequests = useCallback(() => {
    void fetchCreditRequests({ page: paginationRef.current.page })
  }, [fetchCreditRequests])

  const handleViewRequest = useCallback((request: CreditRequest) => {
    setSelectedRequest(request)
    setViewRequestOpen(true)
  }, [])

  const handleApproveRequest = useCallback((request: CreditRequest) => {
    setSelectedRequest(request)

    const suggested = deriveApprovedPlanCounts(request)
    setApprovedSixMeals(suggested.approvedSixMeals)
    setApprovedEightMeals(suggested.approvedEightMeals)
    setApprovedTenMeals(suggested.approvedTenMeals)
    setApprovedTwelveMeals(suggested.approvedTwelveMeals)
    setApprovedSixteenMeals(suggested.approvedSixteenMeals)

    setAdminNotes("")
    setApproveRequestOpen(true)
  }, [])

  const handleDeclineRequest = useCallback((request: CreditRequest) => {
    setSelectedRequest(request)
    setAdminNotes("")
    setDeclineRequestOpen(true)
  }, [])

  const confirmApproveRequest = useCallback(async () => {
    if (!selectedRequest?.requestId) return

    setProcessingRequest(true)
    try {
      const approvedPlans = [
        { planId: "weekly-6x1", quantity: approvedSixMeals },
        { planId: "weekly-8x1", quantity: approvedEightMeals },
        { planId: "weekly-10x1", quantity: approvedTenMeals },
        { planId: "weekly-12x1", quantity: approvedTwelveMeals },
        { planId: "weekly-16x1", quantity: approvedSixteenMeals },
      ].filter((entry) => entry.quantity > 0)

      const totalApproved = approvedPlans.reduce((sum, entry) => sum + entry.quantity, 0)
      if (totalApproved <= 0) {
        toastRef.current({
          title: "Error",
          description: "Please enter at least one meal plan quantity",
          variant: "destructive",
        })
        setProcessingRequest(false)
        return
      }

      const response = await fetch("/api/credits/request/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: selectedRequest.requestId,
          action: "approve",
          approvedSixMeals,
          approvedEightMeals,
          approvedTenMeals,
          approvedTwelveMeals,
          approvedSixteenMeals,
          approvedPlans,
          adminNotes,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const description = approvedPlans
          .map((entry) => {
            const meals = String(entry.planId).match(/^weekly-(\d+)x/)?.[1] || "?"
            return `${entry.quantity} x ${meals}-meal plans`
          })
          .join(", ")

        toastRef.current({
          title: "Request approved",
          description: `Approved ${description} for user`,
        })

        void fetchCreditRequests({ page: paginationRef.current.page })
        setApproveRequestOpen(false)
      } else {
        toastRef.current({
          title: "Error",
          description: result.error || "Failed to approve request",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error approving request:", error)
      toastRef.current({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setProcessingRequest(false)
    }
  }, [
    adminNotes,
    approvedEightMeals,
    approvedSixMeals,
    approvedSixteenMeals,
    approvedTenMeals,
    approvedTwelveMeals,
    fetchCreditRequests,
    selectedRequest,
  ])

  const confirmDeclineRequest = useCallback(async () => {
    if (!selectedRequest?.requestId) return

    setProcessingRequest(true)
    try {
      const response = await fetch("/api/credits/request/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: selectedRequest.requestId,
          action: "decline",
          adminNotes,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toastRef.current({
          title: "Request declined",
          description: "Credit purchase request has been declined",
        })

        void fetchCreditRequests({ page: paginationRef.current.page })
        setDeclineRequestOpen(false)
      } else {
        toastRef.current({
          title: "Error",
          description: result.error || "Failed to decline request",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error declining request:", error)
      toastRef.current({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setProcessingRequest(false)
    }
  }, [adminNotes, fetchCreditRequests, selectedRequest])

  const exportCreditRequestsToCSV = useCallback(async () => {
    setIsExportingCreditRequests(true)
    try {
      const params = new URLSearchParams()

      if (activeTab === "credit-requests") {
        params.append("status", "all")
      }

      if (dateRangeRef.current.startDate) {
        params.append("startDate", format(dateRangeRef.current.startDate, "yyyy-MM-dd"))
      }

      if (dateRangeRef.current.endDate) {
        params.append("endDate", format(dateRangeRef.current.endDate, "yyyy-MM-dd"))
      }

      const link = document.createElement("a")
      link.href = `/api/credits/request/admin/export?${params.toString()}`
      link.setAttribute("download", `credit-requests-${format(new Date(), "yyyy-MM-dd")}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toastRef.current({
        title: "Export Started",
        description: "Your CSV file will download shortly.",
      })
    } catch (error) {
      console.error("Error exporting credit requests:", error)
      toastRef.current({
        title: "Export Failed",
        description: "There was an error exporting credit requests to CSV.",
        variant: "destructive",
      })
    } finally {
      setIsExportingCreditRequests(false)
    }
  }, [activeTab])

  return {
    creditRequestsLoading,
    creditRequests,
    creditRequestsPagination,
    isExportingCreditRequests,
    creditRequestsDateRange,
    viewRequestOpen,
    setViewRequestOpen,
    selectedRequest,
    setSelectedRequest,
    approveRequestOpen,
    setApproveRequestOpen,
    declineRequestOpen,
    setDeclineRequestOpen,
    approvedSixMeals,
    setApprovedSixMeals,
    approvedEightMeals,
    setApprovedEightMeals,
    approvedTenMeals,
    setApprovedTenMeals,
    approvedTwelveMeals,
    setApprovedTwelveMeals,
    approvedSixteenMeals,
    setApprovedSixteenMeals,
    adminNotes,
    setAdminNotes,
    processingRequest,
    fetchCreditRequests,
    handleCreditRequestPagination,
    applyCreditRequestsDateRange,
    clearCreditRequestsDateRange,
    changeCreditRequestsPageSize,
    refreshCreditRequests,
    handleViewRequest,
    handleApproveRequest,
    handleDeclineRequest,
    confirmApproveRequest,
    confirmDeclineRequest,
    exportCreditRequestsToCSV,
  }
}
