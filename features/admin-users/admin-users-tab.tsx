"use client"

import type { Dispatch, SetStateAction } from "react"

import { Copy, Download, Eye, Loader2, RefreshCcw, Users, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { PaginationState } from "@/lib/types/pagination"
import type { User } from "@/lib/utils"

import type { AdminUserSearchType } from "./use-admin-users"

export interface AdminUsersTabProps {
  users: User[]
  usersLoading: boolean
  usersPagination: PaginationState
  setUsersPagination: Dispatch<SetStateAction<PaginationState>>
  usersError: string | null
  filteredUsers: User[]
  userSearchQuery: string
  setUserSearchQuery: Dispatch<SetStateAction<string>>
  userSearchType: AdminUserSearchType
  setUserSearchType: Dispatch<SetStateAction<AdminUserSearchType>>
  totalUsersCount: number
  userGrowthRate: number
  totalUsersLoading: boolean
  isExportingUsers: boolean
  onRefresh: () => void
  onExportUsers: () => void
  onSearch: () => void
  onResetSearch: () => void
  onPaginate: (direction: "prev" | "next") => void
  onViewUser: (user: User) => void
  onDeleteUser: (user: User) => void
  onChangePageSize: (limit: number) => void
}

function EmailCell({ email }: { email?: string }) {
  const { toast } = useToast()

  if (!email) {
    return <span>-</span>
  }

  return (
    <div className="flex items-center space-x-1">
      <div className="break-words max-w-[120px]" title={email}>
        {email}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 ml-1"
        onClick={() => {
          navigator.clipboard.writeText(email)
          toast({
            title: "Copied",
            description: "Email copied to clipboard",
            duration: 2000,
          })
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function MobileEmailCell({ email }: { email?: string }) {
  const { toast } = useToast()

  return (
    <div className="flex items-center gap-1">
      <p className="text-xs font-medium truncate" title={email || "-"}>
        {email || "-"}
      </p>
      {email && (
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 flex-shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(email)
            toast({
              title: "Copied",
              description: "Email copied to clipboard",
              duration: 2000,
            })
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

export function AdminUsersTab({
  usersLoading,
  usersPagination,
  usersError,
  filteredUsers,
  userSearchQuery,
  setUserSearchQuery,
  userSearchType,
  setUserSearchType,
  totalUsersCount,
  userGrowthRate,
  totalUsersLoading,
  isExportingUsers,
  onRefresh,
  onExportUsers,
  onSearch,
  onResetSearch,
  onPaginate,
  onViewUser,
  onDeleteUser,
  onChangePageSize,
}: AdminUsersTabProps) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-9 gap-1 flex-1 sm:flex-none"
          >
            <RefreshCcw className={cn("h-4 w-4", (usersLoading || totalUsersLoading) && "animate-spin")} />
            <span className="hidden sm:inline">
              {usersLoading || totalUsersLoading ? "Refreshing..." : "Refresh"}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportUsers}
            className="h-9 gap-1 flex-1 sm:flex-none"
            disabled={isExportingUsers}
          >
            {isExportingUsers ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export Users</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUsersLoading ? "..." : totalUsersCount}</div>
          {!totalUsersLoading && (
            <p className="text-xs text-muted-foreground mt-1">
              {userGrowthRate >= 0 ? "+" : ""}
              {userGrowthRate}% from last period
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user accounts and credits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2 flex-1">
                <Select
                  value={userSearchType}
                  onValueChange={(value: AdminUserSearchType) => setUserSearchType(value)}
                >
                  <SelectTrigger className="w-[100px] sm:w-[120px]">
                    <SelectValue placeholder="Search by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Fields</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="userID">User ID</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder={
                    userSearchType === "email"
                      ? "Search by email..."
                      : userSearchType === "name"
                        ? "Search by name..."
                        : userSearchType === "userID"
                          ? "Search by user ID..."
                          : "Search users..."
                  }
                  className="flex-1"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onSearch()
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onSearch} className="flex-1 sm:flex-none">
                  Search
                </Button>
                {userSearchQuery && (
                  <Button variant="ghost" size="sm" onClick={onResetSearch}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {usersError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {usersError}
              </div>
            )}

            <div className="hidden md:block rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">User ID</th>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium w-[150px]">Email</th>
                    <th className="text-left p-4 font-medium">Phone</th>
                    <th className="text-left p-4 font-medium">Area</th>
                    <th className="text-left p-4 font-medium">Created</th>
                    <th className="text-left p-4 font-medium">Daily Orders</th>
                    <th className="text-left p-4 font-medium">Weekly Orders</th>
                    <th className="text-center p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="border-b">
                      <td className="p-4">{user.userID}</td>
                      <td className="p-4">{user.name}</td>
                      <td className="p-4 w-[150px]">
                        <EmailCell email={user.email} />
                      </td>
                      <td className="p-4">{user.phone || "-"}</td>
                      <td className="p-4">{user.address?.province || "-"}</td>
                      <td className="p-4" title={user.joined ? formatDateTime(user.joined) : "-"}>
                        {user.joined ? formatDate(user.joined) : "-"}
                      </td>
                      <td className="p-4">{user.dailyOrdersCount || 0}</td>
                      <td className="p-4">{user.weeklyOrdersCount || 0}</td>
                      <td className="p-4">
                        <div className="flex justify-center gap-1">
                          <Button variant="outline" size="sm" onClick={() => onViewUser(user)}>
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDeleteUser(user)}
                            className="text-red-500 border-red-200 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {filteredUsers.map((user) => (
                <Card key={user._id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">{user.name}</h3>
                          <p className="text-xs text-muted-foreground">ID: {user.userID}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="outline" size="sm" onClick={() => onViewUser(user)} className="h-8 px-2">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDeleteUser(user)}
                            className="text-red-500 border-red-200 hover:bg-red-50 h-8 px-2"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <MobileEmailCell email={user.email} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-xs font-medium truncate">{user.phone || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Area</p>
                          <p className="text-xs font-medium truncate">{user.address?.province || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Daily Orders</p>
                          <p className="text-xs font-medium">{user.dailyOrdersCount || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Weekly Orders</p>
                          <p className="text-xs font-medium">{user.weeklyOrdersCount || 0}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Joined (Toronto)</p>
                          <p className="text-xs font-medium" title={user.joined ? formatDateTime(user.joined) : "-"}>
                            {user.joined ? formatDate(user.joined) : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4 sm:flex-row">
          <div className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPaginate("prev")}
              disabled={usersPagination.page <= 1}
              className="flex-1 sm:flex-none"
            >
              Previous
            </Button>
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              Page {usersPagination.page} of {usersPagination.pages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPaginate("next")}
              disabled={usersPagination.page >= usersPagination.pages}
              className="flex-1 sm:flex-none"
            >
              Next
            </Button>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto sm:ml-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
            <Select
              value={usersPagination.limit.toString()}
              onValueChange={(value) => onChangePageSize(parseInt(value, 10))}
            >
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue placeholder={usersPagination.limit.toString()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
