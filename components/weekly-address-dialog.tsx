"use client"

import React, { useState, useEffect } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { GoogleDerivedAreaInput } from "@/components/google-derived-area-input"
import { GoogleDerivedPostalCodeInput } from "@/components/google-derived-postal-code-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AddressGeo } from "@/lib/contracts/common"
import { useLanguage } from '@/lib/language-context'
import { useAddressSelection } from '@/hooks/use-address-selection'

interface AddressData {
  unitNumber?: string
  streetAddress?: string
  province?: string
  postalCode?: string
  country?: string
  buzzCode?: string
  addressGeo?: AddressGeo
}

interface WeeklyAddressDialogProps {
  open: boolean
  onClose: () => void
  currentRegion: string | undefined
  onRegionChange: (region: string, addressData?: AddressData) => Promise<void>
  onProceed: () => void
  existingAddress?: AddressData
}

export function WeeklyAddressDialog({
  open,
  onClose,
  onRegionChange,
  onProceed,
  existingAddress
}: WeeklyAddressDialogProps) {
  const { language, t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [unitNumber, setUnitNumber] = useState(existingAddress?.unitNumber || '')
  const [buzzCode, setBuzzCode] = useState(existingAddress?.buzzCode || '')

  const {
    address,
    handleAddressSelect,
    handleStreetInputChange,
    setAddress,
  } = useAddressSelection({
    service: 'weekly',
    language,
    initial: {
      streetAddress: existingAddress?.streetAddress || '',
      postalCode: existingAddress?.postalCode || '',
      province: existingAddress?.province || '',
      country: existingAddress?.country || 'Canada',
      addressGeo: existingAddress?.addressGeo,
    },
  })

  // Sync with existingAddress when dialog opens
  useEffect(() => {
    if (!open) return
    setUnitNumber(existingAddress?.unitNumber || '')
    setBuzzCode(existingAddress?.buzzCode || '')
    setAddress((prev) => ({
      ...prev,
      streetAddress: existingAddress?.streetAddress || '',
      postalCode: existingAddress?.postalCode || '',
      province: existingAddress?.province || '',
      country: existingAddress?.country || 'Canada',
      addressGeo: existingAddress?.addressGeo,
    }))
  }, [open, existingAddress, setAddress])

  const handleSubmit = async () => {
    if (!address.streetAddress || !address.postalCode || !address.province) return

    setIsLoading(true)
    try {
      const fullAddress: AddressData = {
        unitNumber,
        streetAddress: address.streetAddress,
        province: address.province,
        postalCode: address.postalCode,
        country: address.country || 'Canada',
        buzzCode,
        addressGeo: address.addressGeo,
      }
      await onRegionChange(address.province, fullAddress)
      onClose()
      onProceed()
    } catch (error) {
      console.error('Error updating address:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmit = Boolean(address.streetAddress && address.postalCode && address.province)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 sm:border-[#C2884E]/10 shadow-xl rounded-xl sm:rounded-[24px] max-h-[90vh] w-[95vw] sm:w-auto">
        <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-4 sm:p-6 text-white h-[90px] flex flex-col justify-center">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            {t('deliveryAddress')}
          </DialogTitle>
          <DialogDescription className="text-white/90 mt-1 sm:mt-2 text-sm sm:text-base font-light">
            {language === 'zh' ? '请确认您的详细地址' : 'Please confirm your address details'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-[#F5EDE4] flex items-center justify-center">
              <Home className="h-4 w-4 text-[#C2884E]" />
            </div>
            <h3 className="text-lg font-medium text-[#6B5F53]">
              {t('deliveryAddress')}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Unit Number */}
            <div className="space-y-1">
              <Label htmlFor="unitNumber" className="text-xs sm:text-sm">
                {language === 'zh' ? '单元/公寓号' : 'Unit/Apt Number'}
              </Label>
              <Input
                id="unitNumber"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                className="border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10 h-9 text-sm"
              />
            </div>

            {/* Street Address */}
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs sm:text-sm">
                <span className="text-red-500">*</span>{' '}
                {language === 'zh' ? '街道地址' : 'Street Address'}
              </Label>
              <AddressAutocomplete
                value={address.streetAddress}
                language={language}
                onInputChange={handleStreetInputChange}
                onAddressSelect={handleAddressSelect}
              />
            </div>

            {/* Delivery Area (read-only, Google-derived) */}
            <div className="space-y-1">
              <Label htmlFor="province" className="text-xs sm:text-sm">
                <span className="text-red-500">*</span>{' '}
                {language === 'zh' ? '配送区域' : 'Delivery area'}
              </Label>
              <GoogleDerivedAreaInput
                id="province"
                value={address.province}
                language={language}
                className="border-[#C2884E]/20 h-9 text-sm"
              />
            </div>

            {/* ZIP Code */}
            <div className="space-y-1">
              <Label htmlFor="postalCode" className="text-xs sm:text-sm">
                <span className="text-red-500">*</span>{' '}
                {language === 'zh' ? '邮编' : 'ZIP Code'}
              </Label>
              <GoogleDerivedPostalCodeInput
                id="postalCode"
                value={address.postalCode}
                language={language}
                className="border-[#C2884E]/20 h-9 text-sm"
              />
            </div>

            {/* Buzz Code */}
            <div className="space-y-1">
              <Label htmlFor="buzzCode" className="text-xs sm:text-sm">
                {language === 'zh' ? '门禁码' : 'Buzz Code / Entry Code'}{' '}
                <span className="text-xs text-muted-foreground">
                  {language === 'zh' ? '（可选）' : '(Optional)'}
                </span>
              </Label>
              <Input
                id="buzzCode"
                value={buzzCode}
                onChange={(e) => setBuzzCode(e.target.value)}
                className="border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10 h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-[#C2884E]/10 sticky bottom-0 bg-white pb-2">
            <Button
              className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white text-sm px-3 py-1 h-9"
              onClick={handleSubmit}
              disabled={!canSubmit || isLoading}
            >
              {isLoading
                ? (language === 'zh' ? '处理中...' : 'Processing...')
                : (language === 'zh' ? '保存并继续' : 'Save & Continue')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
