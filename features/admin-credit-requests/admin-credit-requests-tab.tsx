"use client"

import { format } from "date-fns"
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Check,
  CheckCircle,
  DollarSign,
  Eye,
  FileSpreadsheet,
  Package,
  RefreshCcw,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { AdminDateRange, CreditRequest } from "@/lib/types/admin"

import { getCreditRequestAmount, getCreditRequestUserInfo } from "./request-display"

interface AdminCreditRequestsTabProps {
  creditRequestsLoading: boolean
  creditRequests: CreditRequest[]
  creditRequestsPagination: {
    page: number
    limit: number
    pages: number
  }
  isExportingCreditRequests: boolean
  creditRequestsDateRange: AdminDateRange
  onApplyDateRange: (range: AdminDateRange) => void
  onClearDateRange: () => void
  onExport: () => void | Promise<void>
  onRefresh: () => void | Promise<void>
  onViewRequest: (request: CreditRequest) => void
  onApproveRequest: (request: CreditRequest) => void
  onDeclineRequest: (request: CreditRequest) => void
  onPaginate: (direction: "prev" | "next") => void
  onChangePageSize: (limit: number) => void
}

function getStatusBadge(status: CreditRequest["status"]) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Pending
      </span>
    )
  }

  if (status === "approved") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Approved
      </span>
    )
  }

  if (status === "declined") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Declined
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      {status}
    </span>
  )
}

function getMobileStatusStyles(status: CreditRequest["status"]) {
  if (status === "pending") {
    return {
      badge: "bg-yellow-50 text-yellow-800 border-yellow-200",
      border: "border-yellow-200",
      label: "Pending",
    }
  }

  if (status === "approved") {
    return {
      badge: "bg-green-50 text-green-800 border-green-200",
      border: "border-green-200",
      label: "Approved",
    }
  }

  if (status === "declined") {
    return {
      badge: "bg-red-50 text-red-800 border-red-200",
      border: "border-red-200",
      label: "Declined",
    }
  }

  return {
    badge: "bg-gray-100 text-gray-800 border-gray-200",
    border: "border-gray-200",
    label: status,
  }
}

export function AdminCreditRequestsTab({
  creditRequestsLoading,
  creditRequests,
  creditRequestsPagination,
  isExportingCreditRequests,
  creditRequestsDateRange,
  onApplyDateRange,
  onClearDateRange,
  onExport,
  onRefresh,
  onViewRequest,
  onApproveRequest,
  onDeclineRequest,
  onPaginate,
  onChangePageSize,
}: AdminCreditRequestsTabProps) {
  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Weekly Purchase Requests</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1">
                  <CalendarDays className="h-4 w-4" />
                  {creditRequestsDateRange.startDate ? (
                    creditRequestsDateRange.endDate ? (
                      <>
                        {format(creditRequestsDateRange.startDate, "MMM d")} -{" "}
                        {format(creditRequestsDateRange.endDate, "MMM d")}
                      </>
                    ) : (
                      format(creditRequestsDateRange.startDate, "MMM d")
                    )
                  ) : (
                    "Date Range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{
                    from: creditRequestsDateRange.startDate,
                    to: creditRequestsDateRange.endDate,
                  }}
                  onSelect={(range?: { from?: Date; to?: Date }) => {
                    onApplyDateRange({
                      startDate: range?.from,
                      endDate: range?.to,
                    })
                  }}
                  numberOfMonths={2}
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearDateRange}
              className="h-9 flex-1 sm:flex-none"
              disabled={!creditRequestsDateRange.startDate && !creditRequestsDateRange.endDate}
            >
              Clear
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onExport()}
            className="h-9 gap-1 flex-1 sm:flex-none"
            disabled={isExportingCreditRequests || creditRequests.length === 0}
          >
            {isExportingCreditRequests ? (
              <>
                <span className="hidden sm:inline">Exporting...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Export to CSV</span>
                <span className="sm:hidden">Export</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onRefresh()}
            className="h-9 gap-1 flex-1 sm:flex-none"
          >
            <RefreshCcw className={cn("h-4 w-4", creditRequestsLoading && "animate-spin")} />
            <span className="hidden sm:inline">{creditRequestsLoading ? "Refreshing..." : "Refresh"}</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Credit Purchase Requests</CardTitle>
          <CardDescription>Review and process credit purchase requests from users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Request ID</th>
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Plan</th>
                  <th className="text-left p-4 font-medium">Amount</th>
                  <th className="text-left p-4 font-medium hidden">Reference</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-center p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {creditRequestsLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </td>
                  </tr>
                ) : creditRequests.length > 0 ? (
                  creditRequests.map((request) => {
                    const userName = getCreditRequestUserInfo(request).name

                    return (
                      <tr key={request._id} className="border-b">
                        <td className="p-4">{request.requestId}</td>
                        <td className="p-4">{userName}</td>
                        <td className="p-4">
                          {request.planDescription ? (
                            <div className="font-medium">{request.planDescription}</div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No plan details</div>
                          )}
                        </td>
                        <td className="p-4">
                          <div>${getCreditRequestAmount(request).toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">Amount paid via e-Transfer</div>
                          {request.promoCode && (
                            <div className="text-xs text-green-700 font-medium mt-1">
                              Promo: {request.promoCode} (-${(request.promoDiscountAmount || 0).toFixed(2)})
                            </div>
                          )}
                          {request.referenceNumber && (
                            <div className="text-xs text-blue-600 font-medium mt-1">
                              INTERAC Email: {request.referenceNumber}
                            </div>
                          )}
                          {request.status === "approved" && (
                            <div className="text-xs text-green-600 font-medium mt-1">Plan approved</div>
                          )}
                        </td>
                        <td className="p-4 hidden">
                          {request.referenceNumber ? (
                            <div className="font-medium">{request.referenceNumber}</div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No INTERAC email</div>
                          )}
                        </td>
                        <td className="p-4">
                          {new Date(request.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="p-4">{getStatusBadge(request.status)}</td>
                        <td className="p-4">
                          <div className="flex justify-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => onViewRequest(request)}>
                              <Eye className="h-4 w-4" />
                            </Button>

                            {request.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => onApproveRequest(request)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => onDeclineRequest(request)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No credit purchase requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {creditRequestsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : creditRequests.length > 0 ? (
              creditRequests.map((request) => {
                const userInfo = getCreditRequestUserInfo(request)
                const statusStyles = getMobileStatusStyles(request.status)

                return (
                  <Card
                    key={request._id}
                    className={`overflow-hidden border-l-4 ${statusStyles.border} shadow-sm hover:shadow-md transition-shadow`}
                  >
                    <CardHeader className="pb-3 bg-muted/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold truncate">{userInfo.name}</CardTitle>
                          {userInfo.email && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{userInfo.email}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">ID:</span> {request.requestId}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusStyles.badge}`}
                        >
                          {statusStyles.label}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3 pt-4 space-y-3">
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Payment Amount</p>
                            <p className="text-2xl font-bold text-primary">
                              ${getCreditRequestAmount(request).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">via e-Transfer</p>
                          </div>
                          <DollarSign className="h-8 w-8 text-primary/30" />
                        </div>
                      </div>

                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Plan Details
                        </p>
                        <p className="font-medium text-sm">{request.planDescription || "No plan details"}</p>
                        {request.status === "approved" && (
                          <div className="flex items-center gap-1 mt-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600 font-medium">Plan approved</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {request.referenceNumber && (
                          <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                            <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full flex-shrink-0">
                              <span className="text-blue-600 text-xs font-bold">#</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-blue-600 font-medium truncate">{request.referenceNumber}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs font-medium">
                            {new Date(request.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 pb-3 flex flex-col gap-2">
                      {request.status === "pending" ? (
                        <>
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                              onClick={() => onApproveRequest(request)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1 shadow-sm"
                              onClick={() => onDeclineRequest(request)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => onViewRequest(request)} className="w-full">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => onViewRequest(request)} className="w-full">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                )
              })
            ) : (
              <div className="flex flex-col justify-center items-center py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3">
                  <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No credit purchase requests found</p>
                <p className="text-xs text-muted-foreground mt-1">Requests will appear here when submitted</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPaginate("prev")}
                disabled={creditRequestsPagination.page === 1 || creditRequestsLoading}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                Page {creditRequestsPagination.page} of {creditRequestsPagination.pages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPaginate("next")}
                disabled={
                  creditRequestsPagination.page === creditRequestsPagination.pages || creditRequestsLoading
                }
              >
                Next
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
              <Select
                value={creditRequestsPagination.limit.toString()}
                onValueChange={(value) => onChangePageSize(parseInt(value, 10))}
              >
                <SelectTrigger className="h-8 w-[80px]">
                  <SelectValue placeholder={creditRequestsPagination.limit.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
