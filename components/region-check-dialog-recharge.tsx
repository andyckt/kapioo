"use client"

import React, { useState } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Check, MapPin, ArrowLeft, ArrowRight, Home } from 'lucide-react'
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
import { DAILY_DELIVERY_AREAS } from '@/lib/constants/areas'

// Use centralized daily delivery areas
const DAILY_DELIVERY_REGIONS = DAILY_DELIVERY_AREAS

interface RegionCheckDialogRechargeProps {
  open: boolean
  onClose: () => void
  currentRegion: string | undefined
  onRegionChange: (region: string, addressData?: AddressData) => Promise<void>
  onProceed: () => void
  isValidRegion?: boolean // Flag to indicate if the current region is valid
  existingAddress?: AddressData // Existing address data to pre-populate the form
}

interface AddressData {
  unitNumber?: string;
  streetAddress?: string;
  postalCode?: string;
  country?: string; // Always "Canada", not shown in UI
  buzzCode?: string;
}

export function RegionCheckDialogRecharge({
  open,
  onClose,
  currentRegion,
  onRegionChange,
  onProceed,
  isValidRegion = false,
  existingAddress
}: RegionCheckDialogRechargeProps) {
  const { language } = useLanguage()
  const { toast } = useToast()
  const [selectedRegion, setSelectedRegion] = useState<string>(isValidRegion && currentRegion ? currentRegion : "")
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'region' | 'address'>(isValidRegion ? 'address' : 'region')
  
  // Address fields
  const [addressData, setAddressData] = useState<AddressData>({
    unitNumber: existingAddress?.unitNumber || '',
    streetAddress: existingAddress?.streetAddress || '',
    postalCode: existingAddress?.postalCode || '',
    country: existingAddress?.country || 'Canada', // Always Canada
    buzzCode: existingAddress?.buzzCode || ''
  })

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setAddressData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handleRegionSelect = () => {
    if (!selectedRegion) {
      toast({
        title: language === 'zh' ? "请选择区域" : "Please select a region",
        variant: "destructive"
      })
      return
    }
    
    // Move to address step
    setStep('address')
  }
  
  const handleRegionChangeWithoutAddress = async () => {
    if (!selectedRegion) return
    
    setIsLoading(true)
    try {
      await onRegionChange(selectedRegion)
      onClose() // Close the dialog first
      onProceed() // Then proceed with the flow
    } catch (error) {
      console.error('Error updating region:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteAddress = async () => {
    // Use the current region if we're in valid region mode, otherwise use selected region
    const regionToUse = isValidRegion ? currentRegion : selectedRegion
    
    if (!regionToUse) return
    
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

  const renderRegionStep = () => (
    <div className="p-6 space-y-6">
      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-amber-800 font-medium">
              {language === 'zh' 
                ? <>您当前选择的区域 <span className="font-bold">{currentRegion || "未设置"}</span> 不在每日直送服务范围内</> 
                : <>Your current selected area <span className="font-bold">{currentRegion || "Not set"}</span> is not in the daily delivery service area</>
              }
            </p>
            <p className="text-xs text-amber-700 mt-1">
              {language === 'zh'
                ? '每日直送服务目前仅限于以下区域：Downtown Toronto、Midtown、North York、Markham、Richmond Hill'
                : 'Daily delivery service is currently limited to: Downtown Toronto, Midtown, North York, Markham, Richmond Hill'
              }
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#6B5F53]">
          {language === 'zh' ? '请选择一个可提供服务的区域：' : 'Please select an available service area:'}
        </label>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between"
            >
              {selectedRegion || (language === 'zh' ? "选择区域..." : "Select area...")}
              <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-content-available-width)]">
            <Command>
              <CommandInput placeholder={language === 'zh' ? "搜索区域..." : "Search area..."} />
              <CommandList className="max-h-[200px] overflow-y-auto">
                <CommandEmpty>{language === 'zh' ? "未找到匹配的区域" : "No matching areas found"}</CommandEmpty>
                <CommandGroup>
                  {DAILY_DELIVERY_REGIONS.map((region) => (
                    <CommandItem
                      key={region}
                      value={region}
                      onSelect={() => {
                        setSelectedRegion(region)
                        setPopoverOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedRegion === region ? "opacity-100" : "opacity-0"
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
      
      <div className="flex justify-between space-x-3 pt-4 border-t border-[#C2884E]/10">
        <Button variant="outline" onClick={onClose}>
          {language === 'zh' ? '取消' : 'Cancel'}
        </Button>
        <div className="space-x-2">
          {/* Commented out the "Update Region Only" button
          <Button 
            variant="outline"
            onClick={handleRegionChangeWithoutAddress}
            disabled={!selectedRegion || isLoading}
          >
            {language === 'zh' ? '仅更新区域' : 'Update Region Only'}
          </Button>
          */}
          <Button 
            className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white"
            onClick={handleRegionSelect}
            disabled={!selectedRegion || isLoading}
          >
            {language === 'zh' ? '继续填写地址' : 'Continue to Address'}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  const renderAddressStep = () => (
    <>
      <div className="p-4 sm:p-6 space-y-4 max-h-[calc(90vh-240px)] overflow-y-auto">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-[#F5EDE4] flex items-center justify-center">
            <Home className="h-4 w-4 text-[#C2884E]" />
          </div>
          <h3 className="text-lg font-medium text-[#6B5F53]">
            {language === 'zh' ? '配送地址' : 'Delivery Address'}
          </h3>
        </div>
        
        {/* Display selected area */}
        <div className="bg-[#F5EDE4]/50 p-3 rounded-lg border border-[#C2884E]/20">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#C2884E]" />
            <span className="text-sm text-[#6B5F53]">
              {language === 'zh' ? '已选择区域：' : 'Selected Area:'} 
              <span className="font-semibold text-[#C2884E] ml-1">
                {isValidRegion ? currentRegion : selectedRegion}
              </span>
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      </div>
      
      {/* Fixed button bar at bottom */}
      <div className="flex justify-between space-x-3 px-4 sm:px-6 py-3 border-t border-[#C2884E]/10 bg-white">
        <Button 
          variant="outline" 
          onClick={() => setStep('region')}
          className="flex items-center text-sm px-3 py-1 h-9"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          {language === 'zh' ? '返回' : 'Back'}
        </Button>
        <Button 
          className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white text-sm px-3 py-1 h-9"
          onClick={handleCompleteAddress}
          disabled={isLoading}
        >
          {isLoading 
            ? (language === 'zh' ? '处理中...' : 'Processing...') 
            : (language === 'zh' ? '保存并继续' : 'Save & Continue')}
        </Button>
      </div>
    </>
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 sm:border-[#C2884E]/10 shadow-xl rounded-xl sm:rounded-[24px] max-h-[90vh] w-[95vw] sm:w-auto">
        <DialogHeader className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] p-4 sm:p-6 text-white h-[90px] flex flex-col justify-center">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            {step === 'region' 
              ? (language === 'zh' ? '区域服务提示' : 'Service Area Notice') 
              : (language === 'zh' ? '配送地址' : 'Delivery Address')}
          </DialogTitle>
          <DialogDescription className="text-white/90 mt-1 sm:mt-2 text-sm sm:text-base font-light">
            {step === 'region' 
              ? (language === 'zh' ? '每日直送服务区域限制' : 'Daily delivery service area restrictions') 
              : isValidRegion 
                ? (language === 'zh' ? '请确认您的详细地址' : 'Please confirm your address details')
                : (language === 'zh' ? '请填写您的详细地址' : 'Please fill in your address details')}
          </DialogDescription>
        </DialogHeader>
        
        {step === 'region' ? renderRegionStep() : renderAddressStep()}
      </DialogContent>
    </Dialog>
  )
}
