"use client"

import { useCallback, useState, type Dispatch, type SetStateAction } from "react"

import type { User } from "@/lib/utils"
import { NotificationType } from "@/lib/services/notifications"

function getVoucherTypeLabel(field: string) {
  if (field === "twoDishVoucher") return "2-Dish vouchers"
  if (field === "threeDishVoucher") return "3-Dish vouchers"
  if (field === "weeklySIXmeals") return "6-meal vouchers"
  if (field === "weeklyEIGHTmeals") return "8-meal vouchers"
  if (field === "weeklyTENmeals") return "10-meal vouchers"
  return "12-meal vouchers"
}

type ToastFn = (opts: {
  title: string
  description?: string
  variant?: "destructive"
}) => void

export interface UseAdminDashboardBalanceParams {
  toast: ToastFn
  users: User[]
  setUsers: Dispatch<SetStateAction<User[]>>
  filteredUsers: User[]
  setFilteredUsers: Dispatch<SetStateAction<User[]>>
  selectedUser: User | null
  setSelectedUser: Dispatch<SetStateAction<User | null>>
  activeTab: string
  fetchTransactions: () => void | Promise<void>
  creditAmount: number
  voucherType: string
  deductAmount: number
  deductDescription: string
  setAddCreditsOpen: (open: boolean) => void
  setDeductCreditsOpen: (open: boolean) => void
}

export function useAdminDashboardBalance({
  toast,
  users,
  setUsers,
  filteredUsers,
  setFilteredUsers,
  selectedUser,
  setSelectedUser,
  activeTab,
  fetchTransactions,
  creditAmount,
  voucherType,
  deductAmount,
  deductDescription,
  setAddCreditsOpen,
  setDeductCreditsOpen,
}: UseAdminDashboardBalanceParams) {
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false)

  const syncUpdatedUserState = useCallback(
    (updatedUser: User) => {
      setUsers(users.map((u) => (u._id === updatedUser._id ? updatedUser : u)))
      setFilteredUsers(filteredUsers.map((u) => (u._id === updatedUser._id ? updatedUser : u)))
      setSelectedUser(updatedUser)
    },
    [users, filteredUsers, setUsers, setFilteredUsers, setSelectedUser]
  )

  const handleVoucherBalanceUpdate = useCallback(
    async (operation: "add" | "deduct") => {
      if (!selectedUser) {
        toast({
          title: "Error",
          description: "Please select a user first",
          variant: "destructive",
        })
        return
      }

      if (creditAmount <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid amount",
          variant: "destructive",
        })
        return
      }

      if (operation === "deduct") {
        const currentBalance = (selectedUser[voucherType as keyof User] as number) || 0
        if (currentBalance < creditAmount) {
          toast({
            title: "Error",
            description: "User does not have enough vouchers to deduct",
            variant: "destructive",
          })
          return
        }
      }

      if (isUpdatingBalance) {
        return
      }

      setIsUpdatingBalance(true)

      try {
        const response = await fetch(`/api/users/${selectedUser._id}/update-balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            field: voucherType,
            amount: creditAmount,
            operation,
            description: `${operation === "add" ? "Added" : "Deducted"} ${creditAmount} ${voucherType}`,
          }),
        })

        const result = await response.json()

        if (result.success) {
          const updatedUser = result.data as User
          syncUpdatedUserState(updatedUser)

          toast({
            title: "Balance updated",
            description: `${operation === "add" ? "Added" : "Deducted"} ${creditAmount} ${getVoucherTypeLabel(voucherType)} ${operation === "add" ? "to" : "from"} ${selectedUser.name}'s account`,
          })
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to update balance",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error updating balance:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        })
      } finally {
        setIsUpdatingBalance(false)
      }
    },
    [
      creditAmount,
      isUpdatingBalance,
      selectedUser,
      syncUpdatedUserState,
      toast,
      voucherType,
    ]
  )

  const confirmAddCredits = useCallback(async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/users/${selectedUser._id}/update-balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field: "credits",
          amount: creditAmount,
          operation: "add",
          description: `Admin added ${creditAmount} credits`,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const updatedUser = data.data as User
        toast({
          title: "Credits added",
          description: `Added ${creditAmount} credits to ${selectedUser.name}`,
        })

        const updatedUsers = users.map((user) => (user._id === selectedUser._id ? updatedUser : user))

        setUsers(updatedUsers)
        setFilteredUsers(filteredUsers.map((user) => (user._id === selectedUser._id ? updatedUser : user)))
        setSelectedUser(updatedUser)

        if (activeTab === "credits") {
          fetchTransactions()
        }

        try {
          await fetch("/api/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              notificationType: NotificationType.CREDITS_ADDED,
              userId: selectedUser._id,
              transactionId: data.meta?.transaction?.transactionId,
              amount: creditAmount,
            }),
          })
        } catch (notificationError) {
          console.error("Error sending credit notification:", notificationError)
        }

        setAddCreditsOpen(false)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add credits",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding credits:", error)
      toast({
        title: "Error",
        description: "An error occurred while adding credits",
        variant: "destructive",
      })
    }
  }, [
    activeTab,
    creditAmount,
    fetchTransactions,
    filteredUsers,
    selectedUser,
    setAddCreditsOpen,
    setFilteredUsers,
    setSelectedUser,
    setUsers,
    toast,
    users,
  ])

  const confirmDeductCredits = useCallback(async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/users/${selectedUser._id}/update-balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field: "credits",
          amount: deductAmount,
          operation: "deduct",
          description: deductDescription,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const updatedUser = result.data as User
        setUsers(users.map((user) => (user._id === selectedUser._id ? updatedUser : user)))
        setFilteredUsers(
          filteredUsers.map((user) => (user._id === selectedUser._id ? updatedUser : user))
        )
        setSelectedUser(updatedUser)

        if (activeTab === "credits") {
          fetchTransactions()
        }

        toast({
          title: "Credits deducted",
          description: `Deducted ${deductAmount} credits from ${selectedUser.userID}'s account`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to deduct credits",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deducting credits:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while deducting credits",
        variant: "destructive",
      })
    } finally {
      setDeductCreditsOpen(false)
    }
  }, [
    activeTab,
    deductAmount,
    deductDescription,
    fetchTransactions,
    filteredUsers,
    selectedUser,
    setDeductCreditsOpen,
    setFilteredUsers,
    setSelectedUser,
    setUsers,
    toast,
    users,
  ])

  return {
    isUpdatingBalance,
    handleVoucherBalanceUpdate,
    confirmAddCredits,
    confirmDeductCredits,
  }
}
