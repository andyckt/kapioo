"use client"

import type { Dispatch, SetStateAction } from "react"

import type { User } from "@/lib/utils"
import { AddCreditsDialog } from "@/features/admin-credits/add-credits-dialog"
import { CreditRequestDialogs } from "@/features/admin-credit-requests/credit-request-dialogs"
import { DeductCreditsDialog } from "@/features/admin-credits/deduct-credits-dialog"
import { DeleteUserDialog } from "@/features/admin-users/delete-user-dialog"
import { ViewUserDialog } from "@/features/admin-users/view-user-dialog"
import type { CreditRequest } from "@/lib/types/admin"

export interface AdminDashboardDialogsProps {
  addCreditsOpen: boolean
  setAddCreditsOpen: (open: boolean) => void
  selectedUser: User | null
  creditAmount: number
  setCreditAmount: Dispatch<SetStateAction<number>>
  confirmAddCredits: () => void | Promise<void>
  viewUserOpen: boolean
  setViewUserOpen: (open: boolean) => void
  viewRequestOpen: boolean
  setViewRequestOpen: (open: boolean) => void
  approveRequestOpen: boolean
  setApproveRequestOpen: (open: boolean) => void
  declineRequestOpen: boolean
  setDeclineRequestOpen: (open: boolean) => void
  selectedRequest: CreditRequest | null
  approvedSixMeals: number
  setApprovedSixMeals: Dispatch<SetStateAction<number>>
  approvedEightMeals: number
  setApprovedEightMeals: Dispatch<SetStateAction<number>>
  approvedTenMeals: number
  setApprovedTenMeals: Dispatch<SetStateAction<number>>
  approvedTwelveMeals: number
  setApprovedTwelveMeals: Dispatch<SetStateAction<number>>
  approvedSixteenMeals: number
  setApprovedSixteenMeals: Dispatch<SetStateAction<number>>
  adminNotes: string
  setAdminNotes: Dispatch<SetStateAction<string>>
  processingRequest: boolean
  handleApproveRequest: (r: CreditRequest) => void
  handleDeclineRequest: (r: CreditRequest) => void
  confirmApproveRequest: () => void | Promise<void>
  confirmDeclineRequest: () => void | Promise<void>
  deductCreditsOpen: boolean
  setDeductCreditsOpen: (open: boolean) => void
  deductAmount: number
  setDeductAmount: Dispatch<SetStateAction<number>>
  deductDescription: string
  setDeductDescription: Dispatch<SetStateAction<string>>
  confirmDeductCredits: () => void | Promise<void>
  deleteUserOpen: boolean
  setDeleteUserOpen: (open: boolean) => void
  isDeletingUser: boolean
  confirmDeleteUser: () => void | Promise<void>
}

export function AdminDashboardDialogs(props: AdminDashboardDialogsProps) {
  return (
    <>
      <AddCreditsDialog
        open={props.addCreditsOpen}
        user={props.selectedUser}
        creditAmount={props.creditAmount}
        onOpenChange={props.setAddCreditsOpen}
        onCreditAmountChange={props.setCreditAmount}
        onConfirm={props.confirmAddCredits}
      />

      <ViewUserDialog
        open={props.viewUserOpen}
        user={props.selectedUser}
        onOpenChange={props.setViewUserOpen}
      />

      <CreditRequestDialogs
        viewRequestOpen={props.viewRequestOpen}
        setViewRequestOpen={props.setViewRequestOpen}
        approveRequestOpen={props.approveRequestOpen}
        setApproveRequestOpen={props.setApproveRequestOpen}
        declineRequestOpen={props.declineRequestOpen}
        setDeclineRequestOpen={props.setDeclineRequestOpen}
        selectedRequest={props.selectedRequest}
        approvedSixMeals={props.approvedSixMeals}
        setApprovedSixMeals={props.setApprovedSixMeals}
        approvedEightMeals={props.approvedEightMeals}
        setApprovedEightMeals={props.setApprovedEightMeals}
        approvedTenMeals={props.approvedTenMeals}
        setApprovedTenMeals={props.setApprovedTenMeals}
        approvedTwelveMeals={props.approvedTwelveMeals}
        setApprovedTwelveMeals={props.setApprovedTwelveMeals}
        approvedSixteenMeals={props.approvedSixteenMeals}
        setApprovedSixteenMeals={props.setApprovedSixteenMeals}
        adminNotes={props.adminNotes}
        setAdminNotes={props.setAdminNotes}
        processingRequest={props.processingRequest}
        onHandleApproveRequest={props.handleApproveRequest}
        onHandleDeclineRequest={props.handleDeclineRequest}
        onConfirmApproveRequest={props.confirmApproveRequest}
        onConfirmDeclineRequest={props.confirmDeclineRequest}
      />

      <DeductCreditsDialog
        open={props.deductCreditsOpen}
        user={props.selectedUser}
        deductAmount={props.deductAmount}
        deductDescription={props.deductDescription}
        onOpenChange={props.setDeductCreditsOpen}
        onDeductAmountChange={props.setDeductAmount}
        onDeductDescriptionChange={props.setDeductDescription}
        onConfirm={props.confirmDeductCredits}
      />

      <DeleteUserDialog
        open={props.deleteUserOpen}
        user={props.selectedUser}
        isDeleting={props.isDeletingUser}
        onOpenChange={props.setDeleteUserOpen}
        onConfirm={props.confirmDeleteUser}
      />
    </>
  )
}
