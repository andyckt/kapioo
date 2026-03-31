"use client"

import type { Dispatch, SetStateAction } from "react"

import {
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
  DollarSign,
  Loader2,
  Package,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { AdminTransaction } from "@/lib/types/admin"
import type { PaginationState } from "@/lib/types/pagination"
import type { User } from "@/lib/utils"

export interface AdminCreditsTabProps {
  users: User[]
  usersLoading: boolean
  searchResults: User[]
  searchLoading: boolean
  selectedUser: User | null
  setSelectedUser: Dispatch<SetStateAction<User | null>>
  serviceType: "daily" | "weekly"
  setServiceType: Dispatch<SetStateAction<"daily" | "weekly">>
  voucherType: string
  setVoucherType: Dispatch<SetStateAction<string>>
  creditAmount: number
  setCreditAmount: Dispatch<SetStateAction<number>>
  isUpdatingBalance: boolean
  transactions: AdminTransaction[]
  transactionsLoading: boolean
  transactionsPagination: PaginationState
  searchUsers: (query: string) => void | Promise<void>
  onAddBalance: () => void | Promise<void>
  onDeductBalance: () => void | Promise<void>
  onTransactionPagination: (direction: "prev" | "next") => void
  onChangeTransactionsPageSize: (limit: number) => void
}

function getTransactionTypeLabel(transaction: AdminTransaction) {
  if (transaction.type === "credit") return "Add"
  if (transaction.type === "debit") return "Deduct"
  if (transaction.type === "refund") return "Refund"
  return transaction.type
}

function isPositiveTransaction(transaction: AdminTransaction) {
  return transaction.type === "Add" || transaction.type === "credit" || transaction.type === "refund"
}

function getTransactionVoucherSuffix(description?: string) {
  if (!description) return ""

  if (description.includes("2dish") || description.includes("twoDishVoucher")) return "/2dish"
  if (description.includes("3dish") || description.includes("threeDishVoucher")) return "/3dish"
  if (description.includes("6weekly") || description.includes("weeklySIXmeals")) return "/6weekly"
  if (description.includes("8weekly") || description.includes("weeklyEIGHTmeals")) return "/8weekly"
  if (description.includes("10weekly") || description.includes("weeklyTENmeals")) return "/10weekly"
  if (description.includes("12weekly") || description.includes("weeklyTWELVEmeals")) return "/12weekly"

  return ""
}

function getTransactionVoucherLabel(description?: string) {
  if (!description) return ""

  if (description.includes("2dish") || description.includes("twoDishVoucher")) return "2-Dish"
  if (description.includes("3dish") || description.includes("threeDishVoucher")) return "3-Dish"
  if (description.includes("6weekly") || description.includes("weeklySIXmeals")) return "6-Meal"
  if (description.includes("8weekly") || description.includes("weeklyEIGHTmeals")) return "8-Meal"
  if (description.includes("10weekly") || description.includes("weeklyTENmeals")) return "10-Meal"
  if (description.includes("12weekly") || description.includes("weeklyTWELVEmeals")) return "12-Meal"

  return ""
}

export function AdminCreditsTab({
  users,
  usersLoading,
  searchResults,
  searchLoading,
  selectedUser,
  setSelectedUser,
  serviceType,
  setServiceType,
  voucherType,
  setVoucherType,
  creditAmount,
  setCreditAmount,
  isUpdatingBalance,
  transactions,
  transactionsLoading,
  transactionsPagination,
  searchUsers,
  onAddBalance,
  onDeductBalance,
  onTransactionPagination,
  onChangeTransactionsPageSize,
}: AdminCreditsTabProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Manual Credit Management</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage User Balance</CardTitle>
          <CardDescription>Manually add or deduct credits and vouchers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="user-select">Step 1: Select User</Label>
              {usersLoading ? (
                <div className="flex items-center space-x-2 h-10 px-3 rounded-md border border-input">
                  <span className="text-muted-foreground">Loading users...</span>
                  <div className="animate-pulse w-3 h-3 rounded-full bg-muted" />
                </div>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {selectedUser ? `${selectedUser.name} (${selectedUser.userID})` : "Search for a user..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-full min-w-[300px]">
                    <Command>
                      <CommandInput
                        placeholder="Search users..."
                        className="h-9"
                        onValueChange={(value) => {
                          if (value.trim().length >= 2) {
                            void searchUsers(value)
                          }
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>{searchLoading ? "Searching..." : "No users found."}</CommandEmpty>
                        <CommandGroup>
                          {searchLoading ? (
                            <div className="flex items-center justify-center py-6">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                            </div>
                          ) : (
                            (searchResults.length > 0 ? searchResults : users).map((user) => (
                              <CommandItem
                                key={user._id}
                                value={`${user.name} ${user.userID} ${user.email}`}
                                onSelect={() => {
                                  setSelectedUser(user)
                                  setServiceType("daily")
                                  setVoucherType("twoDishVoucher")
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedUser?._id === user._id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{user.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {user.userID} - {user.email}
                                  </span>
                                </div>
                              </CommandItem>
                            ))
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {selectedUser && (
              <>
                <div className="space-y-2">
                  <Label>Step 2: Select Service Type</Label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <Button
                      variant={serviceType === "daily" ? "default" : "outline"}
                      onClick={() => {
                        setServiceType("daily")
                        setVoucherType("twoDishVoucher")
                      }}
                      className="w-full h-10 text-sm"
                    >
                      Daily Delivery
                    </Button>
                    <Button
                      variant={serviceType === "weekly" ? "default" : "outline"}
                      onClick={() => {
                        setServiceType("weekly")
                        setVoucherType("weeklySIXmeals")
                      }}
                      className="w-full h-10 text-sm"
                    >
                      Weekly Meal Box
                    </Button>
                  </div>
                </div>

                {serviceType === "daily" && (
                  <div className="space-y-2">
                    <Label>Step 3: Select Voucher Type</Label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <Button
                        variant={voucherType === "twoDishVoucher" ? "default" : "outline"}
                        onClick={() => setVoucherType("twoDishVoucher")}
                        className="w-full h-10 text-sm"
                      >
                        2-Dish Voucher
                      </Button>
                      <Button
                        variant={voucherType === "threeDishVoucher" ? "default" : "outline"}
                        onClick={() => setVoucherType("threeDishVoucher")}
                        className="w-full h-10 text-sm"
                      >
                        3-Dish Voucher
                      </Button>
                    </div>
                  </div>
                )}

                {serviceType === "weekly" && (
                  <div className="space-y-2">
                    <Label>Step 3: Select Meal Plan</Label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <Button
                        variant={voucherType === "weeklySIXmeals" ? "default" : "outline"}
                        onClick={() => setVoucherType("weeklySIXmeals")}
                        className="w-full h-10 text-sm"
                      >
                        6 Meals/Week
                      </Button>
                      <Button
                        variant={voucherType === "weeklyEIGHTmeals" ? "default" : "outline"}
                        onClick={() => setVoucherType("weeklyEIGHTmeals")}
                        className="w-full h-10 text-sm"
                      >
                        8 Meals/Week
                      </Button>
                      <Button
                        variant={voucherType === "weeklyTENmeals" ? "default" : "outline"}
                        onClick={() => setVoucherType("weeklyTENmeals")}
                        className="w-full h-10 text-sm"
                      >
                        10 Meals/Week
                      </Button>
                      <Button
                        variant={voucherType === "weeklyTWELVEmeals" ? "default" : "outline"}
                        onClick={() => setVoucherType("weeklyTWELVEmeals")}
                        className="w-full h-10 text-sm"
                      >
                        12 Meals/Week
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="amount">Step 4: Enter Amount</Label>
                  <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-4">
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(parseInt(e.target.value, 10) || 0)}
                      className="h-10"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className="w-full h-10"
                        onClick={() => void onAddBalance()}
                        disabled={!selectedUser || creditAmount <= 0 || !voucherType || isUpdatingBalance}
                      >
                        {isUpdatingBalance ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Add"
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full h-10"
                        onClick={() => void onDeductBalance()}
                        disabled={!selectedUser || creditAmount <= 0 || !voucherType || isUpdatingBalance}
                      >
                        {isUpdatingBalance ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deducting...
                          </>
                        ) : (
                          "Deduct"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedUser && (
              <div className="mt-4 p-3 sm:p-4 bg-muted rounded-md">
                <h3 className="font-medium text-base sm:text-lg mb-2">User Balance:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="p-2 bg-background rounded border">
                    <p className="text-xs sm:text-sm text-muted-foreground">2-Dish</p>
                    <p className="font-medium text-base sm:text-lg">{selectedUser.twoDishVoucher || 0}</p>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <p className="text-xs sm:text-sm text-muted-foreground">3-Dish</p>
                    <p className="font-medium text-base sm:text-lg">{selectedUser.threeDishVoucher || 0}</p>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <p className="text-xs sm:text-sm text-muted-foreground">6-Meal</p>
                    <p className="font-medium text-base sm:text-lg">{selectedUser.weeklySIXmeals || 0}</p>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <p className="text-xs sm:text-sm text-muted-foreground">8-Meal</p>
                    <p className="font-medium text-base sm:text-lg">{selectedUser.weeklyEIGHTmeals || 0}</p>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <p className="text-xs sm:text-sm text-muted-foreground">10-Meal</p>
                    <p className="font-medium text-base sm:text-lg">{selectedUser.weeklyTENmeals || 0}</p>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <p className="text-xs sm:text-sm text-muted-foreground">12-Meal</p>
                    <p className="font-medium text-base sm:text-lg">{selectedUser.weeklyTWELVEmeals || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>Recent transactions (credits and vouchers)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Transaction ID</th>
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Amount</th>
                  <th className="text-left p-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactionsLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </td>
                  </tr>
                ) : transactions.length > 0 ? (
                  transactions.map((transaction) => {
                    const userForTransaction = users.find((u) => u._id === transaction.userId)

                    const displayUser = usersLoading ? (
                      <div className="flex items-center">
                        <span className="text-muted-foreground">Loading...</span>
                        <div className="ml-2 animate-pulse w-3 h-3 rounded-full bg-muted" />
                      </div>
                    ) : userForTransaction ? (
                      <span>{userForTransaction.name || userForTransaction.userID}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {transaction.userId?.toString().substring(0, 8)}...
                      </span>
                    )

                    const isPositive = isPositiveTransaction(transaction)

                    return (
                      <tr key={transaction._id} className="border-b">
                        <td className="p-4">
                          {transaction.transactionId || `Legacy-${transaction._id.toString().substring(0, 6)}`}
                        </td>
                        <td className="p-4">{displayUser}</td>
                        <td className="p-4">{getTransactionTypeLabel(transaction)}</td>
                        <td className="p-4">
                          <span className={isPositive ? "text-green-600" : "text-red-600"}>
                            {isPositive ? "+" : "-"}
                            {transaction.amount}
                            {getTransactionVoucherSuffix(transaction.description)}
                          </span>
                        </td>
                        <td className="p-4">
                          {new Date(transaction.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden grid grid-cols-1 gap-3">
            {transactionsLoading ? (
              <Card className="p-8">
                <div className="flex justify-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              </Card>
            ) : transactions.length > 0 ? (
              transactions.map((transaction) => {
                const userForTransaction = users.find((u) => u._id === transaction.userId)
                const isPositive = isPositiveTransaction(transaction)
                const voucherLabel = getTransactionVoucherLabel(transaction.description)

                const displayUser = usersLoading ? (
                  <span className="text-muted-foreground text-xs">Loading...</span>
                ) : userForTransaction ? (
                  <span className="text-sm font-medium">{userForTransaction.name || userForTransaction.userID}</span>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    {transaction.userId?.toString().substring(0, 8)}...
                  </span>
                )

                return (
                  <Card
                    key={transaction._id}
                    className={`border-l-4 ${isPositive ? "border-green-500" : "border-red-500"}`}
                  >
                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-semibold truncate">{displayUser}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {transaction.transactionId || `Legacy-${transaction._id.toString().substring(0, 6)}`}
                          </p>
                        </div>
                        <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
                          {getTransactionTypeLabel(transaction)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-3 px-3">
                      <div className="flex items-center justify-between py-2 border-y">
                        <span className="text-xs text-muted-foreground">Amount</span>
                        <span className={`text-lg font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                          {isPositive ? "+" : "-"}
                          {transaction.amount}
                          {voucherLabel && <span className="text-xs ml-1">({voucherLabel})</span>}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Date</span>
                        <span>
                          {new Date(transaction.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <Card className="p-8">
                <p className="text-center text-muted-foreground">No transactions found</p>
              </Card>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransactionPagination("prev")}
                disabled={transactionsPagination.page === 1 || transactionsLoading}
                className="flex-1 sm:flex-none"
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                Page {transactionsPagination.page} of {transactionsPagination.pages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransactionPagination("next")}
                disabled={transactionsPagination.page === transactionsPagination.pages || transactionsLoading}
                className="flex-1 sm:flex-none"
              >
                Next
              </Button>
            </div>

            <div className="flex items-center justify-center sm:justify-end space-x-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select
                value={transactionsPagination.limit.toString()}
                onValueChange={(value) => onChangeTransactionsPageSize(parseInt(value, 10))}
              >
                <SelectTrigger className="h-8 w-[80px]">
                  <SelectValue placeholder={transactionsPagination.limit.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
