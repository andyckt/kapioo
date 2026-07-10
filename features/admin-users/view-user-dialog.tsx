"use client"

import { useCallback, useEffect, useState } from "react"

import { Calendar as CalendarIcon, ChevronsUpDown, CreditCard, DollarSign, Gift, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { formatDateTime } from "@/lib/format"
import { getWeeklyPlanBalanceRows } from "@/lib/plans/balances"
import type { UserActivity } from "@/lib/types/admin"
import type { PaginationState } from "@/lib/types/pagination"
import type { User } from "@/lib/utils"

interface ViewUserDialogProps {
  open: boolean
  user: User | null
  onOpenChange: (open: boolean) => void
}

const DEFAULT_ACTIVITY_PAGINATION: PaginationState = {
  page: 1,
  limit: 10,
  total: 0,
  pages: 1,
}

function formatActivityDate(activity: UserActivity) {
  const rawDate = activity.date || activity.createdAt
  if (!rawDate) return "-"

  return new Date(rawDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatAddressLines(address: User["address"]) {
  if (!address) return ["-"]
  return [
    [address.unitNumber, address.streetAddress || "-"].filter(Boolean).join(" "),
    [address.province || "-", address.postalCode || ""].filter(Boolean).join(" "),
    address.country || "-",
    address.buzzCode ? `Buzz: ${address.buzzCode}` : "",
  ].filter(Boolean)
}

export function ViewUserDialog({ open, user, onOpenChange }: ViewUserDialogProps) {
  const { toast } = useToast()
  const [userActivities, setUserActivities] = useState<UserActivity[]>([])
  const [userActivitiesLoading, setUserActivitiesLoading] = useState(false)
  const [activityType, setActivityType] = useState("all")
  const [activityPagination, setActivityPagination] = useState<PaginationState>(DEFAULT_ACTIVITY_PAGINATION)
  const weeklyPlanBalances = user ? getWeeklyPlanBalanceRows(user) : []

  const fetchUserActivities = useCallback(
    async (userId: string, page = 1, type = "all", options?: { signal?: AbortSignal }) => {
      setUserActivitiesLoading(true)
      try {
        const response = await fetch(
          `/api/users/${userId}/activity?page=${page}&limit=${activityPagination.limit}&type=${type}`,
          { signal: options?.signal }
        )

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`)
        }

        const data = await response.json()
        if (options?.signal?.aborted) return

        if (data.success) {
          setUserActivities(data.data.activities || [])
          setActivityPagination({
            page: data.data.pagination.page,
            limit: data.data.pagination.limit,
            total: data.data.pagination.total,
            pages: data.data.pagination.pages,
          })
        } else {
          console.error("API returned error:", data.error)
          setUserActivities([])
        }
      } catch (error) {
        if (options?.signal?.aborted || (error instanceof Error && error.name === "AbortError")) return
        console.error("Error fetching user activities:", error)
        setUserActivities([])
        toast({
          title: "Error",
          description: "Failed to load user activity",
          variant: "destructive",
        })
      } finally {
        if (!options?.signal?.aborted) {
          setUserActivitiesLoading(false)
        }
      }
    },
    [activityPagination.limit, toast]
  )

  useEffect(() => {
    if (!open || !user) return

    const controller = new AbortController()
    void fetchUserActivities(user._id, 1, activityType, { signal: controller.signal })

    return () => controller.abort()
  }, [activityType, fetchUserActivities, open, user])

  const handleActivityPagination = (direction: "prev" | "next") => {
    if (!user) return

    const newPage =
      direction === "prev"
        ? Math.max(1, activityPagination.page - 1)
        : Math.min(activityPagination.pages, activityPagination.page + 1)

    if (newPage !== activityPagination.page) {
      void fetchUserActivities(user._id, newPage, activityType)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>Information about {user?.name}</DialogDescription>
        </DialogHeader>

        {user && (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">User Details</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="max-h-[60vh] overflow-y-auto">
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">User ID</Label>
                    <p className="font-medium">{user.userID}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <p className="font-medium">{user.status || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Address Verification</Label>
                    <p className={user.addressVerified ? "font-medium text-green-700" : "font-medium text-yellow-700"}>
                      {user.addressVerified ? "Verified" : "Needs update"}
                    </p>
                    {user.addressVerifiedAt && (
                      <p className="text-xs text-muted-foreground">{formatDateTime(user.addressVerifiedAt)}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <p className="font-medium">{user.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="font-medium break-all">{user.email || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Phone</Label>
                    <p className="font-medium">{user.phone || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Joined (Toronto Time)</Label>
                    <p className="font-medium">{user.joined ? formatDateTime(user.joined) : "-"}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Address</Label>
                  <div className="mt-2 rounded-md border p-3 bg-slate-50">
                    {formatAddressLines(user.address).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                    {user.deliveryNotes && <p className="mt-2">Notes: {user.deliveryNotes}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Google Address Data</Label>
                    <div className="mt-2 rounded-md border p-3 bg-slate-50 text-sm">
                      <p>{user.addressGeo?.formattedAddress || "-"}</p>
                      <p>Place ID: {user.addressGeo?.placeId || "-"}</p>
                      <p>
                        Coordinates:{" "}
                        {typeof user.addressGeo?.lat === "number" && typeof user.addressGeo?.lng === "number"
                          ? `${user.addressGeo.lat}, ${user.addressGeo.lng}`
                          : "-"}
                      </p>
                      <p>Source: {user.addressGeo?.source || "-"}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">Legacy Address Snapshot</Label>
                    <div className="mt-2 rounded-md border p-3 bg-slate-50 text-sm">
                      {formatAddressLines(user.legacyAddress).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-md border p-3 bg-slate-50">
                    <h4 className="text-sm font-medium">Credits</h4>
                    <p className="text-2xl font-bold mt-2">{user.credits || 0}</p>
                  </div>

                  <div className="rounded-md border p-3 bg-slate-50">
                    <h4 className="text-sm font-medium">Order Summary</h4>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm">Daily Orders:</span>
                        <span className="font-medium">{user.dailyOrdersCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Weekly Orders:</span>
                        <span className="font-medium">{user.weeklyOrdersCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total Orders:</span>
                        <span className="font-medium">{user.totalOrders || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 space-y-4">
                  <div className="rounded-md border p-3 bg-slate-50">
                    <h4 className="text-sm font-medium">Meal Vouchers</h4>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm">2-Dish Vouchers:</span>
                        <span className="font-medium">{user.twoDishVoucher || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">3-Dish Vouchers:</span>
                        <span className="font-medium">{user.threeDishVoucher || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border p-3 bg-slate-50">
                    <h4 className="text-sm font-medium">Weekly Subscriptions</h4>
                    <div className="mt-2 space-y-1">
                      {weeklyPlanBalances.map((plan) => (
                        <div key={plan.field} className="flex justify-between">
                          <span className="text-sm">{plan.labelEn}:</span>
                          <span className="font-medium">{plan.balance}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">User Activity</Label>
                  <Select value={activityType} onValueChange={setActivityType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Activities</SelectItem>
                      <SelectItem value="transaction">Credit Transactions</SelectItem>
                      <SelectItem value="credit-request">Weekly Meal Requests</SelectItem>
                      <SelectItem value="voucher-request">Voucher Requests</SelectItem>
                      <SelectItem value="order">Daily Orders</SelectItem>
                      <SelectItem value="weekly-order">Weekly Orders</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="max-h-[400px] overflow-y-auto pr-2">
                  {userActivitiesLoading ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  ) : userActivities.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {userActivities.map((activity) => {
                        let icon
                        let colorClass

                        switch (activity.activityType) {
                          case "transaction":
                            icon =
                              activity.type === "Add" || activity.type === "credit" || activity.type === "refund" ? (
                                <DollarSign className="h-4 w-4 text-green-500" />
                              ) : (
                                <DollarSign className="h-4 w-4 text-red-500" />
                              )
                            colorClass =
                              activity.type === "Add" || activity.type === "credit" || activity.type === "refund"
                                ? "border-l-4 border-green-500"
                                : "border-l-4 border-red-500"
                            break
                          case "credit-request":
                            icon = <CreditCard className="h-4 w-4 text-blue-500" />
                            colorClass =
                              activity.status === "approved"
                                ? "border-l-4 border-green-500"
                                : activity.status === "declined"
                                  ? "border-l-4 border-red-500"
                                  : "border-l-4 border-yellow-500"
                            break
                          case "voucher-request":
                            icon = <Gift className="h-4 w-4 text-purple-500" />
                            colorClass =
                              activity.status === "approved"
                                ? "border-l-4 border-green-500"
                                : activity.status === "declined"
                                  ? "border-l-4 border-red-500"
                                  : "border-l-4 border-yellow-500"
                            break
                          case "order":
                            icon = <ShoppingCart className="h-4 w-4 text-orange-500" />
                            colorClass = "border-l-4 border-orange-500"
                            break
                          case "weekly-order":
                            icon = <CalendarIcon className="h-4 w-4 text-indigo-500" />
                            colorClass = "border-l-4 border-indigo-500"
                            break
                          default:
                            icon = <ChevronsUpDown className="h-4 w-4" />
                            colorClass = "border-l-4 border-gray-300"
                        }

                        return (
                          <div key={activity._id} className={`rounded-md border p-3 ${colorClass}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {icon}
                                <p className="text-sm font-medium truncate max-w-[180px]" title={activity.title || "-"}>
                                  {activity.title || "-"}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">{formatActivityDate(activity)}</p>
                            </div>
                            {activity.details && (
                              <p className="text-xs text-muted-foreground mt-2 truncate" title={activity.details}>
                                {activity.details}
                              </p>
                            )}

                            {(activity.activityType === "credit-request" || activity.activityType === "voucher-request") &&
                              activity.status && (
                                <div className="mt-2">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      activity.status === "approved"
                                        ? "bg-green-100 text-green-800"
                                        : activity.status === "declined"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                                  </span>
                                </div>
                              )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-md border p-3 text-center text-muted-foreground">
                      No activity found
                    </div>
                  )}
                </div>

                {userActivities.length > 0 && activityPagination.pages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActivityPagination("prev")}
                      disabled={activityPagination.page <= 1}
                    >
                      Previous
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Page {activityPagination.page} of {activityPagination.pages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActivityPagination("next")}
                      disabled={activityPagination.page >= activityPagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
