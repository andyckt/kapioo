"use client"

import { AddressAutocomplete } from "@/components/address-autocomplete"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { GoogleDerivedAreaInput } from "@/components/google-derived-area-input"
import { GoogleDerivedPostalCodeInput } from "@/components/google-derived-postal-code-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  language: "en" | "zh"
  saveAddressForFuture: boolean
  disabled?: boolean
  onAddressInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onAddressSelect: (address: ParsedGoogleAddress) => void
  onSaveAddressForFutureChange: (checked: boolean) => void
  onCancel: () => void
  onSave: () => void
}

export function CheckoutAddressForm({
  addressFormData,
  language,
  saveAddressForFuture,
  disabled = false,
  onAddressInputChange,
  onAddressSelect,
  onSaveAddressForFutureChange,
  onCancel,
  onSave,
}: CheckoutAddressFormProps) {
  return (
    <div className="mt-2 space-y-4 p-4 rounded-md border border-primary/30 bg-primary/5 shadow-sm">
      <div className="text-sm font-medium text-primary mb-2">
        {language === "zh" ? "修改配送信息" : "Edit Delivery Details"}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="unitNumber" className="text-sm">
            {language === "zh" ? "单元/公寓号" : "Unit/Apt Number"}
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
            {language === "zh" ? "街道地址" : "Street address"} <span className="text-red-500">*</span>
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
          <Label htmlFor="province" className="text-sm">
            {language === "zh" ? "配送区域" : "Delivery area"} <span className="text-red-500">*</span>
          </Label>
          <GoogleDerivedAreaInput
            id="province"
            value={addressFormData.province}
            language={language}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zip" className="text-sm">
            {language === "zh" ? "邮编" : "ZIP Code"} <span className="text-red-500">*</span>
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
            {language === "zh" ? "门禁码" : "Buzz Code"}
            <span className="text-muted-foreground text-xs ml-1">
              {language === "zh" ? "（可选）" : "(Optional)"}
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
