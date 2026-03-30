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

interface AddCreditsDialogProps {
  open: boolean
  user: User | null
  creditAmount: number
  onOpenChange: (open: boolean) => void
  onCreditAmountChange: (value: number) => void
  onConfirm: () => void | Promise<void>
}

export function AddCreditsDialog({
  open,
  user,
  creditAmount,
  onOpenChange,
  onCreditAmountChange,
  onConfirm,
}: AddCreditsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Credits</DialogTitle>
          <DialogDescription>Add credits to {user?.userID}'s account.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current-credits" className="text-right">
              Current Credits
            </Label>
            <div className="col-span-3">
              <Input id="current-credits" value={user?.credits} disabled />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="add-credits" className="text-right">
              Credits to Add
            </Label>
            <div className="col-span-3">
              <Input
                id="add-credits"
                type="number"
                value={creditAmount}
                onChange={(e) => onCreditAmountChange(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onConfirm()}>Add Credits</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
