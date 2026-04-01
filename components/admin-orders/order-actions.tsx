"use client"

import { Loader2, MoreHorizontal, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AdminOrderOverrideForm } from "@/lib/types/orders"

interface OrderActionsMenuProps {
  onView: () => void
  onEditCustomerInfo: () => void
  onDelete: () => void
  onStatusChange: (status: string) => void
  disabled?: boolean
}

const ORDER_STATUS_OPTIONS = ["pending", "confirmed", "delivery", "delivered", "cancelled"]

export function OrderActionsMenu({
  onView,
  onEditCustomerInfo,
  onDelete,
  onStatusChange,
  disabled = false,
}: OrderActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open order actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={onView}>View Details</DropdownMenuItem>
        <DropdownMenuItem onClick={onEditCustomerInfo}>Edit Customer Info</DropdownMenuItem>
        <DropdownMenuSeparator />
        {ORDER_STATUS_OPTIONS.map((status) => (
          <DropdownMenuItem key={status} onClick={() => onStatusChange(status)}>
            Mark as {status}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          Delete Without Notice
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface OrderDeleteDialogProps {
  open: boolean
  orderId: string
  refundLabel: string
  refundValue: boolean
  processing: boolean
  onOpenChange: (open: boolean) => void
  onRefundValueChange: (value: boolean) => void
  onConfirm: () => void
}

export function OrderDeleteDialog({
  open,
  orderId,
  refundLabel,
  refundValue,
  processing,
  onOpenChange,
  onRefundValueChange,
  onConfirm,
}: OrderDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Order Without Notice</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete order <strong>{orderId}</strong>? This action cannot be
            undone and the user will not be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 py-4">
          <Checkbox
            id="order-delete-refund"
            checked={refundValue}
            onCheckedChange={(checked) => onRefundValueChange(Boolean(checked))}
          />
          <label htmlFor="order-delete-refund" className="text-sm font-medium leading-none">
            {refundLabel}
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={processing}>
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface OrderOverrideDialogProps {
  open: boolean
  form: AdminOrderOverrideForm
  areas: string[]
  saving: boolean
  onOpenChange: (open: boolean) => void
  onFormChange: (next: AdminOrderOverrideForm) => void
  onConfirm: () => void
}

export function OrderOverrideDialog({
  open,
  form,
  areas,
  saving,
  onOpenChange,
  onFormChange,
  onConfirm,
}: OrderOverrideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[680px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order-Only Customer Info</DialogTitle>
          <DialogDescription>
            This updates this order only and does not change user profile or future orders.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="override-name">Name</Label>
            <Input
              id="override-name"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="override-phone">Phone Number</Label>
              <Input
                id="override-phone"
                value={form.phoneNumber}
                onChange={(e) => onFormChange({ ...form, phoneNumber: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="override-area">Area</Label>
              <Select
                value={form.area || "all"}
                onValueChange={(value) =>
                  onFormChange({ ...form, area: value === "all" ? "" : value })
                }
              >
                <SelectTrigger id="override-area">
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">No override (use original)</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="override-unit">Unit Number</Label>
            <Input
              id="override-unit"
              value={form.deliveryAddress.unitNumber}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  deliveryAddress: { ...form.deliveryAddress, unitNumber: e.target.value },
                })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="override-street">Street Address</Label>
            <Input
              id="override-street"
              value={form.deliveryAddress.streetAddress}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  deliveryAddress: { ...form.deliveryAddress, streetAddress: e.target.value },
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="override-postal">Postal Code</Label>
              <Input
                id="override-postal"
                value={form.deliveryAddress.postalCode}
                onChange={(e) =>
                  onFormChange({
                    ...form,
                    deliveryAddress: { ...form.deliveryAddress, postalCode: e.target.value },
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="override-country">Country</Label>
              <Input
                id="override-country"
                value={form.deliveryAddress.country}
                onChange={(e) =>
                  onFormChange({
                    ...form,
                    deliveryAddress: { ...form.deliveryAddress, country: e.target.value },
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="override-buzz">Buzz Code</Label>
              <Input
                id="override-buzz"
                value={form.deliveryAddress.buzzCode}
                onChange={(e) =>
                  onFormChange({
                    ...form,
                    deliveryAddress: { ...form.deliveryAddress, buzzCode: e.target.value },
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="override-special">Special Request</Label>
            <Input
              id="override-special"
              value={form.specialInstructions}
              onChange={(e) => onFormChange({ ...form, specialInstructions: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Order-Only Override"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
