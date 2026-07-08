"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, MoreHorizontal, Trash2 } from "lucide-react"

import { AddressAutocomplete } from "@/components/address-autocomplete"
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
import { resolveServiceability } from "@/lib/zones/service-areas"
import type { ParsedGoogleAddress } from "@/lib/address/types"

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
  const [manualMode, setManualMode] = useState(false)

  const serviceability = form.deliveryAddress.postalCode || form.area
    ? resolveServiceability({
        areaLabel: form.area || form.deliveryAddress.province,
        postalCode: form.deliveryAddress.postalCode,
      })
    : null

  const hasServiceWarning = serviceability && !serviceability.isServed

  const handleGoogleAddressSelect = (result: ParsedGoogleAddress) => {
    const postalCode = result.addressGeo.postalCode || result.address.postalCode || ""
    const area = result.address.province || ""
    onFormChange({
      ...form,
      area,
      deliveryAddress: {
        ...form.deliveryAddress,
        streetAddress: result.address.streetAddress || form.deliveryAddress.streetAddress,
        postalCode,
        province: area,
        country: result.address.country || "Canada",
      },
    })
  }

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
          </div>

          {/* Address: Google autocomplete by default, manual toggle for exceptions */}
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Delivery Address</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="manual-override-toggle"
                  checked={manualMode}
                  onCheckedChange={(v) => setManualMode(Boolean(v))}
                />
                <Label htmlFor="manual-override-toggle" className="text-xs text-muted-foreground cursor-pointer">
                  Manual override
                </Label>
              </div>
            </div>

            {hasServiceWarning && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Area &ldquo;{form.area || form.deliveryAddress.province}&rdquo; is not in any Kapioo service zone.
                  {manualMode ? " Manual override active." : " Use Google autocomplete to set a valid address."}
                </span>
              </div>
            )}

            {!manualMode ? (
              <div className="grid gap-2">
                <Label>Street Address (Google autocomplete)</Label>
                <AddressAutocomplete
                  value={form.deliveryAddress.streetAddress}
                  language="en"
                  onInputChange={(value) =>
                    onFormChange({
                      ...form,
                      deliveryAddress: { ...form.deliveryAddress, streetAddress: value, postalCode: "", province: "" },
                      area: "",
                    })
                  }
                  onAddressSelect={handleGoogleAddressSelect}
                />
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Area (derived)</p>
                    <Input value={form.area || ""} readOnly className="bg-muted/60 text-muted-foreground h-8 text-xs" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Postal (derived)</p>
                    <Input value={form.deliveryAddress.postalCode} readOnly className="bg-muted/60 text-muted-foreground h-8 text-xs" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Unit</p>
                    <Input
                      value={form.deliveryAddress.unitNumber}
                      onChange={(e) =>
                        onFormChange({ ...form, deliveryAddress: { ...form.deliveryAddress, unitNumber: e.target.value } })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Buzz Code</p>
                    <Input
                      value={form.deliveryAddress.buzzCode}
                      onChange={(e) =>
                        onFormChange({ ...form, deliveryAddress: { ...form.deliveryAddress, buzzCode: e.target.value } })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Manual override — all fields editable, admin responsibility */
              <div className="grid gap-3">
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
                <div className="grid gap-2">
                  <Label htmlFor="override-unit">Unit Number</Label>
                  <Input
                    id="override-unit"
                    value={form.deliveryAddress.unitNumber}
                    onChange={(e) =>
                      onFormChange({ ...form, deliveryAddress: { ...form.deliveryAddress, unitNumber: e.target.value } })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="override-street">Street Address</Label>
                  <Input
                    id="override-street"
                    value={form.deliveryAddress.streetAddress}
                    onChange={(e) =>
                      onFormChange({ ...form, deliveryAddress: { ...form.deliveryAddress, streetAddress: e.target.value } })
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
                        onFormChange({ ...form, deliveryAddress: { ...form.deliveryAddress, postalCode: e.target.value } })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="override-country">Country</Label>
                    <Input
                      id="override-country"
                      value={form.deliveryAddress.country}
                      onChange={(e) =>
                        onFormChange({ ...form, deliveryAddress: { ...form.deliveryAddress, country: e.target.value } })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="override-buzz">Buzz Code</Label>
                    <Input
                      id="override-buzz"
                      value={form.deliveryAddress.buzzCode}
                      onChange={(e) =>
                        onFormChange({ ...form, deliveryAddress: { ...form.deliveryAddress, buzzCode: e.target.value } })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
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
