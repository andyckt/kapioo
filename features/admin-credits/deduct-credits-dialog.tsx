"use client"

import type { User } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DeductCreditsDialogProps {
  open: boolean
  user: User | null
  deductAmount: number
  deductDescription: string
  onOpenChange: (open: boolean) => void
  onDeductAmountChange: (value: number) => void
  onDeductDescriptionChange: (value: string) => void
  onConfirm: () => void | Promise<void>
}

export function DeductCreditsDialog({
  open,
  user,
  deductAmount,
  deductDescription,
  onOpenChange,
  onDeductAmountChange,
  onDeductDescriptionChange,
  onConfirm,
}: DeductCreditsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-500">Deduct Credits</DialogTitle>
          <DialogDescription>
            Deduct credits from {user?.userID}'s account.
            {user && <div className="mt-2 font-medium">Current balance: {user.credits || 0} credits</div>}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deductAmount" className="text-right">
              Amount
            </Label>
            <Input
              id="deductAmount"
              type="number"
              min="1"
              max={user?.credits || 1}
              className="col-span-3"
              value={deductAmount}
              onChange={(e) => onDeductAmountChange(Math.min(parseInt(e.target.value, 10) || 1, user?.credits || 1))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deductReason" className="text-right">
              Reason
            </Label>
            <Input
              id="deductReason"
              className="col-span-3"
              value={deductDescription}
              onChange={(e) => onDeductDescriptionChange(e.target.value)}
              placeholder="Reason for deduction"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void onConfirm()}
            disabled={!user || deductAmount <= 0 || deductAmount > (user?.credits || 0)}
            variant="destructive"
          >
            Deduct Credits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
