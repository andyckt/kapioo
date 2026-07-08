"use client"

import { Check, MapPin } from "lucide-react"

import { AddressAutocomplete } from "@/components/address-autocomplete"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { GoogleDerivedPostalCodeInput } from "@/components/google-derived-postal-code-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { AddressGeo } from "@/lib/contracts/common"
import type { ParsedGoogleAddress } from "@/lib/address/types"

export type CheckoutAddressFormData = {
  unitNumber: string
  streetAddress: string
  province: string
  postalCode: string
  country: string
  buzzCode: string
  addressGeo?: AddressGeo
}

type CheckoutAddressFormProps = {
  addressFormData: CheckoutAddressFormData
  availableRegions: readonly string[]
  language: "en" | "zh"
  popoverOpen: boolean
  saveAddressForFuture: boolean
  disabled?: boolean
  showAreaValidationHint?: boolean
  onPopoverOpenChange: (open: boolean) => void
  onAddressInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onAddressSelect: (address: ParsedGoogleAddress) => void
  onAreaSelect: (area: string) => void
  onSaveAddressForFutureChange: (checked: boolean) => void
  onCancel: () => void
  onSave: () => void
}

export function CheckoutAddressForm({
  addressFormData,
  availableRegions,
  language,
  popoverOpen,
  saveAddressForFuture,
  disabled = false,
  showAreaValidationHint = false,
  onPopoverOpenChange,
  onAddressInputChange,
  onAddressSelect,
  onAreaSelect,
  onSaveAddressForFutureChange,
  onCancel,
  onSave,
}: CheckoutAddressFormProps) {
  return (
    <div className="mt-2 space-y-4 p-4 rounded-md border border-primary/30 bg-primary/5 shadow-sm">
      <div className="text-sm font-medium text-primary mb-2">
        Edit Delivery Details
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="unitNumber" className="text-sm">
            Unit/Apt Number
          </Label>
          <Input
            id="unitNumber"
            value={addressFormData.unitNumber}
            onChange={onAddressInputChange}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="streetAddress" className="text-sm">
            Street name <span className="text-red-500">*</span>
          </Label>
          <AddressAutocomplete
            value={addressFormData.streetAddress}
            language={language}
            disabled={disabled}
            onInputChange={(value) =>
              onAddressInputChange({
                target: { id: "streetAddress", value },
              } as React.ChangeEvent<HTMLInputElement>)
            }
            onAddressSelect={onAddressSelect}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state" className="text-sm flex items-center gap-2">
            <span>
              Area <span className="text-red-500">*</span>
            </span>
            {showAreaValidationHint && (
              <span className="text-xs text-red-600 font-medium">
                ({language === "zh" ? "请选择有效区域" : "Please select valid area"})
              </span>
            )}
          </Label>

          <Popover open={popoverOpen} onOpenChange={onPopoverOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
                disabled={disabled}
              >
                {addressFormData.province || (language === "zh" ? "选择区域..." : "Select area...")}
                <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-content-available-width)]">
              <Command>
                <CommandInput placeholder={language === "zh" ? "搜索区域..." : "Search area..."} />
                <CommandList className="max-h-[200px] overflow-y-auto">
                  <CommandEmpty>
                    {language === "zh" ? "未找到匹配的区域" : "No matching areas found"}
                  </CommandEmpty>
                  <CommandGroup>
                    {availableRegions.map((region) => (
                      <CommandItem
                        key={region}
                        value={region}
                        onSelect={() => onAreaSelect(region)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            addressFormData.province === region ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {region}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zip" className="text-sm">
            ZIP Code <span className="text-red-500">*</span>
          </Label>
          <GoogleDerivedPostalCodeInput
            id="zip"
            value={addressFormData.postalCode}
            language={language}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="buzzCode" className="text-sm">
            Buzz Code
            <span className="text-muted-foreground text-xs ml-1">
              (Optional)
            </span>
          </Label>
          <Input
            id="buzzCode"
            value={addressFormData.buzzCode}
            onChange={onAddressInputChange}
            placeholder={language === "zh" ? "用于访问您的建筑物" : "For accessing your building"}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-background p-2 rounded-md">
        <Checkbox
          id="saveAddress"
          checked={saveAddressForFuture}
          onCheckedChange={(checked) => onSaveAddressForFutureChange(checked === true)}
          disabled={disabled}
        />
        <Label htmlFor="saveAddress" className="text-sm font-normal">
          {language === "zh" ? "保存地址以便将来使用" : "Save address for future orders"}
        </Label>
      </div>

      <div className="flex justify-end space-x-2 mt-4 pt-2 border-t border-primary/20">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={disabled}
        >
          {language === "zh" ? "取消" : "Cancel"}
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={disabled}
        >
          {language === "zh" ? "保存地址" : "Save Address"}
        </Button>
      </div>
    </div>
  )
}
