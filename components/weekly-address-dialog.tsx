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
import { Check, MapPin, Home } from 'lucide-react'
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language-context'
import { useToast } from '@/hooks/use-toast'
import { ALL_WEEKLY_AREAS } from '@/lib/constants/areas'

// Use centralized area list
const WEEKLY_DELIVERY_REGIONS = ALL_WEEKLY_AREAS

interface AddressData {
  unitNumber?: string
  streetAddress?: string
  province?: string
  postalCode?: string
  country?: string // Always "Canada", not shown in UI
  buzzCode?: string
}

interface WeeklyAddressDialogProps {
  open: boolean
  onClose: () => void
  currentRegion: string | undefined
  onRegionChange: (region: string, addressData?: AddressData) => Promise<void>
  onProceed: () => void
  existingAddress?: AddressData // Existing address data to pre-populate the form
}

export function WeeklyAddressDialog({
  open,
  onClose,
  currentRegion,
  onRegionChange,
  onProceed,
  existingAddress
}: WeeklyAddressDialogProps) {
  const { language, t } = useLanguage()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  // State for region selection
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>(currentRegion)
  const [regionPopoverOpen, setRegionPopoverOpen] = useState(false)
  
  // State for address form
  const [addressData, setAddressData] = useState<AddressData>({
    unitNumber: existingAddress?.unitNumber || '',
    streetAddress: existingAddress?.streetAddress || '',
    province: selectedRegion || '',
    postalCode: existingAddress?.postalCode || '',
    country: existingAddress?.country || 'Canada', // Always Canada
    buzzCode: existingAddress?.buzzCode || '',
  })
  
  // Update address data when existing address changes
  useEffect(() => {
    if (existingAddress) {
      setAddressData({
        unitNumber: existingAddress.unitNumber || '',
        streetAddress: existingAddress.streetAddress || '',
        province: selectedRegion || existingAddress.province || '',
        postalCode: existingAddress.postalCode || '',
        country: existingAddress.country || 'Canada', // Always Canada
        buzzCode: existingAddress.buzzCode || '',
      })
    }
  }, [existingAddress, selectedRegion])
  
  // Update selected region when current region changes
  useEffect(() => {
    setSelectedRegion(currentRegion)
  }, [currentRegion])
  
  // Handle address field changes
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setAddressData(prev => ({
      ...prev,
      [id]: value
    }))
  }
  
  // Handle region selection
  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region)
    setRegionPopoverOpen(false)
    setAddressData(prev => ({
      ...prev,
      province: region
    }))
  }

  // Ensure wheel/trackpad scrolling works inside the area dropdown
  const handleRegionListWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.scrollTop += e.deltaY
  }
  
  // Handle form submission
  const handleAddressSubmit = async () => {
    const regionToUse = selectedRegion
    
    if (!regionToUse) {
      toast({
        title: language === 'zh' ? "请选择区域" : "Please select a region",
        variant: "destructive"
      })
      return
    }
    
    // Validate required fields: street address and ZIP code
    if (!addressData.streetAddress || !addressData.postalCode) {
      toast({
        title: language === 'zh' ? "请填写必填字段" : "Please fill in required fields",
        description: language === 'zh' ? "街道地址和邮政编码是必填的" : "Street address and ZIP code are required",
        variant: "destructive"
      })
      return
    }
    
    setIsLoading(true)
    try {
      // Pass both region and address data
      await onRegionChange(regionToUse, addressData)
      onClose() // Close the dialog first
      onProceed() // Then proceed with the flow
    } catch (error) {
      console.error('Error updating address:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
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
            {/* Region Selection */}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="region" className="text-xs sm:text-sm">
                <span className="text-red-500">*</span>
                {language === 'zh' ? '区域' : 'Region'}
              </Label>
              <Popover open={regionPopoverOpen} onOpenChange={setRegionPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={regionPopoverOpen}
                    className="w-full justify-between h-9 text-sm border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10"
                  >
                    {selectedRegion || (language === 'zh' ? '选择区域' : 'Select a region')}
                    <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                >
                  <Command>
                    <CommandInput 
                      placeholder={language === 'zh' ? '搜索区域...' : 'Search regions...'}
                      className="h-9"
                    />
                    <CommandList
                      className="max-h-[260px] overflow-y-scroll overflow-x-hidden visible-scrollbar overscroll-contain"
                      onWheel={handleRegionListWheel}
                    >
                      <CommandEmpty>
                        {language === 'zh' ? '没有找到匹配的区域' : 'No regions found'}
                      </CommandEmpty>
                      <CommandGroup>
                        {WEEKLY_DELIVERY_REGIONS.map((region) => (
                          <CommandItem
                            key={region}
                            value={region}
                            onSelect={() => handleRegionSelect(region)}
                            className="cursor-pointer"
                          >
                            {region}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedRegion === region ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Unit Number */}
            <div className="space-y-1">
              <Label htmlFor="unitNumber" className="text-xs sm:text-sm">
                Unit/Apt Number
              </Label>
              <Input 
                id="unitNumber" 
                value={addressData.unitNumber} 
                onChange={handleAddressChange}
                className="border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10 h-9 text-sm"
              />
            </div>
            
            {/* Street Address */}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="streetAddress" className="text-xs sm:text-sm">
                <span className="text-red-500">*</span>
                Street Address
              </Label>
              <Input 
                id="streetAddress" 
                value={addressData.streetAddress} 
                onChange={handleAddressChange}
                className="border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10 h-9 text-sm"
                required
              />
            </div>
            
            {/* ZIP Code */}
            <div className="space-y-1">
              <Label htmlFor="postalCode" className="text-xs sm:text-sm">
                <span className="text-red-500">*</span>
                ZIP Code
              </Label>
              <Input 
                id="postalCode" 
                value={addressData.postalCode} 
                onChange={handleAddressChange}
                className="border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10 h-9 text-sm"
                required
              />
            </div>
            
            {/* Buzz Code */}
            <div className="space-y-1">
              <Label htmlFor="buzzCode" className="text-xs sm:text-sm">
                Buzz Code / Entry Code <span className="text-xs text-muted-foreground">(Optional)</span>
              </Label>
              <Input 
                id="buzzCode" 
                value={addressData.buzzCode} 
                onChange={handleAddressChange}
                className="border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-[#C2884E]/10 h-9 text-sm"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-3 border-t border-[#C2884E]/10 sticky bottom-0 bg-white pb-2">
            <Button 
              className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white text-sm px-3 py-1 h-9"
              onClick={handleAddressSubmit}
              disabled={!addressData.streetAddress || !addressData.postalCode || !selectedRegion || isLoading}
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
